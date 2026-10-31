/* ═══════════════════════════════════════════════════════════
   MCU TRACKER — MOVIES
   Loads from Firestore. No hardcoded movies (Admin adds them).
   ═══════════════════════════════════════════════════════════ */

import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const db = window.__mcuDb;

if (!db) {
  console.error("❌ movies.js: Firebase not initialized");
} else {
  const $ = id => document.getElementById(id);

  /* ═══════════ STATE ═══════════ */
  let allMovies = [];
  let currentFilter = "all";
  let currentSearch = "";
  let currentSort = "default";

  /* ═══════════ LOAD FROM FIRESTORE ONLY ═══════════ */
  async function loadMoviesFromFirestore() {
    try {
      const snap = await getDocs(collection(db, "movies"));
      const movies = [];
      snap.forEach(d => {
        const data = d.data();
        // Sirf published movies dikhao
        if (!data.status || data.status === "published") {
          movies.push({ id: d.id, ...data });
        }
      });
      allMovies = movies;
      window.__mcuMovies = movies;
      console.log(`✅ Loaded ${movies.length} movies from Firestore`);
      return movies;
    } catch (e) {
      console.error("Failed to load movies:", e);
      return [];
    }
  }

  /* ═══════════ FILTER + SORT + SEARCH ═══════════ */
  function getFilteredMovies() {
    let result = [...allMovies];

    if (currentSearch) {
      const q = currentSearch.toLowerCase().trim();
      result = result.filter(m =>
        (m.title || "").toLowerCase().includes(q) ||
        (m.description || "").toLowerCase().includes(q) ||
        (m.cast || "").toLowerCase().includes(q)
      );
    }

    const watched = window.__mcuWatched || {};
    const favorites = window.__mcuFavorites || {};
    const dropped = window.__mcuDropped || {};

    if (currentFilter === "movie") {
      result = result.filter(m => (m.type || "movie") === "movie");
    } else if (currentFilter === "series") {
      result = result.filter(m => m.type === "series");
    } else if (currentFilter === "watched") {
      result = result.filter(m => watched[m.id]);
    } else if (currentFilter === "unwatched") {
      result = result.filter(m => !watched[m.id] && !dropped[m.id]);
    } else if (currentFilter === "favorites") {
      result = result.filter(m => favorites[m.id]);
    } else if (currentFilter === "dropped") {
      result = result.filter(m => dropped[m.id]);
    }

    switch (currentSort) {
      case "title":
        result.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
        break;
      case "year":
        result.sort((a, b) => (parseInt(a.year) || 9999) - (parseInt(b.year) || 9999));
        break;
      case "rating":
        result.sort((a, b) => (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0));
        break;
      case "phase":
        result.sort((a, b) => (a.phase || "").localeCompare(b.phase || ""));
        break;
      case "default":
      default:
        result.sort((a, b) => {
          const sa = Number.isFinite(Number(a.timelineSlot)) ? Number(a.timelineSlot) : 9999;
          const sb = Number.isFinite(Number(b.timelineSlot)) ? Number(b.timelineSlot) : 9999;
          return sa - sb || (a.title || "").localeCompare(b.title || "");
        });
        break;
    }

    return result;
  }

  /* ═══════════ RENDER ═══════════ */
  function renderMovies() {
    const movieList = $("movieList");
    if (!movieList) return;

    const filtered = getFilteredMovies();

    if (filtered.length === 0) {
      movieList.innerHTML = `
        <li class="empty-state">
          <div class="empty-icon">🎬</div>
          <p>${allMovies.length === 0
            ? "No movies yet. Admin can add from the admin panel."
            : "No movies match your filter."}</p>
        </li>
      `;
      updateStats();
      return;
    }

    movieList.innerHTML = "";

    filtered.forEach(movie => {
      const isWatched = !!(window.__mcuWatched || {})[movie.id];
      const isFavorite = !!(window.__mcuFavorites || {})[movie.id];
      const isDropped = !!(window.__mcuDropped || {})[movie.id];

      const li = document.createElement("li");
      li.className = "movie-card";
      li.dataset.movieId = movie.id;

      const posterSrc = movie.poster || "";
      const title = window.escapeHTML(movie.title || movie.id);
      const phase = window.escapeHTML(movie.phase || "MCU");
      const releaseDate = movie.releaseDate || movie.year || "TBA";
      const rating = movie.rating && movie.rating > 0
        ? `⭐ ${Number(movie.rating).toFixed(1)}`
        : "⭐ TBA";
      const typeLabel = movie.type === "series" ? "📺 WEB SERIES" : "🎬 MOVIE";
      const importanceText = movie.importance ? ` • ${window.escapeHTML(movie.importance).toUpperCase()}` : "";

      li.innerHTML = `
        <div class="poster-container">
          <img class="poster" src="${window.escapeAttr(posterSrc)}" alt="${title}" loading="lazy"
               onerror="this.onerror=null; this.src='https://placehold.co/500x750/0d1422/00e5ff?text=${encodeURIComponent(movie.title || 'MCU')}';">
          <div class="poster-overlay"></div>
          <div class="phase-badge">${phase}</div>
          <button class="favorite-btn ${isFavorite ? "active" : ""}" data-action="favorite" data-id="${window.escapeAttr(movie.id)}" title="Favorite">
            ${isFavorite ? "❤️" : "♡"}
          </button>
          
          <!-- ⚡ DROP BUTTON ⚡ -->
          <button class="drop-btn ${isDropped ? "active" : ""}" data-action="dropped" data-id="${window.escapeAttr(movie.id)}" title="Drop Movie">
            🗑️
          </button>
        </div>
        <div class="movie-info">
          <h2 class="movie-title" ${isWatched ? 'style="text-decoration:line-through;opacity:0.6"' : ""}>${title}</h2>
          <span class="movie-type-badge">${typeLabel}${importanceText}</span>
          <div class="movie-meta">
            <span class="meta-item">📅 ${window.escapeHTML(String(releaseDate))}</span>
            <span class="meta-item rating">${rating}</span>
            <span class="meta-item">⚡ ${phase}</span>
            ${movie.timelineSlot ? `<span class="meta-item">🎬 Slot ${window.escapeHTML(String(movie.timelineSlot))}</span>` : ""}
          </div>
          <div class="watch-row">
            <label class="watch-label">
              <input type="checkbox" class="watch-checkbox" data-action="watched" data-id="${window.escapeAttr(movie.id)}" ${isWatched ? "checked" : ""}>
              <span class="${isWatched ? "watched-text" : ""}">${isWatched ? "Watched" : "Mark as watched"}</span>
            </label>
            <span class="fav-indicator">${isFavorite ? "❤️" : "♡"}</span>
          </div>
        </div>
      `;

      movieList.appendChild(li);
    });

    updateStats();
  }

  /* ═══════════ CLICK HANDLERS ═══════════ */
  document.addEventListener("click", e => {
    const favBtn = e.target.closest('[data-action="favorite"]');
    if (favBtn) {
      e.stopPropagation();
      if (window.toggleFavorite) window.toggleFavorite(favBtn.dataset.id);
      return;
    }

    const dropBtn = e.target.closest('[data-action="dropped"]');
    if (dropBtn) {
      e.stopPropagation();
      if (window.toggleDropped) window.toggleDropped(dropBtn.dataset.id);
      return;
    }

    const card = e.target.closest(".movie-card");
    if (card && !e.target.closest("button") && !e.target.closest("input") && !e.target.closest("label")) {
      const movie = allMovies.find(m => m.id === card.dataset.movieId);
      if (movie && window.openMovieModal) window.openMovieModal(movie);
    }
  });

  document.addEventListener("change", e => {
    const cb = e.target.closest('[data-action="watched"]');
    if (cb) {
      if (window.toggleWatched) window.toggleWatched(cb.dataset.id, cb.checked);
    }
  });

  /* ═══════════ STATS ═══════════ */
  function updateStats() {
    const watched = window.__mcuWatched || {};
    const favorites = window.__mcuFavorites || {};

    const total = allMovies.length;
    const done = allMovies.filter(m => watched[m.id]).length;
    const favs = allMovies.filter(m => favorites[m.id]).length;
    const remaining = total - done;
    const percent = total > 0 ? Math.round((done / total) * 100) : 0;

    const setText = (id, val) => {
      const el = $(id);
      if (el) el.textContent = val;
    };

    setText("totalMovies", total);
    setText("watchedMovies", done);
    setText("remainingMovies", remaining);
    setText("favoriteMovies", favs);

    const progressBar = $("progressBar");
    const progressText = $("progressText");
    if (progressBar) progressBar.style.width = percent + "%";
    if (progressText) progressText.textContent = `${done}/${total} (${percent}%)`;

    setText("v3Watched", done);
    setText("v3Favs", favs);
    setText("v3Remaining", remaining);
    setText("v3ProgressText", percent + "%");
    const v3ProgressFill = $("v3ProgressFill");
    if (v3ProgressFill) v3ProgressFill.style.width = percent + "%";
  }

  /* ═══════════ TOOLBAR ═══════════ */
  const searchInput = $("search");
  if (searchInput) {
    searchInput.addEventListener("input", e => {
      currentSearch = e.target.value;
      renderMovies();
    });
  }

  document.querySelectorAll(".filter-btn").forEach(chip => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".filter-btn").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      currentFilter = chip.dataset.filter || "all";
      renderMovies();
    });
  });

  const sortSelect = $("sortSelect");
  if (sortSelect) {
    sortSelect.addEventListener("change", e => {
      currentSort = e.target.value;
      renderMovies();
    });
  }

  /* ═══════════ MOVIE MODAL ═══════════ */
  function openMovieModal(movie) {
    const modal = $("movieModal");
    if (!modal || !movie) return;

    const watched = window.__mcuWatched || {};
    const favorites = window.__mcuFavorites || {};

    const poster = $("modalPoster");
    const title = $("modalTitle");
    const meta = $("modalMeta");
    const desc = $("modalDescription");
    const genres = $("modalGenres");
    const cast = $("modalCast");
    const trailerBtn = $("modalTrailerBtn");
    const downloadBtn = $("modalDownloadBtn");
    const watchBtn = $("modalWatchBtn");
    const favBtn = $("modalFavoriteBtn");
    const dropBtn = $("modalDropBtn");

    if (poster) {
      poster.src = movie.poster || "";
      poster.alt = movie.title || "";
      poster.onerror = () => {
        poster.src = "https://placehold.co/500x750/0d1422/00e5ff?text=" + encodeURIComponent(movie.title || "MCU");
      };
    }
    if (title) title.textContent = movie.title || movie.id;

    if (meta) {
      meta.innerHTML = "";
      const items = [
        "📅 " + (movie.releaseDate || movie.year || "TBA"),
        "⭐ " + (movie.rating && movie.rating > 0 ? Number(movie.rating).toFixed(1) : "TBA"),
        "⚡ " + (movie.phase || "MCU"),
        movie.runtime ? "⏱️ " + movie.runtime + " min" : null
      ].filter(Boolean);
      items.forEach(text => {
        const span = document.createElement("span");
        span.textContent = text;
        meta.appendChild(span);
      });
    }

    if (desc) desc.textContent = movie.description || "Movie details are not available yet.";
    if (genres) {
      genres.innerHTML = "";
      if (movie.genres) {
        movie.genres.split(",").forEach(g => {
          const tag = document.createElement("span");
          tag.className = "genre-tag";
          tag.textContent = g.trim();
          genres.appendChild(tag);
        });
      }
    }
    if (cast) cast.textContent = movie.cast ? "Cast: " + movie.cast : "";

    if (trailerBtn) {
      if (movie.trailer) {
        trailerBtn.style.display = "";
        trailerBtn.onclick = () => window.open(movie.trailer, "_blank", "noopener");
      } else {
        trailerBtn.style.display = "none";
      }
    }
    if (downloadBtn) {
      if (movie.downloadUrl) {
        downloadBtn.style.display = "";
        downloadBtn.href = movie.downloadUrl;
      } else {
        downloadBtn.style.display = "none";
      }
    }
    if (watchBtn) {
      const isWatched = !!watched[movie.id];
      watchBtn.textContent = isWatched ? "✓ Watched" : "✓ Mark Watched";
      watchBtn.onclick = () => {
        if (window.toggleWatched) window.toggleWatched(movie.id, !watched[movie.id]);
        watchBtn.textContent = watched[movie.id] ? "✓ Watched" : "✓ Mark Watched";
      };
    }
    if (favBtn) {
      const isFav = !!favorites[movie.id];
      favBtn.textContent = isFav ? "❤️ Favorited" : "♡ Favorite";
      favBtn.classList.toggle("active", isFav);
      favBtn.onclick = () => {
        if (window.toggleFavorite) window.toggleFavorite(movie.id);
        const nowFav = !!(window.__mcuFavorites || {})[movie.id];
        favBtn.textContent = nowFav ? "❤️ Favorited" : "♡ Favorite";
        favBtn.classList.toggle("active", nowFav);
      };
    }
    // Drop Button Logic
    if (dropBtn) {
      const isDropped = !!(window.__mcuDropped || {})[movie.id];
      dropBtn.textContent = isDropped ? "🗑️ Dropped" : "🗑️ Drop Movie";
      dropBtn.style.background = isDropped ? "#18345b" : "#ff3d00";
      dropBtn.onclick = () => {
        if (window.toggleDropped) window.toggleDropped(movie.id);
        const nowDropped = !!(window.__mcuDropped || {})[movie.id];
        dropBtn.textContent = nowDropped ? "🗑️ Dropped" : "🗑️ Drop Movie";
        dropBtn.style.background = nowDropped ? "#18345b" : "#ff3d00";
      };
    }

    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeMovieModal() {
    const modal = $("movieModal");
    if (!modal) return;
    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  window.openMovieModal = openMovieModal;
  window.closeMovieModal = closeMovieModal;

  const movieModal = $("movieModal");
  if (movieModal) {
    const closeBtn = $("movieModalClose");
    if (closeBtn) closeBtn.addEventListener("click", closeMovieModal);
    movieModal.addEventListener("click", e => {
      if (e.target === movieModal) closeMovieModal();
    });
  }

  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && movieModal && movieModal.classList.contains("active")) {
      closeMovieModal();
    }
  });

  /* ═══════════ PUBLIC API ═══════════ */
  window.MCU = window.MCU || {};
  window.MCU.reloadMovies = async () => {
    await loadMoviesFromFirestore();
    renderMovies();
  };
  window.MCU.renderMovies = renderMovies;
  window.MCU.getMovies = () => allMovies;

  /* ═══════════ INIT — Load from Firestore only ═══════════ */
  (async () => {
    await loadMoviesFromFirestore();
    renderMovies();
    document.dispatchEvent(new CustomEvent("movies-loaded"));
  })();

  document.addEventListener("tracker-updated", renderMovies);
  document.addEventListener("movies-changed", () => window.MCU.reloadMovies());

  console.log("✅ Movies module loaded (No hardcoded data)");
}