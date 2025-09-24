import pandas as pd
import google.generativeai as genai
import os
from dotenv import load_dotenv
import time
from tqdm import tqdm

# --- CONFIGURATION ---
load_dotenv()
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

INPUT_FILE = 'data/spotify_tracks.csv'
OUTPUT_FILE = 'data/music_embeddings.parquet'
CHECKPOINT_INTERVAL = 100  # Save progress every 100 songs

# --- FUNCTIONS ---
def get_music_embedding(track: str, artist: str, album: str, genre: str):
    """Generates an embedding for a song."""
    embedding_model = 'text-embedding-004'
    # Create a rich prompt for music
    prompt = f"Track: {track}\nArtist(s): {artist}\nAlbum: {album}\nGenre: {genre}"
    try:
        embedding = genai.embed_content(model=embedding_model, content=prompt)
        return embedding['embedding']
    except Exception as e:
        print(f"\nAn error occurred for track '{track}': {e}")
        return None

# --- MAIN SCRIPT LOGIC ---
def main():
    """Generates and saves embeddings for all songs, with checkpointing."""
    print(f"Loading music data from '{INPUT_FILE}'...")
    music_df = pd.read_csv(INPUT_FILE, on_bad_lines='skip')

    # --- Data Cleaning ---
    essential_cols = ['track_id', 'track_name', 'artists', 'album_name', 'track_genre']
    music_df.dropna(subset=essential_cols, inplace=True)
    print("Data cleaning complete.")
    
    processed_track_ids = set()
    embeddings_df = pd.DataFrame()

    if os.path.exists(OUTPUT_FILE):
        print(f"Found existing embeddings file. Loading progress...")
        embeddings_df = pd.read_parquet(OUTPUT_FILE)
        processed_track_ids = set(embeddings_df['track_id'].tolist())
        print(f"Loaded {len(processed_track_ids)} existing embeddings.")
    
    unprocessed_music_df = music_df[~music_df['track_id'].isin(processed_track_ids)]

    if unprocessed_music_df.empty:
        print("All songs have already been processed.")
        return

    print(f"Starting to process {len(unprocessed_music_df)} remaining songs...")
    
    new_embeddings_list = []
    
    for i, (index, row) in enumerate(tqdm(unprocessed_music_df.iterrows(), total=unprocessed_music_df.shape[0], desc="Processing Music")):
        embedding = get_music_embedding(
            track=str(row['track_name']),
            artist=str(row['artists']),
            album=str(row['album_name']),
            genre=str(row['track_genre'])
        )
        
        if embedding:
            new_embeddings_list.append({
                'track_id': row['track_id'],
                'track_name': row['track_name'],
                'artists': row['artists'],
                'embedding': embedding
            })
        
        time.sleep(1) # Respect API rate limits

        # Checkpointing logic
        if (i + 1) % CHECKPOINT_INTERVAL == 0 and new_embeddings_list:
            print(f"\nCheckpointing progress...")
            new_df_chunk = pd.DataFrame(new_embeddings_list)
            combined_df = pd.concat([embeddings_df, new_df_chunk], ignore_index=True)
            combined_df.to_parquet(OUTPUT_FILE, index=False)
            
            embeddings_df = combined_df
            new_embeddings_list = []

    # Final save
    if new_embeddings_list:
        print("\nSaving final batch...")
        final_new_df = pd.DataFrame(new_embeddings_list)
        final_df = pd.concat([embeddings_df, final_new_df], ignore_index=True)
        final_df.to_parquet(OUTPUT_FILE, index=False)

    print("\nProcessing complete.")

if __name__ == "__main__":
    main()