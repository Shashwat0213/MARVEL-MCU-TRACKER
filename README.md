# ⚡ MCU Tracker — Marvel Cinematic Universe Watchlist

A modern, cinematic Progressive Web App (PWA) designed to track your journey through the Marvel Cinematic Universe. Built with a focus on premium UI/UX, seamless cross-device syncing, and offline capabilities.

![MCU Tracker Banner](https://image.tmdb.org/t/p/w780/7WsyChQLEftFiDOVTGkv3hFpyyt.jpg)

## ✨ Key Features

- **📱 Progressive Web App (PWA):** Installable on mobile and desktop. Works offline with cached assets.
- **🎨 7 Cinematic Themes:** Instantly transform the interface with themes like Cosmos, Arc Reactor, Inferno, Vibranium, Bifrost, Doomsday, and Noir.
- **🌗 Light / Dark Mode:** Seamless, layout-safe color switching.
- **🔐 Secure Authentication:** Sign in securely using Email/Password or Google OAuth (powered by Firebase).
- **👤 Personal Dashboard:** Keep track of movies/series watched, manage favorites, and view your overall MCU completion progress.
- **🛡️ Powerful Admin Suite:** 
  - Dynamic Movie Catalog management (Add/Edit/Delete).
  - Integrated **TMDB Auto-Fill** for instantly fetching posters, cast, and trailers.
  - User management and role assignment.
  - Custom countdown timers for upcoming releases.
- **⏱️ Live Doomsday Countdown:** Real-time countdown for the next big MCU theatrical release.
- **🔄 Real-time Sync:** Your progress is saved locally and synced to the cloud instantly.

---

## 🛠️ Tech Stack

**Frontend:**
- HTML5, CSS3 (Custom Properties, Flexbox/Grid)
- Vanilla JavaScript (ES6+ Modules)
- Firebase Web SDK v10 (Auth, Firestore)
- Progressive Web App (Service Workers, Web Manifest)

**Backend (API Proxy):**
- Node.js & Express.js
- Deployed on Render (Used to securely handle third-party API requests)

---

## 📂 Project Architecture

```text
shashwat0213.github.io/
│
├── index.html              # Main application interface
├── manifest.json           # PWA configuration
├── sw.js                   # Service Worker (Offline caching)
├── icon-192.png            # PWA Icon
├── icon-512.png            # PWA Icon
│
├── css/
│   ├── style.css           # Core layout & components
│   ├── themes.css          # Theme variables (Layout-safe)
│   └── animations.css      # Keyframes & transitions
│
├── js/
│   ├── firebase.js         # Firebase initialization & global helpers
│   ├── theme.js            # Theme switcher, Sound system, Countdowns
│   ├── auth.js             # Authentication logic
│   ├── movies.js           # Movie rendering, filtering, and seeding
│   ├── tracker.js          # Watched/Favorites state management
│   └── admin.js            # Admin panel logic & API communication
│
└── backend/                # Node.js Backend (Deployed separately)
    ├── package.json
    └── server.js           # Express server for secure API proxying