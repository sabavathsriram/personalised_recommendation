import pandas as pd
import numpy as np
import os
from dotenv import load_dotenv
import google.generativeai as genai
from sklearn.metrics.pairwise import cosine_similarity
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import re
from pymongo import MongoClient
from bson.objectid import ObjectId
import jwt
import logging
from contextlib import asynccontextmanager

# Set up logging for debugging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- CONFIGURATION ---
load_dotenv()
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
TMDB_API_KEY = os.getenv("TMDB_API_KEY")
GOOGLE_BOOKS_API_KEY = os.getenv("GOOGLE_BOOKS_API_KEY")
SPOTIFY_CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID")
SPOTIFY_CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET")

MONGO_URI = os.getenv("MONGO_URI")
JWT_SECRET = os.getenv("JWT_SECRET")
client = MongoClient(MONGO_URI)
db = client.recommenderDB
users_collection = db.users

# --- CACHING ---
_cache = {}



# --- LIFESPAN EVENTS ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting up application...")
    train_collaborative_model()
    logger.info("Application startup complete.")
    yield
    # Shutdown
    logger.info("Shutting down application...")

app = FastAPI(lifespan=lifespan)

@app.get("/test")
def test_endpoint():
    return {
        "message": "API is working",
        "movie_count": len(movie_df),
        "book_count": len(book_df),
        "music_count": len(music_df),
        "sample_movie": movie_df['title'].iloc[0] if len(movie_df) > 0 else "No movies"
    }

# Add request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"Request: {request.method} {request.url.path} {request.query_params}")
    response = await call_next(request)
    logger.info(f"Response: {response.status_code}")
    return response
# --- HELPER FUNCTIONS: DATA PROCESSING ---
def process_title_for_search(title: str):
    if not isinstance(title, str): return ""
    processed_title = re.sub(r'\s*\([^)]*\)\s*$', '', title).strip()
    if processed_title.endswith(', The'): processed_title = 'The ' + processed_title[:-5]
    if processed_title.endswith(', A'): processed_title = 'A ' + processed_title[:-3]
    if processed_title.endswith(', An'): processed_title = 'An ' + processed_title[:-4]
    processed_title = re.sub(r'^(the|a|an)\s+', '', processed_title, flags=re.IGNORECASE)
    return re.sub(r'[^a-zA-Z0-9]', '', processed_title).lower()

def load_movie_data():
    logger.info("Loading movie data...")
    if "movies" in _cache: 
        logger.info("Using cached movie data")
        return _cache["movies"]
    
    # Load the main embeddings file, which has our primary title list
    embeddings_df = pd.read_parquet("data/movie_embeddings.parquet", engine='fastparquet')
    
    # From the other files, ONLY load the columns we need to avoid name conflicts
    movies_genres_df = pd.read_csv("data/movies.csv")[['movieId', 'genres']]
    links_df = pd.read_csv("data/links.csv")[['movieId', 'tmdbId']]
    
    # Merge the dataframes
    merged_df = pd.merge(embeddings_df, movies_genres_df, on='movieId', how='inner')
    final_df = pd.merge(merged_df, links_df, on='movieId', how='inner')
    
    try:
        custom_embeddings_df = pd.read_parquet("data/custom_embeddings.parquet")
        final_df = pd.concat([final_df, custom_embeddings_df], ignore_index=True)
        logger.info(f"Successfully loaded and combined {len(custom_embeddings_df)} custom movies.")
    except FileNotFoundError:
        logger.warning("No custom movies file found.")
        
    final_df.dropna(subset=['tmdbId'], inplace=True)
    final_df['tmdbId'] = final_df['tmdbId'].astype(int)
    final_df['search_title'] = final_df['title'].apply(process_title_for_search)
    
    logger.info(f"Loaded {len(final_df)} movies")
    if len(final_df) > 0:
        logger.info(f"Sample movie titles: {final_df['title'].head(5).tolist()}")
    else:
        logger.warning("No movies loaded!")
    
    _cache["movies"] = final_df
    logger.info("Movie data loaded and cached.")
    return final_df

def load_book_data():
    """Loads and prepares the book data."""
    logger.info("Loading book data...")
    if "books" in _cache: return _cache["books"]
    
    df = pd.read_parquet("data/book_embeddings.parquet")
    df.dropna(subset=['isbn', 'title', 'authors'], inplace=True)
    df['search_title'] = df['title'].apply(process_title_for_search)
    
    _cache["books"] = df
    logger.info("Book data loaded and cached.")
    return df

def load_music_data():
    logger.info("Loading music data...")
    if "music" in _cache: return _cache["music"]
    df = pd.read_parquet("data/music_embeddings.parquet")
    df.dropna(subset=['track_id', 'track_name', 'artist_name', 'embedding'], inplace=True)
    df['search_title'] = df['track_name'].apply(process_title_for_search)
    df['search_artist'] = df['artist_name'].apply(lambda x: re.sub(r'[^a-zA-Z0-9]', '', str(x)).lower())
    _cache["music"] = df
    logger.info("Music data loaded.")
    return df

# Load data at startup
movie_df = load_movie_data()
book_df = load_book_data()
music_df = load_music_data()

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
        logger.error(f"API request failed for tmdbId {tmdb_id}: {e}")
        
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
        logger.error(f"Failed to get book cover for ISBN {isbn}: {e}")
        
    return "https://via.placeholder.com/500x750.png?text=No+Cover+Found"

# --- HELPER FUNCTIONS: RECOMMENDATION LOGIC ---
chat_model = genai.GenerativeModel('gemini-pro')

def get_movie_recommendations(title: str, df: pd.DataFrame, top_n: int = 5):
    """Finds movies similar to a given title."""
    search_term = process_title_for_search(title)
    movie_row = df[df['search_title'] == search_term]
    if movie_row.empty: 
        logger.warning(f"No movie found with search term: {search_term}")
        return pd.DataFrame()
    
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
    if book_row.empty: 
        logger.warning(f"No book found with search term: {search_term}")
        return pd.DataFrame()
    
    query_embedding = book_row['embedding'].iloc[0]
    query_embedding = np.array(query_embedding).reshape(1, -1)
    all_embeddings = np.stack(df['embedding'].values)
    similarities = cosine_similarity(query_embedding, all_embeddings).flatten()
    
    original_book_index = book_row.index[0]
    all_top_indices = np.argsort(similarities)[::-1][:top_n + 5]
    top_indices = [idx for idx in all_top_indices if idx != original_book_index][:top_n]
    return df.iloc[top_indices]

def get_music_recommendations(track_title: str, df: pd.DataFrame, top_n: int = 5):
    """Finds songs similar to a given track using precomputed embeddings."""
    search_term = process_title_for_search(track_title)
    song_row = df[df["search_title"] == search_term]
    if song_row.empty:
        logger.warning(f"No track found with search term: {search_term}")
        return pd.DataFrame()

    query_embedding = np.array(song_row["embedding"].iloc[0]).reshape(1, -1)
    all_embeddings = np.stack(df["embedding"].values)
    similarities = cosine_similarity(query_embedding, all_embeddings).flatten()

    original_index = song_row.index[0]
    all_top_indices = np.argsort(similarities)[::-1][: top_n + 5]
    top_indices = [idx for idx in all_top_indices if idx != original_index][:top_n]
    return df.iloc[top_indices]

def get_explanation(original_item: str, recommended_item: str, item_type: str):
    cache_key = f"exp_{item_type}_{original_item}_{recommended_item}"
    if cache_key in _cache: return _cache[cache_key]
    prompt = f"You are a friendly expert. In about 30-35 words, explain why someone who liked the {item_type} '{original_item}' would also enjoy the {item_type} '{recommended_item}'."
    try:
        response = chat_model.generate_content(prompt)
        explanation = response.text
        _cache[cache_key] = explanation
        return explanation
    except Exception as e:
        logger.error(f"Failed to generate explanation: {e}")
        return f"Could not generate explanation: {e}"

# --- Collaborative Filtering ---
try:
    from surprise import Dataset as _SurpriseDataset, Reader as _SurpriseReader, SVD as _SurpriseSVD
    _SURPRISE_AVAILABLE = True
except Exception:
    _SURPRISE_AVAILABLE = False
    _SurpriseDataset = _SurpriseReader = _SurpriseSVD = None

_collaborative_model = None

def _get_user_favorites(user_doc):
    """Normalize favorites entries; returns list of dicts with keys: type, itemId."""
    out = []
    for fav in user_doc.get('favorites', []):
        out.append({
            "type": fav.get("type") or fav.get("itemType"),
            "itemId": str(fav.get("itemId") or ""),
        })
    return out

def train_collaborative_model():
    """Train a simple SVD model from user favorites if Surprise is available."""
    global _collaborative_model
    if not _SURPRISE_AVAILABLE:
        logger.warning("Surprise not available; skipping collaborative model training.")
        _collaborative_model = None
        return
    try:
        all_users = list(users_collection.find({}, {"_id": 1, "favorites": 1}))
        ratings = []
        for u in all_users:
            uid = str(u["_id"])
            for fav in _get_user_favorites(u):
                if fav["type"] == "movie" and fav["itemId"]:
                    ratings.append({"userID": uid, "itemID": fav["itemId"], "rating": 1.0})
        if len(ratings) < 10:
            logger.warning("Not enough data to train collaborative model.")
            _collaborative_model = None
            return
        ratings_df = pd.DataFrame(ratings)
        reader = _SurpriseReader(rating_scale=(1, 1))
        data = _SurpriseDataset.load_from_df(ratings_df[['userID', 'itemID', 'rating']], reader)
        trainset = data.build_full_trainset()
        algo = _SurpriseSVD()
        algo.fit(trainset)
        _collaborative_model = algo
        logger.info("Collaborative model trained.")
    except Exception as e:
        logger.error(f"Collaborative training failed: {e}")
        _collaborative_model = None

# --- CORS MIDDLEWARE ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8081"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# --- API ENDPOINTS ---
@app.get("/")
def read_root():
    return {"message": "Welcome to the Recommender API!"}

@app.get("/search/movie/{query}")
def search_movies_api(query: str):
    logger.info(f"Searching for movies with query: {query}")
    if len(query) < 3: return {"results": []}
    search_term = process_title_for_search(query)
    matches = movie_df[movie_df['search_title'].str.contains(search_term, na=False)].head(10)
    logger.info(f"Found {len(matches)} movie matches")
    return {"results": matches['title'].tolist()}

@app.get("/search/book/{query}")
def search_books_api(query: str):
    logger.info(f"Searching for books with query: {query}")
    if len(query) < 3: return {"results": []}
    search_term = process_title_for_search(query)
    matches = book_df[book_df['search_title'].str.contains(search_term, na=False)].head(10)
    logger.info(f"Found {len(matches)} book matches")
    return {"results": matches['title'].tolist()}

@app.get("/search/music/{query}")
def search_music_api(query: str):
    logger.info(f"Searching for music with query: {query}")
    if len(query) < 3: return {"results": []}
    
    search_term = process_title_for_search(query)
    
    # Search by track name
    name_matches = music_df[music_df['search_title'].str.contains(search_term, na=False)]
    
    # Search by artist name
    artist_matches = music_df[music_df['search_artist'].str.contains(search_term, na=False)]
    
    # Combine results and remove duplicates based on track_id
    matches = pd.concat([name_matches, artist_matches]).drop_duplicates(subset=['track_id']).head(10)
    logger.info(f"Found {len(matches)} music matches")
    
    # Format results as "Track Name - Artist Name"
    results = (matches['track_name'] + " - " + matches['artist_name']).tolist()
    
    return {"results": results}

@app.get("/recommend/movie/{movie_title}")
def get_movie_recommendations_api(movie_title: str):
    logger.info(f"Getting movie recommendations for: {movie_title}")
    search_term = process_title_for_search(movie_title)
    original_movie_df = movie_df[movie_df['search_title'] == search_term]
    if original_movie_df.empty: 
        logger.warning(f"Movie not found: {movie_title}")
        return {"error": "Movie not found"}
    
    original_title = original_movie_df.iloc[0]['title']
    recommendations_df = get_movie_recommendations(movie_title, movie_df)
    if recommendations_df.empty: 
        logger.warning(f"No recommendations found for movie: {movie_title}")
        return {"error": "Could not find recommendations for this movie."} 
    
    results_df = recommendations_df.copy()
    results_df['posterUrl'] = results_df['tmdbId'].apply(fetch_poster)
    results_df['embedding'] = results_df['embedding'].apply(list)
    results_df = results_df.replace({np.nan: None})
    
    top_rec_title = results_df.iloc[0]['title']
    explanation_text = get_explanation(original_title, top_rec_title, item_type='movie')
    
    recommendations_json = results_df.to_dict('records')
    logger.info(f"Returning {len(recommendations_json)} movie recommendations")
    return {"recommendations": recommendations_json, "explanation": explanation_text}

@app.get("/recommend/book/{book_title}")
def get_book_recommendations_api(book_title: str):
    logger.info(f"Getting book recommendations for: {book_title}")
    search_term = process_title_for_search(book_title)
    original_book_df = book_df[book_df['search_title'] == search_term]
    if original_book_df.empty: 
        logger.warning(f"Book not found: {book_title}")
        return {"error": "Book not found"}
    
    original_title = original_book_df.iloc[0]['title']
    recommendations_df = get_book_recommendations(book_title, book_df)
    if recommendations_df.empty: 
        logger.warning(f"No recommendations found for book: {book_title}")
        return {"error": "Could not find recommendations for this book."}
    
    results_df = recommendations_df.copy()
    results_df['coverUrl'] = results_df['isbn'].apply(fetch_book_cover)
    results_df['embedding'] = results_df['embedding'].apply(list)
    results_df = results_df.replace({np.nan: None})
    
    top_rec_title = results_df.iloc[0]['title']
    explanation_text = get_explanation(original_title, top_rec_title, item_type='book')
    
    recommendations_json = results_df.to_dict('records')
    logger.info(f"Returning {len(recommendations_json)} book recommendations")
    return {"recommendations": recommendations_json, "explanation": explanation_text}

@app.get("/recommend/music/{track_title}")
def get_music_recommendations_api(track_title: str):
    logger.info(f"Getting music recommendations for: {track_title}")
    # If in "Track - Artist" form, keep the left side for matching track title
    normalized_input = track_title.split(" - ")[0].strip()
    search_term = process_title_for_search(normalized_input)

    original_song_df = music_df[music_df["search_title"] == search_term]
    if original_song_df.empty:
        logger.warning(f"Track not found: {track_title}")
        return {"error": "Track not found"}

    original_title = original_song_df.iloc[0]["track_name"]
    recommendations_df = get_music_recommendations(normalized_input, music_df)
    if recommendations_df.empty:
        logger.warning(f"No recommendations found for track: {track_title}")
        return {"error": "Could not find recommendations for this track."}

    # Prepare response; keep fields the frontend uses
    results_df = recommendations_df.copy()
    # Provide consistent field names the UI can render
    results_df = results_df.rename(
        columns={"track_name": "title", "artist_name": "artist_name", "genre": "genre"}
    )
    results_df["embedding"] = results_df["embedding"].apply(list)
    results_df = results_df.replace({np.nan: None})

    top_rec_title = results_df.iloc[0]["title"]
    explanation_text = get_explanation(original_title, top_rec_title, item_type="music")

    recommendations_json = results_df.to_dict("records")
    logger.info(f"Returning {len(recommendations_json)} music recommendations")
    return {"recommendations": recommendations_json, "explanation": explanation_text}

@app.get("/recommend/genre/movie/{genre}")
def get_random_movies_by_genre(genre: str, limit: int = 10):
    """Returns random movies matching the specified genre."""
    logger.info(f"Getting random movies for genre: {genre}")
    genre_lower = genre.lower()
    # Filter movies that contain the genre in their genres field
    matches = movie_df[movie_df['genres'].str.lower().str.contains(genre_lower, na=False)]
    
    if matches.empty:
        logger.warning(f"No movies found for genre: {genre}")
        return {"error": f"No movies found for genre: {genre}"}
    
    # Sample random movies
    sample_size = min(limit, len(matches))
    random_movies = matches.sample(n=sample_size)
    
    results_df = random_movies.copy()
    results_df['posterUrl'] = results_df['tmdbId'].apply(fetch_poster)
    results_df['embedding'] = results_df['embedding'].apply(list)
    results_df = results_df.replace({np.nan: None})
    
    explanation_text = f"Here are {sample_size} random {genre} movies from our collection."
    
    recommendations_json = results_df.to_dict('records')
    logger.info(f"Returning {len(recommendations_json)} random {genre} movies")
    return {"recommendations": recommendations_json, "explanation": explanation_text}

@app.get("/recommend/genre/book/{genre}")
def get_random_books_by_genre(genre: str, limit: int = 10):
    """Returns random books matching the specified genre."""
    logger.info(f"Getting random books for genre: {genre}")
    genre_lower = genre.lower()
    # Filter books that contain the genre in their category field
    matches = book_df[book_df['category'].str.lower().str.contains(genre_lower, na=False)]
    
    if matches.empty:
        logger.warning(f"No books found for genre: {genre}")
        return {"error": f"No books found for genre: {genre}"}
    
    # Sample random books
    sample_size = min(limit, len(matches))
    random_books = matches.sample(n=sample_size)
    
    results_df = random_books.copy()
    results_df['coverUrl'] = results_df['isbn'].apply(fetch_book_cover)
    results_df['embedding'] = results_df['embedding'].apply(list)
    results_df = results_df.replace({np.nan: None})
    
    explanation_text = f"Here are {sample_size} random {genre} books from our collection."
    
    recommendations_json = results_df.to_dict('records')
    logger.info(f"Returning {len(recommendations_json)} random {genre} books")
    return {"recommendations": recommendations_json, "explanation": explanation_text}

@app.get("/recommend/genre/music/{genre}")
def get_random_music_by_genre(genre: str, limit: int = 10):
    """Returns random music tracks matching the specified genre."""
    logger.info(f"Getting random music for genre: {genre}")
    genre_lower = genre.lower()
    # Filter music that contains the genre
    matches = music_df[music_df['genre'].str.lower().str.contains(genre_lower, na=False)]
    
    if matches.empty:
        logger.warning(f"No music found for genre: {genre}")
        return {"error": f"No music found for genre: {genre}"}
    
    # Sample random tracks
    sample_size = min(limit, len(matches))
    random_tracks = matches.sample(n=sample_size)
    
    results_df = random_tracks.copy()
    results_df = results_df.rename(
        columns={"track_name": "title", "artist_name": "artist_name", "genre": "genre"}
    )
    results_df['embedding'] = results_df['embedding'].apply(list)
    results_df = results_df.replace({np.nan: None})
    
    explanation_text = f"Here are {sample_size} random {genre} tracks from our collection."
    
    recommendations_json = results_df.to_dict('records')
    logger.info(f"Returning {len(recommendations_json)} random {genre} tracks")
    return {"recommendations": recommendations_json, "explanation": explanation_text}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)