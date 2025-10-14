const isProduction = window.location.hostname.includes("onrender.com");

window.API_BASE = isProduction
  ? "https://recommendation-system-using-gemini6.onrender.com/api"
  : "/api";
window.REC_API_BASE = isProduction
  ? "https://recommendation-system-using-gemini6.onrender.com/api/recommend"
  : "/api/recommend";
window.AUTH_API_BASE = isProduction
  ? "https://recommendation-system-using-gemini6.onrender.com/api/auth"
  : "/api/auth";