/* ═══════════════════════════════════════════════════════════
   MCU TRACKER — BACKEND SERVER (Render Deployment)
   Is file ka kaam sirf API Key ko hide rakhna aur TMDB se
   data fetch karke frontend ko dena hai.
   ═══════════════════════════════════════════════════════════ */

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS enable karo taaki GitHub Pages wali site isse baat kar sake
app.use(cors());
app.use(express.json());

// Root route (Check karne ke liye ki server zinda hai)
app.get('/', (req, res) => {
  res.send('MCU Tracker Backend is running perfectly! 🚀');
});

// TMDB Search API (Frontend isko call karega)
app.get('/api/tmdb/search', async (req, res) => {
  try {
    const { type = 'movie', query } = req.query;
    const apiKey = process.env.TMDB_API_KEY; 

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
    console.error("Search Error:", error);
    res.status(500).json({ error: "Failed to fetch from TMDB" });
  }
});

// TMDB Details API (Auto-fill ke liye)
app.get('/api/tmdb/details/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params;
    const apiKey = process.env.TMDB_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "TMDB API Key is missing on server." });
    }

    const url = `https://api.themoviedb.org/3/${type}/${id}?api_key=${apiKey}&language=en-US&append_to_response=credits,videos`;
    const response = await fetch(url);
    const data = await response.json();

    res.json(data);
  } catch (error) {
    console.error("Details Error:", error);
    res.status(500).json({ error: "Failed to fetch details" });
  }
});

// Server Start
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});