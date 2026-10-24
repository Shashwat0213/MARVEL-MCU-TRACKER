/* ═══════════════════════════════════════════════════════════
   MCU TRACKER — MASTER ADMIN PANEL
   Timer Fix + Edit Feature Included
   ═══════════════════════════════════════════════════════════ */

import {
  collection,
  getDocs,
  getDoc,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const auth = window.__mcuAuth;
const db = window.__mcuDb;

const ADMIN_EMAIL = "mcutrackersupport@gmail.com";
const RENDER_BACKEND_URL = "https://marvel-mcu-tracker.onrender.com"; 

if (!auth || !db) {
  console.error("❌ admin.js: Firebase not initialized");
} else {
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));

  async function isAdmin(user) {
    if (!user) return false;
    if ((user.email || "").toLowerCase() === ADMIN_EMAIL.toLowerCase()) return true;
    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      return snap.exists() && snap.data().role === "admin";
    } catch (e) {
      return false;
    }
  }

  async function requireAdmin() {
    const u = auth.currentUser;
    if (!u) throw new Error("Please login first.");
    if (!(await isAdmin(u))) throw new Error("Admin access required.");
    return u;
  }

  function adminToast(msg, isError) {
    if (window.showToast) window.showToast(msg, isError ? "error" : "ok");
  }

  /* ═══════════ OPEN / CLOSE ═══════════ */
  async function openAdminPanel() {
    const user = auth.currentUser;
    if (!user) {
      if (window.showToast) window.showToast("Please login first.", "error");
      return;
    }
    if (!(await isAdmin(user))) {
      if (window.showToast) window.showToast("Admin access required.", "error");
      return;
    }

    const panel = $("adminPanel");
    if (!panel) return;

    panel.classList.add("open");
    panel.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    const who = $("adminWhoami");
    if (who) who.textContent = "Signed in as: " + user.email;

    switchAdminTab("dashboard");
  }

  function closeAdminPanel() {
    const panel = $("adminPanel");
    if (!panel) return;
    panel.classList.remove("open");
    panel.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  /* ═══════════ TABS ═══════════ */
  function switchAdminTab(tab) {
    document.querySelectorAll(".admin-tab").forEach(t => {
      t.classList.toggle("active", t.dataset.adminTab === tab);
    });
    document.querySelectorAll(".admin-pane").forEach(p => {
      p.classList.toggle("active", p.dataset.adminPane === tab);
    });

    if (tab === "dashboard") loadDashboard();
    if (tab === "catalog") loadCatalog();
    if (tab === "timers") loadTimers();
    if (tab === "users") loadUsers();
  }

  /* ═══════════ DASHBOARD ═══════════ */
  async function loadDashboard() {
    try {
      await requireAdmin();

      const [usersSnap, moviesSnap] = await Promise.all([
        getDocs(collection(db, "users")),
        getDocs(collection(db, "movies"))
      ]);

      const set = (id, val) => { const el = $(id); if (el) el.textContent = val; };
      set("adminStatUsers", usersSnap.size);
      set("adminStatMovies", moviesSnap.size);

      let totalWatched = 0, totalFavs = 0;
      const watchCount = {};

      for (const u of usersSnap.docs.slice(0, 100)) {
        try {
          const t = await getDoc(doc(db, "users", u.id, "private", "tracker"));
          if (t.exists()) {
            const data = t.data();
            const w = data.watched || {};
            Object.entries(w).forEach(([k, v]) => {
              if (v) { watchCount[k] = (watchCount[k] || 0) + 1; totalWatched++; }
            });
            totalFavs += Object.values(data.favorites || {}).filter(Boolean).length;
          }
        } catch (e) {}
      }

      set("adminStatWatched", totalWatched);
      set("adminStatFavs", totalFavs);

      const top = Object.entries(watchCount).sort((a, b) => b[1] - a[1]).slice(0, 5);
      const max = top[0] ? top[0][1] : 1;
      const movies = moviesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const topEl = $("adminTopMovies");
      if (topEl) {
        topEl.innerHTML = top.map(([mid, cnt]) => {
          const m = movies.find(x => x.id === mid);
          const pct = Math.round((cnt / max) * 100);
          return `<div style="margin-bottom:12px">
            <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:0.75rem">
              <span>${esc(m && m.title ? m.title : mid)}</span>
              <b style="color:var(--primary)">${cnt}</b>
            </div>
            <div style="height:6px;background:var(--card-2);border-radius:3px;overflow:hidden">
              <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,var(--primary),var(--secondary));border-radius:3px;transition:width 0.5s ease"></div>
            </div>
          </div>`;
        }).join("") || "<p style='opacity:0.6;font-size:0.8rem'>No data yet.</p>";
      }
    } catch (e) {
      console.error(e);
      adminToast(e.message, true);
    }
  }

  /* ═══════════ TMDB SEARCH VIA RENDER ═══════════ */
  async function tmdbSearch() {
    const type = ($("tmdbType") && $("tmdbType").value) || "movie";
    const queryText = $("tmdbQuery") ? $("tmdbQuery").value.trim() : "";
    if (!queryText) { adminToast("Type a title to search.", true); return; }

    const resultsEl = $("tmdbResults");
    if (resultsEl) resultsEl.innerHTML = "<p style='padding:12px;opacity:0.7'>Searching TMDB…</p>";

    try {
      const res = await fetch(`${RENDER_BACKEND_URL}/api/tmdb/search?type=${type}&query=${encodeURIComponent(queryText)}`);
      if (!res.ok) throw new Error("Server error: " + res.status);
      const data = await res.json();
      
      const results = (data.results || []).slice(0, 20);

      if (!results.length) {
        if (resultsEl) resultsEl.innerHTML = "<p style='padding:12px;opacity:0.7'>No results.</p>";
        return;
      }

      if (resultsEl) {
        resultsEl.innerHTML = results.map(r => {
          const poster = r.poster_path
            ? "https://image.tmdb.org/t/p/w300" + r.poster_path
            : "https://placehold.co/300x450/0d1422/00e5ff?text=No+Poster";
          const year = (r.release_date || r.first_air_date || "").slice(0, 4);
          return `<div class="tmdb-result" data-tmdb-id="${r.id}">
            <img src="${poster}" alt="">
            <div class="tmdb-result-info">
              <b>${esc(r.title || r.name || "")}</b>
              <small>${year} • ⭐ ${(r.vote_average || 0).toFixed(1)}</small>
            </div>
          </div>`;
        }).join("");

        resultsEl.querySelectorAll(".tmdb-result").forEach(card => {
          card.addEventListener("click", () => fillFromTmdb(card.dataset.tmdbId, type));
        });
      }
    } catch (e) {
      console.error(e);
      adminToast(e.message, true);
      if (resultsEl) resultsEl.innerHTML = "<p style='color:var(--danger);padding:12px'>" + esc(e.message) + "</p>";
    }
  }

  async function fillFromTmdb(id, type) {
    try {
      const res = await fetch(`${RENDER_BACKEND_URL}/api/tmdb/details/${type}/${id}`);
      const d = await res.json();

      const title = d.title || d.name || "";
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const year = (d.release_date || d.first_air_date || "").slice(0, 4);
      const trailer = (d.videos && d.videos.results || []).find(v => v.type === "Trailer" && v.site === "YouTube");
      const cast = ((d.credits && d.credits.cast) || []).slice(0, 10).map(c => c.name).join(", ");
      const genres = (d.genres || []).map(g => g.name).join(", ");

      const set = (eid, val) => { const el = $(eid); if (el) el.value = val == null ? "" : val; };
      set("mId", slug);
      set("mTitle", title);
      set("mType", type === "tv" ? "series" : "movie");
      set("mYear", year);
      set("mReleaseDate", d.release_date || d.first_air_date || "");
      set("mRating", (d.vote_average || 0).toFixed(1));
      set("mPoster", d.poster_path ? "https://image.tmdb.org/t/p/w500" + d.poster_path : "");
      set("mBackdrop", d.backdrop_path ? "https://image.tmdb.org/t/p/w780" + d.backdrop_path : "");
      set("mTrailer", trailer ? "https://www.youtube.com/watch?v=" + trailer.key : "");
      set("mDescription", d.overview || "");
      set("mCast", cast);
      set("mGenres", genres);

      adminToast("✓ Auto-filled from TMDB. Review and save.");
    } catch (e) {
      console.error(e);
      adminToast(e.message, true);
    }
  }

  /* ═══════════ SAVE MOVIE ═══════════ */
  function buildMoviePayload(status) {
    const user = auth.currentUser;
    const val = id => { const el = $(id); return el ? el.value.trim() : ""; };
    const title = val("mTitle");
    const id = val("mId") || title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    return {
      id,
      title,
      type: val("mType") || "movie",
      year: parseInt(val("mYear")) || null,
      releaseDate: val("mReleaseDate"),
      rating: parseFloat(val("mRating")) || 0,
      phase: val("mPhase") || "MCU",
      importance: val("mImportance") || "Important",
      timelineSlot: parseInt(val("mSlot")) || 999,
      poster: val("mPoster"),
      backdrop: val("mBackdrop"),
      trailer: val("mTrailer"),
      downloadUrl: val("mDownload"),
      watchUrl: val("mWatchUrl"),
      description: val("mDescription"),
      cast: val("mCast"),
      genres: val("mGenres"),
      status: status,
      updatedAt: serverTimestamp(),
      updatedBy: user ? user.uid : "?"
    };
  }

  async function saveMovie(status) {
    try {
      await requireAdmin();
      const payload = buildMoviePayload(status);
      if (!payload.id || !payload.title) throw new Error("ID and Title are required.");

      await setDoc(doc(db, "movies", payload.id), payload, { merge: true });
      if (window.logActivity) {
        window.logActivity(status === "draft" ? "Save Draft" : "Publish Movie", payload.id + " — " + payload.title);
      }

      const statusEl = $("movieFormStatus");
      if (statusEl) {
        statusEl.textContent = status === "draft" ? "✓ Draft saved." : "✓ Published!";
        statusEl.style.color = "var(--success)";
      }
      adminToast(status === "draft" ? "📝 Draft saved" : "✅ Published!");
      document.dispatchEvent(new CustomEvent("movies-changed"));
    } catch (e) {
      console.error(e);
      const statusEl = $("movieFormStatus");
      if (statusEl) { statusEl.textContent = e.message; statusEl.style.color = "var(--danger)"; }
      adminToast(e.message, true);
    }
  }

  function clearMovieForm() {
    ["mId","mTitle","mYear","mReleaseDate","mRating","mPhase","mSlot",
     "mPoster","mBackdrop","mTrailer","mDownload","mWatchUrl",
     "mDescription","mCast","mGenres"].forEach(id => {
      const el = $(id); if (el) el.value = "";
    });
    const typeEl = $("mType"); if (typeEl) typeEl.value = "movie";
    const impEl = $("mImportance"); if (impEl) impEl.value = "Important";
    const statusEl = $("movieFormStatus"); if (statusEl) statusEl.textContent = "";
  }

  /* ═══════════ CATALOG ═══════════ */
  async function loadCatalog() {
    try {
      await requireAdmin();
      const snap = await getDocs(collection(db, "movies"));
      const items = [];
      snap.forEach(d => items.push({ id: d.id, ...d.data() }));
      items.sort((a, b) => (a.timelineSlot || 999) - (b.timelineSlot || 999));

      const searchEl = $("catalogSearch");
      const filterEl = $("catalogFilter");
      const search = searchEl ? searchEl.value.toLowerCase() : "";
      const filter = filterEl ? filterEl.value : "all";

      const filtered = items.filter(x => {
        if (search && !((x.id + " " + (x.title || "")).toLowerCase().includes(search))) return false;
        if (filter === "published" && x.status === "draft") return false;
        if (filter === "draft" && x.status !== "draft") return false;
        return true;
      });

      const listEl = $("catalogList");
      if (!listEl) return;

      if (!filtered.length) {
        listEl.innerHTML = "<p style='padding:20px;text-align:center;opacity:0.6'>No movies found.</p>";
        return;
      }

      listEl.innerHTML = filtered.map(x => {
        const badge = x.status === "draft"
          ? '<span class="badge badge-draft">DRAFT</span>'
          : '<span class="badge badge-published">LIVE</span>';
        return `<div class="admin-row">
          <div class="admin-row-content">
            <img class="admin-row-thumb" src="${esc(x.poster || "")}" onerror="this.style.display='none'" alt="">
            <div class="admin-row-text">
              <b>${esc(x.title || x.id)}</b>
              <small>${esc(x.type || "movie")} • Slot ${esc(String(x.timelineSlot || "?"))} • ${badge}</small>
            </div>
          </div>
          <div class="admin-row-actions">
            <button data-catalog-edit="${esc(x.id)}">✏️ Edit</button>
            <button class="danger" data-catalog-delete="${esc(x.id)}">🗑️</button>
          </div>
        </div>`;
      }).join("");

      listEl.querySelectorAll("[data-catalog-edit]").forEach(btn => {
        btn.onclick = () => editMovie(btn.dataset.catalogEdit);
      });
      listEl.querySelectorAll("[data-catalog-delete]").forEach(btn => {
        btn.onclick = () => deleteMovie(btn.dataset.catalogDelete);
      });
    } catch (e) {
      console.error(e);
      adminToast(e.message, true);
    }
  }

  async function editMovie(id) {
    try {
      await requireAdmin();
      const snap = await getDoc(doc(db, "movies", id));
      if (!snap.exists()) return;
      const x = { id: snap.id, ...snap.data() };
      const set = (elId, val) => { const el = $(elId); if (el) el.value = val == null ? "" : val; };

      set("mId", x.id);
      set("mTitle", x.title);
      set("mType", x.type || "movie");
      set("mYear", x.year);
      set("mReleaseDate", x.releaseDate);
      set("mRating", x.rating);
      set("mPhase", x.phase);
      set("mImportance", x.importance || "Important");
      set("mSlot", x.timelineSlot);
      set("mPoster", x.poster);
      set("mBackdrop", x.backdrop);
      set("mTrailer", x.trailer);
      set("mDownload", x.downloadUrl);
      set("mWatchUrl", x.watchUrl);
      set("mDescription", x.description);
      set("mCast", x.cast);
      set("mGenres", x.genres);

      switchAdminTab("add");
      adminToast("✓ Loaded for editing");
    } catch (e) {
      console.error(e);
      adminToast(e.message, true);
    }
  }

  async function deleteMovie(id) {
    try {
      await requireAdmin();
      if (!confirm('Delete "' + id + '"?')) return;
      await deleteDoc(doc(db, "movies", id));
      if (window.logActivity) window.logActivity("Delete Movie", id);
      adminToast("🗑️ Deleted");
      loadCatalog();
      document.dispatchEvent(new CustomEvent("movies-changed"));
    } catch (e) {
      console.error(e);
      adminToast(e.message, true);
    }
  }

  /* ═══════════ TIMERS (FIXED & EDITABLE) ═══════════ */
  async function loadTimers() {
    try {
      await requireAdmin();
      const snap = await getDocs(collection(db, "timers"));
      const timers = [];
      snap.forEach(d => timers.push({ id: d.id, ...d.data() }));

      const listEl = $("timerList");
      if (!listEl) return;

      if (!timers.length) {
        listEl.innerHTML = "<p style='padding:20px;text-align:center;opacity:0.6'>No timers created yet.</p>";
        return;
      }

      listEl.innerHTML = timers.map(t => {
        const dateStr = t.targetDate ? new Date(t.targetDate).toLocaleString() : "No date";
        return `<div class="admin-row">
          <div class="admin-row-content">
            <div class="admin-row-text">
              <b>${esc(t.title)}</b>
              <small>${esc(dateStr)}</small>
            </div>
          </div>
          <div class="admin-row-actions">
            <button data-timer-edit="${esc(t.id)}">✏️ Edit</button>
            <button class="danger" data-timer-delete="${esc(t.id)}">🗑️</button>
          </div>
        </div>`;
      }).join("");

      // ⚡ EDIT Timer Functionality
      listEl.querySelectorAll("[data-timer-edit]").forEach(btn => {
        btn.onclick = () => {
          const timer = timers.find(t => t.id === btn.dataset.timerEdit);
          if (timer) {
            $("timerTitle").value = timer.title || "";
            // Convert to local ISO string for datetime-local input
            if (timer.targetDate) {
               const dateObj = new Date(timer.targetDate);
               const offset = dateObj.getTimezoneOffset() * 60000;
               const localISOTime = (new Date(dateObj.getTime() - offset)).toISOString().slice(0, 16);
               $("timerDate").value = localISOTime;
            } else {
               $("timerDate").value = "";
            }
            $("timerPoster").value = timer.poster || "";
            $("timerSubtitle").value = timer.subtitle || "";
            
            adminToast("✓ Timer loaded in form. Edit and save.");
            // Scroll to form
            $("timerTitle").scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        };
      });

      // 🗑️ DELETE Timer Functionality
      listEl.querySelectorAll("[data-timer-delete]").forEach(btn => {
        btn.onclick = async () => {
          if (!confirm("Delete this timer?")) return;
          await deleteDoc(doc(db, "timers", btn.dataset.timerDelete));
          loadTimers();
          if (window.showToast) window.showToast("✓ Timer deleted");
        };
      });
    } catch (e) {
      console.error(e);
      adminToast(e.message, true);
    }
  }

  async function saveTimer() {
    try {
      await requireAdmin();
      const titleEl = $("timerTitle");
      const dateEl = $("timerDate");
      const title = titleEl ? titleEl.value.trim() : "";
      const date = dateEl ? dateEl.value : "";
      if (!title || !date) throw new Error("Title and date are required.");

      // Agar title "avengers-doomsday" jaisa hai toh fixed ID use karo, warna slug banao
      let id = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      
      const posterEl = $("timerPoster");
      const subtitleEl = $("timerSubtitle");

      await setDoc(doc(db, "timers", id), {
        id, title,
        targetDate: new Date(date).toISOString(),
        poster: posterEl ? posterEl.value.trim() : "",
        subtitle: subtitleEl ? subtitleEl.value.trim() : "",
        updatedAt: serverTimestamp()
      }, { merge: true });

      const statusEl = $("timerStatus");
      if (statusEl) { statusEl.textContent = "✓ Timer saved successfully!"; statusEl.style.color = "var(--success)"; }
      adminToast("✓ Timer saved");
      
      // Clear form after save
      $("timerTitle").value = "";
      $("timerDate").value = "";
      $("timerPoster").value = "";
      $("timerSubtitle").value = "";
      
      loadTimers();
    } catch (e) {
      console.error(e);
      const statusEl = $("timerStatus");
      if (statusEl) { statusEl.textContent = e.message; statusEl.style.color = "var(--danger)"; }
      adminToast(e.message, true);
    }
  }

  /* ═══════════ USERS ═══════════ */
  async function loadUsers() {
    try {
      await requireAdmin();
      const snap = await getDocs(collection(db, "users"));
      const users = [];
      snap.forEach(d => users.push({ id: d.id, ...d.data() }));

      const searchEl = $("userSearch");
      const search = searchEl ? searchEl.value.toLowerCase() : "";
      const filtered = users.filter(u =>
        ((u.displayName || "") + " " + (u.email || "")).toLowerCase().includes(search)
      );

      const listEl = $("userList");
      if (!listEl) return;

      if (!filtered.length) {
        listEl.innerHTML = "<p style='padding:20px;text-align:center;opacity:0.6'>No users.</p>";
        return;
      }

      listEl.innerHTML = filtered.map(u => {
        const initial = esc((u.displayName || u.email || "U").charAt(0).toUpperCase());
        const avatar = u.photoURL
          ? '<img src="' + esc(u.photoURL) + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%" alt="">'
          : initial;
        const isAdm = u.role === "admin";
        const roleBadge = isAdm
          ? '<span class="badge badge-admin">ADMIN</span>'
          : '<span class="badge badge-user">USER</span>';
        const roleBtn = isAdm
          ? '<button data-user-demote="' + esc(u.id) + '">⬇ Demote</button>'
          : '<button data-user-promote="' + esc(u.id) + '">⬆ Promote</button>';

        return `<div class="admin-row">
          <div class="admin-row-content">
            <div style="width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,var(--primary),var(--secondary));color:#000;font-weight:800;overflow:hidden;flex-shrink:0">${avatar}</div>
            <div class="admin-row-text">
              <b>${esc(u.displayName || "User")}</b>
              <small>${esc(u.email || "")}</small>
            </div>
          </div>
          <div class="admin-row-actions">${roleBadge}${roleBtn}</div>
        </div>`;
      }).join("");

      listEl.querySelectorAll("[data-user-promote]").forEach(btn => {
        btn.onclick = () => setUserRole(btn.dataset.userPromote, "admin");
      });
      listEl.querySelectorAll("[data-user-demote]").forEach(btn => {
        btn.onclick = () => setUserRole(btn.dataset.userDemote, "user");
      });
    } catch (e) {
      console.error(e);
      adminToast(e.message, true);
    }
  }

  async function setUserRole(uid, role) {
    try {
      await requireAdmin();
      await updateDoc(doc(db, "users", uid), { role, updatedAt: serverTimestamp() });
      if (window.logActivity) window.logActivity("User Role Update", uid + " → " + role);
      adminToast("✓ Role updated to " + role);
      loadUsers();
    } catch (e) {
      console.error(e);
      adminToast(e.message, true);
    }
  }

  /* ═══════════ EVENT BINDINGS ═══════════ */
  document.addEventListener("admin-open", openAdminPanel);

  const adminClose = $("adminClose");
  if (adminClose) adminClose.addEventListener("click", closeAdminPanel);

  document.querySelectorAll(".admin-tab").forEach(tab => {
    tab.addEventListener("click", () => switchAdminTab(tab.dataset.adminTab));
  });

  const tmdbSearchBtn = $("tmdbSearch");
  if (tmdbSearchBtn) tmdbSearchBtn.addEventListener("click", tmdbSearch);

  const tmdbQueryInput = $("tmdbQuery");
  if (tmdbQueryInput) {
    tmdbQueryInput.addEventListener("keydown", e => {
      if (e.key === "Enter") { e.preventDefault(); tmdbSearch(); }
    });
  }

  const savePublish = $("movieSavePublish");
  if (savePublish) savePublish.addEventListener("click", () => saveMovie("published"));

  const saveDraft = $("movieSaveDraft");
  if (saveDraft) saveDraft.addEventListener("click", () => saveMovie("draft"));

  const formClear = $("movieFormClear");
  if (formClear) formClear.addEventListener("click", clearMovieForm);

  const catalogSearch = $("catalogSearch");
  if (catalogSearch) catalogSearch.addEventListener("input", loadCatalog);

  const catalogFilter = $("catalogFilter");
  if (catalogFilter) catalogFilter.addEventListener("change", loadCatalog);

  // Timer Buttons
  const timerSave = $("timerSave");
  if (timerSave) timerSave.addEventListener("click", saveTimer);

  const timerClear = $("timerClear");
  if (timerClear) {
    timerClear.addEventListener("click", () => {
      ["timerTitle", "timerDate", "timerPoster", "timerSubtitle"].forEach(id => {
        const el = $(id); if (el) el.value = "";
      });
      const statusEl = $("timerStatus"); if (statusEl) statusEl.textContent = "";
    });
  }

  const userSearch = $("userSearch");
  if (userSearch) userSearch.addEventListener("input", loadUsers);

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      const panel = $("adminPanel");
      if (panel && panel.classList.contains("open")) closeAdminPanel();
    }
  });

  console.log("✅ Admin module loaded (Timers Editable & PWA Ready)");
}