/* ═══════════════════════════════════════════════════════════
   MCU TRACKER — BACKEND SERVER (Render Deployment)
   Is file ka kaam sirf API Key ko hide rakhna aur TMDB se
   data fetch karke frontend ko dena hai.

   Security:
   - Sirf logged-in ADMIN hi TMDB endpoints use kar sakta hai
     (Firebase ID token verify hota hai)
   - CORS sirf allowed websites ke liye
   - Rate limit + input validation
   ═══════════════════════════════════════════════════════════ */

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || 'AIzaSyAxiho1OLRry1mU8CRm6lQirUGQCVlNDWg';
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'mcutrackersupport@gmail.com').toLowerCase();

// Comma separated list, e.g. https://shashwat0213.github.io
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://shashwat0213.github.io')
  .split(',').map(s => s.trim()).filter(Boolean);

app.disable('x-powered-by');
app.use(cors({
  origin(origin, cb) {
    // no origin = server-to-server / curl; browsers always send one
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET']
}));
app.use(express.json({ limit: '10kb' }));

/* ───────── tiny in-memory rate limiter (30 req / min / IP) ───────── */
const hits = new Map();
function rateLimit(req, res, next) {
  const ip = req.ip || 'x';
  const now = Date.now();
  const rec = hits.get(ip) || { n: 0, reset: now + 60000 };
  if (now > rec.reset) { rec.n = 0; rec.reset = now + 60000; }
  rec.n++;
  hits.set(ip, rec);
  if (rec.n > 30) return res.status(429).json({ error: 'Too many requests. Try again in a minute.' });
  next();
}
setInterval(() => {
  const now = Date.now();
  for (const [ip, rec] of hits) if (now > rec.reset) hits.delete(ip);
}, 60000).unref();

/* ───────── verify Firebase ID token → admin only ───────── */
async function requireAdmin(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    if (!token) return res.status(401).json({ error: 'Login required.' });

    const r = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: token }) }
    );
    if (!r.ok) return res.status(401).json({ error: 'Invalid or expired login.' });
    const data = await r.json();
    const user = data.users && data.users[0];
    if (!user) return res.status(401).json({ error: 'Invalid login.' });

    const email = String(user.email || '').toLowerCase();
    if (email !== ADMIN_EMAIL) return res.status(403).json({ error: 'Admin access required.' });

    req.adminEmail = email;
    next();
  } catch (e) {
    console.error('Auth check error:', e);
    res.status(500).json({ error: 'Could not verify login.' });
  }
}

/* ───────── validation ───────── */
const ALLOWED_TYPES = new Set(['movie', 'tv']);

// Root route (Check karne ke liye ki server zinda hai)
app.get('/', (req, res) => {
  res.send('MCU Tracker Backend is running perfectly! 🚀');
});

// TMDB Search API (Admin panel isko call karega)
app.get('/api/tmdb/search', rateLimit, requireAdmin, async (req, res) => {
  try {
    const type = String(req.query.type || 'movie');
    const query = String(req.query.query || '').trim();
    const apiKey = process.env.TMDB_API_KEY;

    if (!ALLOWED_TYPES.has(type)) return res.status(400).json({ error: 'Invalid type.' });
    if (!query) return res.status(400).json({ error: 'Search query is required.' });
    if (query.length > 100) return res.status(400).json({ error: 'Search query too long.' });
    if (!apiKey) return res.status(500).json({ error: 'TMDB API Key is missing on server.' });

    const url = `https://api.themoviedb.org/3/search/${type}?api_key=${apiKey}&query=${encodeURIComponent(query)}&language=en-US`;
    const response = await fetch(url);
    const data = await response.json();
    res.status(response.ok ? 200 : 502).json(data);
  } catch (error) {
    console.error('Search Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch from TMDB' });
  }
});

// TMDB Details API (Auto-fill ke liye)
app.get('/api/tmdb/details/:type/:id', rateLimit, requireAdmin, async (req, res) => {
  try {
    const { type, id } = req.params;
    const apiKey = process.env.TMDB_API_KEY;

    if (!ALLOWED_TYPES.has(type)) return res.status(400).json({ error: 'Invalid type.' });
    if (!/^\d{1,10}$/.test(id)) return res.status(400).json({ error: 'Invalid id.' });
    if (!apiKey) return res.status(500).json({ error: 'TMDB API Key is missing on server.' });

    const url = `https://api.themoviedb.org/3/${type}/${id}?api_key=${apiKey}&language=en-US&append_to_response=credits,videos`;
    const response = await fetch(url);
    const data = await response.json();
    res.status(response.ok ? 200 : 502).json(data);
  } catch (error) {
    console.error('Details Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch details' });
  }
});

// CORS / other errors → clean JSON
app.use((err, req, res, next) => {
  if (err && err.message === 'Not allowed by CORS') return res.status(403).json({ error: 'Origin not allowed.' });
  console.error(err);
  res.status(500).json({ error: 'Server error.' });
});

// Server Start
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
