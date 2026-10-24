/* ═══════════════════════════════════════════════════════════
   MCU TRACKER — THEME + SOUND + DOOMSDAY COUNTDOWN
   ═══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const THEMES = {
    cosmos:     { name: 'Cosmos',      poster: 'https://image.tmdb.org/t/p/w500/r7vmZjiyZw9rpJMQJdXpjgiCOk9.jpg', title: 'Guardians of the Galaxy', sub: 'Cosmos • Phase 2' },
    arcreactor: { name: 'Arc Reactor', poster: 'https://image.tmdb.org/t/p/w500/6WBeq4fCfn7AN0o21W9qNcRF2l9.jpg', title: 'Iron Man',                sub: 'Arc Reactor • Phase 1' },
    inferno:    { name: 'Inferno',     poster: 'https://image.tmdb.org/t/p/w500/6ELJEzQJ3Y45HczvreC3dg0GV5R.jpg', title: 'Thor: Ragnarok',          sub: 'Inferno • Phase 3' },
    vibranium:  { name: 'Vibranium',   poster: 'https://image.tmdb.org/t/p/w500/uxzzxijgPIY7slzFvMotPv8wjKA.jpg', title: 'Black Panther',          sub: 'Vibranium • Phase 3' },
    bifrost:    { name: 'Bifrost',     poster: 'https://image.tmdb.org/t/p/w500/rzRwTcFvttcN1ZpX2xv4j3tSdJu.jpg', title: 'Thor',                    sub: 'Bifrost • Phase 1' },
    doomsday:   { name: 'Doomsday',    poster: 'https://image.tmdb.org/t/p/w500/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg', title: 'Avengers: Doomsday',      sub: 'Doomsday • Phase 6' },
    noir:       { name: 'Noir',        poster: 'https://image.tmdb.org/t/p/w500/9BBTo63ANSmhC4e6r62OJFuK2GL.jpg', title: 'Werewolf by Night',       sub: 'Noir • Phase 4' }
  };

  const DEFAULT_THEME = 'cosmos';
  const THEME_KEY = 'mcuHeroTheme';
  const LIGHT_KEY = 'mcuLightMode';
  const SOUND_KEY = 'mcuSound';

  function applyTheme(key) {
    if (!THEMES[key]) key = DEFAULT_THEME;
    Array.from(document.body.classList).forEach(cls => {
      if (cls.startsWith('theme-')) document.body.classList.remove(cls);
    });
    document.body.classList.add('theme-' + key);

    document.querySelectorAll('[data-hero-theme]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.heroTheme === key);
    });

    const poster = document.getElementById('themePoster');
    const title  = document.getElementById('themePosterTitle');
    const sub    = document.getElementById('themePosterSubtitle');
    if (poster && THEMES[key]) {
      poster.src = THEMES[key].poster;
      poster.onerror = () => { poster.src = THEMES.cosmos.poster; };
    }
    if (title) title.textContent = THEMES[key].title;
    if (sub)   sub.textContent   = THEMES[key].sub;

    try { localStorage.setItem(THEME_KEY, key); } catch (e) {}
  }

  function toggleLightMode() {
    document.body.classList.toggle('light-mode');
    const isLight = document.body.classList.contains('light-mode');
    try { localStorage.setItem(LIGHT_KEY, isLight ? '1' : '0'); } catch (e) {}
    updateThemeBtnText();
    playSound('click');
  }

  function loadLightMode() {
    try {
      if (localStorage.getItem(LIGHT_KEY) === '1') document.body.classList.add('light-mode');
    } catch (e) {}
    updateThemeBtnText();
  }

  function updateThemeBtnText() {
    const btn = document.getElementById('themeBtn');
    if (!btn) return;
    btn.textContent = document.body.classList.contains('light-mode') ? '☀️ Light' : '🌙 Dark';
  }

  let soundEnabled = true;
  let audioCtx = null;

  function initAudio() {
    if (audioCtx) return;
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { soundEnabled = false; }
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

  function init() {
    let saved = DEFAULT_THEME;
    try { saved = localStorage.getItem(THEME_KEY) || DEFAULT_THEME; } catch (e) {}
    applyTheme(saved);

    loadLightMode();
    loadSound();

    document.querySelectorAll('[data-hero-theme]').forEach(btn => {
      btn.addEventListener('click', () => {
        applyTheme(btn.dataset.heroTheme);
        playSound('click');
      });
    });

    const themeBtn = document.getElementById('themeBtn');
    if (themeBtn) themeBtn.addEventListener('click', toggleLightMode);

    const soundBtn = document.getElementById('soundBtn');
    if (soundBtn) soundBtn.addEventListener('click', toggleSound);

    startDoomsday();

    window.__mcuApplyTheme = applyTheme;
    window.__mcuPlaySound = playSound;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();