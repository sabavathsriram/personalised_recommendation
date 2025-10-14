import feather from "feather-icons";

document.addEventListener("DOMContentLoaded", () => {
  feather.replace();

  const introContainer = document.getElementById("intro-container");
  const introVideo = document.getElementById("intro-video");
  if (introVideo) {
    introVideo.addEventListener("ended", () => {
      introContainer.classList.add("fade-out");
      setTimeout(() => {
        introContainer.style.display = "none";
      }, 1000);
    });
  }

  const movieInput = document.getElementById("movie-input");
  const movieSuggestionsBox = document.getElementById("movie-suggestions-box");
  const movieRecommendBtn = document.getElementById("movie-recommend-btn");

  const bookInput = document.getElementById("book-input");
  const bookSuggestionsBox = document.getElementById("book-suggestions-box");
  const bookRecommendBtn = document.getElementById("book-recommend-btn");

  const musicInput = document.getElementById("music-input");
  const musicSuggestionsBox = document.getElementById("music-suggestions-box");
  const musicRecommendBtn = document.getElementById("music-recommend-btn");

  const resultsGrid = document.getElementById("results-grid");
  const explanationContainer = document.getElementById("explanation-container");
  const loader = document.getElementById("loader");
  const timerSpan = document.getElementById("timer");
  const statusMessage = document.getElementById("status-message");

  let timerInterval;

  function debounce(func, delay = 300) {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  }

  function startLoading() {
    if (loader) loader.style.display = "block";
    if (resultsGrid) resultsGrid.innerHTML = "";
    let seconds = 0;
    if (timerSpan) timerSpan.textContent = "0";
    timerInterval = setInterval(() => {
      seconds += 1;
      if (timerSpan) timerSpan.textContent = seconds.toString();
    }, 1000);
    return timerInterval;
  }

  function stopLoading(timer) {
    if (timer) clearInterval(timer);
    if (loader) loader.style.display = "none";
  }

  function createRecommendationCard(item, category) {
    const col = document.createElement("div");
    col.className = "col-lg-4 col-md-6";
    col.style.cssText = "opacity:0; transform: translateY(30px); transition: all 0.5s ease;";

    const imageUrl = category === "movies" ? item.posterUrl : category === "books" ? item.coverUrl : "";
    const title = item.title || item.track_name || "Untitled";
    const subtitle = category === "movies" ? (item.genres || "").toString() :
                    category === "books" ? (item.authors || "").toString() :
                    [item.artist_name, item.genre].filter(Boolean).join(" • ");

    const mediaClass = category === "movies" ? "movie-poster" : category === "books" ? "book-cover" : "album-cover";
    const iconClass = category === "movies" ? "play-overlay" : category === "books" ? "bookmark-overlay" : "headphone-overlay";
    const leadingIcon = category === "movies" ? "fas fa-star" : category === "books" ? "fas fa-bookmark" : "fas fa-headphones";

    col.innerHTML = `
      <div class="recommendation-card" style="position: relative;">
        <div class="card-glow"></div>
        <button class="favorite-btn" style="position: absolute; top: 16px; right: 16px; z-index: 10; background: rgba(0,0,0,0.6); border: none; border-radius: 50%; width: 40px; height: 40px; cursor: pointer; transition: all 0.3s; backdrop-filter: blur(4px);">
          <i class="fas fa-heart" style="color: rgba(255,107,107,0.8); font-size: 1.2rem; transition: all 0.3s;"></i>
        </button>
        <div class="card-content">
          <div class="${mediaClass}" style="${imageUrl ? `background-image:url('${imageUrl}');background-size:cover;background-position:center;` : ""}">
            <i class="${leadingIcon} ${iconClass}"></i>
          </div>
          <h3>${title}</h3>
          <p>${subtitle ? String(subtitle).slice(0, 80) : "AI-picked just for you."}</p>
          <div class="genre-tags">
            <span class="tag">AI-Powered</span>
            <span class="tag">${category === "books" ? "Books" : category === "movies" ? "Movies" : "Music"}</span>
          </div>
        </div>
      </div>
    `;

    const favBtn = col.querySelector(".favorite-btn");
    favBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const result = await toggleFavorite(item, category);
      const heartIcon = favBtn.querySelector(".fa-heart");
      if (result === true) {
        heartIcon.style.color = "rgba(255,77,77,1)";
        heartIcon.classList.remove("far");
        heartIcon.classList.add("fas");
      } else if (result === false) {
        heartIcon.style.color = "rgba(255,107,107,0.8)";
        heartIcon.classList.remove("fas");
        heartIcon.classList.add("far");
      }
    });

    return col;
  }

  async function toggleFavorite(item, category) {
    const token = getAuthToken();
    if (!token) {
      window.location.href = "/login";
      return null;
    }

    const itemId = category === "movies" ? item.tmdbId : category === "books" ? item.isbn : item.track_id;
    const title = item.title || item.track_name || "Untitled";
    const posterUrl = category === "movies" ? item.posterUrl : category === "books" ? item.coverUrl : "";

    try {
      const res = await fetch(`${window.AUTH_API_BASE}/favorites`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify({
          itemType: categoryToPath(category),
          itemId: String(itemId || ""),
          title,
          posterUrl,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const toast = document.createElement("div");
        toast.className = `toast-notification ${data.action === "removed" ? "removed" : ""}`;
        toast.innerHTML = `
          <i class="fas ${data.action === "removed" ? "fa-heart-broken" : "fa-heart"} toast-icon"></i>
          <span class="toast-message">${data.action === "added" ? "Added to favorites!" : "Removed from favorites"}</span>
        `;
        document.body.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add("show"));
        setTimeout(() => {
          toast.classList.remove("show");
          setTimeout(() => toast.remove(), 300);
        }, 3000);
        return data.action === "added";
      } else {
        console.error("[Favorites] Favorite error:", await res.text());
        return null;
      }
    } catch (e) {
      console.error("[Favorites] Favorite error:", e);
      return null;
    }
  }

  async function fetchSuggestions(input, category, suggestionsBox) {
    if (!input || input.length < 3) {
      suggestionsBox.innerHTML = "";
      return;
    }
    try {
      const response = await fetch(`${window.REC_API_BASE}/search/${categoryToPath(category)}/${encodeURIComponent(input)}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      suggestionsBox.innerHTML = "";
      (data.results || []).slice(0, 10).forEach((title) => {
        const item = document.createElement("div");
        item.className = "suggestion-item";
        item.textContent = title;
        item.style.cssText = "padding: 8px; cursor: pointer; color: #e2e8f0;";
        item.addEventListener("click", () => {
          if (category === "movies") movieInput.value = title;
          if (category === "books") bookInput.value = title;
          if (category === "music") musicInput.value = title;
          suggestionsBox.innerHTML = "";
          if (category === "movies") movieRecommendBtn.click();
          if (category === "books") bookRecommendBtn.click();
          if (category === "music") musicRecommendBtn.click();
        });
        suggestionsBox.appendChild(item);
      });
    } catch (error) {
      console.error(`Error fetching ${category} suggestions:`, error);
    }
  }

  async function fetchRecommendations(input, category, resultsGrid, explanationContainer) {
    if (!input) return alert(`Please enter a ${category} title.`);

    const timer = startLoading();
    let finalSeconds = 0;
    try {
      const response = await fetch(`${window.REC_API_BASE}/recommend/${categoryToPath(category)}/${encodeURIComponent(input)}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();

      if (data.error) {
        resultsGrid.innerHTML = `<p class="error-message">${data.error}</p>`;
      } else {
        if (data.explanation) {
          explanationContainer.innerHTML = `<div class="alert alert-info">${data.explanation}</div>`;
          explanationContainer.style.display = "block";
        }
        resultsGrid.innerHTML = "";
        (data.recommendations || []).forEach((item) => {
          const card = createRecommendationCard(item, category);
          resultsGrid.appendChild(card);
          setTimeout(() => {
            card.style.opacity = "1";
            card.style.transform = "translateY(0)";
          }, 100);
        });
      }
    } catch (error) {
      console.error(`Error fetching ${category} recommendations:`, error);
      resultsGrid.innerHTML = `<p class="error-message">Could not connect to API server.</p>`;
    } finally {
      finalSeconds = parseInt(timerSpan.textContent) || 0;
      stopLoading(timer);
      statusMessage.textContent = `✨ ${category.charAt(0).toUpperCase() + category.slice(1)} recommendations loaded in ${finalSeconds} seconds.`;
    }
  }

  const handleMovieInput = debounce((e) => fetchSuggestions(e.target.value, "movies", movieSuggestionsBox));
  const handleBookInput = debounce((e) => fetchSuggestions(e.target.value, "books", bookSuggestionsBox));
  const handleMusicInput = debounce((e) => fetchSuggestions(e.target.value, "music", musicSuggestionsBox));

  movieInput.addEventListener("input", handleMovieInput);
  bookInput.addEventListener("input", handleBookInput);
  musicInput.addEventListener("input", handleMusicInput);

  movieRecommendBtn.addEventListener("click", () => fetchRecommendations(movieInput.value, "movies", resultsGrid, explanationContainer));
  bookRecommendBtn.addEventListener("click", () => fetchRecommendations(bookInput.value, "books", resultsGrid, explanationContainer));
  musicRecommendBtn.addEventListener("click", () => fetchRecommendations(musicInput.value, "music", resultsGrid, explanationContainer));

  document.addEventListener("click", (e) => {
    if (!movieInput.parentElement.contains(e.target)) movieSuggestionsBox.innerHTML = "";
    if (!bookInput.parentElement.contains(e.target)) bookSuggestionsBox.innerHTML = "";
    if (!musicInput.parentElement.contains(e.target)) musicSuggestionsBox.innerHTML = "";
  });

  const categoryToPath = (cat) => (cat === "movies" ? "movie" : cat === "books" ? "book" : "music");
});