const AUTH_BASE = window.AUTH_API_BASE || "";

function showToast(message, isError = false) {
  // Remove existing toast if any
  const existingToast = document.querySelector('.toast-notification');
  if (existingToast) {
    existingToast.remove();
  }
  
  const toast = document.createElement("div");
  toast.className = `toast-notification ${isError ? "error" : ""}`;
  toast.innerHTML = `
    <i class="fas ${isError ? "fa-exclamation-circle" : "fa-check-circle"} toast-icon"></i>
    <span class="toast-message">${message}</span>
  `;
  document.body.appendChild(toast);
  
  // Trigger animation
  requestAnimationFrame(() => toast.classList.add("show"));
  
  // Auto remove after 3 seconds
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

async function toggleFavorite(item, itemType) {
  try {
    const res = await fetch(`${AUTH_BASE}/favorites`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        itemType,
        itemId: String(item.itemId || ""),
        title: item.title || "Untitled",
        posterUrl: item.posterUrl || "",
      }),
    });

    if (res.ok) {
      const data = await res.json();
      showToast(data.action === "added" ? "Added to favorites!" : "Removed from favorites", data.action === "removed");
      return data.action === "added";
    } else if (res.status === 401) {
      window.location.href = "/login";
      return null;
    } else {
      console.error("[Favorites] Toggle error:", await res.text());
      showToast("Failed to update favorites", true);
      return null;
    }
  } catch (e) {
    console.error("[Favorites] Toggle error:", e);
    showToast("Failed to update favorites", true);
    return null;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // Animation for cards
  const cards = document.querySelectorAll('.favorite-item');
  cards.forEach((card, index) => {
    setTimeout(() => {
      card.style.opacity = "1";
      card.style.transform = "translateY(0)";
    }, index * 100);
  });

  // Event delegation for favorite buttons
  const grid = document.querySelector(".favorites-grid");
  
  grid.addEventListener("click", async (e) => {
    const btn = e.target.closest(".favorite-btn");
    if (!btn) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const card = btn.closest(".col-lg-4, .col-md-6");
    if (!card) return;
    
    const item = {
      itemId: btn.dataset.itemId,
      title: btn.dataset.title,
      posterUrl: btn.dataset.posterUrl
    };
    const itemType = btn.dataset.itemType;
    
    // Add animation to button
    const heartIcon = btn.querySelector('.fa-heart');
    heartIcon.style.transform = 'scale(1.3)';
    
    setTimeout(() => {
      heartIcon.style.transform = 'scale(1)';
    }, 300);
    
    const result = await toggleFavorite(item, itemType);
    if (result === false) {
      // Remove the card with animation
      card.style.transition = "all 0.5s ease";
      card.style.opacity = "0";
      card.style.transform = "scale(0.8)";
      
      setTimeout(() => {
        card.remove();
        
        // Update favorites count
        const countElement = document.getElementById('favoritesCount');
        if (countElement) {
          const currentCount = parseInt(countElement.textContent);
          countElement.textContent = currentCount - 1;
        }
        
        // Check if we need to show empty state
        const remainingCards = grid.querySelectorAll(".col-lg-4, .col-md-6");
        if (remainingCards.length === 0) {
          grid.innerHTML = `
            <div class="col-12 text-center empty-state">
              <div>
                <i class="fas fa-heart-broken"></i>
              </div>
              <h2>No favorites yet.</h2>
              <p>Add some movies, books, or music to your favorites!</p>
            </div>
          `;
        }
      }, 500);
    }
  });

  // Filter functionality
  const filterButtons = document.querySelectorAll('.filter-btn');
  filterButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Update active button
      filterButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      
      const filter = button.dataset.filter;
      const items = document.querySelectorAll('.favorite-item');
      
      items.forEach(item => {
        if (filter === 'all' || item.dataset.type === filter) {
          item.style.display = '';
        } else {
          item.style.display = 'none';
        }
      });
    });
  });
});