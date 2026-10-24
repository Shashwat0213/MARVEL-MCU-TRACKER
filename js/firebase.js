/* ═══════════════════════════════════════════════════════════
   MCU TRACKER — FIREBASE INITIALIZATION & GLOBAL HELPERS
   ═══════════════════════════════════════════════════════════ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAxiho1OLRry1mU8CRm6lQirUGQCVlNDWg",
  authDomain: "marvel-mcu-tracker.firebaseapp.com",
  projectId: "marvel-mcu-tracker",
  storageBucket: "marvel-mcu-tracker.firebasestorage.app",
  messagingSenderId: "353104751639",
  appId: "1:353104751639:web:9f5e43501ead4bbedd4052",
  measurementId: "G-5DJXGHN0NV"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

window.__mcuAuth = auth;
window.__mcuDb = db;

/* ═══════════ GLOBAL HELPERS (Bugs Fixed) ═══════════ */
window.escapeHTML = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[c]));
window.escapeAttr = window.escapeHTML;

window.setSyncStatus = (msg, type) => {
  console.log(`[Sync Status]: ${msg} (${type})`);
};

window.showToast = (msg, type) => {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = msg;
  toast.className = "toast show " + (type === "error" ? "error" : "");
  setTimeout(() => { toast.className = "toast"; }, 3000);
};

console.log("✅ Firebase initialized");