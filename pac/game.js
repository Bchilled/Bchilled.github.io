'use strict';
/* =========================================================================
   PAC — Arena Muncher (prototype v1)
   Vampire-Survivors-like on a big looping (toroidal) arena with Pac-Man DNA.
   Single file, no assets: canvas primitives + WebAudio synth only.
   ========================================================================= */

// ---------------- World / tuning constants ----------------
const WORLD_W = 3400;            // arena width  (world wraps on both axes)
const WORLD_H = 2600;            // arena height
const TAU = Math.PI * 2;

const DOT_TARGET   = 300;        // dots kept alive on the field
const DOT_CAP      = 420;
const GHOST_CAP    = 220;   // swarm ceiling — ghost pressure is the lose condition
const TRAIL_CAP    = 240;
const PARTICLE_CAP = 350;

const PELLET_INTERVAL = 20;      // seconds between power-pellet spawns
const FRUIT_INTERVAL  = 38;      // seconds between fruit spawns

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
  keys[e.key.toLowerCase()] = true;
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase())) e.preventDefault();
  if (e.key === ' ') G.wantDash = true;
  if (e.key === '1' || e.key === '2' || e.key === '3') setActivePower(Number(e.key) - 1);
  if (e.key.toLowerCase() === 'm') toggleMute();
  if (e.key.toLowerCase() === 'p') togglePause();
});
window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

let touchId = null, touchStartX = 0, touchStartY = 0;
canvas.addEventListener('touchstart', (e) => {
  document.body.classList.add('touch');
  for (const t of e.changedTouches) {
    if (touchId === null) { touchId = t.identifier; touchStartX = t.clientX; touchStartY = t.clientY; }
  }
  e.preventDefault();
}, { passive: false });
canvas.addEventListener('touchmove', (e) => {
  for (const t of e.changedTouches) {
    if (t.identifier === touchId) {
      let dx = t.clientX - touchStartX, dy = t.clientY - touchStartY;
      const len = Math.hypot(dx, dy);
      if (len > 12) { touchMove = { dx: dx / len, dy: dy / len }; }
      else touchMove = null;
    }
  }
  e.preventDefault();
}, { passive: false });
function endTouch(e) {
  for (const t of e.changedTouches) {
    if (t.identifier === touchId) { touchId = null; touchMove = null; }
  }
}
canvas.addEventListener('touchend', endTouch);
canvas.addEventListener('touchcancel', endTouch);
document.getElementById('dashBtn').addEventListener('touchstart', (e) => {
  e.preventDefault(); e.stopPropagation(); touchDashQueued = true;
}, { passive: false });
document.getElementById('dashBtn').addEventListener('click', () => { G.wantDash = true; });

// ---------------- Copy powers (the Kirby layer) ----------------
// Eating a ghost copies ITS power. Ghost type -> power it carries:
const GHOST_POWER = { chaser: 'fire', ambusher: 'dash', flanker: 'magnet', wildcard: null };
const POWER_DEFS = {
  fire:   { name: 'Fire Trail', icon: '🔥',
            desc: 'While active, you leave a burning trail. Ghosts that touch it burn up (+score, +XP).' },
  dash:   { name: 'Chomp Dash', icon: '💨',
            desc: 'SPACE: burst forward — invulnerable mid-dash and you can EAT ghosts, copying their powers.' },
  magnet: { name: 'Magnet Maw', icon: '🧲',
            desc: 'While active, dots and fruit stream toward your mouth from far away.' }
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
    settings: { muted: false }
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
  if (raw.settings) d.settings.muted = !!raw.settings.muted;
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
      settings: { muted: Snd.muted }
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

// ---------------- Game state ----------------
const G = {
  state: 'menu',           // menu | playing | levelup | paused | gameover
  time: 0, score: 0, best: 0, eaten: 0, dots: 0,
  runCounted: true,        // false while a run is live and not yet folded into the save
  wantDash: false,
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
  // eat mode
  eatT: 0, eatChain: 0,
  trailAcc: 0
};

let dots = [];        // {x,y,r,kind}  kind: dot
let pellets = [];     // {x,y,ttl}
let fruits = [];      // {x,y,ttl,kind}
let ghosts = [];      // see spawnGhost
let trail = [];       // {x,y,ttl,max}
let particles = [];   // {x,y,vx,vy,ttl,max,color,size}
let floaters = [];    // {x,y,ttl,text,color}
let pelletTimer = 8, fruitTimer = 20, ghostTimer = 0, dotTimer = 0, surgeTimer = 55;

function xpForLevel(lv) { return Math.floor(9 * Math.pow(1.26, lv - 1)) + lv * 2; }
function hasPower(id) { return player.powers.find((p) => p.id === id) || null; }
function activePowerId() {
  const p = player.powers[player.activePower];
  return p ? p.id : null;
}

// ---------------- Spawning ----------------
function spawnDotCluster() {
  // dots stream in trails/clusters, Vampire-Survivors style
  let x = rand(0, WORLD_W), y = rand(0, WORLD_H);
  const n = randi(6, 14);
  const style = randi(0, 2);
  const ang = rand(0, TAU);
  for (let i = 0; i < n && dots.length < DOT_CAP; i++) {
    let px = x, py = y;
    if (style === 0) { px = x + Math.cos(ang) * i * 27; py = y + Math.sin(ang) * i * 27; }
    else if (style === 1) { const a = (i / n) * TAU; px = x + Math.cos(a) * 44; py = y + Math.sin(a) * 44; }
    else { px = x + rand(-55, 55); py = y + rand(-55, 55); }
    dots.push({ x: wrapPos(px, WORLD_W), y: wrapPos(py, WORLD_H), r: 5, pulse: rand(0, TAU) });
  }
}
function spawnPellet() {
  for (let tries = 0; tries < 12; tries++) {
    const x = rand(0, WORLD_W), y = rand(0, WORLD_H);
    if (tDist(x, y, player.x, player.y) > 260) { pellets.push({ x, y, ttl: 30 }); return; }
  }
}
const FRUIT_KINDS = [
  { name: 'Cherry', xp: 12, score: 500, color: '#ff2e4d' },
  { name: 'Strawberry', xp: 18, score: 800, color: '#ff4d7e' },
  { name: 'Orange', xp: 26, score: 1200, color: '#ff9a3b' },
  { name: 'Melon', xp: 40, score: 2000, color: '#37e08b' }
];
function spawnFruit(x, y) {
  const kind = FRUIT_KINDS[randi(0, FRUIT_KINDS.length - 1)];
  if (x === undefined) {
    for (let tries = 0; tries < 12; tries++) {
      const fx = rand(0, WORLD_W), fy = rand(0, WORLD_H);
      if (tDist(fx, fy, player.x, player.y) > 320) { x = fx; y = fy; break; }
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
  const t = G.time;
  return Math.min(GHOST_CAP, Math.floor(5 + t * 0.28 + Math.pow(t / 60, 2.2) * 5));
}

function placeGhostAtEdge(g, ang, dist) {
  // (re)enter off-screen, at a wrapped distance from the player
  const a = ang !== undefined ? ang : rand(0, TAU);
  const d = dist !== undefined ? dist : rand(680, 860);
  g.x = wrapPos(player.x + Math.cos(a) * d, WORLD_W);
  g.y = wrapPos(player.y + Math.sin(a) * d, WORLD_H);
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
  g.elite = G.time > 80 && Math.random() < 0.10;
  g.r = g.elite ? 25 : 16;
  g.modeT = rand(2, 4); g.wander = false; g.wanderX = 0; g.wanderY = 0;
  if (ringAng !== undefined) placeGhostAtEdge(g, ringAng, rand(700, 790));
  else placeGhostAtEdge(g);
}
function killGhost(g, grantPower, basePoints) {
  g.alive = false;
  g.respawnAt = 3.2;
  G.eaten++;
  burst(g.x, g.y, GHOST_STYLE[g.type].color, 14);
  if (grantPower) {
    const pid = GHOST_POWER[g.type] || randomPowerId();
    grantCopyPower(pid);
  }
  if (g.elite) { spawnFruit(g.x, g.y); floater(g.x, g.y - 30, 'ELITE DOWN!', '#ffd93b'); }
  return basePoints;
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
  Snd.copySting();
  renderPowerSlots();
}
function setActivePower(i) {
  if (i >= 0 && i < player.powers.length) { player.activePower = i; renderPowerSlots(); }
}

// ---------------- Level-up choices ----------------
function buildChoices() {
  const pool = [];
  for (const id of Object.keys(POWER_DEFS)) {
    const held = hasPower(id);
    if (!held && player.powers.length < 3) {
      pool.push({ tag: 'New Power', power: true, icon: POWER_DEFS[id].icon,
        name: POWER_DEFS[id].name, desc: POWER_DEFS[id].desc,
        apply: () => { player.powers.push({ id, lvl: 1 }); player.activePower = player.powers.length - 1; } });
    } else if (held && held.lvl < 3) {
      const upDesc = { fire: 'Trail lasts longer and burns ghosts faster.',
        dash: 'Dash cooldown −30%, dash lasts longer.',
        magnet: 'Magnet radius +45%.' }[id];
      pool.push({ tag: 'Upgrade Power', power: true, icon: POWER_DEFS[id].icon,
        name: POWER_DEFS[id].name + ' Lv' + (held.lvl + 1), desc: upDesc,
        apply: () => { held.lvl++; } });
    }
  }
  const stats = [
    { icon: '👟', name: 'Zoom Grease', desc: 'Move speed +9%.', apply: () => { player.speedMul *= 1.09; } },
    { icon: '❤️', name: 'Thick Peel', desc: 'Max HP +25 and heal 25.', apply: () => { player.maxHp += 25; player.hp = Math.min(player.maxHp, player.hp + 25); } },
    { icon: '🧲', name: 'Wide Gullet', desc: 'Passive dot-magnet radius +45.', apply: () => { player.magnetR += 45; } },
    { icon: '🦷', name: 'Mega Chomp', desc: 'Chomp radius +5 — eat dots & ghosts from further.', apply: () => { player.chompBonus += 5; } },
    { icon: '🔵', name: 'Blue Rage', desc: 'Eat Mode lasts +1.6s per pellet.', apply: () => { player.eatBonus += 1.6; } },
    { icon: '🔥', name: 'Combo Lube', desc: 'Combo lasts +0.6s before it drains.', apply: () => { player.comboWindow += 0.6; } },
    { icon: '🍒', name: 'Fruit Feast', desc: 'Heal 45 HP right now.', apply: () => { player.hp = Math.min(player.maxHp, player.hp + 45); } }
  ];
  for (const s of stats) pool.push({ tag: 'Stat', power: false, icon: s.icon, name: s.name, desc: s.desc, apply: s.apply });
  // shuffle, take 3
  for (let i = pool.length - 1; i > 0; i--) { const j = randi(0, i); const t = pool[i]; pool[i] = pool[j]; pool[j] = t; }
  return pool.slice(0, 3);
}
let pendingLevels = 0;
function gainXP(n) {
  player.xp += n;
  while (player.xp >= player.xpNext) {
    player.xp -= player.xpNext;
    player.level++;
    player.xpNext = xpForLevel(player.level);
    pendingLevels++;
  }
}
function openLevelUp() {
  G.state = 'levelup';
  Save.write(true);        // progress checkpoint (new best level, live totals)
  Snd.levelUp();
  const wrap = document.getElementById('cards');
  wrap.innerHTML = '';
  for (const choice of buildChoices()) {
    const d = document.createElement('div');
    d.className = 'card';
    d.innerHTML = '<div class="tag' + (choice.power ? ' power' : '') + '">' + choice.tag + '</div>' +
      '<div class="ico">' + choice.icon + '</div>' +
      '<div class="name">' + choice.name + '</div>' +
      '<div class="desc">' + choice.desc + '</div>';
    d.addEventListener('click', () => {
      choice.apply();
      pendingLevels--;
      document.getElementById('levelupScreen').classList.add('hidden');
      renderPowerSlots();
      if (pendingLevels > 0) openLevelUp();
      else G.state = 'playing';
    });
    wrap.appendChild(d);
  }
  document.getElementById('levelupScreen').classList.remove('hidden');
}

// ---------------- Run management ----------------
function resetGame() {
  G.time = 0; G.score = 0; G.eaten = 0; G.dots = 0; G.shake = 0;
  player.x = WORLD_W / 2; player.y = WORLD_H / 2; player.vx = 0; player.vy = 0;
  player.hp = 100; player.maxHp = 100; player.lives = 3;
  player.xp = 0; player.level = 1; player.xpNext = xpForLevel(1);
  player.combo = 0; player.comboTimer = 0;
  player.speedMul = 1; player.magnetR = 78; player.chompBonus = 0;
  player.comboWindow = 2.3; player.eatBonus = 0;
  player.powers = []; player.activePower = 0;
  player.dashT = 0; player.dashCd = 0; player.eatT = 0; player.eatChain = 0;
  player.invulnUntil = -1;
  dots = []; pellets = []; fruits = []; ghosts = []; trail = []; particles = []; floaters = [];
  pelletTimer = 9; fruitTimer = 22; ghostTimer = 0; dotTimer = 0; surgeTimer = 55;
  pendingLevels = 0;
  for (let i = 0; i < 10; i++) spawnDotCluster();
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
  G.best = Save.data.best.score;
  Save.write();
  refreshSaveLine();
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
    player.dashT = 0.16 + 0.03 * (dashPow.lvl - 1);
    player.dashCd = 2.6 * Math.pow(0.72, dashPow.lvl - 1);
    if (ilen > 0.01) { player.dashDirX = ix; player.dashDirY = iy; }
    else { player.dashDirX = Math.cos(player.angle); player.dashDirY = Math.sin(player.angle); }
    Snd.dash();
  }
  G.wantDash = false;

  // ---- player movement ----
  const baseSpeed = 272 * player.speedMul * comboSpeed;
  if (player.dashT > 0) {
    player.dashT -= dt;
    player.vx = player.dashDirX * baseSpeed * 3.2;
    player.vy = player.dashDirY * baseSpeed * 3.2;
  } else {
    const accel = 2400;
    player.vx += clamp(ix * baseSpeed - player.vx, -accel * dt, accel * dt);
    player.vy += clamp(iy * baseSpeed - player.vy, -accel * dt, accel * dt);
    if (ilen < 0.01) { player.vx *= Math.pow(0.0001, dt); player.vy *= Math.pow(0.0001, dt); }
  }
  player.x = wrapPos(player.x + player.vx * dt, WORLD_W);
  player.y = wrapPos(player.y + player.vy * dt, WORLD_H);
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
    const dx = wrapDelta(player.x - d.x, WORLD_W);
    const dy = wrapDelta(player.y - d.y, WORLD_H);
    const dist = Math.hypot(dx, dy);
    if (dist < magnetR && dist > 1) {
      const pull = magnetPull * dt;
      d.x = wrapPos(d.x + (dx / dist) * Math.min(pull, dist), WORLD_W);
      d.y = wrapPos(d.y + (dy / dist) * Math.min(pull, dist), WORLD_H);
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
        f.x = wrapPos(f.x + (dx / dist) * magnetPull * dt, WORLD_W);
        f.y = wrapPos(f.y + (dy / dist) * magnetPull * dt, WORLD_H);
      }
    }
    if (tDist(f.x, f.y, player.x, player.y) < eatR + 12) {
      fruits.splice(i, 1);
      G.score += f.kind.score * comboMult;
      gainXP(f.kind.xp);
      player.hp = Math.min(player.maxHp, player.hp + 8);
      floater(f.x, f.y - 18, f.kind.name + ' +' + f.kind.xp + ' XP', '#7dff8a');
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
    g.x = wrapPos(g.x + g.vx * dt, WORLD_W);
    g.y = wrapPos(g.y + g.vy * dt, WORLD_H);

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
        player.hp -= 13;
        player.combo = Math.floor(player.combo / 2);
        player.invulnUntil = G.time + 0.9;
        G.shake = 9;
        burst(player.x, player.y, '#ff3b6b', 10);
        Snd.hurt();
        if (player.hp <= 0) { loseLife(); if (G.state !== 'playing') return; }
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

  // ---- level up? ----
  if (pendingLevels > 0 && G.state === 'playing') openLevelUp();
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
    ctx.fillStyle = player.eatT > 0 ? '#ffe93b' : '#ffd21f';
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.arc(px, py, player.r + player.chompBonus * 0.4, player.angle + mouth, player.angle + TAU - mouth);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath(); ctx.arc(px - 4, py - 6, 4.4, 0, TAU); ctx.fill();
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
  ctx.restore();

  // eat-mode tint + vignette
  if (player.eatT > 0) {
    ctx.fillStyle = 'rgba(40,80,255,0.07)';
    ctx.fillRect(0, 0, VW, VH);
  }
  if (vignette) ctx.drawImage(vignette, 0, 0, VW, VH);
}

// ---------------- HUD ----------------
const el = {
  score: document.getElementById('scoreText'), time: document.getElementById('timeText'),
  level: document.getElementById('levelText'), lives: document.getElementById('livesText'),
  hp: document.getElementById('hpFill'), xp: document.getElementById('xpFill'),
  combo: document.getElementById('comboText'), comboFill: document.getElementById('comboFill'),
  best: document.getElementById('bestText'), eaten: document.getElementById('eatenText'),
  eatBanner: document.getElementById('eatBanner'), powers: document.getElementById('powers'),
  debug: document.getElementById('debugState')
};
function updateHUD(force) {
  el.score.textContent = Math.floor(G.score).toLocaleString();
  el.time.textContent = fmtTime(G.time);
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
  if (G.state === 'playing') { G.state = 'paused'; document.getElementById('pauseScreen').classList.remove('hidden'); }
  else if (G.state === 'paused') { G.state = 'playing'; document.getElementById('pauseScreen').classList.add('hidden'); }
}
function beginRun() {
  resetGame();
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
window.addEventListener('pointerdown', () => { if (G.state === 'intro') endIntro(); });
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
function drawSpeech(x, y, text, size, color, bg) {
  ctx.save();
  ctx.font = '800 ' + size + 'px "Segoe UI", sans-serif';
  const w = ctx.measureText(text).width + 30;
  ctx.fillStyle = bg || 'rgba(10,10,24,0.88)';
  ctx.strokeStyle = 'rgba(160,175,255,0.5)'; ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x - w / 2, y - size * 0.95, w, size * 1.7, 10); else ctx.rect(x - w / 2, y - size * 0.95, w, size * 1.7);
  ctx.fill(); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - 8, y + size * 0.72); ctx.lineTo(x + 8, y + size * 0.72); ctx.lineTo(x, y + size * 1.18);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = color || '#fff';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
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

// ---- intro scene renderer ----
Intro.render = function () {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  const b = this.beatAt(this.t);
  const lt = b.lt, d = b.d;
  const U = Math.min(VW, VH);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

  if (b.i === 0) {
    // 1 — Darkness. The spotlight snaps on.
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, VW, VH);
    if (lt > 1.0) {
      const snap = clamp((lt - 1.0) / 0.18, 0, 1);
      const flick = (lt < 1.35 && Math.random() < 0.4) ? 0.55 : 1;
      drawPage(0.55 * snap * flick);
      spotlight((1 - 0.25 * snap) * flick);
    }
  } else if (b.i === 1) {
    // 2 — The crawl rises through the light, line by line, into its rows.
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, VW, VH);
    drawPage(0.6);
    const g = this.geom();
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
  } else if (b.i === 2) {
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
    if (lt >= 4.3) drawSpeech(cx, cy + 148 * s, 'DO IT.', clamp(U * 0.055, 22, 38), '#ffd93b');
  } else if (b.i === 3) {
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
      for (const db of this.debris) {
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
  } else if (b.i === 4) {
    // 5–7 — Pac's entrance: he eats the crawl row by row, the narrator fails, he GROWS.
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, VW, VH);
    drawPage(0.6);
    const g = this.geom();
    const es = this.eatState(lt);
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
    // the narrator, failing in real time
    ctx.save();
    ctx.font = 'italic 600 ' + clamp(VW * 0.019, 13, 19) + 'px Georgia, serif';
    ctx.fillStyle = 'rgba(200,208,255,0.85)';
    ctx.fillText(NARRATOR_LINES[es.row], VW / 2, VH * 0.9);
    ctx.restore();
    spotlight(0.75);
  } else if (b.i === 5) {
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
    drawIntroParts();
  } else if (b.i === 6) {
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
    drawIntroParts();
  } else if (b.i === 7) {
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
    drawIntroParts();
    if (lt >= 1.1) {
      ctx.save();
      ctx.globalAlpha = clamp((lt - 1.1) / 0.8, 0, 1);
      ctx.font = '900 ' + clamp(VW * 0.036, 22, 40) + 'px "Segoe UI", sans-serif';
      ctx.fillStyle = '#ff5e3a';
      ctx.shadowColor = 'rgba(255,60,30,0.6)'; ctx.shadowBlur = 14;
      ctx.fillText('I WILL HUNT YOU DOWN.', VW / 2, VH * 0.74);
      ctx.restore();
    }
  } else if (b.i === 8) {
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
  } else if (b.i === 9) {
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
  } else if (b.i === 10) {
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
  } else if (b.i === 11) {
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
  } else if (b.i === 12) {
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
  // SKIP affordance — always visible, never subtle about existing
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

// ---------------- Main loop ----------------
const TEST_MODE = new URLSearchParams(window.location.search).get('test') === '1';
const INTRO_TEST = new URLSearchParams(window.location.search).get('test') === 'intro';
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
  } else {
    if (G.state === 'playing') {
      update(dt);
      saveTimer += dt;
      if (saveTimer >= 15) { saveTimer = 0; Save.write(true); }   // periodic mid-run save
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
        ' save=' + saveFlag +
        (G.state === 'intro' ? ' introBeat=' + Intro.beatName() + ' introT=' + Intro.t.toFixed(1) : '');
    }
  }
}

// boot: the intro is the first thing that loads; the menu waits behind it
resetGame();
refreshSaveLine();
window.PAC_DEBUG = { G, Intro };
if (TEST_MODE) {
  G.state = 'menu';
  document.getElementById('startScreen').classList.add('hidden');
  beginRun();
} else {
  if (INTRO_TEST) { Intro.timeScale = 24; Intro.autoStart = true; }
  Intro.start();
}
requestAnimationFrame(frame);
