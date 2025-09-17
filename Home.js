import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const Home = () => {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);

  const movies = [
    { title: "Inception", image: "https://m.media-amazon.com/images/I/71DwIcSgFcS.jpg" },
    { title: "The Dark Knight", image: "https://m.media-amazon.com/images/I/81IfoBox2TL.jpg" },
    { title: "Interstellar", image: "https://www.tallengestore.com/cdn/shop/products/Interstellar_-_Tallenge_Hollywood_Sci-Fi_Art_Movie_Poster_Collection_6400e127-641e-4478-8a06-f699ae526fad.jpg?v=1577693302" },
    { title: "Parasite", image: "https://www.tallengestore.com/cdn/shop/products/Parasite_-_Bon_Joon_Ho_Korean_Movie_-_Hollywood_Oscar_Palme_D_or_2019_Winner_-_Graphic_Art_Poster_4cdeca35-d4c3-4086-a800-ce190317a256.png?v=1583300232" },
  ];

  const handleLoginClick = () => {
    navigate("/login");
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % movies.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + movies.length) % movies.length);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Welcome to NxtPick</h1>
        <p style={styles.subtitle}>
          Your personalized journey through movies, books, and music
        </p>
        <div style={styles.carouselContainer}>
          <button style={styles.arrow} onClick={prevSlide}>❮</button>
          <div style={styles.carousel}>
            <img src={movies[currentSlide].image} alt={movies[currentSlide].title} style={styles.carouselImage} />
            <p style={styles.carouselText}>{movies[currentSlide].title}</p>
          </div>
          <button style={styles.arrow} onClick={nextSlide}>❯</button>
        </div>
        <div style={styles.features}>
          <p style={styles.feature}>🎬 Real-time Preference Learning</p>
          <p style={styles.feature}>📚 Cross-Domain Recommendations</p>
          <p style={styles.feature}>💡 Explainable AI Insights</p>
        </div>
        <button style={styles.button} onClick={handleLoginClick}>
          Start Your Adventure 🚀
        </button>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: "100vh",
    background: "#1A2A44", // Navy background for a cinematic feel
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontFamily: "'Comic Sans MS', 'Segoe Print', cursive",
    color: "#FFFFFF",
  },
  card: {
    background: "linear-gradient(135deg, #00A3E0, #1A2A44)", // Gradient of electric blue to navy
    padding: "40px",
    borderRadius: "20px",
    boxShadow: "1px 1px 0px #1e1e1eff", // Soft gold shadow for warmth
    border: "2px solid #0c0c0cff",
    maxWidth: "600px",
    margin: "0 auto",
    textAlign: "center",
  },
  title: {
    margin: "0 0 15px",
    fontSize: "32px",
    color: "#D4A017", // Soft gold for title
    fontWeight: "bold",
  },
  subtitle: {
    margin: "0 0 20px",
    fontSize: "16px",
    color: "#FFFFFF",
    fontStyle: "italic",
    lineHeight: "1.5",
  },
  carouselContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "25px",
  },
  carousel: {
    width: "300px",
    overflow: "hidden",
    textAlign: "center",
  },
  carouselImage: {
    width: "100%",
    borderRadius: "10px",
    border: "2px solid #D4A017",
  },
  carouselText: {
    margin: "10px 0",
    fontSize: "18px",
    color: "#D4A017",
    fontWeight: "600",
  },
  arrow: {
    background: "#00A3E0",
    color: "#FFFFFF",
    border: "none",
    padding: "10px",
    fontSize: "20px",
    cursor: "pointer",
    margin: "0 10px",
    borderRadius: "50%",
    "&:hover": {
      background: "#D4A017",
    },
  },
  features: {
    marginBottom: "25px",
  },
  feature: {
    margin: "10px 0",
    fontSize: "18px",
    color: "#FFFFFF",
    fontWeight: "600",
  },
  button: {
    width: "200px",
    padding: "12px",
    background: "#D4A017", // Soft gold button
    color: "#1A2A44",
    fontWeight: "bold",
    border: "2px solid #1A2A44",
    borderRadius: "10px",
    fontSize: "16px",
    cursor: "pointer",
    transition: "transform 0.2s, background 0.2s",
    "&:hover": {
      transform: "scale(1.05)",
      background: "#00A3E0",
      color: "#FFFFFF",
    },
  },
};

export default Home;