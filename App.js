import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import Login from "./Login";
import Dashboard from "./Dashboard";
import Home from "./Home";

const AppContent = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem("token");

  useEffect(() => {
    // Redirect to login if no token and not already on login page
    if (!token && location.pathname !== "/login") {
      navigate("/login");
    }
  }, [token, navigate, location.pathname]);

  const handleLogin = async (username, password) => {
    try {
      const response = await fetch("http://localhost:5000/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      if (response.ok) {
        localStorage.setItem("token", data.token); // Store the JWT token
        localStorage.setItem("user", username); // Store the username
        navigate("/"); // Redirect to homepage after login
      } else {
        console.log(data.error || "Login failed");
        // Optionally, pass error to Login.js to display
      }
    } catch (error) {
      console.error("Error during login:", error);
    }
  };

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login onLogin={handleLogin} />} />
      <Route path="/dashboard" element={<Dashboard />} />
    </Routes>
  );
};

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;


