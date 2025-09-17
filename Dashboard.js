import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const navigate = useNavigate();
  const user = localStorage.getItem("user") || "Buddy";
  const token = localStorage.getItem("token");

  useEffect(() => {
    console.log("Token check:", token);
    if (!token) {
      console.log("No token, redirecting to login");
      navigate("/login");
    } else {
      fetch("http://localhost:5000/secure/dashboard", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
          return res.json();
        })
        .then((data) => console.log("Dashboard data:", data))
        .catch((err) => {
          console.error("Fetch error:", err.message);
          if (err.message.includes("401") || err.message.includes("403")) {
            console.log("Invalid token, logging out");
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            navigate("/login");
          }
        });
    }
  }, [token, navigate]);

  if (!token) return <div style={styles.loading}>Redirecting to login...</div>;

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>👋 Hey {user},</h1>
        <p style={styles.subtitle}>Glad to see you back. Let’s get things done today! ✨</p>
      </header>
      <div style={styles.cardGrid}>
        <div style={styles.card} onClick={() => alert("Profile page coming soon!")}>
          <h2 style={styles.cardTitle}>🙋 Profile</h2>
          <p style={styles.cardText}>View and update your personal details.</p>
        </div>
        <div style={styles.card} onClick={() => alert("Settings page coming soon!")}>
          <h2 style={styles.cardTitle}>⚙️ Settings</h2>
          <p style={styles.cardText}>Customize how things work for you.</p>
        </div>
        <div
          style={styles.cardLogout}
          onClick={() => {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            navigate("/login");
          }}
        >
          <h2 style={styles.cardTitleLogout}>➡️ Logout</h2>
          <p style={styles.cardTextLogout}>Take a break, we’ll be right here when you come back.</p>
        </div>
      </div>
      <footer style={styles.footer}>
        <p>Made with ❤️ for You</p>
      </footer>
    </div>
  );
};

const styles = {
  container: {
    minHeight: "100vh",
    background: "#fdf6e3", // Warm paper-like background
    padding: "35px",
    fontFamily: "'Comic Sans MS', 'Segoe Print', cursive", // Playful handwritten vibe
    textAlign: "center",
  },
  loading: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh",
    fontSize: "18px",
    color: "#333",
  },
  header: {
    marginBottom: "30px",
  },
  title: {
    margin: "0",
    fontSize: "28px",
    color: "#333",
    fontWeight: "bold",
  },
  subtitle: {
    margin: "5px 0 0",
    fontSize: "16px",
    color: "#666",
    fontStyle: "italic",
  },
  cardGrid: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "20px",
    maxWidth: "400px",
    margin: "0 auto",
  },
  card: {
    background: "#fffaf0", // Soft off-white
    padding: "25px",
    borderRadius: "15px",
    boxShadow: "2px 2px 0px #333", // Sketch-like shadow
    border: "2px solid #333",
    cursor: "pointer",
    transition: "transform 0.2s",
    "&:hover": {
      transform: "scale(1.05)",
    },
  },
  cardLogout: {
    background: "linear-gradient(to right, #ff9a9e, #fad0c4)",
    padding: "25px",
    borderRadius: "15px",
    boxShadow: "2px 2px 0px #333",
    border: "2px solid #333",
    cursor: "pointer",
    transition: "transform 0.2s",
    "&:hover": {
      transform: "scale(1.05)",
    },
  },
  cardTitle: {
    margin: "0 0 10px",
    fontSize: "20px",
    color: "#333",
    fontWeight: "bold",
  },
  cardTitleLogout: {
    margin: "0 0 10px",
    fontSize: "20px",
    color: "#fff",
    fontWeight: "bold",
  },
  cardText: {
    margin: "0",
    fontSize: "14px",
    color: "#666",
    fontStyle: "italic",
  },
  cardTextLogout: {
    margin: "0",
    fontSize: "14px",
    color: "#fff",
    fontStyle: "italic",
  },
  footer: {
    marginTop: "30px",
    fontSize: "14px",
    color: "#9a9693",
  },
};

export default Dashboard;

