/* ═══════════════════════════════════════════════════════════
   MCU TRACKER — TRACKER STATE
   Watched + Favorites — Local storage + Firestore sync
   ═══════════════════════════════════════════════════════════ */

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const auth = window.__mcuAuth;
const db = window.__mcuDb;

if (!auth || !db) {
  console.error("❌ tracker.js: Firebase not initialized");
} else {
  /* ═══════════ STATE ═══════════ */
  let watched = {};
  let favorites = {};
  let saveTimer = null;

  // Load local state (works offline)
  try {
    watched = JSON.parse(localStorage.getItem("mcuWatched") || "{}");
    favorites = JSON.parse(localStorage.getItem("mcuFavorites") || "{}");
  } catch (e) {
    watched = {};
    favorites = {};
  }

  window.__mcuWatched = watched;
  window.__mcuFavorites = favorites;

  /* ═══════════ LOCAL SAVE ═══════════ */
  function saveLocal() {
    try {
      localStorage.setItem("mcuWatched", JSON.stringify(watched));
      localStorage.setItem("mcuFavorites", JSON.stringify(favorites));
    } catch (e) {
      console.warn("LocalStorage save failed:", e);
    }
  }

  /* ═══════════ CLOUD SAVE (debounced) ═══════════ */
  async function saveCloud() {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const ref = doc(db, "users", user.uid, "private", "tracker");
      await setDoc(ref, {
        watched,
        favorites,
        updatedAt: serverTimestamp()
      }, { merge: true });

      if (window.setSyncStatus) window.setSyncStatus("synced", "ok");
    } catch (e) {
      console.error("Cloud save failed:", e);
      if (window.setSyncStatus) window.setSyncStatus("save failed", "error");
    }
  }

  function scheduleCloudSave() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveCloud();
    }, 500);
  }

  /* ═══════════ CLOUD LOAD ═══════════ */
  async function loadCloud() {
    const user = auth.currentUser;
    if (!user) return;

    try {
      if (window.setSyncStatus) window.setSyncStatus("loading…", "idle");
      const ref = doc(db, "users", user.uid, "private", "tracker");
      const snap = await getDoc(ref);

      if (snap.exists()) {
        const data = snap.data();
        watched = data.watched || {};
        favorites = data.favorites || {};
        window.__mcuWatched = watched;
        window.__mcuFavorites = favorites;
        saveLocal();
        if (window.setSyncStatus) window.setSyncStatus("synced", "ok");
        document.dispatchEvent(new CustomEvent("tracker-updated"));
      } else {
        // First time — save local state to cloud
        await saveCloud();
      }
    } catch (e) {
      console.error("Cloud load failed:", e);
      if (window.setSyncStatus) window.setSyncStatus("load failed", "error");
    }
  }

  /* ═══════════ PUBLIC ACTIONS ═══════════ */
  function toggleWatched(movieId, forceState) {
    if (!movieId) return;
    const newVal = typeof forceState === "boolean" ? forceState : !watched[movieId];
    if (newVal) {
      watched[movieId] = true;
    } else {
      delete watched[movieId];
    }

    window.__mcuWatched = watched;
    saveLocal();
    scheduleCloudSave();
    document.dispatchEvent(new CustomEvent("tracker-updated")); // Triggers UI Update
  }

  function toggleFavorite(movieId) {
    if (!movieId) return;
    if (favorites[movieId]) {
      delete favorites[movieId];
    } else {
      favorites[movieId] = true;
    }

    window.__mcuFavorites = favorites;
    saveLocal();
    scheduleCloudSave();
    document.dispatchEvent(new CustomEvent("tracker-updated")); // Triggers UI Update
  }

  function resetTracker() {
    if (!confirm("Reset all watched and favorites? This cannot be undone.")) return;
    watched = {};
    favorites = {};
    window.__mcuWatched = watched;
    window.__mcuFavorites = favorites;
    saveLocal();
    scheduleCloudSave();
    document.dispatchEvent(new CustomEvent("tracker-updated"));
    if (window.showToast) window.showToast("✓ Tracker reset", "ok");
  }

  /* ═══════════ EXPORTS ═══════════ */
  window.toggleWatched = toggleWatched;
  window.toggleFavorite = toggleFavorite;
  window.resetTracker = resetTracker;

  /* ═══════════ EVENTS ═══════════ */
  document.addEventListener("user-logged-in", () => {
    loadCloud();
  });

  document.addEventListener("user-logged-out", () => {
    if (window.setSyncStatus) window.setSyncStatus("not signed in", "idle");
  });

  console.log("✅ Tracker module loaded");
}