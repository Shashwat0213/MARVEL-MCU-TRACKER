/* ═══════════════════════════════════════════════════════════
   MCU TRACKER — AUTHENTICATION + GUEST MODE
   Email/Password + Google Sign-In + Guest Fallback
   ═══════════════════════════════════════════════════════════ */

import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  updateProfile,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const auth = window.__mcuAuth;
const db = window.__mcuDb;

const ADMIN_EMAIL = "mcutrackersupport@gmail.com";

if (!auth || !db) {
  console.error("❌ auth.js: Firebase not initialized");
} else {
  const $ = id => document.getElementById(id);

  const authModal = $("authOverlay");
  const authForm = $("authForm");
  const authName = $("authName");
  const authEmail = $("authEmail");
  const authPassword = $("authPassword");
  const authNameField = $("authNameField");
  const authMessage = $("authMessage");
  const authSubmitBtn = $("authSubmit");
  const authTitle = $("authTitle");
  const authSubtitle = $("authSubtitle");
  const googleBtn = $("googleBtn");
  const authUserBox = $("authUserBox");
  const authUserName = $("authUserName");
  const authAvatar = $("authAvatar");
  const authOpenBtn = $("authOpenBtn");

  let currentUser = null;

  function openAuthModal() {
    if (!authModal) return;
    authModal.classList.add("open");
    authModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    setAuthMode("login");
    setTimeout(() => authEmail && authEmail.focus(), 250);
  }

  function closeAuthModal() {
    if (!authModal) return;
    authModal.classList.remove("open");
    authModal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (authMessage) authMessage.textContent = "";
  }

  function setAuthMode(mode) {
    document.querySelectorAll(".auth-tab").forEach(tab => {
      tab.classList.toggle("active", tab.dataset.authTab === mode);
    });
    const isSignup = mode === "signup";
    if (authNameField) authNameField.style.display = isSignup ? "grid" : "none";
    if (authName) authName.required = isSignup;
    if (authTitle) authTitle.textContent = isSignup ? "Create account" : "Welcome back";
    if (authSubtitle) authSubtitle.textContent = isSignup
      ? "Create a secure account for your MCU journey."
      : "Sign in to sync your MCU tracker across devices.";
    if (authSubmitBtn) authSubmitBtn.textContent = isSignup ? "Create account" : "Login";
    if (authMessage) authMessage.textContent = "";
  }

  function showMessage(msg, ok = false) {
    if (!authMessage) return;
    authMessage.textContent = msg;
    authMessage.classList.toggle("success", ok);
  }

  async function saveUserProfile(user) {
    if (!user) return;
    try {
      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);
      const isAdminEmail = (user.email || "").toLowerCase() === ADMIN_EMAIL.toLowerCase();

      if (!snap.exists()) {
        await setDoc(ref, {
          uid: user.uid,
          email: user.email || "",
          displayName: user.displayName || (user.email || "").split("@")[0] || "User",
          photoURL: user.photoURL || "",
          role: isAdminEmail ? "admin" : "user",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      } else {
        await setDoc(ref, {
          email: user.email || snap.data().email || "",
          displayName: user.displayName || snap.data().displayName || "",
          photoURL: user.photoURL || snap.data().photoURL || "",
          updatedAt: serverTimestamp()
        }, { merge: true });
      }
    } catch (e) {
      console.warn("Could not save user profile:", e);
    }
  }

  async function getUserRole(user) {
    if (!user) return "user";
    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists() && snap.data().role === "admin") return "admin";
      if ((user.email || "").toLowerCase() === ADMIN_EMAIL.toLowerCase()) return "admin";
      return "user";
    } catch (e) {
      return "user";
    }
  }

  async function updateAuthUI(user) {
    currentUser = user;
    window.__mcuUser = user;

    if (user) {
      const role = await getUserRole(user);
      window.__mcuUserRole = role;

      const name = user.displayName || (user.email ? user.email.split("@")[0] : "User");
      const initial = name.trim().charAt(0).toUpperCase() || "U";

      if (authUserBox) authUserBox.style.display = "flex";
      if (authOpenBtn) authOpenBtn.style.display = "none";
      if (authUserName) authUserName.textContent = name;
      
      if (authAvatar) {
        if (user.photoURL) {
          authAvatar.innerHTML = `<img src="${window.escapeHTML(user.photoURL)}" alt="${window.escapeHTML(name)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
        } else {
          authAvatar.textContent = initial;
        }
      }

      const adminBtn = $("authAdminBtn");
      if (adminBtn) adminBtn.style.display = role === "admin" ? "inline-block" : "none";

      // ✅ Login hone par Guest button chhupao
      const guestBtn = $("guestBtn");
      if (guestBtn) guestBtn.style.display = "none";

      window.setSyncStatus("synced", "ok");
    } else {
      window.__mcuUserRole = null;
      
      // ✅ Logout hone par Guest button dikhao
      if (authUserBox) authUserBox.style.display = "none";
      if (authOpenBtn) authOpenBtn.style.display = "inline-block";
      
      const guestBtn = $("guestBtn");
      if (guestBtn) guestBtn.style.display = "inline-block";

      window.setSyncStatus("not signed in", "idle");
    }
  }

  async function handleAuthSubmit(e) {
    e.preventDefault();
    if (!authForm) return;

    const activeTab = document.querySelector(".auth-tab.active");
    const mode = activeTab ? activeTab.dataset.authTab : "login";
    const email = authEmail.value.trim();
    const password = authPassword.value;
    const name = authName && authName.value ? authName.value.trim() : "";

    if (!email || !password) return;

    authSubmitBtn.disabled = true;
    authSubmitBtn.textContent = "Please wait…";
    showMessage("");

    try {
      if (mode === "signup") {
        const cred = await createUserWithEmailAndPassword(auth, email, password);

        if (name) {
          try { await updateProfile(cred.user, { displayName: name }); } catch (e) {}
        }

        await saveUserProfile(cred.user);
        await updateAuthUI(cred.user);

        closeAuthModal();
        window.showToast("✓ Account created successfully!", "ok");
        document.dispatchEvent(new CustomEvent("user-logged-in", { detail: { user: cred.user } }));
      } else {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        await updateAuthUI(cred.user);

        closeAuthModal();
        window.showToast("✓ Logged in successfully!", "ok");
        document.dispatchEvent(new CustomEvent("user-logged-in", { detail: { user: cred.user } }));
      }
    } catch (err) {
      console.error("Auth error:", err);
      const messages = {
        "auth/invalid-credential": "Email or password is incorrect.",
        "auth/email-already-in-use": "That email is already registered.",
        "auth/weak-password": "Password must be at least 6 characters.",
        "auth/invalid-email": "Please enter a valid email address.",
        "auth/network-request-failed": "Network error. Check your connection.",
        "auth/operation-not-allowed": "Email/Password sign-in is not enabled in Firebase.",
        "auth/unauthorized-domain": "This domain is not authorized in Firebase Authentication.",
        "auth/user-disabled": "This account has been disabled.",
        "permission-denied": "Firestore permission denied. Check rules."
      };
      showMessage(messages[err.code] || err.message || "Authentication failed.");
    } finally {
      authSubmitBtn.disabled = false;
      authSubmitBtn.textContent = mode === "signup" ? "Create account" : "Login";
    }
  }

  /* ═══════════ GOOGLE LOGIN ═══════════ */
  async function handleGoogleLogin() {
    if (!googleBtn) return;

    const originalHTML = googleBtn.innerHTML;
    googleBtn.disabled = true;
    googleBtn.innerHTML = "Signing in…";

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });

    try {
      const result = await signInWithPopup(auth, provider);
      if (result.user) {
        await saveUserProfile(result.user);
        await updateAuthUI(result.user);
        closeAuthModal();
        window.showToast("✓ Logged in with Google!", "ok");
        document.dispatchEvent(new CustomEvent("user-logged-in", { detail: { user: result.user } }));
      }
    } catch (err) {
      console.error("Google login error:", err);
      const messages = {
        "auth/popup-blocked": "Popup blocked. Please allow popups for this site and try again.",
        "auth/popup-closed-by-user": "Sign-in cancelled. Please try again.",
        "auth/cancelled-popup-request": "Another sign-in is in progress. Wait a moment.",
        "auth/unauthorized-domain": "This domain is not authorized in Firebase.",
        "auth/network-request-failed": "Network error. Check your connection.",
        "auth/account-exists-with-different-credential": "This email uses another sign-in method.",
        "auth/operation-not-allowed": "Google sign-in is not enabled in Firebase."
      };
      showMessage(messages[err.code] || err.message || "Google sign-in failed.");
      googleBtn.disabled = false;
      googleBtn.innerHTML = originalHTML;
    }
  }

  async function handleLogout() {
    try {
      await signOut(auth);
      window.showToast("✓ Logged out", "ok");
      document.dispatchEvent(new CustomEvent("user-logged-out"));
    } catch (err) {
      console.error("Logout error:", err);
      window.showToast("Logout failed", "error");
    }
  }

  /* ═══════════ GUEST MODE LOGIC ═══════════ */
  function handleGuestLogin() {
    // Hide auth UI
    if (authUserBox) authUserBox.style.display = "flex";
    if (authOpenBtn) authOpenBtn.style.display = "none";
    
    // Update Guest UI
    if (authUserName) authUserName.textContent = "Guest";
    if (authAvatar) authAvatar.textContent = "G";
    
    // Hide Guest Button
    const guestBtn = $("guestBtn");
    if (guestBtn) guestBtn.style.display = "none";
    
    // Show Admin Button? (No, guest cannot be admin)
    const adminBtn = $("authAdminBtn");
    if (adminBtn) adminBtn.style.display = "none";

    window.__mcuUserRole = "guest";
    window.__mcuUser = null;
    window.setSyncStatus("Guest mode", "idle");

    // Load movies from local storage
    document.dispatchEvent(new CustomEvent("tracker-updated"));
    window.showToast("✓ Entered as Guest. Progress saves locally.", "ok");
  }

  /* ═══════════ EVENT BINDINGS ═══════════ */
  if (authOpenBtn) authOpenBtn.addEventListener("click", openAuthModal);
  const authCloseBtn = $("authCloseBtn");
  if (authCloseBtn) authCloseBtn.addEventListener("click", closeAuthModal);
  const authLogoutBtn = $("authLogoutBtn");
  if (authLogoutBtn) authLogoutBtn.addEventListener("click", handleLogout);

  if (authModal) {
    authModal.addEventListener("click", e => {
      if (e.target === authModal) closeAuthModal();
    });
  }

  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && authModal && authModal.classList.contains("open")) {
      closeAuthModal();
    }
  });

  document.querySelectorAll(".auth-tab").forEach(tab => {
    tab.addEventListener("click", () => setAuthMode(tab.dataset.authTab));
  });

  if (authForm) authForm.addEventListener("submit", handleAuthSubmit);
  if (googleBtn) googleBtn.addEventListener("click", handleGoogleLogin);

  // ⚡ GUEST BUTTON CLICK ⚡
  const guestBtn = $("guestBtn");
  if (guestBtn) {
    guestBtn.addEventListener("click", handleGuestLogin);
  }

  const adminBtn = $("authAdminBtn");
  if (adminBtn) {
    adminBtn.addEventListener("click", () => {
      document.dispatchEvent(new CustomEvent("admin-open"));
    });
  }

  /* ═══════════ PERSISTENCE ═══════════ */
  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch (e) {
    console.warn("Persistence setup failed:", e);
  }

  /* ═══════════ AUTH STATE LISTENER ═══════════ */
  onAuthStateChanged(auth, async user => {
    await updateAuthUI(user);
    if (user) {
      document.dispatchEvent(new CustomEvent("user-logged-in", { detail: { user } }));
    } else {
      document.dispatchEvent(new CustomEvent("user-logged-out"));
    }
  });

  window.openAuthModal = openAuthModal;
  window.closeAuthModal = closeAuthModal;
  window.handleLogout = handleLogout;
  window.getUserRole = getUserRole;

  console.log("✅ Auth module loaded (Guest Mode Supported)");
}