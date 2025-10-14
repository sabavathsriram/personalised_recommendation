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

async function handleLogin(event) {
  event.preventDefault();
  const email = document.getElementById("email")?.value.trim();
  const password = document.getElementById("password")?.value.trim();

  if (!email || !password) {
    showToast("Please enter email and password", true);
    return;
  }

  try {
    const res = await fetch(`${AUTH_BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });

    if (res.ok) {
      showToast("Login successful!");
      setTimeout(() => (window.location.href = "/"), 1000);
    } else {
      const data = await res.json();
      showToast(data.msg || "Invalid credentials", true);
    }
  } catch (e) {
    console.error("[Auth] Login error:", e);
    showToast("Failed to log in. Please try again.", true);
  }
}

async function handleSignup(event) {
  event.preventDefault();
  const name = document.getElementById("name")?.value.trim();
  const email = document.getElementById("email")?.value.trim();
  const password = document.getElementById("password")?.value.trim();

  if (!name || !email || !password) {
    showToast("Please fill in all fields", true);
    return;
  }

  try {
    const res = await fetch(`${AUTH_BASE}/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name, email, password }),
    });

    if (res.ok) {
      showToast("Signup successful! Please log in.");
      setTimeout(() => (window.location.href = "/login"), 1000);
    } else {
      const data = await res.json();
      showToast(data.msg || "Signup failed", true);
    }
  } catch (e) {
    console.error("[Auth] Signup error:", e);
    showToast("Failed to sign up. Please try again.", true);
  }
}

async function handlePasswordReset(event) {
  event.preventDefault();
  const email = document.getElementById("email")?.value.trim();

  if (!email) {
    showToast("Please enter your email", true);
    return;
  }

  try {
    const res = await fetch(`${AUTH_BASE}/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email }),
    });

    if (res.ok) {
      showToast("Password reset link sent to your email.");
    } else {
      const data = await res.json();
      showToast(data.msg || "Failed to send reset link", true);
    }
  } catch (e) {
    console.error("[Auth] Password reset error:", e);
    showToast("Failed to send reset link. Please try again.", true);
  }
}

async function handleNewPassword(event) {
  event.preventDefault();
  const newPassword = document.getElementById("newPassword")?.value.trim();
  const confirmNewPassword = document.getElementById("confirmNewPassword")?.value.trim();
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");

  if (!newPassword || !confirmNewPassword || !token) {
    showToast("Please fill in all fields and provide a valid token", true);
    return;
  }

  if (newPassword !== confirmNewPassword) {
    showToast("Passwords do not match", true);
    return;
  }

  try {
    const res = await fetch(`${AUTH_BASE}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ newPassword, confirmNewPassword, token }),
    });

    if (res.ok) {
      showToast("Password reset successful! Please log in.");
      setTimeout(() => (window.location.href = "/login"), 1000);
    } else {
      const data = await res.json();
      showToast(data.msg || "Failed to reset password", true);
    }
  } catch (e) {
    console.error("[Auth] New password error:", e);
    showToast("Failed to reset password. Please try again.", true);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("login-form");
  const signupForm = document.getElementById("signup-form");
  const forgotPasswordForm = document.getElementById("forgot-password-form");
  const resetPasswordForm = document.getElementById("reset-password-form");

  if (loginForm) loginForm.addEventListener("submit", handleLogin);
  if (signupForm) signupForm.addEventListener("submit", handleSignup);
  if (forgotPasswordForm) forgotPasswordForm.addEventListener("submit", handlePasswordReset);
  if (resetPasswordForm) resetPasswordForm.addEventListener("submit", handleNewPassword);
});