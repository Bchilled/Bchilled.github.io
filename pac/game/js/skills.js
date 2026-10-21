// PAC v0.11 — skills.js. THE VAMPIRE SURVIVORS MOVE SETS, run from data (js/skilldata.js, built from design/abilities.json).
// Brent (2026-10-21): "the abilities need to match vampire survivor like abilities ... reverse engineer it, take all the abilities and
// convert them over"; "I start the game, I get the same thing ... I'm asking you to change it"; "build up all characters to have move
// sets all the way to 25 ... commons, rares and mythics"; "the seven stones ... attached to mythic abilities ... an elemental sway";
// Pokey Bro: "the first three pokeballs ... Squirtle, Charmander and Bulbasaur and then also include something like Pikachu ... make
// little funny versions of each one" (original critters: a goggled frog, a birthday-candle baby dragon, an angry turnip, a static fluffball).
// How it works:
//  · every ability is one VS weapon (its `vs` field picks the mechanic below) and does exactly what its text says
//  · ranks 2-8 are the VS weapon's own level table; the shared boosts (damage, cooldown, area, speed, duration, amount) need no slot
//  · a maxed ability + its catalyst boost offers an EVOLUTION into its mythic at the next level-up; a mythic then takes a STONE
//  · this replaces the v0.10 abilities for Pac and Pokey Bro (the old ones stay in abilities.js, never offered)
"use strict";
const SK_DMG = 1;          // damage is the number in the text (VS points) — the text tells the truth
const SK_PS = 15;          // projectile speed 1 = 15 m/s
const SK_KEYS = ['dmg','cd','area','amount','speed','pierce','duration','range'];
const SK_AMT = new Set(['projectile_straight','projectile_homing','boomerang','chain','orbit','lob_aoe','summon','cone','beam']);   // what "one more" (the amount boost / Extra Pellet perk) adds to
const SK_STAT_SKIP = new Set(['dmg','cdr','area']);   // these level-up stats are replaced by the shared boosts
const SK_CHAR = {pokebro:'ballboy'};                   // abilities.json says pokebro; the game's key for Pokey Bro is ballboy
const SK = {};
// element colour of each ability (sets its look and sound); mythics take their source's
const SK_EL = {pac_c_homing_pellet:'shock', pac_c_orbit_dots:'frost', pac_c_breath_aura:'toxic', pac_c_chomp_cone:'shadow', pac_c_fruit_lob:'fire', pac_c_crumb_trail:'nature', pac_r_ghost_drop:'void', pac_r_pellet_flash:'frost',
  pokebro_c_water_starter:'frost', pokebro_c_fire_starter:'fire', pokebro_c_grass_starter:'nature', pokebro_c_electric:'shock', pokebro_c_ball_throw:'void', pokebro_c_splash_drop:'frost', pokebro_r_spark_volley:'shock', pokebro_r_bounce_creature:'toxic',
  all_c_damage:'fire', all_c_cooldown:'frost', all_c_area:'nature', all_c_speed:'shock', all_c_duration:'void', all_r_amount:'toxic'};
const SK_EL_VS = {'Magic Wand':'shock','Holy Wand':'shock','King Bible':'frost','Unholy Vespers':'frost', Garlic:'toxic', Whip:'shadow','Bloody Tear':'shadow','Santa Water':'fire','La Borra':'nature','Shadow Pinion':'nature',
  'Lightning Ring':'void','Thunder Loop':'void', Pentagram:'frost', Peachone:'shock','Ebony Wings':'shadow', Vandalier:'shock','Gatti Amari':'nature', Cross:'void', Bone:'toxic','La Robba':'frost', Bracelet:'shock','Bi-Bracelet':'shock',
  'Fire Wand':'fire', Hellfire:'fire', Knife:'shadow','Thousand Edge':'shadow', Axe:'nature','Death Spiral':'nature','Ammo Appalate':'fire', Gunastrophe:'fire','Chaos Rune':'void','Wicked Ruler':'void','Vento Sacro':'nature',
  'Carréllo':'fire','Carrozza!':'fire','Santa Javelin':'nature','Song of Mana':'frost', Runetracer:'void','Gaze of Gaea':'shock','Clock Lancet':'frost','Unearthly Bolt':'shock', Phas3r:'shock', Photonstorm:'shock', Jet:'frost'};
const SK_IC = {pac_c_homing_pellet:'🟡', pac_c_orbit_dots:'⚪', pac_c_breath_aura:'🤢', pac_c_chomp_cone:'🦷', pac_c_fruit_lob:'🍒', pac_c_crumb_trail:'🍪', pac_r_ghost_drop:'👻', pac_r_pellet_flash:'💥', pac_m_homing_pellet:'🌟', pac_m_orbit_dots:'🔵', pac_m_ghost_drop:'☠️',
  pokebro_c_water_starter:'🐸', pokebro_c_fire_starter:'🐲', pokebro_c_grass_starter:'🥬', pokebro_c_electric:'⚡', pokebro_c_ball_throw:'🔴', pokebro_c_splash_drop:'💦', pokebro_r_spark_volley:'✨', pokebro_r_bounce_creature:'🏓',
  pokebro_m_water_starter:'🌊', pokebro_m_fire_starter:'☄️', pokebro_m_grass_starter:'🌿', pokebro_m_electric:'🌩️',
  all_c_damage:'💪', all_c_cooldown:'⏱️', all_c_area:'⭕', all_c_speed:'💨', all_c_duration:'⏳', all_r_amount:'➕'};
const SK_IC_BEH = {projectile_straight:'🗡️', projectile_homing:'🎯', boomerang:'🪃', chain:'🎾', orbit:'🌀', aura:'☁️', lob_aoe:'💣', cone:'👊', nova:'✴️', trail:'👣', summon:'🐾', dash:'🐂', beam:'🔦', buff:'✚'};
// working names come straight from the id (Brent names them); shared boosts get plain names
const SK_NAME = {pac_c_chomp_cone:'Chomp', pac_c_breath_aura:'Bad Breath', pac_m_chomp_cone:'Chomp ★',
  pokebro_c_water_starter:'Frog Spit', pokebro_c_fire_starter:'Dragon Burp', pokebro_c_grass_starter:'Turnip Lash', pokebro_c_electric:'Fluff Zap', pokebro_c_splash_drop:'Frog Belly Flop', pokebro_r_spark_volley:'Fluff Sparks', pokebro_r_bounce_creature:'Fluff Bounce',
  pokebro_m_water_starter:'Frog Spit ★', pokebro_m_fire_starter:'Dragon Burp ★', pokebro_m_grass_starter:'Turnip Lash ★', pokebro_m_electric:'Fluff Zap ★', all_c_damage:'More Damage', all_c_cooldown:'Faster Cooldowns', all_c_area:'Bigger Area', all_c_speed:'Faster Shots', all_c_duration:'Longer Effects', all_r_amount:'One More'};
const skName = S => SK_NAME[S.id] || S.id.split('_').slice(2).map(w=>w[0].toUpperCase()+w.slice(1)).join(' ') + (S.tier==='mythic' ? ' ★' : '');
// Pokey Bro's critters (Brent, 15:04): which model pops out of the ball for each of his abilities
const SK_CRE = {water:['cre.frog','cre.splashpup'], fire:['cre.dragon','cre.cindercub'], grass:['cre.turnip','cre.bramblebud'], elec:['cre.fluff','cre.voltmoth']};
const SK_WHO_CRE = {pokebro_c_water_starter:'water', pokebro_m_water_starter:'water', pokebro_c_splash_drop:'water', pokebro_c_fire_starter:'fire', pokebro_m_fire_starter:'fire',
  pokebro_c_grass_starter:'grass', pokebro_m_grass_starter:'grass', pokebro_c_electric:'elec', pokebro_m_electric:'elec', pokebro_r_spark_volley:'elec', pokebro_r_bounce_creature:'elec'};

// ---------- register every ability into ABIL (abilities.js reads ABIL for slots, HUD, offers) ----------
for(const S of SKILLDATA){ SK[S.id] = S; S.side = S.beh==='buff' ? 'buff' : S.slot==='active' ? 'act' : 'pas'; S.max = S.ranks.length; }
for(const S of SKILLDATA){ const src = S.from && SK[S.from];
  S.el = SK_EL[S.id] || (src && (SK_EL[src.id] || SK_EL_VS[src.vs])) || SK_EL_VS[S.vs] || 'shock';
  ABIL[S.id] = {side:S.side, who:S.ch==='all' ? 'all' : (SK_CHAR[S.ch] || S.ch), el:S.el, ic:SK_IC[S.id] || SK_IC_BEH[S.beh] || '✦', name:skName(S), d:S.text, cd:S.base[1] || 1, sk:S}; }
const skHas = ch => Object.values(SK).some(S=>ABIL[S.id].who===ch);
// the level 2-4 picks: 3 common passives, then 3 common actives (twice) — for Pokey Bro the first pick is his starter
function skLadder(ch){ const mine = SKILLDATA.filter(S=>ABIL[S.id].who===ch && S.tier==='common'), ids = side => mine.filter(S=>S.side===side).slice(0,3).map(S=>S.id);
  return [['pas', ids('pas')], ['act', ids('act')], ['act', ids('act')]]; }

// ---------- live numbers: the rank row, then the hero's stats, the shared boosts and the perks ----------
const skRow = (h, k) => { const S = SK[k], r = h.rank[k]||0; return r > 0 && S.ranks[r-1] ? S.ranks[r-1] : S.base; };
function skBoost(h, key){ const i = SK_KEYS.indexOf(key); let v = 0; for(const b of h.bufl||[]){ const x = skRow(h, b)[i]; if(x != null) v += x; } return v; }
function skStats(h, k){ const S = SK[k], R = skRow(h, k), amt = SK_AMT.has(S.beh) ? skBoost(h,'amount') + (h.perk.multishot ? 1 : 0) : 0;
  return {dmg:(R[0]||0) * h.mods.dmg * (1 + skBoost(h,'dmg')) * (h.buff.dmg>0 ? 1.25 : 1) * SK_DMG,
    cd:Math.max(0.15, (R[1]||1) * h.mods.cdr * (1 + skBoost(h,'cd')) / (h.buff.cd>0 ? 1.4 : 1)),
    area:(R[2]||1) * h.mods.area * (1 + skBoost(h,'area')), n:Math.max(1, Math.round((R[3]||1) + amt)), speed:(R[4]||1) * (1 + skBoost(h,'speed')),
    pierce:R[5]==null ? Infinity : R[5], dur:(R[6]||0) * (1 + skBoost(h,'duration')), range:R[7]||12}; }
function skCd(h, k){ const S = SK[k], M = SKF[S.vs], s = skStats(h, k); let c = s.cd + (M && M.cdAdd ? M.cdAdd(s) : 0); if(S.vs==='Vento Sacro' && hyp(h.vx,h.vz) > 1.5) c *= 0.5; return c; }
const skHeld = (h, k) => h.act.includes(k) || h.pas.includes(k) || (h.bufl||[]).includes(k);
const skMaxed = (h, k) => skHeld(h, k) && (h.rank[k]||0) >= SK[k].max;
const rankMax = k => ABIL[k] && ABIL[k].sk ? ABIL[k].sk.max : RANK_MAX;
const skState = (h, k) => { h.sk = h.sk || {}; return h.sk[k] || (h.sk[k] = {}); };
const skAim = (h, how) => how==='passive' ? h.face : Math.atan2(h.ax, h.az);

// ---------- live lists (all cleared by skClearAll) ----------
const SKP = [], SKZ = [], SKQ = [], SKPET = [], SKFX = [], SKBURN = [];
function skLater(h, t, fn){ if(t <= 0) fn(); else SKQ.push({h, t, fn}); }
function skSeq(h, n, gap, fn){ for(let i=0;i<n;i++) skLater(h, i*gap, ()=>fn(i)); }

// ---------- meshes (geometries cached; neonMat is cached per colour in core.js) ----------
const SKG = {}; const skG = (k, f) => SKG[k] || (SKG[k] = f());
function skMesh(kind, col){ let m;
  if(kind==='pellet'){ m = new THREE.Mesh(skG('pel', ()=>new THREE.SphereGeometry(0.17, 10, 8)), neonMat(col)); m.add(glowS(col, 0.9, 0.7)); }
  else if(kind==='dot'){ m = new THREE.Mesh(skG('dot', ()=>new THREE.SphereGeometry(0.34, 16, 12)), neonMat(col)); m.add(glowS(col, 2.0, 0.8)); }
  else if(kind==='fireball'){ m = new THREE.Mesh(skG('fb', ()=>new THREE.IcosahedronGeometry(0.3, 1)), neonMat(col)); m.add(glowS(col, 2.2, 0.9)); }
  else if(kind==='spark'){ m = new THREE.Mesh(skG('sp', ()=>new THREE.BoxGeometry(0.09, 0.09, 0.8)), neonMat(col)); }
  else if(kind==='crumb'){ m = new THREE.Mesh(skG('cr', ()=>new THREE.DodecahedronGeometry(0.2, 0)), neonMat(0xd8a050)); m.add(glowS(col, 0.9, 0.5)); }
  else if(kind==='card'){ m = new THREE.Mesh(skG('card', ()=>new THREE.BoxGeometry(0.45, 0.05, 0.64)), neonMat(0xfff4e8)); m.add(glowS(col, 1.2, 0.6)); }
  else if(kind==='bullet'){ m = new THREE.Mesh(skG('bul', ()=>new THREE.BoxGeometry(0.1, 0.1, 0.42)), neonMat(0xffe080)); }
  else if(kind==='rock'){ m = new THREE.Mesh(skG('rock', ()=>new THREE.DodecahedronGeometry(0.42, 0)), neonMat(0x8a7a6a)); }
  else if(kind==='leaf'){ m = new THREE.Mesh(skG('leaf', ()=>{ const g = new THREE.SphereGeometry(0.3, 10, 6); g.scale(1, 0.25, 0.6); return g; }), neonMat(0x6fe08a)); }
  else if(kind==='disc'){ m = new THREE.Mesh(skG('disc', ()=>new THREE.CylinderGeometry(0.5, 0.5, 0.1, 20)), neonMat(0xc8ccd8)); m.add(glowS(col, 1.6, 0.5)); }
  else if(kind==='ball'){ m = LOOK.piece(MODELS,'creatures','cre.ball',{outline:0.015}) || new THREE.Mesh(skG('def', ()=>new THREE.SphereGeometry(0.24, 10, 8)), neonMat(0xff4040)); m.add(glowS(col, 1.4, 0.6)); }
  else if(kind==='fruit'){ m = fruitMesh.clone(); }
  else if(kind==='ghost'){ m = skullMesh(); m.scale.setScalar(0.9); }
  else { m = new THREE.Mesh(skG('def', ()=>new THREE.SphereGeometry(0.22, 10, 8)), neonMat(col)); m.add(glowS(col, 1.0, 0.6)); }
  return m; }
// what each character throws when an ability doesn't say
const SK_KIND = {pac:'pellet', ballboy:'ball', cardshark:'card', soldier:'bullet', brute:'rock', visor:'spark', tree:'leaf'};
const skKind = k => SK_KIND[ABIL[k].who] || 'pellet';
const skCol = k => EL[ABIL[k].el].col;

// Pokey Bro's critters: a pool per model, so popping one out every second costs nothing
const SKPOOL = {};
function skCritter(type){ const P = SKPOOL[type] || (SKPOOL[type] = []); let m = P.pop();
  if(!m){ const names = SK_CRE[type] || [type]; for(const n of names){ m = LOOK.piece(MODELS,'creatures',n,{outline:0.02}); if(m) break; } if(!m) m = new THREE.Mesh(skG('def', ()=>new THREE.SphereGeometry(0.22, 10, 8)), neonMat(0xffffff)); m.userData.type = type; }
  m.visible = true; m.scale.setScalar(0.8); scene.add(m); return m; }
function skCritterFree(m){ scene.remove(m); (SKPOOL[m.userData.type] = SKPOOL[m.userData.type] || []).push(m); }
// the ball pops at his side, the critter faces its target for `life` s, then goes back in
function skPop(h, k, ang, life=0.6, dist=1.3){ const type = SK_WHO_CRE[k]; if(!type) return null; const m = skCritter(type), x = h.x + Math.sin(ang+0.9)*dist, z = h.z + Math.cos(ang+0.9)*dist;
  m.position.set(x, floorY(x,z), z); m.rotation.y = ang; burst(x, 0.8, z, 0xffffff, 8, 4, 6, 0.3); ringFx(x, z, 0.9, skCol(k), 0.25);
  SKFX.push({m, life, max:life, critter:true, x, z}); if(h.isPlayer) tone(880, 0.05, 'triangle', 0.02, 1.4); return m; }

// ---------- hits: every hit goes through the stone on that ability ----------
const SK_STONE = {fire:'Burns: what it hits keeps burning for 20% of the hit per second, for 2 s.', frost:'Chills: what it hits moves at half speed for 1.5 s.',
  shock:'Arcs: each hit has a 1-in-4 chance to jump to the nearest other enemy for half damage.', toxic:'Poisons: what it kills leaves a toxic puddle for 2 s.',
  void:'Pulls: what it hits is dragged toward the blast instead of pushed away.', nature:'Heals: you get back 2% of the damage it deals.', shadow:'Crits: 1 hit in 5 deals 2.5× damage.'};
const SK_STONE_N = {fire:'Fire Stone', frost:'Frost Stone', shock:'Shock Stone', toxic:'Toxic Stone', void:'Void Stone', nature:'Nature Stone', shadow:'Shadow Stone'};
function skHit(h, e, d, k, o={}){ if(!e || e.dead) return; const st = h.stone && h.stone[k]; o.el = o.el || ABIL[k].el;
  if(st==='shadow' && Math.random() < 0.2) d *= 2.5; if(st==='frost') o.slow = Math.max(o.slow||0, 1.5); if(st==='void') o.knock = -1.6;
  if(SK[k].vs==='Bloody Tear' && Math.random() < 0.3) d *= 2;
  hit(e, d, h, o);
  if(st==='fire' && !e.dead) SKBURN.push({e, h, k, dps:d*0.2, t:2});
  if(st==='shock' && Math.random() < 0.25){ let f = null, bd = 6; for(const q of ENEMY[h.team]){ if(q===e || q.dead) continue; const dd = hyp(q.x-e.x, q.z-e.z); if(dd < bd){ bd = dd; f = q; } } if(f){ zapLine(e.x, e.z, f.x, f.z, EL.shock.col); hit(f, d*0.5, h, {el:'shock'}); } }
  if(st==='nature' && h.isPlayer) h.hp = Math.min(h.maxhp, h.hp + d*0.02);
  if(st==='toxic' && e.dead) addTrail(h, e.x, e.z, 1.5, 2, d*0.25, EL.toxic.col);
  if(SK[k].vs==='Bloody Tear') h.hp = Math.min(h.maxhp, h.hp + 0.5); }
// blasts also pop balloons and break props (v0.10 reactive club)
function skProps(h, x, z, r, d){ popNear(x, z, r, h); if(d > 4) for(const P of PROPS) if(!P.broken && P.cost>0){ const cx = (P.x0+P.x1)/2, cz = (P.z0+P.z1)/2; if(hyp(cx-x, cz-z) < r*0.8){ P.dmg += d; if(P.dmg > 45) breakProp(P, h, false); } } }
function skArea(h, k, x, z, r, d, o={}){ skProps(h, x, z, r, d); for(const e of ENEMY[h.team]) if(!e.dead && hyp(e.x-x, e.z-z) < r + (e.r||0.6)*0.8) skHit(h, e, d, k, Object.assign({fx:x, fz:z}, o)); }
// a strip L long and 2W wide from (x,z) toward ang (whips, jets, slashes)
function skRect(h, k, x, z, ang, L, W, d, o={}){ const fx = Math.sin(ang), fz = Math.cos(ang); skProps(h, x + fx*L/2, z + fz*L/2, Math.min(L/2, 3), d);
  for(const e of ENEMY[h.team]){ if(e.dead) continue; const px = e.x-x, pz = e.z-z, al = px*fx + pz*fz, off = Math.abs(px*fz - pz*fx), er = (e.r||0.6)*0.8; if(al > -er && al < L+er && off < W+er) skHit(h, e, d, k, Object.assign({fx:x, fz:z}, o)); } }
function skNearestN(h, R, n){ const L = []; for(const e of ENEMY[h.team]){ if(e.dead) continue; const d = hyp(e.x-h.x, e.z-h.z); if(d < R) L.push([d, e]); } L.sort((a,b)=>a[0]-b[0]); return L.slice(0, n).map(p=>p[1]); }
function skRandomN(h, R, n){ const L = []; for(const e of ENEMY[h.team]) if(!e.dead && hyp(e.x-h.x, e.z-h.z) < R) L.push(e); if(!L.length) return L;
  for(let i=L.length-1;i>0;i--){ const j = Math.floor(Math.random()*(i+1)); const t = L[i]; L[i] = L[j]; L[j] = t; }
  const b = bossNear(h, R), out = L.slice(0, n); if(b && !out.includes(b)) out[0] = b; while(out.length < n) out.push(pick(L)); return out; }   // Brent: the dangerous thing first
const skRandomIn = (h, R) => skRandomN(h, R, 1)[0] || null;
// a flat beam of light on the floor from (x0,z0) to (x1,z1), fading over `life`
function skBeam(x0, z0, x1, z1, w, col, life=0.3){ const L = hyp(x1-x0, z1-z0)||0.1, m = new THREE.Mesh(skG('beam', ()=>{ const g = new THREE.PlaneGeometry(1,1); g.rotateX(-Math.PI/2); return g; }),
    new THREE.MeshBasicMaterial({color:new THREE.Color(col).multiplyScalar(1.6), transparent:true, opacity:0.8, blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide}));
  m.scale.set(w*2, 1, L); m.rotation.y = Math.atan2(x1-x0, z1-z0); m.position.set((x0+x1)/2, 0.9, (z0+z1)/2); scene.add(m); SKFX.push({m, life, max:life, fade:true}); return m; }

// ---------- projectiles ----------
// o: kind, m, x, z, y, ang | tg, spd, life, dmg, r, pierce, rehit, home, turn, bounce, boomer (s before it turns home), arc {x0,z0,x1,z1,T,peak,drop,wob},
//    spin, walls (die on walls), hitWhen(p), onHit(p,e), onEnd(p), slowdown, knock, size
function skShot(h, k, s, o){ const x = o.x != null ? o.x : h.x, z = o.z != null ? o.z : h.z, a = o.ang != null ? o.ang : o.tg ? Math.atan2(o.tg.x-x, o.tg.z-z) : h.face;
  const m = o.m || skMesh(o.kind || skKind(k), skCol(k)); const sz = (o.size||1)*Math.min(2.5, s.area); m.scale.multiplyScalar(sz); m.position.set(x, o.y||1, z); scene.add(m);
  const p = {m, h, k, x, z, y:o.y||1, vx:Math.sin(a)*(o.spd||SK_PS), vz:Math.cos(a)*(o.spd||SK_PS), spd:o.spd||SK_PS, age:0, life:o.life||1.2, dmg:o.dmg != null ? o.dmg : s.dmg, r:(o.r||0.32)*sz,
    pierce:o.pierce != null ? o.pierce : s.pierce, hits:new Map(), rehit:o.rehit||0, home:o.home||null, turn:o.turn||7, bounce:!!o.bounce, boomer:o.boomer||0, back:false, arc:o.arc||null,
    spin:o.spin||0, walls:o.walls !== false, hitWhen:o.hitWhen||null, onHit:o.onHit||null, onEnd:o.onEnd||null, slowdown:o.slowdown||0, knock:o.knock||0, keep:false};
  SKP.push(p); return p; }
// shots fly over the furniture (bars, tables, couches) and stop at real walls and the lane's edge
const skOut = (x, z) => { const w = blocked(x, z, 0.05); return (w && !PROPS.includes(w)) || x < BOUNDS.x0+0.5 || x > BOUNDS.x1-0.5 || z < BOUNDS.z0+0.5 || z > BOUNDS.z1-0.5; };
function skShots(dt){
  for(let i=SKP.length-1;i>=0;i--){ const p = SKP[i], team = p.h.team; p.age += dt; p.life -= dt;
    if(p.home){ if(p.home.dead) p.home = nearestFrom(team, p.x, p.z, 14);
      if(p.home){ const a = Math.atan2(p.home.x-p.x, p.home.z-p.z), cur = Math.atan2(p.vx, p.vz), na = cur + clamp(angDiff(cur, a), -p.turn*dt, p.turn*dt), sp = hyp(p.vx, p.vz); p.vx = Math.sin(na)*sp; p.vz = Math.cos(na)*sp; } }
    if(p.boomer){ if(!p.back && p.age >= p.boomer){ p.back = true; p.hits.clear(); }
      if(p.back){ const o = p.h, dx = o.x-p.x, dz = o.z-p.z, d = hyp(dx, dz)||1; p.vx = dx/d*p.spd*1.2; p.vz = dz/d*p.spd*1.2; if(d < 1.2 || o.dead) p.life = 0; } }
    if(p.slowdown){ const f = Math.max(0.15, 1 - p.slowdown*dt); p.vx *= f; p.vz *= f; }
    let nx = p.x + p.vx*dt, nz = p.z + p.vz*dt;
    if(p.arc){ const A = p.arc, f = Math.min(1, p.age/A.T); nx = A.x0 + (A.x1-A.x0)*f + (A.wob ? Math.sin(p.age*A.wob)*1.6 : 0); nz = A.z0 + (A.z1-A.z0)*f;
      p.y = A.drop ? 0.6 + A.drop*(1-f) : 1 + Math.sin(f*Math.PI)*A.peak; if(f >= 1) p.life = 0; }
    else if(p.walls && skOut(nx, nz)){ if(p.bounce){ if(skOut(nx, p.z)){ p.vx = -p.vx; nx = p.x; } if(skOut(p.x, nz)){ p.vz = -p.vz; nz = p.z; } if(skOut(nx, nz)){ nx = p.x; nz = p.z; } } else if(!p.boomer) p.life = 0; }
    p.x = nx; p.z = nz; p.m.position.set(p.x, p.y + floorY(p.x, p.z), p.z);
    if(p.spin) p.m.rotation.y += p.spin*dt; else p.m.rotation.y = Math.atan2(p.vx, p.vz);
    if(p.life > 0 && (!p.hitWhen || p.hitWhen(p))){
      for(const e of ENEMY[team]){ if(e.dead) continue; const dx = e.x-p.x, dz = e.z-p.z, rr = p.r + (e.r||0.6)*0.8; if(dx > rr || dx < -rr || dz > rr || dz < -rr || dx*dx+dz*dz > rr*rr) continue;
        const t = p.hits.get(e); if(t != null && (p.rehit <= 0 || gt < t)) continue; p.hits.set(e, gt + p.rehit);
        skHit(p.h, e, p.dmg, p.k, {fx:p.x - p.vx*0.05, fz:p.z - p.vz*0.05, knock:p.knock}); burst(p.x, 1, p.z, skCol(p.k), 3, 3, 4, 0.25); if(p.onHit) p.onHit(p, e);
        if(--p.pierce <= 0){ p.life = 0; break; } }
      if(p.bounce || p.boomer || p.pierce === Infinity) popNear(p.x, p.z, p.r, p.h); }
    if(p.life <= 0){ if(p.onEnd) p.onEnd(p); if(!p.keep) scene.remove(p.m); SKP.splice(i,1); } } }
// a lob in an arc to (tx,tz) that does nothing on the way and calls land(x,z) where it lands
function skLob(h, k, s, tx, tz, T, peak, land, kind){ return skShot(h, k, s, {kind, x:h.x, z:h.z, spd:1, life:T+1, arc:{x0:h.x, z0:h.z, x1:tx, z1:tz, T, peak}, hitWhen:()=>false, spin:6, onEnd:p=>land(p.x, p.z)}); }
// something dropped from the sky onto (x,z), blasting `r` when it lands (`twice` lands again 0.3 s later)
function skDrop(h, k, s, x, z, r, kind, twice){ const blast = ()=>{ skArea(h, k, x, z, r, s.dmg, {knock:1.5}); elRing(ABIL[k].el, x, z, r, 0.35); elBurst(ABIL[k].el, x, 0.6, z, 16, 6); discFx(x, z, r, skCol(k), 0.25); if(h.isPlayer) SFX.zap(); };
  skShot(h, k, s, {kind, x, z, spd:0.001, life:2, arc:{x0:x, z0:z, x1:x, z1:z, T:0.28, drop:9}, hitWhen:()=>false, onEnd:()=>{ blast(); if(twice) skLater(h, 0.3, blast); }}); }

// ---------- zones (puddles, seed zones): tick damage while they last ----------
function skZone(h, k, x, z, r, life, d, o={}){ const col = skCol(k), m = new THREE.Mesh(unitCircle, new THREE.MeshBasicMaterial({color:new THREE.Color(col).multiplyScalar(1.2), transparent:true, opacity:0.42, blending:THREE.AdditiveBlending, depthWrite:false}));
  m.rotation.x = -Math.PI/2; m.position.set(x, 0.08 + floorY(x, z), z); m.scale.set(r, r, 1); scene.add(m);
  const Z = Object.assign({h, k, x, z, r, r0:r, life, max:life, tick:0.5, tt:0, dmg:d, m, col, grow:0, follow:null}, o); SKZ.push(Z); return Z; }
function skZones(dt){ for(let i=SKZ.length-1;i>=0;i--){ const Z = SKZ[i], h = Z.h; Z.life -= dt;
    if(Z.follow){ Z.follow.a += Z.follow.w*dt; const tx = h.x + Math.cos(Z.follow.a)*Z.follow.d, tz = h.z + Math.sin(Z.follow.a)*Z.follow.d; Z.x += (tx-Z.x)*Math.min(1, 2.5*dt); Z.z += (tz-Z.z)*Math.min(1, 2.5*dt); }
    if(Z.grow) Z.r = Z.r0*(1 + (1 - Z.life/Z.max)*Z.grow);
    Z.m.position.set(Z.x, 0.08 + floorY(Z.x, Z.z), Z.z); Z.m.scale.set(Z.r, Z.r, 1); Z.m.material.opacity = 0.42*Math.min(1, Z.life*3);
    Z.tt -= dt; if(Z.tt <= 0){ Z.tt = Z.tick; skArea(h, Z.k, Z.x, Z.z, Z.r, Z.dmg); }
    if(Math.random() < 0.2) puff(Z.x + rnd(-Z.r, Z.r)*0.6, 0.3, Z.z + rnd(-Z.r, Z.r)*0.6, Z.col, 1, 0.4);
    if(Z.life <= 0 || h.dead){ scene.remove(Z.m); Z.m.material.dispose(); SKZ.splice(i,1); } } }

// ---------- pets (strays and saplings that walk to enemies and claw them) ----------
function skPet(h, k, s, x, z){ const type = SK_WHO_CRE[k] || pick(['water','fire','grass','elec']), m = skCritter(type); m.position.set(x, 0, z);
  SKPET.push({h, k, m, x, z, life:s.dur, dmg:s.dmg, spd:12*s.speed, r:0.9*s.area, hit:new Map(), wa:rnd(0,6.28)}); burst(x, 0.8, z, 0xffffff, 10, 4, 6, 0.3); }
function skPets(dt){ for(let i=SKPET.length-1;i>=0;i--){ const P = SKPET[i], h = P.h; P.life -= dt;
    let t = null, bd = 10; for(const e of ENEMY[h.team]){ if(e.dead) continue; const d = hyp(e.x-P.x, e.z-P.z); if(d < bd){ bd = d; t = e; } }
    let tx, tz; if(t){ tx = t.x; tz = t.z; } else { P.wa += dt*0.8; tx = h.x + Math.cos(P.wa)*3; tz = h.z + Math.sin(P.wa)*3; }
    const dx = tx-P.x, dz = tz-P.z, d = hyp(dx, dz)||1, st = Math.min(d, P.spd*dt), nx = P.x + dx/d*st, nz = P.z + dz/d*st; if(!blocked(nx, nz, 0.3)){ P.x = nx; P.z = nz; }
    P.m.position.set(P.x, floorY(P.x, P.z) + Math.abs(Math.sin(gt*10 + i))*0.25, P.z); P.m.rotation.y = Math.atan2(dx, dz);
    if(t && bd < P.r + (t.r||0.6) && (P.hit.get(t)||0) <= gt){ P.hit.set(t, gt + 0.6); skHit(h, t, P.dmg, P.k, {fx:P.x, fz:P.z}); burst(t.x, 1, t.z, skCol(P.k), 5, 4, 4, 0.3); }
    if(P.life <= 0 || h.dead){ burst(P.x, 0.8, P.z, 0xffffff, 10, 4, 6, 0.3); skCritterFree(P.m); SKPET.splice(i,1); } } }

// ---------- the orbit ring (King Bible / Unholy Vespers): n things circle him and hit what they touch ----------
function skOrbitTick(h, k, s, dt, st){ st.items = st.items || [];
  if(!(st.t > 0)){ st.items.forEach(m=>m.visible = false); return; } st.t -= dt;
  while(st.items.length < s.n){ const m = skMesh(ABIL[k].who==='pac' ? 'dot' : skKind(k), ABIL[k].who==='pac' ? 0xe8f6ff : skCol(k)); scene.add(m); st.items.push(m); }
  while(st.items.length > s.n) scene.remove(st.items.pop());
  const R = 2.7*Math.sqrt(s.area), sz = Math.min(2, s.area); st.a = (st.a||0) + 3.4*s.speed*dt; st.hit = st.hit || new Map(); if(st.hit.size > 300) st.hit.clear();
  st.items.forEach((m, i)=>{ const a = st.a + i/st.items.length*6.283, x = h.x + Math.cos(a)*R, z = h.z + Math.sin(a)*R; m.visible = true; m.position.set(x, 1 + floorY(x, z), z); m.scale.setScalar(sz);
    for(const e of ENEMY[h.team]){ if(e.dead || Math.abs(e.x-x) > 2.5 || Math.abs(e.z-z) > 2.5) continue; if(hyp(e.x-x, e.z-z) < 0.45*sz + (e.r||0.6)*0.8 && (st.hit.get(e)||0) <= gt){ st.hit.set(e, gt + 0.45); skHit(h, e, s.dmg, k, {knock:1.6, fx:h.x, fz:h.z}); burst(x, 1, z, skCol(k), 4, 3, 2, 0.3); } }
    popNear(x, z, 0.5, h); });
  if(st.t <= 0) st.items.forEach(m=>m.visible = false); }
// a critter circling at radius R bombing where it flies (Peachone / Ebony Wings / Vandalier): out for `dur`, back in its ball for 2.5 s
function skBirdTick(h, k, s, dt, st, dirs){ st.cre = st.cre || []; st.rest = st.rest == null ? 0.5 : st.rest;
  if(!(st.out > 0)){ st.cre.forEach(m=>m.visible = false); st.rest -= dt; if(st.rest <= 0 && countNear(h, h.x, h.z, 16)){ st.out = Math.max(1, s.dur); st.bombT = 0.4; } return; }
  st.out -= dt; while(st.cre.length < dirs.length){ const m = skCritter(SK_WHO_CRE[k] || 'elec'); st.cre.push(m); }
  const R = 5.2*Math.sqrt(s.area); st.a = (st.a||rnd(0,6)) + 1.3*s.speed*dt; st.bombT -= dt; const drop = st.bombT <= 0; if(drop) st.bombT = s.cd;
  dirs.forEach((dir, j)=>{ const a = dir*st.a + j*Math.PI, x = h.x + Math.cos(a)*R, z = h.z + Math.sin(a)*R, m = st.cre[j]; m.visible = true; m.position.set(x, 2.2 + Math.sin(gt*6)*0.2, z); m.rotation.y = a + dir*Math.PI/2;
    if(drop){ const n = Math.max(1, Math.round(s.n/dirs.length)); for(let i=0;i<n;i++) skLater(h, i*0.08, ()=>{ const bx = x + rnd(-1.6,1.6), bz = z + rnd(-1.6,1.6); skArea(h, k, bx, bz, 1.3*s.area, s.dmg); ringFx(bx, bz, 1.3*s.area, skCol(k), 0.3); burst(bx, 0.5, bz, skCol(k), 6, 5, 6, 0.35); }); } });
  if(st.out <= 0){ st.cre.forEach(m=>{ burst(m.position.x, 1.5, m.position.z, 0xffffff, 8, 4, 6, 0.3); m.visible = false; }); st.rest = 2.5; } }
// the dash (Carréllo): he charges, bouncing off walls, running over everything in the way
function skDashTick(h, k, s, dt, st){ const D = st.dash; if(!D) return; D.t -= dt; const sp = 22*s.speed; let nx = h.x + Math.sin(D.a)*sp*dt, nz = h.z + Math.cos(D.a)*sp*dt;
  if(skOut(nx, nz) || blocked(nx, nz, h.r)){ if(D.b-- <= 0){ st.dash = null; return; } const hx = skOut(nx, h.z) || blocked(nx, h.z, h.r), hz = skOut(h.x, nz) || blocked(h.x, nz, h.r); let vx = Math.sin(D.a), vz = Math.cos(D.a); if(hx) vx = -vx; if(hz) vz = -vz; if(!hx && !hz){ vx = -vx; vz = -vz; } D.a = Math.atan2(vx, vz); addShake(0.15); return; }
  h.x = nx; h.z = nz; h.face = D.a; h.iframes = Math.max(h.iframes, 0.1); burst(h.x, 0.4, h.z, skCol(k), 2, 3, 2, 0.3);
  for(const e of ENEMY[h.team]){ if(e.dead) continue; if(hyp(e.x-h.x, e.z-h.z) < 1.4*s.area + (e.r||0.6) && (D.hit.get(e)||0) <= gt){ D.hit.set(e, gt + 0.5); skHit(h, e, D.dmg, k, {knock:5, fx:h.x, fz:h.z}); } } skProps(h, h.x, h.z, 1.6, D.dmg);
  if(D.t <= 0) st.dash = null; }

// ---------- THE MECHANICS: one per VS weapon. fire(h, k, stats, how) → false when there's nothing to fire at (the cooldown waits) ----------
// how: 'passive' (on its own), 'auto' (auto-cast on its button), 'press' (you pressed it)
function skWhipFx(h, k, a, L, W){ if(ABIL[k].who==='pac'){ teethFx(h.x, h.z, a, Math.min(L, 8)); SFX.chomp(); if(h.rig) h.rig.snapAt = rtime; }
  else { skBeam(h.x, h.z, h.x + Math.sin(a)*L, h.z + Math.cos(a)*L, W, skCol(k), 0.22); spray(h.x, h.z, a, L*0.6, 0.3, skCol(k), 10, 1); if(h.isPlayer) SFX.whoosh(); } }
function skWand(h, k, s, gap){ const t = nearest(h, s.range); if(!t) return false; const sp = SK_PS*1.3*s.speed;
  skSeq(h, s.n, gap, ()=>{ const tg = t.dead ? nearest(h, s.range) : t; if(!tg) return; skShot(h, k, s, {kind:ABIL[k].who==='pac' ? 'pellet' : skKind(k), tg, home:tg, spd:sp, life:s.range/sp*1.8, turn:Math.max(8, sp*0.5)}); if(h.isPlayer) tone(1500, 0.03, 'square', 0.01); });
  return true; }
function skKnife(h, k, s, how, gap){ const a = skAim(h, how), sp = 24*s.speed; skSeq(h, s.n, gap, i=>{ const off = ((i%3)-1)*0.35; skShot(h, k, s, {x:h.x + Math.cos(a)*off, z:h.z - Math.sin(a)*off, ang:a + rnd(-0.05,0.05), spd:sp, life:s.range/sp}); }); if(h.isPlayer) tone(1100, 0.03, 'triangle', 0.015); return true; }
function skFireWand(h, k, s, big){ const t = skRandomIn(h, s.range); if(!t) return false; skPop(h, k, Math.atan2(t.x-h.x, t.z-h.z), 0.7); const sp = big ? 7*s.speed : SK_PS*0.85*s.speed, a = Math.atan2(t.x-h.x, t.z-h.z);
  for(let i=0;i<s.n;i++) skShot(h, k, s, {kind:'fireball', ang:a + (i-(s.n-1)/2)*0.22, spd:sp, life:s.range/sp*1.3, size:big ? 2.4 : 1, pierce:big ? Infinity : s.pierce, walls:!big});
  if(h.isPlayer) SFX.el('fire'); return true; }
function skLightning(h, k, s, twice){ const L = skRandomN(h, s.range, s.n); if(!L.length) return false; if(SK_WHO_CRE[k]) skPop(h, k, Math.atan2(L[0].x-h.x, L[0].z-h.z), 0.8);
  L.forEach((t, i)=>skLater(h, i*0.08, ()=>skDrop(h, k, s, t.x, t.z, 1.4*Math.min(2.2, s.area), ABIL[k].who==='pac' ? 'ghost' : 'spark', twice))); return true; }
function skJet(h, k, s, how){ const L = skNearestN(h, s.range, s.n); if(!L.length) return false; L.forEach((t, i)=>skLater(h, i*0.1, ()=>{ if(t.dead) return; const a = Math.atan2(t.x-h.x, t.z-h.z), R = s.range*1.05, W = 0.6*s.area;
    skPop(h, k, a, 0.5); skRect(h, k, h.x, h.z, a, R, W, s.dmg, {knock:5}); skBeam(h.x, h.z, h.x + Math.sin(a)*R, h.z + Math.cos(a)*R, W, 0x7fd8ff, 0.25); spray(h.x, h.z, a, R*0.8, 0.15, 0xbfeaff, 14, 1); if(h.isPlayer) noise(0.18, 0.08, null, {freq:1800}); })); return true; }
const SKF = {
  'Magic Wand': {fire:(h,k,s)=>skWand(h, k, s, 0.1)},
  'Holy Wand':  {fire:(h,k,s)=>skWand(h, k, s, 0.04)},
  'King Bible': {fire:(h,k,s)=>{ if(!countNear(h, h.x, h.z, 12)) return false; const st = skState(h,k); st.t = s.dur; return true; }, cdAdd:s=>s.dur, tick:skOrbitTick},
  'Unholy Vespers': {fire:(h,k,s)=>{ skState(h,k).t = 1e9; return true; }, tick:skOrbitTick},
  Garlic: {tick:(h,k,s,dt,st)=>{ const R = 2.6*s.area, col = skCol(k);
      if(!st.ring){ st.ring = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 48), new THREE.MeshBasicMaterial({color:new THREE.Color(col).multiplyScalar(1.3), transparent:true, opacity:0.35, blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide})); st.ring.rotation.x = -Math.PI/2; scene.add(st.ring); }
      st.ring.visible = true; st.ring.position.set(h.x, 0.1 + floorY(h.x, h.z), h.z); st.ring.scale.setScalar(R*(1 + 0.03*Math.sin(gt*5))); st.pulse = Math.max(0, (st.pulse||0) - dt*3); st.ring.material.opacity = 0.28 + st.pulse*0.5;
      if(Math.random() < 0.3) puff(h.x + rnd(-R,R)*0.6, rnd(0.3,1.1), h.z + rnd(-R,R)*0.6, col, 1, 0.5); },
    fire:(h,k,s)=>{ const R = 2.6*s.area; if(!countNear(h, h.x, h.z, R + 0.6)) return false; skArea(h, k, h.x, h.z, R, s.dmg, {knock:2.2}); skState(h,k).pulse = 1; return true; }},
  // on its own, the lash turns toward the most dangerous thing in reach (Brent: dangerous enemies first); on a button it goes where you aim
  Whip: {fire:(h,k,s,how)=>{ const L = (s.range||7)*s.area, W = 1.0*s.area, t = how==='passive' ? bestTarget(h, L) : null; if(how==='passive' && !t) return false; const a0 = t ? Math.atan2(t.x-h.x, t.z-h.z) : skAim(h, how); if(SK_WHO_CRE[k]) skPop(h, k, a0, 0.5);
      skSeq(h, s.n, 0.15, i=>{ const a = a0 + (i%2 ? Math.PI : 0); skRect(h, k, h.x, h.z, a, L, W, s.dmg, {knock:1.8}); skWhipFx(h, k, a, L, W); }); return true; },
    want:(h,k,s)=>{ const t = bestTarget(h, (s.range||7)*s.area*0.9); return t ? {t} : null; }},
  'Bloody Tear': {fire:(h,k,s,how)=>{ const L = (s.range||7)*s.area, W = 1.2*s.area, t = how==='passive' ? bestTarget(h, L) : null; if(how==='passive' && !t) return false; const a0 = t ? Math.atan2(t.x-h.x, t.z-h.z) : skAim(h, how); if(SK_WHO_CRE[k]) skPop(h, k, a0, 0.5);
      for(let i=0;i<Math.max(2, s.n);i++){ const a = a0 + (i%2 ? Math.PI : 0); skRect(h, k, h.x, h.z, a, L, W, s.dmg, {knock:2.4}); skWhipFx(h, k, a, L, W); } return true; },
    want:(h,k,s)=>{ const t = bestTarget(h, (s.range||7)*s.area*0.9); return t ? {t} : null; }},
  'Santa Water': {fire:(h,k,s)=>{ const L = skRandomN(h, s.range, s.n); if(!L.length) return false;
      L.forEach((t, i)=>skLater(h, i*0.12, ()=>{ skLob(h, k, s, t.x + rnd(-0.6,0.6), t.z + rnd(-0.6,0.6), 0.6, 4, (x, z)=>{ skZone(h, k, x, z, 1.9*s.area, Math.max(0.5, s.dur), s.dmg); elBurst(ABIL[k].el, x, 0.5, z, 20, 6); if(h.isPlayer) SFX.pop(); }, ABIL[k].who==='pac' ? 'fruit' : null); }));
      return true; }},
  'La Borra': {fire:(h,k,s)=>{ if(!countNear(h, h.x, h.z, 14)) return false; for(let i=0;i<s.n;i++){ const a = i/s.n*6.283; skZone(h, k, h.x + Math.cos(a)*3, h.z + Math.sin(a)*3, 1.2*s.area, s.dur, s.dmg, {follow:{a, d:3, w:0.8}, grow:0.6}); } return true; }},
  'Shadow Pinion': {tick:(h,k,s,dt,st)=>{ st.crumbs = st.crumbs || []; const moving = hyp(h.vx, h.vz) > 1.5; st.dropT = (st.dropT||0) - dt; st.idle = moving ? 0 : (st.idle||0) + dt;
      if(moving && st.dropT <= 0 && st.crumbs.length < 3 + 2*s.n){ st.dropT = 0.3; const bx = h.x - Math.sin(h.face)*0.9, bz = h.z - Math.cos(h.face)*0.9, m = skMesh(ABIL[k].who==='pac' ? 'crumb' : skKind(k), skCol(k)); m.position.set(bx, 0.3 + floorY(bx, bz), bz); scene.add(m); st.crumbs.push({m, x:bx, z:bz, t:2.5 + 2*s.dur, hit:new Map()}); }
      for(let i=st.crumbs.length-1;i>=0;i--){ const c = st.crumbs[i]; c.t -= dt; c.m.rotation.y += dt*2; c.m.visible = true;
        for(const e of ENEMY[h.team]) if(!e.dead && hyp(e.x-c.x, e.z-c.z) < 0.5*s.area + (e.r||0.6)*0.8 && (c.hit.get(e)||0) <= gt){ c.hit.set(e, gt + 0.5); skHit(h, e, s.dmg, k, {}); }
        if(c.t <= 0){ scene.remove(c.m); st.crumbs.splice(i,1); } } },
    fire:(h,k,s,how)=>{ const st = skState(h,k); if(!st.crumbs || !st.crumbs.length || (how==='passive' && st.idle < 0.25)) return false; const a = skAim(h, how), sp = 18*s.speed;
      st.crumbs.forEach(c=>{ scene.remove(c.m); skShot(h, k, s, {kind:ABIL[k].who==='pac' ? 'crumb' : skKind(k), x:c.x, z:c.z, ang:a, spd:sp, life:12/sp*1.6, pierce:Infinity, y:0.6}); }); st.crumbs.length = 0; if(h.isPlayer) SFX.whoosh(); return true; },
    want:(h,k,s)=>{ const st = skState(h,k); if(!st.crumbs || st.crumbs.length < 3 || hyp(h.vx, h.vz) > 1.2) return null; const t = bestTarget(h, 14); return t ? {t} : null; }},
  'Lightning Ring': {fire:(h,k,s)=>skLightning(h, k, s, false)},
  'Thunder Loop':   {fire:(h,k,s)=>skLightning(h, k, s, true)},
  Pentagram: {fire:(h,k,s)=>{ let n = 0; for(const e of ENEMY[h.team]){ if(e.dead || e.kind !== 'ghost') continue; const [sx, sy, f] = project(e.x, 1, e.z); if(!f || sx < 0 || sx > SW || sy < 0 || sy > SH) continue;
        e.dead = true; if(e.big) debuted.add(e.type); burst(e.x, 1, e.z, 0xe8f6ff, 8, 6, 2, 0.5); n++; if(h.isPlayer){ ST.ghosts++; addScore(10); } }
      screenFlash('#e8f6ff', 0.85); ringFx(h.x, h.z, 26, skCol(k), 0.8); ringFx(h.x, h.z, 12, 0xffffff, 0.5); addShake(0.5); SFX.boom(1.2); if(h.isPlayer) big('POWER FLASH! ×'+n, 1000, 'small'); return true; },
    want:h=>countNear(h, h.x, h.z, 18) >= 15 ? {} : null},
  Peachone:      {tick:(h,k,s,dt,st)=>skBirdTick(h, k, s, dt, st, [1])},
  'Ebony Wings': {tick:(h,k,s,dt,st)=>skBirdTick(h, k, s, dt, st, [-1])},
  Vandalier:     {tick:(h,k,s,dt,st)=>skBirdTick(h, k, s, dt, st, [1, -1])},
  'Gatti Amari': {fire:(h,k,s)=>{ if(!countNear(h, h.x, h.z, 16)) return false; for(let i=0;i<s.n;i++){ const a = rnd(0,6.28); skPet(h, k, s, h.x + Math.cos(a)*1.2, h.z + Math.sin(a)*1.2); } return true; }},
  Cross: {fire:(h,k,s)=>{ const t = nearest(h, s.range); if(!t) return false; const sp = 16*s.speed;
      skSeq(h, s.n, 0.1, i=>skShot(h, k, s, {ang:Math.atan2(t.x-h.x, t.z-h.z) + (i ? rnd(-0.3,0.3) : 0), spd:sp, boomer:s.range/sp, life:8, pierce:Infinity, spin:14, walls:false})); if(h.isPlayer) SFX.whoosh(); return true; }},
  Bone: {fire:(h,k,s)=>{ const t = nearest(h, s.range); if(!t) return false; const sp = SK_PS*s.speed;
      skSeq(h, s.n, 0.15, ()=>skShot(h, k, s, {m:SK_WHO_CRE[k] ? skCritter(SK_WHO_CRE[k]) : null, tg:t, spd:sp, life:Math.max(0.5, s.dur), pierce:Infinity, rehit:0.35, bounce:true, spin:10, onHit:skRicochet, onEnd:p=>{ if(p.m.userData.type){ p.keep = true; skCritterFree(p.m); } }})); return true; }},
  'La Robba': {fire:(h,k,s)=>{ if(!countNear(h, h.x, h.z, 16)) return false;
      skSeq(h, s.n, 0.2, ()=>{ const x = clamp(h.x + rnd(-7,7), BOUNDS.x0+2, BOUNDS.x1-2), z = h.z - rnd(3,9), m = SK_WHO_CRE[k] ? skCritter(SK_WHO_CRE[k]) : null;
        skShot(h, k, s, {m, x, z, spd:0.001, life:2, arc:{x0:x, z0:z, x1:x, z1:z, T:0.4, drop:10}, hitWhen:()=>false, onEnd:p=>{ p.keep = true; skArea(h, k, x, z, 1.6*s.area, s.dmg, {knock:3}); ringFx(x, z, 1.6*s.area, skCol(k), 0.3); puff(x, 0.4, z, 0xbfeaff, 8, 1.2); if(h.isPlayer) SFX.boing();
          const q = skShot(h, k, s, {m:p.m, x, z, ang:rnd(0,6.28), spd:9*s.speed, life:Math.max(0.5, s.dur), pierce:Infinity, rehit:0.4, bounce:true, onEnd:p2=>{ if(p2.m.userData.type){ p2.keep = true; skCritterFree(p2.m); } }}); q.m.scale.setScalar(0.8); }}); }); return true; }},
  Bracelet:     {fire:(h,k,s)=>skSparks(h, k, s)},
  'Bi-Bracelet':{fire:(h,k,s)=>skSparks(h, k, s)},
  'Fire Wand':  {fire:(h,k,s)=>skFireWand(h, k, s, false)},
  Hellfire:     {fire:(h,k,s)=>skFireWand(h, k, s, true)},
  Jet:          {fire:(h,k,s,how)=>skJet(h, k, s, how)},
  Knife:          {fire:(h,k,s,how)=>skKnife(h, k, s, how, 0.07)},
  'Thousand Edge':{fire:(h,k,s,how)=>skKnife(h, k, s, how, 0.04)},
  Axe: {fire:(h,k,s,how)=>{ for(let i=0;i<s.n;i++){ const t = skRandomIn(h, s.range), a = t ? Math.atan2(t.x-h.x, t.z-h.z) : skAim(h, how) + rnd(-1,1), d = t ? hyp(t.x-h.x, t.z-h.z) + 2 : 8, T = 1.0/s.speed;
      skShot(h, k, s, {x:h.x, z:h.z, spd:1, life:T + 1, arc:{x0:h.x, z0:h.z, x1:h.x + Math.sin(a)*d, z1:h.z + Math.cos(a)*d, T, peak:5}, spin:12, size:1.4, hitWhen:p=>p.age/p.arc.T > 0.4}); } return true; }},
  'Death Spiral': {fire:(h,k,s)=>{ if(!countNear(h, h.x, h.z, 14)) return false; const sp = 12*s.speed; for(let i=0;i<s.n;i++) skShot(h, k, s, {ang:i/s.n*6.283, spd:sp, life:s.range/sp*1.6, pierce:Infinity, slowdown:0.6, spin:14, size:1.5, walls:false}); return true; }},
  'Chaos Rune': {fire:(h,k,s)=>{ for(let i=0;i<s.n;i++){ const t = skRandomIn(h, s.range), x0 = h.x + rnd(-5,5), z0 = h.z + 9, x1 = t ? t.x : h.x + rnd(-8,8), z1 = t ? t.z : h.z - rnd(4,10), T = 1.1/s.speed;
      skShot(h, k, s, {x:x0, z:z0, spd:1, life:T + 1, arc:{x0, z0, x1, z1, T, peak:7, wob:9}, spin:9, hitWhen:p=>p.age/p.arc.T > 0.5}); } return true; }},
  'Santa Javelin': {fire:(h,k,s,how)=>{ const a0 = skAim(h, how); for(let i=0;i<s.n;i++){ const a = a0 + (i-(s.n-1)/2)*0.45, x = h.x + Math.sin(a)*6, z = h.z + Math.cos(a)*6;
      skLater(h, i*0.1, ()=>skShot(h, k, s, {kind:'rock', x, z, spd:0.001, life:2, size:1.6, arc:{x0:x, z0:z, x1:x, z1:z, T:0.35, drop:10}, hitWhen:()=>false, onEnd:()=>{ const R = 2.2*s.area; skArea(h, k, x, z, R, s.dmg, {knock:3}); ringFx(x, z, R, skCol(k), 0.4); ringFx(x, z, R*1.6, skCol(k), Math.max(0.3, s.dur)); discFx(x, z, R, skCol(k), 0.3); addShake(0.2); if(h.isPlayer) SFX.boom(0.6); }})); } return true; }},
  'Wicked Ruler': {tick:(h,k,s,dt,st)=>{ st.items = st.items || []; while(st.items.length < s.n){ const m = skMesh(skKind(k), skCol(k)); scene.add(m); st.items.push(m); } while(st.items.length > s.n) scene.remove(st.items.pop());
      st.a = (st.a||0) + 2.2*dt; st.hit = st.hit || new Map(); if(st.hit.size > 300) st.hit.clear(); const R = 2.4*s.area;
      st.items.forEach((m, i)=>{ const a = st.a + i/st.items.length*6.283, x = h.x + Math.cos(a)*R, z = h.z + Math.sin(a)*R; m.visible = true; m.position.set(x, 1.1, z); m.userData.x = x; m.userData.z = z;
        for(const e of ENEMY[h.team]) if(!e.dead && Math.abs(e.x-x) < 2 && hyp(e.x-x, e.z-z) < 0.5 + (e.r||0.6)*0.8 && (st.hit.get(e)||0) <= gt){ st.hit.set(e, gt + 0.5); skHit(h, e, s.dmg*0.5, k, {}); } }); },
    fire:(h,k,s)=>{ const st = skState(h,k); if(!st.items || !st.items.length) return false; const t = nearest(h, s.range); if(!t) return false;
      st.items.forEach(m=>skShot(h, k, s, {x:m.userData.x, z:m.userData.z, tg:t, spd:SK_PS*s.speed, life:s.range/(SK_PS*s.speed)*1.4})); return true; }},
  'Vento Sacro': {fire:(h,k,s,how)=>{ const a = skAim(h, how), L = (s.range||7)*s.area, W = 0.9; skSeq(h, s.n, 0.08, i=>{ const b = a + (i%2 ? 0.25 : -0.25); skRect(h, k, h.x, h.z, b, L, W, s.dmg); skWhipFx(h, k, b, L, W); }); return true; },
    want:(h,k,s)=>{ const t = bestTarget(h, (s.range||7)*s.area*0.9); return t ? {t} : null; }},
  'Gaze of Gaea': {fire:(h,k,s,how)=>{ const a = skAim(h, how), L = 4 + (s.range||7)*s.area; for(const e of ENEMY[h.team]){ if(e.dead) continue; const dx = e.x-h.x, dz = e.z-h.z, d = hyp(dx, dz); if(d < L + (e.r||0.6) && Math.abs(angDiff(a, Math.atan2(dx, dz))) < 0.45 + 0.3*(1 - d/L)) skHit(h, e, s.dmg, k, {}); }
      fanFx(h.x, h.z, a, L, 0.9, skCol(k), 0.25); skProps(h, h.x + Math.sin(a)*L/2, h.z + Math.cos(a)*L/2, L/3, s.dmg); return true; },
    want:(h,k,s)=>{ const t = bestTarget(h, 4 + (s.range||7)*s.area); return t ? {t} : null; }},
  'Carréllo': {tick:skDashTick, fire:(h,k,s,how)=>{ const st = skState(h,k); st.dash = {a:skAim(h, how), t:(s.range||11)/(22*s.speed), b:Math.max(1, s.n), hit:new Map(), dmg:s.dmg}; if(h.isPlayer) SFX.whoosh(); return true; },
    want:(h,k,s)=>{ const t = bestTarget(h, s.range||11); return t ? {t} : null; }},
  'Carrozza!': {tick:(h,k,s,dt,st)=>{ skDashTick(h, k, s, dt, st); const src = SK[SK[k].from]; if(!src) return; st.cT = (st.cT == null ? 1 : st.cT) - dt;
      if(st.cT <= 0 && !st.dash){ const R = src.ranks[src.ranks.length-1] || src.base, t = bestTarget(h, R[7]||11); if(t){ st.cT = (R[1]||5)*h.mods.cdr; st.dash = {a:Math.atan2(t.x-h.x, t.z-h.z), t:(R[7]||11)/22, b:Math.max(1, R[3]||2), hit:new Map(), dmg:(R[0]||10)*h.mods.dmg}; } else st.cT = 0.3; } },
    fire:(h,k,s)=>{ const z = h.z + (Math.random() < 0.5 ? -5 : 5), dir = Math.random() < 0.5 ? 1 : -1, x0 = dir > 0 ? BOUNDS.x0 : BOUNDS.x1, x1 = dir > 0 ? BOUNDS.x1 : BOUNDS.x0, W = 1.5*s.area;
      skBeam(x0, z, x1, z, W, skCol(k), 0.6); for(const e of ENEMY[h.team]) if(!e.dead && Math.abs(e.z - z) < W + (e.r||0.6)) skHit(h, e, s.dmg, k, {knock:6, fx:e.x - dir, fz:e.z}); addShake(0.4); SFX.boom(0.9); return true; }},
  'Song of Mana': {fire:(h,k,s)=>{ const W = 1.4*s.area, R = s.range||12; if(!ENEMY[h.team].some(e=>!e.dead && Math.abs(e.x-h.x) < W && Math.abs(e.z-h.z) < R)) return false;
      for(const e of ENEMY[h.team]) if(!e.dead && Math.abs(e.x-h.x) < W + (e.r||0.6)*0.6 && Math.abs(e.z-h.z) < R) skHit(h, e, s.dmg, k, {}); skBeam(h.x, h.z - R, h.x, h.z + R, W, skCol(k), Math.max(0.3, s.dur)); return true; }},
  'Clock Lancet': {fire:(h,k,s)=>{ const t = skRandomIn(h, s.range||12); if(!t) return false; const a = Math.atan2(t.x-h.x, t.z-h.z), R = s.range||12;
      for(const e of ENEMY[h.team]){ if(e.dead) continue; const px = e.x-h.x, pz = e.z-h.z, al = px*Math.sin(a) + pz*Math.cos(a), off = Math.abs(px*Math.cos(a) - pz*Math.sin(a)); if(al > 0 && al < R && off < 0.8 + (e.r||0.6)*0.6) hit(e, 0, h, {stun:Math.max(0.5, s.dur), freeze:true, el:'frost'}); }
      skBeam(h.x, h.z, h.x + Math.sin(a)*R, h.z + Math.cos(a)*R, 0.35, 0xbfeaff, 0.35); return true; }},
  Phas3r:      {fire:(h,k,s)=>skBands(h, k, s, 1)},
  Photonstorm: {fire:(h,k,s)=>{ let n = 1; for(let i=0;i<Math.min(5, s.n-1);i++) if(Math.random() < 0.5) n++; return skBands(h, k, s, n); }},
  Runetracer: {fire:(h,k,s)=>{ if(!countNear(h, h.x, h.z, 14)) return false; for(let i=0;i<s.n;i++) skShot(h, k, s, {ang:rnd(0,6.283), spd:12*s.speed, life:Math.max(0.5, s.dur), pierce:Infinity, rehit:0.4, bounce:true}); return true; }},
  'Unearthly Bolt': {fire:(h,k,s)=>{ const t = nearest(h, s.range||13); if(!t) return false; zapLine(h.x, h.z, t.x, t.z, skCol(k));
      if(Math.random() < Math.max(0.2, h.mods.crit*2)){ const R = 2.4*s.area; skArea(h, k, t.x, t.z, R, s.dmg*2, {}); elRing('shock', t.x, t.z, R, 0.35); } else skHit(h, t, s.dmg, k, {}); if(h.isPlayer) SFX.zap(); return true; }},
  'Ammo Appalate': {tick:(h,k,s,dt,st)=>{ st.ammo = st.ammo||0; st.shotT = (st.shotT||0) - dt; if(st.ammo <= 0 || st.shotT > 0) return;
      const a0 = h.face; let t = null, bd = s.range; for(const e of ENEMY[h.team]){ if(e.dead) continue; const d = hyp(e.x-h.x, e.z-h.z); if(d < bd && Math.abs(angDiff(a0, Math.atan2(e.x-h.x, e.z-h.z))) < 1.2){ bd = d; t = e; } }
      if(!t) return; st.shotT = 0.12; st.ammo--; skShot(h, k, s, {tg:t, home:t, spd:SK_PS*1.4*s.speed, life:s.range/(SK_PS*1.4*s.speed)*1.6}); },
    fire:(h,k,s)=>{ const st = skState(h,k); st.ammo = Math.min(s.n*3, (st.ammo||0) + s.n); return true; }},
  Gunastrophe: {tick:(h,k,s,dt,st)=>{ if(!(st.spree > 0)) return; st.spree -= dt; st.shotT = (st.shotT||0) - dt; if(st.shotT > 0) return; st.shotT = 0.1;
      for(let i=0;i<s.n;i++){ const t = skRandomIn(h, s.range); if(!t) return; skShot(h, k, s, {ang:Math.atan2(t.x-h.x, t.z-h.z) + rnd(-0.25,0.25), spd:SK_PS*1.4*s.speed, life:s.range/(SK_PS*1.4*s.speed)*1.2, pierce:1}); } },
    fire:(h,k,s)=>{ if(!countNear(h, h.x, h.z, s.range)) return false; skState(h,k).spree = Math.max(0.5, s.dur); return true; }}};
function skSparks(h, k, s){ const t = skRandomIn(h, s.range); if(!t) return false; const a = Math.atan2(t.x-h.x, t.z-h.z), sp = 26*s.speed; skPop(h, k, a, 0.5);
  for(let i=0;i<s.n;i++) skShot(h, k, s, {kind:'spark', ang:a + (i-(s.n-1)/2)*0.12, spd:sp, life:Math.max(0.4, s.dur)}); if(h.isPlayer) SFX.zap(); return true; }
function skRicochet(p, e){ let best = null, bd = 9; for(const q of ENEMY[p.h.team]){ if(q===e || q.dead) continue; const d = hyp(q.x-p.x, q.z-p.z); if(d < bd && (p.hits.get(q)||0) <= gt){ bd = d; best = q; } }
  const sp = hyp(p.vx, p.vz), a = best ? Math.atan2(best.x-p.x, best.z-p.z) : Math.atan2(-p.vx, -p.vz) + rnd(-1,1); p.vx = Math.sin(a)*sp; p.vz = Math.cos(a)*sp; }
// horizontal laser bands centred on enemies (Phas3r / Photonstorm)
function skBands(h, k, s, n){ const L = skRandomN(h, s.range||12, n); if(!L.length) return false; const R = s.range||12, W = 0.8*s.area;
  L.forEach((t, i)=>skLater(h, i*0.12, ()=>{ const z = t.z; for(const e of ENEMY[h.team]) if(!e.dead && Math.abs(e.z - z) < W + (e.r||0.6)*0.6 && Math.abs(e.x - t.x) < R) skHit(h, e, s.dmg, k, {});
    skBeam(t.x - R, z, t.x + R, z, W, pick([0xff4fb8, 0x41e4ff, 0xffe14d, 0x7cff8a]), 0.3); })); if(h.isPlayer) SFX.zap(); return true; }

// ---------- running them ----------
function skRunPassive(h, k, dt){ const S = SK[k], M = SKF[S.vs]; if(!M) return; const s = skStats(h, k), st = skState(h, k); if(h.cd[k] == null) h.cd[k] = 0.4;
  if(M.tick) M.tick(h, k, s, dt, st);
  if(M.fire && h.cd[k] <= 0 && h.stunT <= 0) h.cd[k] = M.fire(h, k, s, 'passive') ? s.cd + (M.cdAdd ? M.cdAdd(s) : 0) : 0.2; }
function skTickActive(h, k, dt){ const M = SKF[SK[k].vs]; if(M && M.tick) M.tick(h, k, skStats(h, k), dt, skState(h, k)); }
function skFire(h, k, how){ const M = SKF[SK[k].vs]; return !!(M && M.fire && M.fire(h, k, skStats(h, k), how)); }
function skWant(h, k){ const M = SKF[SK[k].vs], s = skStats(h, k); if(M && M.want) return M.want(h, k, s); const t = bestTarget(h, s.range || 10); return t ? {t} : null; }
for(const S of SKILLDATA) if(S.side==='act') AUTO[S.id] = h => skWant(h, S.id);
// remove an ability's lasting pieces (rings, orbiters, critters, crumbs) — on swap, evolution, death or the end of a run
function skClear(h, k){ const st = h.sk && h.sk[k]; if(!st) return;
  const drop = m => { if(!m) return; if(m.userData && m.userData.type) skCritterFree(m); else scene.remove(m); };
  for(const v of Object.values(st)){ if(v && v.isObject3D) drop(v); else if(Array.isArray(v)) v.forEach(x=>{ if(x && x.isObject3D) drop(x); else if(x && x.m && x.m.isObject3D) drop(x.m); }); }
  delete h.sk[k]; }
function skHide(h){ if(!h.sk) return; for(const st of Object.values(h.sk)) for(const v of Object.values(st)){ if(v && v.isObject3D) v.visible = false; else if(Array.isArray(v)) v.forEach(x=>{ if(x && x.isObject3D) x.visible = false; else if(x && x.m) x.m.visible = false; }); } }
function skClearAll(){ for(const h of HEROES) if(h.sk) for(const k of Object.keys(h.sk)) skClear(h, k);
  SKP.forEach(p=>{ if(p.m.userData.type) skCritterFree(p.m); else scene.remove(p.m); }); SKP.length = 0; SKZ.forEach(Z=>{ scene.remove(Z.m); Z.m.material.dispose(); }); SKZ.length = 0;
  SKPET.forEach(P=>skCritterFree(P.m)); SKPET.length = 0; SKFX.forEach(f=>{ if(f.critter) skCritterFree(f.m); else { scene.remove(f.m); if(f.fade) f.m.material.dispose(); } }); SKFX.length = 0; SKQ.length = 0; SKBURN.length = 0; }
// every frame (main.js update): queued shots, projectiles, zones, pets, fading beams, burns
function skUpdate(dt){
  for(let i=SKQ.length-1;i>=0;i--){ const q = SKQ[i]; q.t -= dt; if(q.t <= 0){ SKQ.splice(i,1); if(!q.h.dead) q.fn(); } }
  skShots(dt); skZones(dt); skPets(dt);
  for(let i=SKFX.length-1;i>=0;i--){ const f = SKFX[i]; f.life -= dt;
    if(f.critter){ f.m.position.y = floorY(f.x, f.z) + Math.max(0, Math.sin((1 - f.life/f.max)*Math.PI))*0.35; if(f.life <= 0){ burst(f.x, 0.8, f.z, 0xffffff, 6, 3, 6, 0.25); skCritterFree(f.m); SKFX.splice(i,1); } continue; }
    if(f.fade) f.m.material.opacity = 0.8*Math.max(0, f.life/f.max); if(f.life <= 0){ scene.remove(f.m); if(f.fade) f.m.material.dispose(); SKFX.splice(i,1); } }
  for(let i=SKBURN.length-1;i>=0;i--){ const b = SKBURN[i]; b.t -= dt; if(b.e.dead || b.t <= 0){ SKBURN.splice(i,1); continue; } hit(b.e, b.dps*dt, b.h, {el:'fire'}); if(Math.random() < 0.1) burst(b.e.x, 1, b.e.z, EL.fire.col, 1, 2, -2, 0.4); }
  for(const h of HEROES) if(h.dead) skHide(h); }

// ---------- level-ups: boosts, evolutions, stones ----------
// what an evolution needs, read from its evolveNeeds text: abilities at max rank, boosts held / maxed, a character level
function skNeeds(S){ if(S._need) return S._need; const txt = (S.needs||'').split(', then')[0].split(' (VS')[0], parts = txt.split(' + '), ids = s => (s.match(/[a-z]+_[a-z]_[a-z_]+/g)||[]).filter(i=>SK[i]);
  const need = {max:ids(parts[0]), held:[], maxB:[], lvl:0};
  for(const p of parts.slice(1)){ const m = p.match(/character level (\d+)/); if(m){ need.lvl = +m[1]; continue; } for(const i of ids(p)) (/max rank/.test(p) ? need.maxB : need.held).push(i); }
  return S._need = need; }
function skEvos(h){ const out = []; for(const id in SK){ const S = SK[id]; if(S.tier !== 'mythic' || ABIL[id].who !== h.char || skHeld(h, id) || !skHeld(h, S.from)) continue; const N = skNeeds(S);
    if(N.max.every(i=>skMaxed(h, i)) && N.held.every(i=>skHeld(h, i)) && N.maxB.every(i=>skMaxed(h, i)) && h.level >= N.lvl) out.push({kind:'evo', k:id, from:S.from, w:0}); } return out; }
function skEvolve(h, o){ const S = SK[o.k], F = ABIL[S.from], list = h.act.includes(S.from) ? h.act : h.pas, i = list.indexOf(S.from); if(i < 0) return;
  skClear(h, S.from); delete h.rank[S.from]; list[i] = o.k; h.rank[o.k] = 0; h.cd[o.k] = 0.3;
  if(S.vs === 'Vandalier') for(const other of skNeeds(S).max) if(other !== S.from){ const L2 = h.act.includes(other) ? h.act : h.pas, j = L2.indexOf(other); if(j >= 0){ skClear(h, other); L2[j] = null; delete h.rank[other]; } }   // the two birds merge into one slot
  if(h.isPlayer){ big('EVOLVED: '+ABIL[o.k].name.toUpperCase(), 1800); screenFlash(hexc(skCol(o.k)), 0.7); confetti(120); toast(null, `${F.name} evolved into its mythic. Mythics don't rank up — a stone can be set in it.`, 4200); } }
// called from randomOffers (abilities.js): the shared boosts (no slot needed) join the pool; a stone shows up for an unstoned mythic
function skOffers(h, c){ const bl = h.bufl || [];
  if(bl.length < 6) for(const id in SK){ const S = SK[id]; if(S.side==='buff' && !bl.includes(id)) c.push({kind:'buff', k:id, w:S.tier==='rare' ? 0.5 : 0.9}); } }
function skStoneOffer(h){ const mine = [...h.act, ...h.pas].filter(k=>k && SK[k] && SK[k].tier==='mythic' && !(h.stone && h.stone[k])); if(!mine.length) return null; return {kind:'stone', k:pick(mine), el:pick(Object.keys(SK_STONE))}; }
// the card text for a level-up offer
function skDelta(S, r){ const a = r ? S.ranks[r-1] : S.base, b = S.ranks[r]; if(!b) return 'Maxed.'; const out = [];
  if(S.beh==='buff'){ SK_KEYS.forEach((key, i)=>{ const y = b[i]; if(y == null) return; const lab = {dmg:'Damage', cd:'Cooldowns', area:'Area', speed:'Projectile speed', duration:'Effect time', amount:'Projectiles'}[key] || key;
      out.push(key==='amount' ? `${lab} +${y} in total` : `${lab} ${y > 0 ? '+' : ''}${Math.round(y*100)}% in total`); }); return out.join(' · '); }
  SK_KEYS.forEach((key, i)=>{ const x = a[i], y = b[i]; if(x === y || y == null) return;
    if(key==='dmg') out.push(`damage ${x} → ${y}`); else if(key==='cd') out.push(`every ${x} s → ${y} s`); else if(key==='area' || key==='speed') out.push(`${key==='area' ? 'area' : 'speed'} +${Math.round((y/(x||1) - 1)*100)}%`);
    else if(key==='amount') out.push(`${y - x > 0 ? '+' : ''}${y - x} more (${y} total)`); else if(key==='pierce') out.push(`goes through ${y} enemies`); else if(key==='duration') out.push(`lasts ${x} s → ${y} s`); else out.push(`range ${y} m`); });
  const t = out.join(' · ') || 'stronger'; return t[0].toUpperCase() + t.slice(1) + '.'; }
function skOfferInfo(o, h){
  if(o.kind==='stone'){ const A = ABIL[o.k]; return {k:`STONE · sets into ${A.name}`, n:SK_STONE_N[o.el], d:SK_STONE[o.el], ic:'💎', el:o.el, badge:'STONE'}; }
  const A = ABIL[o.k]; if(!A || !A.sk) return null; const S = A.sk, tier = S.tier.toUpperCase();
  if(o.kind==='ab'){ const slot = (A.side==='act' ? h.act : h.pas).indexOf(null); return {k:`${tier} · ${A.side==='pas' ? 'PASSIVE · fights by itself' : 'ACTIVE · '+(isMobile ? 'button ' : '')+KEYLAB[slot]}`, n:A.name, d:S.text, ic:A.ic, el:A.el, badge:'NEW'}; }
  if(o.kind==='rank'){ const r = h.rank[o.k]||0; return {k:`LEVEL ${r+2} OF ${S.max+1}`, n:`${A.name} ${r+2}`, d:skDelta(S, r), ic:A.ic, el:A.el, badge:'+'+(r+1)}; }
  if(o.kind==='buff') return {k:`${tier} · BOOST · needs no slot`, n:A.name, d:S.text, ic:A.ic, el:A.el, badge:'NEW'};
  if(o.kind==='evo'){ const F = ABIL[o.from]; return {k:`EVOLUTION · ${F.name.toUpperCase()} GOES MYTHIC`, n:A.name, d:S.text, ic:A.ic, el:A.el, badge:'MYTHIC'}; }
  return null; }
