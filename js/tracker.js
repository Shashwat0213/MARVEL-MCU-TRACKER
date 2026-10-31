/* ═══════════════════════════════════════════════════════════
   MCU TRACKER — TRACKER STATE
   Watched + Favorites + Dropped — Local storage + Firestore sync
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
  let dropped = {}; // ✅ Naya State Add Kiya
  let saveTimer = null;

  // Load local state (works offline & for guests)
  try {
    watched = JSON.parse(localStorage.getItem("mcuWatched") || "{}");
    favorites = JSON.parse(localStorage.getItem("mcuFavorites") || "{}");
    dropped = JSON.parse(localStorage.getItem("mcuDropped") || "{}");
  } catch (e) {
    watched = {};
    favorites = {};
    dropped = {};
  }

  window.__mcuWatched = watched;
  window.__mcuFavorites = favorites;
  window.__mcuDropped = dropped; // ✅ Expose globally

  /* ═══════════ LOCAL SAVE ═══════════ */
  function saveLocal() {
    try {
      localStorage.setItem("mcuWatched", JSON.stringify(watched));
      localStorage.setItem("mcuFavorites", JSON.stringify(favorites));
      localStorage.setItem("mcuDropped", JSON.stringify(dropped));
    } catch (e) {
      console.warn("LocalStorage save failed:", e);
    }
  }

  /* ═══════════ CLOUD SAVE (debounced) ═══════════ */
  async function saveCloud() {
    const user = auth.currentUser;
    if (!user) return; // Guest user ka data cloud me nahi jayega

    try {
      const ref = doc(db, "users", user.uid, "private", "tracker");
      await setDoc(ref, {
        watched,
        favorites,
        dropped,
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
        dropped = data.dropped || {};
        window.__mcuWatched = watched;
        window.__mcuFavorites = favorites;
        window.__mcuDropped = dropped;
        saveLocal();
        if (window.setSyncStatus) window.setSyncStatus("synced", "ok");
        document.dispatchEvent(new CustomEvent("tracker-updated"));
      } else {
        // First time logging in — save local state to cloud
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
      delete dropped[movieId]; // Agar dekha hai toh drop list se hatao
    } else {
      delete watched[movieId];
    }

    window.__mcuWatched = watched;
    window.__mcuDropped = dropped;
    saveLocal();
    scheduleCloudSave();
    document.dispatchEvent(new CustomEvent("tracker-updated"));
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
    document.dispatchEvent(new CustomEvent("tracker-updated"));
  }

  function toggleDropped(movieId) {
    if (!movieId) return;
    if (dropped[movieId]) {
      delete dropped[movieId];
    } else {
      dropped[movieId] = true;
      delete watched[movieId]; // Agar drop kiya hai toh watched se hatao
    }

    window.__mcuDropped = dropped;
    window.__mcuWatched = watched;
    saveLocal();
    scheduleCloudSave();
    document.dispatchEvent(new CustomEvent("tracker-updated"));
  }

  function resetTracker() {
    if (!confirm("Reset all watched, favorites, and dropped? This cannot be undone.")) return;
    watched = {};
    favorites = {};
    dropped = {};
    window.__mcuWatched = watched;
    window.__mcuFavorites = favorites;
    window.__mcuDropped = dropped;
    saveLocal();
    scheduleCloudSave();
    document.dispatchEvent(new CustomEvent("tracker-updated"));
    if (window.showToast) window.showToast("✓ Tracker reset", "ok");
  }

  /* ═══════════ EXPORTS ═══════════ */
  window.toggleWatched = toggleWatched;
  window.toggleFavorite = toggleFavorite;
  window.toggleDropped = toggleDropped;
  window.resetTracker = resetTracker;

  /* ═══════════ EVENTS ═══════════ */
  document.addEventListener("user-logged-in", () => {
    loadCloud();
  });

  document.addEventListener("user-logged-out", () => {
    if (window.setSyncStatus) window.setSyncStatus("Guest mode", "idle");
  });

  console.log("✅ Tracker module loaded (Watched, Favorites, Dropped)");
}