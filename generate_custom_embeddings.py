import pandas as pd
import google.generativeai as genai
import os
from dotenv import load_dotenv
from tqdm import tqdm
import time

load_dotenv()
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

def get_embedding(title: str, genre: str):
    embedding_model = 'text-embedding-004'
    prompt = f"Title: {title}\nGenres: {genre}"
    try:
        embedding = genai.embed_content(model=embedding_model, content=prompt)
        return embedding['embedding']
    except Exception as e:
        print(f"Error for '{title}': {e}")
        return None

def main():
    custom_movies_df = pd.read_csv("data/custom_movies.csv")
    embeddings_list = []

    for index, row in tqdm(custom_movies_df.iterrows(), total=custom_movies_df.shape[0]):
        embedding = get_embedding(row['title'], row['genres'])
        if embedding:
            embeddings_list.append({
                'title': row['title'],
                'embedding': embedding,
                'genres': row['genres'],
                'tmdbId': row['tmdbId']
            })
        time.sleep(1) # Respect API limits

    embeddings_df = pd.DataFrame(embeddings_list)
    embeddings_df.to_parquet('data/custom_embeddings.parquet', index=False)
    print("\nCustom embeddings have been generated and saved!")

if __name__ == "__main__":
    main()