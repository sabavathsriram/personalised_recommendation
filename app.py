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
# import streamlit as st
# import os
# import pandas as pd
# from dotenv import load_dotenv
# import google.generativeai as genai

# # --- CONFIGURATION (This is OK at the top level) ---
# load_dotenv()
# genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

# # --- FUNCTION DEFINITIONS ---
# # This is a good place for all your functions

# @st.cache_data
# def load_movie_data():
#     """Loads movie data from the CSV file."""
#     return pd.read_csv('data/movies.csv')

# @st.cache_data 
# def get_movie_embedding(title: str, genre: str):
#     """Generates an embedding for a movie using the Gemini API."""
#     embedding_model = 'text-embedding-004'
#     prompt = f"Title: {title}\nGenres: {genre}"
#     embedding = genai.embed_content(model=embedding_model, content=prompt)
#     return embedding['embedding']

# # --- MAIN APP LOGIC ---
# # All your app's display and logic goes inside main()
# def main():
#     """This function runs the main Streamlit application."""
#     st.title("My Personalized Recommendation Engine")

#     # Load and display movie data
#     movie_df = load_movie_data()
#     st.subheader("Movie Data")
#     st.write("Here are the first few movies from our dataset:")
#     st.dataframe(movie_df.head())
    
#     st.divider()

#     # --- Embedding Test Section ---
#     st.subheader("Embedding Test for 'Toy Story'")
    
#     first_movie = movie_df.iloc[0]
#     # We call our embedding function from inside main()
#     first_movie_embedding = get_movie_embedding(first_movie['title'], first_movie['genres'])
    
#     st.write(f"Movie: {first_movie['title']}")
#     st.write("The first 5 numbers of its 'fingerprint':")
#     st.write(first_movie_embedding[:5])

#     st.divider()

#     # --- Gemini Chat Section ---
#     st.subheader("Ask Gemini Anything")
#     # Note: We define the chat model inside main() where it's used
#     chat_model = genai.GenerativeModel('gemini-1.5-flash-latest')
#     user_prompt = st.text_input("Ask a question:")

#     if st.button("Get Response"):
#         if user_prompt:
#             response = chat_model.generate_content(user_prompt)
#             st.subheader("Gemini's Response:")
#             st.write(response.text)
#         else:
#             st.write("Please enter a prompt first!")

# # This calls our main function when the script is run.
# if __name__ == "__main__":
#     main()
# import streamlit as st
# import pandas as pd
# import numpy as np
# from sklearn.metrics.pairwise import cosine_similarity

# # --- CONFIGURATION & DATA LOADING ---

# @st.cache_data
# def load_data():
#     """Loads the movie embeddings from the Parquet file."""
#     df = pd.read_parquet("data/movie_embeddings.parquet")
#     return df

# # --- RECOMMENDATION LOGIC ---

# def get_recommendations(title: str, df: pd.DataFrame, top_n: int = 5):
#     """
#     Finds movies similar to a given title using cosine similarity on their embeddings.
    
#     Args:
#         title (str): The title of the movie to get recommendations for.
#         df (pd.DataFrame): The DataFrame containing movie titles and embeddings.
#         top_n (int): The number of recommendations to return.
        
#     Returns:
#         A list of the top N recommended movie titles.
#     """
#     # 1. Get the embedding vector for the input movie
#     try:
#         query_embedding = df[df['title'] == title]['embedding'].iloc[0]
#     except IndexError:
#         return ["Movie not found. Please select another."]

#     # 2. Reshape the query embedding to be a 2D array
#     query_embedding = np.array(query_embedding).reshape(1, -1)

#     # 3. Get all other embeddings
#     all_embeddings = np.stack(df['embedding'].values)

#     # 4. Calculate cosine similarity between the query and all movies
#     similarities = cosine_similarity(query_embedding, all_embeddings).flatten()

#     # 5. Get the indices of the top N most similar movies
#     # We use argsort to get indices, then reverse it and take the top N+1 (to exclude the movie itself)
#     top_indices = np.argsort(similarities)[::-1][1:top_n+1]

#     # 6. Return the titles of the recommended movies
#     recommended_titles = df.iloc[top_indices]['title'].tolist()
    
#     return recommended_titles


# # --- MAIN APP ---

# def main():
#     """This function runs the main Streamlit application."""
#     st.set_page_config(layout="wide")
#     st.title("🎬 Gemini-Powered Movie Recommender")
#     st.write("Select a movie you like, and we'll recommend others based on its AI-generated 'fingerprint'!")

#     # Load the data
#     embeddings_df = load_data()

#     # Get a list of movie titles for the dropdown
#     movie_titles = embeddings_df['title'].sort_values().tolist()

#     # --- UI COMPONENTS ---
#     selected_movie = st.selectbox(
#         "Choose a movie:",
#         options=movie_titles
#     )

#     if st.button("Get Recommendations"):
#         if selected_movie:
#             with st.spinner('Finding similar movies...'):
#                 recommendations = get_recommendations(selected_movie, embeddings_df)
                
#                 st.subheader(f"Movies similar to '{selected_movie}':")
                
#                 if recommendations and "Movie not found" not in recommendations[0]:
#                     for movie_title in recommendations:
#                         st.success(movie_title) # Display recommendations in green boxes
#                 else:
#                     st.error(recommendations[0])

# # --- SCRIPT EXECUTION ---

# if __name__ == "__main__":
#     main()
import streamlit as st
import pandas as pd
import numpy as np
import google.generativeai as genai
import os
from dotenv import load_dotenv
from sklearn.metrics.pairwise import cosine_similarity

# --- CONFIGURATION & DATA LOADING ---
load_dotenv()
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
@st.cache_data
def load_data():
    """Loads the movie embeddings from the Parquet file."""
    df = pd.read_parquet("data/movie_embeddings.parquet")
    return df

# --- RECOMMENDATION LOGIC ---

# We add our chat model here to use it in both functions
chat_model = genai.GenerativeModel('gemini-1.5-flash-latest')

@st.cache_data
def get_recommendations(title: str, df: pd.DataFrame, top_n: int = 5):
    """Finds movies similar to a given title using cosine similarity."""
    try:
        query_embedding = df[df['title'] == title]['embedding'].iloc[0]
    except IndexError:
        return ["Movie not found. Please select another."]

    query_embedding = np.array(query_embedding).reshape(1, -1)
    all_embeddings = np.stack(df['embedding'].values)
    similarities = cosine_similarity(query_embedding, all_embeddings).flatten()
    top_indices = np.argsort(similarities)[::-1][1:top_n+1]
    recommended_titles = df.iloc[top_indices]['title'].tolist()
    
    return recommended_titles

# --- NEW: EXPLAINABLE AI FUNCTION ---
def get_recommendation_explanation(original_movie: str, recommended_movie: str):
    """Generates a brief explanation for why a movie is recommended."""
    prompt = f"""
    You are a friendly and knowledgeable movie expert.
    In one concise and engaging sentence, explain why someone who liked the movie "{original_movie}" would also enjoy the movie "{recommended_movie}".
    Focus on themes, style, or actors.
    """
    try:
        response = chat_model.generate_content(prompt)
        return response.text
    except Exception as e:
        return f"Could not generate explanation: {e}"

# --- MAIN APP ---

def main():
    """This function runs the main Streamlit application."""
    st.set_page_config(layout="wide")
    st.title("🎬 Gemini-Powered Movie Recommender")
    st.write("Select a movie you like, and we'll recommend others based on its AI-generated 'fingerprint'!")

    embeddings_df = load_data()
    movie_titles = embeddings_df['title'].sort_values().tolist()

    selected_movie = st.selectbox(
        "Choose a movie:",
        options=movie_titles
    )

    if st.button("Get Recommendations"):
        if selected_movie:
            with st.spinner('Finding similar movies and generating an explanation...'):
                recommendations = get_recommendations(selected_movie, embeddings_df)
                
                st.subheader(f"Movies similar to '{selected_movie}':")
                
                if recommendations and "Movie not found" not in recommendations[0]:
                    # --- NEW: Get and display the explanation for the top recommendation ---
                    top_recommendation = recommendations[0]
                    explanation = get_recommendation_explanation(selected_movie, top_recommendation)
                    st.info(explanation) # Display explanation in a blue info box

                    # Display the rest of the recommendations
                    for movie_title in recommendations:
                        st.success(movie_title)
                else:
                    st.error(recommendations[0])

# --- SCRIPT EXECUTION ---
if __name__ == "__main__":
    main()