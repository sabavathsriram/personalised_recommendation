import streamlit as st
import pandas as pd
import numpy as np
import os
from dotenv import load_dotenv
import google.generativeai as genai
from sklearn.metrics.pairwise import cosine_similarity
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
from fastapi import FastAPI
import re
# --- CONFIGURATION ---
load_dotenv()
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
TMDB_API_KEY = os.getenv("TMDB_API_KEY")

# --- CACHING AND DATA LOADING ---
# A simple dictionary cache for our data
_cache = {}
@st.cache_data
def load_data():
    """Loads and merges all data files into a single DataFrame, cached in memory."""
    if "data" in _cache:
        return _cache["data"]
    
    embeddings_df = pd.read_parquet("data/movie_embeddings.parquet")
    movies_genres_df = pd.read_csv("data/movies.csv")[['movieId', 'genres']]
    links_df = pd.read_csv("data/links.csv")[['movieId', 'tmdbId']]
    
    merged_df = pd.merge(embeddings_df, movies_genres_df, on='movieId', how='inner')
    final_df = pd.merge(merged_df, links_df, on='movieId', how='inner')
    final_df.dropna(subset=['tmdbId'], inplace=True)
    final_df['tmdbId'] = final_df['tmdbId'].astype(int)
    
    _cache["data"] = final_df
    print("Data loaded and cached.")
    return final_df

chat_model = genai.GenerativeModel('gemini-1.5-flash-latest')

def get_recommendation_explanation(original_movie: str, recommended_movie: str): # <-- ADD THIS FUNCTION
    """Generates a brief explanation for why a movie is recommended."""
    prompt = f"You are a friendly movie expert. In one concise sentence, explain why someone who liked '{original_movie}' might also enjoy '{recommended_movie}'."
    try:
        response = chat_model.generate_content(prompt)
        return response.text
    except Exception as e:
        return f"Could not generate explanation: {e}"
    


def fetch_poster(tmdb_id: int):
    """Fetches a movie poster URL from TMDb, with caching and retries."""
    if tmdb_id in _cache:
        return _cache[tmdb_id]

    retry_strategy = Retry(total=3, status_forcelist=[429, 500, 502, 503, 504], backoff_factor=1)
    adapter = HTTPAdapter(max_retries=retry_strategy)
    session = requests.Session()
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    url = f"https://api.themoviedb.org/3/movie/{tmdb_id}?api_key={TMDB_API_KEY}&language=en-US"
    
    try:
        response = session.get(url)
        response.raise_for_status()
        data = response.json()
        poster_path = data.get('poster_path')
        if poster_path:
            full_url = f"https://image.tmdb.org/t/p/w500/{poster_path}"
            _cache[tmdb_id] = full_url # Store successful result in cache
            return full_url
    except requests.exceptions.RequestException as e:
        print(f"API request failed for tmdbId {tmdb_id}: {e}")
        
    return "https://via.placeholder.com/500x750.png?text=No+Poster+Found"

# --- RECOMMENDATION LOGIC ---
def get_recommendations(title: str, df: pd.DataFrame, top_n: int = 5):
    """Finds movies similar to a given title."""
    try:
        query_embedding = df[df['title'] == title]['embedding'].iloc[0]
    except IndexError:
        return pd.DataFrame()
    query_embedding = np.array(query_embedding).reshape(1, -1)
    all_embeddings = np.stack(df['embedding'].values)
    similarities = cosine_similarity(query_embedding, all_embeddings).flatten()
    top_indices = np.argsort(similarities)[::-1][1:top_n+1]
    return df.iloc[top_indices]

# --- API SETUP ---
app = FastAPI()
final_df = load_data()

origins = [
    "http://localhost", "http://localhost:5500", "http://127.0.0.1:53020",
    "http://localhost:49674", "http://127.0.0.1:49674","http://127.0.0.1:55037", # Your specific port
]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# --- API ENDPOINTS ---
@app.get("/")
def read_root():
    return {"message": "Welcome to the Recommender API!"}

@app.get("/recommend/{movie_title}")
def get_movie_recommendations(movie_title: str):
    """Takes a movie title and returns similar movies, posters, and an explanation."""
    recommendations_df = get_recommendations(movie_title, final_df)
    
    if recommendations_df.empty:
        return {"error": "Movie not found"}
        
    results_df = recommendations_df.copy()
    results_df['posterUrl'] = results_df['tmdbId'].apply(fetch_poster)
    results_df['embedding'] = results_df['embedding'].apply(list)
    
    # --- NEW: Generate and add the explanation ---
    top_rec_title = results_df.iloc[0]['title']
    explanation_text = get_recommendation_explanation(movie_title, top_rec_title)
    
    recommendations_json = results_df.to_dict('records')
    
    return {"recommendations": recommendations_json, "explanation": explanation_text}