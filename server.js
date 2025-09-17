const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const authRoutes = require("./routes/auth");
const secureRoutes = require("./routes/secure");

const app = express();
app.use(cors({
  origin: "http://localhost:3000", // Allow frontend origin
}));
app.use(bodyParser.json());

// Routes
app.use("/auth", authRoutes);
app.use("/secure", secureRoutes);

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
