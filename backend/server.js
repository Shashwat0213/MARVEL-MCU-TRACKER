const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS allow karo taaki tumhari website isse baat kar sake
app.use(cors());
app.use(express.json());

// TMDB Proxy Route
app.get('/api/tmdb/search', async (req, res) => {
  try {
    const { type = 'movie', query } = req.query;
    const apiKey = process.env.TMDB_API_KEY; // Key Render ke Environment se aayegi

    if (!apiKey) {
      return res.status(500).json({ error: "TMDB API Key is missing on server." });
    }
    if (!query) {
      return res.status(400).json({ error: "Search query is required." });
    }

    const url = `https://api.themoviedb.org/3/search/${type}?api_key=${apiKey}&query=${encodeURIComponent(query)}&language=en-US`;
    const response = await fetch(url);
    const data = await response.json();
    
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch from TMDB" });
  }
});

// TMDB Details Route
app.get('/api/tmdb/details/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params;
    const apiKey = process.env.TMDB_API_KEY;

    const url = `https://api.themoviedb.org/3/${type}/${id}?api_key=${apiKey}&language=en-US&append_to_response=credits,videos`;
    const response = await fetch(url);
    const data = await response.json();

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch details" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});