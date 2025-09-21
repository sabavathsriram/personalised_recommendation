// A "dummy" array of movie objects for testing our front-end
const dummyRecommendations = [
    { title: "Inception (2010)", posterUrl: "https://via.placeholder.com/500x750.png?text=Inception" },
    { title: "The Matrix (1999)", posterUrl: "https://via.placeholder.com/500x750.png?text=The+Matrix" },
    { title: "Interstellar (2014)", posterUrl: "https://via.placeholder.com/500x750.png?text=Interstellar" },
    { title: "Parasite (2019)", posterUrl: "https://via.placeholder.com/500x750.png?text=Parasite" },
    { title: "The Dark Knight (2008)", posterUrl: "https://via.placeholder.com/500x750.png?text=The+Dark+Knight" }
];
// Get a reference to the important HTML elements we need to interact with
// Get a reference to the important HTML elements
const recommendBtn = document.getElementById('recommend-btn');
const movieInput = document.getElementById('movie-input'); // Get the new input box
const resultsGrid = document.getElementById('results-grid');
const explanationContainer = document.getElementById('explanation-container');

// This function displays the movies. It's the same as before, but it will get real data.
// This function is responsible for displaying the movies on the page
function displayMovies(movies) {
    // First, clear out any old results
    resultsGrid.innerHTML = '';

    // Loop through each movie in our data array
    movies.forEach(movie => {
        // For each movie, create a new <div> to hold its poster and title
        const movieCard = document.createElement('div');
        // Add the CSS class to the div
        movieCard.classList.add('movie-card');
        // Create an <img> element for the poster
        const poster = document.createElement('img');
        poster.src = movie.posterUrl; // Use the posterUrl from our API
        poster.alt = movie.title; // Add alt text for accessibility

        // Create a <p> element for the title
        const title = document.createElement('p');
        title.textContent = movie.title;

        // Add the poster and title to our movie card
        movieCard.appendChild(poster);
        movieCard.appendChild(title);

        // Add the completed movie card to our results grid on the webpage
        resultsGrid.appendChild(movieCard);
    });
}
recommendBtn.addEventListener('click', async () => {
    const movieTitle = movieInput.value;
    if (!movieTitle) {
        alert("Please enter a movie title.");
        return;
    }
    
    // Clear previous results
    resultsGrid.innerHTML = '';
    explanationContainer.innerHTML = '';

    try {
        const response = await fetch(`http://127.0.0.1:8000/recommend/${movieTitle}`);
        const data = await response.json();

        if (data.error) {
            resultsGrid.innerHTML = `<p>${data.error}</p>`;
        } else {
            // --- NEW: Display the explanation ---
            if (data.explanation) {
                const explanationPara = document.createElement('p');
                explanationPara.classList.add('explanation'); // Add class for styling
                explanationPara.textContent = data.explanation;
                explanationContainer.appendChild(explanationPara);
            }
            // --- END OF NEW CODE ---
            
            displayMovies(data.recommendations);
        }
    } catch (error) {
        console.error("Error fetching recommendations:", error);
        resultsGrid.innerHTML = `<p>Could not connect to the API server.</p>`;
    }
});
// Listen for a 'click' event on our button
recommendBtn.addEventListener('click', async () => {
    // 1. Get the movie title the user typed in
    const movieTitle = movieInput.value;
    if (!movieTitle) {
        alert("Please enter a movie title.");
        return;
    }

    // 2. Call our FastAPI backend
    try {
        // Use fetch() to send a request to our running API
        const response = await fetch(`http://127.0.0.1:8000/recommend/${movieTitle}`);
        const data = await response.json(); // Parse the JSON response

        // 3. Check for errors from the API or display the results
        if (data.error) {
            resultsGrid.innerHTML = `<p>${data.error}</p>`;
        } else {
            // We don't have poster URLs in this response yet, so we'll just show titles
            displayMovies(data.recommendations);
        }
    } catch (error) {
        console.error("Error fetching recommendations:", error);
        resultsGrid.innerHTML = `<p>Could not connect to the API server.</p>`;
    }
});