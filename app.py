# import streamlit as st
# import os
# from dotenv import load_dotenv
# import pandas as pd
# import google.generativeai as genai
# def load_movie_data():
#     return pd.read_csv('data/movies.csv')
# movie_df=load_movie_data()
# load_dotenv()
# genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
# @st.cache_data
# def get_movie_embedding(title,genre):
#     embedding_model='text-embedding-004'
#     prompt=f"title: {title}\nGenre: {genre}."
#     embedding=genai.embed_content(model=embedding_model,content=prompt)
#     return embedding['embedding']
# first_movie=movie_df.iloc[0]
# first_movie_title=first_movie['title']
# first_movie_genre=first_movie['genres']
# first_movie_embeddings=get_movie_embedding(first_movie_title,first_movie_genre)
# st.subheader("Embedding Test for the First Movie:")
# st.write(f"Movie:{first_movie_title}")
# st.write("The first 5 numbers of its 'fingerprint':")
# st.write(first_movie_embeddings[:5])
# def main():
#     """This function runs the main Streamlit application."""
#     st.title("My Personalized Recommendation Engine")

#     # Load and display movie data
#     movie_df = load_movie_data()
#     st.subheader("Movie Data")
#     st.write("Here are the first few movies from our dataset:")
#     st.dataframe(movie_df.head())
    
#     st.divider() # Adds a horizontal line for separation

#     # --- Embedding Test Section ---
#     st.subheader("Embedding Test for 'Toy Story'")
    
#     # Get the embedding for the first movie (Toy Story)
#     first_movie = movie_df.iloc[0]
#     first_movie_embedding = get_movie_embedding(first_movie['title'], first_movie['genres'])
    
#     st.write(f"Movie: {first_movie['title']}")
#     st.write("The first 5 numbers of its 'fingerprint':")
#     st.write(first_movie_embedding[:5])

#     st.divider() # Another horizontal line

#     # --- Gemini Chat Section ---
#     st.subheader("Ask Gemini Anything")
#     model = genai.GenerativeModel('gemini-1.5-flash-latest')
#     user_prompt = st.text_input("Ask a question:")

#     if st.button("Get Response"):
#         if user_prompt:
#             response = model.generate_content(user_prompt)
#             st.subheader("Gemini's Response:")
#             st.write(response.text)
#         else:
#             st.write("Please enter a prompt first!")

# # This is the standard way to run a Python script.
# # It ensures main() is called only when you run `streamlit run app.py`
# if __name__ == "__main__":
#     main()
# if __name__ == "__main__":
#     main()
import streamlit as st
import os
import pandas as pd
from dotenv import load_dotenv
import google.generativeai as genai

# --- CONFIGURATION (This is OK at the top level) ---
load_dotenv()
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

# --- FUNCTION DEFINITIONS ---
# This is a good place for all your functions

@st.cache_data
def load_movie_data():
    """Loads movie data from the CSV file."""
    return pd.read_csv('data/movies.csv')

@st.cache_data
def get_movie_embedding(title: str, genre: str):
    """Generates an embedding for a movie using the Gemini API."""
    embedding_model = 'text-embedding-004'
    prompt = f"Title: {title}\nGenres: {genre}"
    embedding = genai.embed_content(model=embedding_model, content=prompt)
    return embedding['embedding']

# --- MAIN APP LOGIC ---
# All your app's display and logic goes inside main()
def main():
    """This function runs the main Streamlit application."""
    st.title("My Personalized Recommendation Engine")

    # Load and display movie data
    movie_df = load_movie_data()
    st.subheader("Movie Data")
    st.write("Here are the first few movies from our dataset:")
    st.dataframe(movie_df.head())
    
    st.divider()

    # --- Embedding Test Section ---
    st.subheader("Embedding Test for 'Toy Story'")
    
    first_movie = movie_df.iloc[0]
    # We call our embedding function from inside main()
    first_movie_embedding = get_movie_embedding(first_movie['title'], first_movie['genres'])
    
    st.write(f"Movie: {first_movie['title']}")
    st.write("The first 5 numbers of its 'fingerprint':")
    st.write(first_movie_embedding[:5])

    st.divider()

    # --- Gemini Chat Section ---
    st.subheader("Ask Gemini Anything")
    # Note: We define the chat model inside main() where it's used
    chat_model = genai.GenerativeModel('gemini-1.5-flash-latest')
    user_prompt = st.text_input("Ask a question:")

    if st.button("Get Response"):
        if user_prompt:
            response = chat_model.generate_content(user_prompt)
            st.subheader("Gemini's Response:")
            st.write(response.text)
        else:
            st.write("Please enter a prompt first!")

# This calls our main function when the script is run.
if __name__ == "__main__":
    main()