import pandas as pd

# This is the path to the file you want to open
file_path = 'data/movie_embeddings.parquet'

print(f"Attempting to open: {file_path}")

try:
    # Read the Parquet file into a DataFrame
    df = pd.read_parquet(file_path)

    # Print the first 5 rows to the terminal
    print("\nSuccessfully loaded the file! Here are the first 5 rows:")
    print(df.head())
    
    print(f"\nTotal movies in the file: {len(df)}")

except FileNotFoundError:
    print(f"\nERROR: The file was not found at '{file_path}'")
    print("Please make sure the 'generate_embeddings.py' script has finished running successfully.")