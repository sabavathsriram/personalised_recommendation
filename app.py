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

# --- CONFIGURATION & DATA LOADING ---
load_dotenv()
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
TMDB_API_KEY = os.getenv("TMDB_API_KEY")

@st.cache_data
def load_data():
    """Loads all data files, merges them, and cleans up missing IDs."""
    embeddings_df = pd.read_parquet("data/movie_embeddings.parquet")
    movies_genres_df = pd.read_csv("data/movies.csv")[['movieId', 'genres']]
    links_df = pd.read_csv("data/links.csv")[['movieId', 'tmdbId']]
    merged_df = pd.merge(embeddings_df, movies_genres_df, on='movieId', how='inner')
    final_df = pd.merge(merged_df, links_df, on='movieId', how='inner')
    final_df.dropna(subset=['tmdbId'], inplace=True)
    final_df['tmdbId'] = final_df['tmdbId'].astype(int)
    return final_df

@st.cache_data
def fetch_poster(tmdb_id: int):
    """Fetches a movie poster URL from the TMDb API with a retry strategy."""
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
            return f"https://image.tmdb.org/t/p/w500/{poster_path}"
    except requests.exceptions.RequestException as e:
        print(f"API request failed after retries for tmdbId {tmdb_id}: {e}")
    return "https://via.placeholder.com/500x750.png?text=No+Poster+Found"

# --- LOGIC FUNCTIONS ---
chat_model = genai.GenerativeModel('gemini-1.5-flash-latest')

@st.cache_data
def get_recommendations(title: str, df: pd.DataFrame, top_n: int = 5):
    """Finds movies similar to a given title using cosine similarity."""
    try:
        query_embedding = df[df['title'] == title]['embedding'].iloc[0]
    except IndexError:
        return pd.DataFrame()
    query_embedding = np.array(query_embedding).reshape(1, -1)
    all_embeddings = np.stack(df['embedding'].values)
    similarities = cosine_similarity(query_embedding, all_embeddings).flatten()
    top_indices = np.argsort(similarities)[::-1][1:top_n+1]
    recommended_movies = df.iloc[top_indices]
    return recommended_movies

def get_recommendation_explanation(original_movie: str, recommended_movie: str):
    """Generates a brief explanation for why a movie is recommended."""
    prompt = f"You are a friendly movie expert. In one concise sentence, explain why someone who liked '{original_movie}' might also enjoy '{recommended_movie}'."
    try:
        response = chat_model.generate_content(prompt)
        return response.text
    except Exception as e:
        return f"Could not generate explanation: {e}"

@st.cache_data
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
    recommended_movies = df.iloc[top_indices]
    return recommended_movies

# --- MAIN APP ---
def main():
    """This function runs the main Streamlit application."""
    st.set_page_config(layout="wide")
    st.title("🎬 Gemini-Powered Movie Recommender")

    final_df = load_data()
    movie_titles = final_df['title'].sort_values().tolist()
    
    st.header("1. Get Recommendations by Movie Title")
    selected_movie = st.selectbox("Choose a movie:", options=movie_titles)

    if st.button("Get Recommendations"):
        if selected_movie:
            with st.spinner('Finding similar movies and generating an explanation...'):
                recommendations = get_recommendations(selected_movie, final_df)
                if not recommendations.empty:
                    st.subheader(f"Movies similar to '{selected_movie}':")
                    top_rec_title = recommendations.iloc[0]['title']
                    explanation = get_recommendation_explanation(selected_movie, top_rec_title)
                    st.info(explanation)
                    
                    cols = st.columns(5)
                    for i, (index, row) in enumerate(recommendations.iterrows()):
                        with cols[i]:
                            poster_url = fetch_poster(row['tmdbId'])
                            st.image(poster_url)
                            st.caption(f"{row['title']} - *{row['genres']}*")
                else:
                    st.error("Could not find recommendations.")
    
    st.divider()

    st.header("🔮 2. Find a Movie by Vibe")
    vibe_prompt = st.text_area("Describe the kind of movie you want to watch:")

    if st.button("Find by Vibe"):
        if vibe_prompt:
            with st.spinner("Searching for the perfect movie..."):
                results = find_movies_by_vibe(vibe_prompt, final_df)
                st.subheader("Here are some movies that match your vibe:")
                
                cols = st.columns(5)
                for i, (index, row) in enumerate(results.iterrows()):
                    with cols[i]:
                        poster_url = fetch_poster(row['tmdbId'])
                        st.image(poster_url)
                        st.caption(f"{row['title']} - *{row['genres']}*")

# --- SCRIPT EXECUTION ---
if __name__ == "__main__":
    main()