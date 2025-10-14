
function updateHeaderForUser(user) {
  const navLinks = document.querySelector(".nav-links");
  if (user && navLinks) {
    let greeting = navLinks.querySelector(".user-greeting");
    if (!greeting) {
      greeting = document.createElement("span");
      greeting.className = "user-greeting";
      navLinks.appendChild(greeting);
    }
    greeting.textContent = `Hi, ${user.name || user.email}!`;
  }
}

const loadingScreen = document.getElementById("loadingScreen");
const mainContent = document.getElementById("mainContent");
const categoryTabs = document.querySelectorAll(".category-tab");
const contentSections = document.querySelectorAll(".content-section");
const searchInput = document.getElementById("searchInput");
const recommendBtn = document.getElementById("recommendBtn");
const genreInput = document.getElementById("genreInput");
const genreRecommendBtn = document.getElementById("genreRecommendBtn");
const resultsGrid = document.getElementById("results-grid");
const suggestionsBox = document.getElementById("suggestions-box");
const explanationContainer = document.getElementById("explanation-container");

// const BASE_API_URL = "http://localhost:8000";
const BASE_API_URL = "";  
const AUTH_BASE = "/";

let activeCategory = "movies";
let selectedSuggestionIndex = -1;

async function fetchCurrentUser() {
  try {
    const res = await fetch(`/me`, {  // Use relative path
      credentials: "include",
    });
    
    if (res.status === 401) {
      console.error("[Auth] User not authenticated");
      // Don't redirect here, let the UI handle login state
      return null;
    }
    
    if (!res.ok) {
      console.error("[Auth] Server error:", res.status);
      return null;
    }
    
    return await res.json();
  } catch (e) {
    console.error("[Auth] Network error:", e);
    return null;
  }
}

function showToast(message, isRemoved = false) {
  const toast = document.createElement("div");
  toast.className = `toast-notification ${isRemoved ? "removed" : ""}`;
  toast.innerHTML = `
    <i class="fas ${isRemoved ? "fa-heart-broken" : "fa-heart"} toast-icon"></i>
    <span class="toast-message">${message}</span>
  `;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("show"));
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

async function toggleFavorite(item, category) {
  try {
    const itemId = category === "movies" ? item.tmdbId : 
                   category === "books" ? item.isbn : 
                   item.track_id;
    const title = item.title || item.track_name || "Untitled";
    const posterUrl = category === "movies" ? item.posterUrl : 
                     category === "books" ? item.coverUrl : "";

    const res = await fetch(`/favorites`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",  // Add this
      body: JSON.stringify({
        itemType: categoryToPath(category),
        itemId: String(itemId || ""),
        title,
        posterUrl,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      showToast(data.action === "added" ? "Added to favorites!" : "Removed from favorites", data.action === "removed");
      return data.action === "added";
    } else if (res.status === 401) {
      alert("Please log in to save favorites!");
      window.location.href = "/login";
      return null;
    } else {
      console.error("[Favorites] Favorite error:", await res.text());
      return null;
    }
  } catch (e) {
    console.error("[Favorites] Favorite error:", e);
    return null;
  }
}

function showInputError() {
  alert("Please enter a valid query.");
}

window.addEventListener("load", async () => {
  const user = await fetchCurrentUser();
  updateHeaderForUser(user);
  setTimeout(() => {
    if (loadingScreen) {
      loadingScreen.style.opacity = "0";
      loadingScreen.style.transform = "translateY(-100%)";
      setTimeout(() => {
        loadingScreen.style.display = "none";
        if (mainContent) {
          mainContent.style.display = "block";
          mainContent.style.opacity = "0";
          setTimeout(() => {
            mainContent.style.opacity = "1";
            mainContent.style.transition = "opacity 0.5s ease";
          }, 100);
        }
      }, 500);
    }
  }, 3000);
});

categoryTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const targetCategory = tab.dataset.category;
    activeCategory = targetCategory;
    categoryTabs.forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    contentSections.forEach((section) => section.classList.remove("active"));
    const targetSection = document.getElementById(`${targetCategory}Section`);
    if (targetSection) {
      setTimeout(() => targetSection.classList.add("active"), 300);
    }
    updateSearchPlaceholder(targetCategory);
    triggerCategoryAnimations(targetCategory);
  });
});

function updateSearchPlaceholder(category) {
  const placeholders = {
    movies: "e.g., Inception, The Dark Knight, Interstellar...",
    books: "e.g., 1984, The Alchemist, Dune...",
    music: "e.g., Bohemian Rhapsody, Hotel California...",
  };
  if (searchInput) {
    searchInput.placeholder = placeholders[category] || "Search for recommendations...";
  }
}

function triggerCategoryAnimations(category) {
  const animations = {
    movies: animateMovieEffects,
    books: animateBookEffects,
    music: animateMusicEffects,
  };
  if (animations[category]) animations[category]();
}

function animateMovieEffects() {
  const projectorBeam = document.querySelector(".light-beam");
  const filmParticles = document.querySelector(".film-particles");
  if (projectorBeam) {
    projectorBeam.style.animation = "none";
    setTimeout(() => {
      projectorBeam.style.animation = "projectorBeam 4s ease-in-out infinite";
    }, 100);
  }
  createFilmParticles();
}

function animateBookEffects() {
  const floatingPages = document.querySelector(".floating-pages");
  const readingLight = document.querySelector(".reading-light");
  if (floatingPages) {
    floatingPages.style.animation = "none";
    setTimeout(() => {
      floatingPages.style.animation = "pageFlip 5s ease-in-out infinite";
    }, 100);
  }
  createTextParticles();
}

function animateMusicEffects() {
  const waves = document.querySelectorAll(".wave");
  const notes = document.querySelectorAll(".note");
  waves.forEach((wave, index) => {
    wave.style.animation = "none";
    setTimeout(() => {
      wave.style.animation = `soundWave 1.5s ease-in-out infinite ${index * 0.1}s`;
    }, 100);
  });
  createMusicNotes();
}

function createFilmParticles() {
  const container = document.querySelector(".film-particles");
  if (!container) return;
  for (let i = 0; i < 5; i++) {
    setTimeout(() => {
      const particle = document.createElement("div");
      particle.innerHTML = "🎬";
      particle.style.cssText = `
        position: absolute;
        font-size: 2rem;
        animation: particleFloat 15s linear forwards;
        left: ${Math.random() * 100}%;
        opacity: 0;
      `;
      container.appendChild(particle);
      setTimeout(() => {
        if (particle.parentNode) particle.parentNode.removeChild(particle);
      }, 15000);
    }, i * 3000);
  }
}

function createTextParticles() {
  const container = document.querySelector(".floating-pages");
  if (!container) return;
  const words = ["📖", "✨", "📚", "💭", "🖋️"];
  for (let i = 0; i < 5; i++) {
    setTimeout(() => {
      const particle = document.createElement("div");
      particle.innerHTML = words[i % words.length];
      particle.style.cssText = `
        position: absolute;
        font-size: 2rem;
        animation: particleFloat 15s linear forwards;
        left: ${Math.random() * 100}%;
        opacity: 0;
      `;
      container.appendChild(particle);
      setTimeout(() => {
        if (particle.parentNode) particle.parentNode.removeChild(particle);
      }, 15000);
    }, i * 3000);
  }
}

function createMusicNotes() {
  const container = document.querySelector(".music-notes");
  if (!container) return;
  const notes = ["♪", "♫", "♬", "🎵", "🎶"];
  for (let i = 0; i < 5; i++) {
    setTimeout(() => {
      const particle = document.createElement("div");
      particle.innerHTML = notes[i % notes.length];
      particle.className = "note";
      particle.style.cssText = `
        position: absolute;
        font-size: 2rem;
        animation: particleFloat 15s linear forwards;
        left: ${Math.random() * 100}%;
        opacity: 0;
      `;
      container.appendChild(particle);
      setTimeout(() => {
        if (particle.parentNode) particle.parentNode.removeChild(particle);
      }, 15000);
    }, i * 3000);
  }
}

const particleFloatCSS = `
@keyframes particleFloat {
  0% { transform: translateY(100vh) translateX(0) rotate(0deg); opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { transform: translateY(-100px) translateX(${Math.random() * 200 - 100}px) rotate(360deg); opacity: 0; }
}
`;

const sparkleCSS = `
@keyframes sparkle {
  0% { transform: scale(0) rotate(0deg); opacity: 1; }
  50% { transform: scale(1) rotate(180deg); opacity: 1; }
  100% { transform: scale(0) rotate(360deg); opacity: 0; }
}
`;

const spinCSS = `
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
`;

const style = document.createElement("style");
style.textContent = particleFloatCSS + sparkleCSS + spinCSS + `
.search-suggestions { box-shadow: 0 10px 30px rgba(0,0,0,0.35); }
.search-suggestions .suggestion-item { font-size: 0.95rem; }
`;
document.head.appendChild(style);

function createSuggestionsEl() {
  const el = document.createElement("div");
  el.id = "searchSuggestions";
  el.className = "search-suggestions";
  Object.assign(el.style, {
    position: "fixed",
    zIndex: "10002",
    left: "0px",
    top: "0px",
    width: "0px",
    display: "none",
  });
  document.body.appendChild(el);
  return el;
}

function getSuggestionsEl() {
  return document.getElementById("searchSuggestions") || null;
}

function hideSearchSuggestions() {
  const el = getSuggestionsEl();
  if (!el) return;
  el.style.display = "none";
  el.innerHTML = "";
  selectedSuggestionIndex = -1;
}

function highlightSuggestion(index) {
  const el = getSuggestionsEl();
  if (!el) return;
  const items = el.querySelectorAll(".suggestion-item");
  items.forEach((item, i) => {
    item.style.background = i === index ? "rgba(78,205,196,0.12)" : "transparent";
  });
}

function positionSuggestionsEl() {
  const el = getSuggestionsEl();
  if (!el || !searchInput) return;
  const rect = searchInput.getBoundingClientRect();
  el.style.left = `${Math.round(rect.left)}px`;
  el.style.top = `${Math.round(rect.bottom + 8)}px`;
  el.style.width = `${Math.round(rect.width)}px`;
}

async function showSearchSuggestions(query) {
  const suggestionsEl = document.getElementById("searchSuggestions") || createSuggestionsEl();
  positionSuggestionsEl();
  if (query.length < 3) {
    suggestionsEl.innerHTML = "";
    suggestionsEl.style.display = "none";
    return;
  }

  try {
    // Fixed endpoint construction
    const endpoint = `/api/search/${categoryToPath(activeCategory)}/${encodeURIComponent(query)}`;
    const res = await fetch(endpoint);
    
    if (!res.ok) {
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      throw new Error(`Suggestions fetch failed: ${res.status}`);
    }
    
    const data = await res.json();
    const items = (data.results || []).slice(0, 10);
    if (!items.length) {
      hideSearchSuggestions();
      return;
    }
    
    suggestionsEl.innerHTML = items
      .map(
        (txt) =>
          `<button type="button" class="suggestion-item" style="display:block;width:100%;text-align:left;padding:8px 10px;border-radius:6px;border:none;background:transparent;color:#e2e8f0;cursor:pointer;">${txt}</button>`,
      )
      .join("");
    positionSuggestionsEl();
    suggestionsEl.style.display = "block";
    selectedSuggestionIndex = -1;
    
    suggestionsEl.querySelectorAll(".suggestion-item").forEach((btn) => {
      btn.onclick = () => {
        searchInput.value = btn.textContent;
        hideSearchSuggestions();
        fetchAndRenderRecommendations(btn.textContent, activeCategory);
      };
      btn.onmouseenter = () => (btn.style.background = "rgba(78,205,196,0.12)");
      btn.onmouseleave = () => (btn.style.background = "transparent");
    });
  } catch (e) {
    console.error("[Suggestions Error]", e);
    hideSearchSuggestions();
  }
}

document.addEventListener("click", (e) => {
  const suggestionsEl = getSuggestionsEl();
  if (!suggestionsEl) return;
  if (e.target === searchInput || suggestionsEl.contains(e.target)) return;
  hideSearchSuggestions();
});

let debounceTimeout;
searchInput.addEventListener("input", (e) => {
  clearTimeout(debounceTimeout);
  const query = e.target.value;
  debounceTimeout = setTimeout(() => {
    if (query.length > 2) {
      showSearchSuggestions(query);
    } else {
      hideSearchSuggestions();
    }
  }, 300); // Wait 300ms after last keystroke
});

searchInput.addEventListener("keydown", (e) => {
  const suggestionsEl = getSuggestionsEl();
  if (!suggestionsEl || suggestionsEl.style.display === "none") return;
  const items = suggestionsEl.querySelectorAll(".suggestion-item");
  if (!items.length) return;

  if (e.key === "ArrowDown") {
    e.preventDefault();
    selectedSuggestionIndex = Math.min(selectedSuggestionIndex + 1, items.length - 1);
    highlightSuggestion(selectedSuggestionIndex);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    selectedSuggestionIndex = Math.max(selectedSuggestionIndex - 1, 0);
    highlightSuggestion(selectedSuggestionIndex);
  } else if (e.key === "Enter") {
    e.preventDefault();
    if (selectedSuggestionIndex >= 0 && selectedSuggestionIndex < items.length) {
      items[selectedSuggestionIndex].click();
    } else {
      recommendBtn.click();
    }
  } else if (e.key === "Escape") {
    hideSearchSuggestions();
  }
});

searchInput.addEventListener("focus", () => {
  const el = getSuggestionsEl();
  if (el && el.style.display !== "none") positionSuggestionsEl();
});

window.addEventListener("resize", () => {
  const el = getSuggestionsEl();
  if (el && el.style.display !== "none") positionSuggestionsEl();
});

window.addEventListener("scroll", () => {
  const el = getSuggestionsEl();
  if (el && el.style.display !== "none") positionSuggestionsEl();
});

recommendBtn.addEventListener("click", async () => {
  const query = searchInput.value.trim();
  if (!query) {
    showInputError();
    return;
  }
  triggerRecommendationAnimation();
  await fetchAndRenderRecommendations(query, activeCategory);
});


async function fetchAndRenderRecommendations(query, category) {
  const activeSection = document.querySelector(".content-section.active");
  const grid = activeSection?.querySelector(".content-grid");
  if (!grid) return;

  // Fixed endpoint construction
    const endpoint = `/api/recommend/${categoryToPath(category)}/${encodeURIComponent(query)}`;
  
  grid.innerHTML = `
    <div class="col-12 text-center" style="padding: 60px 20px;">
      <div style="display: inline-block; animation: spin 1s linear infinite;">
        <i class="fas fa-spinner" style="font-size: 3rem; color: rgba(78,205,196,0.8);"></i>
      </div>
      <p style="margin-top: 20px; color: rgba(226,232,240,0.7); font-size: 1.1rem;">
        Loading recommendations for ${query}...
      </p>
    </div>
  `;

  if (explanationContainer) {
    explanationContainer.style.display = "none";
    explanationContainer.innerHTML = "";
  }

  try {
    const res = await fetch(endpoint);
    
    if (!res.ok) {
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const errorData = await res.json();
      throw new Error(errorData.error || `HTTP ${res.status}`);
    }

    const data = await res.json();
    if (data.error) {
      throw new Error(data.error);
    }

    const recs = data.recommendations || [];
    if (recs.length === 0) {
      throw new Error(`No recommendations found for "${query}".`);
    }

    grid.innerHTML = "";
    recs.forEach((rec, index) => {
      const card = createAPICard(rec, category);
      grid.appendChild(card);
      setTimeout(() => {
        card.style.opacity = "1";
        card.style.transform = "translateY(0)";
      }, index * 100);
    });

    if (data.explanation && explanationContainer) {
      explanationContainer.innerHTML = `
        <div class="explanation-text">
          <i class="fas fa-lightbulb" style="margin-right: 8px; color: rgba(78,205,196,0.9);"></i>
          ${data.explanation}
        </div>
      `;
      explanationContainer.style.display = "block";
    }
  } catch (e) {
    console.error("[API Error]", e);
    showNotFoundError(e.message);
    grid.innerHTML = "";
  }
}

function showNotFoundError(message) {
  const activeSection = document.querySelector(".content-section.active");
  const grid = activeSection?.querySelector(".content-grid");
  if (!grid) return;

  grid.innerHTML = `
    <div class="col-12 text-center" style="padding: 60px 20px;">
      <div style="font-size: 4rem; margin-bottom: 20px;">
        <i class="fas fa-exclamation-circle" style="color: rgba(255,107,107,0.6);"></i>
      </div>
      <p style="color: rgba(226,232,240,0.9); font-size: 1.2rem; margin-bottom: 10px;">
        ${message}
      </p>
      <p style="color: rgba(226,232,240,0.5); font-size: 0.95rem;">
        Try searching for something else
      </p>
    </div>
  `;
}

function createAPICard(rec, category) {
  const col = document.createElement("div");
  col.className = "col-lg-4 col-md-6";
  col.style.cssText = "opacity:0; transform: translateY(30px); transition: all 0.5s ease;";

  const imageUrl = category === "movies" ? rec.posterUrl : category === "books" ? rec.coverUrl : "";
  const title = category === "music" ? rec.title || rec.track_name || "Track" : rec.title || "Recommendation";
  const subtitle = category === "movies" ? (rec.genres || "").toString() :
                  category === "books" ? (rec.authors || "").toString() :
                  [rec.artist_name, rec.genre].filter(Boolean).join(" • ");

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
  const heartIcon = favBtn.querySelector(".fa-heart");

  favBtn.addEventListener("click", async (e) => {
    e.stopPropagation();
    const result = await toggleFavorite(rec, category);
    if (result === true) {
      heartIcon.style.color = "rgba(255,77,77,1)";
      heartIcon.classList.remove("far");
      heartIcon.classList.add("fas");
      favBtn.style.transform = "scale(1.2)";
      setTimeout(() => (favBtn.style.transform = "scale(1)"), 200);
    } else if (result === false) {
      heartIcon.style.color = "rgba(255,107,107,0.8)";
      heartIcon.classList.remove("fas");
      heartIcon.classList.add("far");
    }
  });

  favBtn.addEventListener("mouseenter", () => {
    favBtn.style.transform = "scale(1.1)";
    heartIcon.style.color = "rgba(255,77,77,1)";
  });

  favBtn.addEventListener("mouseleave", () => {
    favBtn.style.transform = "scale(1)";
    if (!heartIcon.classList.contains("fas")) {
      heartIcon.style.color = "rgba(255,107,107,0.8)";
    }
  });

  return col;
}

function triggerRecommendationAnimation() {
  recommendBtn.style.transform = "scale(0.95)";
  recommendBtn.style.filter = "brightness(1.2)";
  setTimeout(() => {
    recommendBtn.style.transform = "";
    recommendBtn.style.filter = "";
  }, 200);

  const originalHTML = recommendBtn.innerHTML;
  recommendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Analyzing...</span>';
  recommendBtn.disabled = true;
  setTimeout(() => {
    recommendBtn.innerHTML = originalHTML;
    recommendBtn.disabled = false;
  }, 10000);
}

document.addEventListener("mouseover", (e) => {
  if (e.target.closest(".recommendation-card")) {
    const card = e.target.closest(".recommendation-card");
    createHoverParticles(card);
  }
});

function createHoverParticles(card) {
  for (let i = 0; i < 3; i++) {
    const particle = document.createElement("div");
    particle.innerHTML = "✨";
    particle.style.cssText = `
      position: absolute;
      font-size: 1rem;
      color: rgba(76, 205, 196, 0.8);
      pointer-events: none;
      animation: sparkle 1s ease-out forwards;
      left: ${Math.random() * 100}%;
      top: ${Math.random() * 100}%;
      z-index: 10;
    `;
    card.style.position = "relative";
    card.appendChild(particle);
    setTimeout(() => {
      if (particle.parentNode) particle.parentNode.removeChild(particle);
    }, 1000);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if (genreRecommendBtn) {
    genreRecommendBtn.addEventListener("click", async () => {
      const genre = genreInput.value.trim();
      if (!genre) {
        alert("Please enter a genre (e.g., Action, Romance, Jazz)");
        return;
      }
      await fetchGenreRecommendations(genre, activeCategory);
    });
  }
});

async function fetchGenreRecommendations(genre, category) {
  const activeSection = document.querySelector(".content-section.active");
  const grid = activeSection?.querySelector(".content-grid");
  if (!grid) return;

  // Fixed endpoint construction
const endpoint = `/api/recommend/genre/${categoryToPath(category)}/${encodeURIComponent(genre)}`;
  
  grid.innerHTML = `
    <div class="col-12 text-center" style="padding: 60px 20px;">
      <div style="display: inline-block; animation: spin 1s linear infinite;">
        <i class="fas fa-spinner" style="font-size: 3rem; color: rgba(255,107,107,0.8);"></i>
      </div>
      <p style="margin-top: 20px; color: rgba(226,232,240,0.7); font-size: 1.1rem;">
        Finding ${genre} ${category}...
      </p>
    </div>
  `;

  if (explanationContainer) {
    explanationContainer.style.display = "none";
    explanationContainer.innerHTML = "";
  }

  try {
    const res = await fetch(endpoint);
    
    if (!res.ok) {
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const errorData = await res.json();
      throw new Error(errorData.error || `HTTP ${res.status}`);
    }

    const data = await res.json();
    if (data.error) {
      throw new Error(data.error);
    }

    const recs = data.recommendations || [];
    if (recs.length === 0) {
      throw new Error(`No ${category} found for genre: ${genre}.`);
    }

    grid.innerHTML = "";
    recs.forEach((rec, index) => {
      const card = createAPICard(rec, category);
      grid.appendChild(card);
      setTimeout(() => {
        card.style.opacity = "1";
        card.style.transform = "translateY(0)";
      }, index * 100);
    });

    if (data.explanation && explanationContainer) {
      explanationContainer.innerHTML = `
        <div class="explanation-text">
          <i class="fas fa-lightbulb" style="margin-right: 8px; color: rgba(78,205,196,0.9);"></i>
          ${data.explanation}
        </div>
      `;
      explanationContainer.style.display = "block";
    }
  } catch (e) {
    console.error("[Genre API Error]", e);
    showNotFoundError(e.message);
    grid.innerHTML = "";
  }
}

// Add this function to app-ui.js if it's not already there
function categoryToPath(category) {
  return category === "movies" ? "movie" : category === "books" ? "book" : "music";
}