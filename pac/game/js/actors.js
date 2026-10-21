// PAC v0.7 — actors.js: effects, heroes (Blender rigs), clubgoers, ghosts (temperaments + packs), gems, blue orb,
// Ball Boy's creatures (shared by the player and the boss), and the BALL BOY boss.
"use strict";
let MODELS = null;   // filled by LOOK.loadAll()

// ================= EFFECTS =================
const PMAX = 3600; let parts, pGeo, pPos, pCol, PART = [], pNext = 0;
function buildFx(){ pGeo = new THREE.BufferGeometry(); pPos = new Float32Array(PMAX*3); pCol = new Float32Array(PMAX*3);
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos,3)); pGeo.setAttribute('color', new THREE.BufferAttribute(pCol,3));
  parts = new THREE.Points(pGeo, new THREE.PointsMaterial({size:0.55, vertexColors:true, map:glowTex, transparent:true, blending:THREE.AdditiveBlending, depthWrite:false})); parts.frustumCulled = false; scene.add(parts);
  for(let i=0;i<PMAX;i++) PART.push({life:0}); }
function burst(x,y,z,color,n=14,spd=7,grav=14,life=0.5){ const c = new THREE.Color(color);
  for(let i=0;i<n;i++){ const p = PART[pNext]; pNext = (pNext+1)%PMAX; const a = Math.random()*6.28, u = Math.random()*2-1, s = spd*(0.4+Math.random()*0.8), q = Math.sqrt(1-u*u);
    Object.assign(p, {x,y,z, vx:Math.cos(a)*q*s, vy:Math.abs(u)*s*0.8+2, vz:Math.sin(a)*q*s, life:life*(0.8+Math.random()*0.7), r:c.r*1.6, g:c.g*1.6, b:c.b*1.6, grav}); } }
function spray(x,z,ang,range,arc,color,n,y=0.9){ const c = new THREE.Color(color);
  for(let i=0;i<n;i++){ const p = PART[pNext]; pNext = (pNext+1)%PMAX; const a = ang + (Math.random()-.5)*arc, s = range*rnd(2.2,3.4);
    Object.assign(p, {x, y, z, vx:Math.sin(a)*s, vy:rnd(0,1.2), vz:Math.cos(a)*s, life:0.32, r:c.r*1.6, g:c.g*1.6, b:c.b*1.6, grav:2}); } }
function puff(x,y,z,color,n=6,spread=1.2){ const c = new THREE.Color(color); for(let i=0;i<n;i++){ const p = PART[pNext]; pNext = (pNext+1)%PMAX;
  Object.assign(p, {x:x+rnd(-spread,spread), y:y+rnd(0,spread*0.6), z:z+rnd(-spread,spread), vx:rnd(-0.6,0.6), vy:rnd(0.3,1.2), vz:rnd(-0.6,0.6), life:rnd(0.6,1.1), r:c.r, g:c.g, b:c.b, grav:-0.4}); } }
const FX = [];
function ringFx(x, z, r, color, life=0.45, y=0.25){ const m = new THREE.Mesh(new THREE.RingGeometry(0.85,1,56), new THREE.MeshBasicMaterial({color:new THREE.Color(color).multiplyScalar(1.6), transparent:true, opacity:0.9, blending:THREE.AdditiveBlending, side:THREE.DoubleSide, depthWrite:false}));
  m.rotation.x = -Math.PI/2; m.position.set(x,y,z); scene.add(m); FX.push({m, mat:m.material, t:0, life, r0:0.5, r1:r}); }
function discFx(x, z, r, color, life=0.3){ const m = new THREE.Mesh(new THREE.CircleGeometry(1,40), new THREE.MeshBasicMaterial({color:new THREE.Color(color).multiplyScalar(1.3), transparent:true, opacity:0.5, blending:THREE.AdditiveBlending, side:THREE.DoubleSide, depthWrite:false}));
  m.rotation.x = -Math.PI/2; m.position.set(x,0.2,z); m.scale.setScalar(r); scene.add(m); FX.push({m, mat:m.material, t:0, life, fan:true, o0:0.5}); }
// a flat fan (attack cone) on the floor; angle convention: 0 = +z, atan2(x,z)
function fanFx(x, z, ang, range, arc, color, life=0.22, o0=0.55){ const m = new THREE.Mesh(new THREE.CircleGeometry(range, 28, -arc/2, arc), new THREE.MeshBasicMaterial({color:new THREE.Color(color).multiplyScalar(1.4), transparent:true, opacity:o0, blending:THREE.AdditiveBlending, side:THREE.DoubleSide, depthWrite:false}));
  const g = new THREE.Group(); m.rotation.x = -Math.PI/2; m.rotation.z = -Math.PI/2; g.add(m); g.rotation.y = ang; g.position.set(x, 0.3, z); scene.add(g); FX.push({m:g, mat:m.material, t:0, life, fan:true, o0}); return g; }
const ZAPS = [];
function zapLine(x0,z0,x1,z1,col,y=1.2){ const pts = []; for(let i=0;i<=8;i++){ const f = i/8, j = i&&i<8; pts.push(new THREE.Vector3(x0+(x1-x0)*f+(j?(Math.random()-.5)*1.2:0), y+(j?Math.random()*0.6:0), z0+(z1-z0)*f+(j?(Math.random()-.5)*1.2:0))); }
  const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({color:new THREE.Color(col).multiplyScalar(1.8), transparent:true, opacity:1, blending:THREE.AdditiveBlending})); scene.add(l); ZAPS.push({l, life:0.18}); burst(x1,y,z1,col,5,4); }
function updateFx(rdt, pdt){
  for(let i=0;i<PMAX;i++){ const p = PART[i]; if(p.life > 0){ p.life -= pdt; p.vy -= p.grav*pdt; p.x += p.vx*pdt; p.y = Math.max(0.05, p.y + p.vy*pdt); p.z += p.vz*pdt;
      pPos[i*3] = p.x; pPos[i*3+1] = p.y; pPos[i*3+2] = p.z; const f = Math.min(1, Math.max(0, p.life*2)); pCol[i*3] = p.r*f; pCol[i*3+1] = p.g*f; pCol[i*3+2] = p.b*f; } else pPos[i*3+1] = -50; }
  pGeo.attributes.position.needsUpdate = true; pGeo.attributes.color.needsUpdate = true;
  for(let i=FX.length-1;i>=0;i--){ const f = FX[i]; f.t += pdt; const k = f.t/f.life; if(f.fan) f.mat.opacity = (f.o0||0.55)*(1-k); else { f.m.scale.setScalar(f.r0 + (f.r1-f.r0)*(1-Math.pow(1-k,2))); f.mat.opacity = Math.max(0, 0.9*(1-k)); } if(k >= 1){ scene.remove(f.m); FX.splice(i,1); } }
  for(let i=ZAPS.length-1;i>=0;i--){ const z = ZAPS[i]; z.life -= pdt; z.l.material.opacity = Math.max(0, z.life/0.18); if(z.life <= 0){ scene.remove(z.l); ZAPS.splice(i,1); } }
}
let shake = 0; const addShake = s => { shake = Math.min(1.1, shake + s); };
// damage numbers: summed per target, a few times a second
const DN = []; function buildDn(){ for(let i=0;i<40;i++){ const d = document.createElement('div'); d.className = 'dn'; d.style.display = 'none'; $('dmg').appendChild(d); DN.push({el:d, life:0}); } } let dnNext = 0;
function showDn(x,z,v,crit,me){ const D = DN[dnNext]; dnNext = (dnNext+1)%DN.length; D.x = x+rnd(-0.4,0.4); D.z = z; D.y = 2.2; D.life = 0.85; D.el.textContent = Math.round(v); D.el.className = 'dn'+(crit?' crit':'')+(me?' me':''); D.el.style.display = 'block'; }
const addDn = (e, v, crit) => { e.dnAcc = (e.dnAcc||0) + v; if(crit) e.dnCrit = true; };
function flushDn(list, me){ for(const e of list){ if(e.dnAcc > 0.5 && gt - (e.dnT||0) > 0.25){ showDn(e.x, e.z, e.dnAcc, e.dnCrit, me); e.dnAcc = 0; e.dnCrit = false; e.dnT = gt; } } }
function updateDn(rdt){ for(const D of DN){ if(D.life <= 0) continue; D.life -= rdt; D.y += rdt*1.5; const [sx, sy, f] = project(D.x, D.y, D.z); D.el.style.left = sx+'px'; D.el.style.top = sy+'px'; D.el.style.opacity = clamp(D.life*2, 0, 1); if(D.life <= 0 || !f) D.el.style.display = 'none'; } }

// ================= HEROES (player + PvP bots) — Blender rigs =================
let HEROES = []; const player = () => HEROES[0]; let heroId = 0;
const CHARS = {
  pac:{name:'Pac', sub:'Original Pac', desc:'Balanced, strong and tough. Eats everything.', hp:110, speed:6.4, r:0.6, move:'backdoor', start:null, loadout:true,
    pools:{passive:['poop','spit','prickly'], def:['glove','bang','flop'], off:['balls','gob','farts']}},
  ballboy:{name:'Ball Boy', sub:'The Trainer', desc:'Throws capsule balls. A creature pops out, does one move, and comes back.', hp:95, speed:6.6, r:0.45, move:'peaceout', start:{passive:'sleepover', def:'rockbottom', off:'hottake'}, loadout:false}};
function makeRig(char, team){ const r = LOOK.character(MODELS, char==='pac'?'pac':'ballboy', team===1 ? {tint:0x7a3a3a, tintMat:char==='pac'?'pac_cap':'jacket'} : {}); return r; }
function newHero(char, team, isPlayer, x, z){
  const C = CHARS[char];
  const h = {kind:'hero', id:heroId++, char, team, isPlayer, x, z, vx:0, vz:0, face:Math.PI, walk:0, ax:0, az:-1, r:C.r, maxhp:C.hp, hp:C.hp, energy:100, maxEnergy:100,
    level:0, xp:0, moveOk:false, moveCd:0, iframes:0, shieldHP:0, shieldT:0, absorbed:0, grow:1, slots:{passive:null, def:null, off:null}, rank:{}, micro:{},
    mods:{dmg:1, area:1, cdr:1, speed:1, pickup:1, regen:1, armor:0, crit:0.05, hpRegen:0.4}, cd:{}, buff:{}, dead:false, respawnT:0, kills:0, deaths:0,
    stunT:0, slowT:0, hopT:0, hopY:0, hop:null, ballT:0, sugarT:0, lungeT:0, dashT:0, dash:null, hurtT:0, ai:{}, fx:{}, throwT:0, kvx:0, kvz:0, name:C.name, grace:0};
  if(C.start) Object.assign(h.slots, C.start);
  h.rig = makeRig(char, team); scene.add(h.rig.root);
  h.ring = new THREE.Mesh(new THREE.RingGeometry(0.8, 1.0, 40), new THREE.MeshBasicMaterial({color:isPlayer?0xf6dc95:(team===0?0x41e4ff:0xff4a4a), transparent:true, opacity:0.6, blending:THREE.AdditiveBlending, side:THREE.DoubleSide, depthWrite:false}));
  h.ring.rotation.x = -Math.PI/2; h.ring.position.y = 0.05; h.rig.root.add(h.ring);
  h.bubble = new THREE.Mesh(new THREE.SphereGeometry(1.35, 24, 16), new THREE.MeshStandardMaterial({color:0xff8ad0, emissive:0x501030, transparent:true, opacity:0.28, roughness:0.1, metalness:0.2, depthWrite:false}));
  h.bubble.position.y = 1; h.bubble.visible = false; h.rig.root.add(h.bubble);
  h.spikes = []; for(let i=0;i<2;i++){ const g = new THREE.Group(); const s = new THREE.Mesh(new THREE.ConeGeometry(0.2, 1, 7), LOOK.hatchMat(0xe8e2d0)); s.rotation.x = Math.PI/2; g.add(s); g.visible = false; scene.add(g); h.spikes.push(g); }
  return h;
}
// animate a Blender rig: rest pose + swings
function animRig(rig, x, z, face, spd, walk, grow, extra={}){
  const B = rig.bones, k = Math.min(1, spd/6), R = n => B[n] && B[n].userData.rest;
  rig.root.position.set(x, extra.y||0, z); rig.root.rotation.y = face; rig.root.scale.setScalar(grow*(extra.scale||1));
  const sw = Math.sin(walk);
  if(B.legL){ B.legL.rotation.x = sw*0.75*k; B.legR.rotation.x = -sw*0.75*k; }
  if(B.armL){ B.armL.rotation.x = -sw*0.65*k + (extra.armsUp?-2.6:0); B.armR.rotation.x = sw*0.65*k + (extra.armsUp?-2.6:0); B.armL.rotation.z = -0.12; B.armR.rotation.z = 0.12; }
  if(extra.throwT > 0 && B.armR) B.armR.rotation.x = -2.7 + (0.35-extra.throwT)*7;
  if(B.body && R('body')){ B.body.position.y = R('body').p.y + Math.abs(Math.sin(walk))*0.06*k + (extra.bounce||0); B.body.rotation.x = 0.1*k; B.body.rotation.z = Math.sin(walk*0.5)*0.04*k; }
  if(rig.kind==='pac' && B.jawU){ const open = 0.05 + (0.5+0.5*Math.sin(rtime*16))*(spd>0.5||extra.chomp?0.55:0.1) + (extra.chomp?0.25:0); B.jawU.rotation.x = -open; B.jawL.rotation.x = open*0.55; }
  if(rig.kind==='bb' && B.head) B.head.rotation.y = Math.sin(rtime*0.7)*0.18;
  if(rig.auraPulse) rig.auraPulse.material.opacity = 0.32 + 0.18*Math.sin(rtime*5);
  const fl = extra.flash ? 0.55 : 0; for(const m of rig.mats) m.uniforms.uFlash.value = fl;
}
// gear: crude = matte, quality = glossy, epic = radiating. Sized from the rig's proportions; hung on anchors.
const TIERS = {crude:{tint:0x6b6458, gloss:0, emit:0, aura:null}, quality:{tint:0x8c96a8, gloss:0.85, emit:0, aura:null}, epic:{tint:0xc9a24a, gloss:1, emit:0x2a1800, aura:0xffb627}};
function equipSet(rig, tier){
  (rig.gear||[]).forEach(o=>o.parent && o.parent.remove(o)); rig.gear = []; rig.auraPulse = null; if(!tier || !rig) return;
  const T = TIERS[tier], p = rig.p, A = rig.anchors, M = LOOK.hatchMat(T.tint, {gloss:T.gloss, emit:T.emit}), hr = p.headR;
  const add = (a,o)=>{ if(A[a]){ A[a].add(o); rig.gear.push(o); } };
  const helm = LOOK.inked(new THREE.SphereGeometry(hr*1.1,24,12,0,Math.PI*2,0,Math.PI*0.34), M, 0.03); helm.position.y = rig.kind==='pac'?0.03:0.06; add('headpiece', helm);
  for(const k of ['L','R']){ const boot = LOOK.inked(new THREE.CylinderGeometry(p.legLen*0.24, p.legLen*0.28, p.legLen*0.45, 12), M, 0.025); boot.position.y = p.legLen*0.25; add('boot'+k, boot);
    const gl = LOOK.inked(new THREE.CylinderGeometry(0.11, 0.13, 0.16, 12), M, 0.02); gl.position.y = 0.1; add('glove'+k, gl); }
  const L = p.armLen*2.1, blade = new THREE.Group(); const b = LOOK.inked(new THREE.BoxGeometry(0.08, L, 0.03), M, 0.025); b.position.y = L*0.55; blade.add(b);
  const hilt = LOOK.inked(new THREE.BoxGeometry(0.32, 0.06, 0.06), LOOK.hatchMat(0x4a3a2a), 0.02); hilt.position.y = L*0.06; blade.add(hilt); blade.rotation.x = Math.PI/2.3; add('weaponR', blade);
  if(T.aura){ const a = glow(T.aura, 4.2, 0.45); add('chest', a); rig.auraPulse = a; b.add(at(glow(T.aura, 1.8, 0.9), 0, L*0.5, 0)); }
}

// ================= CLUBGOERS (Blender crowd, instanced per look) =================
const CIV_KINDS = ['raver','dancer','bouncer','bro'], CIVMAX = 50; const CIVM = {}; let CIV = [];
function buildCrowd(){ for(const k of CIV_KINDS){ const src = LOOK.rawPiece(MODELS, 'crowd', 'crowd.'+k); if(!src) continue; const g = LOOK.mergeColored(src);
  const body = new THREE.InstancedMesh(g, LOOK.hatchMat(0xffffff, {vertexColors:true}), CIVMAX), out = new THREE.InstancedMesh(g, LOOK.outlineMat(0.022), CIVMAX);
  initColors(body, CIVMAX); [body, out].forEach(m=>{ m.frustumCulled = false; m.count = 0; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(m); }); CIVM[k] = {body, out}; } }
function seedCivilians(){ CIV = []; const spots = [[0,32,8],[16,10,5],[-14,12,4],[0,-35,14],[-14,-20,8],[14,-60,10],[-12,-80,6],[-12,-140,6],[10,-170,6],[0,-230,6],[-8,-265,5]];
  for(const [cx,cz,n] of spots) for(let i=0;i<n;i++){ const x = cx+rnd(-8,8), z = cz+rnd(-8,8); if(blocked(x,z,0.6) || !inLane(x,z)) continue;
    const kind = cz > 30 && i < 2 ? 'bouncer' : pick(['raver','dancer','bro','raver','dancer']);
    CIV.push({x, z, hx:x, hz:z, ph:Math.random()*6, kind, sp:rnd(3.2,4.4), panic:0, hp:8, face:rnd(0,6.28), tint:rnd(0.85,1.1)}); } }
function killCiv(i, h){ const c = CIV[i]; burst(c.x, 1, c.z, 0xff4060, 18, 7); CIV.splice(i,1); if(h && h.isPlayer){ ST.civ++; } }
function renderCrowd(rtNow, onBeat){
  const n = {}; for(const k of CIV_KINDS) n[k] = 0;
  for(const c of CIV){ const M = CIVM[c.kind]; if(!M) continue; const i = n[c.kind]++; if(i >= CIVMAX) continue; const panic = c.panic > 0;
    const bob = panic ? Math.abs(Math.sin(c.ph*2.4))*0.18 : Math.abs(Math.sin(c.ph + (onBeat?0.4:0)))*0.12;
    dummy.position.set(c.x, bob, c.z); dummy.rotation.set(panic?0.25:0, c.face + (panic?0:Math.sin(c.ph*0.5)*0.5), panic?0:Math.sin(c.ph)*0.08); dummy.scale.set(1, 1 - (panic?0:Math.sin(c.ph*2)*0.03), 1); dummy.updateMatrix();
    M.body.setMatrixAt(i, dummy.matrix); M.out.setMatrixAt(i, dummy.matrix); tmpC.setRGB(c.tint, c.tint, c.tint); M.body.setColorAt(i, tmpC); }
  for(const k of CIV_KINDS){ const M = CIVM[k]; if(!M) continue; M.body.count = M.out.count = Math.min(CIVMAX, n[k]); M.body.instanceMatrix.needsUpdate = M.out.instanceMatrix.needsUpdate = true; M.body.instanceColor.needsUpdate = true; }
}

// ================= GHOSTS: 7 colours (7 stats), four temperaments, packs =================
const GHOST_TYPES = {
  red:{stat:'Strength', col:0xc0453f, bonus:'dmg', label:'+25% damage'}, green:{stat:'Agility', col:0x4aa860, bonus:'speed', label:'+30% speed'},
  blue:{stat:'Spirit', col:0x4a7fd0, bonus:'energy', label:'energy refill'}, purple:{stat:'Intellect', col:0x8a5ac8, bonus:'xp', label:'double XP'},
  orange:{stat:'Speciality', col:0xd88a3a, bonus:'cd', label:'faster abilities'}, teal:{stat:'Nature', col:0x3aa8a0, bonus:'magnet', label:'big pickup range'},
  black:{stat:'Vitality', col:0x3a3a44, bonus:'heal', label:'heal'}};
const COLOUR_ORDER = ['red','green','blue','purple','orange','teal','black'], COLOUR_LV = [1,2,3,4,6,8,10];
const TEMPER = ['chaser','ambusher','flanker','wildcard'];
const GMAX = 260; let ghostM, ghostO, eyesM, G = []; const debuted = new Set();
function buildGhosts(){ const body = LOOK.rawPiece(MODELS,'ghost','ghost.body'), eyes = LOOK.rawPiece(MODELS,'ghost','ghost.eyes');
  const gb = LOOK.mergeColored(body), ge = LOOK.mergeColored(eyes);
  ghostM = new THREE.InstancedMesh(gb, LOOK.hatchMat(0xffffff, {vertexColors:true, density:1.1}), GMAX); ghostO = new THREE.InstancedMesh(gb, LOOK.outlineMat(0.04), GMAX);
  eyesM = new THREE.InstancedMesh(ge, new THREE.MeshBasicMaterial({vertexColors:true}), GMAX); initColors(ghostM, GMAX);
  [ghostM, ghostO, eyesM].forEach(m=>{ m.frustumCulled = false; m.count = 0; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(m); }); }
function ghostHP(isBig){ const P0 = player(), lv = MODE==='endless' ? Math.max(P0.level, wave*2) : P0.level, D = diff(); return (isBig ? 60+lv*16 : 7+lv*2.4) * D.hp * (MODE==='endless' ? 1+wave*0.12 : 1); }
function spawnGhost(type, isBig=false, at2=null, temper){
  if(G.length >= GMAX) return null; const P0 = player(); let x, z, n = 0;
  if(at2){ x = at2[0]; z = at2[1]; }
  else do { const a = Math.random()*6.283, d = rnd(22, 32); x = P0.x + Math.cos(a)*d; z = P0.z + Math.sin(a)*d*0.85 - 6; n++; } while((!inLane(x,z) || blocked(x,z,0.8) || (MODE==='campaign' && !gateOpen && z < STAGE_Z+2)) && n < 30);
  if(n >= 30) return null;
  const lv = P0.level, g = {kind:'ghost', id:(spawnGhost.n=(spawnGhost.n||0)+1), x, z, type, big:isBig, scale:isBig?2.3:1, r:isBig?1.3:0.6, hp:ghostHP(isBig), sp:(isBig?1.7:rnd(2.0,2.6))+Math.min(lv,15)*0.05,
    bob:Math.random()*6, hitT:0, slowT:0, stunT:0, kvx:0, kvz:0, dead:false, temper:temper||pick(TEMPER), mode:'chase', modeT:rnd(4,8), lungeT:0, lungeCd:rnd(2,5), face:0};
  g.maxhp = g.hp; G.push(g);
  if(isBig){ burst(x,1.5,z,GHOST_TYPES[type].col,40,10); if(MODE!=='pvp') toast('learn:big'+type, `A BIG ${type.toUpperCase()} ghost. Beat it and its colour joins the swarm. Its drop: ${GHOST_TYPES[type].label}.`); }
  return g;
}
function spawnPack(n, cols){ const P0 = player(); let cx, cz, tries = 0; // a pack enters together from just off-screen
  do { const a = rnd(0, 6.283), d = rnd(24, 30); cx = P0.x + Math.cos(a)*d; cz = P0.z + Math.sin(a)*d*0.85 - 8; tries++; } while((!inLane(cx,cz) || blocked(cx,cz,1) || (MODE==='campaign' && !gateOpen && cz < STAGE_Z+2)) && tries < 30);
  if(tries >= 30) return; for(let i=0;i<n;i++) spawnGhost(pick(cols), false, [clamp(cx+rnd(-3,3), BOUNDS.x0+2, BOUNDS.x1-2), cz+rnd(-3,3)], TEMPER[i%4]); }
let eatChain = 0;
function killGhost(g, h, eaten){
  if(g.dead) return; g.dead = true; const T = GHOST_TYPES[g.type];
  burst(g.x, 1, g.z, T.col, g.big?60:16, g.big?12:8); puff(g.x, 1, g.z, 0xffffff, 3, 0.6); if(g.big) addShake(0.4);
  GEMS.push({x:g.x, z:g.z, type:g.type, xp:g.big?14:2, bonus:g.big || Math.random()<0.1, t:0});
  if(g.big) debuted.add(g.type);
  if(h && h.isPlayer){ ST.ghosts++; addScore(g.big?600:40); if(eaten){ eatChain = Math.min(eatChain*2||200, 1600); addScore(eatChain); big(eatChain+'', 500, 'small'); SFX.eatGhost(Math.log2(eatChain/200)); if(Math.random()<0.3) heroSay(h,'ghostEat'); } }
}
// ghost brains: where does this ghost want to go?
function ghostTarget(g, P){
  if(g.temper === 'ambusher'){ const fx = P.vx*1.2 + Math.sin(P.face)*5, fz = P.vz*1.2 + Math.cos(P.face)*5; return [P.x+fx, P.z+fz]; }
  if(g.temper === 'flanker'){ const side = (g.id||0)%2 ? 1 : -1, px = -Math.cos(P.face)*6*side, pz = Math.sin(P.face)*6*side; return [P.x+px, P.z+pz]; }
  if(g.temper === 'wildcard' && g.mode === 'scatter'){ return [g.sx, g.sz]; }
  return [P.x, P.z];
}
function steer(g, tx, tz, s, dt){ // move toward a target, sliding around walls instead of beelining into them
  let dx = tx-g.x, dz = tz-g.z; const d = hyp(dx,dz)||1; dx/=d; dz/=d; const r = 0.5*g.scale;
  for(const a of [0, 0.6, -0.6, 1.2, -1.2, 1.9, -1.9]){ const c = Math.cos(a), sn = Math.sin(a), ux = dx*c - dz*sn, uz = dx*sn + dz*c;
    const nx = g.x + ux*s*dt, nz = g.z + uz*s*dt; if(!blocked(nx, nz, r) && nx>BOUNDS.x0+1 && nx<BOUNDS.x1-1 && nz>BOUNDS.z0+1 && nz<BOUNDS.z1-1 && !(MODE==='campaign' && !gateOpen && nz < STAGE_Z+1)){ g.x = nx; g.z = nz; g.face = Math.atan2(ux, uz); return; } } }
const GEMS = []; let gemMesh;
function buildGems(){ gemMesh = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.3,0), new THREE.MeshBasicMaterial({color:0xffffff}), 900); gemMesh.frustumCulled = false; gemMesh.count = 0; initColors(gemMesh, 900); scene.add(gemMesh); }
function takeGem(i, h){ const g = GEMS[i]; GEMS.splice(i,1); gainXP(h, g.xp); if(h.isPlayer) tone(880+Math.random()*80, 0.04, 'triangle', 0.03);
  if(g.bonus){ const T = GHOST_TYPES[g.type]; if(T.bonus==='heal') h.hp = Math.min(h.maxhp, h.hp+30); else if(T.bonus==='energy') h.energy = h.maxEnergy; else h.buff[T.bonus] = 10;
    if(h.isPlayer) big(T.label.toUpperCase(), 800, 'small'); } }
// blue orb — the inverted eclipse: eat it, the screen inverts, Pac grows, ghosts SCATTER and can be eaten
const ORBS = []; let blueT = 0;
function spawnOrb(x, z){ const g = new THREE.Group(); g.position.set(x, 1.2, z);
  g.add(new THREE.Mesh(new THREE.SphereGeometry(0.55,24,16), new THREE.MeshBasicMaterial({color:0x02040a})));
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.6,0.98,48), new THREE.MeshBasicMaterial({color:new THREE.Color(0x4aa8ff).multiplyScalar(2), transparent:true, opacity:0.95, blending:THREE.AdditiveBlending, side:THREE.DoubleSide, depthWrite:false}));
  g.add(ring, glow(0x2a7bff,6,0.9), glow(0x9fd4ff,2.6,0.9)); scene.add(g); ORBS.push({g, ring, x, z}); toast('learn:orb','A blue orb. Eat it: the ghosts scatter and you can eat them for a few seconds.'); }
function eatOrb(i, h){ const o = ORBS[i]; scene.remove(o.g); ORBS.splice(i,1); burst(o.x,1,o.z,0x4aa8ff,70,12);
  if(h.isPlayer){ blueT = 8; eatChain = 0; heroSay(h, 'ghostEat', true); SFX.whoosh(); tone(200, 0.6, 'sawtooth', 0.08, 4);
    for(const g of G){ if(g.big) continue; const dx = g.x-h.x, dz = g.z-h.z, d = hyp(dx,dz)||1; g.kvx += dx/d*14; g.kvz += dz/d*14; } } else h.buff.dmg = 8; }

// ================= BALL BOY'S CREATURES (player + boss) =================
const CRE = [];
function throwCreature(owner, type, tx, tz, isBoss){
  const ball = LOOK.piece(MODELS,'creatures','cre.ball',{outline:0.015}) || new THREE.Mesh(new THREE.SphereGeometry(0.24), new THREE.MeshBasicMaterial({color:0x41c4dc}));
  ball.position.set(owner.x, 1.6, owner.z); scene.add(ball); ball.add(glow(0x41e4ff, 1.4, 0.6));
  const c = {type, owner, isBoss:!!isBoss, state:'ball', t:0, sx:owner.x, sz:owner.z, tx, tz, x:tx, z:tz, ball, model:null, ang:Math.atan2(tx-owner.x, tz-owner.z), did:false, tele:false};
  CRE.push(c); owner.throwT = 0.35; tone(700, 0.08, 'triangle', 0.05, 1.6); return c;
}
const CRE_MODEL = {cindercub:'cre.cindercub', boulderbud:'cre.boulderbud', gloomoth:'cre.gloomoth'};
const creFoes = c => c.isBoss ? HEROES.filter(h=>h.team===0 && !h.dead) : ENEMY[c.owner.team];
function updateCreatures(dt){
  for(let i=CRE.length-1;i>=0;i--){ const c = CRE[i]; c.t += dt;
    if(c.state==='ball'){ const f = Math.min(1, c.t/0.45); c.ball.position.set(c.sx+(c.tx-c.sx)*f, 1.6+Math.sin(f*Math.PI)*3, c.sz+(c.tz-c.sz)*f); c.ball.rotation.x += dt*12;
      if(f >= 1){ scene.remove(c.ball); c.model = LOOK.piece(MODELS,'creatures',CRE_MODEL[c.type],{outline:0.025}); if(c.isBoss) c.model.scale.setScalar(1.25); c.model.position.set(c.tx, 0, c.tz); c.model.rotation.y = c.ang; scene.add(c.model);
        c.wings = c.type==='gloomoth' ? [LOOK.node(c.model,'cre.gloomoth.wingL'), LOOK.node(c.model,'cre.gloomoth.wingR')] : null;
        burst(c.tx, 1, c.tz, 0xffffff, 30, 9); burst(c.tx, 1, c.tz, 0x41e4ff, 20, 6); c.state = 'act'; c.t = 0; SFX.pop(); }
      continue; }
    if(c.state==='act'){ const o = c.owner, A = CRE_STATS[c.type];
      if(c.type==='cindercub'){ const foes = creFoes(c); let tg = null, bd = 14; for(const e of foes){ if(e.dead) continue; const d = hyp(e.x-c.x, e.z-c.z); if(d < bd){ bd = d; tg = e; } }
        if(tg){ c.ang += angDiff(c.ang, Math.atan2(tg.x-c.x, tg.z-c.z))*Math.min(1, (c.isBoss?2.0:8)*dt); }
        c.model.rotation.y = c.ang; const tele = c.isBoss ? 0.8 : 0;
        if(c.t < tele){ c.teleT = (c.teleT||0) - dt; if(c.teleT <= 0){ c.teleT = 0.14; fanFx(c.x, c.z, c.ang, A.range, A.arc, 0xff3b1a, 0.16, 0.35); } }
        else { spray(c.x + Math.sin(c.ang)*0.8, c.z + Math.cos(c.ang)*0.8, c.ang, A.range*0.35, A.arc, Math.random()<.5?0xff7a20:0xffd040, 6, 1.0); if(Math.random()<0.3) puff(c.x + Math.sin(c.ang)*A.range*0.6, 1, c.z + Math.cos(c.ang)*A.range*0.6, 0x553322, 1, 1.5);
          if(c.isBoss){ for(const e of foes){ const dx = e.x-c.x, dz = e.z-c.z, d = hyp(dx,dz); if(d < A.range && Math.abs(angDiff(c.ang, Math.atan2(dx,dz))) < A.arc/2) hurtHero(e, 16*dt, null); } }
          else coneHit(o, c.x, c.z, c.ang, areaOf(o,'hottake',A.range), A.arc, dmgOf(o,'hottake',A.dps)*dt, {}); }
        if(c.t > tele + A.dur){ c.state = 'back'; c.t = 0; } }
      else if(c.type==='boulderbud'){ if(!c.tele){ c.tele = true; if(c.isBoss) { discFx(c.x, c.z, A.rad, 0xff3b1a, 0.6); } ringFx(c.x, c.z, A.rad, c.isBoss?0xff3b1a:0xc0b8a8, 0.6); }
        c.model.position.y = Math.max(0, Math.sin(Math.min(1,c.t/0.6)*Math.PI)*1.8);
        if(c.t > 0.6 && !c.did){ c.did = true; addShake(c.isBoss?0.5:0.3); burst(c.x, 0.5, c.z, 0xa8a090, 60, 11); ringFx(c.x, c.z, A.rad, 0xd8d0c0, 0.4); SFX.boom(0.8);
          if(c.isBoss){ for(const e of creFoes(c)){ if(hyp(e.x-c.x, e.z-c.z) < A.rad){ hurtHero(e, 12, null); knock(e, c.x, c.z, 9); } } }
          else areaHit(o, c.x, c.z, areaOf(o,'rockbottom',A.rad), dmgOf(o,'rockbottom',A.dmg), {knock:A.knock}); }
        if(c.t > 1.1){ c.state = 'back'; c.t = 0; } }
      else if(c.type==='gloomoth'){ if(c.wings) c.wings.forEach((w,k)=>{ if(w) w.rotation.y = (k?-1:1)*Math.sin(gt*20)*0.6; }); c.model.position.y = 0.3+Math.sin(gt*3)*0.25;
        if(Math.random()<0.7) burst(c.x+rnd(-A.rad,A.rad)*0.7, rnd(0.3,1.6), c.z+rnd(-A.rad,A.rad)*0.7, 0xc09aff, 1, 1, -0.5, 1);
        if(!c.tele){ c.tele = true; ringFx(c.x, c.z, A.rad, 0xb070ff, 0.7); if(c.isBoss) discFx(c.x, c.z, A.rad, 0xb070ff, 0.9); }
        if(c.t > (c.isBoss?0.9:0.2)){ if(c.isBoss){ if(!c.did){ for(const e of creFoes(c)) if(hyp(e.x-c.x, e.z-c.z) < A.rad){ e.slowT = Math.max(e.slowT, 1.6); e.stunT = Math.max(e.stunT, 0.5); } c.did = true; } }
          else areaHit(o, c.x, c.z, areaOf(o,'sleepover',A.rad), dmgOf(o,'sleepover',A.dmg)*dt*2, {stun:A.stun*(1+0.15*(o.rank.sleepover||0)), slow:2}); }
        if(c.t > 2.1){ c.state = 'back'; c.t = 0; } }
      if(c.state==='back' && c.isBoss && BOSS){ BOSS.faced++; if(BOSS.faced===3) toast(null,'You have seen his whole team. Ball Boy can go down now.'); } }
    if(c.state==='back'){ if(!c.beamed){ c.beamed = true; zapLine(c.x, c.z, c.owner.x, c.owner.z, 0xff4a4a, 1); } c.model.scale.setScalar(Math.max(0.01, (c.isBoss?1.25:1)*(1 - c.t*4)));
      if(c.t > 0.25){ scene.remove(c.model); CRE.splice(i,1); } } }
}
const CRE_STATS = {cindercub:{range:9, arc:1.1, dps:60, dur:2.2}, boulderbud:{rad:7, dmg:26, knock:9}, gloomoth:{rad:5, stun:1.6, dmg:6}};

// ================= THE BOSS: BALL BOY =================
let BOSS = null; const SHOTS = [];
function makeBoss(){ const rig = makeRig('ballboy', 1); scene.add(rig.root); const D = diff();
  BOSS = {kind:'boss', x:0, z:-415, r:1.3, hp:1500*D.hp, maxhp:1500*D.hp, rig, awake:false, intro:false, alive:true, dead:false, faced:0, seq:0, throwT:2.0, ballT:2.5, spawnT:10, face:0, walk:0, hitT:0, throwPose:0}; }
function bossDamage(d){ if(!BOSS || !BOSS.alive || !BOSS.awake) return; BOSS.hp -= d; BOSS.hitT = 0.08;
  if(BOSS.faced < 3 && BOSS.hp < BOSS.maxhp*0.1){ BOSS.hp = BOSS.maxhp*0.1; if(!BOSS.noDieSaid){ BOSS.noDieSaid = true; say('boss','noDie',true); } }
  if(BOSS.hp <= 0) bossDie(); }
function updateBoss(dt){
  if(!BOSS || !BOSS.alive) return; const P0 = player(); if(!P0 || P0.dead) return; const d = hyp(P0.x-BOSS.x, P0.z-BOSS.z);
  if(!BOSS.intro && P0.z < STAGE_Z - 6){ BOSS.intro = true; startShowdown(); return; }
  if(!BOSS.awake) { BOSS.face = Math.atan2(P0.x-BOSS.x, P0.z-BOSS.z); return; }
  const want = 9, dx = P0.x-BOSS.x, dz = P0.z-BOSS.z, s = d > want+2 ? 1 : d < want-2 ? -1 : 0;
  const mx = dx/(d||1)*s + (-dz/(d||1))*0.6*Math.sin(gt*0.7), mz = dz/(d||1)*s + (dx/(d||1))*0.6*Math.sin(gt*0.7);
  const nx = BOSS.x + mx*4.5*dt, nz = BOSS.z + mz*4.5*dt; if(!blocked(nx, BOSS.z, 1) && Math.abs(nx) < 26) BOSS.x = nx; if(!blocked(BOSS.x, nz, 1) && nz < STAGE_Z-4 && nz > -438) BOSS.z = nz;
  BOSS.walk += hyp(mx,mz)*dt*7; BOSS.face = Math.atan2(dx, dz); BOSS.moving = hyp(mx,mz) > 0.2;
  BOSS.throwT -= dt; if(BOSS.throwT <= 0 && !CRE.some(c=>c.isBoss)){ BOSS.throwT = 3.4; const type = ['cindercub','boulderbud','gloomoth'][BOSS.seq%3]; BOSS.seq++;
    say('boss', type==='cindercub'?'cub':type==='boulderbud'?'bud':'moth', true);
    if(type==='cindercub'){ const a = Math.atan2(BOSS.x-P0.x, BOSS.z-P0.z); throwCreature(BOSS, type, P0.x+Math.sin(a)*5, P0.z+Math.cos(a)*5, true); }
    else throwCreature(BOSS, type, P0.x + P0.vx*0.25, P0.z + P0.vz*0.25, true); }
  BOSS.ballT -= dt; if(BOSS.ballT <= 0){ BOSS.ballT = 1.8; const m = LOOK.piece(MODELS,'creatures','cre.ball',{outline:0.015}); m.position.set(BOSS.x, 2.4, BOSS.z); m.add(glow(0x41e4ff,1.2,0.6)); scene.add(m);
    const a = Math.atan2(P0.x-BOSS.x, P0.z-BOSS.z); SHOTS.push({m, vx:Math.sin(a)*13, vz:Math.cos(a)*13, life:2.4, dmg:8}); BOSS.throwPose = 0.3; }
  BOSS.spawnT -= dt; if(BOSS.spawnT <= 0){ BOSS.spawnT = 11; for(let i=0;i<4;i++) spawnGhost(pick(['red','green','blue']), false, [BOSS.x+Math.cos(i*1.6)*4, BOSS.z+Math.sin(i*1.6)*4]); }
  $('bossHp').style.width = Math.max(0, BOSS.hp/BOSS.maxhp*100)+'%';
  $('bossNote').textContent = BOSS.faced < 3 ? `Creatures faced: ${BOSS.faced} / 3` : 'He is open. Take him down!';
}
function bossDie(){ BOSS.alive = false; ST.boss = 1; addScore(6000); say('boss','die',true); burst(BOSS.x, 3, BOSS.z, 0xffffff, 220, 20); burst(BOSS.x, 2, BOSS.z, 0x41e4ff, 120, 14); SFX.boom(1.4); addShake(1);
  scene.remove(BOSS.rig.root); $('bossBar').classList.add('hide'); CRE.forEach(c=>{ scene.remove(c.ball); if(c.model) scene.remove(c.model); }); CRE.length = 0;
  for(const g of G) if(!g.dead) killGhost(g, player(), false); setTrack('club');
  big('BALL BOY DOWN', 1600); slowmo = 1.4; setTimeout(()=>{ heroSay(player(),'bossKill',true); }, 600); setTimeout(()=>{ if(state==='play') startVacuum(); }, 1600); }
