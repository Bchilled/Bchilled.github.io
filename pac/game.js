'use strict';
/* =========================================================================
   PAC — Arena Muncher — v3.0.0
   (v1 core + v2 maze/Time Shift/radar + v3: the 7-stat wheel & spin offers,
   thresholds, resources, run timer & difficulties, the Level-6 APE boss,
   fog/radar upgrade, named areas, team-up tag-in. Numbers: BALANCE.md.
   Structure guide: CODE-GUIDE.md.)
   ========================================================================= */
const PAC_VERSION = '3.0.0';

// ---------------- World / tuning constants ----------------
const WORLD_W = 3400;            // arena width  (world wraps on both axes)
const WORLD_H = 2600;            // arena height
const TAU = Math.PI * 2;

const DOT_TARGET   = 430;        // dots kept alive on the field — v2: the field is a feast
const DOT_CAP      = 640;
const GHOST_CAP    = 220;   // swarm ceiling — ghost pressure is the lose condition
const TRAIL_CAP    = 240;
const PARTICLE_CAP = 350;

const PELLET_INTERVAL = 20;      // seconds between power-pellet spawns
const FRUIT_INTERVAL  = 38;      // seconds between fruit spawns
const PATTERN_INTERVAL = 5;      // seconds between moving pellet-formation spawns

// ---- Time Shift (v2): freeze the swarm, slip through an edge, land opposite ----
const SHIFT_CD = 6;              // seconds between shifts
const SHIFT_FREEZE = 1.1;        // seconds the world holds its breath

// ---------------- Canvas ----------------
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let VW = 0, VH = 0, DPR = 1;
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  VW = window.innerWidth; VH = window.innerHeight;
  canvas.width = Math.floor(VW * DPR);
  canvas.height = Math.floor(VH * DPR);
  canvas.style.width = VW + 'px';
  canvas.style.height = VH + 'px';
}
window.addEventListener('resize', resize);
resize();

// ---------------- Small helpers ----------------
function rand(a, b) { return a + Math.random() * (b - a); }
function randi(a, b) { return Math.floor(rand(a, b + 1)); }
function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
// shortest signed delta on a wrapping axis
function wrapDelta(d, size) {
  d = d % size;
  if (d > size / 2) d -= size;
  else if (d < -size / 2) d += size;
  return d;
}
function wrapPos(v, size) { return ((v % size) + size) % size; }
// toroidal distance between two points
function tDist(ax, ay, bx, by) {
  const dx = wrapDelta(bx - ax, WORLD_W);
  const dy = wrapDelta(by - ay, WORLD_H);
  return Math.hypot(dx, dy);
}
function fmtTime(s) {
  s = Math.floor(s);
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

// ---------------- Maze walls (v2) ----------------
// Rect wall segments {x, y, w, h} in world coords (center-x, center-y, size).
// The layout is built from mirrored templates so the maze is exactly symmetric
// under x -> WORLD_W - x and y -> WORLD_H - y. That symmetry is load-bearing:
// the world wraps, so a wall that visually crosses an edge re-enters on the
// other side — mirrored placement guarantees the piece waiting there is
// identical, and the seam reads as a corridor, not a glitch.
// Corridor gaps between neighbouring segments are >= ~190px, wall thickness
// 22px, and every cluster keeps a >= ~150px moat from the next feature, so
// there is always more than one way around: this maze has escape routes,
// not dead-end traps.
const WALL_T = 22;               // wall thickness (px)
const WALL_LIST = [];
function addWall(cx, cy, w, h) {
  WALL_LIST.push({ x: cx, y: cy, w, h });
  const mx = WORLD_W - cx, my = WORLD_H - cy;
  if (mx !== cx) WALL_LIST.push({ x: mx, y: cy, w, h });
  if (my !== cy) WALL_LIST.push({ x: cx, y: my, w, h });
  if (mx !== cx && my !== cy) WALL_LIST.push({ x: mx, y: my, w, h });
}
// (a) corner L-brackets — they channel the wrap lanes and guard the four
//     Time Shift landing pads (the pads sit inside the L, wall-free)
addWall(185, 30, 250, WALL_T); addWall(30, 185, WALL_T, 250);
addWall(1135, 30, 250, WALL_T); addWall(30, 955, WALL_T, 250);
// (b) Time Shift landing channels: broken rails that leave the pads open
addWall(480, 30, 150, WALL_T); addWall(30, 480, WALL_T, 150);
addWall(965, 30, 190, WALL_T); addWall(30, 785, WALL_T, 190);
// (c) inner corner brackets — partial boxes with two mouths each
addWall(620, 470, 300, WALL_T); addWall(470, 590, WALL_T, 220); addWall(620, 710, 150, WALL_T);
// (d) quadrant bars — long runs with ~200px gaps between them
addWall(1030, 480, WALL_T, 300); addWall(1030, 870, WALL_T, 220);
addWall(1340, 470, 260, WALL_T); addWall(1340, 700, 260, WALL_T);
// (e) centre cross — broken on all four arms, ~190px from every quadrant feature
addWall(1700, 1090, 420, WALL_T); addWall(1700, 1510, 420, WALL_T);
addWall(1410, 1300, WALL_T, 230); addWall(1990, 1300, WALL_T, 230);
// (f) mid-edge baffles (on the mirror axes, so they pair with themselves)
addWall(1700, 90, 420, WALL_T); addWall(1700, 2510, 420, WALL_T);
addWall(90, 1300, WALL_T, 420); addWall(3310, 1300, WALL_T, 420);
// (g) centre diamonds — small blocks to break sightlines around the cross
addWall(1585, 1185, 92, 92); addWall(1815, 1185, 92, 92);
const WALLS = WALL_LIST;
// grid lookup: 9 lookups answer any position without scanning the full list
const WALL_CELL = 200;
const WALL_GRID = new Map();
WALLS.forEach((w, i) => {
  const x0 = Math.floor((w.x - w.w / 2) / WALL_CELL), x1 = Math.floor((w.x + w.w / 2) / WALL_CELL);
  const y0 = Math.floor((w.y - w.h / 2) / WALL_CELL), y1 = Math.floor((w.y + w.h / 2) / WALL_CELL);
  for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) {
    const k = cx + ',' + cy;
    let a = WALL_GRID.get(k); if (!a) { a = []; WALL_GRID.set(k, a); }
    a.push(i);
  }
});
function wallSegsNear(x, y) {
  // the point's cell PLUS its 8 neighbours, indices wrapped: a wall whose
  // rect ends just across a cell boundary (including the world seam itself)
  // is still within collision range of the point, and a single-cell lookup
  // is blind to it — that blind spot let pattern dots settle inside walls
  // near the seam. Positions may arrive unwrapped; normalise first.
  const COLS = WORLD_W / WALL_CELL, ROWS = WORLD_H / WALL_CELL;
  const cx = Math.floor(wrapPos(x, WORLD_W) / WALL_CELL);
  const cy = Math.floor(wrapPos(y, WORLD_H) / WALL_CELL);
  let out = null;
  for (let ox = -1; ox <= 1; ox++) {
    for (let oy = -1; oy <= 1; oy++) {
      const a = WALL_GRID.get(((cx + ox + COLS) % COLS) + ',' + ((cy + oy + ROWS) % ROWS));
      if (!a) continue;
      if (!out) out = a.slice();
      else for (const i of a) if (!out.includes(i)) out.push(i);
    }
  }
  return out;
}
// circle vs the rects near (x,y); the world wraps, so a rect is tested in
// whichever wrapped position is closest to the circle
function circleHitsWall(x, y, r) {
  const idxs = wallSegsNear(x, y);
  if (!idxs) return false;
  for (const i of idxs) {
    const w = WALLS[i];
    const dx = wrapDelta(w.x - x, WORLD_W), dy = wrapDelta(w.y - y, WORLD_H);
    if (Math.abs(dx) > w.w / 2 + r || Math.abs(dy) > w.h / 2 + r) continue;
    const qx = clamp(dx, -w.w / 2, w.w / 2), qy = clamp(dy, -w.h / 2, w.h / 2);
    const ex = dx - qx, ey = dy - qy;
    if (ex * ex + ey * ey < r * r) return true;
  }
  return false;
}
// push a circle out of any wall it overlaps (axis of least penetration wins,
// so movers SLIDE along walls instead of sticking); returns corrected x/y
function pushOutWalls(x, y, r) {
  const idxs = wallSegsNear(x, y);
  if (!idxs) return { x, y };
  for (const i of idxs) {
    let dx = wrapDelta(WALLS[i].x - x, WORLD_W), dy = wrapDelta(WALLS[i].y - y, WORLD_H);
    const w = WALLS[i], hw = w.w / 2 + r, hh = w.h / 2 + r;
    if (Math.abs(dx) >= hw || Math.abs(dy) >= hh) continue;
    const qx = clamp(dx, -w.w / 2, w.w / 2), qy = clamp(dy, -w.h / 2, w.h / 2);
    const ex = dx - qx, ey = dy - qy;
    if (ex * ex + ey * ey >= r * r) continue;
    const penX = hw - Math.abs(dx), penY = hh - Math.abs(dy);
    if (penX < penY) x = wrapPos(x + (dx > 0 ? -penX : penX), WORLD_W);
    else y = wrapPos(y + (dy > 0 ? -penY : penY), WORLD_H);
  }
  return { x, y };
}
function isWallAt(x, y) { return circleHitsWall(x, y, 1); }

// ---------------- Audio (all synthesized) ----------------
const Snd = {
  ctx: null, master: null, muted: false,
  sirenOsc: null, sirenGain: null, sirenLfo: null,
  lastWaka: 0, wakaHigh: false,

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
    } catch (e) { this.ctx = null; }
  },
  tone(freq, dur, type, vol, slideTo, delay) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + (delay || 0);
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g); g.connect(this.master);
    o.start(t0); o.stop(t0 + dur + 0.02);
  },
  waka(combo) {
    if (!this.ctx || this.muted) return;
    const now = performance.now();
    if (now - this.lastWaka < 55) return;         // throttle
    this.lastWaka = now;
    this.wakaHigh = !this.wakaHigh;
    const lift = 1 + Math.min(combo, 160) * 0.004;   // pitch ladder with combo
    const f = (this.wakaHigh ? 540 : 380) * lift;
    this.tone(f, 0.055, 'square', 0.10, f * (this.wakaHigh ? 0.7 : 1.35));
  },
  eatGhost(chain) {
    const base = 240 + chain * 90;
    this.tone(base, 0.16, 'sawtooth', 0.16, base * 2.6);
    this.tone(base * 1.5, 0.12, 'square', 0.08, base * 3, 0.03);
  },
  copySting() {
    this.tone(660, 0.09, 'triangle', 0.18);
    this.tone(880, 0.09, 'triangle', 0.18, null, 0.07);
    this.tone(1320, 0.14, 'triangle', 0.18, null, 0.14);
  },
  levelUp() {
    const seq = [523, 659, 784, 1047];
    for (let i = 0; i < seq.length; i++) this.tone(seq[i], 0.11, 'square', 0.11, null, i * 0.07);
  },
  hurt() { this.tone(160, 0.22, 'sawtooth', 0.2, 55); },
  dash() { this.tone(300, 0.13, 'sawtooth', 0.10, 900); },
  fruit() { this.tone(990, 0.08, 'sine', 0.16); this.tone(1480, 0.12, 'sine', 0.16, null, 0.06); },
  gameOver() {
    const seq = [392, 370, 349, 311];
    for (let i = 0; i < seq.length; i++) this.tone(seq[i], 0.24, 'triangle', 0.16, null, i * 0.17);
  },
  sirenStart() {
    if (!this.ctx || this.sirenOsc) return;
    const c = this.ctx;
    this.sirenOsc = c.createOscillator();
    this.sirenGain = c.createGain();
    this.sirenLfo = c.createOscillator();
    const lfoGain = c.createGain();
    this.sirenOsc.type = 'sawtooth';
    this.sirenOsc.frequency.value = 620;
    this.sirenLfo.frequency.value = 2.2;
    lfoGain.gain.value = 130;
    this.sirenLfo.connect(lfoGain);
    lfoGain.connect(this.sirenOsc.frequency);
    this.sirenGain.gain.value = this.muted ? 0 : 0.035;
    this.sirenOsc.connect(this.sirenGain);
    this.sirenGain.connect(this.master);
    this.sirenOsc.start(); this.sirenLfo.start();
  },
  sirenStop() {
    if (!this.sirenOsc) return;
    try { this.sirenOsc.stop(); this.sirenLfo.stop(); } catch (e) {}
    this.sirenOsc = this.sirenGain = this.sirenLfo = null;
  },
  setMuted(m) {
    this.muted = m;
    if (this.sirenGain) this.sirenGain.gain.value = m ? 0 : 0.035;
  }
};

// ---------------- Input ----------------
const keys = Object.create(null);
let touchMove = null;      // {dx, dy} unit-ish vector from touch drag
let touchDashQueued = false;
window.addEventListener('keydown', (e) => {
  if (G.state === 'intro') { endIntro(); return; }   // any key skips the intro
  if (Teach.active) { Teach.dismiss(); e.preventDefault(); return; }   // any key dismisses a first-sight lesson
  keys[e.key.toLowerCase()] = true;
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase())) e.preventDefault();
  if (e.key === ' ') G.wantDash = true;
  if (e.key.toLowerCase() === 'e' || e.key === 'Shift') G.wantShift = true;
  if (e.key === '1' || e.key === '2' || e.key === '3') setActivePower(Number(e.key) - 1);
  if (e.key.toLowerCase() === 'f') G.wantBurst = true;
  if (e.key.toLowerCase() === 't') tagIn();
  if (e.key.toLowerCase() === 'm') toggleMute();
  if (e.key.toLowerCase() === 'p') togglePause();
});
window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

// ---- floating analog drag-stick (touch, v2.1) ----
// One-thumb play: the stick base lands wherever the thumb lands, the knob
// tracks it, and speed is ANALOG — a small push walks, a push to the rim
// sprints. If the thumb drifts too far, the base quietly re-anchors under it
// so control never runs out of screen. The math lives in computeStick so it
// is testable without a touchscreen.
const STICK_R = 64, STICK_DEAD = 8, STICK_FULL = 60;
let stick = null;   // {id, baseX, baseY, knobX, knobY}
function computeStick(baseX, baseY, x, y) {
  const dx = x - baseX, dy = y - baseY;
  const len = Math.hypot(dx, dy);
  if (len <= STICK_DEAD) return { dx: 0, dy: 0, mag: 0, kx: baseX, ky: baseY, len, ux: 0, uy: 0 };
  const ux = dx / len, uy = dy / len;
  const mag = clamp((len - STICK_DEAD) / (STICK_FULL - STICK_DEAD), 0, 1);
  const kr = Math.min(len, STICK_R);
  return { dx: ux * mag, dy: uy * mag, mag, kx: baseX + ux * kr, ky: baseY + uy * kr, len, ux, uy };
}
canvas.addEventListener('touchstart', (e) => {
  if (Teach.active) { Teach.dismiss(); e.preventDefault(); return; }   // a tap dismisses a lesson; it does not start the stick
  document.body.classList.add('touch');
  for (const t of e.changedTouches) {
    if (!stick) stick = { id: t.identifier, baseX: t.clientX, baseY: t.clientY, knobX: t.clientX, knobY: t.clientY };
  }
  e.preventDefault();
}, { passive: false });
canvas.addEventListener('touchmove', (e) => {
  for (const t of e.changedTouches) {
    if (stick && t.identifier === stick.id) {
      let cs = computeStick(stick.baseX, stick.baseY, t.clientX, t.clientY);
      if (cs.len > STICK_R + 36) {
        // thumb has wandered off the stick: slide the base under it
        stick.baseX = t.clientX - cs.ux * STICK_R;
        stick.baseY = t.clientY - cs.uy * STICK_R;
        cs = computeStick(stick.baseX, stick.baseY, t.clientX, t.clientY);
      }
      stick.knobX = cs.kx; stick.knobY = cs.ky;
      touchMove = cs.mag > 0 ? { dx: cs.dx, dy: cs.dy } : null;
    }
  }
  e.preventDefault();
}, { passive: false });
function endTouch(e) {
  for (const t of e.changedTouches) {
    if (stick && t.identifier === stick.id) { stick = null; touchMove = null; }
  }
}
canvas.addEventListener('touchend', endTouch);
canvas.addEventListener('touchcancel', endTouch);
// no accidental page gestures: no long-press callout menu, no iOS pinch page-zoom
window.addEventListener('contextmenu', (e) => { e.preventDefault(); });
document.addEventListener('gesturestart', (e) => { e.preventDefault(); });
document.getElementById('dashBtn').addEventListener('touchstart', (e) => {
  e.preventDefault(); e.stopPropagation(); touchDashQueued = true;
}, { passive: false });
document.getElementById('dashBtn').addEventListener('click', () => { G.wantDash = true; });
document.getElementById('shiftBtn').addEventListener('touchstart', (e) => {
  e.preventDefault(); e.stopPropagation(); G.wantShift = true;
}, { passive: false });
document.getElementById('shiftBtn').addEventListener('click', () => { G.wantShift = true; });

// ---------------- Copy powers (the Kirby layer) ----------------
// Eating a ghost copies ITS power. Ghost type -> power it carries:
const GHOST_POWER = { chaser: 'fire', ambusher: 'dash', flanker: 'magnet', wildcard: null };
const POWER_DEFS = {
  fire:   { name: 'Fire Trail', icon: '🔥',
            desc: 'While this is your ACTIVE power (keys 1–3), moving leaves a burning trail for about 2 seconds. A ghost that stays on it for half a second burns up: +150 points and +2 XP, without touching you.' },
  dash:   { name: 'Chomp Dash', icon: '💨',
            desc: 'Press SPACE: burst forward at 3× speed for a split second. You cannot be hurt mid-dash, and any ghost you hit is EATEN (+300 points, +3 XP) — and you copy its power.' },
  magnet: { name: 'Magnet Maw', icon: '🧲',
            desc: 'While this is your ACTIVE power (keys 1–3), dots and fruit stream toward your mouth from more than twice the normal magnet range.' }
};
function randomPowerId() {
  const ids = Object.keys(POWER_DEFS);
  return ids[randi(0, ids.length - 1)];
}

// ---------------- Persistent save (localStorage, versioned) ----------------
const SAVE_KEY = 'pac-save-v1';
function defaultSave() {
  return {
    v: 1,
    best: { score: 0, time: 0, level: 1 },         // best single run
    totals: { runs: 0, ghostsEaten: 0, dots: 0 },  // lifetime, across all runs
    unlocks: ['pac'],          // roster — the design bible's unlock system lands here
    curses: [],                // Bomberguy curse ledger (structure ready, nothing writes yet)
    seen: [],                  // first-sight teaching registry — ids already taught, never repeated
    settings: { muted: false },
    // ---- v3 fields (same save key; saneSave defaults keep old saves valid) ----
    difficulty: 'medium',      // easy | medium | hard (BALANCE §2 canon lives)
    endlessUnlocked: {},       // {levelKey: true} — endless unlocks per level (BALANCE §7.2)
    cumulativeLevels: 0,       // account progress: total level-ups ever (team-up unlocks at 10)
    teamUnlocked: false,
    teamPlayLevels: 0,         // levels played with team-up available (team growth step S)
    teamSize: 2,               // current unlocked team size (max 3, BALANCE §12)
    hardcoreDeath: null,       // {char, at, level, score} — Hard is canon character loss
    coins: {},                 // per-character coin wallets (BALANCE §6.2: coins are character-based)
    lightRadius: 0             // last gear-rolled Light Radius steps (-2..+4, BALANCE appendix)
  };
}
function saneSave(raw) {
  // merge a parsed save over defaults so missing/extra fields can never break boot
  const d = defaultSave();
  if (!raw || typeof raw !== 'object') return d;
  if (raw.best) {
    d.best.score = +raw.best.score || 0;
    d.best.time = +raw.best.time || 0;
    d.best.level = +raw.best.level || 1;
  }
  if (raw.totals) {
    d.totals.runs = +raw.totals.runs || 0;
    d.totals.ghostsEaten = +raw.totals.ghostsEaten || 0;
    d.totals.dots = +raw.totals.dots || 0;
  }
  if (Array.isArray(raw.unlocks) && raw.unlocks.length) {
    d.unlocks = raw.unlocks.filter((u) => typeof u === 'string');
  }
  if (!d.unlocks.includes('pac')) d.unlocks.unshift('pac');
  if (Array.isArray(raw.curses)) d.curses = raw.curses;
  if (Array.isArray(raw.seen)) d.seen = raw.seen.filter((u) => typeof u === 'string');
  if (raw.settings) d.settings.muted = !!raw.settings.muted;
  if (['easy', 'medium', 'hard'].includes(raw.difficulty)) d.difficulty = raw.difficulty;
  if (raw.endlessUnlocked && typeof raw.endlessUnlocked === 'object') d.endlessUnlocked = raw.endlessUnlocked;
  d.cumulativeLevels = +raw.cumulativeLevels || 0;
  d.teamUnlocked = !!raw.teamUnlocked;
  d.teamPlayLevels = +raw.teamPlayLevels || 0;
  d.teamSize = clamp(+raw.teamSize || 2, 2, 3);
  if (raw.hardcoreDeath && typeof raw.hardcoreDeath === 'object') d.hardcoreDeath = raw.hardcoreDeath;
  if (raw.coins && typeof raw.coins === 'object') d.coins = raw.coins;
  d.lightRadius = clamp(Math.round(+raw.lightRadius || 0), -2, 4);
  return d;
}
const Save = {
  data: defaultSave(),
  lastFlash: 0,
  load() {
    let parsed = null;
    try { parsed = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { parsed = null; }
    this.data = saneSave(parsed);          // absent or corrupted -> fresh save, never a crash
    if (!parsed) {
      // one-time migration of the v0 best-score key
      try {
        const legacy = Number(localStorage.getItem('pacBest') || 0) || 0;
        if (legacy > this.data.best.score) this.data.best.score = legacy;
      } catch (e) {}
    }
    if (this.data.settings.muted) {
      Snd.setMuted(true);
      document.getElementById('muteBtn').textContent = '🔇';
    }
  },
  snapshot() {
    // committed records merged with the in-progress run; gameOver() folds the
    // run into `data` and flips runCounted, so a run is never double-counted
    const d = this.data, live = !G.runCounted;
    return {
      v: 1,
      best: {
        score: Math.max(d.best.score, live ? Math.floor(G.score) : 0),
        time: Math.max(d.best.time, live ? Math.floor(G.time) : 0),
        level: Math.max(d.best.level, live ? player.level : 1)
      },
      totals: {
        runs: d.totals.runs,
        ghostsEaten: d.totals.ghostsEaten + (live ? G.eaten : 0),
        dots: d.totals.dots + (live ? G.dots : 0)
      },
      unlocks: d.unlocks.slice(),
      curses: d.curses.slice(),
      seen: d.seen.slice(),
      settings: { muted: Snd.muted },
      difficulty: d.difficulty,
      endlessUnlocked: Object.assign({}, d.endlessUnlocked),
      cumulativeLevels: d.cumulativeLevels,
      teamUnlocked: d.teamUnlocked,
      teamPlayLevels: d.teamPlayLevels,
      teamSize: d.teamSize,
      hardcoreDeath: d.hardcoreDeath,
      coins: Object.assign({}, d.coins),
      lightRadius: d.lightRadius
    };
  },
  write(silent) {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.snapshot())); } catch (e) {}
    if (!silent) this.flash();
  },
  unlock(id) {
    // unlock-event hook for the bible's roster system: new id -> persist immediately
    if (!id || this.data.unlocks.includes(id)) return false;
    this.data.unlocks.push(id);
    this.write();
    return true;
  },
  flash() {
    const now = performance.now();
    if (now - this.lastFlash < 8000) return;   // subtle: at most one flash per 8s
    this.lastFlash = now;
    const tag = document.getElementById('savedTag');
    if (!tag) return;
    tag.style.opacity = '1';
    setTimeout(() => { tag.style.opacity = '0'; }, 1400);
  }
};
Save.load();

// ---------------- First-sight teaching ----------------
// Owner mechanic: the FIRST time a new thing appears — an eatable, an enemy,
// a hazard, a bad edible, a mechanic, a card — play briefly pauses, the thing
// is highlighted, and a plain-language tooltip explains it. Each lesson fires
// ONCE EVER: its id is written into the save's `seen` registry the moment it
// is shown, so it never repeats in later runs. This is a framework, not a
// one-off: teaching a new thing later = one TEACH entry + one Teach.fire()
// call at the place it appears (or a visibility rule in Teach.scan()).

// TEACH_LIVE is switched off under the automated test hooks at the bottom of
// this file — lessons must never freeze a scripted run.
let TEACH_LIVE = true;

const TEACH = {
  dot:       { title: 'PELLETS', text: 'Eat them. Each pellet is +1 XP and +10 score, and eating without stopping builds your COMBO — more speed, more score. Pellets are how you level up.' },
  wall:      { title: 'WALLS', text: 'The maze is real. You slide along walls; ghosts must go around them. Corners are escape routes — and TIME SHIFT (E) is your emergency exit.' },
  ghost:     { title: 'GHOST', text: 'It wants you. A touch costs 13 HP while it is not blue. Four kinds hunt differently — chaser, ambusher, flanker, wildcard. Do not get cornered.' },
  elite:     { title: 'CROWNED ELITE', text: 'Bigger, faster, harder to corner. Eat one during EAT MODE and it drops a Melon (+60 HP). Worth it when you are strong; a bad idea when you are not.' },
  pellet:    { title: 'POWER PELLET', text: 'Eat this to flip the hunt: EAT MODE. Ghosts turn blue and edible for a few seconds — follow the arrows at the screen edge and hunt fast.' },
  eatmode:   { title: 'EAT MODE!', text: 'Ghosts are food now: 200, 400, 800, 1600 points chained. Eating one also COPIES its power. The arrows point at your nearest prey — the clock is the blue timer.' },
  pattern:   { title: 'MOVING PELLETS', text: 'Some pellets travel in formations — rivers, rings, spirals. Chase the current for a combo feast. They dissolve on schedule, so do not wait around.' },
  fruit:     { title: 'FRUIT — HEALS', text: 'Fruit restores exactly the HP printed on it (+25 to +60) and does nothing else. Route to one when you are hurt — if you dare cross the swarm to reach it.' },
  copy:      { title: 'POWER COPIED', text: 'You hold up to 3 copied powers. Press 1 / 2 / 3 (or tap a power slot) to choose the active one. Eating a ghost whose power you already hold levels that power up instead.' },
  levelup:   { title: 'LEVEL UP', text: 'Pick 1 of 3 cards. Early levels offer SKILLS only; deeper upgrades arrive from level 4. Every card says in plain words what it does — read it, then commit. Picking can never hurt you: you resume under a grace shield.' },
  grace:     { title: 'GRACE', text: 'After every pick you get 1.5 seconds like this: ghosts frozen solid, you untouchable. Use it to aim your first move — choosing a card never costs health.' },
  timeshift: { title: 'DANGER CLOSE — TIME SHIFT', text: 'Press E (or the SHIFT button) for TIME SHIFT: the swarm freezes and you slip out through the nearest edge, reappearing on the opposite side. 6-second cooldown. It is your escape hatch — spend it to live.' },
  // ---- v3 first-sight lessons (one per new system; fire once ever) ----
  spin:      { title: 'THE WHEEL SPINS', text: 'Every level-up, the 7-stat wheel spins. Level 1: it lands on one stat and your offers come from that stat. Level 2: it lands one step to the side. Level 3: it jumps to the OPPOSITE side. After that, the pattern repeats. The wheel deals the stat; you pick the card.' },
  resource:  { title: 'RAGE', text: 'Pac runs on RAGE — his one resource. Dealing and taking damage builds it. Out of the fight it drains away. At 50 or more, press F for an explosive burst that clears the ghosts around you.' },
  threshold: { title: 'THRESHOLD CROSSED', text: 'Stats pay out at amounts, not one-for-one: reach 5, 10, 15, 20, 30, 40 or 50 in a stat and that stat grants an increase in its own area. Watch the pause screen for your totals.' },
  collectrange: { title: 'COLLECTION RANGE', text: 'Collection range is how far away pellets and pickups get pulled into your mouth. It is one of the small increases the wheel can deal — it belongs to Spirit (collect range lives in Spirit\'s third shade).' },
  difficulty: { title: 'DIFFICULTY', text: 'Easy: 3 lives. Medium: 1 life. Hard: HARDCORE — die once and the character is GONE, marked dead on the menu for good. Pick on the start screen before a run.' },
  endless:   { title: 'ENDLESS UNLOCKED', text: 'You beat this level\'s boss, so its ENDLESS mode is unlocked: no time limit, no boss gate — the swarm just keeps coming. Toggle it on the start screen.' },
  teamup:    { title: 'TEAM UP!', text: 'Ten levels of account progress unlock TEAM UP: a partner joins the run. Press T to TAG IN — you swap places with your partner, and each of you keeps your own health, stats and resource.' },
  stonepick: { title: 'PICK YOUR STONE', text: 'Level 6 prize: an Infinity Stone of YOUR choice — one per stat, plus the Darkhold as the seventh. A stone buffs the skills of its own stat (+15%). Choose the colour your build already loves.' },
  ape:       { title: 'THE APE — LEVEL 6', text: 'You cannot hurt him up on his scaffold. BAIT THE THROW, BREAK THE SCAFFOLD: stand where his barrel will land beside a cracked pylon, be gone when it blows, and let his own barrels drop all 4 pylons. Then he fights you on the ground — where he is finally edible.' },
  radar:     { title: 'RADAR', text: 'The corner radar now runs all the time: blue dots are edible ghosts, pale dots are hunters, pink is fruit, gold is a stone. It only shows ground you have EXPLORED — the fog is real, and Light Radius pushes it back.' },
  areachange: { title: 'NEW AREA', text: 'The maze has named areas. Crossing into a new one shows its name — exploring fills in your radar, and each area wears its own light.' },
  lightradius: { title: 'LIGHT RADIUS', text: 'Light Radius brightens the area around you: gear can roll it from -2 to +4 steps, and every step pushes the fog 40px further out. A bad roll (negative) pulls the dark in closer.' },
  weaponpick: { title: 'THE ARSENAL OPENS', text: 'Level 5: pick a weapon. Weapon rolls are SIGNED — a roll can come up negative, a bad roll, as well as good. The numbers on the card are the numbers you get.' },
  banknote:  { title: 'LEVEL 4 — THE BANK', text: 'Canon ladder note: at level 4 the full game unlocks the Bank (save a power-up for later). In this prototype the bank itself is not built yet — the ladder continues: weapon at 5, stone and the Ape at 6.' }
};

const Teach = {
  active: null,   // {id, def, ax, ay} — ax/ay = world anchor for the highlight ring (null = panel only)
  queue: [],
  isSeen(id) { return Save.data.seen.indexOf(id) >= 0; },
  fire(id, ax, ay) {
    if (!TEACH_LIVE) return false;
    const def = TEACH[id];
    if (!def || this.isSeen(id)) return false;
    if (this.active && this.active.id === id) return false;
    if (this.queue.some((q) => q.id === id)) return false;
    const item = { id, def, ax: (ax === undefined ? null : ax), ay: (ay === undefined ? null : ay) };
    if (this.active) this.queue.push(item); else this.show(item);
    return true;
  },
  show(item) {
    this.active = item;
    // the lesson counts as seen the moment it is SHOWN — persisted at once,
    // so it never repeats even if the tab closes on the tooltip
    if (!this.isSeen(item.id)) { Save.data.seen.push(item.id); Save.write(true); }
    document.getElementById('teachTitle').textContent = item.def.title;
    document.getElementById('teachText').textContent = item.def.text;
    document.getElementById('teachTip').classList.remove('hidden');
  },
  dismiss() {
    if (!this.active) return;
    this.active = null;
    document.getElementById('teachTip').classList.add('hidden');
    if (this.queue.length) this.show(this.queue.shift());
  },
  // visibility-driven lessons: the first time the thing is ON SCREEN.
  // Runs at the end of update() while playing; fires at most one per call.
  scan() {
    if (!TEACH_LIVE || this.active) return;
    const unseen = (id) => !this.isSeen(id) && !this.queue.some((q) => q.id === id);
    const vis = (x, y, m) => { const sx = SX(x), sy = SY(y); return sx > -m && sx < VW + m && sy > -m && sy < VH + m; };
    if (unseen('dot')) { for (const d of dots) { if (vis(d.x, d.y, 10)) { this.fire('dot', d.x, d.y); return; } } }
    if (unseen('pattern')) { for (const d of dots) { if (d.pat && vis(d.x, d.y, 10)) { this.fire('pattern', d.x, d.y); return; } } }
    if (unseen('wall')) { for (const w of WALLS) { if (vis(w.x, w.y, Math.max(w.w, w.h) / 2)) { this.fire('wall', w.x, w.y); return; } } }
    if (unseen('pellet')) { for (const p of pellets) { if (vis(p.x, p.y, 20)) { this.fire('pellet', p.x, p.y); return; } } }
    if (unseen('fruit')) { for (const f of fruits) { if (vis(f.x, f.y, 20)) { this.fire('fruit', f.x, f.y); return; } } }
    if (unseen('ghost') || unseen('elite')) {
      for (const g of ghosts) {
        if (!g.alive || !vis(g.x, g.y, 30)) continue;
        if (g.elite && unseen('elite')) { this.fire('elite', g.x, g.y); return; }
        if (unseen('ghost')) { this.fire('ghost', g.x, g.y); return; }
      }
    }
    // Time Shift has no "appearance" of its own — it is taught at the first
    // moment of need: a hunter close enough to matter while the shift is ready
    if (unseen('timeshift') && player.shiftCd <= 0) {
      for (const g of ghosts) {
        if (g.alive && tDist(g.x, g.y, player.x, player.y) < 150) { this.fire('timeshift', player.x, player.y); return; }
      }
    }
  }
};

// ---------------- Game state ----------------
const G = {
  state: 'menu',           // menu | playing | levelup | paused | gameover
  time: 0, score: 0, best: 0, eaten: 0, dots: 0,
  runCounted: true,        // false while a run is live and not yet folded into the save
  wantDash: false, wantShift: false, wantBurst: false,
  timeLeft: 0, endlessRun: false,
  shake: 0, toastT: 0, hudT: 0
};
G.best = Save.data.best.score;

const player = {
  x: WORLD_W / 2, y: WORLD_H / 2, vx: 0, vy: 0,
  r: 16, angle: 0, chomp: 0,
  hp: 100, maxHp: 100, lives: 3,
  xp: 0, level: 1, xpNext: 10,
  combo: 0, comboTimer: 0,
  invulnUntil: -1,
  // stats (level-up modifiable)
  speedMul: 1, magnetR: 78, chompBonus: 0, comboWindow: 2.3, eatBonus: 0,
  // powers
  powers: [],              // [{id, lvl}]
  activePower: 0,
  // dash
  dashT: 0, dashCd: 0, dashDirX: 1, dashDirY: 0,
  // time shift (v2)
  shiftCd: 0, freezeT: 0, shiftCdMax: SHIFT_CD,
  // post-pick grace (v2.1): seconds of held ghosts + invulnerability after a level-up pick
  graceT: 0,
  // eat mode
  eatT: 0, eatChain: 0,
  trailAcc: 0,
  // ---- v3: stats / resources / build state (numbers: BALANCE.md) ----
  charId: 'pac', charName: 'Pac',
  stats: null,               // {strength..nature} totals — set from the build package in resetGame
  statSteps: null,           // threshold steps already applied per stat (BALANCE §3)
  resourceType: 'rage',      // Pac's ONE resource per STAT-OUT: Rage
  resource: 0, resourceMax: 100, combatT: 0,  // combatT = seconds since last fight action (rage decay)
  damageMul: 1,              // Strength threshold steps + weapon % + stone %
  abilityPowMul: 1,          // Speciality threshold steps
  dodgePct: 0,               // Agility threshold steps: +2pp/step, cap +20 (BALANCE §3)
  stone: null,               // chosen stone key at Level 6 (BALANCE §9B)
  weapon: null,              // chosen weapon at Level 5 {name, pct, signed}
  buffT: 0,                  // timed buff (speed) seconds left
  coinsEarned: 0,            // this run's coin finds (wallet itself lives in the save)
  lightRadius: 0,            // gear-rolled Light Radius steps for this run (-2..+4)
  slowT: 0                   // Ape chest-pound slow seconds left
};

let dots = [];        // {x,y,r,kind}  kind: dot
let pellets = [];     // {x,y,ttl}
let fruits = [];      // {x,y,ttl,kind}
let ghosts = [];      // see spawnGhost
let trail = [];       // {x,y,ttl,max}
let particles = [];   // {x,y,vx,vy,ttl,max,color,size}
let floaters = [];    // {x,y,ttl,text,color}
let pelletTimer = 8, fruitTimer = 20, ghostTimer = 0, dotTimer = 0, surgeTimer = 55, patternTimer = 2;

// XP curve per BALANCE §7.3 (DRAFT): level 2 takes 22 pellets-worth, then
// x1.45 per level, rounded — 22 · 32 · 46 · 67 · 97 · 141 · 204 · …
// Leveling is slower than gathering on purpose (canon tempo law).
function xpForLevel(lv) { return Math.round(22 * Math.pow(1.45, lv - 1)); }
function hasPower(id) { return player.powers.find((p) => p.id === id) || null; }
function activePowerId() {
  const p = player.powers[player.activePower];
  return p ? p.id : null;
}

// ---------------- Spawning ----------------
function spawnDotCluster() {
  // dots stream in trails/clusters, Vampire-Survivors style — seeded away from
  // the player so crossing the map always passes through fresh food, and never
  // inside a wall
  let x = 0, y = 0, ok = false;
  for (let t = 0; t < 10 && !ok; t++) {
    x = rand(0, WORLD_W); y = rand(0, WORLD_H);
    ok = !circleHitsWall(x, y, 16) && tDist(x, y, player.x, player.y) > 200;
  }
  if (!ok) return;
  const n = randi(8, 16);
  const style = randi(0, 2);
  const ang = rand(0, TAU);
  for (let i = 0; i < n && dots.length < DOT_CAP; i++) {
    let px = x, py = y;
    if (style === 0) { px = x + Math.cos(ang) * i * 27; py = y + Math.sin(ang) * i * 27; }
    else if (style === 1) { const a = (i / n) * TAU; px = x + Math.cos(a) * 44; py = y + Math.sin(a) * 44; }
    else { px = x + rand(-55, 55); py = y + rand(-55, 55); }
    px = wrapPos(px, WORLD_W); py = wrapPos(py, WORLD_H);
    if (circleHitsWall(px, py, 8)) continue;
    dots.push({ x: px, y: py, r: 5, pulse: rand(0, TAU) });
  }
}
// moving pellet formations (v2): an arc of dots that TRAVELS the arena together
// for ~26 seconds — a river that drifts, a ring that orbits, a spiral that
// rotates. The flow is computed from each dot's own clock, so formations never
// need steering around walls; a dot whose path clips a wall dissolves instead
// of getting stuck inside it.
const PATTERN_KINDS = ['river', 'ring', 'spiral'];
function spawnDotPattern() {
  let cx = 0, cy = 0, ok = false;
  for (let t = 0; t < 10 && !ok; t++) {
    cx = rand(0, WORLD_W); cy = rand(0, WORLD_H);
    ok = !circleHitsWall(cx, cy, 30) && tDist(cx, cy, player.x, player.y) > 300;
  }
  if (!ok) return;
  const kind = PATTERN_KINDS[randi(0, PATTERN_KINDS.length - 1)];
  const dur = 26, ang = rand(0, TAU);
  if (kind === 'river') {
    const n = 15;
    for (let i = 0; i < n && dots.length < DOT_CAP; i++) {
      dots.push({ x: cx, y: cy, r: 5, pulse: rand(0, TAU),
        pat: { kind, cx, cy, ang, i, n, t: -i * 0.28, dur } });   // staggered ages = a flowing stream
    }
  } else if (kind === 'ring') {
    const n = 16;
    for (let i = 0; i < n && dots.length < DOT_CAP; i++) {
      dots.push({ x: cx, y: cy, r: 5, pulse: rand(0, TAU), pat: { kind, cx, cy, ang, i, n, t: 0, dur } });
    }
  } else {
    const n = 18;
    for (let i = 0; i < n && dots.length < DOT_CAP; i++) {
      dots.push({ x: cx, y: cy, r: 5, pulse: rand(0, TAU), pat: { kind, cx, cy, ang, i, n, t: 0, dur } });
    }
  }
}
function spawnPellet() {
  for (let tries = 0; tries < 12; tries++) {
    const x = rand(0, WORLD_W), y = rand(0, WORLD_H);
    if (tDist(x, y, player.x, player.y) > 260 && !circleHitsWall(x, y, 16)) { pellets.push({ x, y, ttl: 30 }); return; }
  }
}
// v2: fruit is HEALING, full stop — no XP, no score, no stats. The value of a
// fruit is the HP on its label, and it restores exactly that.
const FRUIT_KINDS = [
  { name: 'Cherry', heal: 25, color: '#ff2e4d' },
  { name: 'Strawberry', heal: 35, color: '#ff4d7e' },
  { name: 'Orange', heal: 45, color: '#ff9a3b' },
  { name: 'Melon', heal: 60, color: '#37e08b' }
];
function spawnFruit(x, y, kindIdx) {
  const kind = kindIdx !== undefined ? FRUIT_KINDS[kindIdx]
    : FRUIT_KINDS[randi(0, FRUIT_KINDS.length - 1)];
  if (x === undefined) {
    for (let tries = 0; tries < 12; tries++) {
      const fx = rand(0, WORLD_W), fy = rand(0, WORLD_H);
      if (tDist(fx, fy, player.x, player.y) > 320 && !circleHitsWall(fx, fy, 16)) { x = fx; y = fy; break; }
    }
    if (x === undefined) return;
  }
  fruits.push({ x, y, ttl: 22, kind });
}

const GHOST_TYPES = ['chaser', 'ambusher', 'flanker', 'wildcard'];
const GHOST_STYLE = {
  chaser:   { color: '#ff3b30', speed: 1.0 },
  ambusher: { color: '#ff9de2', speed: 1.05 },
  flanker:  { color: '#00e5ff', speed: 0.98 },
  wildcard: { color: '#ffb847', speed: 0.95 }
};
function ghostBaseSpeed() { return Math.min(292, 158 + G.time * 0.42); }
function ghostTargetCount() {
  // The flood curve: gentle for the first minute, then compounding.
  // ~14 @30s, ~27 @1min, ~62 @2min, ~111 @3min, ~177 @4min, capped 220 @~5min.
  // If the player's clear rate (eat mode / dash / fire) falls behind this curve,
  // the screen masses with ghosts and contact damage ends the run. That IS the game.
  // difficulty scales the swarm clock (BALANCE §2): Easy spawns x1.15 slower
  // (read here as a slower effective clock), Hard x0.9 (faster clock)
  const scale = Save.data.difficulty === 'easy' ? 1 / 1.15 : (Save.data.difficulty === 'hard' ? 1 / 0.9 : 1);
  const t = G.time * scale;
  const t1Mul = TrigState.t1 > 0 ? 1.5 : 1;   // T1 More Enemies window (BALANCE trigger appendix)
  return Math.min(GHOST_CAP, Math.floor((5 + t * 0.28 + Math.pow(t / 60, 2.2) * 5) * t1Mul));
}

function placeGhostAtEdge(g, ang, dist) {
  // (re)enter off-screen, at a wrapped distance from the player — and never
  // inside a wall: if the first landing spot is walled, probe nearby angles
  const a0 = ang !== undefined ? ang : rand(0, TAU);
  const d = dist !== undefined ? dist : rand(680, 860);
  let px = 0, py = 0;
  for (let k = 0; k < 10; k++) {
    const a = a0 + k * 0.63;
    px = wrapPos(player.x + Math.cos(a) * d, WORLD_W);
    py = wrapPos(player.y + Math.sin(a) * d, WORLD_H);
    if (!circleHitsWall(px, py, g.r + 4)) break;
  }
  g.x = px; g.y = py;
  g.vx = 0; g.vy = 0; g.burnT = 0; g.touchCd = 0;
  g.alive = true; g.respawnAt = 0;
}
function spawnGhost(forceType, ringAng) {
  // object pool: reuse a returned slot, else grow the pool up to the cap —
  // no per-spawn allocation churn when the swarm is at full size
  let g = ghosts.find((o) => !o.alive && o.respawnAt <= 0);
  if (!g) {
    if (ghosts.length >= GHOST_CAP) return;
    g = {};
    ghosts.push(g);
  }
  g.type = forceType || GHOST_TYPES[randi(0, 3)];
  // elite rate per BALANCE §4: 4% of spawns (Hard: +2 pts). Adds (Ape chimps) are never elites.
  g.elite = !g.isAdd && G.time > 30 && Math.random() < eliteChance();
  g.r = g.elite ? 25 : 16;
  g.modeT = rand(2, 4); g.wander = false; g.wanderX = 0; g.wanderY = 0;
  if (ringAng !== undefined) placeGhostAtEdge(g, ringAng, rand(700, 790));
  else placeGhostAtEdge(g);
}
function killGhost(g, grantPower, basePoints) {
  g.alive = false;
  g.respawnAt = 3.2;
  G.eaten++;
  if (player.resourceType === 'rage') gainResource(8);   // Rage builds when dealing damage (BALANCE v3 appendix)
  else player.combatT = 0;
  burst(g.x, g.y, GHOST_STYLE[g.type].color, 14);
  if (grantPower) {
    const pid = GHOST_POWER[g.type] || randomPowerId();
    grantCopyPower(pid);
  }
  if (g.elite) { spawnFruit(g.x, g.y, 3); floater(g.x, g.y - 30, 'ELITE DOWN!', '#ffd93b'); }
  return basePoints;
}

// ---------------- Time Shift (v2) ----------------
// The escape weapon: the swarm freezes for SHIFT_FREEZE seconds and Pac exits
// through the nearest edge — or the edge he's already running at — and lands
// on the opposite side, classic tunnel logic. Landing pads are kept wall-free
// by the maze layout (corner L-brackets); the landing is briefly invulnerable
// so a camper on the far side can't tax the escape.
function doTimeShift() {
  const spd = Math.hypot(player.vx, player.vy);
  const driveX = spd > 40 ? Math.abs(player.vx) >= Math.abs(player.vy)
    : Math.min(player.x, WORLD_W - player.x) <= Math.min(player.y, WORLD_H - player.y);
  if (driveX) {
    const exitLeft = spd > 40 ? player.vx < 0 : player.x <= WORLD_W - player.x;
    player.x = exitLeft ? WORLD_W - 26 : 26;
  } else {
    const exitUp = spd > 40 ? player.vy < 0 : player.y <= WORLD_H - player.y;
    player.y = exitUp ? WORLD_H - 26 : 26;
  }
  if (circleHitsWall(player.x, player.y, player.r)) {
    // the landing lane is walled at this height — slide along the edge to
    // the nearest open lane (rails never run more than ~420px unbroken)
    const base = driveX ? player.y : player.x;
    let placed = false;
    for (let off = 12; off <= 560 && !placed; off += 12) {
      for (const s of [-1, 1]) {
        const v = base + s * off;
        const tx = driveX ? player.x : wrapPos(v, WORLD_W);
        const ty = driveX ? wrapPos(v, WORLD_H) : player.y;
        if (!circleHitsWall(tx, ty, player.r)) { player.x = tx; player.y = ty; placed = true; break; }
      }
    }
    const slidL = pushOutWalls(player.x, player.y, player.r);
    player.x = slidL.x; player.y = slidL.y;
  }
  player.freezeT = SHIFT_FREEZE;
  player.shiftCd = player.shiftCdMax;
  player.invulnUntil = Math.max(player.invulnUntil, G.time + SHIFT_FREEZE + 0.5);
  G.shake = Math.max(G.shake, 5);
  burst(player.x, player.y, '#9df2ff', 12);
  floater(player.x, player.y - 32, 'TIME SHIFT!', '#9df2ff');
  Snd.tone(880, 0.22, 'sine', 0.14, 110);
}
function requestShift() {
  if (G.state === 'playing' && player.shiftCd <= 0 && player.freezeT <= 0) doTimeShift();
}

// ---------------- Particles / floaters ----------------
function burst(x, y, color, n) {
  for (let i = 0; i < n && particles.length < PARTICLE_CAP; i++) {
    const a = rand(0, TAU), sp = rand(40, 240);
    particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      ttl: rand(0.25, 0.6), max: 0.6, color, size: rand(2, 5) });
  }
}
function floater(x, y, text, color) {
  floaters.push({ x, y, ttl: 1.15, text, color: color || '#fff' });
  if (floaters.length > 24) floaters.shift();
}
function toast(text) {
  const el = document.getElementById('toast');
  el.textContent = text;
  el.style.opacity = '1';
  G.toastT = 1.4;
}

// ---------------- Kirby layer: gaining powers ----------------
function grantCopyPower(id) {
  const isNew = !hasPower(id);
  const held = hasPower(id);
  if (held) {
    if (held.lvl < 3) { held.lvl++; toast('POWER UP: ' + POWER_DEFS[id].name + ' Lv' + held.lvl + '!'); }
    else { G.score += 300; toast(POWER_DEFS[id].name + ' MAXED! +300'); }
  } else if (player.powers.length < 3) {
    player.powers.push({ id, lvl: 1 });
    player.activePower = player.powers.length - 1;
    toast('COPIED: ' + POWER_DEFS[id].name + '!');
  } else {
    const old = player.powers.shift();       // full: replace the oldest
    player.powers.push({ id, lvl: 1 });
    player.activePower = player.powers.length - 1;
    toast('COPIED: ' + POWER_DEFS[id].name + ' (dropped ' + POWER_DEFS[old.id].name + ')');
  }
  if (isNew) Teach.fire('copy', player.x, player.y);   // first-sight: first power ever copied
  Snd.copySting();
  renderPowerSlots();
}
function setActivePower(i) {
  if (i >= 0 && i < player.powers.length) { player.activePower = i; renderPowerSlots(); }
}

// ---------------- Level-up choices ----------------
// PROGRESSION SHAPING (DESIGN.md, "The progression curve"): levels 1–3 offer
// SKILLS ONLY — new powers and basic, single-number stat skills, every card a
// real choice that narrows the build. From level 4 the pool deepens: power
// upgrades (Lv2/Lv3) and advanced cards (eat-mode duration, combo window,
// full-restores) start weighting in. The full 13-tree ring system doesn't
// exist in code yet, so this two-band pool is the honest approximation:
// band = 'early' (skills only) for levels 1–3, 'deep' afterwards.
// CARD CLARITY LAW (playtest v2): every card says in plain words what it
// does, with the number in the text. A card name is a label, never the rules.
// buildChoices() lives in the v3 section below (spin-dealt offers).
let pendingLevels = 0;
function gainXP(n) {
  player.xp += n;
  while (player.xp >= player.xpNext) {
    player.xp -= player.xpNext;
    player.level++;
    player.xpNext = xpForLevel(player.level);
    pendingLevels++;
    // v3: account progress — cumulative levels unlock TEAM UP at 10 (BALANCE §12)
    Save.data.cumulativeLevels++;
    if (Save.data.cumulativeLevels >= 10 && !Save.data.teamUnlocked) {
      Save.data.teamUnlocked = true;
      toast('🤝 TEAM UP UNLOCKED!');
      Teach.fire('teamup', player.x, player.y);
    }
    if (Save.data.teamUnlocked) {
      Save.data.teamPlayLevels++;
      if (Save.data.teamPlayLevels >= TEAM_STEP_LEVELS && Save.data.teamSize < 3) {
        Save.data.teamSize = 3;
        Save.data.teamPlayLevels = 0;
        toast('🤝 TEAM SIZE 3 UNLOCKED (slot ready)!');
      }
    }
    Save.write(true);
  }
}
let levelChoices = [];
function openLevelUp() {
  G.state = 'levelup';
  Save.write(true);        // progress checkpoint (new best level, live totals)
  Snd.levelUp();
  levelChoices = buildChoices();
  const wrap = document.getElementById('cards');
  wrap.innerHTML = '';
  levelChoices.forEach((choice, i) => {
    const d = document.createElement('div');
    d.className = 'card';
    d.innerHTML = '<div class="tag' + (choice.power ? ' power' : '') + '">' + choice.tag + '</div>' +
      '<div class="ico">' + choice.icon + '</div>' +
      '<div class="name">' + choice.name + '</div>' +
      '<div class="desc">' + choice.desc + '</div>';
    d.addEventListener('click', () => pickCard(i));
    wrap.appendChild(d);
  });
  const sl = document.getElementById('spinLine');
  if (sl) sl.textContent = '🎡 The wheel dealt ' + WHEEL[V3.spin.statIdx].name.toUpperCase() +
    ' — pick ' + (V3.picksMade + 1) + (V3.picksMade < 3 ? ' (curated opening: skills only)' : '') +
    '. Your ' + RESOURCE_DEFS[player.resourceType].name + ': ' + Math.floor(player.resource) + '/' + player.resourceMax + '.';
  if (levelChoices.some((c) => c.name && c.name.indexOf('Collection Range') >= 0)) Teach.fire('collectrange');
  document.getElementById('levelupScreen').classList.remove('hidden');
  Teach.fire('levelup');   // first-sight: the first card screen explains itself
}
function pickCard(i) {
  const choice = levelChoices[i];
  if (!choice || G.state !== 'levelup') return;
  choice.apply();
  V3.picksMade++;
  pendingLevels--;
  document.getElementById('levelupScreen').classList.add('hidden');
  renderPowerSlots();
  if (V3.picksMade === 4) Teach.fire('banknote', player.x, player.y);   // ladder note: the Bank (canon L4)
  if (V3.picksMade === 6 && !V3.stonePicked && !G.endlessRun) { openStonePick(); return; }
  if (pendingLevels > 0) { startSpin(); return; }
  resumeAfterPick();
}

// ---------------- Run management ----------------
function resetGame() {
  G.time = 0; G.score = 0; G.eaten = 0; G.dots = 0; G.shake = 0;
  player.x = WORLD_W / 2; player.y = WORLD_H / 2; player.vx = 0; player.vy = 0;
  player.hp = 100; player.maxHp = 100;
  player.lives = Save.data.difficulty === 'easy' ? 3 : 1;   // BALANCE §2 canon lives: Easy 3 · Medium 1 · Hard 1 (hardcore)
  player.xp = 0; player.level = 1; player.xpNext = xpForLevel(1);
  player.combo = 0; player.comboTimer = 0;
  player.speedMul = 1; player.magnetR = 78; player.chompBonus = 0;
  player.comboWindow = 2.3; player.eatBonus = 0;
  player.powers = []; player.activePower = 0;
  player.dashT = 0; player.dashCd = 0; player.eatT = 0; player.eatChain = 0;
  player.shiftCd = 0; player.freezeT = 0; player.shiftCdMax = SHIFT_CD;
  player.graceT = 0;
  player.invulnUntil = -1;
  dots = []; pellets = []; fruits = []; ghosts = []; trail = []; particles = []; floaters = [];
  pelletTimer = 9; fruitTimer = 22; ghostTimer = 0; dotTimer = 0; surgeTimer = 55; patternTimer = 2;
  pendingLevels = 0;
  // ---- v3 reset: build package, resources, wheel, boss, fog, triggers, team ----
  player.charId = PAC_PACKAGE.charId; player.charName = PAC_PACKAGE.charName; player.charColor = PAC_PACKAGE.color;
  player.resourceType = PAC_PACKAGE.resourceType;
  player.stats = Object.assign({}, PAC_PACKAGE.stats);
  player.statSteps = {};
  player.resource = 0; player.resourceMax = 100; player.combatT = 99; player.resRegenMul = 1;
  player.damageMul = 1; player.abilityPowMul = 1; player.dodgePct = 0;
  player.stone = null; player.weapon = null; player.buffT = 0; player.slowT = 0; player.coinsEarned = 0;
  player.lightRadius = Save.data.lightRadius || 0;   // gear-rolled modifier persists on the save
  applyThresholds(true);   // the package's starting thresholds (Pac Strength 22 = 4 steps)
  lastSpinIdx = null;
  V3.picksMade = 0; V3.spin.statIdx = 0; V3.stonePicked = false;
  V3.bossSpawned = false; V3.bossBeaten = false; V3.boss = null;
  V3.pylons = []; V3.barrels = []; V3.danger = []; V3.explored = new Set(); V3.areaIdx = -1;
  V3.radarTaught = false;
  G.endlessRun = !!V3.endlessSelected;
  G.timeLeft = limitForLevel(1);
  TrigState.nextRoll = 20; TrigState.active = null; TrigState.t1 = 0; TrigState.eliteWindow = 0;
  TrigState.ice = 0; TrigState.cascade = 0; TrigState.boltWindow = 0;
  // team: per-character run states + the partner entity (deployed when unlocked)
  V3.chars = { pac: charStateFromPackage(PAC_PACKAGE), mspac: charStateFromPackage(PARTNER_PACKAGE) };
  V3.partner = Save.data.teamUnlocked
    ? { deployed: true, charId: 'mspac', pkgColor: PARTNER_PACKAGE.color, x: player.x - 60, y: player.y }
    : { deployed: false, charId: 'mspac', pkgColor: PARTNER_PACKAGE.color, x: player.x, y: player.y };
  if (V3.partner.deployed && G.state === 'playing') Teach.fire('teamup', player.x, player.y);
  for (let i = 0; i < 80 && dots.length < 380; i++) spawnDotCluster();
  for (let i = 0; i < 4; i++) spawnGhost(GHOST_TYPES[i]);
  renderPowerSlots();
  updateHUD(true);
}
function loseLife() {
  player.lives--;
  Snd.sirenStop();
  if (player.lives <= 0) { gameOver(); return; }
  player.hp = player.maxHp;
  player.eatT = 0;
  player.x = WORLD_W / 2; player.y = WORLD_H / 2;
  player.invulnUntil = G.time + 2.5;
  toast('OUCH! ' + player.lives + (player.lives === 1 ? ' LIFE' : ' LIVES') + ' LEFT');
}
function gameOver() {
  G.state = 'gameover';
  Snd.gameOver();
  Snd.sirenStop();
  if (!G.runCounted) {
    // fold the finished run into the lifetime records — exactly once
    const d = Save.data;
    d.best.score = Math.max(d.best.score, Math.floor(G.score));
    d.best.time = Math.max(d.best.time, Math.floor(G.time));
    d.best.level = Math.max(d.best.level, player.level);
    d.totals.ghostsEaten += G.eaten;
    d.totals.dots += G.dots;
    G.runCounted = true;
  }
  if (Save.data.difficulty === 'hard' && !Save.data.hardcoreDeath) {
    // HARD = HARDCORE (BALANCE §2 canon): die once and the character is gone
    Save.data.hardcoreDeath = { char: player.charId, at: new Date().toISOString(), level: player.level, score: Math.floor(G.score) };
  }
  G.best = Save.data.best.score;
  Save.write();
  refreshSaveLine();
  refreshMenuV3();
  document.getElementById('finalStats').innerHTML =
    'Score <b style="color:#ffe93b;">' + Math.floor(G.score) + '</b> &nbsp;•&nbsp; Best <b>' + G.best + '</b><br>' +
    'Survived <b>' + fmtTime(G.time) + '</b> &nbsp;•&nbsp; Level <b>' + player.level + '</b> &nbsp;•&nbsp; Ghosts eaten <b>' + G.eaten + '</b>';
  document.getElementById('gameoverScreen').classList.remove('hidden');
}

// ---------------- Ghost brains ----------------
function ghostTarget(g, frameChaser) {
  const p = player;
  if (player.eatT > 0) {
    // edible: flee the player (wrapped direction away) + jitter
    return { x: g.x + wrapDelta(g.x - p.x, WORLD_W), y: g.y + wrapDelta(g.y - p.y, WORLD_H) };
  }
  switch (g.type) {
    case 'chaser':
      return { x: p.x, y: p.y };
    case 'ambusher': {
      // target a point ahead of the player's motion
      const lead = 0.55;
      return { x: p.x + p.vx * lead, y: p.y + p.vy * lead };
    }
    case 'flanker': {
      // classic Inky: pivot ahead of player, mirrored off the chaser
      const px = p.x + Math.cos(p.angle) * 64, py = p.y + Math.sin(p.angle) * 64;
      if (!frameChaser || frameChaser === g) return { x: px, y: py };
      return { x: px + (px - frameChaser.x), y: py + (py - frameChaser.y) };
    }
    case 'wildcard': {
      if (g.wander) return { x: g.wanderX, y: g.wanderY };
      // shy like Clyde: back off when close
      if (tDist(g.x, g.y, p.x, p.y) < 150) return { x: 60, y: WORLD_H - 60 };
      return { x: p.x, y: p.y };
    }
  }
  return { x: p.x, y: p.y };
}

// ---------------- Update ----------------
function update(dt) {
  G.time += dt;

  // ---- Time Shift freeze: the world holds its breath ----
  // While frozen, only Pac's own drift is integrated — the swarm, the spawn
  // clocks, the timers and the combo all wait. This is the escape window.
  if (player.shiftCd > 0) player.shiftCd -= dt;
  if (player.graceT > 0) player.graceT -= dt;
  if (G.wantShift) {
    G.wantShift = false;
    if (player.shiftCd <= 0 && player.freezeT <= 0) doTimeShift();
  }
  if (player.freezeT > 0) {
    player.freezeT -= dt;
    player.x = wrapPos(player.x + player.vx * dt, WORLD_W);
    player.y = wrapPos(player.y + player.vy * dt, WORLD_H);
    const slidF = pushOutWalls(player.x, player.y, player.r);
    player.x = slidF.x; player.y = slidF.y;
    player.chomp += dt * 6;
    if (G.toastT > 0) { G.toastT -= dt; if (G.toastT <= 0) document.getElementById('toast').style.opacity = '0'; }
    return;
  }

  // ---- v3 systems (resources, triggers, danger zones, boss, partner, fog, timer) ----
  v3Update(dt);
  if (G.state !== 'playing') return;

  // ---- combo decay ----
  if (player.comboTimer > 0) {
    player.comboTimer -= dt;
    if (player.comboTimer <= 0) player.combo = 0;
  }
  const comboMult = 1 + Math.min(player.combo, 200) * 0.01;
  const comboSpeed = 1 + Math.min(player.combo, 150) * 0.003;

  // ---- input direction ----
  let ix = 0, iy = 0;
  if (keys['a'] || keys['arrowleft']) ix -= 1;
  if (keys['d'] || keys['arrowright']) ix += 1;
  if (keys['w'] || keys['arrowup']) iy -= 1;
  if (keys['s'] || keys['arrowdown']) iy += 1;
  if (touchMove) { ix = touchMove.dx; iy = touchMove.dy; }
  const ilen = Math.hypot(ix, iy);
  if (ilen > 0.01) { ix /= Math.max(1, ilen); iy /= Math.max(1, ilen); }

  // ---- dash ----
  const dashPow = hasPower('dash');
  if (player.dashCd > 0) player.dashCd -= dt;
  if ((G.wantDash || touchDashQueued) && dashPow && player.dashCd <= 0 && player.dashT <= 0) {
    touchDashQueued = false;
    if (player.resourceType === 'energy') {
      if (player.resource < 20) { G.wantDash = false; /* not enough in the tank */ }
      else player.resource -= 20;   // Energy pays for physical exertion (BALANCE v3 appendix)
    }
    player.dashT = 0.16 + 0.03 * (dashPow.lvl - 1);
    player.dashCd = 2.6 * Math.pow(0.72, dashPow.lvl - 1);
    if (ilen > 0.01) { player.dashDirX = ix / ilen; player.dashDirY = iy / ilen; }
    else { player.dashDirX = Math.cos(player.angle); player.dashDirY = Math.sin(player.angle); }
    Snd.dash();
  }
  G.wantDash = false;

  // ---- player movement ----
  const baseSpeed = 272 * player.speedMul * comboSpeed * (player.buffT > 0 ? 1.2 : 1) * (player.slowT > 0 ? 0.6 : 1);
  if (player.dashT > 0) {
    player.dashT -= dt;
    player.vx = player.dashDirX * baseSpeed * 3.2;
    player.vy = player.dashDirY * baseSpeed * 3.2;
  } else {
    const accel = 2400;
    if (TrigState.ice > 0) {
      // T7 freeze floor: thrust applies, friction nearly vanishes — you slide
      player.vx += ix * baseSpeed * 1.6 * dt;
      player.vy += iy * baseSpeed * 1.6 * dt;
      const sp2 = Math.hypot(player.vx, player.vy), cap = baseSpeed * 1.25;
      if (sp2 > cap) { player.vx = player.vx / sp2 * cap; player.vy = player.vy / sp2 * cap; }
      player.vx *= Math.pow(0.55, dt); player.vy *= Math.pow(0.55, dt);
    } else {
      player.vx += clamp(ix * baseSpeed - player.vx, -accel * dt, accel * dt);
      player.vy += clamp(iy * baseSpeed - player.vy, -accel * dt, accel * dt);
      if (ilen < 0.01) { player.vx *= Math.pow(0.0001, dt); player.vy *= Math.pow(0.0001, dt); }
    }
  }
  player.x = wrapPos(player.x + player.vx * dt, WORLD_W);
  player.y = wrapPos(player.y + player.vy * dt, WORLD_H);
  { // maze walls: push out along the axis of least penetration — Pac slides
    // along walls instead of sticking to them
    const slid = pushOutWalls(player.x, player.y, player.r);
    player.x = slid.x; player.y = slid.y;
  }
  const spd = Math.hypot(player.vx, player.vy);
  if (spd > 12) player.angle = Math.atan2(player.vy, player.vx);
  player.chomp += dt * (6 + spd * 0.045);

  // ---- fire trail ----
  const firePow = hasPower('fire');
  if (firePow && activePowerId() === 'fire' && spd > 30) {
    player.trailAcc += dt;
    const ttl = 2.1 + 0.35 * (firePow.lvl - 1);
    while (player.trailAcc > 0.045) {
      player.trailAcc -= 0.045;
      if (trail.length < TRAIL_CAP) trail.push({ x: player.x, y: player.y, ttl, max: ttl });
      else trail.shift();
    }
  }
  for (let i = trail.length - 1; i >= 0; i--) {
    trail[i].ttl -= dt;
    if (trail[i].ttl <= 0) { trail.splice(i, 1); }
  }

  // ---- eat mode timer ----
  if (player.eatT > 0) {
    player.eatT -= dt;
    if (player.eatT <= 0) { player.eatT = 0; player.eatChain = 0; Snd.sirenStop(); }
  }

  // ---- spawns ----
  dotTimer -= dt;
  if (dotTimer <= 0) { dotTimer = 0.7; if (dots.length < DOT_TARGET) for (let i = 0; i < 3; i++) spawnDotCluster(); }
  patternTimer -= dt;
  if (patternTimer <= 0) { patternTimer = PATTERN_INTERVAL; spawnDotPattern(); }
  pelletTimer -= dt;
  if (pelletTimer <= 0) { pelletTimer = PELLET_INTERVAL; if (pellets.length < 2) spawnPellet(); }
  fruitTimer -= dt;
  if (fruitTimer <= 0) { fruitTimer = FRUIT_INTERVAL + rand(-6, 8); if (fruits.length < 2) spawnFruit(); }
  ghostTimer -= dt;
  if (ghostTimer <= 0) {
    ghostTimer = 0.25;
    let aliveCount = 0;
    for (const g of ghosts) if (g.alive) aliveCount++;
    const deficit = ghostTargetCount() - aliveCount;
    if (deficit > 0) {
      const batch = Math.min(deficit, 6);   // flood in fast when behind the curve
      for (let i = 0; i < batch; i++) spawnGhost();
    }
  }
  // eaten ghosts return from the edges after a short delay — kills buy seconds, not safety
  for (const g of ghosts) {
    if (!g.alive && g.respawnAt > 0) {
      g.respawnAt -= dt;
      if (g.respawnAt <= 0) placeGhostAtEdge(g);
    }
  }
  // surge events: a ring of ghosts visibly masses around the player and closes in
  surgeTimer -= dt;
  if (surgeTimer <= 0) {
    surgeTimer = Math.max(30, 52 - G.time * 0.012);
    const n = Math.min(24, 10 + Math.floor(G.time / 28));
    const baseAng = rand(0, TAU);
    for (let i = 0; i < n; i++) spawnGhost(undefined, baseAng + (i / n) * TAU);
    toast('👻 GHOST SURGE!');
    Snd.tone(170, 0.35, 'sawtooth', 0.12, 80);
  }

  // ---- dots: magnet + eating ----
  const mawPow = hasPower('magnet');
  const mawActive = mawPow && activePowerId() === 'magnet';
  const magnetR = mawActive ? player.magnetR * (2.6 + 0.45 * (mawPow.lvl - 1)) : player.magnetR;
  const magnetPull = mawActive ? 760 : 300;
  const eatR = player.r + player.chompBonus;
  for (let i = dots.length - 1; i >= 0; i--) {
    const d = dots[i];
    // moving formations: advance the dot along its pattern's flow
    if (d.pat) {
      const p = d.pat;
      p.t += dt;
      if (p.t >= p.dur) { dots.splice(i, 1); continue; }   // the formation disperses on schedule
      let nx, ny;
      if (p.kind === 'river') {
        // the river's anchor flows along its heading; each dot rides a slot
        // behind the anchor with a sine wobble across the current. The anchor
        // is shared state on every dot of the formation — the first dot to
        // update each frame advances it, the rest read it (t already moved).
        const ca = Math.cos(p.ang), sa = Math.sin(p.ang);
        const sAxis = p.t * 62 - (p.i - p.n / 2) * 14;
        const wob = Math.sin(p.t * 2 + p.i * 0.7) * 22;
        const sx = p.cx + ca * sAxis - sa * wob, sy = p.cy + sa * sAxis + ca * wob;
        // if the current runs into a wall, this dot dissolves on the rocks
        if (circleHitsWall(sx, sy, 6)) { dots.splice(i, 1); continue; }
        nx = sx; ny = sy;
      } else if (p.kind === 'ring') {
        const a = p.ang + p.t * 0.55 + (p.i / p.n) * TAU;
        const R = 86 + 26 * Math.sin(p.t * 0.8);
        nx = p.cx + Math.cos(a) * R; ny = p.cy + Math.sin(a) * R;
      } else { // spiral
        const a = p.ang + p.t * 0.9 + p.i * 0.62;
        const R = 16 + p.i * 6.5 + 8 * Math.sin(p.t + p.i);
        nx = p.cx + Math.cos(a) * R; ny = p.cy + Math.sin(a) * R;
      }
      if (p.kind !== 'river' && circleHitsWall(nx, ny, 6)) { dots.splice(i, 1); continue; }
      d.x = wrapPos(nx, WORLD_W); d.y = wrapPos(ny, WORLD_H);
    }
    const dx = wrapDelta(player.x - d.x, WORLD_W);
    const dy = wrapDelta(player.y - d.y, WORLD_H);
    const dist = Math.hypot(dx, dy);
    if (dist < magnetR && dist > 1) {
      const pull = magnetPull * dt;
      const mx = wrapPos(d.x + (dx / dist) * Math.min(pull, dist), WORLD_W);
      const my = wrapPos(d.y + (dy / dist) * Math.min(pull, dist), WORLD_H);
      if (!circleHitsWall(mx, my, d.r)) { d.x = mx; d.y = my; }   // the magnet never drags food into a wall
    }
    if (dist < eatR + d.r) {
      dots.splice(i, 1);
      player.combo++;
      player.comboTimer = player.comboWindow;
      G.dots++;
      G.score += 10 * comboMult;
      gainXP(1);
      Snd.waka(player.combo);
    }
  }
  // fruit magnet (maw only) is handled by pull of fruits toward player below

  // ---- pellets ----
  for (let i = pellets.length - 1; i >= 0; i--) {
    const pl = pellets[i];
    pl.ttl -= dt;
    if (pl.ttl <= 0) { pellets.splice(i, 1); continue; }
    if (tDist(pl.x, pl.y, player.x, player.y) < eatR + 13) {
      pellets.splice(i, 1);
      player.eatT = 6 + player.eatBonus;
      player.eatChain = 0;
      Snd.sirenStart();
      toast('EAT MODE!');
      Teach.fire('eatmode', player.x, player.y);   // first-sight: the hunt flips
      burst(pl.x, pl.y, '#4db2ff', 18);
    }
  }

  // ---- fruits ----
  for (let i = fruits.length - 1; i >= 0; i--) {
    const f = fruits[i];
    f.ttl -= dt;
    if (f.ttl <= 0) { fruits.splice(i, 1); continue; }
    if (mawActive) {
      const dx = wrapDelta(player.x - f.x, WORLD_W), dy = wrapDelta(player.y - f.y, WORLD_H);
      const dist = Math.hypot(dx, dy);
      if (dist < magnetR && dist > 1) {
        const fx = wrapPos(f.x + (dx / dist) * magnetPull * dt, WORLD_W);
        const fy = wrapPos(f.y + (dy / dist) * magnetPull * dt, WORLD_H);
        if (!circleHitsWall(fx, fy, 10)) { f.x = fx; f.y = fy; }
      }
    }
    if (tDist(f.x, f.y, player.x, player.y) < eatR + 12) {
      // fruit heals — exactly the HP on its label, nothing else (v2 rule)
      fruits.splice(i, 1);
      const healed = Math.min(f.kind.heal, player.maxHp - player.hp);
      player.hp += healed;
      floater(f.x, f.y - 18, f.kind.name + ' +' + healed + ' HP', '#7dff8a');
      Snd.fruit();
      burst(f.x, f.y, f.kind.color, 12);
    }
  }

  // ---- ghosts ----
  const dashing = player.dashT > 0;
  // spatial hash (cells wrap with the world) so separation stays cheap at swarm size,
  // and the flanker's chaser reference is resolved once per frame, not once per ghost
  const CELL = 52, COLS = Math.ceil(WORLD_W / CELL), ROWS = Math.ceil(WORLD_H / CELL);
  const grid = new Map();
  let frameChaser = null;
  for (let i = 0; i < ghosts.length; i++) {
    const g0 = ghosts[i];
    if (!g0.alive) continue;
    if (!frameChaser && g0.type === 'chaser') frameChaser = g0;
    const key = Math.floor(g0.x / CELL) % COLS + ',' + Math.floor(g0.y / CELL) % ROWS;
    let arr = grid.get(key);
    if (!arr) { arr = []; grid.set(key, arr); }
    arr.push(i);
  }
  for (const g of ghosts) {
    if (!g.alive) continue;
    if (g.touchCd > 0) g.touchCd -= dt;
    // post-pick grace: ghosts are HELD, full stop — no steering, no contact,
    // and no side effects either (a ghost standing in a fire trail does not
    // burn down during the planning window; the field the player read when
    // they picked their card is the field they return to)
    if (player.graceT > 0) continue;
    // wildcard re-rolls its behaviour
    if (g.type === 'wildcard') {
      g.modeT -= dt;
      if (g.modeT <= 0) {
        g.modeT = rand(2.4, 4.4);
        g.wander = !g.wander;
        g.wanderX = rand(0, WORLD_W); g.wanderY = rand(0, WORLD_H);
      }
    }
    // fire-trail burn
    if (g.burnT > 0 || trail.length) {
      let onFire = false;
      for (const s of trail) {
        if (Math.abs(wrapDelta(s.x - g.x, WORLD_W)) < 26 && Math.abs(wrapDelta(s.y - g.y, WORLD_H)) < 26 &&
            tDist(s.x, s.y, g.x, g.y) < 26) { onFire = true; break; }
      }
      if (onFire) {
        g.burnT += dt;
        const burnNeed = firePow ? 0.5 - 0.08 * (firePow.lvl - 1) : 0.5;
        if (g.burnT >= burnNeed) {
          g.burnT = 0;
          const pts = killGhost(g, false, 150);
          G.score += pts * comboMult;
          gainXP(2);
          floater(g.x, g.y - 20, 'BURNED! +' + pts, '#ff9a3b');
          continue;
        }
      } else if (g.burnT > 0) g.burnT = Math.max(0, g.burnT - dt * 2);
    }
    // steering
    const tgt = ghostTarget(g, frameChaser);
    let dx = wrapDelta(tgt.x - g.x, WORLD_W);
    let dy = wrapDelta(tgt.y - g.y, WORLD_H);
    const dl = Math.hypot(dx, dy) || 1;
    dx /= dl; dy /= dl;
    let gSpeed = ghostBaseSpeed() * GHOST_STYLE[g.type].speed * (g.elite ? 1.07 : 1);
    if (player.eatT > 0) gSpeed *= 0.55;
    if (g.burnT > 0) gSpeed *= 0.6;
    const steer = 5.5;
    g.vx += (dx * gSpeed - g.vx) * Math.min(1, steer * dt);
    g.vy += (dy * gSpeed - g.vy) * Math.min(1, steer * dt);
    // separation so packs don't stack into one blob — neighbours only, via the grid
    const gcx = Math.floor(g.x / CELL) % COLS, gcy = Math.floor(g.y / CELL) % ROWS;
    for (let ox = -1; ox <= 1; ox++) {
      for (let oy = -1; oy <= 1; oy++) {
        const cellArr = grid.get(((gcx + ox + COLS) % COLS) + ',' + ((gcy + oy + ROWS) % ROWS));
        if (!cellArr) continue;
        for (const oi of cellArr) {
          const o = ghosts[oi];
          if (o === g || !o.alive) continue;
          const sx = wrapDelta(g.x - o.x, WORLD_W), sy = wrapDelta(g.y - o.y, WORLD_H);
          const sd = Math.hypot(sx, sy);
          if (sd > 0 && sd < 34) { g.vx += (sx / sd) * 60 * dt; g.vy += (sy / sd) * 60 * dt; }
        }
      }
    }
    { // maze walls: a ghost that would enter a wall first tries sliding along
      // it (keep the velocity component parallel to the wall); if the slide
      // also fails — a corner — it stops and lets next frame's steering pick
      // the way around. Steering + slide reads as routing, not pathfinding.
      const nx = wrapPos(g.x + g.vx * dt, WORLD_W);
      const ny = wrapPos(g.y + g.vy * dt, WORLD_H);
      if (!circleHitsWall(nx, ny, g.r * 0.8)) { g.x = nx; g.y = ny; }
      else if (!circleHitsWall(nx, g.y, g.r * 0.8)) { g.x = nx; g.vy *= 0.4; }
      else if (!circleHitsWall(g.x, ny, g.r * 0.8)) { g.y = ny; g.vx *= 0.4; }
      else { g.vx *= 0.4; g.vy *= 0.4; }
    }

    // ---- contact with player ----
    const distP = tDist(g.x, g.y, player.x, player.y);
    if (distP < g.r + eatR - 4) {
      if (player.eatT > 0 || dashing) {
        const pts = player.eatT > 0 ? (200 * Math.pow(2, Math.min(player.eatChain, 3))) : 300;
        if (player.eatT > 0) player.eatChain++;
        killGhost(g, true, pts);
        G.score += pts * comboMult;
        gainXP(3);
        floater(g.x, g.y - 22, '+' + pts, '#4db2ff');
        Snd.eatGhost(player.eatChain);
      } else if (G.time >= player.invulnUntil && g.touchCd <= 0) {
        g.touchCd = 1.0;
        if (Math.random() * 100 < player.dodgePct) {
          // Agility pays out as DODGE: the hit never lands (BALANCE §3/§40)
          floater(player.x, player.y - 30, 'DODGED!', '#b6ff5e');
          g._dodged = true;
        }
        if (!g._dodged) {
        player.hp -= 13;
        if (player.resourceType === 'rage') gainResource(12);   // Rage builds when taking damage
        else player.combatT = 0;
        player.combo = Math.floor(player.combo / 2);
        player.invulnUntil = G.time + 0.9;
        G.shake = 9;
        burst(player.x, player.y, '#ff3b6b', 10);
        Snd.hurt();
        if (player.hp <= 0) { loseLife(); if (G.state !== 'playing') return; }
        }
        g._dodged = false;
      }
    }
  }

  // ---- particles & floaters ----
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.ttl -= dt;
    if (p.ttl <= 0) { particles.splice(i, 1); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vx *= Math.pow(0.02, dt); p.vy *= Math.pow(0.02, dt);
  }
  for (let i = floaters.length - 1; i >= 0; i--) {
    floaters[i].ttl -= dt; floaters[i].y -= 34 * dt;
    if (floaters[i].ttl <= 0) floaters.splice(i, 1);
  }
  if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 26);
  if (G.toastT > 0) { G.toastT -= dt; if (G.toastT <= 0) document.getElementById('toast').style.opacity = '0'; }

  // ---- first-sight scan (before the level-up handoff, so a lesson about
  // something on screen never queues behind the card screen) ----
  Teach.scan();

  // ---- level up? ----
  if (pendingLevels > 0 && G.state === 'playing') startSpin();
}

// ---------------- Rendering ----------------
let vignette = null;
function buildVignette() {
  vignette = document.createElement('canvas');
  vignette.width = Math.max(2, Math.floor(VW / 2)); vignette.height = Math.max(2, Math.floor(VH / 2));
  const vc = vignette.getContext('2d');
  const g = vc.createRadialGradient(VW / 4, VH / 4, Math.min(VW, VH) / 4, VW / 4, VH / 4, Math.max(VW, VH) / 1.4);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,10,0.55)');
  vc.fillStyle = g; vc.fillRect(0, 0, vignette.width, vignette.height);
}
buildVignette();
window.addEventListener('resize', buildVignette);

let animT = 0;
function SX(x) { return VW / 2 + wrapDelta(x - player.x, WORLD_W); }
function SY(y) { return VH / 2 + wrapDelta(y - player.y, WORLD_H); }
function onScreen(sx, sy, m) { return sx > -m && sx < VW + m && sy > -m && sy < VH + m; }

function drawGhostShape(g, sx, sy) {
  const r = g.r;
  const edible = player.eatT > 0;
  const flash = edible && player.eatT < 1.6 && Math.floor(animT * 7) % 2 === 0;
  ctx.save();
  ctx.translate(sx, sy);
  // body
  ctx.beginPath();
  ctx.arc(0, -r * 0.15, r, Math.PI, 0);
  const waveN = 4, waveW = (r * 2) / waveN;
  ctx.lineTo(r, r * 0.85);
  for (let i = 0; i < waveN; i++) {
    const x0 = r - waveW * i;
    ctx.lineTo(x0 - waveW / 2, r * 0.55 + Math.sin(animT * 10 + i * 1.7) * 2.5);
    ctx.lineTo(x0 - waveW, r * 0.85);
  }
  ctx.closePath();
  ctx.fillStyle = flash ? '#f4f6ff' : (edible ? '#2438ff' : GHOST_STYLE[g.type].color);
  ctx.fill();
  if (g.burnT > 0) { ctx.fillStyle = 'rgba(255,120,20,' + Math.min(0.75, g.burnT * 1.4) + ')'; ctx.fill(); }
  if (g.elite) { // golden crown
    ctx.fillStyle = '#ffd93b';
    ctx.beginPath();
    ctx.moveTo(-r * 0.7, -r * 1.05); ctx.lineTo(-r * 0.7, -r * 1.45); ctx.lineTo(-r * 0.35, -r * 1.15);
    ctx.lineTo(0, -r * 1.5); ctx.lineTo(r * 0.35, -r * 1.15); ctx.lineTo(r * 0.7, -r * 1.45);
    ctx.lineTo(r * 0.7, -r * 1.05); ctx.closePath(); ctx.fill();
  }
  // face
  if (edible) {
    ctx.fillStyle = '#ffb8a1';
    ctx.beginPath(); ctx.arc(-r * 0.32, -r * 0.25, r * 0.14, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(r * 0.32, -r * 0.25, r * 0.14, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#ffb8a1'; ctx.lineWidth = 2; ctx.beginPath();
    const mz = r * 0.28;
    ctx.moveTo(-mz, r * 0.28);
    for (let i = 1; i <= 4; i++) ctx.lineTo(-mz + (2 * mz * i) / 4, r * 0.28 + (i % 2 ? -3.4 : 3.4) * 0.5);
    ctx.stroke();
  } else {
    const lx = clamp(g.vx * 0.02, -3.4, 3.4), ly = clamp(g.vy * 0.02, -3.4, 3.4);
    for (const s of [-1, 1]) {
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.ellipse(s * r * 0.36, -r * 0.32, r * 0.21, r * 0.27, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#2438ff';
      ctx.beginPath(); ctx.arc(s * r * 0.36 + lx, -r * 0.32 + ly, r * 0.11, 0, TAU); ctx.fill();
    }
  }
  ctx.restore();
}

function render() {
  // background
  const bg = ctx.createLinearGradient(0, 0, 0, VH);
  bg.addColorStop(0, '#070718'); bg.addColorStop(1, '#04040c');
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = bg; ctx.fillRect(0, 0, VW, VH);

  const shX = G.shake ? rand(-G.shake, G.shake) : 0;
  const shY = G.shake ? rand(-G.shake, G.shake) : 0;
  ctx.save();
  ctx.translate(shX, shY);

  // world grid (100px — divides world evenly, so wrapping is seamless)
  const grid = 100;
  const offX = ((-(player.x - VW / 2) % grid) + grid) % grid;
  const offY = ((-(player.y - VH / 2) % grid) + grid) % grid;
  ctx.strokeStyle = 'rgba(52,72,190,0.20)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = offX; x <= VW; x += grid) { ctx.moveTo(x, 0); ctx.lineTo(x, VH); }
  for (let y = offY; y <= VH; y += grid) { ctx.moveTo(0, y); ctx.lineTo(VW, y); }
  ctx.stroke();

  // maze walls (v2) — neon slabs on the dark: bright edge, deep face. Drawn
  // through the same wrap-aware projection as everything else, with the
  // ±world offsets so a wall crossing an edge renders on both sides.
  for (const w of WALLS) {
    for (let ox = -1; ox <= 1; ox++) {
      for (let oy = -1; oy <= 1; oy++) {
        const sx = VW / 2 + wrapDelta(w.x + ox * WORLD_W - player.x, WORLD_W);
        const sy = VH / 2 + wrapDelta(w.y + oy * WORLD_H - player.y, WORLD_H);
        if (!onScreen(sx, sy, Math.max(w.w, w.h) / 2 + 40)) continue;
        const rx = sx - w.w / 2, ry = sy - w.h / 2;
        ctx.fillStyle = '#131a3d';
        ctx.fillRect(rx, ry, w.w, w.h);
        ctx.fillStyle = 'rgba(90,120,255,0.20)';
        ctx.fillRect(rx + 3, ry + 3, w.w - 6, w.h - 6);
        ctx.strokeStyle = '#5f7dff';
        ctx.lineWidth = 2;
        ctx.strokeRect(rx + 1, ry + 1, w.w - 2, w.h - 2);
      }
    }
  }

  // v3: the current area's light — a translucent tint unique to the zone
  if (V3.areaIdx >= 0 && AREAS[V3.areaIdx]) { ctx.fillStyle = AREAS[V3.areaIdx].tint; ctx.fillRect(0, 0, VW, VH); }
  drawDangerZones();

  // fire trail (under everything else)
  for (const s of trail) {
    const sx = SX(s.x), sy = SY(s.y);
    if (!onScreen(sx, sy, 40)) continue;
    const a = (s.ttl / s.max) * 0.55;
    ctx.fillStyle = 'rgba(255,' + Math.floor(90 + 90 * (s.ttl / s.max)) + ',20,' + a + ')';
    ctx.beginPath(); ctx.arc(sx, sy, 13 + Math.sin(animT * 9 + s.x) * 2.5, 0, TAU); ctx.fill();
  }

  // dots
  ctx.fillStyle = '#ffe9a8';
  for (const d of dots) {
    const sx = SX(d.x), sy = SY(d.y);
    if (!onScreen(sx, sy, 20)) continue;
    ctx.beginPath(); ctx.arc(sx, sy, d.r * (0.85 + 0.15 * Math.sin(animT * 3 + d.pulse)), 0, TAU); ctx.fill();
  }

  // power pellets
  for (const pl of pellets) {
    const sx = SX(pl.x), sy = SY(pl.y);
    if (!onScreen(sx, sy, 50)) continue;
    const pulse = 0.8 + 0.3 * Math.sin(animT * 6);
    ctx.fillStyle = 'rgba(77,178,255,0.25)';
    ctx.beginPath(); ctx.arc(sx, sy, 24 * pulse, 0, TAU); ctx.fill();
    ctx.fillStyle = '#cfeaff';
    ctx.beginPath(); ctx.arc(sx, sy, 11 * pulse, 0, TAU); ctx.fill();
  }

  // fruits
  for (const f of fruits) {
    const sx = SX(f.x), sy = SY(f.y);
    if (!onScreen(sx, sy, 40)) continue;
    if (f.ttl < 4 && Math.floor(animT * 6) % 2 === 0) continue; // expiring blink
    ctx.fillStyle = f.kind.color;
    ctx.beginPath(); ctx.arc(sx, sy, 11, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath(); ctx.arc(sx - 3.5, sy - 3.5, 3.4, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#7a4a21'; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(sx, sy - 10); ctx.quadraticCurveTo(sx + 2, sy - 16, sx + 6, sy - 17); ctx.stroke();
    ctx.fillStyle = '#37e08b';
    ctx.beginPath(); ctx.ellipse(sx + 7, sy - 15, 5, 2.6, 0.6, 0, TAU); ctx.fill();
  }

  // ghosts
  for (const g of ghosts) {
    if (!g.alive) continue;
    const sx = SX(g.x), sy = SY(g.y);
    if (!onScreen(sx, sy, 60)) continue;
    drawGhostShape(g, sx, sy);
  }

  drawBossAndBarrels();
  drawPartner();

  // particles
  for (const p of particles) {
    const sx = SX(p.x), sy = SY(p.y);
    if (!onScreen(sx, sy, 20)) continue;
    ctx.globalAlpha = Math.max(0, p.ttl / p.max);
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(sx, sy, p.size, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // ---- player ----
  const px = VW / 2, py = VH / 2;
  const invuln = G.time < player.invulnUntil;
  const blinkOff = invuln && Math.floor(animT * 12) % 2 === 0;
  if (!blinkOff) {
    // dash afterimages
    if (player.dashT > 0) {
      for (let i = 1; i <= 2; i++) {
        ctx.fillStyle = 'rgba(255,233,59,' + (0.22 - i * 0.08) + ')';
        ctx.beginPath();
        ctx.arc(px - player.dashDirX * i * 22, py - player.dashDirY * i * 22, player.r, 0, TAU);
        ctx.fill();
      }
    }
    const mouthAmp = player.eatT > 0 ? 1.0 : 0.82;
    const mouth = (0.14 + (0.5 + 0.5 * Math.sin(player.chomp * 6.2)) * mouthAmp * 0.72);
    ctx.fillStyle = player.eatT > 0 ? '#ffe93b' : (player.charColor || '#ffd21f');
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.arc(px, py, player.r + player.chompBonus * 0.4, player.angle + mouth, player.angle + TAU - mouth);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath(); ctx.arc(px - 4, py - 6, 4.4, 0, TAU); ctx.fill();
  }
  // post-pick grace: a shield ring the player can read at a glance, with the
  // seconds left printed on it — this window is for planning, not panicking
  if (player.graceT > 0 && G.state === 'playing') {
    const gr = player.r + player.chompBonus * 0.4 + 9 + Math.sin(animT * 8) * 2;
    ctx.save();
    ctx.strokeStyle = 'rgba(157,242,255,0.9)';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(px, py, gr, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(157,242,255,0.35)';
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(px, py, gr, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(player.graceT / 1.5, 0, 1)); ctx.stroke();
    ctx.font = '800 11px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#9df2ff';
    ctx.fillText('GRACE ' + player.graceT.toFixed(1), px, py - gr - 8);
    ctx.restore();
  }

  // floaters
  ctx.textAlign = 'center';
  ctx.font = '800 14px "Segoe UI", sans-serif';
  for (const f of floaters) {
    const sx = SX(f.x), sy = SY(f.y);
    ctx.globalAlpha = Math.min(1, f.ttl * 1.6);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, sx, sy);
  }
  ctx.globalAlpha = 1;

  // first-sight highlight: a pulsing ring on the thing being taught
  if (Teach.active && Teach.active.ax !== null) {
    const sx = SX(Teach.active.ax), sy = SY(Teach.active.ay);
    const rr = 30 + Math.sin(animT * 6) * 5;
    ctx.strokeStyle = 'rgba(255,233,59,0.35)';
    ctx.lineWidth = 9;
    ctx.beginPath(); ctx.arc(sx, sy, rr + 5, 0, TAU); ctx.stroke();
    ctx.strokeStyle = '#ffe93b';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(sx, sy, rr, 0, TAU); ctx.stroke();
  }
  ctx.restore();

  // eat-mode tint + vignette
  if (player.eatT > 0) {
    ctx.fillStyle = 'rgba(40,80,255,0.07)';
    ctx.fillRect(0, 0, VW, VH);
    drawGhostRadar();
  }
  if (player.freezeT > 0) {
    // Time Shift: the held breath — cold wash + hard vignette while time waits
    ctx.fillStyle = 'rgba(120,200,255,0.10)';
    ctx.fillRect(0, 0, VW, VH);
  }
  if (vignette) ctx.drawImage(vignette, 0, 0, VW, VH);
  drawFog();
  drawRadarMinimap();
  drawWheelOverlay();
  drawStick();
}
// the touch stick, drawn in screen space over everything: base ring where the
// thumb landed, knob where it is now — the player can SEE the stick they feel
function drawStick() {
  if (!stick) return;
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 2;
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  ctx.beginPath(); ctx.arc(stick.baseX, stick.baseY, STICK_R, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.38)';
  ctx.beginPath(); ctx.arc(stick.knobX, stick.knobY, 26, 0, TAU); ctx.fill();
  ctx.restore();
}

// ---------------- Eat-mode ghost radar (v2) ----------------
// While EAT MODE runs, edible ghosts off-screen get an arrow pinned to the
// screen edge pointing straight at them (nearest 8), and the nearest ghost
// also gets a pulsing ring in the corner readout with its distance — so the
// hunt is efficient before the timer dies. Nearest targets only: the arrows
// answer "which way do I run?", which is the whole question in eat mode.
function radarTargets() {
  const list = [];
  for (const g of ghosts) {
    if (!g.alive) continue;
    const dx = wrapDelta(g.x - player.x, WORLD_W);
    const dy = wrapDelta(g.y - player.y, WORLD_H);
    list.push({ dx, dy, d: Math.hypot(dx, dy), elite: !!g.elite });
  }
  list.sort((a, b) => a.d - b.d);
  return list;
}
function drawGhostRadar() {
  const list = radarTargets();
  if (!list.length) return;
  const m = 26;   // screen-edge margin the arrows ride on
  let shown = 0;
  for (const t of list) {
    const sx = VW / 2 + t.dx, sy = VH / 2 + t.dy;
    if (sx > -20 && sx < VW + 20 && sy > -20 && sy < VH + 20) continue;   // already visible
    if (shown >= 8) break;
    shown++;
    const ang = Math.atan2(t.dy, t.dx);
    const cx = clamp(sx, m, VW - m), cy = clamp(sy, m, VH - m);
    const pulse = 1 + 0.18 * Math.sin(animT * 9);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(ang);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = t.elite ? '#ffd93b' : '#4db2ff';
    ctx.strokeStyle = 'rgba(6,10,30,0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(13, 0); ctx.lineTo(-8, -9); ctx.lineTo(-3.5, 0); ctx.lineTo(-8, 9);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  // corner readout: nearest ghost + how far
  const n0 = list[0];
  const rx = VW - 118, ry = 92, rw = 104, rh = 46;
  ctx.save();
  ctx.fillStyle = 'rgba(6,8,28,0.66)';
  ctx.strokeStyle = 'rgba(77,178,255,0.65)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(rx, ry, rw, rh, 9); else ctx.rect(rx, ry, rw, rh);
  ctx.fill(); ctx.stroke();
  ctx.strokeStyle = 'rgba(77,178,255,0.35)';
  ctx.beginPath(); ctx.arc(rx + 23, ry + 23, 15, 0, TAU); ctx.stroke();
  ctx.beginPath(); ctx.arc(rx + 23, ry + 23, 8, 0, TAU); ctx.stroke();
  const ba = Math.atan2(n0.dy, n0.dx);
  ctx.fillStyle = '#4db2ff';
  ctx.beginPath(); ctx.arc(rx + 23 + Math.cos(ba) * 11, ry + 23 + Math.sin(ba) * 11, 3.4, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(rx + 23, ry + 23, 2.2, 0, TAU); ctx.fill();
  ctx.fillStyle = '#cfeaff';
  ctx.font = '800 15px "Segoe UI", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(Math.round(n0.d) + 'm', rx + 46, ry + 29);
  ctx.fillStyle = '#8fa2ff';
  ctx.font = '700 8.5px "Segoe UI", sans-serif';
  ctx.fillText('NEAREST GHOST', rx + 46, ry + 14);
  ctx.restore();
}

// ---------------- HUD ----------------
const el = {
  score: document.getElementById('scoreText'), time: document.getElementById('timeText'),
  level: document.getElementById('levelText'), lives: document.getElementById('livesText'),
  hp: document.getElementById('hpFill'), xp: document.getElementById('xpFill'),
  combo: document.getElementById('comboText'), comboFill: document.getElementById('comboFill'),
  best: document.getElementById('bestText'), eaten: document.getElementById('eatenText'),
  eatBanner: document.getElementById('eatBanner'), powers: document.getElementById('powers'),
  shift: document.getElementById('shiftText'), shiftFill: document.getElementById('shiftFill'),
  shiftBtn: document.getElementById('shiftBtn'),
  debug: document.getElementById('debugState')
};
function updateHUD(force) {
  el.score.textContent = Math.floor(G.score).toLocaleString();
  el.time.textContent = G.endlessRun ? fmtTime(G.time) : fmtTime(Math.max(0, G.timeLeft || 0));
  el.level.textContent = player.level;
  el.lives.textContent = '♥'.repeat(Math.max(0, player.lives));
  el.hp.style.transform = 'scaleX(' + clamp(player.hp / player.maxHp, 0, 1) + ')';
  el.xp.style.transform = 'scaleX(' + clamp(player.xp / player.xpNext, 0, 1) + ')';
  el.combo.textContent = 'x' + player.combo;
  el.comboFill.style.transform = 'scaleX(' + clamp(player.comboTimer / player.comboWindow, 0, 1) + ')';
  el.best.textContent = Math.max(G.best, Math.floor(G.score)).toLocaleString();
  el.eaten.textContent = G.eaten;
  el.eatBanner.style.display = player.eatT > 0 ? 'block' : 'none';
  if (el.eatBanner.style.display === 'block') {
    el.eatBanner.textContent = 'EAT MODE! ' + player.eatT.toFixed(1);
  }
  // Time Shift readiness: label counts down, bar refills, button lights up
  if (el.shift) {
    const ready = player.shiftCd <= 0;
    el.shift.textContent = ready ? 'READY — E' : player.shiftCd.toFixed(1) + 's';
    el.shift.style.color = ready ? '#9df2ff' : '';
    if (el.shiftFill) el.shiftFill.style.transform =
      'scaleX(' + clamp(1 - Math.max(0, player.shiftCd) / player.shiftCdMax, 0, 1) + ')';
    if (el.shiftBtn) { if (ready) el.shiftBtn.classList.add('ready'); else el.shiftBtn.classList.remove('ready'); }
  }
  // v3 resource bar (name + behaviour come from the active character's one resource)
  { const rt = document.getElementById('resText'), rf = document.getElementById('resFill');
    if (rt && rf) {
      const def = RESOURCE_DEFS[player.resourceType];
      rt.textContent = def.name + ' ' + Math.floor(player.resource) + (player.resource >= BURST_COST ? ' — F: BURST!' : '');
      rt.style.color = def.color;
      rf.style.transform = 'scaleX(' + clamp(player.resource / player.resourceMax, 0, 1) + ')';
      rf.style.background = def.color;
    }
    const lt = document.getElementById('timeLabel');
    if (lt) lt.textContent = G.endlessRun ? 'Time — ENDLESS' : 'Level Time Left';
    const lv = document.getElementById('livesText');
    if (lv && Save.data.difficulty === 'hard') lv.textContent = '☠ HARDCORE';
  }
  // dash cooldown sliver on the dash slot
  const dashIdx = player.powers.findIndex((p) => p.id === 'dash');
  if (dashIdx >= 0 && el.powers.children[dashIdx]) {
    const cdEl = el.powers.children[dashIdx].querySelector('.cd');
    if (cdEl) {
      const dashPow = player.powers[dashIdx];
      const full = 2.6 * Math.pow(0.72, dashPow.lvl - 1);
      cdEl.style.width = (player.dashCd <= 0 ? 100 : (1 - player.dashCd / full) * 100) + '%';
    }
  }
}
function renderPowerSlots() {
  el.powers.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const p = player.powers[i];
    const d = document.createElement('div');
    d.className = 'slot' + (p ? '' : ' empty') + (p && i === player.activePower ? ' active' : '');
    if (p) {
      d.innerHTML = '<span class="key">' + (i + 1) + '</span><span class="lvl">Lv' + p.lvl + '</span>' +
        '<span class="ico">' + POWER_DEFS[p.id].icon + '</span>' +
        '<span class="nm">' + POWER_DEFS[p.id].name + '</span><div class="cd"></div>';
      d.title = POWER_DEFS[p.id].name + ' — ' + POWER_DEFS[p.id].desc;
      const idx = i;
      d.addEventListener('click', () => setActivePower(idx));
    } else {
      d.innerHTML = '<span class="key">' + (i + 1) + '</span><span class="ico">·</span><span class="nm">empty</span>';
    }
    el.powers.appendChild(d);
  }
}

// ---------------- Buttons / state flow ----------------
function toggleMute() {
  Snd.setMuted(!Snd.muted);
  document.getElementById('muteBtn').textContent = Snd.muted ? '🔇' : '🔊';
  Save.write(true);        // settings persist immediately
}
function togglePause() {
  if (G.state === 'playing') {
    G.state = 'paused';
    // session view (DESIGN.md, "The pause window"): ONLY what this run has
    // unlocked and explored — the powers actually held, the stats actually
    // pumped. The full 13-tree ring doesn't exist in code yet, so unexplored
    // trees render nothing at all, per the fog rule.
    const ps = document.getElementById('pauseStats');
    if (ps) {
      const lines = [];
      lines.push('Level <b>' + player.level + '</b> &nbsp;•&nbsp; Score <b>' + Math.floor(G.score).toLocaleString() + '</b>' +
        ' &nbsp;•&nbsp; Survived <b>' + fmtTime(G.time) + '</b> &nbsp;•&nbsp; Ghosts eaten <b>' + G.eaten + '</b>');
      if (player.powers.length) {
        lines.push('Powers held: ' + player.powers.map((p) =>
          POWER_DEFS[p.id].icon + ' <b>' + POWER_DEFS[p.id].name + '</b> Lv' + p.lvl).join(' &nbsp;•&nbsp; '));
      } else {
        lines.push('Powers held: none yet — eat a ghost in EAT MODE or take a skill card.');
      }
      lines.push('Stats: ' + WHEEL.map((w) => '<span style="color:' + w.color + '">' + w.name + ' ' + player.stats[w.key] + '</span>').join(' · ') +
        ' &nbsp;•&nbsp; ' + RESOURCE_DEFS[player.resourceType].name + ' <b>' + Math.floor(player.resource) + '/' + player.resourceMax + '</b>' +
        (player.weapon ? ' &nbsp;•&nbsp; Weapon <b>' + player.weapon.name + ' ' + (player.weapon.pct >= 0 ? '+' : '') + player.weapon.pct + '%</b>' : '') +
        (player.stone ? ' &nbsp;•&nbsp; Stone <b>' + player.stone + '</b>' : '') +
        ' &nbsp;•&nbsp; Light Radius <b>' + (player.lightRadius >= 0 ? '+' : '') + player.lightRadius + '</b>' +
        ' &nbsp;•&nbsp; Coins <b>' + (Save.data.coins[player.charId] || 0) + '</b>');
      lines.push('Move speed <b>' + Math.round(272 * player.speedMul) + '</b> &nbsp;•&nbsp; Max HP <b>' + player.maxHp + '</b>' +
        ' &nbsp;•&nbsp; Magnet <b>' + Math.round(player.magnetR) + '</b> &nbsp;•&nbsp; Chomp <b>+' + player.chompBonus + '</b>' +
        ' &nbsp;•&nbsp; Eat Mode <b>' + (6 + player.eatBonus).toFixed(1) + 's</b>' +
        ' &nbsp;•&nbsp; Time Shift <b>' + (player.shiftCd <= 0 ? 'READY' : player.shiftCd.toFixed(1) + 's') + '</b>');
      ps.innerHTML = lines.join('<br>');
    }
    document.getElementById('pauseScreen').classList.remove('hidden');
  }
  else if (G.state === 'paused') { G.state = 'playing'; document.getElementById('pauseScreen').classList.add('hidden'); }
}
function beginRun() {
  if (Save.data.hardcoreDeath && Save.data.hardcoreDeath.char === 'pac') {
    // the character is gone (hardcore canon) — the tombstone on the menu says it
    document.getElementById('startScreen').classList.remove('hidden');
    refreshMenuV3();
    return;
  }
  resetGame();
  Teach.fire('resource', player.x, player.y);   // first-sight: Pac's one resource
  G.runCounted = false;
  Save.data.totals.runs++;
  Save.write(true);
  G.state = 'playing';
}
function refreshSaveLine() {
  const line = document.getElementById('saveLine');
  if (!line) return;
  const d = Save.data;
  if (!d.totals.runs && !d.best.score) {
    line.textContent = 'Progress saves automatically in this browser.';
    return;
  }
  line.textContent = 'Best ' + d.best.score.toLocaleString() + ' • ' + fmtTime(d.best.time) + ' • Lv ' + d.best.level +
    '  —  ' + d.totals.runs + (d.totals.runs === 1 ? ' run' : ' runs') +
    ' • ' + d.totals.ghostsEaten.toLocaleString() + ' ghosts eaten' +
    ' • ' + d.totals.dots.toLocaleString() + ' dots' +
    ' • roster ' + d.unlocks.length;
}
function resetSave() {
  if (!window.confirm('Reset ALL saved progress?\nBest scores, lifetime totals and unlocks will be cleared.')) return;
  try { localStorage.removeItem(SAVE_KEY); localStorage.removeItem('pacBest'); } catch (e) {}
  Save.data = defaultSave();
  G.best = 0;
  if (Snd.muted) { Snd.setMuted(false); document.getElementById('muteBtn').textContent = '🔊'; }
  Save.write();
  refreshSaveLine();
  updateHUD(true);
}
document.getElementById('muteBtn').addEventListener('click', () => { Snd.init(); toggleMute(); });
// always-visible pause (owner rule): on-screen on every platform, not
// keyboard-only — thumb-sized, parked beside the mute button
document.getElementById('pauseBtn').addEventListener('click', () => { Snd.init(); togglePause(); });
document.getElementById('teachTip').addEventListener('click', () => Teach.dismiss());
document.getElementById('startBtn').addEventListener('click', () => {
  if (performance.now() - (Intro.endedAt || 0) < 400) return;   // the skip click must not also start the run
  Snd.init();
  document.getElementById('startScreen').classList.add('hidden');
  beginRun();
});
document.getElementById('restartBtn').addEventListener('click', () => {
  Snd.init();
  document.getElementById('gameoverScreen').classList.add('hidden');
  beginRun();
});
document.getElementById('resetSaveBtn').addEventListener('click', resetSave);
document.getElementById('resetSaveBtn2').addEventListener('click', resetSave);
document.addEventListener('visibilitychange', () => { if (document.hidden) Save.write(true); });

// ---------------- Intro sequence (canonical script: INTRO.md) ----------------
// The FIRST thing that loads. A modular scene on its own clock, drawn with
// canvas primitives (style pass comes later). Any click / key / tap skips to
// the start menu — it never traps the player. It never touches the save.
const BEAT_DURS = [3.5, 11.5, 7, 9, 17, 8, 6, 7, 11, 4, 3, 5, 5];   // sums to 97s — unhurried on purpose
const BEAT_NAMES = ['darkness', 'crawl', 'emperor', 'crime', 'eatrows', 'station',
  'exit', 'vow', 'saloon', 'portal', 'snack', 'walk', 'title'];
const CRAWL_LINES = [
  'IN A GALAXY FAR, FAR AWAY…',
  'THE RULES WERE SIMPLE:',
  'EAT. GROW. SURVIVE.',
  'THE SWARM NEVER STOPS COMING.',
  'BUT EVERY STORY NEEDS A VILLAIN —',
  'THIS ONE BELONGS TO THE EMPEROR.'
];
const NARRATOR_LINES = [
  'NARRATOR: "In a galaxy far, far away…"',
  'NARRATOR: "…the rules were simple…"',
  'NARRATOR: "…eat, grow, survive…"',
  'NARRATOR: "…the swarm never— hey. HEY!"',
  'NARRATOR: "…and so the galax—"',
  'NARRATOR: "…"'
];
// ---- Comic presentation (INTRO.md: "Presentation: comic windows") ----
// The intro plays as framed PANELS on the notebook paper: gutters between
// panels, narration in caption boxes, dialogue in speech bubbles, and the
// page-shift is the transition. Panels are pure presentation — each one is a
// window onto a scene, and their durations sum to the unchanged 97s. (The
// saloon scene gets three panels: the landing, the outside, the inside.)
const PANELS = [
  { scene: 0,  t0: 0, dur: 3.5 },   // 1  darkness
  { scene: 1,  t0: 0, dur: 11.5 },  // 2  crawl
  { scene: 2,  t0: 0, dur: 7 },     // 3  emperor
  { scene: 3,  t0: 0, dur: 9 },     // 4  crime
  { scene: 4,  t0: 0, dur: 17 },    // 5–7 eatrows / the narrator fails / growth
  { scene: 5,  t0: 0, dur: 8 },     // 8  the Death Star
  { scene: 6,  t0: 0, dur: 6 },     // 9  the exit
  { scene: 7,  t0: 0, dur: 7 },     // 10 the vow
  { scene: 8,  t0: 0, dur: 2 },     // 11a the landing
  { scene: 8,  t0: 2, dur: 3 },     // 11b the Salty Dawg, outside
  { scene: 8,  t0: 5, dur: 6 },     // 11c the Salty Dawg, inside
  { scene: 9,  t0: 0, dur: 4 },     // 12 the assassin
  { scene: 10, t0: 0, dur: 3 },     // 13 the snack
  { scene: 11, t0: 0, dur: 5 },     // 14 the walk
  { scene: 12, t0: 0, dur: 5 }      // 15 title
];
const PANEL_CAPTIONS = [
  'FIRST — DARKNESS.',
  'THE LOG OF THE RULES, AND THE STORY:',
  'EVERY STORY NEEDS A VILLAIN.',
  'THE CRIME.',
  null,   // eatrows: the narrator gets his own caption box — and Pac eats it
  'FULLY GROWN, HE EATS THE DEATH STAR.',
  'THE EXIT.',
  'THE VOW.',
  'THE LANDING.',
  'THE LEGENDARY SALTY DAWG SALOON.',
  'SAD. DEPRESSED. DOING SHOTS.',
  'SENT TO KILL HIM.',
  'PAC EATS HIM.',
  'LEATHERS. SHADES. THE WALK.',
  null    // the title panel speaks for itself
];
const PANEL_TRANS = 0.5;   // seconds: the page-shift as a new panel snaps in

function easeOutCubic(p) { return 1 - Math.pow(1 - p, 3); }
function easeInOut(p) { return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; }
function seededRnd(seed) { const x = Math.sin(seed * 127.1) * 43758.5453; return x - Math.floor(x); }

const Intro = {
  active: false, t: 0, timeScale: 1, autoStart: false,
  fired: {}, parts: [], stars: [], debris: [], geomCache: null, geomKey: '',
  endedAt: 0, lastEaten: -1,
  get total() { return BEAT_DURS.reduce((a, b) => a + b, 0); },
  start() {
    this.active = true; this.t = 0; this.fired = {}; this.parts = [];
    this.lastEaten = -1;
    this.stars = [];
    for (let i = 0; i < 110; i++) this.stars.push({ x: Math.random(), y: Math.random(), s: rand(0.6, 1.9), tw: rand(0, TAU) });
    this.debris = [];
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU + rand(-0.25, 0.25);
      this.debris.push({ a, sp: rand(28, 95), size: rand(4, 12), rot: rand(0, TAU), rs: rand(-2.4, 2.4) });
    }
    G.state = 'intro';
    document.body.classList.add('intro-on');
    document.getElementById('startScreen').classList.add('hidden');
  },
  beatAt(t) {
    let acc = 0;
    for (let i = 0; i < BEAT_DURS.length; i++) {
      if (t < acc + BEAT_DURS[i]) return { i, lt: t - acc, d: BEAT_DURS[i] };
      acc += BEAT_DURS[i];
    }
    return { i: BEAT_DURS.length - 1, lt: BEAT_DURS[BEAT_DURS.length - 1], d: BEAT_DURS[BEAT_DURS.length - 1] };
  },
  beatName() { return BEAT_NAMES[this.beatAt(this.t).i]; },
  panelAt(t) {
    let acc = 0;
    for (let i = 0; i < PANELS.length; i++) {
      if (t < acc + PANELS[i].dur) return { idx: i, def: PANELS[i], plt: t - acc };
      acc += PANELS[i].dur;
    }
    const last = PANELS[PANELS.length - 1];
    return { idx: PANELS.length - 1, def: last, plt: last.dur };
  },
  fire(key, fn) { if (!this.fired[key]) { this.fired[key] = 1; fn(); } },
  spawnP(x, y, vx, vy, ttl, color, size, grav) {
    if (this.parts.length > 260) this.parts.shift();
    this.parts.push({ x, y, vx, vy, ttl, max: ttl, color, size, grav: grav || 0 });
  },
  geom() {
    // crawl text layout (per-character offsets so Pac can eat letter by letter)
    const key = VW + 'x' + VH;
    if (this.geomCache && this.geomKey === key) return this.geomCache;
    const fs = clamp(Math.round(VW * 0.026), 16, 26);
    const lineH = clamp(VH * 0.072, 32, 44);
    ctx.save();
    ctx.font = '700 ' + fs + 'px "Courier New", monospace';
    const lines = CRAWL_LINES.map((text) => {
      const offs = [], widths = [];
      let w = 0;
      for (const ch of text) { const cw = ctx.measureText(ch).width; offs.push(w); widths.push(cw); w += cw; }
      return { text, offs, widths, totalW: w, x0: VW / 2 - w / 2 };
    });
    ctx.restore();
    this.geomCache = { fs, lineH, y0: VH * 0.24, lines };
    this.geomKey = key;
    return this.geomCache;
  },
  eatState(lt) {
    // deterministic: which row Pac is on, how many chars are gone, where he is
    const g = this.geom();
    const n = CRAWL_LINES.length;
    const rowDur = BEAT_DURS[4] / n;
    let row = Math.min(n - 1, Math.floor(lt / rowDur));
    const rlt = lt - row * rowDur;
    const prog = clamp(rlt / (rowDur * 0.8), 0, 1);
    const line = g.lines[row];
    const eaten = Math.floor(prog * line.text.length);
    let pacX = line.x0 + (eaten >= line.text.length ? line.totalW : line.offs[eaten]) - 6;
    let pacY = g.y0 + row * g.lineH;
    if (prog >= 1 && row < n - 1) {
      // little hop down to the next row during the last 20% of the slot
      const hp = clamp((rlt - rowDur * 0.8) / (rowDur * 0.2), 0, 1);
      const nl = g.lines[row + 1];
      pacY = pacY + hp * g.lineH - Math.sin(hp * Math.PI) * 12;
      pacX = pacX + (nl.x0 - 6 - pacX) * hp;
    }
    const r = 15 + row * 5 + prog * 3;
    return { row, eaten, pacX, pacY, r, prog };
  },
  update(dt) {
    if (!this.active) return;
    this.t += dt * this.timeScale;
    const b = this.beatAt(this.t);
    const lt = b.lt;
    // ---- one-shot sounds + particle spawns, keyed to beats ----
    if (b.i === 2 && lt >= 4.3) this.fire('doit', () => {
      Snd.tone(320, 0.13, 'sawtooth', 0.10, 240);
      Snd.tone(285, 0.13, 'sawtooth', 0.10, 210, 0.14);
      Snd.tone(250, 0.3, 'sawtooth', 0.12, 160, 0.28);
    });
    if (b.i === 3 && lt >= 3.8) this.fire('boom', () => {
      Snd.tone(95, 0.8, 'sine', 0.5, 28);
      Snd.tone(60, 0.9, 'triangle', 0.4, 24, 0.05);
    });
    if (b.i === 4) {
      const es = this.eatState(lt);
      const key = es.row * 100 + es.eaten;
      if (es.eaten > 0 && key !== this.lastEaten) { this.lastEaten = key; Snd.waka(es.eaten % 12); }
    }
    if (b.i === 5) {
      const bite = Math.floor(lt / 0.75);
      if (bite > 0) this.fire('bite' + bite, () => Snd.tone(190, 0.09, 'square', 0.13, 110));
      if (Math.random() < dt * 26) {
        const cx = VW * 0.60, cy = VH * 0.46, R = clamp(VW * 0.155, 90, 150);
        const fx = cx - R + (2 * R) * clamp(lt / b.d, 0, 1);
        this.spawnP(fx + rand(-6, 10), cy + rand(-R * 0.7, R * 0.7), rand(-46, -8), rand(-24, 44),
          rand(0.3, 0.7), '#9aa4b8', rand(1.6, 3.6), 60);
      }
      if (lt >= b.d - 0.7) this.fire('gulp', () => Snd.tone(300, 0.22, 'sine', 0.2, 70));
    }
    if (b.i === 6) {
      if (lt >= 2.1) this.fire('burp', () => {
        Snd.tone(130, 0.16, 'sawtooth', 0.26, 70);
        Snd.tone(105, 0.2, 'sawtooth', 0.26, 55, 0.13);
        Snd.tone(150, 0.3, 'sawtooth', 0.22, 45, 0.28);
      });
      if (lt >= 3.1) this.fire('fart', () => {
        Snd.tone(85, 0.28, 'sawtooth', 0.2, 48);
        Snd.tone(72, 0.34, 'sawtooth', 0.18, 40, 0.16);
      });
      if (lt >= 3.1 && lt < 5.2 && Math.random() < dt * 30) {
        this.spawnP(VW * 0.52 + rand(-4, 4), VH * 0.5 + rand(-8, 8), rand(30, 90), rand(-16, 16),
          rand(0.3, 0.6), 'rgba(120,220,110,0.8)', rand(3, 7), -14);
      }
    }
    if (b.i === 7 && lt >= 1.1) this.fire('vow', () => {
      Snd.tone(146, 0.5, 'sawtooth', 0.13, 138);
      Snd.tone(110, 0.7, 'sawtooth', 0.13, 104, 0.3);
    });
    if (b.i === 7 && Math.random() < dt * 22) {
      const p = qwingPos(lt);
      this.spawnP(p.x - 34, p.y + 12, rand(-24, -8), rand(-4, 8), rand(0.25, 0.5),
        'rgba(170,180,200,0.6)', rand(2, 4.4), 0);
    }
    if (b.i === 9 && Math.random() < dt * 9) Snd.tone(1400 + Math.random() * 900, 0.03, 'square', 0.018);
    if (b.i === 10) {
      const bite = Math.floor(lt / 0.55);
      if (bite > 0 && lt > 0.9) this.fire('snackbite' + bite, () => Snd.waka(8));
    }
    if (b.i === 12 && lt >= 0.4) this.fire('sting', () => {
      const seq = [392, 523, 659, 784];
      for (let i = 0; i < seq.length; i++) Snd.tone(seq[i], 0.16, 'triangle', 0.13, null, i * 0.1);
    });
    // ---- particles ----
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.ttl -= dt;
      if (p.ttl <= 0) { this.parts.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.grav * dt;
    }
    if (this.t >= this.total) endIntro();
  }
};
function qwingPos(lt) {
  const p = easeInOut(clamp(lt / 5.2, 0, 1));
  return { x: VW * (0.10 + 0.74 * p), y: VH * 0.38 + Math.sin(lt * 2.3) * 14 };
}
function endIntro() {
  if (G.state !== 'intro') return;
  Intro.active = false;
  Intro.endedAt = performance.now();
  try { Snd.init(); } catch (e) {}
  document.body.classList.remove('intro-on');
  if (Intro.autoStart) {
    document.getElementById('startScreen').classList.add('hidden');
    beginRun();
  } else {
    G.state = 'menu';
    document.getElementById('startScreen').classList.remove('hidden');
  }
}
window.addEventListener('pointerdown', () => {
  if (Teach.active) { Teach.dismiss(); return; }   // a tap/click anywhere dismisses a first-sight lesson
  if (G.state === 'intro') endIntro();
});
canvas.addEventListener('touchstart', () => { if (G.state === 'intro') endIntro(); }, { passive: true });

// ---- intro drawing helpers ----
function drawIntroBG(c0, c1) {
  const bg = ctx.createLinearGradient(0, 0, 0, VH);
  bg.addColorStop(0, c0); bg.addColorStop(1, c1);
  ctx.fillStyle = bg; ctx.fillRect(0, 0, VW, VH);
}
function drawIntroStars(alpha) {
  ctx.save();
  for (const s of Intro.stars) {
    ctx.globalAlpha = alpha * (0.45 + 0.55 * Math.abs(Math.sin(animT * 1.4 + s.tw)));
    ctx.fillStyle = '#cfd8ff';
    ctx.beginPath(); ctx.arc(s.x * VW, s.y * VH, s.s, 0, TAU); ctx.fill();
  }
  ctx.restore();
}
function drawPage(alpha) {
  const w = Math.min(VW * 0.86, 920), h = VH * 0.82;
  const x = VW / 2 - w / 2, y = VH * 0.09;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#ddd6c2';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(70,110,180,0.28)'; ctx.lineWidth = 1;
  ctx.beginPath();
  for (let ly = y + 34; ly < y + h - 8; ly += 34) { ctx.moveTo(x + 8, ly); ctx.lineTo(x + w - 8, ly); }
  ctx.stroke();
  ctx.strokeStyle = 'rgba(220,80,80,0.35)';
  ctx.beginPath(); ctx.moveTo(x + 46, y + 6); ctx.lineTo(x + 46, y + h - 6); ctx.stroke();
  ctx.restore();
  return { x, y, w, h };
}
// ---- comic stage helpers: panels on the notebook paper ----
function panelRect() {
  // the panel lives on the page (same footprint drawPage uses), with paper
  // gutters on every side; it keeps the screen's aspect so scene art drawn in
  // virtual VW×VH coords maps in undistorted
  const pageW = Math.min(VW * 0.86, 920), pageH = VH * 0.82;
  const pageX = VW / 2 - pageW / 2, pageY = VH * 0.09;
  let w = pageW - 52, h = w * (VH / VW);
  const maxH = pageH - 44;
  if (h > maxH) { h = maxH; w = h * (VW / VH); }
  return { x: VW / 2 - w / 2, y: pageY + (pageH - h) / 2, w, h };
}
function tracePanelPath(r, seed, grow) {
  // a rectangle the way a hand draws it: corners and edge-midpoints nudged by
  // seeded amounts, so the wobble is the panel's own and never flickers
  const g = grow || 0;
  const x0 = r.x - g, y0 = r.y - g, x1 = r.x + r.w + g, y1 = r.y + r.h + g;
  const j = (n, amt) => (seededRnd(seed * 97.3 + n * 13.7) - 0.5) * amt;
  const pts = [
    [x0 + j(1, 3), y0 + j(2, 3)], [(x0 + x1) / 2 + j(3, 4), y0 + j(4, 2.5)],
    [x1 + j(5, 3), y0 + j(6, 3)], [x1 + j(7, 2.5), (y0 + y1) / 2 + j(8, 4)],
    [x1 + j(9, 3), y1 + j(10, 3)], [(x0 + x1) / 2 + j(11, 4), y1 + j(12, 2.5)],
    [x0 + j(13, 3), y1 + j(14, 3)], [x0 + j(15, 2.5), (y0 + y1) / 2 + j(16, 4)]
  ];
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
}
function strokePanelFrame(r, seed) {
  // double-inked border: one bold pass, one thinner pass just outside it
  ctx.save();
  ctx.strokeStyle = '#23232f'; ctx.lineWidth = 5;
  tracePanelPath(r, seed, 0); ctx.stroke();
  ctx.strokeStyle = 'rgba(35,35,47,0.5)'; ctx.lineWidth = 1.6;
  tracePanelPath(r, seed + 40, 4); ctx.stroke();
  ctx.restore();
}
function drawPanelPaper(alpha) {
  // notebook paper filling the whole (virtual) panel: panel interiors that
  // are "on the page" — the crawl, the text-eating — use this
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#ddd6c2';
  ctx.fillRect(0, 0, VW, VH);
  ctx.strokeStyle = 'rgba(70,110,180,0.28)'; ctx.lineWidth = 1;
  ctx.beginPath();
  for (let ly = 34; ly < VH - 8; ly += 34) { ctx.moveTo(8, ly); ctx.lineTo(VW - 8, ly); }
  ctx.stroke();
  ctx.strokeStyle = 'rgba(220,80,80,0.35)';
  ctx.beginPath(); ctx.moveTo(46, 6); ctx.lineTo(46, VH - 6); ctx.stroke();
  ctx.restore();
}
function drawCaptionBox(r, text, appear) {
  // the rectangular narration box, top-left of the panel: cream paper, ink
  // frame, serif caps — the voice of the comic itself
  if (!text || appear <= 0) return;
  ctx.save();
  ctx.globalAlpha = clamp(appear, 0, 1);
  ctx.font = '700 ' + clamp(r.w * 0.02, 12, 16.5) + 'px Georgia, serif';
  const bw = ctx.measureText(text).width + 22, bh = 30;
  const bx = r.x + 14, by = r.y + 14 - (1 - clamp(appear, 0, 1)) * 6;
  ctx.fillStyle = '#f6f0da';
  ctx.fillRect(bx, by, bw, bh);
  ctx.strokeStyle = '#23232f'; ctx.lineWidth = 2.2;
  ctx.strokeRect(bx, by, bw, bh);
  ctx.strokeStyle = 'rgba(35,35,47,0.5)'; ctx.lineWidth = 1;
  ctx.strokeRect(bx - 2.5, by - 2.5, bw + 5, bh + 5);
  ctx.fillStyle = '#23232f';
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(text, bx + 11, by + bh / 2 + 1);
  ctx.restore();
}
function drawNarratorBox(r, es, appear) {
  // The narrator reads from his own caption box at the panel's top-left —
  // and Pac eats the box along with the text: each row, the box's right edge
  // is chewed away in step with the row being eaten, until nothing is left
  // to narrate with. By the last row there is only "…", then silence.
  if (appear <= 0) return;
  const line = NARRATOR_LINES[es.row];
  ctx.save();
  ctx.font = 'italic 700 ' + clamp(r.w * 0.02, 12, 16.5) + 'px Georgia, serif';
  const fullW = ctx.measureText(line).width + 22, bh = 30;
  const rowLen = Math.max(1, CRAWL_LINES[es.row].length);
  const remain = fullW * (1 - clamp(es.eaten / rowLen, 0, 1));
  ctx.globalAlpha = clamp(appear, 0, 1);
  if (remain > 26) {
    const bx = r.x + 14, by = r.y + 14;
    ctx.fillStyle = '#f6f0da';
    ctx.fillRect(bx, by, remain, bh);
    ctx.strokeStyle = '#23232f'; ctx.lineWidth = 2.2;
    ctx.strokeRect(bx, by, remain, bh);
    ctx.save();
    ctx.beginPath(); ctx.rect(bx, by, remain, bh); ctx.clip();
    ctx.fillStyle = '#23232f';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(line, bx + 11, by + bh / 2 + 1);
    ctx.restore();
    // the bite marks on the eaten edge
    ctx.fillStyle = '#ddd6c2';
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.arc(bx + remain + 1, by + 6 + k * 9, 3.4, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}
function drawPanel(def, idx, plt, dx, r) {
  // one framed panel: scene art clipped inside, the ink frame on top
  const lt = def.t0 + plt;
  ctx.save();
  ctx.fillStyle = 'rgba(20,16,8,0.35)';
  ctx.fillRect(r.x + dx + 6, r.y + 7, r.w, r.h);
  ctx.beginPath(); ctx.rect(r.x + dx, r.y, r.w, r.h); ctx.clip();
  ctx.translate(r.x + dx, r.y);
  ctx.scale(r.w / VW, r.h / VH);
  renderIntroScene(def.scene, lt);
  ctx.restore();
  strokePanelFrame({ x: r.x + dx, y: r.y, w: r.w, h: r.h }, idx + 1);
}

function spotlight(alpha) {
  // stage-light wash: bright pool in the middle, darkness at the edges
  const r = Math.max(VW, VH) * 0.62;
  const g = ctx.createRadialGradient(VW / 2, VH * 0.42, r * 0.12, VW / 2, VH * 0.42, r);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(0.55, 'rgba(0,0,4,' + (0.45 * alpha) + ')');
  g.addColorStop(1, 'rgba(0,0,6,' + (0.93 * alpha) + ')');
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  ctx.save();
  ctx.globalAlpha = 0.06 * alpha;
  ctx.fillStyle = '#fff2c0';
  ctx.beginPath();
  ctx.moveTo(VW / 2 - 26, -10); ctx.lineTo(VW / 2 + 26, -10);
  ctx.lineTo(VW / 2 + VW * 0.30, VH * 0.86); ctx.lineTo(VW / 2 - VW * 0.30, VH * 0.86);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}
function drawIntroPac(x, y, r, angle, mouth, o) {
  o = o || {};
  ctx.save();
  ctx.translate(x, y);
  if (o.tilt) ctx.rotate(o.tilt);
  if (o.leather) {
    ctx.save();
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.clip();
    ctx.fillStyle = o.color || '#ffd21f';
    ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.fillStyle = '#15151c';
    ctx.fillRect(-r, r * 0.08, r * 2, r * 1.05);
    ctx.strokeStyle = '#c8ccd8'; ctx.lineWidth = Math.max(1.6, r * 0.06);
    ctx.beginPath(); ctx.moveTo(0, r * 0.12); ctx.lineTo(0, r * 1.05); ctx.stroke();
    ctx.restore();
  } else {
    ctx.fillStyle = o.color || '#ffd21f';
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
  }
  if (o.flat) {
    // sad: droopy eye + tiny flat mouth
    ctx.fillStyle = '#1c1c26';
    ctx.beginPath(); ctx.arc(r * 0.28, -r * 0.18, Math.max(1.6, r * 0.09), 0, TAU); ctx.fill();
    ctx.strokeStyle = '#1c1c26'; ctx.lineWidth = Math.max(1.6, r * 0.07);
    ctx.beginPath(); ctx.moveTo(r * 0.14, r * 0.3); ctx.lineTo(r * 0.46, r * 0.3); ctx.stroke();
  } else {
    ctx.fillStyle = '#04040c';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, r + 1.5, angle + mouth, angle + TAU - mouth);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#1c1c26';
    ctx.beginPath(); ctx.arc(r * 0.18, -r * 0.44, Math.max(1.6, r * 0.1), 0, TAU); ctx.fill();
  }
  if (o.shades) {
    ctx.fillStyle = '#0a0a10';
    const sw = r * 1.24, sh = r * 0.4;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(-sw / 2, -r * 0.58, sw, sh, sh * 0.4); else ctx.rect(-sw / 2, -r * 0.58, sw, sh);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(-sw * 0.28, -r * 0.34); ctx.lineTo(-sw * 0.02, -r * 0.52); ctx.stroke();
  }
  ctx.restore();
}
function drawStationShape(cx, cy, R) {
  const g = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.3, R * 0.2, cx, cy, R);
  g.addColorStop(0, '#c3cad8'); g.addColorStop(1, '#767f92');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(20,24,36,0.55)'; ctx.lineWidth = Math.max(2, R * 0.045);
  ctx.beginPath(); ctx.moveTo(cx - R, cy + R * 0.08); ctx.lineTo(cx + R, cy + R * 0.08); ctx.stroke();
  ctx.fillStyle = '#596274';
  ctx.beginPath(); ctx.arc(cx - R * 0.34, cy - R * 0.32, R * 0.3, 0, TAU); ctx.fill();
  ctx.fillStyle = '#39404f';
  ctx.beginPath(); ctx.arc(cx - R * 0.34, cy - R * 0.32, R * 0.16, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(30,36,50,0.5)';
  for (let i = 0; i < 7; i++) {
    ctx.beginPath();
    ctx.arc(cx + Math.cos(i * 2.4) * R * 0.62, cy + Math.sin(i * 2.4) * R * 0.62, R * 0.045, 0, TAU);
    ctx.fill();
  }
}
function drawBomberGuy(x, y, s, fistUp) {
  ctx.save();
  ctx.translate(x, y);
  // cape
  ctx.fillStyle = '#0b0b12';
  ctx.beginPath();
  ctx.moveTo(-6 * s, -2 * s);
  ctx.quadraticCurveTo(-20 * s, 12 * s, -13 * s, 30 * s);
  ctx.lineTo(2 * s, 22 * s); ctx.closePath(); ctx.fill();
  // body
  ctx.fillStyle = '#23232e';
  ctx.fillRect(-7 * s, 2 * s, 14 * s, 18 * s);
  // bomb in hand
  ctx.fillStyle = '#101018';
  ctx.beginPath(); ctx.arc(11 * s, 14 * s, 6 * s, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#ffd93b'; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(11 * s, 8 * s); ctx.quadraticCurveTo(14 * s, 3 * s, 17 * s, 5 * s); ctx.stroke();
  ctx.fillStyle = '#ffdf6b';
  ctx.beginPath(); ctx.arc(17 * s, 5 * s, 1.8 * s, 0, TAU); ctx.fill();
  // helmet
  ctx.fillStyle = '#e8ecf4';
  ctx.beginPath(); ctx.arc(0, -8 * s, 11.5 * s, 0, TAU); ctx.fill();
  ctx.fillStyle = '#f2c49b';
  ctx.beginPath(); ctx.arc(0, -4.5 * s, 7.5 * s, 0, TAU); ctx.fill();
  ctx.fillStyle = '#14141c';
  ctx.beginPath(); ctx.arc(-2.8 * s, -5 * s, 1.3 * s, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(2.8 * s, -5 * s, 1.3 * s, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#14141c'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-5 * s, -9.5 * s); ctx.lineTo(-1 * s, -8 * s); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(5 * s, -9.5 * s); ctx.lineTo(1 * s, -8 * s); ctx.stroke();
  if (fistUp) {
    ctx.fillStyle = '#f2c49b';
    ctx.beginPath(); ctx.arc(-13 * s, -12 * s + Math.sin(animT * 26) * 1.6 * s, 4.6 * s, 0, TAU); ctx.fill();
  }
  ctx.restore();
}
function drawSpeech(x, y, text, size, color, opts) {
  // a COMIC speech bubble: white balloon, ink border, and a tail that points
  // at the speaker (opts.tail: 'down' by default, 'up' when the bubble hangs
  // below the speaker; opts.tailDx leans the tail sideways)
  opts = opts || {};
  ctx.save();
  ctx.font = '800 ' + size + 'px "Segoe UI", sans-serif';
  const w = ctx.measureText(text).width + 34;
  const h = size * 1.75;
  const bx = x - w / 2, by = y - h / 2;
  ctx.fillStyle = '#fffdf2';
  ctx.strokeStyle = '#14141c'; ctx.lineWidth = 2.4;
  // tail first, so the balloon body covers its base
  ctx.beginPath();
  if (opts.tail === 'up') {
    ctx.moveTo(x - 9, by + 2); ctx.lineTo(x + 9, by + 2);
    ctx.lineTo(x + (opts.tailDx || 0), by - size * 0.9);
  } else {
    ctx.moveTo(x - 9, by + h - 2); ctx.lineTo(x + 9, by + h - 2);
    ctx.lineTo(x + (opts.tailDx || 0), by + h + size * 0.9);
  }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(bx, by, w, h, size * 0.55); else ctx.rect(bx, by, w, h);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = color || '#14141c';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y + 1);
  ctx.restore();
}
function drawIntroParts() {
  for (const p of Intro.parts) {
    ctx.globalAlpha = Math.max(0, p.ttl / p.max);
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ---- intro scene renderer: ONE beat-group, drawn in virtual full-screen ----
// coords. The comic stage (Intro.render, below) frames it inside a panel.
function renderIntroScene(i, lt) {
  const d = BEAT_DURS[i];
  const U = Math.min(VW, VH);

  if (i === 0) {
    // 1 — Darkness. The spotlight snaps on.
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, VW, VH);
    if (lt > 1.0) {
      const snap = clamp((lt - 1.0) / 0.18, 0, 1);
      const flick = (lt < 1.35 && Math.random() < 0.4) ? 0.55 : 1;
      drawPanelPaper(0.55 * snap * flick);
      spotlight((1 - 0.25 * snap) * flick);
    }
  } else if (i === 1) {
    // 2 — The crawl rises through the light, line by line, into its rows.
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, VW, VH);
    drawPanelPaper(0.92);
    const g = Intro.geom();
    ctx.font = '700 ' + g.fs + 'px "Courier New", monospace';
    ctx.textAlign = 'left';
    for (let i = 0; i < g.lines.length; i++) {
      const at = i * 1.8;
      const l2 = lt - at;
      if (l2 < 0) continue;
      const line = g.lines[i];
      const ty = g.y0 + i * g.lineH;
      const y = ty + (VH * 0.94 - ty) * (1 - easeOutCubic(clamp(l2 / 2.1, 0, 1)));
      ctx.save();
      ctx.globalAlpha = clamp(l2 / 1.1, 0, 1);
      ctx.fillStyle = '#e8b93b';
      ctx.shadowColor = 'rgba(255,200,40,0.5)'; ctx.shadowBlur = 7;
      ctx.fillText(line.text, line.x0, y);
      ctx.restore();
    }
    ctx.textAlign = 'center';
    spotlight(0.75);
  } else if (i === 2) {
    // 3 — The Emperor. He laughs. He says the word.
    drawIntroBG('#05050d', '#010104');
    drawIntroStars(0.5);
    spotlight(0.85);
    const cx = VW / 2, cy = VH * 0.46, s = U / 340;
    const fadeIn = clamp(lt / 1.6, 0, 1);
    ctx.save();
    ctx.globalAlpha = fadeIn;
    const shake = (lt > 2 && lt < 4.3) ? Math.sin(animT * 30) * 2 : 0;
    ctx.translate(shake, 0);
    // cloak
    ctx.fillStyle = '#0d0d18';
    ctx.strokeStyle = '#33334e'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 84 * s);
    ctx.quadraticCurveTo(cx + 62 * s, cy - 30 * s, cx + 74 * s, cy + 96 * s);
    ctx.quadraticCurveTo(cx, cy + 78 * s, cx - 74 * s, cy + 96 * s);
    ctx.quadraticCurveTo(cx - 62 * s, cy - 30 * s, cx, cy - 84 * s);
    ctx.fill(); ctx.stroke();
    // hood + face void
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(cx, cy - 38 * s, 31 * s, 35 * s, 0, 0, TAU); ctx.fill();
    // glowing eyes
    ctx.save();
    ctx.shadowColor = '#ffd93b'; ctx.shadowBlur = 14;
    ctx.fillStyle = '#ffd93b';
    ctx.beginPath(); ctx.ellipse(cx - 11 * s, cy - 40 * s, 5.4 * s, 2.8 * s, 0.25, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + 11 * s, cy - 40 * s, 5.4 * s, -0.25, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.restore();
    if (lt > 2) {
      ctx.save();
      ctx.globalAlpha = clamp((lt - 2) / 0.6, 0, 1);
      ctx.font = '700 ' + clamp(U * 0.045, 18, 30) + 'px "Courier New", monospace';
      ctx.fillStyle = '#9fb0ff';
      const dots = lt < 2.8 ? 'HA…' : (lt < 3.6 ? 'HA… HA…' : 'HA… HA… HA…');
      ctx.fillText(dots, cx, cy - 128 * s);
      ctx.restore();
    }
    if (lt >= 4.3) drawSpeech(cx, cy + 148 * s, 'DO IT.', clamp(U * 0.055, 22, 38), '#a01616', { tail: 'up' });
  } else if (i === 3) {
    // 4 — The crime: the Death Star takes out an arcade-booth planet.
    drawIntroBG('#04040e', '#010103');
    drawIntroStars(0.85);
    const sx = VW * 0.76, sy = VH * 0.28, SR = clamp(VW * 0.075, 46, 84);
    drawStationShape(sx, sy, SR);
    drawBomberGuy(sx - SR - 44, sy + SR * 0.55, 1.05, lt >= 5.4);
    const px = VW * 0.30, py = VH * 0.58, PR = 52;
    const boomT = 3.9;
    if (lt < boomT) {
      // planet + its little arcade booths
      const g = ctx.createRadialGradient(px - 16, py - 16, 8, px, py, PR);
      g.addColorStop(0, '#4dd0a6'); g.addColorStop(1, '#1d6f8e');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(px, py, PR, 0, TAU); ctx.fill();
      ctx.fillStyle = '#123a4d';
      for (let k = 0; k < 4; k++) {
        const a = -2.2 + k * 0.55;
        const bx = px + Math.cos(a) * (PR - 4), by = py + Math.sin(a) * (PR - 4);
        ctx.fillRect(bx - 5, by - 12, 10, 13);
        ctx.fillStyle = '#7de8ff'; ctx.fillRect(bx - 3, by - 10, 6, 6);
        ctx.fillStyle = '#123a4d';
      }
      if (lt >= 3.0) {
        // the beam
        const p = clamp((lt - 3.0) / (boomT - 3.0), 0, 1);
        const bx = sx - SR * 0.34, by = sy - SR * 0.32;
        ctx.save();
        ctx.strokeStyle = 'rgba(120,255,140,0.9)';
        ctx.shadowColor = '#5eff7a'; ctx.shadowBlur = 16;
        ctx.lineWidth = 2 + 5 * p;
        ctx.beginPath(); ctx.moveTo(bx, by);
        ctx.lineTo(bx + (px - bx) * p, by + (py - by) * p);
        ctx.stroke();
        ctx.restore();
      }
    } else {
      const et = lt - boomT;
      if (et < 0.55) {
        ctx.save();
        ctx.globalAlpha = 1 - et / 0.55;
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(px, py, PR + et * 300, 0, TAU); ctx.fill();
        ctx.restore();
      }
      ctx.save();
      ctx.translate(rand(-1, 1) * Math.max(0, 7 - et * 6), rand(-1, 1) * Math.max(0, 7 - et * 6));
      for (const db of Intro.debris) {
        const dx = px + Math.cos(db.a) * db.sp * et, dy = py + Math.sin(db.a) * db.sp * et + et * et * 22;
        ctx.save();
        ctx.translate(dx, dy); ctx.rotate(db.rot + db.rs * et);
        ctx.globalAlpha = clamp(1.4 - et * 0.55, 0, 1);
        ctx.fillStyle = '#2e8f74';
        ctx.fillRect(-db.size / 2, -db.size / 2, db.size, db.size * 0.72);
        ctx.restore();
      }
      ctx.restore();
    }
  } else if (i === 4) {
    // 5–7 — Pac's entrance: he eats the crawl row by row, the narrator fails, he GROWS.
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, VW, VH);
    drawPanelPaper(0.92);
    const g = Intro.geom();
    const es = Intro.eatState(lt);
    ctx.font = '700 ' + g.fs + 'px "Courier New", monospace';
    for (let i = 0; i < g.lines.length; i++) {
      const line = g.lines[i];
      const y = g.y0 + i * g.lineH;
      ctx.save();
      ctx.textAlign = 'left';
      if (i < es.row) { ctx.restore(); continue; }              // fully eaten rows are gone
      ctx.fillStyle = '#e8b93b';
      ctx.shadowColor = 'rgba(255,200,40,0.5)'; ctx.shadowBlur = 7;
      const from = (i === es.row) ? es.eaten : 0;
      for (let c = from; c < line.text.length; c++) ctx.fillText(line.text[c], line.x0 + line.offs[c], y);
      ctx.restore();
    }
    ctx.textAlign = 'center';
    // tumble-in for the first 0.8s, then settle onto the current row
    let px2 = es.pacX, py2 = es.pacY, ang = 0;
    if (lt < 0.8) {
      const p = easeOutCubic(lt / 0.8);
      px2 = VW * 0.08 + (es.pacX - VW * 0.08) * p;
      py2 = VH * 0.08 + (es.pacY - VH * 0.08) * p - Math.sin(p * Math.PI) * 30;
      ang = p * TAU * 2;
    }
    const mouth = 0.25 + (0.5 + 0.5 * Math.sin(animT * 22)) * 0.85;
    drawIntroPac(px2, py2, es.r, 0, mouth, {});
    if (ang) { /* spin conveyed by the arc of the tumble itself */ }
    // the narrator fails in real time — from his caption box in the panel
    // layer (Intro.render), which Pac is eating along with the text
    spotlight(0.75);
  } else if (i === 5) {
    // 8 — Fully grown, he eats the entire Death Star.
    drawIntroBG('#05050f', '#010103');
    drawIntroStars(0.8);
    const cx = VW * 0.60, cy = VH * 0.46, R = clamp(VW * 0.155, 90, 150);
    const fx = cx - R + 2 * R * clamp(lt / d, 0, 1);
    drawStationShape(cx, cy, R);
    // punched-out bites along the eating frontier
    ctx.fillStyle = '#05050f';
    for (let k = 0; k <= 13; k++) {
      ctx.beginPath();
      ctx.arc(fx + Math.sin(k * 2.1) * 7, cy - R + (2 * R * k) / 13, 15 + R * 0.05, 0, TAU);
      ctx.fill();
    }
    const gulp = lt >= d - 0.7 ? 1 + Math.sin(clamp((lt - (d - 0.7)) / 0.7, 0, 1) * Math.PI) * 0.1 : 1;
    const mouth = 0.25 + (0.5 + 0.5 * Math.sin(animT * 16)) * 0.95;
    drawIntroPac(fx - 58 * gulp, cy, 56 * gulp, 0, mouth, {});
    if (lt >= d - 0.7) {
      ctx.save();
      ctx.font = '900 ' + clamp(U * 0.06, 24, 44) + 'px "Segoe UI", sans-serif';
      ctx.fillStyle = '#ffe93b';
      ctx.fillText('GULP.', VW / 2, VH * 0.13);
      ctx.restore();
    }
  } else if (i === 6) {
    // 9 — The burp. Then he farts himself into a black hole. (That's travel.)
    drawIntroBG('#030309', '#000');
    drawIntroStars(0.55);
    const cx = VW * 0.52, cy = VH * 0.5;
    if (lt < 2.1) {
      const swell = 1 + Math.sin(clamp(lt / 2.1, 0, 1) * Math.PI * 0.5) * 0.16;
      drawIntroPac(cx, cy, 58 * swell, Math.PI, 0.06, {});
    } else if (lt < 3.1) {
      const shakeAmp = Math.max(0, 9 - (lt - 2.1) * 9);
      ctx.save();
      ctx.translate(rand(-shakeAmp, shakeAmp), rand(-shakeAmp, shakeAmp));
      drawIntroPac(cx, cy, 64, Math.PI, 0.1, {});
      ctx.restore();
      ctx.save();
      ctx.font = '900 ' + clamp(U * 0.11, 44, 84) + 'px "Segoe UI", sans-serif';
      ctx.fillStyle = '#ffe93b';
      ctx.strokeStyle = '#ff5e3a'; ctx.lineWidth = 3;
      const bp = 1 + Math.sin(clamp((lt - 2.1) / 0.5, 0, 1) * Math.PI) * 0.12;
      ctx.translate(VW / 2, VH * 0.2); ctx.scale(bp, bp);
      ctx.strokeText('BURP!', 0, 0); ctx.fillText('BURP!', 0, 0);
      ctx.restore();
    } else {
      // black hole opens left; Pac is fart-propelled backwards into it
      const hx = VW * 0.22, hy = VH * 0.5;
      const hp = clamp((lt - 3.1) / 0.7, 0, 1);
      const holeR = 88 * hp * (lt > 5.2 ? Math.max(0, 1 - (lt - 5.2) / 0.8) : 1);
      if (holeR > 0.5) {
        ctx.save();
        ctx.translate(hx, hy);
        const swirl = ctx.createRadialGradient(0, 0, 2, 0, 0, holeR);
        swirl.addColorStop(0, '#000');
        swirl.addColorStop(0.55, 'rgba(10,4,24,0.95)');
        swirl.addColorStop(0.8, 'rgba(120,60,220,0.5)');
        swirl.addColorStop(1, 'rgba(120,60,220,0)');
        ctx.fillStyle = swirl;
        ctx.beginPath(); ctx.arc(0, 0, holeR, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(190,140,255,0.7)'; ctx.lineWidth = 2.4;
        for (let k = 0; k < 3; k++) {
          ctx.beginPath();
          ctx.arc(0, 0, holeR * (0.45 + k * 0.2), animT * (2 + k) + k * 2.1, animT * (2 + k) + k * 2.1 + 3.6);
          ctx.stroke();
        }
        ctx.restore();
      }
      if (lt < 5.2) {
        const p = easeInOut(clamp((lt - 3.1) / 2.1, 0, 1));
        const px3 = cx + (hx - cx) * p, py3 = cy + (hy - cy) * p;
        const spin = p * TAU * 1.5;
        ctx.save();
        ctx.translate(px3, py3); ctx.rotate(spin);
        drawIntroPac(0, 0, 58 * (1 - p * 0.75), Math.PI, 0.3, {});
        ctx.restore();
      }
    }
  } else if (i === 7) {
    // 10 — The vow: Darth Bomberguy escapes in the Q-Wing and swears the hunt.
    drawIntroBG('#02020a', '#000');
    drawIntroStars(0.9);
    const p = qwingPos(lt);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(Math.sin(lt * 3.1) * 0.07);
    // the Q-Wing: a stupid-looking ship shaped like the letter Q
    ctx.strokeStyle = '#aeb8cc'; ctx.lineWidth = 11;
    ctx.beginPath(); ctx.arc(0, 0, 27, 0, TAU); ctx.stroke();
    ctx.lineWidth = 10;
    ctx.beginPath(); ctx.moveTo(16, 16); ctx.lineTo(38, 40); ctx.stroke();
    ctx.fillStyle = '#69738a';
    ctx.beginPath(); ctx.moveTo(38, 40); ctx.lineTo(26, 42); ctx.lineTo(36, 28); ctx.closePath(); ctx.fill();
    // cockpit bubble with the villain inside, fist shaking
    ctx.fillStyle = 'rgba(165,205,255,0.5)';
    ctx.beginPath(); ctx.arc(-3, -5, 13, 0, TAU); ctx.fill();
    ctx.fillStyle = '#e8ecf4';
    ctx.beginPath(); ctx.arc(-3, -4, 6.4, 0, TAU); ctx.fill();
    ctx.fillStyle = '#14141c';
    ctx.beginPath(); ctx.arc(-4.6, -4.5, 1.1, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(-1.4, -4.5, 1.1, 0, TAU); ctx.fill();
    if (lt >= 1.1) {
      ctx.fillStyle = '#f2c49b';
      ctx.beginPath(); ctx.arc(-16, -20 + Math.sin(animT * 26) * 2, 5, 0, TAU); ctx.fill();
    }
    ctx.restore();
    if (lt >= 1.1) {
      // the vow, sworn from the cockpit: a speech bubble under the Q-Wing,
      // its tail pointing up at the ship
      ctx.save();
      ctx.globalAlpha = clamp((lt - 1.1) / 0.8, 0, 1);
      drawSpeech(clamp(p.x, VW * 0.2, VW * 0.8), p.y + clamp(VH * 0.17, 90, 130),
        'I WILL HUNT YOU DOWN.', clamp(VW * 0.026, 17, 27), '#a01616', { tail: 'up' });
      ctx.restore();
    }
  } else if (i === 8) {
    // 11 — The landing, the neon saloon, and a very sad Pac at the bar.
    if (lt < 2) {
      // landed planet
      drawIntroBG('#0a0616', '#030208');
      drawIntroStars(0.7);
      ctx.fillStyle = '#3a2b4d';
      ctx.beginPath(); ctx.ellipse(VW / 2, VH * 1.28, VW * 0.72, VH * 0.52, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      for (const cr of [[0.3, 0.86, 34], [0.62, 0.92, 22], [0.78, 0.84, 15]]) {
        ctx.beginPath(); ctx.ellipse(VW * cr[0], VH * cr[1], cr[2], cr[2] * 0.4, 0, 0, TAU); ctx.fill();
      }
      // saloon silhouette, waiting
      ctx.fillStyle = '#17101f';
      ctx.fillRect(VW * 0.58, VH * 0.52, VW * 0.3, VH * 0.28);
      ctx.fillRect(VW * 0.56, VH * 0.47, VW * 0.34, VH * 0.05);
      // black-hole pop + the fall
      const hp = clamp(lt / 1.3, 0, 1);
      const fallY = VH * 0.14 + (VH * 0.72 - VH * 0.14) * hp * hp;
      const bounce = lt > 1.3 ? Math.abs(Math.sin((lt - 1.3) * 7)) * 9 * Math.max(0, 1 - (lt - 1.3) / 0.7) : 0;
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.arc(VW * 0.32, VH * 0.14, 15 * (1 - hp * 0.6), 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(160,110,255,0.7)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(VW * 0.32, VH * 0.14, 20 * (1 - hp * 0.6), animT * 3, animT * 3 + 4); ctx.stroke();
      drawIntroPac(VW * 0.32, fallY - bounce, 17, Math.PI / 2, 0.3, {});
    } else if (lt < 5) {
      drawSaloonExterior(0.9, true);
      // tiny Pac walks to the door and slips inside
      const wp = clamp((lt - 2.2) / 2.0, 0, 1);
      if (wp < 1) drawIntroPac(VW * (0.10 + 0.24 * wp), VH * 0.795, 12.5, 0, 0.35 + 0.3 * Math.sin(animT * 14), {});
    } else {
      // interior: shots with a sad yellow regular
      drawIntroBG('#170b06', '#0a0403');
      ctx.save();
      const lamp = ctx.createRadialGradient(VW / 2, VH * 0.1, 10, VW / 2, VH * 0.1, VW * 0.55);
      lamp.addColorStop(0, 'rgba(255,180,80,0.20)'); lamp.addColorStop(1, 'rgba(255,180,80,0)');
      ctx.fillStyle = lamp; ctx.fillRect(0, 0, VW, VH);
      ctx.restore();
      // bottle shelf
      ctx.fillStyle = '#2a170c'; ctx.fillRect(VW * 0.14, VH * 0.335, VW * 0.72, 7);
      const bottleCols = ['#37e08b', '#ff9a3b', '#4db2ff', '#ff4d7e', '#b6ff5e', '#ffd93b'];
      for (let i = 0; i < 12; i++) {
        const bx = VW * (0.17 + i * 0.058);
        ctx.fillStyle = bottleCols[i % bottleCols.length];
        ctx.globalAlpha = 0.75;
        ctx.fillRect(bx, VH * 0.335 - 27, 11, 27);
        ctx.fillRect(bx + 3, VH * 0.335 - 34, 5, 8);
      }
      ctx.globalAlpha = 1;
      // counter
      ctx.fillStyle = '#6b4423'; ctx.fillRect(VW * 0.1, VH * 0.62, VW * 0.8, VH * 0.09);
      ctx.fillStyle = '#8a5a2e'; ctx.fillRect(VW * 0.1, VH * 0.62, VW * 0.8, 6);
      ctx.fillStyle = '#241207'; ctx.fillRect(VW * 0.1, VH * 0.71, VW * 0.8, VH * 0.29);
      // shot glasses — they empty one by one
      const drinkAt = [6.3, 7.9, 9.5];
      let drinks = 0;
      for (let i = 0; i < 3; i++) {
        const gx = VW * (0.545 + i * 0.045);
        const empty = lt >= drinkAt[i];
        if (empty) drinks++;
        ctx.strokeStyle = 'rgba(220,235,255,0.8)'; ctx.lineWidth = 1.6;
        ctx.strokeRect(gx, VH * 0.585, 13, 17);
        if (!empty) { ctx.fillStyle = '#ffb347'; ctx.fillRect(gx + 1.5, VH * 0.59, 10, 10); }
      }
      // stools
      ctx.fillStyle = '#3a2412';
      for (const fx2 of [0.38, 0.47, 0.56]) { ctx.fillRect(VW * fx2 - 3, VH * 0.66, 6, VH * 0.1); }
      // the sad man himself: slumped a little deeper with every shot
      let tiltNow = 0;
      for (let i = 0; i < 3; i++) if (lt >= drinkAt[i] && lt < drinkAt[i] + 0.45) tiltNow = -0.38 * Math.sin((lt - drinkAt[i]) / 0.45 * Math.PI);
      drawIntroPac(VW * 0.47, VH * 0.575 + drinks * 2.2, 21, 0, 0, {
        flat: true, color: '#d9ba45', tilt: tiltNow + drinks * 0.05
      });
      if (drinks > 0) {
        ctx.save();
        ctx.font = '700 22px Georgia, serif';
        ctx.fillStyle = 'rgba(230,230,240,0.75)';
        ctx.fillText('…', VW * 0.47 + 36, VH * 0.5);
        ctx.restore();
      }
    }
  } else if (i === 9) {
    // 12 — Outside: a crackling portal, and something chrome steps out.
    drawSaloonExterior(0.4, false);
    const gx = VW * 0.71, gy = VH * 0.8;
    // portal
    ctx.save();
    ctx.translate(gx, gy - 62);
    const pulse = 1 + Math.sin(animT * 9) * 0.05;
    ctx.scale(pulse, pulse);
    const pg = ctx.createRadialGradient(0, 0, 2, 0, 0, 62);
    pg.addColorStop(0, 'rgba(220,245,255,0.95)');
    pg.addColorStop(0.55, 'rgba(120,200,255,0.45)');
    pg.addColorStop(1, 'rgba(120,200,255,0)');
    ctx.fillStyle = pg;
    ctx.beginPath(); ctx.ellipse(0, 0, 33, 62, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(200,240,255,0.95)'; ctx.lineWidth = 2;
    const bucket = Math.floor(lt * 11);
    for (let k = 0; k < 4; k++) {
      ctx.beginPath();
      let ax = (seededRnd(bucket * 7 + k * 3) - 0.5) * 56, ay = -58 + k * 34;
      ctx.moveTo(ax, ay);
      for (let sgm = 0; sgm < 3; sgm++) {
        ax += (seededRnd(bucket * 13 + k * 5 + sgm) - 0.5) * 30;
        ay += 12 + seededRnd(bucket * 17 + k + sgm) * 8;
        ctx.lineTo(ax, ay);
      }
      ctx.stroke();
    }
    ctx.restore();
    // the assassin emerges
    const ep = clamp((lt - 0.8) / 1.6, 0, 1);
    if (ep > 0) drawChromeFigure(gx - 74 * ep, gy, 118 * Math.min(1, ep * 1.6), lt > 2.4);
  } else if (i === 10) {
    // 13 — The snack.
    drawSaloonExterior(0.4, false);
    const gx = VW * 0.71 - 74, gy = VH * 0.8;
    if (lt < 2.15) {
      const biteStage = lt < 1.2 ? 1 : (lt < 1.7 ? 0.55 : 0.25);
      drawChromeFigure(gx, gy, 118 * biteStage, false);
    }
    const rush = easeOutCubic(clamp((lt - 0.15) / 0.75, 0, 1));
    const px4 = VW * 0.34 + (gx - 46 - VW * 0.34) * rush;
    const bob = Math.abs(Math.sin(lt * 13)) * (rush < 1 ? 6 : 0);
    const mouth = 0.25 + (0.5 + 0.5 * Math.sin(animT * 20)) * 0.9;
    drawIntroPac(px4, gy - 24 - bob, 24, 0, mouth, {});
    if (lt > 2.15) {
      ctx.save();
      ctx.font = '700 20px Georgia, serif';
      ctx.fillStyle = '#ffe93b';
      ctx.fillText('✦', px4 + 26, gy - 62);
      ctx.restore();
    }
  } else if (i === 11) {
    // 14 — The walk: leathers, shades, and not a care in the world.
    drawSaloonExterior(0.55, false);
    ctx.save();
    ctx.fillStyle = 'rgba(255,190,90,0.20)';
    ctx.beginPath();
    ctx.moveTo(VW * 0.315, VH * 0.8); ctx.lineTo(VW * 0.365, VH * 0.8);
    ctx.lineTo(VW * 0.44, VH * 0.99); ctx.lineTo(VW * 0.26, VH * 0.99);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    const wp = easeInOut(clamp((lt - 0.5) / 4.1, 0, 1));
    const wx = VW * (0.34 + 0.22 * wp);
    const wr = 23 + 17 * wp;
    const bob = Math.abs(Math.sin(lt * 3.4)) * 3.2 * (wp < 1 ? 1 : 0.3);
    drawIntroPac(wx, VH * 0.8 - wr - bob, wr, 0, 0.05, { leather: true, shades: true });
  } else if (i === 12) {
    // 15 — TITLE.
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, VW, VH);
    const fadeOut = lt > d - 0.7 ? clamp((d - lt) / 0.7, 0, 1) : 1;
    ctx.save();
    ctx.globalAlpha = clamp(lt / 0.9, 0, 1) * fadeOut;
    const ts = 0.85 + 0.15 * easeOutCubic(clamp(lt / 1.1, 0, 1));
    ctx.translate(VW / 2, VH * 0.42); ctx.scale(ts, ts);
    ctx.font = '900 ' + clamp(VW * 0.17, 70, 160) + 'px "Segoe UI", sans-serif';
    ctx.fillStyle = '#ff5e3a';
    ctx.fillText('PAC', 6, 6);
    ctx.fillStyle = '#ffe93b';
    ctx.shadowColor = 'rgba(255,220,40,0.55)'; ctx.shadowBlur = 30;
    ctx.fillText('PAC', 0, 0);
    ctx.restore();
    if (lt >= 1.6) {
      ctx.save();
      ctx.globalAlpha = clamp((lt - 1.6) / 0.9, 0, 1) * fadeOut;
      ctx.font = '700 ' + clamp(VW * 0.032, 17, 30) + 'px "Segoe UI", sans-serif';
      ctx.fillStyle = '#c4cbff';
      ctx.fillText('—  J U D G E M E N T   D A Y  —', VW / 2, VH * 0.60);
      ctx.restore();
    }
  }

  drawIntroParts();
}

// ---- the comic stage: the notebook page, and the panel the story lives in ----
Intro.render = function () {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  // darkness beyond the page; the page itself is the stage (dimmer while the
  // first panel is still dark)
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, VW, VH);
  const P = this.panelAt(this.t);
  drawPage(P.idx === 0 ? 0.45 : 1);
  const r = panelRect();
  if (P.idx > 0 && P.plt < PANEL_TRANS) {
    // the page-turn: the old panel slides out left, the new one snaps in —
    // the gap between them is the gutter, and the gutter is paper
    const pr = easeOutCubic(clamp(P.plt / PANEL_TRANS, 0, 1));
    const prev = PANELS[P.idx - 1];
    drawPanel(prev, P.idx - 1, prev.dur, -pr * (r.w * 0.55 + 30), r);
    drawPanel(P.def, P.idx, P.plt, (1 - pr) * (r.w * 0.55 + 30), r);
  } else {
    drawPanel(P.def, P.idx, P.plt, 0, r);
  }
  // the panel's voice: narration box top-left — or, on the eatrows panel,
  // the narrator's own box, which is being eaten along with his lines
  if (P.def.scene === 4) {
    drawNarratorBox(r, this.eatState(P.plt), clamp(P.plt / 0.4, 0, 1));
  } else {
    const a = P.idx === 0 ? clamp(P.plt / 0.5, 0, 1)
      : clamp((P.plt - PANEL_TRANS * 0.6) / 0.5, 0, 1);
    drawCaptionBox(r, PANEL_CAPTIONS[P.idx], a);
  }
  // SKIP affordance — in the page margin, always visible
  ctx.save();
  ctx.globalAlpha = 0.45 + 0.3 * Math.sin(animT * 3);
  ctx.font = '600 13px "Segoe UI", sans-serif';
  ctx.fillStyle = '#aab4ff';
  ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
  ctx.fillText('SKIP ▸▸  click · any key · tap', VW - 16, VH - 14);
  ctx.restore();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
};
function drawSaloonExterior(signGlow, signLit) {
  drawIntroBG('#0a0616', '#030208');
  drawIntroStars(0.65);
  // ground
  ctx.fillStyle = '#241631';
  ctx.fillRect(0, VH * 0.8, VW, VH * 0.2);
  // facade
  ctx.fillStyle = '#4a3226';
  ctx.fillRect(VW * 0.16, VH * 0.30, VW * 0.68, VH * 0.50);
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 1; i < 6; i++) { ctx.moveTo(VW * 0.16, VH * (0.30 + i * 0.083)); ctx.lineTo(VW * 0.84, VH * (0.30 + i * 0.083)); }
  ctx.stroke();
  ctx.fillStyle = '#332216';
  ctx.fillRect(VW * 0.14, VH * 0.26, VW * 0.72, VH * 0.045);
  // windows + door, warm from inside
  ctx.fillStyle = 'rgba(255,176,84,0.85)';
  ctx.fillRect(VW * 0.22, VH * 0.52, VW * 0.09, VH * 0.14);
  ctx.fillRect(VW * 0.68, VH * 0.52, VW * 0.09, VH * 0.14);
  ctx.fillStyle = 'rgba(255,150,60,0.5)';
  ctx.fillRect(VW * 0.315, VH * 0.47, VW * 0.05, VH * 0.33);
  ctx.fillStyle = '#1c0f08';
  ctx.fillRect(VW * 0.325, VH * 0.48, VW * 0.03, VH * 0.32);
  // THE sign
  ctx.fillStyle = '#140d18';
  ctx.fillRect(VW * 0.185, VH * 0.115, VW * 0.63, VH * 0.115);
  ctx.strokeStyle = 'rgba(255,110,199,0.5)'; ctx.lineWidth = 2;
  ctx.strokeRect(VW * 0.185, VH * 0.115, VW * 0.63, VH * 0.115);
  const fs = clamp(VW * 0.0275, 15, 30);
  ctx.save();
  ctx.font = '800 ' + fs + 'px "Segoe UI", sans-serif';
  ctx.textAlign = 'left';
  const line = 'THE LEGENDARY SALTY DAWG SALOON';
  const total = ctx.measureText(line).width;
  let x = VW / 2 - total / 2;
  const y = VH * 0.175;
  const flick = (Math.sin(animT * 31) > 0.93 || (Math.random() < 0.012)) ? 0.25 : 1;
  const parts = ['THE LEGENDARY SALTY DA', 'W', 'G SALOON'];
  for (let i = 0; i < parts.length; i++) {
    const isW = i === 1;
    ctx.save();
    ctx.globalAlpha = signGlow * (isW ? flick : 1);
    ctx.fillStyle = signLit ? '#ff9de2' : '#8a5f7d';
    ctx.shadowColor = '#ff4dc4'; ctx.shadowBlur = signLit ? 17 : 0;
    ctx.fillText(parts[i], x, y);
    ctx.restore();
    x += ctx.measureText(parts[i]).width;
  }
  ctx.restore();
  ctx.textAlign = 'center';
}
function drawChromeFigure(x, groundY, h, scan) {
  if (h <= 2) return;
  const s = h / 118;
  ctx.save();
  ctx.translate(x, groundY);
  const grad = ctx.createLinearGradient(0, -h, 0, 0);
  grad.addColorStop(0, '#eef4ff'); grad.addColorStop(0.45, '#79879c'); grad.addColorStop(0.62, '#d7e2f2'); grad.addColorStop(1, '#5d6a80');
  ctx.fillStyle = grad;
  // legs
  ctx.fillRect(-13 * s, -52 * s, 9 * s, 52 * s);
  ctx.fillRect(4 * s, -52 * s, 9 * s, 52 * s);
  // torso
  ctx.beginPath();
  ctx.moveTo(-15 * s, -96 * s); ctx.lineTo(15 * s, -96 * s);
  ctx.lineTo(11 * s, -50 * s); ctx.lineTo(-11 * s, -50 * s);
  ctx.closePath(); ctx.fill();
  // arms
  ctx.fillRect(-21 * s, -94 * s, 7 * s, 44 * s);
  ctx.fillRect(14 * s, -94 * s, 7 * s, 44 * s);
  // head
  ctx.beginPath(); ctx.ellipse(0, -106 * s, 10.5 * s, 12 * s, 0, 0, TAU); ctx.fill();
  // eyes — cold little slits; they scan
  const look = scan ? Math.sin(animT * 1.8) * 2.4 * s : 0;
  ctx.fillStyle = '#20242e';
  ctx.fillRect(-5.4 * s + look, -108 * s, 4 * s, 1.8 * s);
  ctx.fillRect(1.6 * s + look, -108 * s, 4 * s, 1.8 * s);
  ctx.restore();
}


// ================= v3.0.0 — the 7-stat wheel, spin offers, thresholds, resources =================
// Every number in this section comes from BALANCE.md (see CODE-GUIDE.md for
// the mapping table). Nothing here rewrites the v1/v2 systems: the copy
// layer, ghost AIs, maze, Time Shift, pause and save key are untouched.

// ---- The wheel: 7 stats in wheel order (STR—VIT—SPIRIT—INT—AGI—SPEC—NAT) ----
const WHEEL = [
  { key: 'strength',   name: 'Strength',   color: '#c94c4c', stone: 'Reality' },
  { key: 'vitality',   name: 'Vitality',   color: '#dd7e3f', stone: 'Darkhold' },
  { key: 'spirit',     name: 'Spirit',     color: '#5b8ec4', stone: 'Soul' },
  { key: 'intellect',  name: 'Intellect',  color: '#7d6bb3', stone: 'Mind' },
  { key: 'agility',    name: 'Agility',    color: '#4fa66a', stone: 'Space' },
  { key: 'speciality', name: 'Speciality', color: '#c05a8a', stone: 'Power' },
  { key: 'nature',     name: 'Nature',     color: '#6a9a4f', stone: 'Time' }
];
function wheelIdx(key) { return WHEEL.findIndex((w) => w.key === key); }
// The 7 stones (BALANCE §9B): 6 Infinity Stones + the Darkhold as the 7th,
// each aligned to one stat; a stone buffs its own stat's skills by +15%.
const STONES = [
  { key: 'reality',  name: 'Reality Stone',  stat: 'strength',   color: '#ff3b30' },
  { key: 'darkhold', name: 'The Darkhold',   stat: 'vitality',   color: '#8a5a2e' },
  { key: 'soul',     name: 'Soul Stone',     stat: 'spirit',     color: '#ff9a3b' },
  { key: 'mind',     name: 'Mind Stone',     stat: 'intellect',  color: '#ffd93b' },
  { key: 'space',    name: 'Space Stone',    stat: 'agility',    color: '#4db2ff' },
  { key: 'power',    name: 'Power Stone',    stat: 'speciality', color: '#b06bff' },
  { key: 'time',     name: 'Time Stone',     stat: 'nature',     color: '#37e08b' }
];
// Threshold law (BALANCE §3): stat totals earn increases at these amounts;
// the step counts per threshold are +1,+1,+1,+1,+2,+2,+3 (cumulative).
const THRESHOLDS = [5, 10, 15, 20, 30, 40, 50];
const THRESHOLD_INC = [1, 1, 1, 1, 2, 2, 3];
function thresholdSteps(total) {
  let steps = 0;
  for (let i = 0; i < THRESHOLDS.length; i++) if (total >= THRESHOLDS[i]) steps += THRESHOLD_INC[i];
  return steps;
}
// Build packages (STAT-OUT.md): Pac — STR/S1, resource Rage, sub-stats
// Physical Damage 9 · Crit Physical 7 · Defense 3 · Red Magic 3 → Strength
// total 22 (BALANCE v3 appendix derivation: total = sum of printed sub-stats).
// Partner — Ms. Pac (STAT-OUT featured-adjacent line): SPEC/S3, resource
// Energy, Move Speed 9 · Movement Buff 7 · Ability Power 3 · Rage Magic 3.
const PAC_PACKAGE = { charId: 'pac', charName: 'Pac', color: '#ffd21f', resourceType: 'rage',
  stats: { strength: 22, vitality: 0, spirit: 0, intellect: 0, agility: 0, speciality: 0, nature: 0 } };
const PARTNER_PACKAGE = { charId: 'mspac', charName: 'Ms. Pac', color: '#ff9de2', resourceType: 'energy',
  stats: { strength: 0, vitality: 0, spirit: 0, intellect: 0, agility: 0, speciality: 22, nature: 0 } };
// Team growth step S (BALANCE §12 + v3 appendix): S = 10 levels of team-up
// play per +1 team size — a DRAFT placeholder so the system runs. It is NOT
// the unconfirmed "25" fragment; that remains an owner call.
const TEAM_STEP_LEVELS = 10;
// Resources (BALANCE v3 appendix): one per character; all three behaviours
// exist behind this config — Mana regens and pays for spell-type abilities,
// Energy regens while not exerting and pays for physical exertion, Rage
// builds on dealing/taking damage and decays out of combat.
const RESOURCE_DEFS = {
  rage:   { name: 'RAGE',   color: '#ff5e3a' },
  mana:   { name: 'MANA',   color: '#4db2ff' },
  energy: { name: 'ENERGY', color: '#b6ff5e' }
};
const BURST_COST = 50, BURST_RADIUS = 150;      // BALANCE v3 appendix
const LIGHT_STEP_PX = 40, REVEAL_BASE = 300;    // Light Radius: 1 step = 40px (BALANCE v3 appendix)

// ---- v3 run state (reset in resetGame) ----
const V3 = {
  picksMade: 0, spin: { statIdx: 0, animT: 0, dur: 1.15 },
  stonePicked: false, bossSpawned: false, bossBeaten: false, boss: null,
  pylons: [], barrels: [], danger: [],   // danger = shared telegraph system (boss + triggers)
  explored: new Set(), areaIdx: -1,
  chars: null, partner: null, endlessSelected: false,
  radarTaught: false
};
// Environmental triggers state — see TrigState further below (T1 needs a
// hook inside the v2 swarm curve, so the state object lives here).
const TrigState = { nextRoll: 20, active: null, t1: 0, eliteWindow: 0, ice: 0, cascade: 0, cascadeT: 0, boltT: 0, boltWindow: 0 };
function eliteChance() {
  let base = Save.data.difficulty === 'hard' ? 0.06 : 0.04;   // BALANCE §4 (+ Hard §2)
  if (TrigState.eliteWindow > 0) base *= 3;                    // T5 window (BALANCE trigger appendix)
  return Math.min(0.3, base);
}

// ---- Spin planning (BALANCE §1.1 + FULL-SCOPE spin canon) ----
// Pick 1: the wheel SPINS, weighted by distance from the build centre
// (same 34 · neighbour 22 each · ±2 7 each · far side 8 total, split 4/4
// across the two far seats of a 7-wheel — DRAFT adaptation, CODE-GUIDE).
// Pick 2: lands ±1 from the previous landing, side 50/50.
// Pick 3: lands OPPOSITE (the +3 seat on a 7-wheel — DRAFT convention).
// Picks 4+: the same 3-beat pattern cycles (BALANCE only specifies 1–3).
function buildCentreIdx() {
  if (!player.stats) return 0;
  let best = 0, bestV = -1;
  WHEEL.forEach((w, i) => { if (player.stats[w.key] > bestV) { bestV = player.stats[w.key]; best = i; } });
  return best;
}
function weightedSpinIdx(centre) {
  const weights = WHEEL.map((w, i) => {
    const d = Math.min(Math.abs(i - centre), 7 - Math.abs(i - centre));
    return d === 0 ? 34 : (d === 1 ? 22 : (d === 2 ? 7 : 4));
  });
  let roll = Math.random() * 100, acc = 0;
  for (let i = 0; i < 7; i++) { acc += weights[i]; if (roll < acc) return i; }
  return centre;
}
let lastSpinIdx = null;
function planSpin(pickNo) {
  const beat = ((pickNo - 1) % 3) + 1;   // 1,2,3,1,2,3… — the pattern cycles
  let idx;
  if (lastSpinIdx === null || beat === 1) idx = weightedSpinIdx(buildCentreIdx());
  else if (beat === 2) idx = (lastSpinIdx + (Math.random() < 0.5 ? -1 : 1) + 7) % 7;
  else idx = (lastSpinIdx + 3) % 7;      // opposite side
  lastSpinIdx = idx;
  return idx;
}
function startSpin() {
  V3.spin.statIdx = planSpin(V3.picksMade + 1);
  V3.spin.animT = 0;
  V3.spin.dur = TEST_MODE ? 0.15 : 1.15;   // scripted runs don't sit through the wheel
  G.state = 'spin';
  Teach.fire('spin', player.x, player.y);
}

// ---- Thresholds: apply newly-earned steps (BALANCE §3 step effects) ----
// Step = +5% of the sub-stat's base effect; rate stats (dodge) +2pp, cap +20.
// Mapping onto the v2 systems (honest map, documented in CODE-GUIDE):
// Strength→damage · Vitality→max HP · Spirit→collect range + resource
// recovery · Intellect→resource size · Agility→dodge · Speciality→ability
// power · Nature→Time Shift recharge (its time sub-stat).
function applyThresholds(silent) {
  if (!player.stats) return;
  for (const w of WHEEL) {
    const steps = thresholdSteps(player.stats[w.key]);
    const prev = player.statSteps[w.key] || 0;
    if (steps <= prev) continue;
    const k = steps - prev;
    player.statSteps[w.key] = steps;
    if (w.key === 'strength') player.damageMul += 0.05 * k;
    else if (w.key === 'vitality') { player.maxHp += 5 * k; player.hp += 5 * k; }
    else if (w.key === 'spirit') { player.magnetR += 4 * k; player.resRegenMul = (player.resRegenMul || 1) + 0.05 * k; }
    else if (w.key === 'intellect') player.resourceMax += 5 * k;
    else if (w.key === 'agility') player.dodgePct = Math.min(20, player.dodgePct + 2 * k);
    else if (w.key === 'speciality') player.abilityPowMul += 0.05 * k;
    else if (w.key === 'nature') player.shiftCdMax = Math.max(3, player.shiftCdMax * Math.pow(0.95, k));
    if (!silent && G.state === 'playing') {
      Teach.fire('threshold', player.x, player.y);
      floater(player.x, player.y - 44, w.name.toUpperCase() + ' THRESHOLD! +' + k + ' step' + (k > 1 ? 's' : ''), w.color);
    }
  }
}
function addStatPoints(key, n) { player.stats[key] += n; applyThresholds(false); }

// ---- Signed rolls (BALANCE appendix, canon): a roll can come up NEGATIVE.
// Negative floor ≈ −⅓ of the positive cap, rounded toward zero; 0 = no modifier.
function rollSigned(lo, hi) {
  const negFloor = -Math.round(hi / 3);
  let v = randi(negFloor, hi);
  if (v > 0 && v < lo) v = lo;   // a positive roll respects the table's floor
  return v;
}
// Rarity roll inside an ability offer (BALANCE §1.1/§4): L1–6 70/25/5, L7+ 60/32/8.
function rollRarity(pickNo) {
  const r = Math.random() * 100;
  if (pickNo <= 6) return r < 70 ? 'Common' : (r < 95 ? 'Rare' : 'Mythic');
  return r < 60 ? 'Common' : (r < 92 ? 'Rare' : 'Mythic');
}

// ---- Offer construction: the spin deals the stat, the mix deals the kinds ----
// Kind weights per BALANCE §1.1. Picks 1–3 are CURATED (hand-picked sensible
// offers from the spun stat, skills only per the ladder). Pick 5 = the weapon
// choice; pick 6's offers are normal, then the stone pick + the Ape follow.
function statCard(statKey) {
  const w = WHEEL[wheelIdx(statKey)];
  return { tag: w.name + ' Stat', power: false, icon: '📈', statKey,
    name: w.name + ' +3',
    desc: 'Your ' + w.name + ' total goes up by 3 points (now ' + player.stats[statKey] + ' → ' + (player.stats[statKey] + 3) + '). Reach 5 / 10 / 15 / 20 / 30 / 40 / 50 in a stat and it grants an increase in its own area.',
    apply: () => addStatPoints(statKey, 3) };
}
function abilityCard(statKey, forceUpgrade) {
  const w = WHEEL[wheelIdx(statKey)];
  const heldIds = player.powers.filter((p) => p.lvl < 3);
  if (forceUpgrade && heldIds.length) {
    const p = heldIds[randi(0, heldIds.length - 1)];
    return { tag: w.name + ' · Rank Up · ' + rollRarity(V3.picksMade + 1), power: true, icon: POWER_DEFS[p.id].icon, statKey,
      name: POWER_DEFS[p.id].name + ' Lv' + (p.lvl + 1),
      desc: 'Rank up a power you already hold. Ranks pay out on the universal axes: costs down, durations longer, range greater, power up.',
      apply: () => { p.lvl++; } };
  }
  const unheld = Object.keys(POWER_DEFS).filter((id) => !hasPower(id));
  if (unheld.length && player.powers.length < 3) {
    const id = unheld[randi(0, unheld.length - 1)];
    return { tag: w.name + ' · New Skill · ' + rollRarity(V3.picksMade + 1), power: true, icon: POWER_DEFS[id].icon, statKey,
      name: POWER_DEFS[id].name, desc: POWER_DEFS[id].desc,
      apply: () => { player.powers.push({ id, lvl: 1 }); player.activePower = player.powers.length - 1; } };
  }
  if (heldIds.length) return abilityCard(statKey, true);
  return statCard(statKey);
}
function smallIncreaseCard(statKey) {
  // The small-increase pool (BALANCE §1.1: sub-stat +1–2). COLLECTION RANGE
  // is in this pool by owner canon — it is Spirit's collect-range sub-stat,
  // and it is always offered when the wheel lands on Spirit.
  const pool = [
    { icon: '👟', name: 'Small Increase: Quick Feet', desc: 'A small increase: your move speed goes up by 2%.', apply: () => { player.speedMul *= 1.02; } },
    { icon: '❤️', name: 'Small Increase: Thick Skin', desc: 'A small increase: your maximum health goes up by 10 and you heal 10 HP now.', apply: () => { player.maxHp += 10; player.hp = Math.min(player.maxHp, player.hp + 10); } },
    { icon: '🦷', name: 'Small Increase: Sharp Bite', desc: 'A small increase: your damage goes up by 3%.', apply: () => { player.damageMul *= 1.03; } }
  ];
  const collect = { icon: '🧲', name: 'Small Increase: Collection Range', statKey: 'spirit',
    desc: 'A small increase — COLLECTION RANGE +1 step: pellets and pickups are pulled into your mouth from 4px further away (now ' + Math.round(player.magnetR) + ' → ' + Math.round(player.magnetR + 4) + '). Collection range is Spirit\'s collect-range sub-stat.',
    apply: () => { player.magnetR += 4; Teach.fire('collectrange', player.x, player.y); } };
  if (statKey === 'spirit') return collect;
  pool.push(collect);
  const c = pool[randi(0, pool.length - 1)];
  c.tag = WHEEL[wheelIdx(statKey)].name + ' · Small Increase';
  return { tag: c.tag, power: false, icon: c.icon, name: c.name, desc: c.desc, apply: c.apply, statKey };
}
function buffCard(statKey) {
  return { tag: WHEEL[wheelIdx(statKey)].name + ' · Buff', power: false, icon: '⚡', statKey,
    name: 'Surge Buff', desc: 'A buff: +20% move speed for 30 seconds. Small, temporary, and gone when the timer dies.',
    apply: () => { player.buffT = 30; } };
}
function currencyCard(statKey) {
  return { tag: WHEEL[wheelIdx(statKey)].name + ' · Currency', power: false, icon: '🪙', statKey,
    name: 'Coin Drop +20', desc: 'A currency drop: +20 coins into ' + player.charName + '\'s own wallet (coins are character-based — they buy shop goods and skills from the menu).',
    apply: () => {
      Save.data.coins[player.charId] = (Save.data.coins[player.charId] || 0) + 20;
      player.coinsEarned += 20; Save.write(true);
    } };
}
function weaponCard(kindIdx) {
  // Level 5 — the Arsenal opens (BALANCE §5.1 ranges, SIGNED rolls per the
  // signed-rolls appendix; each weapon also rolls Light Radius −2…+4 steps,
  // the gear-rollable modifier, signed like everything else).
  const kinds = [
    { name: 'Heavy Maul', icon: '🔨', lo: 8, hi: 20, line: 'physical damage' },
    { name: 'Fast Fang', icon: '🗡️', lo: 5, hi: 14, line: 'physical damage, faster hands' },
    { name: 'Longbow Charm', icon: '🏹', lo: 6, hi: 16, line: 'projectile damage' }
  ];
  const k = kinds[kindIdx % kinds.length];
  const pct = rollSigned(k.lo, k.hi);
  const lr = randi(-2, 4);
  return { tag: 'Weapon Choice', power: false, icon: k.icon, statKey: 'strength',
    name: k.name + ' (' + (pct >= 0 ? '+' : '') + pct + '%)',
    desc: 'A weapon: ' + (pct >= 0 ? '+' : '') + pct + '% ' + k.line + ' while it is yours. Rolls are SIGNED — this one ' + (pct < 0 ? 'came up BAD (negative) — a real roll, printed honestly.' : pct === 0 ? 'came up at 0 — no modifier.' : 'came up good.') + ' It also rolls Light Radius ' + (lr >= 0 ? '+' : '') + lr + ' steps (your fog reveal ' + (lr >= 0 ? 'grows' : 'shrinks') + ' by ' + Math.abs(lr * LIGHT_STEP_PX) + 'px).',
    apply: () => {
      player.weapon = { name: k.name, pct };
      player.damageMul += pct / 100;
      player.lightRadius = lr;
      Save.data.lightRadius = lr; Save.write(true);
      if (lr !== 0) Teach.fire('lightradius', player.x, player.y);
    } };
}
// Curated basics per stat for picks 1–3 (hand-picked, sensible, skills only)
function curatedBasic(statKey) {
  const basics = {
    strength:   { icon: '🦷', name: 'Mega Chomp', desc: 'Your mouth counts as 5 bigger: you eat dots and ghosts from 5 further away, every time.', apply: () => { player.chompBonus += 5; } },
    vitality:   { icon: '❤️', name: 'Thick Peel', desc: 'Your maximum health goes up by 25 (now ' + player.maxHp + ' → ' + (player.maxHp + 25) + ') and you heal 25 HP right away.', apply: () => { player.maxHp += 25; player.hp = Math.min(player.maxHp, player.hp + 25); } },
    spirit:     { icon: '🧲', name: 'Wide Gullet', desc: 'Your passive magnet — the range that pulls nearby dots into your mouth — grows by 45 (now ' + Math.round(player.magnetR) + ' → ' + Math.round(player.magnetR + 45) + ').', apply: () => { player.magnetR += 45; } },
    intellect:  { icon: '🍒', name: 'Fruit Feast', desc: 'Heal 45 HP right now. (One-time — fruit on the map also heals, every time you eat it.)', apply: () => { player.hp = Math.min(player.maxHp, player.hp + 45); } },
    agility:    { icon: '👟', name: 'Zoom Grease', desc: 'Your move speed goes up by 9%. You move at ' + Math.round(272 * player.speedMul) + ' now — this makes it about ' + Math.round(272 * player.speedMul * 1.09) + '.', apply: () => { player.speedMul *= 1.09; } },
    speciality: { icon: '💨', name: 'Chomp Dash Start', desc: 'Take the Chomp Dash now if it is offered beside this card — Speciality is the house of big abilities. This card itself: +9% move speed.', apply: () => { player.speedMul *= 1.09; } },
    nature:     { icon: '⏪', name: 'Shift Grease', desc: 'Time Shift (E / Shift key) recharges 1.5s faster: every 4.5s instead of every 6s. Nature holds the time sub-stat — this is its gift.', apply: () => { player.shiftCdMax = Math.max(3, player.shiftCdMax - 1.5); } }
  };
  const b = basics[statKey] || basics.strength;
  return { tag: WHEEL[wheelIdx(statKey)].name + ' · Skill', power: false, icon: b.icon, name: b.name, desc: b.desc, apply: b.apply, statKey };
}
function buildChoices() {
  const pickNo = V3.picksMade + 1;
  const statKey = WHEEL[V3.spin.statIdx].key;
  if (pickNo === 5) {   // the ladder: Level 5 = weapon choice (canon)
    Teach.fire('weaponpick', player.x, player.y);
    return [weaponCard(0), weaponCard(1), weaponCard(2)];
  }
  if (pickNo <= 3) {    // curated opening: hand-picked, skills only (BALANCE §1)
    const cards = [abilityCard(statKey, false), curatedBasic(statKey), abilityCard(statKey, player.powers.length > 0)];
    // de-duplicate by name, topping up with the stat card's neighbour basics
    const seen = new Set(), out = [];
    for (const c of cards) { if (!seen.has(c.name)) { seen.add(c.name); out.push(c); } }
    while (out.length < 3) out.push(curatedBasic(WHEEL[(V3.spin.statIdx + out.length) % 7].key));
    return out.slice(0, 3);
  }
  // Random rolls from pick 4 on, kind-weighted per BALANCE §1.1
  const weights = pickNo <= 6
    ? [['ability', 35], ['rankup', 40], ['stat', 10], ['buff', 5], ['small', 5], ['currency', 5]]
    : [['ability', 30], ['rankup', 30], ['stat', 20], ['buff', 8], ['small', 7], ['currency', 5]];
  const mk = (kind) => kind === 'ability' ? abilityCard(statKey, false)
    : kind === 'rankup' ? abilityCard(statKey, true)
    : kind === 'stat' ? statCard(statKey)
    : kind === 'buff' ? buffCard(statKey)
    : kind === 'small' ? smallIncreaseCard(statKey)
    : currencyCard(statKey);
  const out = [], usedNames = new Set();
  for (let n = 0; n < 3; n++) {
    let roll = Math.random() * 100, acc = 0, kind = 'stat';
    for (const [k, wgt] of weights) { acc += wgt; if (roll < acc) { kind = k; break; } }
    let c = mk(kind), guard = 0;
    while (usedNames.has(c.name) && guard++ < 4) c = mk(guard % 2 ? 'stat' : 'small');
    usedNames.add(c.name);
    out.push(c);
  }
  return out;
}

// ---- Resources: gain/spend + the explosive burst ----
function gainResource(n) {
  player.resource = clamp(player.resource + n, 0, player.resourceMax);
  player.combatT = 0;
}
function doBurst() {
  // the explosive spend: a big flashy arcade ring that clears the circle
  player.resource -= BURST_COST;
  burst(player.x, player.y, '#ffd93b', 34);
  burst(player.x, player.y, RESOURCE_DEFS[player.resourceType].color, 22);
  G.shake = Math.max(G.shake, 12);
  floater(player.x, player.y - 46, RESOURCE_DEFS[player.resourceType].name + ' BURST!', '#ffd93b');
  Snd.tone(120, 0.35, 'sawtooth', 0.22, 40);
  for (const g of ghosts) {
    if (g.alive && tDist(g.x, g.y, player.x, player.y) < BURST_RADIUS) {
      const pts = killGhost(g, true, 200);
      G.score += pts;
      gainXP(2);
    }
  }
  if (V3.boss && V3.boss.phase === 4 && tDist(V3.boss.x, V3.boss.y, player.x, player.y) < BURST_RADIUS + 30) {
    apeDamage(50, 'burst');
  }
}
function updateResource(dt, exerting) {
  player.combatT += dt;
  if (player.buffT > 0) player.buffT -= dt;
  if (player.slowT > 0) player.slowT -= dt;
  const regenMul = player.resRegenMul || 1;
  if (player.resourceType === 'rage') {
    if (player.combatT > 4) player.resource = Math.max(0, player.resource - 6 * dt);   // decays out of combat
  } else if (player.resourceType === 'mana') {
    player.resource = Math.min(player.resourceMax, player.resource + 5 * dt * regenMul);
  } else if (player.resourceType === 'energy') {
    if (!exerting) player.resource = Math.min(player.resourceMax, player.resource + 12 * dt * regenMul);
  }
  if (G.wantBurst) {
    G.wantBurst = false;
    if (player.resource >= BURST_COST) doBurst();
    else floater(player.x, player.y - 40, 'NEED 50 ' + RESOURCE_DEFS[player.resourceType].name, '#ff8a8a');
  }
}
// reveal radius: the fog edge around Pac — base + Light Radius steps (signed)
function revealRadius() { return REVEAL_BASE + player.lightRadius * LIGHT_STEP_PX; }

// ================= v3.0.0 — environmental triggers (8 slots, merge TBD) =================
// Owner canon: "7 triggers" with 8 lines — one pair MERGES, but which pair
// is UNRULED. All 8 slots ship data-driven and unmerged; MERGE_PAIR stays
// blank/TBD below on purpose. When the owner rules, set MERGE_PAIR and the
// pair collapses into one slot — no other code changes (BALANCE appendix).
// Triggers are the level-side siblings of boss-arena debuffs: they share
// the danger-zone telegraph system (V3.danger) with the Ape's barrels.
const TRIGGER_CONFIG = {
  rollInterval: 25,                 // seconds between trigger rolls (BALANCE trigger appendix, DRAFT)
  MERGE_PAIR: null,                 // TBD — owner call. DO NOT GUESS. e.g. ['T6','T7'] once ruled.
  slots: [
    { id: 'T1', name: 'More Enemies',    weight: 18 },
    { id: 'T2', name: 'More Pellets',    weight: 16 },
    { id: 'T3', name: 'Rolling Bonuses', weight: 14 },
    { id: 'T4', name: 'More Health',     weight: 14 },
    { id: 'T5', name: 'More Mini-Bosses', weight: 8 },
    { id: 'T6', name: 'Floor Is Lava',   weight: 10 },
    { id: 'T7', name: 'Freeze Floor',    weight: 10 },
    { id: 'T8', name: 'Lightning',       weight: 10 }
  ]
};
Object.assign(TEACH, {
  trigger:   { title: 'THE ARENA BREATHES', text: 'Every so often the level itself rolls an ENVIRONMENTAL TRIGGER — more enemies, more pellets, lava floors, lightning and stranger weather. Helpful or hostile, it is always announced. There are 8 trigger slots; the owner has ruled that two of them will one day merge into one — which pair is still his call.' },
  trig_T6:   { title: 'FLOOR IS LAVA', text: 'Patches of floor are about to BURN. The red telegraph circles show exactly where — stand somewhere else before they light. Lava is a danger zone: shown first, harmful second, never a surprise.' },
  trig_T7:   { title: 'FREEZE FLOOR', text: 'The floor has iced over: you SLIDE. Steering still works, stopping does not. Aim early, brake with walls, and do not panic.' },
  trig_T8:   { title: 'LIGHTNING', text: 'Random lightning is striking near you. Each strike paints its target circle first — get out of the circle before it lands. Telegraph, then thunder: that is the law.' },
  trig_T5:   { title: 'MINI-BOSSES', text: 'Crowned mini-bosses are joining the fight and elites are spawning thick. Big, fast, and worth a Melon each if you eat one in EAT MODE.' }
});
function fireTrigger(id) {
  Teach.fire('trigger', player.x, player.y);
  if (id === 'T1') { TrigState.t1 = 20; toast('⚠ TRIGGER: MORE ENEMIES!'); }
  else if (id === 'T2') { spawnDotPattern(); spawnDotPattern(); for (let i = 0; i < 3; i++) spawnDotCluster(); toast('✦ TRIGGER: MORE PELLETS!'); }
  else if (id === 'T3') { TrigState.cascade = 15; TrigState.cascadeT = 0; toast('🎲 TRIGGER: ROLLING BONUSES!'); }
  else if (id === 'T4') { for (let i = 0; i < 3; i++) spawnFruit(); toast('🍒 TRIGGER: MORE HEALTH!'); }
  else if (id === 'T5') {
    TrigState.eliteWindow = 30;
    spawnGhost();
    const g = ghosts[ghosts.length - 1];
    if (g && g.alive) { g.elite = true; g.r = 30; g.miniboss = true; }
    Teach.fire('trig_T5', player.x, player.y);
    toast('👑 TRIGGER: MINI-BOSSES!');
  }
  else if (id === 'T6') {
    Teach.fire('trig_T6', player.x, player.y);
    for (let i = 0; i < 6; i++) {
      const a = rand(0, TAU), d = rand(120, 460);
      const x = wrapPos(player.x + Math.cos(a) * d, WORLD_W), y = wrapPos(player.y + Math.sin(a) * d, WORLD_H);
      if (!circleHitsWall(x, y, 40)) V3.danger.push({ x, y, r: 58, kind: 'lava', tele: 1.2, live: 18, t: 0 });
    }
    toast('🌋 TRIGGER: FLOOR IS LAVA!');
  }
  else if (id === 'T7') { TrigState.ice = 15; Teach.fire('trig_T7', player.x, player.y); toast('🧊 TRIGGER: FREEZE FLOOR — YOU SLIDE!'); }
  else if (id === 'T8') { TrigState.boltWindow = 20; TrigState.boltT = 0.5; Teach.fire('trig_T8', player.x, player.y); toast('⚡ TRIGGER: LIGHTNING!'); }
}
function rollTrigger() {
  let roll = Math.random() * 100, acc = 0;
  for (const s of TRIGGER_CONFIG.slots) { acc += s.weight; if (roll < acc) { fireTrigger(s.id); return; } }
  fireTrigger('T1');
}
function updateTriggers(dt) {
  if (TrigState.t1 > 0) TrigState.t1 -= dt;
  if (TrigState.eliteWindow > 0) TrigState.eliteWindow -= dt;
  if (TrigState.ice > 0) TrigState.ice -= dt;
  TrigState.nextRoll -= dt;
  if (TrigState.nextRoll <= 0) { TrigState.nextRoll = TRIGGER_CONFIG.rollInterval; rollTrigger(); }
  if (TrigState.cascade > 0) {
    TrigState.cascade -= dt; TrigState.cascadeT -= dt;
    if (TrigState.cascadeT <= 0) {   // the random roll cascade: a gift every 3s
      TrigState.cascadeT = 3;
      const gift = randi(0, 3);
      if (gift === 0) spawnFruit(player.x + rand(-160, 160), player.y + rand(-160, 160));
      else if (gift === 1) { Save.data.coins[player.charId] = (Save.data.coins[player.charId] || 0) + 10; player.coinsEarned += 10; floater(player.x, player.y - 30, '+10 COINS', '#ffd93b'); }
      else if (gift === 2) { gainResource(25); floater(player.x, player.y - 30, '+25 ' + RESOURCE_DEFS[player.resourceType].name, '#b6ff5e'); }
      else { player.buffT = Math.max(player.buffT, 5); floater(player.x, player.y - 30, 'SPEED SURGE!', '#9df2ff'); }
    }
  }
  if (TrigState.boltWindow > 0) {
    TrigState.boltWindow -= dt; TrigState.boltT -= dt;
    if (TrigState.boltT <= 0) {
      TrigState.boltT = 2.5;
      const a = rand(0, TAU), d = rand(40, 420);
      V3.danger.push({ x: wrapPos(player.x + Math.cos(a) * d, WORLD_W), y: wrapPos(player.y + Math.sin(a) * d, WORLD_H),
        r: 55, kind: 'bolt', tele: 0.9, live: 0.15, t: 0, struck: false });
    }
  }
}
// Shared danger-zone update: telegraph first (harmless), then live.
// Lava burns while stood in; a bolt strikes once at the end of its telegraph.
function updateDanger(dt) {
  for (let i = V3.danger.length - 1; i >= 0; i--) {
    const z = V3.danger[i];
    z.t += dt;
    if (z.kind === 'lava') {
      if (z.t > z.tele && tDist(z.x, z.y, player.x, player.y) < z.r && G.time >= player.invulnUntil) {
        player.hp -= 8 * dt;
        player.combatT = 0;
        if (Math.random() < dt * 3) burst(player.x, player.y, '#ff7a3b', 3);
        if (player.hp <= 0) { loseLife(); if (G.state !== 'playing') return; }
      }
      if (z.t > z.tele + z.live) V3.danger.splice(i, 1);
    } else if (z.kind === 'bolt') {
      if (!z.struck && z.t >= z.tele) {
        z.struck = true;
        burst(z.x, z.y, '#cfeaff', 16);
        Snd.tone(1400, 0.14, 'square', 0.14, 300);
        if (tDist(z.x, z.y, player.x, player.y) < z.r && G.time >= player.invulnUntil) {
          if (Math.random() * 100 < player.dodgePct) floater(player.x, player.y - 30, 'DODGED!', '#b6ff5e');
          else {
            player.hp -= 15; G.shake = Math.max(G.shake, 8); Snd.hurt();
            floater(player.x, player.y - 30, 'STRUCK! -15', '#cfeaff');
            if (player.hp <= 0) { loseLife(); if (G.state !== 'playing') return; }
          }
        }
      }
      if (z.t > z.tele + z.live) V3.danger.splice(i, 1);
    }
  }
}

// ================= v3.0.0 — named areas & explored fog =================
// The arena has named AREAS (zones). Entering one announces it (first-sight
// lesson once ever for the area system, a toast after that), and every area
// wears its own light (a translucent tint while you are inside it).
const AREAS = [
  { name: 'The Centre Cross', sub: 'the doodle crossroads', tint: 'rgba(255,217,59,0.05)', test: (x, y) => x > 1350 && x < 2050 && y > 950 && y < 1650 },
  { name: 'Shift Bay North-West', sub: 'landing pads and corner brackets', tint: 'rgba(77,178,255,0.05)', test: (x, y) => x < WORLD_W / 2 && y < WORLD_H / 2 },
  { name: 'The Quadrant Bars', sub: 'long runs, longer chases', tint: 'rgba(255,157,226,0.045)', test: (x, y) => x >= WORLD_W / 2 && y < WORLD_H / 2 },
  { name: 'The Long Way Round', sub: 'the southern corridors', tint: 'rgba(55,224,139,0.045)', test: (x, y) => x < WORLD_W / 2 && y >= WORLD_H / 2 },
  { name: 'Corner Pocket South-East', sub: 'deep in the page corner', tint: 'rgba(255,122,59,0.05)', test: () => true }
];
function areaAt(x, y) { for (let i = 0; i < AREAS.length; i++) if (AREAS[i].test(x, y)) return i; return AREAS.length - 1; }
function updateExploredAndArea() {
  // explored grid: 100px cells, revealed within the (Light-Radius-fed) radius
  const R = revealRadius();
  const cx0 = Math.floor((player.x - R) / 100), cx1 = Math.floor((player.x + R) / 100);
  const cy0 = Math.floor((player.y - R) / 100), cy1 = Math.floor((player.y + R) / 100);
  for (let cx = cx0; cx <= cx1; cx++) for (let cy = cy0; cy <= cy1; cy++) {
    const wx = ((cx % 34) + 34) % 34, wy = ((cy % 26) + 26) % 26;
    V3.explored.add(wx + ',' + wy);
  }
  const ai = areaAt(player.x, player.y);
  if (ai !== V3.areaIdx) {
    V3.areaIdx = ai;
    if (G.state === 'playing' && G.time > 1) {
      toast('🗺 ' + AREAS[ai].name);
      floater(player.x, player.y - 52, AREAS[ai].sub, '#c2caff');
      Teach.fire('areachange', player.x, player.y);
    }
  }
}
function cellExplored(x, y) {
  const cx = ((Math.floor(x / 100) % 34) + 34) % 34, cy = ((Math.floor(y / 100) % 26) + 26) % 26;
  return V3.explored.has(cx + ',' + cy);
}

// ================= v3.0.0 — the APE, Level 6 mini-boss (BOSS-FIGHTS.md §1) =================
// Mechanic-to-win: BAIT THE THROW, BREAK THE SCAFFOLD. Pac's damage cannot
// reach the Ape on his scaffold (phases 1–3). His exploding barrels can:
// bait a throw so its cross-blast touches a cracked pylon — 2 blasts break
// a pylon, 4 pylons drop him to the ground (phase 4), where he takes damage.
// Aggro/threat: a threat table — the Ape throws at whoever has built the
// most threat (Pac by dealing damage/kills; the partner decoy by holding a
// pylon corridor). Barrel impact zones are telegraphed the whole flight.
const APE = { pylons: 4, blastsPerPylon: 2, hp: 300, barrelSpeed: 190, blastArm: 150, blastHalfWidth: 40, blastDamage: 20,
  throwInterval: [2.6, 2.0, 1.5, 2.2], addInterval: 6, enrageStep: 60 };
function spawnApe() {
  let bx = wrapPos(player.x + 240, WORLD_W), by = wrapPos(player.y - 300, WORLD_H);
  const slid = pushOutWalls(bx, by, 40); bx = slid.x; by = slid.y;
  V3.boss = { type: 'ape', x: bx, y: by, r: 38, phase: 1, hp: APE.hp, maxHp: APE.hp,
    throwT: 1.4, throwMul: 1, sinceCrack: 0, addT: 5, poundT: 3, touchT: 0, throws: 0,
    threat: { pac: 0, decoy: 0 } };
  V3.pylons = [];
  for (const off of [-170, -80, 80, 170]) {
    let px = wrapPos(bx + off, WORLD_W), py = wrapPos(by + 120, WORLD_H);
    const s2 = pushOutWalls(px, py, 18); px = s2.x; py = s2.y;
    V3.pylons.push({ x: px, y: py, hp: APE.blastsPerPylon });
  }
  V3.bossSpawned = true;
  toast('🦍 THE APE!');
  Teach.fire('ape', bx, by);
}
function apeTargetPos() {
  // threat decides the target: the decoy (partner) wins throws by holding
  // ground near a pylon; Pac wins them by fighting. Snapshot at the throw.
  const b = V3.boss;
  if (V3.partner && V3.partner.deployed && b.threat.decoy > b.threat.pac) {
    return { x: V3.partner.x, y: V3.partner.y, lead: null };
  }
  const lead = b.phase >= 2 ? { x: player.x + player.vx * 0.5, y: player.y + player.vy * 0.5 } : null;
  return { x: player.x, y: player.y, lead };
}
function throwBarrel(tx, ty, red) {
  const b = V3.boss;
  V3.barrels.push({ x: b.x, y: b.y, tx, ty, fuse: 6, red: !!red });
  V3.danger.push({ x: tx, y: ty, r: 46, kind: 'barrelmark', tele: 99, live: 99, t: 0 });
}
function explodeBarrel(bl) {
  burst(bl.tx, bl.ty, '#ff7a3b', 20);
  burst(bl.tx, bl.ty, '#ffd93b', 10);
  G.shake = Math.max(G.shake, 9);
  Snd.tone(90, 0.3, 'sine', 0.24, 34);
  const inCross = (x, y, slack) => {
    const dx = Math.abs(wrapDelta(x - bl.tx, WORLD_W)), dy = Math.abs(wrapDelta(y - bl.ty, WORLD_H));
    return (dx <= APE.blastArm + slack && dy <= APE.blastHalfWidth + slack) ||
           (dy <= APE.blastArm + slack && dx <= APE.blastHalfWidth + slack);
  };
  for (let i = V3.pylons.length - 1; i >= 0; i--) {
    if (inCross(V3.pylons[i].x, V3.pylons[i].y, 6)) damagePylon(i);
  }
  if (inCross(player.x, player.y, 0) && G.time >= player.invulnUntil) {
    if (Math.random() * 100 < player.dodgePct) floater(player.x, player.y - 30, 'DODGED!', '#b6ff5e');
    else {
      player.hp -= APE.blastDamage; player.combatT = 0;
      if (player.resourceType === 'rage') gainResource(12);
      floater(player.x, player.y - 30, 'BARREL BLAST! -' + APE.blastDamage, '#ff7a3b');
      Snd.hurt();
      if (player.hp <= 0) loseLife();
    }
  }
  // the marker for this barrel is spent
  const mi = V3.danger.findIndex((z) => z.kind === 'barrelmark' && Math.abs(wrapDelta(z.x - bl.tx, WORLD_W)) < 4 && Math.abs(wrapDelta(z.y - bl.ty, WORLD_H)) < 4);
  if (mi >= 0) V3.danger.splice(mi, 1);
}
function damagePylon(i) {
  const p = V3.pylons[i];
  p.hp--;
  burst(p.x, p.y, '#c98a4b', 12);
  if (V3.boss) V3.boss.sinceCrack = 0;
  if (p.hp > 0) { floater(p.x, p.y - 26, 'PYLON CRACKED!', '#ffd93b'); return; }
  V3.pylons.splice(i, 1);
  floater(p.x, p.y - 26, 'PYLON DOWN!', '#ffd93b');
  G.shake = Math.max(G.shake, 10);
  const left = V3.pylons.length;
  if (!V3.boss) return;
  if (left === 0) {
    V3.boss.phase = 4;
    V3.boss.y = wrapPos(V3.boss.y + 130, WORLD_H);
    toast('💥 THE SCAFFOLD FALLS! THE APE IS DOWN!');
    floater(V3.boss.x, V3.boss.y - 56, 'NOW HE IS EDIBLE!', '#ffd93b');
  } else {
    V3.boss.phase = left === 1 ? 3 : 2;
    toast('🦍 ' + left + (left === 1 ? ' PYLON' : ' PYLONS') + ' LEFT!');
  }
}
function apeDamage(n, source) {
  const b = V3.boss;
  if (!b) return;
  if (b.phase < 4) {   // out of reach on the scaffold — the game says so
    if (!b._reachT || G.time - b._reachT > 2) { b._reachT = G.time; floater(b.x, b.y - 52, 'OUT OF REACH!', '#ff8a8a'); }
    return;
  }
  const dealt = n * player.damageMul * (source === 'burst' ? player.abilityPowMul : 1);
  b.hp -= dealt;
  b.threat.pac += dealt;
  burst(b.x, b.y, '#ffd93b', 6);
  if (b.hp <= 0) bossDown();
}
function bossDown() {
  const b = V3.boss;
  G.score += 2000;
  burst(b.x, b.y, '#ffd93b', 40);
  toast('🏆 THE APE IS DOWN! +2000');
  Snd.levelUp();
  V3.boss = null; V3.pylons = []; V3.barrels = [];
  V3.danger = V3.danger.filter((z) => z.kind !== 'barrelmark');
  V3.bossBeaten = true;
  Save.data.endlessUnlocked['level6'] = true;   // BALANCE §7.2: boss kill unlocks endless for the level
  Save.write();
  Teach.fire('endless', player.x, player.y);
  refreshMenuV3();
}
function updateBoss(dt) {
  const b = V3.boss;
  if (!b) return;
  // threat: Pac's decays slowly; the decoy builds threat by holding a pylon corridor
  b.threat.pac = Math.max(0, b.threat.pac - dt * 1.2);
  if (V3.partner && V3.partner.deployed) {
    let nearPylon = false;
    for (const p of V3.pylons) if (tDist(p.x, p.y, V3.partner.x, V3.partner.y) < 130) nearPylon = true;
    if (nearPylon) b.threat.decoy += dt * 6; else b.threat.decoy = Math.max(0, b.threat.decoy - dt * 2);
  }
  b.sinceCrack += dt;
  if (b.phase < 4 && b.sinceCrack >= APE.enrageStep) {   // soft enrage: passivity is punished
    b.sinceCrack = 0; b.throwMul *= 0.85;
    toast('🦍 THE APE THROWS FASTER!');
  }
  // throws
  b.throwT -= dt;
  if (b.throwT <= 0) {
    b.throwT = APE.throwInterval[b.phase - 1] * b.throwMul;
    const tgt = apeTargetPos();
    b.throws++;
    const red = b.phase >= 2 && b.throws % 5 === 0;   // every fifth barrel in P2+ is a wide red one
    throwBarrel(tgt.x, tgt.y, red);
    if (b.phase === 2) throwBarrel(tgt.lead ? tgt.lead.x : tgt.x, tgt.lead ? tgt.lead.y : tgt.y, false);
    if (b.phase === 3) {   // the last pylon is protected: cluster on whoever stands near it
      const p = V3.pylons[0];
      if (p) throwBarrel(p.x + rand(-30, 30), p.y + rand(-30, 30), false);
    }
    if (b.phase === 4) throwBarrel(tgt.x, tgt.y, red);
  }
  // adds trickle from phase 2 (barrel-ape chimps — killable, edible in EAT MODE)
  if (b.phase >= 2 && b.phase < 4) {
    b.addT -= dt;
    if (b.addT <= 0) {
      b.addT = APE.addInterval;
      spawnGhost('wildcard');
      const g = ghosts[ghosts.length - 1];
      if (g && g.alive) { g.isAdd = true; g.elite = false; g.r = 13; g.chimp = true; }
    }
  }
  // phase 3 chest pound: lingering in the last pylon's corridor gets punished
  if (b.phase === 3 && V3.pylons.length) {
    b.poundT -= dt;
    const p = V3.pylons[0];
    if (b.poundT <= 0 && tDist(p.x, p.y, player.x, player.y) < 150) {
      b.poundT = 4;
      burst(p.x, p.y, '#c98a4b', 18);
      toast('🦍 CHEST POUND!');
      const dx = wrapDelta(player.x - p.x, WORLD_W), dy = wrapDelta(player.y - p.y, WORLD_H);
      const d = Math.hypot(dx, dy) || 1;
      player.vx += (dx / d) * 420; player.vy += (dy / d) * 420;
      player.slowT = 1;
    }
  }
  // phase 4: on the ground — he chases, and he can finally be hurt
  if (b.phase === 4) {
    const dx = wrapDelta(player.x - b.x, WORLD_W), dy = wrapDelta(player.y - b.y, WORLD_H);
    const d = Math.hypot(dx, dy) || 1;
    b.x = wrapPos(b.x + (dx / d) * 148 * dt, WORLD_W);
    b.y = wrapPos(b.y + (dy / d) * 148 * dt, WORLD_H);
    const slid = pushOutWalls(b.x, b.y, b.r); b.x = slid.x; b.y = slid.y;
    // fire trail burns him like anyone else on the ground
    for (const s of trail) {
      if (tDist(s.x, s.y, b.x, b.y) < 34) { apeDamage(14 * dt * player.abilityPowMul, 'fire'); break; }
    }
    b.touchT -= dt;
    if (d < b.r + player.r + player.chompBonus && b.touchT <= 0) {
      if (player.dashT > 0 || player.eatT > 0) {
        b.touchT = 0.45;
        apeDamage(10, 'dash');
        floater(b.x, b.y - 50, 'CHOMP!', '#ffd93b');
      } else if (G.time >= player.invulnUntil) {
        b.touchT = 1;
        player.hp -= 13; player.combatT = 0;
        if (player.resourceType === 'rage') gainResource(12);
        G.shake = Math.max(G.shake, 8); Snd.hurt();
        if (player.hp <= 0) loseLife();
      }
    }
  }
  // barrels roll toward their snapshot and explode on arrival or at fuse end
  for (let i = V3.barrels.length - 1; i >= 0; i--) {
    const bl = V3.barrels[i];
    bl.fuse -= dt;
    const dx = wrapDelta(bl.tx - bl.x, WORLD_W), dy = wrapDelta(bl.ty - bl.y, WORLD_H);
    const d = Math.hypot(dx, dy);
    if (d < 12 || bl.fuse <= 0) { V3.barrels.splice(i, 1); explodeBarrel(bl); if (G.state !== 'playing') return; continue; }
    bl.x = wrapPos(bl.x + (dx / d) * APE.barrelSpeed * dt, WORLD_W);
    bl.y = wrapPos(bl.y + (dy / d) * APE.barrelSpeed * dt, WORLD_H);
  }
}

// ================= v3.0.0 — stone pick & boss intro (Level 6 ladder) =================
function openStonePick() {
  G.state = 'stonepick';
  Teach.fire('stonepick', player.x, player.y);
  const wrap = document.getElementById('stoneCards');
  wrap.innerHTML = '';
  for (const st of STONES) {
    const d = document.createElement('div');
    d.className = 'card';
    d.innerHTML = '<div class="tag">Infinity Stone · ' + WHEEL[wheelIdx(st.stat)].name + '</div>' +
      '<div class="ico">💎</div><div class="name" style="color:' + st.color + '">' + st.name + '</div>' +
      '<div class="desc">Buffs the skills of its own colour: ' + WHEEL[wheelIdx(st.stat)].name + ' skills and effects run +15% stronger while this stone is yours.</div>';
    d.addEventListener('click', () => pickStone(st));
    wrap.appendChild(d);
  }
  document.getElementById('stoneScreen').classList.remove('hidden');
}
function pickStone(st) {
  player.stone = st.key;
  // the stone's buff lands on its own stat's mapped system (BALANCE §9B: +15%)
  if (st.stat === 'strength') player.damageMul *= 1.15;
  else if (st.stat === 'vitality') { player.maxHp = Math.round(player.maxHp * 1.15); player.hp += Math.round(player.maxHp * 0.15); }
  else if (st.stat === 'spirit') { player.magnetR *= 1.15; player.resRegenMul = (player.resRegenMul || 1) * 1.15; }
  else if (st.stat === 'intellect') player.resourceMax = Math.round(player.resourceMax * 1.15);
  else if (st.stat === 'agility') player.abilityPowMul *= 1.15;
  else if (st.stat === 'speciality') player.abilityPowMul *= 1.15;
  else if (st.stat === 'nature') player.shiftCdMax = Math.max(3, player.shiftCdMax * 0.85);
  V3.stonePicked = true;
  document.getElementById('stoneScreen').classList.add('hidden');
  burst(player.x, player.y, st.color, 30);
  toast('💎 ' + st.name.toUpperCase() + ' CLAIMED!');
  if (!V3.bossSpawned && !G.endlessRun) openBossIntro();
  else resumeAfterPick();
}
function openBossIntro() {
  G.state = 'bossintro';
  document.getElementById('bossIntro').classList.remove('hidden');
}

// ================= v3.0.0 — team up (framework + tag-in for 2) =================
// Unlocks after 10 cumulative levels of account progress (save). Max team 3
// in the data model (V3.chars holds per-character run state); the third
// slot unlocks by the TEAM_STEP_LEVELS growth rule and is data-model-only
// in this prototype — 2 characters are fielded, the slot is ready.
function charStateFromPackage(pkg) {
  return { charId: pkg.charId, charName: pkg.charName, color: pkg.color, resourceType: pkg.resourceType,
    stats: Object.assign({}, pkg.stats), statSteps: {}, hp: 100, maxHp: 100,
    resource: pkg.resourceType === 'energy' ? 60 : 0, resourceMax: 100,
    damageMul: 1, abilityPowMul: 1, dodgePct: 0 };
}
function stashPlayerInto(state) {
  state.hp = player.hp; state.maxHp = player.maxHp;
  state.resource = player.resource; state.resourceMax = player.resourceMax;
  state.damageMul = player.damageMul; state.abilityPowMul = player.abilityPowMul;
  state.dodgePct = player.dodgePct;
  Object.assign(state.stats, player.stats);
  Object.assign(state.statSteps, player.statSteps);
}
function loadPlayerFrom(state) {
  player.charId = state.charId; player.charName = state.charName; player.charColor = state.color;
  player.resourceType = state.resourceType;
  player.stats = state.stats; player.statSteps = state.statSteps;
  player.hp = state.hp; player.maxHp = state.maxHp;
  player.resource = state.resource; player.resourceMax = state.resourceMax;
  player.damageMul = state.damageMul; player.abilityPowMul = state.abilityPowMul;
  player.dodgePct = state.dodgePct;
  player.resRegenMul = 1;
  applyThresholds(true);
}
function tagIn() {
  if (!V3.partner || !V3.partner.deployed || G.state !== 'playing') return;
  const activeState = V3.chars[player.charId];
  stashPlayerInto(activeState);
  const otherId = player.charId === PAC_PACKAGE.charId ? PARTNER_PACKAGE.charId : PAC_PACKAGE.charId;
  const other = V3.chars[otherId];
  // the partner steps off the field at the swap point; positions exchange
  const px = player.x, py = player.y;
  player.x = V3.partner.x; player.y = V3.partner.y;
  V3.partner.x = px; V3.partner.y = py;
  loadPlayerFrom(other);
  V3.partner.charId = activeState.charId;
  burst(player.x, player.y, '#ff9de2', 18);
  toast('🔁 TAG! ' + player.charName.toUpperCase() + ' IS IN!');
  Snd.copySting();
}
function updatePartner(dt) {
  const pt = V3.partner;
  if (!pt || !pt.deployed) return;
  // the benched partner trails the active character — a visible decoy the
  // Ape's threat table can choose (that is her job in the boss fight)
  const dx = wrapDelta(player.x - pt.x, WORLD_W), dy = wrapDelta(player.y - pt.y, WORLD_H);
  const d = Math.hypot(dx, dy);
  if (d > 52) {
    pt.x = wrapPos(pt.x + (dx / d) * 230 * dt, WORLD_W);
    pt.y = wrapPos(pt.y + (dy / d) * 230 * dt, WORLD_H);
    const slid = pushOutWalls(pt.x, pt.y, 14); pt.x = slid.x; pt.y = slid.y;
  }
  // benched partner recovers resource at half the Spirit recovery rate (BALANCE §12)
  const st = V3.chars[pt.charId];
  if (st) st.resource = Math.min(st.resourceMax, st.resource + 2.5 * dt);
}

// ================= v3.0.0 — per-frame systems hook =================
function v3Update(dt) {
  updateResource(dt, player.dashT > 0);
  updateTriggers(dt);
  updateDanger(dt);
  if (G.state !== 'playing') return;
  updateBoss(dt);
  if (G.state !== 'playing') return;
  updatePartner(dt);
  updateExploredAndArea();
  if (!V3.radarTaught) { V3.radarTaught = true; Teach.fire('radar', player.x, player.y); }
  // level time limit (BALANCE §7.1): endless runs and the boss fight pause it
  if (!G.endlessRun && !V3.boss) {
    G.timeLeft -= dt;
    if (G.timeLeft <= 0) {
      toast('⏰ TIME UP — THE LEVEL FAILS!');
      loseLife();
      if (G.state === 'playing') { G.timeLeft = limitForLevel(player.level); player.hp = player.maxHp; }
    }
  }
}
function limitForLevel(lv) {
  if (lv <= 3) return 360;        // 6:00 (BALANCE §7.1)
  if (lv <= 6) return 480;        // 8:00
  if (lv <= 10) return 600;       // 10:00
  return Math.min(1200, 720 + Math.floor((lv - 11) / 5) * 60);   // 12:00 +1:00/5 levels, cap 20:00
}

// ================= v3.0.0 — rendering: telegraphs, boss, partner, fog, radar, wheel =================
function drawDangerZones() {
  for (const z of V3.danger) {
    const sx = SX(z.x), sy = SY(z.y);
    if (!onScreen(sx, sy, z.r + 60)) continue;
    ctx.save();
    if (z.kind === 'lava') {
      const live = z.t > z.tele;
      ctx.fillStyle = live ? 'rgba(255,90,20,0.5)' : 'rgba(255,60,20,0.16)';
      ctx.strokeStyle = live ? '#ff7a3b' : 'rgba(255,90,40,0.8)';
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(sx, sy, z.r, 0, TAU); ctx.fill(); ctx.stroke();
      if (!live) {   // telegraph: the ring closes as the burn approaches
        ctx.strokeStyle = '#ffd93b'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(sx, sy, z.r * (1 - z.t / z.tele) + 4, 0, TAU); ctx.stroke();
      } else if (Math.random() < 0.3) burst(z.x + rand(-z.r, z.r) * 0.6, z.y + rand(-z.r, z.r) * 0.6, '#ff9a3b', 1);
    } else if (z.kind === 'bolt') {
      ctx.strokeStyle = 'rgba(207,234,255,0.9)'; ctx.lineWidth = 2.5;
      ctx.fillStyle = 'rgba(160,210,255,0.13)';
      ctx.beginPath(); ctx.arc(sx, sy, z.r, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(sx, sy, Math.max(3, z.r * (1 - z.t / z.tele)), 0, TAU); ctx.stroke();
      if (z.struck) { ctx.fillStyle = 'rgba(220,245,255,0.75)'; ctx.beginPath(); ctx.arc(sx, sy, z.r, 0, TAU); ctx.fill(); }
    } else if (z.kind === 'barrelmark') {
      // the Ape's snapshot marker: a crayon X + landing circle, shown the
      // whole flight — the fight is telegraph literacy (BOSS-FIGHTS.md)
      const pulse = 0.75 + 0.25 * Math.sin(animT * 10);
      ctx.strokeStyle = 'rgba(255,70,40,' + (0.65 * pulse + 0.3) + ')'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(sx, sy, 40, 0, TAU); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(sx - 13, sy - 13); ctx.lineTo(sx + 13, sy + 13);
      ctx.moveTo(sx + 13, sy - 13); ctx.lineTo(sx - 13, sy + 13);
      ctx.stroke();
    }
    ctx.restore();
  }
}
function drawBossAndBarrels() {
  // pylons: cracked wooden posts — crack lines multiply as hp falls
  for (const p of V3.pylons) {
    const sx = SX(p.x), sy = SY(p.y);
    if (!onScreen(sx, sy, 60)) continue;
    ctx.save();
    ctx.fillStyle = '#7a5230'; ctx.fillRect(sx - 9, sy - 30, 18, 60);
    ctx.strokeStyle = '#3a2410'; ctx.lineWidth = 2; ctx.strokeRect(sx - 9, sy - 30, 18, 60);
    ctx.strokeStyle = '#ffd93b'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(sx - 7, sy - 18); ctx.lineTo(sx + 2, sy - 4); ctx.lineTo(sx - 4, sy + 8);
    if (p.hp < 2) { ctx.moveTo(sx + 7, sy - 24); ctx.lineTo(sx - 1, sy - 10); ctx.lineTo(sx + 5, sy + 4); ctx.lineTo(sx, sy + 20); }
    ctx.stroke();
    ctx.restore();
  }
  // barrels in flight: brown, banded, red ones wider and angrier
  for (const bl of V3.barrels) {
    const sx = SX(bl.x), sy = SY(bl.y);
    if (!onScreen(sx, sy, 40)) continue;
    ctx.save();
    ctx.fillStyle = bl.red ? '#c23b2a' : '#8a5a2e';
    ctx.beginPath(); ctx.arc(sx, sy, bl.red ? 17 : 14, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#3a2410'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,220,150,0.8)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(sx - 10, sy); ctx.lineTo(sx + 10, sy); ctx.stroke();
    ctx.restore();
  }
  const b = V3.boss;
  if (!b) return;
  const sx = SX(b.x), sy = SY(b.y);
  if (onScreen(sx, sy, 120)) {
    ctx.save();
    if (b.phase < 4) {   // the scaffold platform under him
      ctx.fillStyle = '#5a4028'; ctx.fillRect(sx - 90, sy + 30, 180, 12);
      ctx.strokeStyle = '#2e1e0e'; ctx.lineWidth = 2; ctx.strokeRect(sx - 90, sy + 30, 180, 12);
    }
    ctx.font = (b.phase === 4 ? 74 : 84) + 'px serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🦍', sx, sy);
    ctx.restore();
    // boss bar: phases 1–3 show pylons (the real health), phase 4 shows HP
    ctx.save();
    const bw = 190, bx = clamp(sx - bw / 2, 8, VW - bw - 8), by = Math.max(54, sy - 86);
    ctx.fillStyle = 'rgba(6,8,28,0.8)'; ctx.fillRect(bx, by, bw, 17);
    ctx.fillStyle = b.phase === 4 ? '#ff3b6b' : '#c98a4b';
    const frac = b.phase === 4 ? clamp(b.hp / b.maxHp, 0, 1) : V3.pylons.length / APE.pylons;
    ctx.fillRect(bx + 2, by + 2, (bw - 4) * frac, 13);
    ctx.strokeStyle = '#ffd93b'; ctx.lineWidth = 1.5; ctx.strokeRect(bx, by, bw, 17);
    ctx.fillStyle = '#fff'; ctx.font = '800 10.5px "Segoe UI", sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(b.phase === 4 ? 'THE APE — GROUND FIGHT' : 'THE APE — PYLONS ' + V3.pylons.length + '/4 (bait his barrels!)', bx + bw / 2, by + 27);
    ctx.restore();
  }
}
function drawPartner() {
  const pt = V3.partner;
  if (!pt || !pt.deployed) return;
  const sx = SX(pt.x), sy = SY(pt.y);
  if (!onScreen(sx, sy, 50)) return;
  ctx.save();
  ctx.fillStyle = pt.pkgColor || '#ff9de2';
  ctx.beginPath(); ctx.arc(sx, sy, 14, 0, TAU); ctx.fill();
  ctx.fillStyle = '#c2185b';   // her bow
  ctx.beginPath(); ctx.arc(sx - 5, sy - 13, 4, 0, TAU); ctx.arc(sx + 5, sy - 13, 4, 0, TAU); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = '700 9px "Segoe UI", sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('PARTNER — T TO TAG', sx, sy - 24);
  ctx.restore();
}
// Fog / darkness: the build's darkness layer is the vignette; v3 adds a
// true reveal disc — darkness closes in beyond revealRadius(), and Light
// Radius (signed, gear-rolled) pushes that edge out or pulls it in.
function drawFog() {
  const R = revealRadius();
  const g = ctx.createRadialGradient(VW / 2, VH / 2, R * 0.55, VW / 2, VH / 2, R * 1.45);
  g.addColorStop(0, 'rgba(2,2,12,0)');
  g.addColorStop(0.75, 'rgba(2,2,12,0.28)');
  g.addColorStop(1, 'rgba(2,2,12,0.66)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VW, VH);
  if (player.lightRadius !== 0) {
    ctx.save();
    ctx.fillStyle = player.lightRadius > 0 ? 'rgba(255,240,180,0.9)' : 'rgba(150,160,255,0.9)';
    ctx.font = '700 10px "Segoe UI", sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('LIGHT RADIUS ' + (player.lightRadius > 0 ? '+' : '') + player.lightRadius, VW / 2, VH - 8);
    ctx.restore();
  }
}
// The upgraded radar: a real minimap, always on. Edible ghosts are BLUE and
// distinct; hunters are pale; fruit pink; stones/pellets gold. The fog rule
// binds it: only EXPLORED ground and the things on it render at all.
function drawRadarMinimap() {
  if (G.state !== 'playing' && G.state !== 'paused') return;
  const mw = 156, mh = 118, mx = VW - mw - 10, my = VH - mh - 10;
  ctx.save();
  ctx.fillStyle = 'rgba(6,8,28,0.72)';
  ctx.strokeStyle = 'rgba(120,140,255,0.55)'; ctx.lineWidth = 1.5;
  ctx.fillRect(mx, my, mw, mh); ctx.strokeRect(mx, my, mw, mh);
  const px2w = (x) => mx + (wrapPos(x, WORLD_W) / WORLD_W) * mw;
  const py2w = (y) => my + (wrapPos(y, WORLD_H) / WORLD_H) * mh;
  ctx.fillStyle = 'rgba(120,150,255,0.16)';   // explored cells
  for (const key of V3.explored) {
    const [cx, cy] = key.split(',').map(Number);
    ctx.fillRect(mx + (cx / 34) * mw, my + (cy / 26) * mh, mw / 34 + 1, mh / 26 + 1);
  }
  const dot = (x, y, color, r) => { if (!cellExplored(x, y)) return; ctx.fillStyle = color; ctx.beginPath(); ctx.arc(px2w(x), py2w(y), r, 0, TAU); ctx.fill(); };
  for (const f of fruits) dot(f.x, f.y, '#ff4d7e', 2.6);
  for (const pl of pellets) dot(pl.x, pl.y, '#ffd93b', 2.6);
  for (const g of ghosts) {
    if (!g.alive) continue;
    dot(g.x, g.y, player.eatT > 0 ? '#3b6bff' : (g.elite ? '#ffd93b' : '#dfe6ff'), g.elite ? 3 : 2.2);
  }
  if (V3.boss) dot(V3.boss.x, V3.boss.y, '#ff3b30', 4);
  if (V3.partner && V3.partner.deployed) dot(V3.partner.x, V3.partner.y, '#ff9de2', 2.6);
  ctx.fillStyle = '#ffd21f';   // Pac is always the bright centre of his own map
  ctx.beginPath(); ctx.arc(px2w(player.x), py2w(player.y), 3.2, 0, TAU); ctx.fill();
  ctx.fillStyle = '#8fa2ff'; ctx.font = '700 8.5px "Segoe UI", sans-serif'; ctx.textAlign = 'left';
  ctx.fillText('RADAR — EXPLORED ONLY', mx + 5, my + 11);
  ctx.restore();
}
// The wheel overlay: 7 slices in wheel order, spinning to its landing while
// the state is 'spin', resting on the landed stat behind the card screen.
function drawWheelOverlay() {
  if (G.state !== 'spin' && G.state !== 'levelup') return;
  const cx = VW / 2, cy = Math.min(VH * 0.30, 210), R = 74;
  const p = G.state === 'spin' ? clamp(V3.spin.animT / V3.spin.dur, 0, 1) : 1;
  const ease = 1 - Math.pow(1 - p, 3);
  const spinIdx = G.state === 'spin'
    ? Math.floor(ease * (21 + V3.spin.statIdx)) % 7
    : V3.spin.statIdx;
  ctx.save();
  ctx.fillStyle = 'rgba(4,6,24,0.55)';
  ctx.beginPath(); ctx.arc(cx, cy, R + 14, 0, TAU); ctx.fill();
  for (let i = 0; i < 7; i++) {
    const a0 = -Math.PI / 2 + (i / 7) * TAU, a1 = -Math.PI / 2 + ((i + 1) / 7) * TAU;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, a0, a1); ctx.closePath();
    ctx.fillStyle = WHEEL[i].color;
    ctx.globalAlpha = i === spinIdx ? 1 : 0.38;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#0a0d26'; ctx.lineWidth = 2; ctx.stroke();
    const am = (a0 + a1) / 2;
    ctx.fillStyle = '#fff'; ctx.font = '800 10px "Segoe UI", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(WHEEL[i].name.slice(0, 3).toUpperCase(), cx + Math.cos(am) * R * 0.68, cy + Math.sin(am) * R * 0.68);
  }
  ctx.fillStyle = '#0a0d26'; ctx.beginPath(); ctx.arc(cx, cy, 17, 0, TAU); ctx.fill();
  ctx.fillStyle = '#ffd93b'; ctx.font = '900 13px "Segoe UI", sans-serif';
  ctx.fillText('🎡', cx, cy);
  ctx.fillStyle = '#fff'; ctx.font = '800 13px "Segoe UI", sans-serif';
  ctx.fillText(G.state === 'spin' ? 'THE WHEEL SPINS…' : 'THE WHEEL DEALT: ' + WHEEL[V3.spin.statIdx].name.toUpperCase(), cx, cy + R + 30);
  ctx.restore();
}

// ================= v3.0.0 — menu wiring: difficulty, endless, tombstone, version =================
function refreshMenuV3() {
  const d = Save.data;
  document.querySelectorAll('[data-diff]').forEach((b) => {
    b.classList.toggle('on', b.getAttribute('data-diff') === d.difficulty);
  });
  const eb = document.getElementById('endlessBtn');
  if (eb) {
    const unlocked = !!d.endlessUnlocked['level6'];
    eb.textContent = '♾ ENDLESS: ' + (!unlocked ? 'LOCKED (beat the Level 6 boss)' : (V3.endlessSelected ? 'ON' : 'OFF'));
    eb.style.opacity = unlocked ? '1' : '0.45';
  }
  const tb = document.getElementById('tombstone');
  if (tb) {
    if (d.hardcoreDeath) {
      tb.classList.remove('hidden');
      tb.innerHTML = '🪦 HERE LIES <b>' + d.hardcoreDeath.char.toUpperCase() + '</b> — died on HARD (hardcore) at level ' +
        d.hardcoreDeath.level + ', score ' + d.hardcoreDeath.score + '. The character is gone. (Prototype: Reset save is the only way back — canon offers no undo.)';
      document.getElementById('startBtn').style.opacity = '0.4';
    } else {
      tb.classList.add('hidden');
      document.getElementById('startBtn').style.opacity = '1';
    }
  }
  const tl = document.getElementById('teamLine');
  if (tl) tl.textContent = d.teamUnlocked
    ? 'TEAM UP unlocked — partner fields with you; press T to tag in. Team size ' + d.teamSize + ' of 3 (third slot: data model ready).'
    : 'TEAM UP locks at 10 total levels of account progress — you are at ' + d.cumulativeLevels + '.';
}
document.querySelectorAll('[data-diff]').forEach((b) => {
  b.addEventListener('click', () => {
    Save.data.difficulty = b.getAttribute('data-diff');
    Save.write(true);
    Teach.fire('difficulty');
    refreshMenuV3();
  });
});
{ const eb = document.getElementById('endlessBtn');
  if (eb) eb.addEventListener('click', () => {
    if (!Save.data.endlessUnlocked['level6']) { toast('ENDLESS IS LOCKED — BEAT THE LEVEL 6 BOSS'); return; }
    V3.endlessSelected = !V3.endlessSelected;
    refreshMenuV3();
  });
}
{ const bb = document.getElementById('bossGoBtn');
  if (bb) bb.addEventListener('click', () => {
    document.getElementById('bossIntro').classList.add('hidden');
    G.state = 'playing';
    spawnApe();
    resumeGrace();
  });
}
{ const tb2 = document.getElementById('tagBtn');
  if (tb2) tb2.addEventListener('click', () => tagIn());
}
{ const bb2 = document.getElementById('burstBtn');
  if (bb2) bb2.addEventListener('click', () => { G.wantBurst = true; });
}
// the grace window, shared by card picks and the boss-intro dismissal
function resumeGrace() {
  Teach.fire('grace', player.x, player.y);
  player.graceT = 1.5;
  player.invulnUntil = Math.max(player.invulnUntil, G.time + 1.5);
  floater(player.x, player.y - 38, 'GRACE!', '#9df2ff');
}
function resumeAfterPick() {
  G.state = 'playing';
  resumeGrace();
}

// ---------------- Main loop ----------------
const TEST_MODE = new URLSearchParams(window.location.search).get('test') === '1';
const INTRO_TEST = new URLSearchParams(window.location.search).get('test') === 'intro';
if (TEST_MODE || INTRO_TEST) TEACH_LIVE = false;   // scripted runs are never frozen by a lesson
let lastTs = 0, saveTimer = 0;
function frame(ts) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, lastTs ? (ts - lastTs) / 1000 : 0.016);
  lastTs = ts;
  animT += dt;
  if (TEST_MODE) {
    // headless smoke test: wander in a slow lissajous so systems engage
    touchMove = { dx: Math.cos(ts * 0.00042), dy: Math.sin(ts * 0.00061) };
  }
  if (G.state === 'intro') {
    Intro.update(dt);
    Intro.render();
  } else if (G.state === 'spin') {
    V3.spin.animT += dt;
    if (V3.spin.animT >= V3.spin.dur) openLevelUp();
    render();
  } else {
    if (G.state === 'playing') {
      // a first-sight lesson freezes the world until it is dismissed
      if (!Teach.active) {
        update(dt);
        saveTimer += dt;
        if (saveTimer >= 15) { saveTimer = 0; Save.write(true); }   // periodic mid-run save
      }
    }
    render();
  }
  G.hudT += dt;
  if (G.hudT > 0.1) {
    G.hudT = 0;
    updateHUD();
    if (TEST_MODE || INTRO_TEST) {
      let saveFlag = 'N';
      try { saveFlag = localStorage.getItem(SAVE_KEY) ? 'Y' : 'N'; } catch (e) { saveFlag = 'E'; }
      el.debug.textContent = 'TEST state=' + G.state + ' t=' + G.time.toFixed(1) +
        ' score=' + Math.floor(G.score) + ' ghosts=' + ghosts.filter((g) => g.alive).length +
        ' dots=' + dots.length + ' hp=' + Math.ceil(player.hp) + ' lv=' + player.level +
        ' eatT=' + player.eatT.toFixed(1) + ' shiftCd=' + player.shiftCd.toFixed(1) +
        ' frz=' + player.freezeT.toFixed(2) + ' walls=' + WALLS.length +
        ' save=' + saveFlag +
        (G.state === 'intro' ? ' introBeat=' + Intro.beatName() + ' introT=' + Intro.t.toFixed(1) : '');
    }
  }
}

// boot: the intro is the first thing that loads; the menu waits behind it
resetGame();
refreshSaveLine();
window.PAC_DEBUG = { G, Intro, player, Save, Teach, beginRun, buildChoices, pickCard, computeStick, togglePause,
  V3, WHEEL, STONES, TrigState, TRIGGER_CONFIG, PAC_VERSION, planSpin, startSpin, rollSigned, thresholdSteps,
  fireTrigger, spawnApe, apeDamage, pickStone, tagIn, revealRadius, limitForLevel, eliteChance,
  get choices() { return levelChoices; },
  doTimeShift, requestShift,
  radarTargets, isWallAt, circleHitsWall, WALLS,
  get dots() { return dots; }, get fruits() { return fruits; },
  get ghosts() { return ghosts; }, get pellets() { return pellets; } };
if (TEST_MODE) {
  G.state = 'menu';
  document.getElementById('startScreen').classList.add('hidden');
  beginRun();
} else {
  if (INTRO_TEST) { Intro.timeScale = 24; Intro.autoStart = true; }
  Intro.start();
}
requestAnimationFrame(frame);
