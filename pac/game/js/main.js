// PAC v0.7 — main.js: game modes, the update loop, the boss SHOWDOWN, camera, rendering, boot.
"use strict";
let state = 'boot', MODE = 'campaign', gateOpen = false, wave = 0, waveT = 0;
let gt = 0, rtime = 0, slowmo = 0;               // game time (scaled by the speed setting) / real time
const ST = {score:0, dots:0, patterns:0, ghosts:0, civ:0, props:0, boss:0, time:0, coins:0};
const PVP = {size:[1,1], target:10, kills:[0,0]};
let chain = 0, lastDotT = -9, hyper = 0, hyperDecay = 0, packT = 4, orbT = 45, refillT = 30, idleT = 30;
const addScore = n => { ST.score += n*scoreMult(); };

function clearWorld(){
  HEROES.forEach(h=>{ scene.remove(h.rig.root); h.spikes.forEach(s=>scene.remove(s)); (h.fx.orb||[]).forEach(o=>scene.remove(o)); if(h.fx.gasM) scene.remove(h.fx.gasM); }); HEROES = [];
  if(BOSS){ scene.remove(BOSS.rig.root); BOSS = null; } $('bossBar').classList.add('hide');
  for(const arr of [BOMBS, BOLTS, LOBS, TRAILS, SHOTS, ALLIES, PINBALLS]){ arr.forEach(o=>scene.remove(o.m||o.g)); arr.length = 0; }
  CRE.forEach(c=>{ scene.remove(c.ball); if(c.model) scene.remove(c.model); }); CRE.length = 0; JAWS.forEach(j=>scene.remove(j.g)); JAWS.length = 0;
  ZAPS.forEach(z=>scene.remove(z.l)); ZAPS.length = 0; FX.forEach(f=>scene.remove(f.m)); FX.length = 0; ORBS.forEach(o=>scene.remove(o.g)); ORBS.length = 0;
  resetProps(); clearPickups(); clearFirebars(); resetDots();
  G = []; GEMS.length = 0; CIV = []; debuted.clear(); pendingLv.length = 0; TAGS.forEach(el=>el.remove()); TAGS.clear();
  setGate(false); gateOpen = false; blueT = 0; hyper = 0; glitchT = 0;
}
function startRun(mode, opts={}){
  audio(); clearWorld(); MODE = mode; hideAllOverlays(); state = 'play'; heroId = 0; shownToasts.clear(); toastQ.length = 0;
  if(menuHero){ scene.remove(menuHero.root); menuHero = null; }
  Object.assign(ST, {score:0, dots:0, patterns:0, ghosts:0, civ:0, props:0, boss:0, time:0, coins:0}); chain = 0; eatChain = 0; wave = 0; waveT = 25;
  packT = 3; orbT = 50; refillT = 30; idleT = 30; hurtAcc = 0; gt = 0; slowmo = 0;
  if(mode==='pvp'){ BOUNDS = {x0:LANE.x0, x1:LANE.x1, z0:-108, z1:-2}; PVP.kills = [0,0]; PVP.size = opts.size || [1,1]; PVP.target = opts.target || 10;
    HEROES.push(newHero(SAVE.char, 0, true, 0, -10));
    for(let i=1;i<PVP.size[0];i++) HEROES.push(newHero(pick(SAVE.unlocked), 0, false, -7+i*7, -8));
    for(let i=0;i<PVP.size[1];i++) HEROES.push(newHero(pick(SAVE.unlocked), 1, false, -7+i*7, -96));
    HEROES.forEach(h=>{ h.spawn = [h.x, h.z]; if(h.team===1) h.face = 0; if(!h.isPlayer) h.name = (h.team?'Rival ':'Ally ')+CHARS[h.char].name; });
    seedRoom(1, true); seedPickups(1); }
  else { BOUNDS = Object.assign({}, LANE); HEROES.push(newHero(SAVE.char, 0, true, 0, 38)); if(mode==='campaign') makeBoss();
    seedRoom(0, false); seedPickups(0); addFirebar(0, -158, 7, 1.3); addFirebar(-14, -330, 8, -1.5); addFirebar(14, -248, 6, 1.7); }
  applyLoadout(player());
  seedCivilians(); buildSkillHud(); $('hud').classList.remove('hide'); $('topR').classList.remove('hide'); $('touch').classList.remove('hide'); document.body.classList.add('inplay'); resize();
  $('pvpBox').classList.toggle('hide', mode!=='pvp');
  $('wName').textContent = mode==='pvp' ? `PVP · ${PVP.size[0]}v${PVP.size[1]}` : mode==='endless' ? 'ENDLESS · THE CLUB' : 'WORLD 1 · THE CLUB';
  $('bestN').textContent = Math.round(SAVE.best[mode]||0).toLocaleString();
  setTrack('club'); afterimage.enabled = false; bloom.enabled = SAVE.set.bloom;
  const P0 = player(); setTimeout(()=>{ if(state==='play') heroSay(P0,'start',true); }, 700);
  setTimeout(()=>toast('learn:dots', mode==='pvp' ? 'Eat dots and ghosts to level up. Take out the other team.' : 'Eat the dots. The trails lead you up the club. Finish a spinning pattern and its last dot blows up.'), 1600);
  setTimeout(()=>toast('learn:ctrl'+(isMobile?'m':'d'), isMobile ? 'Left thumb moves. A attacks, B defends, MOVE warps. ☰ pauses.' : 'WASD moves, the mouse aims. Left click attacks, right click defends, SPACE moves. ESC pauses.'), 2000);
  camera.position.set(P0.x, 30, P0.z+24); camLook.set(P0.x, 0, P0.z);
}
function toMenu(){ document.body.classList.remove('inplay'); clearWorld(); state = 'menu'; hideAllOverlays(); $('hud').classList.add('hide'); $('topR').classList.add('hide'); $('touch').classList.add('hide'); cv.style.filter = ''; resize();
  BOUNDS = Object.assign({}, LANE); seedCivilians(); CIV = CIV.filter(c=>hyp(c.x, c.z+30) > 10); seedRoom(1, false); PATS = PATS.filter(P=>P.k==='path' ? false : true);
  showMenuHero(); $('mainMenu').classList.remove('hide'); renderMain(); setTrack('menu'); afterimage.enabled = false; }
function heroDie(h, src){
  if(h.dead) return; h.dead = true; burst(h.x,1,h.z,0xffe14d,100,13); addShake(h.isPlayer?0.8:0.3); h.rig.root.visible = false; h.spikes.forEach(s=>s.visible=false); (h.fx.orb||[]).forEach(o=>o.visible = false); h.deaths++;
  if(MODE==='pvp'){ h.respawnT = 6; if(src && src.kind==='hero' && src.team!==h.team){ src.kills++; PVP.kills[src.team]++; } else PVP.kills[1-h.team]++;
    if(h.isPlayer) toast(null, 'You got taken out. Back in 6 s.', 3000);
    if(PVP.kills[0] >= PVP.target || PVP.kills[1] >= PVP.target){ const win = PVP.kills[0] >= PVP.target; setTimeout(()=>openTally(win), 900); } }
  else if(h.isPlayer) setTimeout(()=>{ if(state==='play') openTally(false); }, 1200);
}
function respawn(h){ h.dead = false; h.hp = h.maxhp; h.energy = h.maxEnergy; h.x = h.spawn[0]; h.z = h.spawn[1]; h.rig.root.visible = true; (h.fx.orb||[]).forEach(o=>o.visible = true); h.iframes = 2; burst(h.x,1,h.z,0xffffff,40,8); }
function openGate(){ if(gateOpen) return; gateOpen = true; setGate(true); big('THE MAIN STAGE IS OPEN', 1800);
  toast(null,'Ball Boy is waiting on the main stage at the top of the club. Follow the gold arrow — and keep growing on the way.', 6000);
  seededRooms.delete(4); seedRoom(4, true); }
function breakProp(P, h, byWalk){ if(P.broken) return; P.broken = true; setPropVisible(P, false); const i = WALLS.indexOf(P); if(i>=0) WALLS.splice(i,1);
  const cx = (P.x0+P.x1)/2, cz = (P.z0+P.z1)/2; burst(cx,1,cz,P.color,34,9); burst(cx,1,cz,0x9a90a8,24,7); SFX.boom(0.5); if(h && h.isPlayer){ ST.props++; addScore(25); }
  if(byWalk && h){ h.energy = Math.max(0, h.energy - P.cost); if(h.isPlayer){ if(Math.random()<0.4) heroSay(h,'smash'); toast('learn:smash','Tearing through furniture costs energy. Or just go around.'); } } }
function pushProp(h, w, dt){ if(!w.prop || w.cost <= 0 || (!h.isPlayer && MODE!=='pvp')) return; w.push += dt; if(w.push > 0.35){ if(h.energy >= w.cost || h.ballT > 0) breakProp(w, h, h.ballT<=0); else if(h.isPlayer) toast(null,'Not enough energy to tear through that. Go around.', 2500); w.push = 0; } }
function botThink(h, dt){
  const ai = h.ai; ai.t = (ai.t||0) - dt; let tg = null, bd = 1e9;
  for(const e of HEROES) if(e.team !== h.team && !e.dead){ const d = hyp(e.x-h.x, e.z-h.z); if(d < bd){ bd = d; tg = e; } }
  let mx = 0, mz = 0;
  if(tg && bd < 30){ const want = h.char==='pac' ? 1.5 : 7, dx = tg.x-h.x, dz = tg.z-h.z, s = bd > want ? 1 : -0.7, sw = Math.sin(gt*0.9 + h.id*2);
    mx = dx/bd*s - dz/bd*0.55*sw; mz = dz/bd*s + dx/bd*0.55*sw; h.ax = dx/bd; h.az = dz/bd; h.aimPx = tg.x; h.aimPz = tg.z;
    if(h.slots.off && bd < 9) useActive(h, 'off'); if(h.slots.def && (bd < 5 || h.hp < h.maxhp*0.45)) useActive(h, 'def'); if(h.moveOk && bd > 12 && Math.random() < dt*0.5) useMove(h); }
  else { if(!ai.wp || ai.t <= 0){ ai.t = 3; ai.wp = [rnd(BOUNDS.x0+4, BOUNDS.x1-4), rnd(BOUNDS.z0+4, BOUNDS.z1-4)]; } const dx = ai.wp[0]-h.x, dz = ai.wp[1]-h.z, d = hyp(dx,dz)||1; mx = dx/d; mz = dz/d;
    const g = nearest(h, 12); if(g){ const gd = hyp(g.x-h.x,g.z-h.z)||1; h.ax = (g.x-h.x)/gd; h.az = (g.z-h.z)/gd; h.aimPx = g.x; h.aimPz = g.z; if(h.slots.off) useActive(h,'off'); } }
  const l = hyp(mx,mz); return l > 0 ? [mx/l, mz/l] : [0,0];
}

// ================= THE BOSS SHOWDOWN: the game takes the camera, sets the stage, then hands you the fight =================
let sd = null;
function startShowdown(){ state = 'showdown'; sd = {t:0, popped:false}; const P0 = player(); P0.vx = P0.vz = 0; setTrack('boss');
  for(const g of G){ if(!g.dead){ g.dead = true; puff(g.x, 1, g.z, 0xffffff, 4, 0.8); } } G = G.filter(g=>!g.dead);
  BOSS.x = 0; BOSS.z = STAGE_Z - 24; P0.x = clamp(P0.x, -10, 10); P0.z = Math.min(P0.z, STAGE_Z - 8); P0.face = Math.PI; BOSS.face = 0;
  $('hud').classList.add('hide'); $('touch').classList.add('hide'); document.body.classList.add('cine');
  // the stage lights find him: a white pool and a beam from the rig, moved to Pac when it's his turn
  sd.pool = pool(0xfff2d8, 7, 0.4); sd.pool.position.set(BOSS.x, 0.08, BOSS.z); scene.add(sd.pool);
  sd.beam = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 3.4, 16, 20, 1, true), new THREE.MeshBasicMaterial({color:0xfff2d8, transparent:true, opacity:0.07, blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide}));
  sd.beam.position.set(BOSS.x, 8, BOSS.z); scene.add(sd.beam); }
function updateShowdown(dt){ sd.t += dt; const P0 = player();
  if(sd.t > 2.6 && !sd.lit){ sd.lit = true; sd.pool.position.set(P0.x, 0.08, P0.z); sd.beam.position.set(P0.x, 8, P0.z); SFX.boom(0.4); }
  if(sd.t > 4.3 && !sd.both){ sd.both = true; sd.pool.scale.setScalar(2.4); sd.pool.position.set((P0.x+BOSS.x)/2, 0.08, (P0.z+BOSS.z)/2); sd.beam.visible = false; }
  if(sd.t > 0.4 && !sd.spot){ sd.spot = true; say('boss','intro',true); bigCard('BALL BOY', 'THE TRAINER'); SFX.boom(0.6); }
  if(sd.t > 1.2 && !sd.popped){ sd.popped = true; ['cindercub','boulderbud','gloomoth'].forEach((k,i)=>{ const a = -0.9 + i*0.9; const m = LOOK.piece(MODELS,'creatures',CRE_MODEL[k],{outline:0.025}); m.position.set(BOSS.x + Math.sin(a)*3.4, 0, BOSS.z + Math.cos(a)*3.4); m.rotation.y = Math.atan2(P0.x-m.position.x, P0.z-m.position.z); scene.add(m); sd['m'+i] = m; burst(m.position.x, 1, m.position.z, 0xffffff, 20, 7); }); SFX.pop(); }
  if(sd.t > 2.6 && !sd.pac){ sd.pac = true; for(let i=0;i<3;i++){ const m = sd['m'+i]; if(m){ zapLine(m.position.x, m.position.z, BOSS.x, BOSS.z, 0xff4a4a, 1); scene.remove(m); } } heroSay(P0,'bossIn',true); bigCard(CHARS[P0.char].name.toUpperCase(), 'THE CHALLENGER'); }
  if(sd.t > 4.3 && !sd.vs){ sd.vs = true; big('SHOWDOWN!', 1200); SFX.boom(1); addShake(0.5); }
  if(sd.t > 5.6){ scene.remove(sd.pool); scene.remove(sd.beam); document.body.classList.remove('cine'); state = 'play'; BOSS.awake = true; $('bossBar').classList.remove('hide'); $('hud').classList.remove('hide'); $('touch').classList.remove('hide'); P0.grace = 1.5; sd = null;
    toast('learn:boss','Ball Boy throws one creature at a time. Red on the floor = get out. He can only go down after you\'ve faced all three.', 6500); }
}
function bigCard(title, sub){ const el = $('card'); el.innerHTML = `<div class="ct">${title}</div><div class="cs">${sub}</div>`; el.classList.remove('on'); void el.offsetWidth; el.classList.add('on'); }

// ================= UPDATE =================
function update(dt){
  ST.time += dt; buildTargets(); const P0 = player(), D = diff();
  hyperDecay -= dt; if(hyperDecay <= 0 && hyper > 0){ hyper--; hyperDecay = 8; }
  blueT = Math.max(0, blueT-dt); glitchT = Math.max(0, glitchT-dt);
  idleT -= dt; if(idleT <= 0){ idleT = rnd(25,45); heroSay(P0, 'idle'); }
  if(MODE==='campaign' && !gateOpen && P0.level >= 4 && P0.slots.off) openGate();
  if(MODE==='endless'){ waveT -= dt; if(waveT <= 0){ wave++; waveT = 40; big('WAVE '+wave, 1100); const n = Math.round((10+wave*5)*D.spawn); for(let i=0;i<n/4;i++) spawnPack(4, COLOUR_ORDER.slice(0, Math.min(7, 2+wave))); spawnGhost(pick(COLOUR_ORDER), true); } }
  // rooms fill as you approach them
  if(MODE!=='pvp'){ const ri = roomIndex(P0.z); for(const j of [ri, ri+1]) if(j < ROOMS.length && !seededRooms.has(j) && P0.z < ROOMS[j].z1 + 30){ if(j===5 && !gateOpen) continue; seedRoom(j, gateOpen); seedPickups(j); }
    refillT -= dt; if(refillT <= 0){ refillT = 28; let left = 0; for(const P of PATS) if(roomAt(P.az)===ROOMS[ri]) left += P.left; if(left < 50) refillRoom(ri); } }
  else { refillT -= dt; if(refillT <= 0){ refillT = 20; refillRoom(1); } }
  // ---- heroes ----
  for(const h of HEROES){
    if(h.dead){ if(MODE==='pvp'){ h.respawnT -= dt; if(h.respawnT <= 0) respawn(h); } continue; }
    let mx = 0, mz = 0;
    if(h.isPlayer){ [mx, mz] = moveInput(); playerAim(h); if(mouseDown[0]) useActive(h,'off'); if(mouseDown[2]) useActive(h,'def'); }
    else [mx, mz] = botThink(h, dt);
    h.iframes -= dt; h.stunT -= dt; h.slowT -= dt; h.moveCd -= dt; h.hurtT -= dt;
    h.energy = Math.min(h.maxEnergy, h.energy + 7*h.mods.regen*dt); h.hp = Math.min(h.maxhp, h.hp + h.mods.hpRegen*dt);
    let sp = CHARS[h.char].speed * h.mods.speed * (h.isPlayer ? 1 + hyper*0.05 : 1) * (h.buff.speed>0?1.3:1) * (h.ballT>0?1.45:1) * (h.sugarT>0?1.7:1) * (h.slowT>0?0.5:1);
    if(h.stunT > 0) sp = 0;
    let tvx = mx*sp, tvz = mz*sp; if(h.dashT > 0 && h.dash){ tvx = h.dash.dx*28; tvz = h.dash.dz*28; }
    const acc = h.dashT>0 ? 1 : Math.min(1, ((mx||mz) ? 14 : 18)*dt); h.vx += (tvx - h.vx)*acc; h.vz += (tvz - h.vz)*acc;
    h.kvx *= Math.pow(0.02, dt); h.kvz *= Math.pow(0.02, dt);
    const growT = (h.isPlayer && blueT>0 ? 1.35 : 1) * (h.ballT>0 ? 2.6 : 1); h.grow += (growT - h.grow)*Math.min(1, 6*dt); h.r = CHARS[h.char].r*h.grow;
    if(h.hopT <= 0){ const nx = h.x + (h.vx+h.kvx)*dt, nz = h.z + (h.vz+h.kvz)*dt;
      const wx = blocked(nx, h.z, h.r); if(!wx) h.x = nx; else { pushProp(h, wx, dt); h.vx = 0; h.kvx = 0; }
      const wz = blocked(h.x, nz, h.r); if(!wz) h.z = nz; else { pushProp(h, wz, dt); h.vz = 0; h.kvz = 0; } }
    h.x = clamp(h.x, BOUNDS.x0+1, BOUNDS.x1-1); h.z = clamp(h.z, BOUNDS.z0+1, BOUNDS.z1-1);
    const spd = hyp(h.vx, h.vz); if(spd > 0.4 && h.lungeT <= 0){ h.face += angDiff(h.face, Math.atan2(h.vx, h.vz))*Math.min(1, 13*dt); }
    h.walk += spd*dt*2.4; if(h.isPlayer && spd > 1){ h.wakaT = (h.wakaT||0) - dt; if(h.wakaT <= 0 && h.char==='pac'){ h.wakaT = 0.22; SFX.waka(h.wakaK = !h.wakaK); } }
    runHero(h, dt);
  }
  if(hurtAcc > 25){ hurtAcc = 0; heroSay(P0,'hurt'); }
  // ---- dots ----
  for(const P of PATS){ for(let i=0;i<P.n;i++){ if(!P.alive[i]) continue; const [x,z] = dotPos(P,i);
    for(const h of HEROES){ if(h.dead) continue; const r = 1.0*h.grow + (h.buff.magnet>0?1.6:0) + (h.mods.pickup-1)*0.8; if(Math.abs(x-h.x) < r && Math.abs(z-h.z) < r && hyp(x-h.x, z-h.z) < r){ eatDot(P, i, h, x, z); break; } } } }
  PATS = PATS.filter(P => P.left > 0);
  // ---- pickups ----
  for(let i=PICKS.length-1;i>=0;i--){ const p = PICKS[i]; p.t += dt; p.g.rotation.y += dt*(p.kind==='coin'?3:1); p.g.position.y = 0.6 + Math.sin(p.t*3)*0.12;
    for(const h of HEROES){ if(h.dead) continue; const d = hyp(p.x-h.x, p.z-h.z), R = (1.2 + (h.buff.magnet>0?3:0))*h.mods.pickup;
      if(p.kind==='coin' && d < R+2){ p.x += (h.x-p.x)*Math.min(1, dt*6); p.z += (h.z-p.z)*Math.min(1, dt*6); p.g.position.x = p.x; p.g.position.z = p.z; }
      if(d < 1.1){ if(p.kind==='fruit'){ if(h.hp >= h.maxhp-1 && h.isPlayer){ continue; } h.hp = Math.min(h.maxhp, h.hp + 28); burst(p.x,1,p.z,0x7cff8a,24,6); if(h.isPlayer){ SFX.coin(); big('+28 HP', 600, 'small'); toast('learn:fruit','Fruit heals you.'); } }
        else { if(h.isPlayer){ ST.coins++; addScore(50); SFX.coin(); toast('learn:coin','Coins: you keep them after the run and spend them in Loadout.'); } burst(p.x,1,p.z,0xffd23f,10,5); }
        scene.remove(p.g); PICKS.splice(i,1); break; } } }
  // ---- fire bars ----
  for(const F of FIREBARS){ F.ang += F.speed*dt; F.g.rotation.y = F.ang; F.hitT = (F.hitT||0) - dt; const ex = Math.cos(F.ang), ez = -Math.sin(F.ang);
    for(const h of HEROES){ if(h.dead) continue; const px = h.x-F.x, pz = h.z-F.z, along = px*ex + pz*ez, off = Math.abs(px*ez - pz*ex); if(along > -0.3 && along < F.len && off < 0.5 + h.r*0.5 && F.hitT <= 0){ F.hitT = 0.7; hurtHero(h, 14, null); knock(h, F.x, F.z, 6); burst(h.x,1,h.z,0xff7a20,16,6); } }
    for(const g of G){ if(g.dead) continue; const px = g.x-F.x, pz = g.z-F.z, along = px*ex + pz*ez, off = Math.abs(px*ez - pz*ex); if(along > -0.3 && along < F.len && off < 0.8) { g.hp -= 30*dt; g.hitT = 0.05; if(g.hp <= 0) killGhost(g, null, false); } }
    if(hyp(P0.x-F.x, P0.z-F.z) < 16) toast('learn:firebar','Fire bars guard a stash of coins and fruit. Time your way in.'); }
  // ---- clubgoers ----
  for(let i=CIV.length-1;i>=0;i--){ const c = CIV[i]; c.ph += dt*6; let nearH = null, nd = 1e9; for(const h of HEROES){ if(h.dead) continue; const d = hyp(c.x-h.x, c.z-h.z); if(d < nd){ nd = d; nearH = h; } }
    if(nearH && (nd < 6.5 || (blueT>0 && nd < 12))){ if(c.panic <= 0 && Math.random()<0.3) SFX.scream(); c.panic = 2; if(nearH.isPlayer) toast('learn:civ','Clubgoers run from you. Eating one costs energy and scores nothing.'); } c.panic -= dt;
    let vx = 0, vz = 0; if(c.panic > 0 && nearH){ const dx = c.x-nearH.x, dz = c.z-nearH.z, d = hyp(dx,dz)||1; vx = dx/d*c.sp; vz = dz/d*c.sp; c.face = Math.atan2(vx, vz); } else { const hx = c.hx-c.x, hz = c.hz-c.z, hd = hyp(hx,hz); if(hd > 1.5){ vx = hx/hd*1.4; vz = hz/hd*1.4; c.face = Math.atan2(vx,vz); } }
    const nx = c.x+vx*dt, nz = c.z+vz*dt; if(!blocked(nx, c.z, 0.4) && inLane(nx, c.z)) c.x = nx; if(!blocked(c.x, nz, 0.4) && inLane(c.x, nz)) c.z = nz;
    if(nearH && nd < 0.5 + nearH.r){ killCiv(i, nearH); if(nearH.isPlayer){ nearH.energy = Math.max(0, nearH.energy - 12); heroSay(nearH,'civ',true); } } }
  // ---- ghosts: none before level 1, then packs; new colours debut as one BIG ghost ----
  const lv = P0.level;
  const cap = MODE==='pvp' ? 10 : MODE==='endless' ? Math.round((10 + wave*8 + lv*2)*D.spawn) : Math.round((lv<1 ? 0 : lv<5 ? [0,5,9,13,18][lv] : Math.min(110, 18 + (lv-4)*6))*D.spawn);
  const cols = COLOUR_ORDER.filter((c,i)=> MODE!=='campaign' || lv >= COLOUR_LV[i]);
  if(MODE==='campaign' && !(BOSS && BOSS.intro)) for(const c of cols){ if(c!=='red' && !debuted.has(c) && !debuted.has('p_'+c)){ debuted.add('p_'+c); spawnGhost(c, true); } }
  packT -= dt; const smalls = G.filter(g=>!g.big && !g.dead).length;
  if(packT <= 0 && smalls < cap && !(BOSS && BOSS.awake && smalls > 10)){ packT = Math.max(2.4, 7 - lv*0.3)/D.spawn; const poolC = cols.filter(c=>c==='red' || debuted.has(c) || MODE!=='campaign');
    spawnPack(Math.min(cap - smalls, 3 + Math.floor(lv/2)), poolC.length?poolC:['red']); }
  orbT -= dt; if(orbT <= 0 && (lv >= 1 || MODE!=='campaign')){ orbT = rnd(45,65); if(ORBS.length < 2){ let x, z, n = 0; do { x = P0.x + rnd(-16,16); z = P0.z - rnd(8,24); n++; } while((blocked(x,z,1) || !inLane(x,z) || (MODE==='campaign'&&!gateOpen&&z<STAGE_Z+2)) && n < 20); if(n<20) spawnOrb(x, z); } }
  for(let i=ORBS.length-1;i>=0;i--){ const o = ORBS[i]; o.ring.rotation.z += dt*1.5; o.g.lookAt(camera.position); for(const h of HEROES) if(!h.dead && hyp(o.x-h.x, o.z-h.z) < 1.4*h.grow){ eatOrb(i, h); break; } }
  for(const g of G){ if(g.dead) continue; g.bob += dt*4; g.hitT -= dt; g.slowT -= dt; g.stunT -= dt; g.modeT -= dt; g.lungeCd -= dt;
    let tg = null, bd = 1e9; for(const h of HEROES){ if(h.dead) continue; const d = hyp(h.x-g.x, h.z-g.z); if(d < bd){ bd = d; tg = h; } } if(!tg) continue;
    if(g.temper==='wildcard' && g.modeT <= 0){ g.mode = g.mode==='chase' ? 'scatter' : 'chase'; g.modeT = g.mode==='chase' ? rnd(5,8) : rnd(2,3); g.sx = tg.x + rnd(-16,16); g.sz = tg.z + rnd(-12,12); }
    let s = g.sp*(g.slowT>0?0.45:1); if(g.stunT > 0) s = 0;
    const scared = blueT > 0 && !g.big && tg.isPlayer;
    g.kvx *= Math.pow(0.03, dt); g.kvz *= Math.pow(0.03, dt);
    if(g.lungeT > 0){ g.lungeT -= dt; if(g.lungeT < 0.3){ s = 9; } else s = 0; }
    else if(!scared && g.temper==='chaser' && lv >= 2 && bd < 4.5 && g.lungeCd <= 0){ g.lungeT = 0.65; g.lungeCd = rnd(3,5); }
    let [tx, tz] = scared ? [g.x + (g.x-tg.x), g.z + (g.z-tg.z)] : (bd < 5 ? [tg.x, tg.z] : ghostTarget(g, tg));
    if(s > 0) steer(g, tx, tz, s, dt);
    const nx = g.x + g.kvx*dt, nz = g.z + g.kvz*dt; if(!blocked(nx, g.z, 0.5*g.scale) && nx>BOUNDS.x0+1 && nx<BOUNDS.x1-1) g.x = nx; if(!blocked(g.x, nz, 0.5*g.scale) && nz>BOUNDS.z0+1 && nz<BOUNDS.z1-1) g.z = nz;
    if(bd < g.r + tg.r){ if(scared){ killGhost(g, tg, true); gainXP(tg, 4); continue; } if(tg.ballT <= 0 && g.stunT <= 0) hurtHero(tg, (g.big?16:8)*dt*(g.lungeT>0?2:1), null); } }
  for(let i=0;i<G.length;i++){ const a = G[i], b = G[(i*7+3)%G.length]; if(!b || a===b || a.dead || b.dead) continue; const dx = a.x-b.x, dz = a.z-b.z, d = hyp(dx,dz), m = 0.65*(a.scale+b.scale); if(d < m && d > 0.01){ const f = (m-d)*0.5; a.x += dx/d*f; a.z += dz/d*f; b.x -= dx/d*f; b.z -= dz/d*f; } }
  G = G.filter(g=>!g.dead);
  for(let i=GEMS.length-1;i>=0;i--){ const g = GEMS[i]; g.t += dt; let tk = false; for(const h of HEROES){ if(h.dead) continue; const dx = h.x-g.x, dz = h.z-g.z, d = hyp(dx,dz), R = (2.2 + (h.buff.magnet>0?5:0))*h.mods.pickup;
      if(d < R+2.5 && d > 0.01){ g.x += dx/d*Math.min(d, 15*dt); g.z += dz/d*Math.min(d,15*dt); } if(d < 1){ takeGem(i, h); tk = true; break; } } if(!tk && g.t > 45) GEMS.splice(i,1); }
  // ---- boss, creatures, projectiles ----
  updateBoss(dt); if(state!=='play') return; updateCreatures(dt); updateJaws(dt);
  for(let i=SHOTS.length-1;i>=0;i--){ const s = SHOTS[i]; s.m.position.x += s.vx*dt; s.m.position.z += s.vz*dt; s.m.position.y = Math.max(0.9, s.m.position.y - dt*1.2); s.life -= dt; s.m.rotation.x += dt*10;
    if(!P0.dead && hyp(s.m.position.x-P0.x, s.m.position.z-P0.z) < 0.9*P0.grow){ hurtHero(P0, s.dmg, null); s.life = 0; burst(s.m.position.x,1,s.m.position.z,0x41e4ff,12,5); }
    if(s.life <= 0 || blocked(s.m.position.x, s.m.position.z, 0.1)){ scene.remove(s.m); SHOTS.splice(i,1); } }
  for(let i=BOLTS.length-1;i>=0;i--){ const b = BOLTS[i]; if(b.tg && !b.tg.dead){ const a = Math.atan2(b.tg.x-b.m.position.x, b.tg.z-b.m.position.z), sp = hyp(b.vx,b.vz), cur = Math.atan2(b.vx,b.vz); const na = cur + clamp(angDiff(cur, a), -6*dt, 6*dt); b.vx = Math.sin(na)*sp; b.vz = Math.cos(na)*sp; }
    b.m.position.x += b.vx*dt; b.m.position.z += b.vz*dt; b.life -= dt;
    for(const e of ENEMY[b.owner.team]){ if(e.dead || b.hitSet.has(e)) continue; if(hyp(e.x-b.m.position.x, e.z-b.m.position.z) < (e.r||0.6)+0.3){ hit(e, b.dmg, b.owner); b.hitSet.add(e); burst(b.m.position.x,1,b.m.position.z,0xfff1b0,4,3); if(b.pierce-- <= 0){ b.life = 0; break; } } }
    if(b.life <= 0 || blocked(b.m.position.x, b.m.position.z, 0.05)){ scene.remove(b.m); BOLTS.splice(i,1); } }
  for(let i=PINBALLS.length-1;i>=0;i--){ const b = PINBALLS[i]; b.life -= dt; let nx = b.x + b.vx*dt, nz = b.z + b.vz*dt;
    if(blocked(nx, b.z, 0.4) || nx < BOUNDS.x0+1 || nx > BOUNDS.x1-1){ b.vx = -b.vx; nx = b.x; tone(600, 0.04, 'square', 0.02); } if(blocked(b.x, nz, 0.4) || nz < BOUNDS.z0+1 || nz > BOUNDS.z1-1){ b.vz = -b.vz; nz = b.z; tone(700, 0.04, 'square', 0.02); }
    b.x = nx; b.z = nz; b.m.position.set(b.x, 0.5, b.z); b.m.rotation.x += dt*10;
    for(const e of ENEMY[b.owner.team]){ if(e.dead) continue; if(hyp(e.x-b.x, e.z-b.z) < (e.r||0.6)+0.4 && (b.hitT.get(e)||0) < gt){ b.hitT.set(e, gt+0.4); hit(e, dmgOf(b.owner,'pinball',ABIL.pinball.dmg), b.owner, {knock:2, fx:b.x, fz:b.z}); burst(b.x,0.6,b.z,0x9fd4ff,6,4); } }
    if(b.life <= 0){ burst(b.x,0.6,b.z,0x9fd4ff,20,6); scene.remove(b.m); PINBALLS.splice(i,1); } }
  for(let i=LOBS.length-1;i>=0;i--){ const L = LOBS[i]; L.f += dt*1.6; const f = Math.min(1, L.f); L.m.position.set(L.x0+(L.x1-L.x0)*f, 1+Math.sin(f*Math.PI)*4.5, L.z0+(L.z1-L.z0)*f);
    if(f >= 1){ areaHit(L.owner, L.x1, L.z1, L.rad, L.dmg, {slow:L.slow}); ringFx(L.x1, L.z1, L.rad, 0xff3b5c, 0.35); burst(L.x1,1,L.z1,0xff3b5c,24,7); scene.remove(L.m); LOBS.splice(i,1); if(L.owner.isPlayer) SFX.pop(); } }
  for(let i=BOMBS.length-1;i>=0;i--){ const B = BOMBS[i]; B.fuse -= dt; const s = 1 + (1-B.fuse)*0.8; B.m.scale.set(s, s*(1+0.1*Math.sin(gt*30)), s); if(Math.random()<0.2) puff(B.x, 0.8, B.z, 0x5a4a1a, 1, 0.3);
    if(B.fuse <= 0){ const A = ABIL.poop, R = areaOf(B.owner,'poop',A.rad); areaHit(B.owner, B.x, B.z, R, dmgOf(B.owner,'poop',A.dmg), {knock:1.8}); burst(B.x,0.6,B.z,0x7a5a22,30,8); puff(B.x,0.5,B.z,0x8adc4a,12,R*0.5); ringFx(B.x,B.z,R,0x9adc4a,0.4); discFx(B.x, B.z, R, 0x6a8a2a, 0.35);
      if(B.owner.isPlayer){ SFX.fart(0.3); noise(0.2, 0.12, null, {freq:600}); } scene.remove(B.m); BOMBS.splice(i,1); } }
  for(let i=TRAILS.length-1;i>=0;i--){ const T = TRAILS[i]; T.life -= dt; T.m.material.opacity = 0.45*T.life/T.max; if(T.puffy && Math.random()<0.15) puff(T.x, 0.4, T.z, T.col, 1, 0.6); else if(Math.random()<0.08) burst(T.x+rnd(-0.5,0.5), 0.2, T.z+rnd(-0.5,0.5), T.col, 1, 1, -1);
    for(const e of ENEMY[T.owner.team]) if(!e.dead && hyp(e.x-T.x, e.z-T.z) < T.rad + (e.r||0.6)*0.5) hit(e, T.dps*dt, T.owner);
    if(T.life <= 0){ scene.remove(T.m); TRAILS.splice(i,1); } }
  for(const h of HEROES) if(h.fx.smoke){ const S = h.fx.smoke; S.t -= dt; for(const e of ENEMY[h.team]) if(e.kind==='ghost' && hyp(e.x-S.x, e.z-S.z) < S.R){ e.slowT = Math.max(e.slowT, 0.5); e.temper = 'wildcard'; e.mode = 'scatter'; e.sx = e.x + rnd(-10,10); e.sz = e.z + rnd(-10,10); } if(S.t <= 0) h.fx.smoke = null; }
  for(let i=ALLIES.length-1;i>=0;i--){ const a = ALLIES[i], o = a.owner; a.life -= dt; if(o.dead || a.life <= 0 || (!a.temp && !o.micro.buddy)){ burst(a.x,1,a.z,0x9fd4ff,14,5); scene.remove(a.g); ALLIES.splice(i,1); continue; } let best = null, bd = 22; for(const e of ENEMY[o.team]){ if(e.kind!=='ghost' || e.dead) continue; const d = hyp(e.x-a.x, e.z-a.z); if(d < bd){ bd = d; best = e; } }
    const tx = best?best.x:o.x+Math.cos(gt+i)*3, tz = best?best.z:o.z+Math.sin(gt+i)*3, dx = tx-a.x, dz = tz-a.z, d = hyp(dx,dz)||1; a.x += dx/d*Math.min(d, 10*dt); a.z += dz/d*Math.min(d, 10*dt);
    a.g.position.set(a.x, Math.sin(gt*4+i)*0.2, a.z); a.g.rotation.y = Math.atan2(dx,dz); if(best && bd < 1.3) hit(best, (a.temp?ABIL.gang.dps:18*(1+0.2*o.micro.buddy))*o.mods.dmg*dt, o); }
}
function eatDot(P, i, h, x, z){
  P.alive[i] = false; P.left--; P.eaten++;
  if(h.isPlayer){ ST.dots++; addScore(10); chain = (gt - lastDotT < 0.55) ? chain+1 : 0; lastDotT = gt; SFX.dot(Math.min(chain, 15)); if(chain === 25) heroSay(h, 'streak'); }
  gainXP(h, 1);
  if(P.left <= 0 && !P.hw){ // a moving set piece's last dot explodes for a bonus
    burst(x, 0.8, z, 0xffe14d, 50, 13); burst(x, 0.8, z, 0xffffff, 22, 6); ringFx(x, z, 6, 0xffe14d, 0.5); discFx(x, z, 6, 0xffe14d, 0.25); areaHit(h, x, z, 6, 20, {knock:3});
    if(h.isPlayer){ ST.patterns++; const bonus = P.n*15; addScore(bonus); big('+'+Math.round(bonus*scoreMult()), 700, 'small'); SFX.boom(0.6); addShake(0.25);
      hyper = Math.min(5, hyper+1); hyperDecay = 8; toast('learn:pat', 'Clear a whole spinning pattern and its last dot explodes — and stacks HYPER: faster, with motion blur.'); }
    gainXP(h, Math.ceil(P.n/5));
  }
}

// ================= RENDER =================
const camLook = new THREE.Vector3(), camWant = new THREE.Vector3(), camLookWant = new THREE.Vector3();
const LCUR = LOOK.LIGHT_DIR.clone(), LKEY = new THREE.Vector3(), UPV = new THREE.Vector3(0.25, 1.1, 0); LOOK.hatchU.uLight.value = LCUR;   // ink key light (shared uniform) const STUN_COL = new THREE.Color(0xc09aff);
function render(rdt){
  const P0 = player(), inMenu = state==='menu', mainOpen = !$('mainMenu').classList.contains('hide'), live = state==='play'||state==='vacuum'||state==='showdown', pdt = (state==='pause'||state==='jack'||state==='tally') ? 0 : rdt;
  for(const h of HEROES){ if(h.dead) continue; animRig(h.rig, h.x, h.z, h.face, hyp(h.vx,h.vz), h.walk, h.grow, {y:h.hopY||0, throwT:h.throwT, chomp:h.lungeT>0||h.ballT>0, flash:h.hurtT>0 || (h.grace>0 && Math.floor(rtime*12)%2)}); h.ring.material.opacity = 0.45 + 0.2*Math.sin(rtime*4); }
  if(BOSS && BOSS.alive){ animRig(BOSS.rig, BOSS.x, BOSS.z, BOSS.face, BOSS.moving?4:0, BOSS.walk, 1.55, {throwT:BOSS.throwPose, flash:BOSS.hitT>0, armsUp:state==='showdown' && sd && sd.t>0.4 && sd.t<2.4}); BOSS.hitT -= rdt; BOSS.throwPose = Math.max(0, BOSS.throwPose - rdt); }
  if(inMenu && menuHero) animRig(menuHero, 0, -30, Math.sin(rtime*0.4)*0.5, 0, 0, 1, {});
  const beat = rtime*(TRACKS[track]||TRACKS.club).bpm/60, onBeat = (beat%1) < 0.15;
  animateWorld(rdt, rtime, P0 && !inMenu ? P0.z : -30, beat);
  // dots: runway-light twinkle + flutter (or the vacuum)
  let n = 0;
  if(state==='vacuum'){ for(const v of vacItems){ if(n >= DMAX) break; dummy.position.set(v.x, 0.8, v.z); dummy.rotation.set(0,0,0); dummy.scale.setScalar(v.kind==='dot'?1:2); dummy.updateMatrix(); dotMesh.setMatrixAt(n, dummy.matrix); dotMesh.setColorAt(n, tmpC.setHex(v.kind==='gem'?v.col:v.kind==='orb'?0x4aa8ff:v.kind==='coin'?0xffd040:0xfff8d0).multiplyScalar(1.4)); n++; } }
  else for(const P of PATS){ for(let i=0;i<P.n;i++){ if(!P.alive[i] || n >= DMAX) continue; const [x,z] = dotPos(P,i); const s = 0.5+0.5*Math.sin(rtime*(P.hw?7:10) - i*(P.hw?0.45:0.6)), pop = Math.min(1, (gt-P.born)*3+0.05);
      dummy.position.set(x, 0.5 + s*0.12, z); dummy.rotation.set(0,0,0); dummy.scale.setScalar((0.75 + s*0.5)*pop*(P.hw?0.9:1.05)); dummy.updateMatrix(); dotMesh.setMatrixAt(n, dummy.matrix);
      const prog = P.eaten/P.n; if(P.hw) tmpC.setRGB(1.0+s*0.5, 0.95+s*0.45, 0.75+s*0.3); else tmpC.setRGB(1.0+s*0.4, 0.85+s*0.3-prog*0.3, 0.45+s*0.3-prog*0.3); dotMesh.setColorAt(n, tmpC); n++; } }
  dotMesh.visible = !((inMenu && mainOpen) || sheetMode==='loadout' || sheetMode==='pause');
  dotMesh.count = n; dotMesh.instanceMatrix.needsUpdate = true; dotMesh.instanceColor.needsUpdate = true;
  renderCrowd(rtime, onBeat);
  // ghosts
  ghostM.count = ghostO.count = eyesM.count = G.length;
  for(let i=0;i<G.length;i++){ const g = G[i], s = g.scale*(g.hitT>0?1.12:1)*(g.lungeT>0.3?1.1+0.08*Math.sin(rtime*40):1);
    const scared = blueT>0 && !g.big; dummy.position.set(g.x, Math.sin(g.bob)*0.14*g.scale + (g.lungeT>0&&g.lungeT<0.3?0.3:0), g.z); dummy.rotation.set(g.lungeT>0&&g.lungeT<0.3?0.35:0, g.face + (scared?Math.PI:0), g.stunT>0?0.3:0); dummy.scale.set(s,s,s); dummy.updateMatrix();
    ghostM.setMatrixAt(i, dummy.matrix); ghostO.setMatrixAt(i, dummy.matrix); eyesM.setMatrixAt(i, dummy.matrix);
    if(g.hitT>0) tmpC.setRGB(1.4,1.4,1.4); else if(scared) tmpC.setHex(blueT<2 && Math.floor(rtime*8)%2 ? 0xffffff : 0x2a4aff); else tmpC.setHex(GHOST_TYPES[g.type].col);
    if(g.stunT > 0) tmpC.lerp(STUN_COL, 0.5); if(g.lungeT > 0.3) tmpC.lerp(new THREE.Color(1,1,1), 0.35); ghostM.setColorAt(i, tmpC); }
  ghostM.instanceMatrix.needsUpdate = ghostO.instanceMatrix.needsUpdate = eyesM.instanceMatrix.needsUpdate = true; ghostM.instanceColor.needsUpdate = true;
  gemMesh.count = Math.min(900, GEMS.length); for(let i=0;i<gemMesh.count;i++){ const g = GEMS[i]; dummy.position.set(g.x, 0.6+Math.sin(rtime*4+i)*0.12, g.z); dummy.rotation.set(0, rtime*2, 0); dummy.scale.setScalar(g.bonus?1.5:1); dummy.updateMatrix(); gemMesh.setMatrixAt(i, dummy.matrix); gemMesh.setColorAt(i, tmpC.setHex(GHOST_TYPES[g.type].col).multiplyScalar(1.5)); }
  gemMesh.instanceMatrix.needsUpdate = true; gemMesh.instanceColor.needsUpdate = true;
  updateFx(rdt, pdt);
  // ---- camera ----
  const sheetOpen = sheetMode==='pause' || sheetMode==='loadout';
  if(inMenu && (mainOpen || sheetMode==='loadout')){ const a = rtime*0.25; camWant.set(Math.sin(a)*1.5+1.2, 2.4, -30 + 6.2); camLookWant.set(0, 1.1, -30); }
  else if(inMenu){ camWant.set(Math.sin(rtime*0.1)*8, 22, -10 - ((rtime*3)%60)); camLookWant.set(0, 0, camWant.z - 22); }
  else if(state==='showdown' && sd){ const t = sd.t;
    if(t < 2.6){ camWant.set(BOSS.x + 3.2, 3.0, BOSS.z + 8.5); camLookWant.set(BOSS.x, 2.2, BOSS.z); }
    else if(t < 4.3){ camWant.set(P0.x - 2.5, 2.4, P0.z + 6.5); camLookWant.set(P0.x, 1.1, P0.z); }
    else { const side = SW > SH ? 7 : 0; camWant.set(P0.x*0.5 + side, SW > SH ? 10 : 13, P0.z + (SW > SH ? 12 : 15)); camLookWant.set((P0.x+BOSS.x)/2, 1, (P0.z+BOSS.z)/2); } }   // wide: over Pac's shoulder, both in frame (portrait too)
  else if(P0 && (state==='pause' || (inspect && state==='play'))){ const a = P0.face + 0.45 + (state==='pause'?rtime*0.35:0); camWant.set(P0.x + Math.sin(a)*6.2*P0.grow, 2.6*P0.grow, P0.z + Math.cos(a)*6.2*P0.grow); camLookWant.set(P0.x, 0.95*P0.grow, P0.z); }
  else if(P0){ const far = isMobile ? (SW < SH ? 1.25 : 1.05) : 1, bg = P0.ballT>0 ? 1.2 : 1, bossPull = (BOSS && BOSS.alive && BOSS.awake) ? clamp((BOSS.z - P0.z)*0.45, -9, 0) : 0;
    const lz = Math.min(P0.z, BOUNDS.z1 - (isMobile && SW < SH ? 20 : 13));   // never show the void behind the entrance wall
    camWant.set(P0.x*0.75, 21*far*bg, lz + 19*far*bg + bossPull); camLookWant.set(P0.x*0.75, 0, lz + 1 + bossPull); }
  else { camWant.copy(camera.position); camLookWant.copy(camLook); }
  const k1 = state==='showdown' ? 3.5 : inMenu ? 3 : 7; camLook.lerp(camLookWant, Math.min(1, k1*rdt)); camera.position.lerp(camWant, Math.min(1, (state==='showdown'?3:inMenu?2:6)*rdt));
  if(shake > 0){ camera.position.x += rnd(-1,1)*shake*0.6; camera.position.y += rnd(-1,1)*shake*0.4; shake = Math.max(0, shake - rdt*2.5); }
  camera.lookAt(camLook);
  const close = state==='showdown' || state==='pause' || (inMenu && (mainOpen || sheetMode==='loadout')) || (inspect && state==='play');
  if(close) LKEY.copy(camera.position).sub(camLook).setY(0).normalize().multiplyScalar(0.9).add(UPV).normalize(); else LKEY.copy(LOOK.LIGHT_DIR);
  LCUR.lerp(LKEY, Math.min(1, 5*rdt)).normalize();
  bloom.strength += ((close ? 0.42 : 0.8) - bloom.strength)*Math.min(1, 4*rdt);   // close-ups glow less, so floor lights don't wash out faces
  if(sheetOpen){ const r = $('doll').getBoundingClientRect(), s = $('screen').getBoundingClientRect(); const dx = r.left + r.width/2 - s.left, dy = r.top + r.height/2 - s.top; camera.setViewOffset(SW, SH, SW/2 - dx, SH/2 - dy, SW, SH); }
  else if(inMenu && mainOpen) camera.setViewOffset(SW, SH, -SW*(isMobile?0.05:0.2), -SH*(isMobile?-0.1:0.02), SW, SH);
  else camera.clearViewOffset();
  for(const sg of SIGNS){ let o = 1; if(!inMenu && P0){ o = clamp((P0.z - sg.position.z - 2)/10, 0, 1); if(state==='pause' || inspect || state==='showdown') o = hyp(P0.x-sg.position.x, P0.z-sg.position.z) < 30 ? 0 : o; } else if(inMenu && sheetMode==='loadout') o = 0; if(!inMenu && o > 0){ const [, sy] = project(sg.position.x, sg.position.y, sg.position.z); o *= clamp((sy - 70)/80, 0, 1); } sg.material.opacity = o; sg.visible = o > 0.01; }
  cv.style.filter = blueT > 0 && state==='play' ? 'invert(0.9) hue-rotate(180deg)' : '';
  drawGlitch();
  afterimage.enabled = SAVE.set.blur && state==='play' && hyper > 0; if(afterimage.enabled) afterimage.uniforms.damp.value = Math.min(0.88, 0.6 + hyper*0.06);
  composer.render(rdt);
  if(live || state==='pause' || state==='jack'){ if(state!=='showdown'){ updateHud(); updateTags(); } flushDn(G, false); if(BOSS) flushDn([BOSS], false); if(P0) flushDn([P0], true); }
  updateDn(rdt);
}
const gcv = $('glitch'), gx = gcv.getContext('2d');
function drawGlitch(){ if(gcv.width !== (SW|0)){ gcv.width = SW|0; gcv.height = SH|0; } gx.clearRect(0,0,gcv.width,gcv.height); if(glitchT<=0){ gcv.style.opacity = 0; return; } gcv.style.opacity = 1;
  const up = Math.cos(glitchDir) < 0, y0 = up?0:gcv.height/2; for(let i=0;i<300;i++){ gx.fillStyle = ['#00ffcc','#ff2fd0','#ffe14d','#2f6bff','#000'][i%5]; gx.fillRect(Math.random()*gcv.width, y0+Math.random()*gcv.height/2, 8+Math.random()*70, 6+Math.random()*18); } }

// ================= LOOP + BOOT =================
let lastT = performance.now();
function loop(now){
  const rdt = Math.max(0, Math.min(0.05, (now-lastT)/1000)); lastT = now; rtime += rdt; LOOK.tick(rtime);
  requestAnimationFrame(loop);
  if(state==='boot' || state==='intro') { music(); return; }
  try{ let dt = rdt * ((state==='play'||state==='vacuum') ? SAVE.set.speed : 1); if(slowmo > 0){ slowmo -= rdt; dt *= 0.3; }
    if(state==='play'){ gt += dt; update(dt); } else if(state==='vacuum'){ gt += dt; updateVacuum(dt); } else if(state==='showdown'){ gt += rdt; updateShowdown(rdt); } else if(state==='menu'){ gt += rdt; }
    render(rdt); music(); }
  catch(e){ console.error(e); }
}
function boot(){
  resize(); requestAnimationFrame(loop);
  LOOK.loadAll().then(M=>{ MODELS = M; buildWorld(M); buildDots(); buildPickups(); buildFx(); buildDn(); buildCrowd(); buildGhosts(); buildGems();
    $('loading').classList.add('hide'); toMenu();
    window.__pac = {get state(){ return state; }, get P(){ return player(); }, ST, get BOSS(){ return BOSS; }, start:(m,o)=>startRun(m||'campaign',o), give:n=>gainXP(player(), n),
      choose:i=>{ if(jackOffers) chooseOffer(jackOffers[i]); }, get offers(){ return jackOffers; }, SAVE, toMenu, openPause, closePause, openSheet, get HEROES(){ return HEROES; }, get G(){ return G; }, get PATS(){ return PATS; }, playIntro};
  }).catch(e=>{ $('loading').textContent = 'Could not load the models: '+e; console.error(e); });
}
boot();
