// c:\Users\Test\FlutterProjects\librico-backend\server.js
require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000; // Use port from .env or default to 3000

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // To parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // To parse URL-encoded request bodies

// Simple Route for testing
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Librico backend API!' });
});

// --- Define your API routes for Librico here ---
// Example:
// const bookRoutes = require('./routes/bookRoutes');
// app.use('/api/books', bookRoutes);

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
  console.log(`Access it at http://localhost:${PORT}`);
});
