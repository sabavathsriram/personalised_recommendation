import pandas as pd
import google.generativeai as genai
import os
from dotenv import load_dotenv
import time
from tqdm import tqdm

# Configure the API
load_dotenv()
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
OUTPUT_FILE = 'data/movie_embeddings.parquet'
CHECKPOINT_INTERVAL = 50  # Save progress every 50 movies

# --- FUNCTIONS ---
def get_movie_embedding(title: str, genre: str):
    """Generates an embedding for a movie."""
    embedding_model = 'text-embedding-004'
    prompt = f"Title: {title}\nGenres: {genre}"
    try:
        embedding = genai.embed_content(model=embedding_model, content=prompt)
        return embedding['embedding']
    except Exception as e:
        # We add \n to not mess up the progress bar
        print(f"\nAn error occurred for movie '{title}': {e}")
        return None

# --- MAIN SCRIPT LOGIC ---
def main():
    """Generates and saves embeddings, with checkpointing to resume progress."""
    print("Loading movie data...")
    movie_df = pd.read_csv('data/movies.csv')

    processed_movie_ids = set()
    embeddings_df = pd.DataFrame()

    if os.path.exists(OUTPUT_FILE):
        print(f"Found existing embeddings file. Loading progress from '{OUTPUT_FILE}'...")
        embeddings_df = pd.read_parquet(OUTPUT_FILE)
        processed_movie_ids = set(embeddings_df['movieId'].tolist())
        print(f"Loaded {len(processed_movie_ids)} existing embeddings.")
    
    unprocessed_movies_df = movie_df[~movie_df['movieId'].isin(processed_movie_ids)]

    if unprocessed_movies_df.empty:
        print("All movies have already been processed. Nothing to do.")
        return

    print(f"Starting to process {len(unprocessed_movies_df)} remaining movies...")
    
    new_embeddings_list = []
    
    # Use enumerate to get an index for checkpointing
    for i, (index, row) in enumerate(tqdm(unprocessed_movies_df.iterrows(), total=unprocessed_movies_df.shape[0], desc="Processing Movies")):
        embedding = get_movie_embedding(row['title'], row['genres'])
        
        if embedding:
            new_embeddings_list.append({
                'movieId': row['movieId'],
                'title': row['title'],
                'embedding': embedding
            })
        
        time.sleep(1) 

        # --- NEW: CHECKPOINTING LOGIC ---
        # Check if we need to save a checkpoint
        if (i + 1) % CHECKPOINT_INTERVAL == 0 and new_embeddings_list:
            print(f"\nCheckpointing progress for {len(new_embeddings_list)} new movies...")
            new_df_chunk = pd.DataFrame(new_embeddings_list)
            # Combine old and new results and save
            combined_df = pd.concat([embeddings_df, new_df_chunk], ignore_index=True)
            combined_df.to_parquet(OUTPUT_FILE, index=False)
            
            # Update our main dataframe and clear the list for the next chunk
            embeddings_df = combined_df
            new_embeddings_list = [] # Reset the list

    # --- FINAL SAVE for any remaining movies ---
    if new_embeddings_list:
        print("\nSaving final batch of embeddings...")
        final_new_df = pd.DataFrame(new_embeddings_list)
        final_df = pd.concat([embeddings_df, final_new_df], ignore_index=True)
        final_df.to_parquet(OUTPUT_FILE, index=False)

    print("\nProcessing complete.")


if __name__ == "__main__":
    main()