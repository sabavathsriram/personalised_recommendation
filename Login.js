import React, { useState } from "react";

function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(""); // For backend/API errors

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onLogin && typeof onLogin === "function") {
      onLogin(username, password); // Call the login function with credentials
      setUsername(""); // Clear fields
      setPassword("");
      setError(""); // Clear error
    } else {
      setError("Login function is not available.");
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Welcome Back 👋</h2>
        <p style={styles.subtitle}>Sign in to continue your journey</p>
        {error && <p style={styles.error}>{error}</p>} {/* Display error */}
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={styles.input}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
          />
          <button type="submit" style={styles.button}>
            Let’s Go 🚀
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: { display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: "#fdf6e3" },
  card: { background: "#fffaf0", padding: "35px", borderRadius: "20px", boxShadow: "2px 2px 0px #333", border: "2px solid #333", width: "320px", textAlign: "center", fontFamily: "'Comic Sans MS', 'Segoe Print', cursive" },
  title: { marginBottom: "5px", fontSize: "24px", color: "#333" },
  subtitle: { marginBottom: "20px", fontSize: "14px", color: "#666", fontStyle: "italic" },
  input: { width: "100%", padding: "12px", margin: "10px 0", borderRadius: "10px", border: "2px solid #ecd20cff", fontSize: "14px", outline: "none", background: "#fefefe" },
  button: { width: "100%", padding: "12px", background: "#ffb347", color: "#333", fontWeight: "bold", border: "2px solid #333", borderRadius: "10px", fontSize: "16px", cursor: "pointer", transition: "0.2s" },
  error: { color: "red", fontSize: "12px", marginBottom: "10px" },
};

export default Login;