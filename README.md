# ⚡ MCU Tracker — Marvel Cinematic Universe Watchlist

A modern, cinematic Progressive Web App (PWA) designed to track your journey through the Marvel Cinematic Universe. Built with a focus on premium UI/UX, seamless cross-device syncing, and offline capabilities.

🌐 **Live Website:** [https://shashwat0213.github.io/MARVEL-MCU-TRACKER/](https://shashwat0213.github.io/MARVEL-MCU-TRACKER/)

---

## ✨ Key Features

- **📱 Progressive Web App (PWA):** Installable on Android & iOS directly from the browser. Works offline with cached assets.
- **🎨 7 Premium Cinematic Themes:** Instantly transform the interface with themes like Stark Tech, Asgard, Hulk Smash, Wakanda, Sanctum, Doomsday, and Spider-Verse.
- **🌗 Light / Dark Mode:** Seamless, layout-safe color switching.
- **🔐 Secure Authentication:** Sign in securely using Email/Password or Google OAuth (powered by Firebase).
- **👤 Guest Mode:** Don't want to sign in? Continue as a guest and your progress will be saved locally on your device.
- **📊 Personal Dashboard:** Keep track of movies/series watched, manage favorites, and view your overall MCU completion progress.
- **🗑️ Drop Movies:** Not interested in a specific movie? Drop it from your watchlist and keep your timeline clean.
- **🛡️ Powerful Admin Suite:** 
  - Dynamic Movie Catalog management (Add/Edit/Delete).
  - Integrated **TMDB Auto-Fill** for instantly fetching posters, cast, and trailers.
  - User management and role assignment.
  - Custom countdown timers for upcoming releases.
- **💬 Feedback System:** Users can send feedback directly from the app, which is stored securely and emailed to the admin.
- **⏱️ Live Doomsday Countdown:** Real-time countdown for the next big MCU theatrical release.
- **🔄 Real-time Sync:** Your progress is saved locally and synced to the cloud instantly when logged in.

---

## 🛠️ Tech Stack

**Frontend:**
- HTML5, CSS3 (Custom Properties, Flexbox/Grid)
- Vanilla JavaScript (ES6+ Modules)
- Firebase Web SDK v10 (Auth, Firestore)
- Progressive Web App (Service Workers, Web Manifest)

**Backend (API Proxy):**
- Node.js & Express.js
- Deployed on Render (Used to securely handle third-party API requests without exposing keys)

---

## 📂 Project Architecture

```text
MARVEL-MCU-TRACKER/
│
├── index.html                  # Main application interface
├── manifest.json               # PWA configuration
├── sw.js                       # Service Worker (Offline caching)
├── mcu_tracker_icon_192x192.png # PWA App Icon (Small)
├── mcu_tracker_icon_512x512.png # PWA App Icon (Large)
│
├── css/
│   ├── style.css               # Core layout & components
│   ├── themes.css              # Theme variables (Layout-safe)
│   └── animations.css          # Keyframes & transitions
│
├── js/
│   ├── firebase.js             # Firebase initialization & global helpers
│   ├── theme.js                # Theme switcher, Sound system, Countdowns
│   ├── auth.js                 # Authentication logic (Email/Google/Guest)
│   ├── movies.js               # Movie rendering, filtering, and drop logic
│   ├── tracker.js              # Watched/Favorites/Dropped state management
│   └── admin.js                # Admin panel logic & API communication
│
└── backend/                    # Node.js Backend (Deployed separately)
    ├── package.json
    └── server.js               # Express server for secure API proxying