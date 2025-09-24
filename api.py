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
from pydantic import BaseModel
import re

# --- CONFIGURATION ---
load_dotenv()
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
TMDB_API_KEY = os.getenv("TMDB_API_KEY")
GOOGLE_BOOKS_API_KEY = os.getenv("GOOGLE_BOOKS_API_KEY")

# --- CACHING ---
_cache = {}

# --- HELPER FUNCTIONS: DATA PROCESSING ---

def process_title_for_search(title: str):
    """Applies all normalization rules to a title string for searching in the correct order."""
    if not isinstance(title, str): return ""
    processed_title = re.sub(r'\s*\(\d{4}\)\s*$', '', title).strip()
    if processed_title.endswith(', The'): processed_title = 'The ' + processed_title[:-5]
    if processed_title.endswith(', A'): processed_title = 'A ' + processed_title[:-3]
    if processed_title.endswith(', An'): processed_title = 'An ' + processed_title[:-4]
    processed_title = re.sub(r'^(the|a|an)\s+', '', processed_title, flags=re.IGNORECASE)
    return re.sub(r'[^a-zA-Z0-9]', '', processed_title).lower()

def load_movie_data():
    """Loads all movie data files, including custom additions, and merges them."""
    if "movies" in _cache: return _cache["movies"]
    
    embeddings_df = pd.read_parquet("data/movie_embeddings.parquet")
    movies_genres_df = pd.read_csv("data/movies.csv")[['movieId', 'genres']]
    links_df = pd.read_csv("data/links.csv")[['movieId', 'tmdbId']]
    
    merged_df = pd.merge(embeddings_df, movies_genres_df, on='movieId', how='inner')
    final_df = pd.merge(merged_df, links_df, on='movieId', how='inner')
    
    try:
        custom_embeddings_df = pd.read_parquet("data/custom_embeddings.parquet")
        final_df = pd.concat([final_df, custom_embeddings_df], ignore_index=True)
        print(f"Successfully loaded and combined {len(custom_embeddings_df)} custom movies.")
    except FileNotFoundError:
        print("No custom movies file found.")
        
    final_df.dropna(subset=['tmdbId'], inplace=True)
    final_df['tmdbId'] = final_df['tmdbId'].astype(int)
    final_df['search_title'] = final_df['title'].apply(process_title_for_search)
    
    _cache["movies"] = final_df
    print("Movie data loaded and cached.")
    return final_df

def load_book_data():
    """Loads and prepares the book data."""
    if "books" in _cache: return _cache["books"]
    
    df = pd.read_parquet("data/book_embeddings.parquet")
    df.dropna(subset=['isbn', 'title', 'authors'], inplace=True)
    df['search_title'] = df['title'].apply(process_title_for_search)
    
    _cache["books"] = df
    print("Book data loaded and cached.")
    return df

# --- HELPER FUNCTIONS: EXTERNAL APIS ---

def fetch_poster(tmdb_id: int):
    """Fetches a movie poster URL from TMDb, with caching and retries."""
    if tmdb_id in _cache: return _cache[tmdb_id]
    
    retry_strategy = Retry(total=3, status_forcelist=[429, 500, 502, 503, 504], backoff_factor=1)
    adapter = HTTPAdapter(max_retries=retry_strategy)
    session = requests.Session()
    session.mount("https://", adapter); session.mount("http://", adapter)
    url = f"https://api.themoviedb.org/3/movie/{tmdb_id}?api_key={TMDB_API_KEY}&language=en-US"
    
    try:
        response = session.get(url)
        response.raise_for_status()
        data = response.json()
        poster_path = data.get('poster_path')
        if poster_path:
            full_url = f"https://image.tmdb.org/t/p/w500/{poster_path}"
            _cache[tmdb_id] = full_url
            return full_url
    except requests.exceptions.RequestException as e:
        print(f"API request failed for tmdbId {tmdb_id}: {e}")
        
    return "https://via.placeholder.com/500x750.png?text=No+Poster+Found"

def fetch_book_cover(isbn: str):
    """Fetches a book cover URL from the Google Books API."""
    if isbn in _cache: return _cache[isbn]
    
    url = f"https://www.googleapis.com/books/v1/volumes?q=isbn:{isbn}&key={GOOGLE_BOOKS_API_KEY}"
    try:
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
        if "items" in data and len(data["items"]) > 0:
            thumbnail = data["items"][0]["volumeInfo"].get("imageLinks", {}).get("thumbnail")
            if thumbnail:
                _cache[isbn] = thumbnail
                return thumbnail
    except Exception as e:
        print(f"Failed to get book cover for ISBN {isbn}: {e}")
        
    return "https://via.placeholder.com/500x750.png?text=No+Cover+Found"

# --- HELPER FUNCTIONS: RECOMMENDATION LOGIC ---
chat_model = genai.GenerativeModel('gemini-1.5-flash-latest')

def get_movie_recommendations(title: str, df: pd.DataFrame, top_n: int = 5):
    """Finds movies similar to a given title."""
    search_term = process_title_for_search(title)
    movie_row = df[df['search_title'] == search_term]
    if movie_row.empty: return pd.DataFrame()
    
    query_embedding = movie_row['embedding'].iloc[0]
    query_embedding = np.array(query_embedding).reshape(1, -1)
    all_embeddings = np.stack(df['embedding'].values)
    similarities = cosine_similarity(query_embedding, all_embeddings).flatten()
    
    original_movie_index = movie_row.index[0]
    all_top_indices = np.argsort(similarities)[::-1][:top_n + 5]
    top_indices = [idx for idx in all_top_indices if idx != original_movie_index][:top_n]
    return df.iloc[top_indices]

def get_book_recommendations(title: str, df: pd.DataFrame, top_n: int = 5):
    """Finds books similar to a given title."""
    search_term = process_title_for_search(title)
    book_row = df[df['search_title'] == search_term]
    if book_row.empty: return pd.DataFrame()
    
    query_embedding = book_row['embedding'].iloc[0]
    query_embedding = np.array(query_embedding).reshape(1, -1)
    all_embeddings = np.stack(df['embedding'].values)
    similarities = cosine_similarity(query_embedding, all_embeddings).flatten()
    
    original_book_index = book_row.index[0]
    all_top_indices = np.argsort(similarities)[::-1][:top_n + 5]
    top_indices = [idx for idx in all_top_indices if idx != original_book_index][:top_n]
    return df.iloc[top_indices]

def get_recommendation_explanation(original_movie: str, recommended_movie: str):
    """Generates a brief explanation, using a cache to avoid repeat API calls."""
    cache_key = f"exp_{original_movie}_{recommended_movie}"
    if cache_key in _cache: return _cache[cache_key]
    
    prompt = f"You are a friendly movie expert. In one concise sentence, explain why someone who liked '{original_movie}' might also enjoy '{recommended_movie}'."
    try:
        response = chat_model.generate_content(prompt)
        explanation = response.text
        _cache[cache_key] = explanation
        return explanation
    except Exception as e:
        return f"Could not generate explanation: {e}"

class VibeRequest(BaseModel):
    vibe_text: str

def find_movies_by_vibe(vibe_text: str, df: pd.DataFrame, top_n: int = 5):
    """Finds movies that match a text description using embeddings."""
    embedding_model = 'text-embedding-004'
    prompt = f"Represent this movie vibe for semantic search: {vibe_text}"
    embedding = genai.embed_content(model=embedding_model, content=prompt)
    query_embedding = embedding['embedding']
    query_embedding = np.array(query_embedding).reshape(1, -1)
    all_embeddings = np.stack(df['embedding'].values)
    similarities = cosine_similarity(query_embedding, all_embeddings).flatten()
    top_indices = np.argsort(similarities)[::-1][:top_n]
    return df.iloc[top_indices]

# --- API SETUP ---
app = FastAPI()
movie_df = load_movie_data()
book_df = load_book_data()
origins = ["*"]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# --- API ENDPOINTS ---
@app.get("/")
def read_root():
    return {"message": "Welcome to the Recommender API!"}

@app.get("/search/movie/{query}")
def search_movies_api(query: str):
    """Finds movies by a partial match for autocomplete."""
    if len(query) < 3: return {"results": []}
    search_term = process_title_for_search(query)
    matches = movie_df[movie_df['search_title'].str.contains(search_term, na=False)].head(10)
    return {"results": matches['title'].tolist()}

@app.get("/search/book/{query}")
def search_books_api(query: str):
    """Finds books by a partial match for autocomplete."""
    if len(query) < 3: return {"results": []}
    search_term = process_title_for_search(query)
    matches = book_df[book_df['search_title'].str.contains(search_term, na=False)].head(10)
    return {"results": matches['title'].tolist()}

@app.get("/recommend/movie/{movie_title}")
def get_movie_recommendations_api(movie_title: str):
    """Main endpoint for movie recommendations."""
    search_term = process_title_for_search(movie_title)
    original_movie_df = movie_df[movie_df['search_title'] == search_term]
    if original_movie_df.empty: return {"error": "Movie not found"}
    original_title = original_movie_df.iloc[0]['title']

    recommendations_df = get_movie_recommendations(movie_title, movie_df)
    if recommendations_df.empty: return {"error": "Could not find recommendations for this movie."} 
    
    results_df = recommendations_df.copy()
    results_df['posterUrl'] = results_df['tmdbId'].apply(fetch_poster)
    results_df['embedding'] = results_df['embedding'].apply(list)
    results_df = results_df.replace({np.nan: None})
    
    top_rec_title = results_df.iloc[0]['title']
    explanation_text = get_recommendation_explanation(original_title, top_rec_title)
    
    recommendations_json = results_df.to_dict('records')
    return {"recommendations": recommendations_json, "explanation": explanation_text}

@app.post("/vibe")
def find_movies_by_vibe_api(request: VibeRequest):
    """Main endpoint for vibe-based search."""
    results_df = find_movies_by_vibe(request.vibe_text, movie_df)
    if results_df.empty: return {"error": "Could not find any matches for that description."}
    
    response_df = results_df.copy()
    response_df['posterUrl'] = response_df['tmdbId'].apply(fetch_poster)
    response_df['embedding'] = response_df['embedding'].apply(list)
    response_df = response_df.replace({np.nan: None})
    return {"recommendations": response_df.to_dict('records')}

@app.get("/recommend/book/{book_title}")
def get_book_recommendations_api(book_title: str):
    """Main endpoint for book recommendations."""
    recommendations_df = get_book_recommendations(book_title, book_df)
    if recommendations_df.empty: return {"error": "Book not found"}
    
    results_df = recommendations_df.copy()
    results_df['coverUrl'] = results_df['isbn'].apply(fetch_book_cover)
    results_df['embedding'] = results_df['embedding'].apply(list)
    results_df = results_df.replace({np.nan: None})
    
    return {"recommendations": results_df.to_dict('records')}