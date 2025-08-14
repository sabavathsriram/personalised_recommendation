import pandas as pd
import google.generativeai as genai
import os
from dotenv import load_dotenv
import time
from tqdm import tqdm

# Configure the API
load_dotenv()
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

# --- FUNCTIONS (copied from our app.py) ---
def get_movie_embedding(title: str, genre: str):
    """Generates an embedding for a movie."""
    embedding_model = 'text-embedding-004'
    prompt = f"Title: {title}\nGenres: {genre}"
    
    try:
        embedding = genai.embed_content(model=embedding_model, content=prompt)
        return embedding['embedding']
    except Exception as e:
        print(f"An error occurred for movie '{title}': {e}")
        return None

# --- MAIN SCRIPT LOGIC ---
def main():
    """Generates and saves embeddings for all movies."""
    print("Loading movie data...")
    # Load the original movie data
    movie_df = pd.read_csv('data/movies.csv')

    # Create a new DataFrame to store results
    embeddings_list = []
    
    print("Generating embeddings... This will take a very long time.")
    # Use tqdm to create a progress bar
    for index, row in tqdm(movie_df.iterrows(), total=movie_df.shape[0], desc="Processing Movies"):
        movie_title = row['title']
        movie_genre = row['genres']
        
        # Get the embedding
        embedding = get_movie_embedding(movie_title, movie_genre)
        
        if embedding:
            # Add the result to our list
            embeddings_list.append({
                'movieId': row['movieId'],
                'title': movie_title,
                'embedding': embedding
            })
        
        # Respect the API rate limit (e.g., 60 requests per minute)
        time.sleep(1) 

    # Create a new DataFrame from our list of embeddings
    embeddings_df = pd.DataFrame(embeddings_list)

    # Save the embeddings to a Parquet file
    print("\nSaving embeddings to file...")
    embeddings_df.to_parquet('data/movie_embeddings.parquet', index=False)
    print("Embeddings have been generated and saved to 'data/movie_embeddings.parquet'")


if __name__ == "__main__":
    main()