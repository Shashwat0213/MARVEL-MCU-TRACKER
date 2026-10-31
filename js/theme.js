/* ═══════════════════════════════════════════════════════════
   MCU TRACKER — THEME + SOUND + DOOMSDAY COUNTDOWN
   ═══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ═══════════ THEME CONFIG ═══════════ */
  const THEMES = {
    stark:      { name: 'Stark Tech',   poster: 'https://image.tmdb.org/t/p/w500/78lPtwv72eTNqFW9COBYI0dWDJa.jpg', title: 'Iron Man',          sub: 'Stark Tech • Phase 1' },
    asgard:     { name: 'Asgard',       poster: 'https://image.tmdb.org/t/p/w500/rzRwTcFvttcN1ZpX2xv4j3tSdJu.jpg', title: 'Thor',              sub: 'Asgard • Phase 1' },
    hulk:       { name: 'Hulk Smash',   poster: 'https://image.tmdb.org/t/p/w500/gKzYx79y0AQTL4UAk1cBQJ3nvrm.jpg', title: 'The Incredible Hulk', sub: 'Hulk Smash • Phase 1' },
    wakanda:    { name: 'Wakanda',      poster: 'https://image.tmdb.org/t/p/w500/uxzzxijgPIY7slzFvMotPv8wjKA.jpg', title: 'Black Panther',     sub: 'Wakanda Forever • Phase 3' },
    sanctum:    { name: 'Sanctum',      poster: 'https://image.tmdb.org/t/p/w500/uGBVj3bEbCoZbDjjl9wTxcygko1.jpg', title: 'Doctor Strange',    sub: 'Sanctum • Phase 3' },
    doomsday:   { name: 'Doomsday',     poster: 'https://image.tmdb.org/t/p/w500/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg', title: 'Avengers: Doomsday', sub: 'Doomsday • Phase 6' },
    spiderverse:{ name: 'Spider-Verse', poster: 'https://image.tmdb.org/t/p/w500/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg', title: 'Spider-Man',        sub: 'Spider-Verse • Phase 4' }
  };

  const DEFAULT_THEME = 'stark';
  const THEME_KEY = 'mcuHeroTheme';
  const LIGHT_KEY = 'mcuLightMode';
  const SOUND_KEY = 'mcuSound';

  /* ═══════════ APPLY THEME ═══════════ */
  function applyTheme(key) {
    if (!THEMES[key]) key = DEFAULT_THEME;

    // Remove old theme classes
    Array.from(document.body.classList).forEach(cls => {
      if (cls.startsWith('theme-')) document.body.classList.remove(cls);
    });

    // Add new theme class
    document.body.classList.add('theme-' + key);

    // Update active button
    document.querySelectorAll('[data-hero-theme]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.heroTheme === key);
    });

    // Update Poster Strip
    const poster = document.getElementById('themePoster');
    const title  = document.getElementById('themePosterTitle');
    const sub    = document.getElementById('themePosterSubtitle');
    if (poster && THEMES[key]) {
      poster.src = THEMES[key].poster;
      poster.onerror = () => { poster.src = THEMES.stark.poster; };
    }
    if (title) title.textContent = THEMES[key].title;
    if (sub)   sub.textContent   = THEMES[key].sub;

    // Save
    try { localStorage.setItem(THEME_KEY, key); } catch (e) {}
  }

  /* ═══════════ LIGHT MODE ═══════════ */
  function toggleLightMode() {
    document.body.classList.toggle('light-mode');
    const isLight = document.body.classList.contains('light-mode');
    try { localStorage.setItem(LIGHT_KEY, isLight ? '1' : '0'); } catch (e) {}
    updateThemeBtnText();
    playSound('click');
  }

  function loadLightMode() {
    try {
      if (localStorage.getItem(LIGHT_KEY) === '1') {
        document.body.classList.add('light-mode');
      }
    } catch (e) {}
    updateThemeBtnText();
  }

  function updateThemeBtnText() {
    const btn = document.getElementById('themeBtn');
    if (!btn) return;
    const isLight = document.body.classList.contains('light-mode');
    btn.textContent = isLight ? '☀️ Light' : '🌙 Dark';
  }

  /* ═══════════ SOUND ═══════════ */
  let soundEnabled = true;
  let audioCtx = null;

  function initAudio() {
    if (audioCtx) return;
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) { soundEnabled = false; }
  }

  function playSound(type) {
    if (!soundEnabled) return;
    initAudio();
    if (!audioCtx) return;

    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      let freq = 440, dur = 0.08, vol = 0.05;
      if (type === 'click') { freq = 660; dur = 0.05; vol = 0.03; }
      else if (type === 'success') { freq = 880; dur = 0.15; vol = 0.06; }
      else if (type === 'error') { freq = 220; dur = 0.2; vol = 0.06; }

      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(vol, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);

      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + dur);
    } catch (e) {}
  }

  function toggleSound() {
    soundEnabled = !soundEnabled;
    try { localStorage.setItem(SOUND_KEY, soundEnabled ? '1' : '0'); } catch (e) {}
    updateSoundBtnText();
    if (soundEnabled) playSound('success');
  }

  function loadSound() {
    try {
      const saved = localStorage.getItem(SOUND_KEY);
      if (saved !== null) soundEnabled = saved === '1';
    } catch (e) {}
    updateSoundBtnText();
  }

  function updateSoundBtnText() {
    const btn = document.getElementById('soundBtn');
    if (btn) btn.textContent = soundEnabled ? '🔊 Sound' : '🔇 Muted';
  }

  /* ═══════════ DOOMSDAY COUNTDOWN ═══════════ */
  function startDoomsday() {
    const target = new Date('2026-12-18T00:00:00+05:30').getTime();
    const daysEl = document.getElementById('doomsdayDays');
    const hoursEl = document.getElementById('doomsdayHours');
    const minsEl = document.getElementById('doomsdayMinutes');
    const secsEl = document.getElementById('doomsdaySeconds');

    if (!daysEl || !hoursEl || !minsEl || !secsEl) return;

    function tick() {
      let diff = target - Date.now();
      if (diff < 0) diff = 0;

      daysEl.textContent  = String(Math.floor(diff / 86400000)).padStart(3, '0');
      hoursEl.textContent = String(Math.floor((diff % 86400000) / 3600000)).padStart(2, '0');
      minsEl.textContent  = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
      secsEl.textContent  = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
    }

    tick();
    setInterval(tick, 1000);
  }

  /* ═══════════ INIT ═══════════ */
  function init() {
    // Load saved theme
    let saved = DEFAULT_THEME;
    try { saved = localStorage.getItem(THEME_KEY) || DEFAULT_THEME; } catch (e) {}
    applyTheme(saved);

    loadLightMode();
    loadSound();

    // Theme buttons
    document.querySelectorAll('[data-hero-theme]').forEach(btn => {
      btn.addEventListener('click', () => {
        applyTheme(btn.dataset.heroTheme);
        playSound('click');
      });
    });

    // Dark/Light toggle
    const themeBtn = document.getElementById('themeBtn');
    if (themeBtn) themeBtn.addEventListener('click', toggleLightMode);

    // Sound toggle
    const soundBtn = document.getElementById('soundBtn');
    if (soundBtn) soundBtn.addEventListener('click', toggleSound);

    // Doomsday timer
    startDoomsday();

    // Expose for other scripts
    window.__mcuApplyTheme = applyTheme;
    window.__mcuPlaySound = playSound;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();