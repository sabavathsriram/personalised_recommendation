const AUTH_BASE = window.AUTH_API_BASE || "/api/auth";

function showToast(message, isError = false) {
  const toast = document.createElement("div");
  toast.className = `toast-notification ${isError ? "error" : ""}`;
  toast.innerHTML = `
    <i class="fas ${isError ? "fa-exclamation-circle" : "fa-check-circle"} toast-icon"></i>
    <span class="toast-message">${message}</span>
  `;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("show"));
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

async function fetchCurrentUser() {
  try {
    const res = await fetch(`${AUTH_BASE}/me`, {
      credentials: "include",
    });
    if (!res.ok) {
      window.location.href = "/login";
      return null;
    }
    return await res.json();
  } catch (e) {
    console.error("[Profile] Fetch user error:", e);
    window.location.href = "/login";
    return null;
  }
}

async function updateProfile(event) {
  event.preventDefault();
  const name = document.getElementById("name")?.value.trim();
  const email = document.getElementById("email")?.value.trim();

  if (!name || !email) {
    showToast("Please fill in all fields", true);
    return;
  }

  try {
    const res = await fetch(`${AUTH_BASE}/profile`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name, email }),
    });

    if (res.ok) {
      showToast("Profile updated successfully!");
      setTimeout(() => window.location.reload(), 1000);
    } else {
      const data = await res.json();
      showToast(data.msg || "Failed to update profile", true);
    }
  } catch (e) {
    console.error("[Profile] Update error:", e);
    showToast("Failed to update profile. Please try again.", true);
  }
}

async function handleLogout() {
  try {
    const res = await fetch(`${AUTH_BASE}/logout`, {
      method: "GET",
      credentials: "include",
    });
    if (res.ok) {
      showToast("Logged out successfully!");
      setTimeout(() => (window.location.href = "/login"), 1000);
    } else {
      showToast("Failed to log out", true);
    }
  } catch (e) {
    console.error("[Profile] Logout error:", e);
    showToast("Failed to log out. Please try again.", true);
  }
}

async function renderProfile() {
  const profileContainer = document.querySelector(".profile-container");
  if (!profileContainer) return;

  const user = await fetchCurrentUser();
  if (!user) return;

  profileContainer.innerHTML = `
    <h2>Profile</h2>
    <form id="profile-form">
      <div class="form-group">
        <label for="name">Name</label>
        <input type="text" id="name" value="${user.name || ""}" required>
      </div>
      <div class="form-group">
        <label for="email">Email</label>
        <input type="email" id="email" value="${user.email}" required>
      </div>
      <button type="submit" class="btn btn-primary">Update Profile</button>
    </form>
    <button id="logout-btn" class="btn btn-secondary">Logout</button>
  `;

  document.getElementById("profile-form")?.addEventListener("submit", updateProfile);
  document.getElementById("logout-btn")?.addEventListener("click", handleLogout);
}

document.addEventListener("DOMContentLoaded", async () => {
  await renderProfile();
});