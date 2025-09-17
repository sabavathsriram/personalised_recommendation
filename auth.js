const express = require("express");
const jwt = require("jsonwebtoken");

const router = express.Router();
const SECRET_KEY = "mysecretkey";

// Mock user
const USER = { username: "admin", password: "1234" };

router.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (username === USER.username && password === USER.password) {
    const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: "1h" });
    return res.json({ token });
  }

  res.status(401).json({ error: "Invalid credentials" });
});

module.exports = router;
