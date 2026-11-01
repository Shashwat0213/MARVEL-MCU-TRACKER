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
  let dropped = {};
  let saveTimer = null;

  // Which account the data in localStorage belongs to.
  // "" = guest / not tied to an account, otherwise the account's uid.
  const OWNER_KEY = "mcuLocalOwner";
  let cloudReadyUid = null; // uid whose cloud data is loaded (saving is safe)
  let loadingUid = null;    // uid currently being loaded (avoids duplicate loads)
  let wasSignedIn = false;  // true only after a real sign-in (not on page load)

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
  window.__mcuDropped = dropped;

  /* Replace the contents IN PLACE so every reference to these objects
     (window.__mcu*, open modals) always sees the current data. */
  function replaceState(w, f, d) {
    [[watched, w], [favorites, f], [dropped, d]].forEach(([target, src]) => {
      Object.keys(target).forEach(k => delete target[k]);
      Object.assign(target, src || {});
    });
  }

  function isLocalEmpty() {
    return !Object.keys(watched).length &&
           !Object.keys(favorites).length &&
           !Object.keys(dropped).length;
  }

  function getOwner() {
    try { return localStorage.getItem(OWNER_KEY) || ""; } catch (e) { return ""; }
  }

  function setOwner(uid) {
    try { localStorage.setItem(OWNER_KEY, uid || ""); } catch (e) {}
  }

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

    // Never write before this account's cloud data has been loaded —
    // otherwise stale local data could overwrite the cloud copy.
    if (cloudReadyUid !== user.uid) {
      if (loadingUid !== user.uid) loadCloud();
      return;
    }

    try {
      const ref = doc(db, "users", user.uid, "private", "tracker");
      // NOTE: no { merge: true } here. Merge deep-merges maps, so removed
      // keys (unwatched / unfavorited / un-dropped) would stay in the cloud.
      await setDoc(ref, {
        watched,
        favorites,
        dropped,
        updatedAt: serverTimestamp()
      });

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
    const uid = user.uid;
    if (cloudReadyUid === uid || loadingUid === uid) return; // already done / in progress

    loadingUid = uid;
    try {
      if (window.setSyncStatus) window.setSyncStatus("loading…", "idle");
      const ref = doc(db, "users", uid, "private", "tracker");
      const snap = await getDoc(ref);

      // Account changed while loading — the new account's own login will load it
      if (!auth.currentUser || auth.currentUser.uid !== uid) return;

      const owner = getOwner();
      const localIsGuest = owner === "";
      const localIsOwn = owner === uid;

      // Leftover data from a different account must never carry over
      if (!localIsGuest && !localIsOwn) replaceState({}, {}, {});

      let needsPush = false;

      if (snap.exists()) {
        const data = snap.data();
        const cw = data.watched || {};
        const cf = data.favorites || {};
        const cd = data.dropped || {};

        if (localIsGuest && !isLocalEmpty()) {
          // Guest progress + account progress → keep both
          const mw = { ...cw, ...watched };
          const mf = { ...cf, ...favorites };
          const md = { ...cd, ...dropped };
          Object.keys(mw).forEach(k => { if (mw[k]) delete md[k]; }); // watched beats dropped
          replaceState(mw, mf, md);
          needsPush = true;
        } else {
          replaceState(cw, cf, cd);
        }
      } else {
        // First time logging in — local (guest) state becomes the cloud state
        needsPush = true;
      }

      setOwner(uid);
      saveLocal();
      cloudReadyUid = uid;

      if (needsPush) {
        await saveCloud();
      } else if (window.setSyncStatus) {
        window.setSyncStatus("synced", "ok");
      }
      document.dispatchEvent(new CustomEvent("tracker-updated"));
    } catch (e) {
      console.error("Cloud load failed:", e);
      if (window.setSyncStatus) window.setSyncStatus("load failed", "error");
    } finally {
      if (loadingUid === uid) loadingUid = null;
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
    replaceState({}, {}, {});
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

  /* ═══════════ RESET BUTTON ═══════════ */
  const resetBtn = document.getElementById("resetBtn");
  if (resetBtn) resetBtn.addEventListener("click", resetTracker);

  /* ═══════════ EVENTS ═══════════ */
  document.addEventListener("user-logged-in", () => {
    wasSignedIn = true;
    loadCloud();
  });

  document.addEventListener("user-logged-out", () => {
    // This event also fires on every page load for signed-out visitors,
    // so only treat it as a logout if someone was actually signed in.
    cloudReadyUid = null;
    loadingUid = null;
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }

    if (wasSignedIn) {
      wasSignedIn = false;
      // Don't leave the previous account's data on this device
      replaceState({}, {}, {});
      setOwner("");
      saveLocal();
      document.dispatchEvent(new CustomEvent("tracker-updated"));
    }
    if (window.setSyncStatus) window.setSyncStatus("Guest mode", "idle");
  });

  console.log("✅ Tracker module loaded (Watched, Favorites, Dropped)");
}
