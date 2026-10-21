// PAC v0.9 — core.js: helpers, save, settings, renderer + bloom, camera, audio engine (techno + SFX), voice lines.
"use strict";
const $ = id => document.getElementById(id);
const clamp = (v,a,b) => v<a?a:v>b?b:v, rnd = (a,b) => a+Math.random()*(b-a), pick = a => a[Math.floor(Math.random()*a.length)], hyp = Math.hypot;
const lerp = (a,b,t) => a+(b-a)*t, angDiff = (a,b) => Math.atan2(Math.sin(b-a), Math.cos(b-a));
const WHEEL = ['Strength','Vitality','Spirit','Intellect','Agility','Speciality','Nature'];
const STAT_COL = {Strength:'#e05a4a',Vitality:'#a8a8b8',Spirit:'#5a9aff',Intellect:'#a070e0',Agility:'#5ac070',Speciality:'#ff9a3a',Nature:'#3ac0b0'};

// ---------------- SAVE (browser storage is a convenience; the game runs without it) ----------------
const SAVE_KEY = 'pac-save-v3';
const DEF_SAVE = () => ({unlocked:['pac'], beaten:{}, char:'pac', seenIntro:false, best:{campaign:0,endless:0,pvp:0}, seen:{},
  lvl:{pac:{level:1,xp:0}, ballboy:{level:1,xp:0}}, coins:0,
  pac:{gear:null, stats:{}, bought:[], talents:{}},
  set:{muted:false, vol:0.7, music:0.55, voice:false, blur:true, diff:'normal', speed:1, fastReels:false, bloom:true, quality:'auto', showFps:true, autoCast:true}});
function merge(a,b){ for(const k in b){ const v = b[k]; if(v && typeof v==='object' && !Array.isArray(v) && a[k] && typeof a[k]==='object' && !Array.isArray(a[k])) merge(a[k], v); else a[k] = v; } return a; }
let SAVE = DEF_SAVE(); try{ const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if(s) SAVE = merge(DEF_SAVE(), s); }catch(e){}
function save(){ try{ localStorage.setItem(SAVE_KEY, JSON.stringify(SAVE)); }catch(e){} }
{ const ren = {zap:'tilt', bramble:'lawn', buddy:'exwife'}; SAVE.pac.bought = [...new Set(SAVE.pac.bought.map(k=>ren[k]||k))]; }   // v0.7 → v0.8 ability names
const DIFF = {easy:{hp:0.7, dmg:0.55, spawn:0.75, score:0.75, label:'Easy'}, normal:{hp:1, dmg:1, spawn:1, score:1, label:'Normal'}, hard:{hp:1.45, dmg:1.4, spawn:1.3, score:1.5, label:'Hard'}};
const diff = () => DIFF[SAVE.set.diff] || DIFF.normal;
const scoreMult = () => diff().score * (0.5 + 0.5*SAVE.set.speed);
const charNeed = l => 150 + l*50;   // character XP (outside the game) for the next level, 1..100

// ---------------- RENDERER, BLOOM, CAMERA ----------------
const isMobile = matchMedia('(pointer:coarse)').matches || Math.min(innerWidth, innerHeight) < 520;
if(isMobile) document.body.classList.add('mobile');
const cv = $('gl');
const renderer = new THREE.WebGLRenderer({canvas:cv, antialias:!isMobile, powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio, 1));   // set properly by applyQuality() below
// no tone mapping: the ink shader and neon colours are authored in display space
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x05030a);
scene.fog = new THREE.Fog(0x07040c, 50, 120);
const camera = new THREE.PerspectiveCamera(42, 1, 0.5, 400);
const composer = new THREE.EffectComposer(renderer, new THREE.WebGLRenderTarget(256, 256, {type:THREE.HalfFloatType, minFilter:THREE.LinearFilter, magFilter:THREE.LinearFilter}));   // HDR so neon > 1.0 blooms
const renderPass = new THREE.RenderPass(scene, camera); composer.addPass(renderPass);
const bloom = new THREE.UnrealBloomPass(new THREE.Vector2(512, 512), 0.8, 0.5, 0.82); composer.addPass(bloom);
const afterimage = new THREE.AfterimagePass(0.0); afterimage.enabled = false; composer.addPass(afterimage);   // HYPER motion blur
// blue-orb "inverted" look (v0.8): a cheap shader pass instead of a CSS filter on the canvas (that filter made phones crawl)
const gradePass = new THREE.ShaderPass({uniforms:{tDiffuse:{value:null}, uAmt:{value:0}},
  vertexShader:'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader:'uniform sampler2D tDiffuse; uniform float uAmt; varying vec2 vUv; void main(){ vec4 c = texture2D(tDiffuse, vUv); float l = dot(c.rgb, vec3(0.299,0.587,0.114)); vec3 inv = clamp(c.rgb + (1.0 - 2.0*l), 0.0, 1.0); inv = mix(inv, inv*vec3(0.7,0.9,1.3), 0.5); gl_FragColor = vec4(mix(c.rgb, inv, uAmt), c.a); }'});
gradePass.enabled = false; composer.addPass(gradePass);
let SW = 1, SH = 1;
function resize(){ const r = $('screen').getBoundingClientRect(); SW = Math.max(1, r.width); SH = Math.max(1, r.height);
  renderer.setSize(SW, SH, false); composer.setSize(SW, SH); bloom.resolution.set(SW*(isMobile?0.4:0.5), SH*(isMobile?0.4:0.5));
  camera.aspect = SW/SH; camera.updateProjectionMatrix(); }
addEventListener('resize', resize);
scene.add(new THREE.HemisphereLight(0x7a6aff, 0x1a0818, 0.6));
const sun = new THREE.DirectionalLight(0xd8d0ff, 0.35); sun.position.copy(LOOK.LIGHT_DIR).multiplyScalar(50); scene.add(sun);
const glowTex = (()=>{ const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32,32,0,32,32,32); g.addColorStop(0,'rgba(255,255,255,1)'); g.addColorStop(.25,'rgba(255,255,255,.5)'); g.addColorStop(1,'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0,0,64,64); return new THREE.CanvasTexture(c); })();
// shared glow materials for things made many times a second (shots, effects) — one material per colour, never leaked
const GLOWM = new Map();
function glowS(color, size, opacity=1){ const k = color+'/'+opacity; let m = GLOWM.get(k); if(!m){ m = new THREE.SpriteMaterial({map:glowTex, color, transparent:true, opacity, blending:THREE.AdditiveBlending, depthWrite:false}); GLOWM.set(k, m); }
  const s = new THREE.Sprite(m); s.scale.set(size,size,1); return s; }
function glow(color, size, opacity=1){ const s = new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex, color, transparent:true, opacity, blending:THREE.AdditiveBlending, depthWrite:false})); s.scale.set(size,size,1); return s; }
function at(o,x,y,z){ o.position.set(x,y,z); return o; }
function pool(color, size, opacity){ const m = new THREE.Mesh(new THREE.PlaneGeometry(size,size), new THREE.MeshBasicMaterial({map:glowTex, color, transparent:true, opacity, blending:THREE.AdditiveBlending, depthWrite:false}));
  m.rotation.x = -Math.PI/2; return m; }
function initColors(m, n, hex=0xffffff){ const c = new THREE.Color(hex), a = new Float32Array(n*3); for(let i=0;i<n;i++){ a[i*3]=c.r; a[i*3+1]=c.g; a[i*3+2]=c.b; }
  m.instanceColor = new THREE.InstancedBufferAttribute(a,3); m.instanceColor.setUsage(THREE.DynamicDrawUsage); }
const NEONM = new Map(); const neonMat = c => { let m = NEONM.get(c); if(!m){ m = new THREE.MeshBasicMaterial({color:new THREE.Color(c).multiplyScalar(1.7)}); NEONM.set(c, m); } return m; };   // cached per colour
const tmpV = new THREE.Vector3(), tmpC = new THREE.Color(), dummy = new THREE.Object3D();
function project(x,y,z){ tmpV.set(x,y,z).project(camera); return [(tmpV.x*0.5+0.5)*SW, (-tmpV.y*0.5+0.5)*SH, tmpV.z<1]; }

// ---------------- QUALITY (v0.9 speed pass): starts at a level that suits the device, steps DOWN by itself if frames drop ----------------
// high: sharp, glow (bloom) on · medium: normal sharpness, no bloom, crowd without outlines · low: softer resolution, fewer effects
const Q = {level:2, auto:true, fps:60, acc:0, n:0, lastStep:0}; const QNAMES = ['low','medium','high']; const QUALITY_HOOKS = [];
function applyQuality(){ const L = Q.level, dpr = devicePixelRatio || 1;
  renderer.setPixelRatio(L===2 ? Math.min(dpr, isMobile ? 1.25 : 1.5) : L===1 ? Math.min(dpr, isMobile ? 0.9 : 1.0) : Math.min(dpr, 0.65));
  bloom.enabled = L===2 && SAVE.set.bloom; resize(); QUALITY_HOOKS.forEach(f=>f(L)); }
function initQuality(){ const s = SAVE.set.quality; Q.auto = s==='auto'; Q.level = s==='high' ? 2 : s==='medium' ? 1 : s==='low' ? 0 : (isMobile ? 1 : 2); applyQuality(); }
function qualityTick(rawDt, playing){ Q.acc += rawDt; Q.n++; if(Q.acc < 1.5) return; Q.fps = Q.n/Q.acc; Q.acc = 0; Q.n = 0;
  const f = $('fps'); if(f){ f.style.display = SAVE.set.showFps ? 'block' : 'none'; f.textContent = Math.round(Q.fps)+' FPS · '+QNAMES[Q.level]; }
  if(Q.auto && playing && Q.fps < 45 && Q.level > 0 && performance.now() - Q.lastStep > 4000){ Q.level--; Q.lastStep = performance.now(); applyQuality(); } }
// ---------------- AUDIO: a small synth. Techno loop per level, chunky SFX, a cheap club reverb. ----------------
let AC = null, master = null, musicGain = null, sfxGain = null, verb = null, verbGain = null;
function audio(){ if(AC) return; try{
  AC = new (window.AudioContext||window.webkitAudioContext)();
  master = AC.createGain(); master.connect(AC.destination);
  const comp = AC.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(master);
  musicGain = AC.createGain(); musicGain.connect(comp); sfxGain = AC.createGain(); sfxGain.connect(comp);
  // reverb: decaying noise impulse
  verb = AC.createConvolver(); const L = AC.sampleRate*1.6, ir = AC.createBuffer(2, L, AC.sampleRate);
  for(let ch=0; ch<2; ch++){ const d = ir.getChannelData(ch); for(let i=0;i<L;i++) d[i] = (Math.random()*2-1)*Math.pow(1-i/L, 3); }
  verb.buffer = ir; verbGain = AC.createGain(); verbGain.gain.value = 0.18; verb.connect(verbGain); verbGain.connect(comp);
  applyVol(); }catch(e){} }
function applyVol(){ if(!master) return; master.gain.value = SAVE.set.muted ? 0 : SAVE.set.vol; musicGain.gain.value = SAVE.set.music*0.8; sfxGain.gain.value = 0.9; }
function env(g, t, a, peak, dec){ g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002,peak), t+a); g.gain.exponentialRampToValueAtTime(0.0001, t+a+dec); }
// v0.10: a voice budget — at most 24 sound effects playing at once (a packed club panicking in blue-orb mode could pile up
// hundreds of oscillators). Music is exempt.
const VOICES = [];
function voiceOk(len, dest){ if(dest && dest === musicGain) return true; const now = AC.currentTime; while(VOICES.length && VOICES[0] < now) VOICES.shift(); if(VOICES.length >= 24) return false;
  const end = now + len; let i = VOICES.length; while(i > 0 && VOICES[i-1] > end) i--; VOICES.splice(i, 0, end); return true; }
function tone(f, dur=0.08, type='square', vol=0.08, slide=0, dest, when=0, wet=0){
  if(!AC || SAVE.set.muted || !voiceOk(when + dur + 0.05, dest)) return; const t = AC.currentTime + when, o = AC.createOscillator(), g = AC.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
  if(slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f*slide), t+dur);
  env(g, t, 0.004, vol, dur); o.connect(g); g.connect(dest||sfxGain); if(wet) { const w = AC.createGain(); w.gain.value = wet; g.connect(w); w.connect(verb); }
  o.start(t); o.stop(t+dur+0.05); }
let noiseBuf = null;
function noise(dur=0.2, vol=0.15, dest, opt={}){ if(!AC || SAVE.set.muted || !voiceOk((opt.when||0) + dur + 0.1, dest)) return; const t = AC.currentTime + (opt.when||0);
  if(!noiseBuf){ noiseBuf = AC.createBuffer(1, AC.sampleRate*2, AC.sampleRate); const d = noiseBuf.getChannelData(0); for(let i=0;i<d.length;i++) d[i] = Math.random()*2-1; }
  const s = AC.createBufferSource(), g = AC.createGain(), f = AC.createBiquadFilter(); s.buffer = noiseBuf; f.type = opt.type||'lowpass'; f.frequency.value = opt.freq||8000; f.Q.value = opt.q||0.7;
  if(opt.sweep) f.frequency.exponentialRampToValueAtTime(opt.sweep, t+dur);
  env(g, t, opt.attack||0.003, vol, dur); s.connect(f); f.connect(g); g.connect(dest||sfxGain); if(opt.wet){ const w = AC.createGain(); w.gain.value = opt.wet; g.connect(w); w.connect(verb); }
  s.start(t, Math.random()*1.5); s.stop(t+dur+0.1); }
const SFX = {
  dot:(chain)=>{ const scale = [0,2,4,7,9,12,14,16,19,21,24,26,28,31,33,36]; const n = scale[Math.min(chain, scale.length-1)]; tone(523*Math.pow(2,n/12), 0.06, 'square', 0.035, 0, null, 0, 0.15); },
  waka:(k)=>tone(k?330:250, 0.07, 'triangle', 0.05, k?0.7:1.4),
  pop:()=>{ noise(0.35, 0.22, null, {freq:2400, sweep:200, wet:0.4}); tone(110, 0.3, 'sine', 0.2, 0.4); },
  boom:(v=1)=>{ noise(0.6, 0.3*v, null, {freq:1200, sweep:80, wet:0.5}); tone(70, 0.5, 'sine', 0.3*v, 0.35); },
  hurt:()=>{ tone(160, 0.12, 'sawtooth', 0.08, 0.5); noise(0.08, 0.1, null, {freq:900}); },
  level:()=>{ [523,659,784,1046,1318].forEach((f,i)=>tone(f, 0.18, 'square', 0.05, 0, null, i*0.07, 0.3)); },
  eatGhost:(n)=>{ for(let i=0;i<4;i++) tone(880*Math.pow(1.2,n)-i*90, 0.06, 'square', 0.05, 0, null, i*0.04); },
  shield:()=>{ for(let i=0;i<5;i++) tone(700+i*180, 0.25, 'sine', 0.035, 1.2, null, i*0.03, 0.5); },
  boing:()=>tone(180, 0.35, 'sine', 0.12, 3),
  chomp:()=>{ tone(140, 0.12, 'square', 0.1, 0.45); noise(0.1, 0.18, null, {freq:1800}); },
  fart:(len=0.5)=>{ if(!AC||SAVE.set.muted) return; const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain(), f = AC.createBiquadFilter(); o.type = 'sawtooth'; o.frequency.setValueAtTime(95, t);
    for(let i=0;i<8;i++) o.frequency.setValueAtTime(70+Math.random()*60, t+i*len/8); f.type = 'lowpass'; f.frequency.value = 600; env(g, t, 0.02, 0.18, len); o.connect(f); f.connect(g); g.connect(sfxGain); o.start(t); o.stop(t+len+0.05); noise(len, 0.06, null, {freq:500}); },
  burp:()=>{ if(!AC||SAVE.set.muted) return; const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain(), f = AC.createBiquadFilter(); o.type = 'sawtooth'; o.frequency.setValueAtTime(90, t); o.frequency.linearRampToValueAtTime(60, t+0.9);
    const lfo = AC.createOscillator(), lg = AC.createGain(); lfo.frequency.value = 28; lg.gain.value = 18; lfo.connect(lg); lg.connect(o.frequency); f.type = 'bandpass'; f.frequency.value = 400; f.Q.value = 2;
    env(g, t, 0.05, 0.3, 0.9); o.connect(f); f.connect(g); g.connect(sfxGain); o.start(t); lfo.start(t); o.stop(t+1); lfo.stop(t+1); },
  scream:()=>{ tone(rnd(700,1000), 0.35, 'sawtooth', 0.025, 1.3); },
  zap:()=>{ noise(0.12, 0.08, null, {type:'highpass', freq:3000}); tone(1400, 0.08, 'sawtooth', 0.03, 0.4); },
  coin:()=>{ tone(988, 0.06, 'square', 0.04); tone(1318, 0.2, 'square', 0.04, 0, null, 0.06); },
  whoosh:()=>noise(0.3, 0.1, null, {type:'bandpass', freq:600, sweep:3000, q:1.5}),
  // an eerie whistled motif (our own tune) — falling, then hanging on a high note
  whistle:(when=0)=>{ if(!AC||SAVE.set.muted) return; const notes = [[988,0.6],[932,0.3],[740,0.7],[0,0.25],[831,0.35],[784,0.35],[622,0.9],[0,0.3],[1245,1.1]]; let tt = when;
    for(const [f,d] of notes){ if(f){ const t = AC.currentTime+tt, o = AC.createOscillator(), g = AC.createGain(), v = AC.createOscillator(), vg = AC.createGain(); o.type = 'sine'; o.frequency.value = f; v.frequency.value = 6; vg.gain.value = 9; v.connect(vg); vg.connect(o.frequency);
      env(g, t, 0.05, 0.07, d); o.connect(g); g.connect(sfxGain); const w = AC.createGain(); w.gain.value = 0.8; g.connect(w); w.connect(verb); o.start(t); v.start(t); o.stop(t+d+0.1); v.stop(t+d+0.1); } tt += d; } },
  // every element (the game's 7 colours) has its own cast sound
  el:(e)=>{ if(e==='fire'){ noise(0.45, 0.16, null, {freq:900, sweep:200, wet:0.3}); tone(110, 0.35, 'sawtooth', 0.06, 0.5); }
    else if(e==='toxic'){ for(let i=0;i<5;i++) tone(300+Math.random()*500, 0.07, 'sine', 0.05, 1.8, null, i*0.05); noise(0.3, 0.06, null, {type:'bandpass', freq:700, q:3}); }
    else if(e==='frost'){ [1760,2349,2637,3520].forEach((f,i)=>tone(f, 0.25, 'triangle', 0.03, 1, null, i*0.04, 0.6)); noise(0.35, 0.07, null, {type:'highpass', freq:5000}); }
    else if(e==='void'){ tone(600, 0.6, 'sine', 0.08, 0.25, null, 0, 0.8); tone(906, 0.5, 'sine', 0.04, 0.3, null, 0.05, 0.8); }
    else if(e==='shock'){ SFX.zap(); tone(2200, 0.06, 'square', 0.03, 0.3, null, 0.06); noise(0.15, 0.1, null, {type:'highpass', freq:2500}); }
    else if(e==='nature'){ noise(0.4, 0.12, null, {type:'bandpass', freq:1200, q:2, sweep:500}); tone(196, 0.3, 'triangle', 0.05, 1.5); }
    else if(e==='shadow'){ tone(70, 0.6, 'sawtooth', 0.08, 0.6, null, 0, 0.5); noise(0.5, 0.1, null, {freq:600, sweep:120}); } },
  // creature calls (each creature yells its own way when it pops out)
  cry:(t)=>{ if(t==='cindercub'){ tone(160, 0.35, 'sawtooth', 0.09, 0.55); noise(0.4, 0.1, null, {freq:700, sweep:150}); }
    else if(t==='splashpup'){ [620, 820, 620].forEach((f,i)=>tone(f, 0.09, 'square', 0.05, 1.3, null, i*0.11)); noise(0.3, 0.08, null, {type:'bandpass', freq:2400, q:1, when:0.3}); }
    else if(t==='voltmoth'){ const o = 0; for(let i=0;i<10;i++) tone(140 + (i%2)*20, 0.05, 'sawtooth', 0.05, 1, null, i*0.04); tone(1800, 0.2, 'square', 0.03, 0.4, null, 0.35); }
    else if(t==='bramblebud'){ noise(0.5, 0.12, null, {type:'bandpass', freq:400, q:4, sweep:900}); tone(98, 0.4, 'triangle', 0.08, 1.4); } },
  // level-up: a jackpot — coin shower and a rising arpeggio
  jackpot:()=>{ for(let i=0;i<14;i++) tone(1200 + Math.random()*900, 0.06, 'square', 0.03, 1, null, i*0.045); [523,659,784,1046,1318,1568].forEach((f,i)=>tone(f, 0.22, 'square', 0.05, 0, null, 0.1+i*0.07, 0.4)); noise(0.6, 0.06, null, {type:'highpass', freq:6000, when:0.1}); },
  pick:()=>{ tone(196, 0.5, 'sawtooth', 0.08, 2, null, 0, 0.3); [784,988,1175,1568].forEach((f,i)=>tone(f, 0.3, 'triangle', 0.05, 0, null, 0.05+i*0.05, 0.6)); noise(0.4, 0.1, null, {freq:3000, sweep:300, wet:0.5}); }
};
// --- techno sequencer: 16-step patterns; a track per scene (menu, club, boss) ---
const TRACKS = {
  club:{bpm:124, root:55, bass:[0,0,12,0, 0,0,10,0, 0,0,12,0, 3,0,10,7], kick:[1,0,0,0], hat:[0,0,1,0], clap:[0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0], stab:[0,3,7], stabEvery:8},
  boss:{bpm:132, root:49, bass:[0,0,0,12, 0,0,1,0, 0,0,0,12, 0,13,1,0], kick:[1,0,0,0], hat:[0,1,1,1], clap:[0,0,0,0, 1,0,0,1, 0,0,0,0, 1,0,1,0], stab:[0,1,7], stabEvery:4},
  menu:{bpm:110, root:55, bass:[0,0,0,0, 0,0,7,0, 0,0,0,0, 5,0,3,0], kick:[1,0,0,0], hat:[0,0,1,0], clap:[0,0,0,0, 0,0,0,0, 0,0,0,0, 1,0,0,0], stab:[0,3,7,10], stabEvery:16}};
let track = 'menu', stepN = -1, seqT0 = 0;
function setTrack(k){ if(track === k) return; track = k; stepN = -1; seqT0 = AC ? AC.currentTime : 0; }
function music(){
  if(!AC || SAVE.set.muted || SAVE.set.music <= 0.01) return; const T = TRACKS[track], spb = 60/T.bpm/4;
  const now = AC.currentTime, want = Math.floor((now - seqT0)/spb);
  while(stepN < want + 2){ stepN++; const t = seqT0 + stepN*spb, i = stepN % 16, when = t - now; if(when < -0.02) continue;
    if(T.kick[i%4]){ const o = AC.createOscillator(), g = AC.createGain(); o.frequency.setValueAtTime(150, AC.currentTime+when); o.frequency.exponentialRampToValueAtTime(42, AC.currentTime+when+0.12); env(g, AC.currentTime+when, 0.002, 0.55, 0.22); o.connect(g); g.connect(musicGain); o.start(AC.currentTime+when); o.stop(AC.currentTime+when+0.3); }
    if(T.hat[i%4]) noise(0.04, 0.06, musicGain, {type:'highpass', freq:8000, when});
    if(T.clap[i]) noise(0.14, 0.12, musicGain, {type:'bandpass', freq:1600, q:1.2, when, wet:0.3});
    const b = T.bass[i]; if(b !== null && (i%2===0 || T.bass[i])){ const f = T.root*Math.pow(2, b/12), o = AC.createOscillator(), g = AC.createGain(), fl = AC.createBiquadFilter(); o.type = 'sawtooth'; o.frequency.value = f;
      fl.type = 'lowpass'; fl.Q.value = 8; const st = AC.currentTime+when; fl.frequency.setValueAtTime(900 + 500*Math.sin(stepN/32), st); fl.frequency.exponentialRampToValueAtTime(140, st+spb*1.6);
      env(g, st, 0.004, 0.11, spb*1.7); o.connect(fl); fl.connect(g); g.connect(musicGain); o.start(st); o.stop(st+spb*2); }
    if(i === 0 && (Math.floor(stepN/16) % (T.stabEvery/4|0 || 1)) === 0){ for(const n of T.stab){ const f = T.root*4*Math.pow(2, n/12); for(const det of [-6,6]){ const o = AC.createOscillator(), g = AC.createGain(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det;
      const st = AC.currentTime+when; env(g, st, 0.01, 0.022, 0.45); o.connect(g); g.connect(musicGain); const w = AC.createGain(); w.gain.value = 0.6; g.connect(w); w.connect(verb); o.start(st); o.stop(st+0.6); } } }
  }
}
function setMute(m){ SAVE.set.muted = m; save(); applyVol(); const b = $('muteB'); if(b) b.textContent = m ? '🔇' : '🔊'; if(m && 'speechSynthesis' in window) speechSynthesis.cancel(); }

// ---------------- VOICE: Pac's lines are LINES.md (his voice bible); Ball Boy's are ours ----------------
const LINES = {
  pac:{start:["Hail to the chomp, baby.","I'm here to eat pellets and kick ass — and I've got HELLA pellets.","Let's paint this maze yellow.","Stretch the jaw. It's gonna be a long night.","Somebody order a legend? Too bad, you got me.","Open wide, world. Daddy's home.","No map. No mercy. All mouth.","Time to eat like I invented it."],
    streak:["Keep 'em coming. I'm not even chewing yet.","That's not a combo, that's a lifestyle.","My jaw's doing cardio and it loves it.","Dots fear me. As they should.","Nom is my first language. Violence is my second.","I'm not full. I'm never full. That's the brand.","Calories don't count when you're this handsome."],
    ghostEat:["I've got pellets of steel.","Blue looks good on you. Tastes better.","You haunt houses. I clear 'em.","Should've stayed dead, sweetheart.","Ectoplasm: surprisingly low in fibre.","You're not a ghost, you're a snack with a backstory.","Boo? Please. CHOMP."],
    level:["Level up. Jaw up. Standards down.","Stronger, faster, and somehow even more full of myself.","New tricks. Same filthy mouth.","Evolution looks good on me. Everything does.","Skill issue? Never met her.","Somewhere, a boss just felt a chill.","Growth spurt. The violent kind."],
    hurt:["OW — watch the merchandise, you sheet-faced bastards!","That cost you. It just doesn't know it yet.","You hit like a screensaver.","Fine. Now I'm annoyed AND hungry.","Blood? Baby, that's just sauce.","Hit me again and I'll charge rent."],
    near:["One hit from the grave? I've danced closer.","Not today. I have reservations. At your funeral.","Death knocked. I pretended the mouth was out.","Close calls are just foreplay for a comeback."],
    bossIn:["Well, well. The main course showed up early.","You brought a health bar to a mouth fight?","That's not a threat, that's an appetizer with delusions.","Come on, then. The jaw's warmed up."],
    bossKill:["Down goes the giant. Up goes my legend.","Tastes like victory. And a little like chicken.","Tell the next one to bring seasoning.","Big fight, bigger bite, biggest me."],
    death:["Down, not out. There's a difference, and it's spite.","I didn't lose. I donated drama.","Bury me at the Salty Dawg. Open casket, open bar.","Game over? Nah. Reload the legend."],
    idle:["Somewhere out there is a pellet with my name on it.","The Dawg pours a whisky that could strip paint. Miss that place.","A guy could get used to being hunted. Flattering, really.","Legends don't rest. They marinate.","Still hungry. Story of my entire mythology."],
    civ:["Oops. Wrong snack.","Sorry, buddy. You looked crunchy.","That one's coming out of my energy bill."], smash:["Excuse me. Coming through. Rudely.","Furniture is just food that gave up."]},
  bb:{start:["Pokey Bro, reporting for violence.","Six balls on the belt and zero chill."], streak:["Catch 'em all. The dots, I mean."], ghostEat:["Blue ball power!"], level:["My creatures leveled. I just watched."],
    hurt:["Ow! Not the face!"], near:["Mom said I could stay out till level twenty-five!"], bossIn:["Time for a gym battle."], bossKill:["Badge acquired."], death:["My team... carry me..."], idle:["I choose... you. Probably."], civ:["Wasn't me. It was the moth."], smash:["Sorry! Union rates on furniture."]},
  boss:{intro:["You wanna get to the stage? Beat my team first!","Pokey Bro, front and centre! Let's battle!"], cub:["Go, Dragon! Roast him!","Dragon — light him up!"], pup:["Frog! Wash him out!","Frog, hose this guy!"], moth:["Fluffball! Zap him stiff!","Fluffball — lights out!"], bud:["Turnip! Tie him down!","Turnip — thorns!"], noDie:["You can't beat me till you've seen my team!"], die:["My creatures... they're just... resting..."]}};
let sayUntil = 0;
function say(cat, key, force){ const pool2 = (LINES[cat]||{})[key]; if(!pool2 || !pool2.length) return; if(!force && performance.now() < sayUntil) return;
  const l = pick(pool2), el = $('say'); el.textContent = '"'+l+'"'; el.className = cat==='boss' ? 'boss' : ''; el.style.opacity = 1; sayUntil = performance.now()+4200;
  clearTimeout(say.h); say.h = setTimeout(()=>el.style.opacity = 0, 2800);
  if(SAVE.set.voice && !SAVE.set.muted && 'speechSynthesis' in window){ try{ speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(l); u.pitch = cat==='pac'?0.55:cat==='boss'?1.3:1.2; u.rate = 1.05; speechSynthesis.speak(u); }catch(e){} } }
const heroSay = (h, key, force) => { if(h && h.isPlayer) say(h.char==='pac'?'pac':'bb', key, force); };
// lessons: shown once per profile, one at a time, bottom centre (never piles up at the top)
const shownToasts = new Set(), toastQ = []; let toastBusy = false;
function toast(key, text, ms=5200){ if(key && (shownToasts.has(key) || SAVE.seen[key])) return; if(key){ shownToasts.add(key); }
  toastQ.push({key, text, ms}); if(!toastBusy) nextToast(); }
function nextToast(){ const t = toastQ.shift(); if(!t){ toastBusy = false; return; } toastBusy = true; const el = $('toast'); el.textContent = t.text; el.classList.add('on');
  if(t.key && t.key.startsWith('learn:')){ SAVE.seen[t.key] = 1; save(); }
  setTimeout(()=>{ el.classList.remove('on'); setTimeout(nextToast, 350); }, t.ms); }
function big(text, ms=1100, cls=''){ const el = $('big'); el.textContent = text; el.className = cls; el.style.opacity = 1; clearTimeout(big.h); big.h = setTimeout(()=>el.style.opacity = 0, ms); }
