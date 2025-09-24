// Load environment variables from a .env file
require('dotenv').config();

const express = require('express');
const cors = require('cors');

// Create the Express app
const app = express();

// Middleware
app.use(cors()); // Allow cross-origin requests
app.use(express.json()); // Allow the server to accept JSON data

// Define a simple root route
app.get('/', (req, res) => {
    res.json({ message: "Welcome to the Auth API!" });
});

// Define the port to run on
const PORT = process.env.PORT || 8081; // We'll use a different port

// Start the server
app.listen(PORT, () => {
    console.log(`Auth server is running on port ${PORT}`);
});