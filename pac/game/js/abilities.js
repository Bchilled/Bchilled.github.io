// PAC v0.7 — abilities.js. Abilities are DATA. Names are spoofs/puns (the spoof law: puns + innuendo welcome).
// Slots: PASSIVE (Common, fires itself) · DEFENSIVE (Rare: right click / B) · OFFENSIVE (Mythic: left click / A) · MOVEMENT (space / MOVE).
// Run ladder: L1 movement → L2 pick a passive → L3 pick a defensive → L4 pick an offensive → L5-25 upgrades:
// ranks, micro passives (up to 6), stats, and NEW abilities that can REPLACE one you hold.
"use strict";
const ABIL = {
  // ---------- Pac · passive Commons ----------
  poop:   {slot:'passive', r:'common', ic:'💩', name:'Dookie Drop',  d:'Drops a stink bomb behind you every second. It swells, then blows.', cd:1.4, dmg:18, rad:3.3},
  spit:   {slot:'passive', r:'common', ic:'💦', name:'Spit Take',    d:'Spits a spray of pellets where you aim, nonstop.', cd:0.34, dmg:5, range:7, arc:0.55},
  prickly:{slot:'passive', r:'common', ic:'🦔', name:'Prickly Pac',  d:'Spikes stab out of your sides — left and right of the way you\'re moving.', cd:0.6, dmg:12, len:4},
  gas:    {slot:'passive', r:'common', ic:'☁️', name:'Gas Leak',     d:'A stink cloud that follows you around and melts what stands in it.', cd:0.25, dps:14, rad:3.6, extra:'pac'},
  pinball:{slot:'passive', r:'common', ic:'🎱', name:'Pinball Wizard', d:'Launches a ball that ricochets off walls and through ghosts.', cd:4.5, dmg:16, extra:'pac'},
  // ---------- Pac · defensive Rares ----------
  glove:  {slot:'def', r:'rare', ic:'🩷', name:'Love Glove',  d:'A rubbery pink bubble soaks hits for 5 s, then heals you for most of what it soaked.', cd:9, absorb:70, dur:5},
  bang:   {slot:'def', r:'rare', ic:'💥', name:'Big Bang',    d:'A blast all around you that shoves everything back.', cd:4.5, dmg:30, rad:8, knock:8},
  flop:   {slot:'def', r:'rare', ic:'🐸', name:'Belly Flop',  d:'Hop where you aim — untouchable in the air — and flatten everything you land on.', cd:5, dmg:38, rad:5.5, dist:7},
  smoke:  {slot:'def', r:'rare', ic:'🚬', name:'Smoke Break', d:'Lights up a thick cloud: ghosts inside go slow and stupid.', cd:10, rad:6, dur:4, extra:'pac'},
  shove:  {slot:'def', r:'rare', ic:'🫸', name:'Bouncer Shove', d:'"You\'re not on the list." Shoves a wide cone of everything away from you.', cd:3.5, dmg:20, range:7, arc:1.6, knock:14, extra:'pac'},
  // ---------- Pac · offensive Mythics ----------
  balls:  {slot:'off', r:'mythic', ic:'🟡', name:'Big Balls',   d:'Swell up huge for 6 s, roll faster, and eat everything you touch.', cd:16, dur:6, dps:90},
  gob:    {slot:'off', r:'mythic', ic:'👄', name:'Gobsmacker',  d:'Lunge and slam giant jaws shut in front of you. Small ghosts get swallowed whole.', cd:2.8, dmg:75, range:9, arc:2.1},
  farts:  {slot:'off', r:'mythic', ic:'✨', name:'Fairy Farts', d:'6 s of top speed, trailing toxic sparkle gas that eats through the swarm.', cd:12, dur:6, dps:34},
  kill:   {slot:'off', r:'mythic', ic:'👾', name:'Kill Screen', d:'The level-256 glitch: everything in the half of the screen you aim at gets scrambled.', cd:14, dmg:80, extra:'pac'},
  gang:   {slot:'off', r:'mythic', ic:'👻', name:'Ghost Gang',  d:'Four tame ghosts hunt for you for 10 s.', cd:20, n:4, dur:10, dps:30, extra:'pac'},
  // ---------- Ball Boy (starts with all three; each throws a creature that does one move and comes back) ----------
  sleepover: {slot:'passive', r:'common', ic:'🦋', name:'Sleepover',   d:'Gloomoth flutters to the biggest crowd and drops sleep powder on it.', cd:6},
  rockbottom:{slot:'def', r:'rare', ic:'🪨', name:'Rock Bottom',  d:'Boulderbud pops out beside you and slams the floor, shoving everything back.', cd:6},
  hottake:   {slot:'off', r:'mythic', ic:'🔥', name:'Hot Take',    d:'Cindercub lands where you aim and breathes fire on whatever is nearest.', cd:4.5},
  // ---------- micro passives (level 5+; up to 6 at a time) ----------
  orbit:  {slot:'micro', r:'micro', ic:'🌀', name:'Waka Wheel',      d:'Chomping jaws circle you and bite what they touch.'},
  bolts:  {slot:'micro', r:'micro', ic:'🔸', name:'Pellet Gun',      d:'Homing pellets at the most dangerous thing near you.'},
  cherry: {slot:'micro', r:'micro', ic:'🍒', name:'Cherry Popper',   d:'Lobs cherries that burst and slow.', req:2, cost:120},
  zap:    {slot:'micro', r:'micro', ic:'⚡', name:'Static Cling',    d:'Lightning that jumps between enemies.', req:3, cost:180},
  bramble:{slot:'micro', r:'micro', ic:'🌿', name:'Thorny Situation', d:'Thorns sprout wherever you walk.', req:4, cost:240},
  buddy:  {slot:'micro', r:'micro', ic:'💋', name:'Booty Call',      d:'A tame ghost comes when you call and hunts for you (more per level).', req:6, cost:350}};
const BASE_MICRO = ['orbit','bolts'];
const MOVES = {backdoor:{name:'Back Door', ic:'🌀', d:'Warp a few metres forward — through ghosts, crowds and anything thin.', cost:20, cd:2, dist:8},
               peaceout:{name:'Peace Out', ic:'👟', d:'A quick dash. Untouchable while you dash.', cost:15, cd:2.2, dist:7}};
const STATUP = {hp:{n:'+20 Max Health', ic:'❤️'}, spd:{n:'+6% Move Speed', ic:'👟'}, dmg:{n:'+10% Damage', ic:'🗡️'}, cdr:{n:'-8% Cooldowns', ic:'⏱️'}, area:{n:'+12% Area', ic:'⭕'},
  pick:{n:'+30% Pickup Range', ic:'🧲'}, regen:{n:'+50% Energy Regen', ic:'🔋'}, armor:{n:'-6% Damage Taken', ic:'🧱'}, crit:{n:'+5% Crit Chance', ic:'🎯'}, heal:{n:'+1 HP/s Regen', ic:'🩹'}};
const TALENTS = {Glutton:['+5% pickup range','+10 max health','+1 HP/s regen','Eating dots heals'], Brawler:['+5% damage','-4% damage taken','+5% crit','Bigger bites'], 'Ghost Buster':['+10% XP','Blue orb lasts longer','+8% speed','Eat chains score more']};
// run XP: the first four levels are earned in mouthfuls (learning), then upgrades come steadily, never in a flood
const XPC = [0]; for(let L=1; L<=25; L++){ const inc = L===1?40 : L===2?75 : L===3?115 : L===4?150 : 120 + (L-5)*30; XPC.push(XPC[L-1]+inc); }

function applyLoadout(h){ // Pac's out-of-game loadout: stats, talents, gear
  if(!(h.isPlayer && h.char==='pac')) return; const st = SAVE.pac.stats, m = h.mods;
  m.dmg *= 1 + 0.02*(st.Strength||0); h.maxhp += 6*(st.Vitality||0); m.regen *= 1 + 0.06*(st.Spirit||0); m.cdr *= Math.pow(0.98, st.Intellect||0);
  m.speed *= 1 + 0.015*(st.Agility||0); m.area *= 1 + 0.02*(st.Speciality||0); m.pickup *= 1 + 0.05*(st.Nature||0);
  const T = SAVE.pac.talents, has = (tree,i)=>T[tree+i];
  if(has('Glutton',0)) m.pickup *= 1.05; if(has('Glutton',1)) h.maxhp += 10; if(has('Glutton',2)) m.hpRegen += 1;
  if(has('Brawler',0)) m.dmg *= 1.05; if(has('Brawler',1)) m.armor += 0.04; if(has('Brawler',2)) m.crit += 0.05; if(has('Ghost Buster',2)) m.speed *= 1.08;
  const g = SAVE.pac.gear; if(g){ const b = {crude:[0.03,10], quality:[0.07,20], epic:[0.12,35]}[g]; m.dmg *= 1+b[0]; h.maxhp += b[1]; }
  h.hp = h.maxhp; equipSet(h.rig, SAVE.pac.gear);
}
const xpMult = h => (h.buff.xp>0?2:1) * (h.isPlayer && h.char==='pac' && SAVE.pac.talents['Ghost Buster0'] ? 1.1 : 1);
function gainXP(h, n){ if(!h || h.level >= 25) return; h.xp += n*xpMult(h); while(h.level < 25 && h.xp >= XPC[h.level+1]){ h.level++; onLevel(h); } }
const pendingLv = [];
function onLevel(h){ burst(h.x,1,h.z,0xffe14d,60,11);
  if(h.isPlayer){ SFX.level(); big('LEVEL '+h.level, 900); if(h.level>4 && Math.random()<0.3) heroSay(h,'level'); pendingLv.push(h.level); if(state==='play') setTimeout(()=>{ if(state==='play') openJack(); }, 350); }
  else { const o = offersFor(h); if(o.length) applyChoice(h, pick(o)); } }
function offersFor(h){
  if(!h.moveOk) return [{kind:'move'}];
  const C = CHARS[h.char];
  for(const s of ['passive','def','off']) if(!h.slots[s]) return C.pools[s].map(k=>({kind:'ab', k}));
  return upgradeOffers(h);
}
function microPool(h){ const p = BASE_MICRO.slice(); if(h.isPlayer && h.char==='pac') for(const k of SAVE.pac.bought) if(!p.includes(k)) p.push(k); if(!h.isPlayer) p.push('cherry','zap'); return p; }
function upgradeOffers(h){
  const c = [];
  for(const s of ['passive','def','off']){ const k = h.slots[s]; if(k && (h.rank[k]||0) < 5) c.push({kind:'rank', k, w:3}); }
  const owned = Object.keys(h.micro).length;
  for(const k of microPool(h)){ const lv = h.micro[k]||0; if(lv>0 && lv<5) c.push({kind:'micro', k, w:2.6}); else if(lv===0 && owned<6) c.push({kind:'micro', k, w:2.4}); }
  // NEW abilities that replace one you hold (same slot) — the build keeps changing shape
  // (offered on odd levels from 7 up, at most one per pick, so you settle into a build before it changes)
  const lvNow = (h.isPlayer && pendingLv.length) ? pendingLv[0] : h.level;
  if(lvNow >= 7 && lvNow % 2 === 1) for(const k in ABIL){ const A = ABIL[k]; if(A.extra !== h.char) continue; if(h.slots[A.slot] === k) continue; c.push({kind:'swap', k, w:2.2}); }
  for(const s in STATUP) c.push({kind:'stat', k:s, w:0.8});
  const out = [];
  if(owned === 0){ const mi = c.findIndex(o=>o.kind==='micro'); if(mi >= 0) out.push(c.splice(mi,1)[0]); }   // level 5: the first micro passive is always on offer
  while(out.length < 3 && c.length){ const tot = c.reduce((a,b)=>a+b.w,0); let r = Math.random()*tot, i = 0; for(;i<c.length;i++){ r -= c[i].w; if(r<=0) break; }
    const o = c.splice(Math.min(i,c.length-1),1)[0]; out.push(o); if(o.kind==='swap') for(let j=c.length-1;j>=0;j--) if(c[j].kind==='swap') c.splice(j,1); }
  return out;
}
function clearSlotFx(h, k){ if(k==='gas' && h.fx.gasM){ scene.remove(h.fx.gasM); h.fx.gasM = null; } }
function applyChoice(h, o){
  if(o.kind==='move'){ h.moveOk = true; if(h.isPlayer) toast('learn:move', `${MOVES[CHARS[h.char].move].name}: ${isMobile?'tap MOVE':'press SPACE'}. Ghosts are on their way — and look out for the blue orb.`); }
  else if(o.kind==='ab' || o.kind==='swap'){ const A = ABIL[o.k], old = h.slots[A.slot]; if(old) clearSlotFx(h, old); h.slots[A.slot] = o.k; if(old && h.rank[old]) h.rank[o.k] = Math.max(h.rank[o.k]||0, h.rank[old]-1);
    if(h.isPlayer && o.kind==='ab'){ const how = A.slot==='passive'?'It fights on its own.':A.slot==='def'?(isMobile?'Tap B.':'Right click.'):(isMobile?'Tap A — it aims itself.':'Left click; it fires where your mouse is.'); toast('learn:ab'+A.slot, `${A.name} learned. ${how}`); } }
  else if(o.kind==='rank'){ h.rank[o.k] = (h.rank[o.k]||0)+1; }
  else if(o.kind==='micro'){ h.micro[o.k] = (h.micro[o.k]||0)+1; }
  else if(o.kind==='stat'){ const m = h.mods; ({hp:()=>{ h.maxhp += 20; h.hp += 20; }, spd:()=>m.speed*=1.06, dmg:()=>m.dmg*=1.1, cdr:()=>m.cdr*=0.92, area:()=>m.area*=1.12, pick:()=>m.pickup*=1.3,
    regen:()=>m.regen*=1.5, armor:()=>m.armor=Math.min(0.6, m.armor+0.06), crit:()=>m.crit+=0.05, heal:()=>m.hpRegen+=1})[o.k](); }
  if(h.isPlayer) buildSkillHud();
}
const cdOf = (h,k) => (ABIL[k].cd||1) * h.mods.cdr * Math.pow(0.92, h.rank[k]||0) / (h.buff.cd>0?1.4:1);
const dmgOf = (h,k,base) => base * h.mods.dmg * (1 + 0.25*(h.rank[k]||0)) * (h.buff.dmg>0?1.25:1);
const areaOf = (h,k,base) => base * h.mods.area * (1 + 0.1*(h.rank[k]||0));

// ---------------- targets + damage ----------------
const ENEMY = {0:[], 1:[]};
function buildTargets(){ ENEMY[0].length = 0; ENEMY[1].length = 0; for(const g of G) if(!g.dead){ ENEMY[0].push(g); ENEMY[1].push(g); }
  for(const h of HEROES) if(!h.dead) ENEMY[1-h.team].push(h); if(BOSS && BOSS.alive && BOSS.awake) ENEMY[0].push(BOSS); }
const threat = e => e.kind==='boss'?6 : e.kind==='hero'?4 : e.big?3 : 1;
function priority(h, range, cone){ let best = null, bs = -1; for(const e of ENEMY[h.team]){ if(e.dead) continue; const dx = e.x-h.x, dz = e.z-h.z, d = hyp(dx,dz); if(d > range) continue;
  if(cone && Math.abs(angDiff(h.face, Math.atan2(dx,dz))) > cone) continue; const s = threat(e)/(d+4); if(s > bs){ bs = s; best = e; } } return best; }
function nearest(h, range){ let best = null, bd = range; for(const e of ENEMY[h.team]){ if(e.dead) continue; const d = hyp(e.x-h.x, e.z-h.z); if(d < bd){ bd = d; best = e; } } return best; }
function hit(e, amount, h, o={}){
  if(!e || e.dead) return; const crit = !!h && Math.random() < h.mods.crit, d = amount*(crit?2:1);
  const fx = o.fx!=null ? o.fx : (h?h.x:e.x), fz = o.fz!=null ? o.fz : (h?h.z:e.z);
  if(e.kind==='ghost'){ e.hp -= d; e.hitT = 0.09; if(o.knock) knock(e, fx, fz, o.knock*(e.big?0.3:1)); if(o.slow) e.slowT = Math.max(e.slowT, o.slow); if(o.stun) e.stunT = Math.max(e.stunT, o.stun*(e.big?0.4:1));
    if(o.eat && !e.big && h) { killGhost(e, h, true); return; } if(e.hp <= 0) killGhost(e, h, false); }
  else if(e.kind==='hero'){ hurtHero(e, d, h); if(o.knock) knock(e, fx, fz, o.knock*0.5); if(o.stun) e.stunT = Math.max(e.stunT, o.stun*0.4); if(o.slow) e.slowT = Math.max(e.slowT, o.slow); }
  else if(e.kind==='boss'){ bossDamage(d); }
  if(e.kind!=='hero') addDn(e, d, crit);
}
function knock(e, fx, fz, f){ const dx = e.x-fx, dz = e.z-fz, d = hyp(dx,dz)||1; e.kvx = (e.kvx||0) + dx/d*f*2.2; e.kvz = (e.kvz||0) + dz/d*f*2.2; }
function areaHit(h, x, z, r, dmg, o={}){
  for(const e of ENEMY[h.team]) if(!e.dead && hyp(e.x-x, e.z-z) < r + (e.r||0.6)) hit(e, dmg, h, Object.assign({fx:x, fz:z}, o));
  for(let i=CIV.length-1;i>=0;i--){ const c = CIV[i]; if(hyp(c.x-x, c.z-z) < r){ c.hp -= dmg; c.panic = 2; if(c.hp <= 0) killCiv(i, h); } }
  if(dmg > 4) for(const P of PROPS) if(!P.broken && P.cost>0){ const cx = (P.x0+P.x1)/2, cz = (P.z0+P.z1)/2; if(hyp(cx-x, cz-z) < r*0.8){ P.dmg += dmg; if(P.dmg > 45) breakProp(P, h, false); } }
}
function coneHit(h, x, z, ang, range, arc, dmg, o={}){
  for(const e of ENEMY[h.team]){ if(e.dead) continue; const dx = e.x-x, dz = e.z-z, d = hyp(dx,dz);
    if(d < range + (e.r||0.6) && Math.abs(angDiff(ang, Math.atan2(dx,dz))) < arc/2 + 0.12) hit(e, dmg, h, Object.assign({fx:x, fz:z}, o)); }
  for(let i=CIV.length-1;i>=0;i--){ const c = CIV[i], dx = c.x-x, dz = c.z-z; if(hyp(dx,dz)<range && Math.abs(angDiff(ang, Math.atan2(dx,dz)))<arc/2){ c.hp -= dmg; c.panic = 2; if(c.hp<=0) killCiv(i, h); } } }
let hurtAcc = 0;
function hurtHero(h, d, src){
  if(h.dead || h.iframes > 0 || h.hopT > 0 || h.dashT > 0 || h.grace > 0) return;
  if(h.isPlayer && (!src || src.team !== h.team)) d *= diff().dmg;
  d *= (1 - h.mods.armor);
  if(h.isPlayer) d = Math.min(d, h.maxhp*0.22);       // nothing one-shots you
  if(h.shieldT > 0){ const a = Math.min(h.shieldHP, d); h.shieldHP -= a; h.absorbed += a; d -= a; }
  if(d <= 0) return;
  h.hp -= d; h.hurtT = 0.15; if(h.isPlayer){ addShake(Math.min(0.45, d*0.02)); hurtAcc += d; addDn(h, d, false); if(d > 6) SFX.hurt(); if(h.hp < h.maxhp*0.25 && !h.nearSaid){ h.nearSaid = true; heroSay(h,'near',true); } }
  if(h.hp <= 0) heroDie(h, src);
}

// ---------------- per-hero runtime ----------------
const BOMBS = [], BOLTS = [], LOBS = [], TRAILS = [], ALLIES = [], PINBALLS = [];
const boltGeo = new THREE.SphereGeometry(0.2,10,8);
let poopGeo = null;
function poopModel(){ if(!poopGeo){ const g = new THREE.Group(), m = LOOK.hatchMat(0x6b4a22); [[0.42,0.14],[0.32,0.38],[0.2,0.58]].forEach(([r,y],i)=>{ const t = LOOK.inked(new THREE.TorusGeometry(r*0.7, r*0.42, 10, 18), m, 0.03); t.rotation.x = Math.PI/2; t.position.y = y; g.add(t); });
  const tip = LOOK.inked(new THREE.ConeGeometry(0.14, 0.25, 10), m, 0.03); tip.position.y = 0.78; g.add(tip); poopGeo = g; } return poopGeo.clone(); }
function fireBolt(h, tg, dmg, spd, spread, col=0xfff3c8, life=1.3, homing=true, pierce=0){ const m = new THREE.Mesh(boltGeo, neonMat(col)); m.add(glow(col, 1.6, 0.8)); m.position.set(h.x, 1.0, h.z); scene.add(m);
  const a = (tg ? Math.atan2(tg.x-h.x, tg.z-h.z) : Math.atan2(h.ax, h.az)) + spread; BOLTS.push({m, vx:Math.sin(a)*spd, vz:Math.cos(a)*spd, life, dmg, owner:h, tg:homing?tg:null, hitSet:new Set(), pierce}); }
function lob(h, tx, tz, o){ const m = new THREE.Mesh(new THREE.SphereGeometry(0.36,12,8), LOOK.hatchMat(0xd02a3a)); m.add(glow(0xff3b5c, 2, 0.8)); scene.add(m);
  LOBS.push(Object.assign({m, x0:h.x, z0:h.z, x1:tx, z1:tz, f:0, owner:h}, o)); }
function addTrail(h, x, z, rad, life, dps, col, puffy){ const m = new THREE.Mesh(new THREE.CircleGeometry(rad, 16), new THREE.MeshBasicMaterial({color:new THREE.Color(col).multiplyScalar(1.3), transparent:true, opacity:0.45, blending:THREE.AdditiveBlending, depthWrite:false}));
  m.rotation.x = -Math.PI/2; m.position.set(x, 0.07, z); scene.add(m); TRAILS.push({m, x, z, rad, life, max:life, dps, owner:h, col, puffy}); }
function aimAngle(h){ return Math.atan2(h.ax, h.az); }
function runHero(h, dt){
  for(const k in h.cd) h.cd[k] -= dt;
  for(const k in h.buff) h.buff[k] = Math.max(0, h.buff[k]-dt);
  const p = h.slots.passive;
  if(p && h.stunT<=0){ const A = ABIL[p]; if(h.cd[p]==null) h.cd[p] = 0.6;
    if(h.cd[p] <= 0){
      if(p==='poop'){ h.cd[p] = cdOf(h,p); const bx = h.x - Math.sin(h.face)*1.1, bz = h.z - Math.cos(h.face)*1.1; const m = poopModel(); m.position.set(bx, 0, bz); m.rotation.y = Math.random()*6; scene.add(m);
        BOMBS.push({m, x:bx, z:bz, fuse:1.0, owner:h}); if(h.isPlayer) SFX.fart(0.15); }
      else if(p==='spit'){ h.cd[p] = cdOf(h,p); const ang = aimAngle(h), range = areaOf(h,p,A.range);
        for(let j=-1;j<=1;j++){ fireBolt(h, null, dmgOf(h,p,A.dmg), 22, j*A.arc/2 + rnd(-0.06,0.06), 0xfff3a8, range/22, false, 1); } if(h.isPlayer) tone(900, 0.03, 'square', 0.015); }
      else if(p==='prickly'){ h.cd[p] = cdOf(h,p); h.fx.spikeT = 0.22; const len = areaOf(h,p,A.len);
        for(const s of [-1,1]){ const a = h.face + s*Math.PI/2, ux = Math.sin(a), uz = Math.cos(a);
          for(const e of ENEMY[h.team]){ if(e.dead) continue; const px = e.x-h.x, pz = e.z-h.z, along = px*ux+pz*uz, off = Math.abs(px*uz-pz*ux); if(along > 0 && along < len+0.6 && off < 0.9+(e.r||0.6)*0.5) hit(e, dmgOf(h,p,A.dmg), h, {fx:h.x, fz:h.z, knock:1.4}); } }
        if(h.isPlayer) tone(1300, 0.03, 'triangle', 0.02); }
      else if(p==='gas'){ h.cd[p] = A.cd; const R = areaOf(h,p,A.rad); areaHit(h, h.x, h.z, R, dmgOf(h,p,A.dps)*A.cd, {slow:0.5}); puff(h.x, 0.6, h.z, 0x8adc5a, 3, R*0.6);
        if(!h.fx.gasM){ h.fx.gasM = new THREE.Mesh(new THREE.CircleGeometry(1, 32), new THREE.MeshBasicMaterial({color:0x5a9a3a, transparent:true, opacity:0.22, blending:THREE.AdditiveBlending, depthWrite:false})); h.fx.gasM.rotation.x = -Math.PI/2; scene.add(h.fx.gasM); } }
      else if(p==='pinball'){ h.cd[p] = cdOf(h,p); const a = aimAngle(h), m = new THREE.Mesh(new THREE.SphereGeometry(0.4,16,12), new THREE.MeshStandardMaterial({color:0xeeeeff, metalness:1, roughness:0.1})); m.add(glow(0x9fd4ff, 2.4, 0.7)); m.position.set(h.x, 0.5, h.z); scene.add(m);
        PINBALLS.push({m, x:h.x, z:h.z, vx:Math.sin(a)*16, vz:Math.cos(a)*16, life:6, owner:h, hitT:new Map()}); }
      else if(p==='sleepover'){ let best = null, bn = 0; for(const e of ENEMY[h.team]){ if(e.dead || hyp(e.x-h.x,e.z-h.z) > 14) continue; let n = 0; for(const f of ENEMY[h.team]) if(!f.dead && hyp(f.x-e.x,f.z-e.z) < 5) n++; if(n > bn){ bn = n; best = e; } }
        if(best){ h.cd[p] = cdOf(h,p); throwCreature(h, 'gloomoth', best.x, best.z); } }
    } }
  if(h.fx.gasM){ h.fx.gasM.position.set(h.x, 0.08, h.z); h.fx.gasM.scale.setScalar(areaOf(h,'gas',ABIL.gas.rad)*(1+0.06*Math.sin(gt*5))); }
  if(h.fx.spikeT > 0){ h.fx.spikeT -= dt; const len = areaOf(h,'prickly',ABIL.prickly.len), k = Math.sin(clamp(h.fx.spikeT/0.22,0,1)*Math.PI);
    h.spikes.forEach((s,i)=>{ const a = h.face + (i?1:-1)*Math.PI/2; s.visible = true; s.scale.set(1.3, 1.3, Math.max(0.01, len*k)); s.position.set(h.x+Math.sin(a)*(0.6+len*k/2), 0.95, h.z+Math.cos(a)*(0.6+len*k/2)); s.rotation.set(0, a, 0); }); }
  else h.spikes.forEach(s=>s.visible = false);
  // micro passives
  for(const k in h.micro){ const lv = h.micro[k]; if(h.cd[k]==null) h.cd[k] = 0.5;
    if(k==='orbit'){ h.fx.orb = h.fx.orb || []; const n = 1+lv; while(h.fx.orb.length < n){ const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.SphereGeometry(0.36,14,10,0.5,Math.PI*2-1), neonMat(0xffd23f)), glow(0xffe14d,2.4,0.7)); scene.add(g); h.fx.orb.push(g); }
      const R = 3.2*h.mods.area; h.fx.orb.forEach((o,i)=>{ const a = gt*3 + i/h.fx.orb.length*6.283; o.position.set(h.x+Math.cos(a)*R, 1, h.z+Math.sin(a)*R); o.rotation.y = -a;
        for(const e of ENEMY[h.team]) if(!e.dead && hyp(e.x-o.position.x, e.z-o.position.z) < 1.1+(e.r||0.6)*0.5) hit(e, 22*(1+0.2*lv)*h.mods.dmg*dt, h); }); }
    else if(k==='bolts' && h.cd[k] <= 0){ const tg = priority(h, 18); if(tg){ h.cd[k] = 1.0*Math.pow(0.88,lv)*h.mods.cdr; const n = 1+Math.floor(lv/2); for(let j=0;j<n;j++) fireBolt(h, tg, 9*(1+0.2*lv)*h.mods.dmg, 20, (j-(n-1)/2)*0.18); } }
    else if(k==='cherry' && h.cd[k] <= 0){ const tg = priority(h, 14); if(tg){ h.cd[k] = 2.4*Math.pow(0.9,lv)*h.mods.cdr; lob(h, tg.x, tg.z, {dmg:15*(1+0.25*lv)*h.mods.dmg, rad:3.4*h.mods.area, slow:2}); } }
    else if(k==='bramble' && h.cd[k] <= 0 && hyp(h.vx,h.vz) > 1){ h.cd[k] = 0.25; addTrail(h, h.x, h.z, 1.3*h.mods.area, 2.5, 14*(1+0.25*lv)*h.mods.dmg, 0x3ac070); }
    else if(k==='zap' && h.cd[k] <= 0){ let from = h, any = false; const seen = new Set(); for(let j=0;j<3+lv;j++){ let b = null, bd = 1e9; for(const e of ENEMY[h.team]){ if(e.dead || seen.has(e)) continue; const d = hyp(e.x-from.x, e.z-from.z); if(d < (j?7:14) && d < bd){ bd = d; b = e; } }
        if(!b) break; seen.add(b); zapLine(from.x, from.z, b.x, b.z, 0x9fd4ff); hit(b, 12*(1+0.2*lv)*h.mods.dmg, h); from = b; any = true; }
      if(any){ h.cd[k] = 1.6*Math.pow(0.9,lv)*h.mods.cdr; if(h.isPlayer) SFX.zap(); } }
    else if(k==='buddy'){ const want = Math.min(3, lv), mine = ALLIES.filter(a=>a.owner===h && !a.temp).length; if(mine < want) addAlly(h, false); } }
  // ongoing actives
  if(h.shieldT > 0){ h.shieldT -= dt; h.bubble.visible = true; h.bubble.material.opacity = 0.22 + 0.08*Math.sin(gt*8); h.bubble.scale.setScalar(1 + 0.04*Math.sin(gt*11));
    if(h.shieldT <= 0 || h.shieldHP <= 0){ h.shieldT = 0; h.bubble.visible = false; const heal = h.absorbed*0.7; h.hp = Math.min(h.maxhp, h.hp + heal); burst(h.x,1.2,h.z,0xff8ad0,30,6); if(heal > 1){ burst(h.x,1,h.z,0x7cff8a,20,5); if(h.isPlayer) big('+'+Math.round(heal)+' HP', 700, 'small'); } } }
  if(h.ballT > 0){ h.ballT -= dt; const A = ABIL.balls; for(const e of ENEMY[h.team]){ if(e.dead) continue; if(hyp(e.x-h.x, e.z-h.z) < 0.6*h.grow + (e.r||0.6)){ if(e.kind==='ghost' && !e.big) hit(e, 999, h, {eat:true}); else hit(e, dmgOf(h,'balls',A.dps)*dt, h); } }
    if(Math.random()<0.3) burst(h.x, 0.3, h.z, 0xffd23f, 2, 3); for(let i=CIV.length-1;i>=0;i--) if(hyp(CIV[i].x-h.x, CIV[i].z-h.z) < 0.6*h.grow+0.4) killCiv(i, h); }
  if(h.sugarT > 0){ h.sugarT -= dt; h.fx.sug = (h.fx.sug||0) - dt; if(h.fx.sug <= 0){ h.fx.sug = 0.07; const c = pick([0xff8af0,0x41e4ff,0xffe14d,0x7cff8a]); addTrail(h, h.x - Math.sin(h.face)*0.8, h.z - Math.cos(h.face)*0.8, 1.6*h.mods.area, 2.2, dmgOf(h,'farts',ABIL.farts.dps), c, true); puff(h.x - Math.sin(h.face), 0.7, h.z - Math.cos(h.face), c, 3, 0.6); } }
  if(h.hopT > 0){ h.hopT -= dt; const H = h.hop, f = 1 - Math.max(0,h.hopT)/0.55; h.x = H.x0 + (H.x1-H.x0)*f; h.z = H.z0 + (H.z1-H.z0)*f; h.hopY = Math.sin(f*Math.PI)*2.4;
    if(h.hopT <= 0){ h.hopY = 0; const A = ABIL.flop, R = areaOf(h,'flop',A.rad); areaHit(h, h.x, h.z, R, dmgOf(h,'flop',A.dmg), {knock:5}); ringFx(h.x, h.z, R, 0xffb340, 0.45); discFx(h.x, h.z, R, 0xffb340, 0.25); burst(h.x, 0.4, h.z, 0xc0a080, 50, 9); addShake(0.4); SFX.boom(0.7); } }
  if(h.lungeT > 0){ h.lungeT -= dt; const nx = h.x + h.ax*28*dt, nz = h.z + h.az*28*dt; if(!blocked(nx, nz, h.r)){ h.x = nx; h.z = nz; }
    if(h.lungeT <= 0){ const A = ABIL.gob, ang = aimAngle(h), R = areaOf(h,'gob',A.range); coneHit(h, h.x, h.z, ang, R, A.arc, dmgOf(h,'gob',A.dmg), {eat:true, knock:2.5});
      fanFx(h.x, h.z, ang, R, A.arc, 0xffe14d, 0.3, 0.6); jawsFx(h.x, h.z, ang, R); addShake(0.35); SFX.chomp(); } }
  if(h.dashT > 0) h.dashT -= dt;
  if(h.throwT > 0) h.throwT -= dt;
  if(h.grace > 0) h.grace -= dt;
}
const JAWS = [];
function jawsFx(x, z, ang, R){ // a giant see-through Pac lies over the cone with its mouth open toward the enemies, then snaps shut
  const g = new THREE.Group(); g.position.set(x + Math.sin(ang)*R*0.42, 0.14, z + Math.cos(ang)*R*0.42); g.rotation.y = ang;
  const mat = new THREE.MeshBasicMaterial({color:0xffd23f, transparent:true, opacity:0.42, depthWrite:false, side:THREE.DoubleSide});
  const edge = new THREE.MeshBasicMaterial({color:0x2a1a04, transparent:true, opacity:0.5, depthWrite:false, side:THREE.DoubleSide});
  const m = new THREE.Mesh(new THREE.BufferGeometry(), mat), e = new THREE.Mesh(new THREE.BufferGeometry(), edge); m.rotation.x = e.rotation.x = -Math.PI/2; e.position.y = -0.02;
  g.add(e, m); scene.add(g); const J = {g, m, e, r:R*0.6, t:0}; jawShape(J, 0.75); JAWS.push(J); }
function jawShape(J, open){ // circle with a wedge cut out; the mouth points along the group's +z (theta = -90 degrees in the circle's plane)
  J.m.geometry.dispose(); J.e.geometry.dispose(); const a = Math.max(0.001, open);
  J.m.geometry = new THREE.CircleGeometry(J.r, 40, -Math.PI/2 + a, Math.PI*2 - a*2); J.e.geometry = new THREE.CircleGeometry(J.r*1.06, 40, -Math.PI/2 + a, Math.PI*2 - a*2); }
function updateJaws(dt){ for(let i=JAWS.length-1;i>=0;i--){ const J = JAWS[i]; J.t += dt; const k = J.t/0.42;
    jawShape(J, 0.75*Math.max(0, 1 - k*2.2)); J.m.material.opacity = 0.42*(k < 0.55 ? 1 : 1 - (k-0.55)/0.45); J.e.material.opacity = J.m.material.opacity*1.1;
    if(k >= 1){ scene.remove(J.g); J.m.geometry.dispose(); J.e.geometry.dispose(); JAWS.splice(i,1); } } }
function addAlly(h, temp){ const g = new THREE.Group(); const body = LOOK.rawPiece(MODELS,'ghost','ghost.body'), eyes = LOOK.rawPiece(MODELS,'ghost','ghost.eyes');
  if(body){ LOOK.inkify(body, {outline:0.03}); body.traverse(o=>{ if(o.isMesh && o.material.uniforms) o.material.uniforms.uTint.value.set(0x9fd4ff), o.material.uniforms.uEmit.value.set(0x0a2040); }); g.add(body); } if(eyes) g.add(eyes);
  g.scale.setScalar(0.8); scene.add(g); ALLIES.push({g, x:h.x, z:h.z, owner:h, temp, life:temp?ABIL.gang.dur:1e9}); }
function useActive(h, slot){
  const k = h.slots[slot]; if(!k){ if(h.isPlayer && !h.lockMsgT){ h.lockMsgT = 1; toast(null, slot==='off' ? 'Your attack unlocks at level 4.' : 'Your defence unlocks at level 3.', 2200); setTimeout(()=>h.lockMsgT = 0, 2500); } return false; }
  if(h.dead || h.stunT > 0 || (h.cd[k]||0) > 0 || h.hopT > 0) return false;
  const A = ABIL[k]; h.cd[k] = cdOf(h,k); if(h.isPlayer) flashSlot(slot);
  const aimX = h.ax, aimZ = h.az, ang = Math.atan2(aimX, aimZ);
  if(k==='glove'){ h.shieldT = A.dur; h.shieldHP = A.absorb*(1+0.25*(h.rank[k]||0)); h.absorbed = 0; SFX.shield(); }
  else if(k==='bang'){ const R = areaOf(h,k,A.rad); areaHit(h, h.x, h.z, R, dmgOf(h,k,A.dmg), {knock:A.knock}); ringFx(h.x, h.z, R, 0x41e4ff, 0.45); ringFx(h.x, h.z, R*0.6, 0xffffff, 0.3); discFx(h.x, h.z, R, 0x41e4ff, 0.2); burst(h.x,1,h.z,0x9fe8ff,40,12); addShake(0.3); SFX.boom(0.9); }
  else if(k==='flop'){ let d = A.dist, tx = h.x, tz = h.z; while(d > 1){ tx = h.x + aimX*d; tz = h.z + aimZ*d; if(!blocked(tx,tz,h.r) && inLane(tx,tz)) break; d -= 0.5; } if(d <= 1){ tx = h.x; tz = h.z; } h.hop = {x0:h.x, z0:h.z, x1:tx, z1:tz}; h.hopT = 0.55; SFX.boing(); }
  else if(k==='smoke'){ const R = areaOf(h,k,A.rad); for(let i=0;i<40;i++) puff(h.x, 0.8, h.z, 0x8a8a9a, 1, R*0.7); addTrail(h, h.x, h.z, R, A.dur, 2, 0x555566); h.fx.smoke = {x:h.x, z:h.z, R, t:A.dur}; SFX.whoosh(); }
  else if(k==='shove'){ const R = areaOf(h,k,A.range); coneHit(h, h.x, h.z, ang, R, A.arc, dmgOf(h,k,A.dmg), {knock:A.knock}); fanFx(h.x, h.z, ang, R, A.arc, 0xff4fb8, 0.25); addShake(0.2); SFX.whoosh(); }
  else if(k==='balls'){ h.ballT = A.dur*(1+0.1*(h.rank[k]||0)); heroSay(h, 'level'); tone(90, 0.8, 'sawtooth', 0.1, 2); addShake(0.3); burst(h.x,1,h.z,0xffd23f,60,10); }
  else if(k==='gob'){ h.lungeT = 0.17; h.face = ang; SFX.whoosh(); }
  else if(k==='farts'){ h.sugarT = A.dur*(1+0.1*(h.rank[k]||0)); SFX.fart(0.8); }
  else if(k==='kill'){ const fx = Math.sin(ang), fz = Math.cos(ang); for(const e of ENEMY[h.team]){ if(e.dead) continue; const px = e.x-h.x, pz = e.z-h.z; if(px*fx+pz*fz > 0 && hyp(px,pz) < 30) hit(e, dmgOf(h,k,A.dmg), h); }
    glitchT = 0.6; glitchDir = ang; SFX.zap(); noise(0.5, 0.2); }
  else if(k==='gang'){ for(let i=0;i<A.n;i++) addAlly(h, true); }
  else if(k==='hottake'){ const R = h.aimPx!=null ? clamp(hyp(h.aimPx-h.x, h.aimPz-h.z), 2.5, 8) : 5; throwCreature(h, 'cindercub', h.x+aimX*R, h.z+aimZ*R); }
  else if(k==='rockbottom'){ throwCreature(h, 'boulderbud', h.x+aimX*2, h.z+aimZ*2); }
  return true;
}
let glitchT = 0, glitchDir = 0;
function useMove(h){
  if(!h || !h.moveOk || h.dead || h.stunT > 0 || h.moveCd > 0) return; const M = MOVES[CHARS[h.char].move]; if(h.energy < M.cost){ if(h.isPlayer) toast(null,'Not enough energy. It refills over time.', 2000); return; }
  let dx = h.vx, dz = h.vz, l = hyp(dx,dz); if(l < 0.5){ dx = Math.sin(h.face); dz = Math.cos(h.face); l = 1; } dx /= l; dz /= l;
  if(h.char==='pac'){ let land = null; for(let d=M.dist; d>=2; d-=0.5){ const x = h.x+dx*d, z = h.z+dz*d; if(!blocked(x,z,h.r) && inLane(x,z)){ land = [x,z]; break; } }
    if(!land) return; burst(h.x,1,h.z,0xffe14d,24,6); ringFx(h.x, h.z, 2, 0xffe14d, 0.3); h.x = land[0]; h.z = land[1]; burst(h.x,1,h.z,0xffe14d,28,8); ringFx(h.x, h.z, 2.5, 0xffe14d, 0.3); h.iframes = 0.35; }
  else { h.dash = {dx, dz}; h.dashT = 0.24; burst(h.x,0.5,h.z,0x41e4ff,18,5); }
  h.energy -= M.cost; h.moveCd = M.cd*h.mods.cdr; if(h.isPlayer){ flashSlot('move'); SFX.whoosh(); }
}
