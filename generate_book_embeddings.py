import pandas as pd
import google.generativeai as genai
import os
from dotenv import load_dotenv
import time
from tqdm import tqdm

# --- CONFIGURATION ---
load_dotenv()
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

INPUT_FILE = 'data/books.csv'
OUTPUT_FILE = 'data/book_embeddings.parquet'
CHECKPOINT_INTERVAL = 50  # Save progress every 50 books

# --- FUNCTIONS ---
def get_book_embedding(title: str, author: str):
    """Generates an embedding for a book using its title and author."""
    embedding_model = 'text-embedding-004'
    prompt = f"Title: {title}\nAuthor(s): {author}"
    try:
        embedding = genai.embed_content(model=embedding_model, content=prompt)
        return embedding['embedding']
    except Exception as e:
        print(f"\nAn error occurred for book '{title}': {e}")
        return None

# --- MAIN SCRIPT LOGIC ---
def main():
    """Generates and saves embeddings for all books, with checkpointing and robust data cleaning."""
    print(f"Loading book data from '{INPUT_FILE}'...")
    book_df = pd.read_csv(INPUT_FILE, on_bad_lines='skip')

    # --- NEW: ROBUST DATA CLEANING ---
    # Drop rows where essential information is missing to prevent errors
    original_rows = len(book_df)
    book_df.dropna(subset=['bookID', 'title', 'authors', 'isbn'], inplace=True)
    cleaned_rows = len(book_df)
    print(f"Data cleaning complete. Removed {original_rows - cleaned_rows} rows with missing essential data.")
    # --- END OF NEW CODE ---

    processed_book_ids = set()
    embeddings_df = pd.DataFrame()

    if os.path.exists(OUTPUT_FILE):
        print(f"Found existing embeddings file. Loading progress from '{OUTPUT_FILE}'...")
        embeddings_df = pd.read_parquet(OUTPUT_FILE)
        processed_book_ids = set(embeddings_df['bookID'].tolist())
        print(f"Loaded {len(processed_book_ids)} existing embeddings.")
    
    unprocessed_books_df = book_df[~book_df['bookID'].isin(processed_book_ids)]

    if unprocessed_books_df.empty:
        print("All books have already been processed. Nothing to do.")
        return

    print(f"Starting to process {len(unprocessed_books_df)} remaining books...")
    
    new_embeddings_list = []
    
    for i, (index, row) in enumerate(tqdm(unprocessed_books_df.iterrows(), total=unprocessed_books_df.shape[0], desc="Processing Books")):
        # NEW: Ensure title and authors are strings to prevent errors
        book_title = str(row['title'])
        book_authors = str(row['authors'])
        
        embedding = get_book_embedding(book_title, book_authors)
        
        if embedding:
            new_embeddings_list.append({
                'bookID': row['bookID'],
                'title': book_title,
                'authors': book_authors,
                'isbn': row['isbn'],
                'embedding': embedding
            })
        
        time.sleep(1)

        # Checkpointing logic
        if (i + 1) % CHECKPOINT_INTERVAL == 0 and new_embeddings_list:
            print(f"\nCheckpointing progress for {len(new_embeddings_list)} new books...")
            new_df_chunk = pd.DataFrame(new_embeddings_list)
            combined_df = pd.concat([embeddings_df, new_df_chunk], ignore_index=True)
            combined_df.to_parquet(OUTPUT_FILE, index=False)
            
            embeddings_df = combined_df
            new_embeddings_list = []

    # Final save
    if new_embeddings_list:
        print("\nSaving final batch of embeddings...")
        final_new_df = pd.DataFrame(new_embeddings_list)
        final_df = pd.concat([embeddings_df, final_new_df], ignore_index=True)
        final_df.to_parquet(OUTPUT_FILE, index=False)

    print("\nProcessing complete.")

if __name__ == "__main__":
    main()