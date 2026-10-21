// PAC v0.9 — main.js: game modes, the update loop, the boss SHOWDOWN, camera, rendering, boot.
"use strict";
let state = 'boot', MODE = 'campaign', gateOpen = false, wave = 0, waveT = 0;
let gt = 0, rtime = 0, slowmo = 0;               // game time (scaled by the speed setting) / real time
const ST = {score:0, dots:0, patterns:0, ghosts:0, civ:0, props:0, boss:0, time:0, coins:0};
const PVP = {size:[1,1], target:10, kills:[0,0]};
let chain = 0, lastDotT = -9, hyper = 0, hyperDecay = 0, packT = 4, orbT = 45, refillT = 30, idleT = 30, buffT = 20, rushT = 60;
// v0.10: the playable LANE (Brent: "make them feel more like lanes and guided paths") — 36 m wide down the middle of the club;
// the lounges, bars and booths either side are scenery behind rails
const LANE_X = 18;
const addScore = n => { ST.score += n*scoreMult(); };

function clearWorld(){
  HEROES.forEach(h=>{ scene.remove(h.rig.root); h.spikes.forEach(s=>scene.remove(s)); (h.fx.orb||[]).forEach(o=>scene.remove(o)); if(h.fx.cold) scene.remove(h.fx.cold); }); HEROES = []; clearBuffs();
  if(BOSS){ scene.remove(BOSS.rig.root); BOSS = null; } $('bossBar').classList.add('hide');
  for(const arr of [BOMBS, BOLTS, LOBS, TRAILS, SHOTS, ALLIES, PINBALLS]){ arr.forEach(o=>scene.remove(o.m||o.g)); arr.length = 0; }
  CRE.forEach(c=>{ scene.remove(c.ball); if(c.model) scene.remove(c.model); }); CRE.length = 0; JAWS.forEach(j=>scene.remove(j.g)); JAWS.length = 0;
  ZAPS.forEach(z=>scene.remove(z.l)); ZAPS.length = 0; FX.forEach(f=>scene.remove(f.m)); FX.length = 0; ORBS.forEach(o=>scene.remove(o.g)); ORBS.length = 0;
  resetProps(); resetBalloons(); clearPickups(); clearFirebars(); resetDots();
  G = []; GEMS.length = 0; CIV = []; debuted.clear(); pendingLv.length = 0; TAGS.forEach(el=>el.remove()); TAGS.clear();
  setGate(false); gateOpen = false; blueT = 0; hyper = 0; glitchT = 0;
}
function startRun(mode, opts={}){
  audio(); clearWorld(); MODE = mode; hideAllOverlays(); state = 'play'; heroId = 0; shownToasts.clear(); toastQ.length = 0;
  if(menuHero){ scene.remove(menuHero.root); menuHero = null; }
  Object.assign(ST, {score:0, dots:0, patterns:0, ghosts:0, civ:0, props:0, boss:0, time:0, coins:0}); chain = 0; eatChain = 0; wave = 0; waveT = 25;
  packT = 3; orbT = 50; refillT = 30; idleT = 30; buffT = 18; rushT = 60; hurtAcc = 0; gt = 0; slowmo = 0;
  if(mode==='pvp'){ BOUNDS = {x0:LANE.x0, x1:LANE.x1, z0:-108, z1:-2}; PVP.kills = [0,0]; PVP.size = opts.size || [1,1]; PVP.target = opts.target || 10;
    HEROES.push(newHero(SAVE.char, 0, true, 0, -10));
    for(let i=1;i<PVP.size[0];i++) HEROES.push(newHero(pick(SAVE.unlocked), 0, false, -7+i*7, -8));
    for(let i=0;i<PVP.size[1];i++) HEROES.push(newHero(pick(SAVE.unlocked), 1, false, -7+i*7, -96));
    HEROES.forEach(h=>{ h.spawn = [h.x, h.z]; if(h.team===1) h.face = 0; if(!h.isPlayer) h.name = (h.team?'Rival ':'Ally ')+CHARS[h.char].name; });
    seedRoom(1, true); seedPickups(1); }
  else { BOUNDS = Object.assign({}, LANE, {x0:-LANE_X, x1:LANE_X}); HEROES.push(newHero(SAVE.char, 0, true, 0, 27)); if(mode==='campaign') makeBoss();
    seedRoom(0, false); seedPickups(0); }
  applyLoadout(player());
  seedCivilians(); buildSkillHud(); $('hud').classList.remove('hide'); $('topR').classList.remove('hide'); $('touch').classList.remove('hide'); document.body.classList.add('inplay'); resize();
  $('pvpBox').classList.toggle('hide', mode!=='pvp');
  $('wName').textContent = mode==='pvp' ? `PVP · ${PVP.size[0]}v${PVP.size[1]}` : mode==='endless' ? 'ENDLESS · THE CLUB' : 'WORLD 1 · THE CLUB';
  $('bestN').textContent = Math.round(SAVE.best[mode]||0).toLocaleString();
  setTrack('club'); afterimage.enabled = false; bloom.enabled = SAVE.set.bloom && Q.level===2;
  const P0 = player(); setTimeout(()=>{ if(state==='play') heroSay(P0,'start',true); }, 700);
  setTimeout(()=>toast('learn:dots10', mode==='pvp' ? 'Eat dots and ghosts to level up. Take out the other team.' : 'Follow the dots up the club. Kill everything that comes at you. Smash whatever is in the way.'), 1600);
  setTimeout(()=>toast('learn:ctrl8'+(isMobile?'m':'d'), isMobile ? 'Left thumb moves. A, B and C fire your actives. Swipe on the right side to warp. ☰ pauses.' : 'WASD moves, the mouse aims. Left click, right click and E fire your actives. SPACE warps. ESC pauses.'), 2000);
  camera.position.set(P0.x, 30, P0.z+24); camLook.set(P0.x, 0, P0.z);
}
function toMenu(){ document.body.classList.remove('inplay'); clearWorld(); state = 'menu'; hideAllOverlays(); $('hud').classList.add('hide'); $('topR').classList.add('hide'); $('touch').classList.add('hide'); cv.style.filter = ''; resize();
  BOUNDS = Object.assign({}, LANE); seedCivilians(); CIV = CIV.filter(c=>!(Math.abs(c.x) < 16 && c.z < -16 && c.z > -38));   // keep the space in front of the menu camera clear
  seedRoom(1, false); PATS = PATS.filter(P=>P.k==='path' ? false : true);
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
  for(const [x,z] of [[-14,-392],[14,-392],[-14,-426],[14,-426]]) addPick('fruit', x, z);   // the boss room has heals, and nothing else to chase
  toast(null,'Ball Boy is waiting on the main stage at the top of the club. Follow the gold arrow — and keep growing on the way.', 6000);
  seededRooms.delete(4); seedRoom(4, true); }
function breakProp(P, h, byWalk){ if(P.broken) return; P.broken = true; setPropVisible(P, false); const i = WALLS.indexOf(P); if(i>=0) WALLS.splice(i,1);
  const cx = (P.x0+P.x1)/2, cz = (P.z0+P.z1)/2; burst(cx,1,cz,P.color,34,9); burst(cx,1,cz,0x9a90a8,24,7); SFX.boom(0.5); if(h && h.isPlayer){ ST.props++; addScore(25); }
  if(byWalk && h){ h.energy = Math.max(0, h.energy - P.cost); if(h.isPlayer){ if(Math.random()<0.4) heroSay(h,'smash'); toast('learn:smash','Tearing through furniture costs energy. Or just go around.'); } } }
// v0.10 (Brent: "break shit as you go"): walking into a table, stool, speaker, booth or road case smashes it — no energy cost
function pushProp(h, w, dt){ if(!w.prop || w.cost <= 0 || (!h.isPlayer && MODE!=='pvp')) return; breakProp(w, h, false); }
function botThink(h, dt){
  const ai = h.ai; ai.t = (ai.t||0) - dt; let tg = null, bd = 1e9;
  for(const e of HEROES) if(e.team !== h.team && !e.dead){ const d = hyp(e.x-h.x, e.z-h.z); if(d < bd){ bd = d; tg = e; } }
  let mx = 0, mz = 0;
  if(tg && bd < 30){ const want = h.char==='pac' ? 1.5 : 7, dx = tg.x-h.x, dz = tg.z-h.z, s = bd > want ? 1 : -0.7, sw = Math.sin(gt*0.9 + h.id*2);
    mx = dx/bd*s - dz/bd*0.55*sw; mz = dz/bd*s + dx/bd*0.55*sw; h.ax = dx/bd; h.az = dz/bd; h.aimPx = tg.x; h.aimPz = tg.z;
    if(bd < 9) useActive(h, 0); if(bd < 5 || h.hp < h.maxhp*0.45) useActive(h, 1); if(bd < 8 && Math.random() < dt) useActive(h, 2); if(h.moveOk && bd > 12 && Math.random() < dt*0.5) useMove(h); }
  else { if(!ai.wp || ai.t <= 0){ ai.t = 3; ai.wp = [rnd(BOUNDS.x0+4, BOUNDS.x1-4), rnd(BOUNDS.z0+4, BOUNDS.z1-4)]; } const dx = ai.wp[0]-h.x, dz = ai.wp[1]-h.z, d = hyp(dx,dz)||1; mx = dx/d; mz = dz/d;
    const g = nearest(h, 12); if(g){ const gd = hyp(g.x-h.x,g.z-h.z)||1; h.ax = (g.x-h.x)/gd; h.az = (g.z-h.z)/gd; h.aimPx = g.x; h.aimPz = g.z; useActive(h, 0); } }
  const l = hyp(mx,mz); return l > 0 ? [mx/l, mz/l] : [0,0];
}

// ================= THE BOSS SHOWDOWN: the game takes the camera, sets the stage, then hands you the fight =================
let sd = null;
function startShowdown(){ state = 'showdown'; sd = {t:0, popped:false}; const P0 = player(); P0.vx = P0.vz = 0; setTrack('boss');
  for(const g of G){ if(!g.dead){ g.dead = true; puff(g.x, 1, g.z, 0xffffff, 4, 0.8); } } G = G.filter(g=>!g.dead);
  // the fight room is clean: no dots, no coins, no wandering crowd — just him, his team and a few heals
  PATS = PATS.filter(P => P.az > STAGE_Z); for(let i=PICKS.length-1;i>=0;i--) if(PICKS[i].z < STAGE_Z && PICKS[i].kind!=='fruit'){ scene.remove(PICKS[i].g); PICKS.splice(i,1); }
  CIV = CIV.filter(c => c.fixed || c.z > STAGE_Z); clearBuffs(); ORBS.forEach(o=>scene.remove(o.g)); ORBS.length = 0;
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
  if(sd.t > 1.2 && !sd.popped){ sd.popped = true; BOSS_TEAM.forEach((k,i)=>{ const a = -1.2 + i*0.8; const m = LOOK.piece(MODELS,'creatures',CRE_INFO[k].model,{outline:0.025}); m.scale.setScalar(1.2); m.position.set(BOSS.x + Math.sin(a)*3.6, 0, BOSS.z + Math.cos(a)*3.6); setTimeout(()=>SFX.cry(k), i*300); m.rotation.y = Math.atan2(P0.x-m.position.x, P0.z-m.position.z); scene.add(m); sd['m'+i] = m; burst(m.position.x, 1, m.position.z, 0xffffff, 20, 7); }); SFX.pop(); }
  if(sd.t > 2.6 && !sd.pac){ sd.pac = true; for(let i=0;i<4;i++){ const m = sd['m'+i]; if(m){ zapLine(m.position.x, m.position.z, BOSS.x, BOSS.z, 0xff4a4a, 1); scene.remove(m); } } heroSay(P0,'bossIn',true); bigCard(CHARS[P0.char].name.toUpperCase(), 'THE CHALLENGER'); }
  if(sd.t > 4.3 && !sd.vs){ sd.vs = true; big('SHOWDOWN!', 1200); SFX.boom(1); addShake(0.5); }
  if(sd.t > 5.6){ scene.remove(sd.pool); scene.remove(sd.beam); document.body.classList.remove('cine'); state = 'play'; BOSS.awake = true; $('bossBar').classList.remove('hide'); $('hud').classList.remove('hide'); $('touch').classList.remove('hide'); P0.grace = 1.5; sd = null;
    toast('learn:boss','Ball Boy throws one creature at a time. Red on the floor = get out. He can only go down after you\'ve faced all three.', 6500); }
}
function bigCard(title, sub){ const el = $('card'); el.innerHTML = `<div class="ct">${title}</div><div class="cs">${sub}</div>`; el.classList.remove('on'); void el.offsetWidth; el.classList.add('on'); }

// ================= UPDATE =================
function update(dt){
  const P0 = player(); if(!P0) return; ST.time += dt; buildTargets(); const D = diff();
  hyperDecay -= dt; if(hyperDecay <= 0 && hyper > 0){ hyper--; hyperDecay = 8; }
  blueT = Math.max(0, blueT-dt); glitchT = Math.max(0, glitchT-dt);
  idleT -= dt; if(idleT <= 0){ idleT = rnd(25,45); heroSay(P0, 'idle'); }
  if(MODE==='campaign' && !gateOpen && P0.level >= 4 && P0.act[1]) openGate();
  if(MODE==='endless'){ waveT -= dt; if(waveT <= 0){ wave++; waveT = 40; big('WAVE '+wave, 1100); const n = Math.round((10+wave*5)*D.spawn); for(let i=0;i<n/4;i++) spawnPack(4, COLOUR_ORDER.slice(0, Math.min(7, 2+wave))); spawnGhost(pick(COLOUR_ORDER), true); } }
  // rooms fill as you approach them
  if(MODE!=='pvp'){ const ri = roomIndex(P0.z); for(const j of [ri, ri+1]) if(j < ROOMS.length && !seededRooms.has(j) && P0.z < ROOMS[j].z1 + 30){ if(j===5 && MODE==='campaign') continue; seedRoom(j, gateOpen); seedPickups(j); }
    refillT -= dt; if(refillT <= 0){ refillT = 28; let left = 0; for(const P of PATS) if(roomAt(P.az)===ROOMS[ri]) left += P.left; if(left < 50) refillRoom(ri); } }
  else { refillT -= dt; if(refillT <= 0){ refillT = 20; refillRoom(1); } }
  // ---- heroes ----
  for(const h of HEROES){
    if(h.dead){ if(MODE==='pvp'){ h.respawnT -= dt; if(h.respawnT <= 0) respawn(h); } continue; }
    let mx = 0, mz = 0;
    if(h.isPlayer){ [mx, mz] = moveInput(); playerAim(h); if(mouseDown[0]) useActive(h,0); if(mouseDown[2]) useActive(h,1); if(SAVE.set.autoCast) autoCast(h, dt); }   // v0.9 auto-cast
    else [mx, mz] = botThink(h, dt);
    h.iframes -= dt; h.stunT -= dt; h.slowT -= dt; h.moveCd -= dt; h.hurtT -= dt;
    h.energy = Math.min(h.maxEnergy, h.energy + 7*h.mods.regen*dt); h.hp = Math.min(h.maxhp, h.hp + h.mods.hpRegen*dt);
    let sp = CHARS[h.char].speed * h.mods.speed * (h.isPlayer ? 1 + hyper*0.05 : 1) * (h.buff.speed>0?1.3:1) * (h.ballT>0?1.45:1) * (h.sugarT>0?1.7:1) * (h.slowT>0?0.5:1);
    if(h.stunT > 0) sp = 0;
    let tvx = mx*sp, tvz = mz*sp; if(h.dashT > 0 && h.dash){ tvx = h.dash.dx*28; tvz = h.dash.dz*28; }
    const acc = h.dashT>0 ? 1 : Math.min(1, ((mx||mz) ? 14 : 18)*dt); h.vx += (tvx - h.vx)*acc; h.vz += (tvz - h.vz)*acc;
    h.kvx *= Math.pow(0.02, dt); h.kvz *= Math.pow(0.02, dt);
    const growT = (h.isPlayer && blueT>0 ? 1.35 : 1) * (h.ballT>0 ? 2.6 : 1); h.grow += (growT - h.grow)*Math.min(1, 6*dt); h.r = CHARS[h.char].r*(h.ballT>0 ? h.grow : 1);   // v0.10: blue-orb size is for show — he no longer jams in gaps
    if(h.hopT <= 0){ const nx = h.x + (h.vx+h.kvx)*dt, nz = h.z + (h.vz+h.kvz)*dt;
      const wx = blocked(nx, h.z, h.r); if(!wx) h.x = nx; else { pushProp(h, wx, dt); h.vx = 0; h.kvx = 0; }
      const wz = blocked(h.x, nz, h.r); if(!wz) h.z = nz; else { pushProp(h, wz, dt); h.vz = 0; h.kvz = 0; } }
    h.x = clamp(h.x, BOUNDS.x0+1, BOUNDS.x1-1); h.z = clamp(h.z, BOUNDS.z0+1, BOUNDS.z1-1);
    const spd = hyp(h.vx, h.vz); h.idleT = spd < 0.6 ? (h.idleT||0) + dt : 0;   // v0.9: standing still a moment = the swagger pose
    if(spd > 0.4 && h.lungeT <= 0){ h.face += angDiff(h.face, Math.atan2(h.vx, h.vz))*Math.min(1, 13*dt); }
    h.walk += spd*dt*2.4; if(h.isPlayer && spd > 1){ h.wakaT = (h.wakaT||0) - dt; if(h.wakaT <= 0 && h.char==='pac'){ h.wakaT = 0.22; SFX.waka(h.wakaK = !h.wakaK); } }
    runHero(h, dt);
    popNear(h.x, h.z, h.r + 0.7, h);   // walking through balloons pops them
  }
  if(hurtAcc > 25){ hurtAcc = 0; heroSay(P0,'hurt'); }
  // ---- dots ----
  for(const P of PATS){ for(let i=0;i<P.n;i++){ if(!P.alive[i]) continue; const [x,z] = dotPos(P,i);
    for(const h of HEROES){ if(h.dead) continue; const r = 1.0*h.grow + (h.buff.magnet>0?1.6:0) + (h.mods.pickup-1)*0.8; if(Math.abs(x-h.x) < r && Math.abs(z-h.z) < r && hyp(x-h.x, z-h.z) < r){ eatDot(P, i, h, x, z); break; } } } }
  PATS = PATS.filter(P => P.left > 0);
  // ---- pickups ----
  for(let i=PICKS.length-1;i>=0;i--){ const p = PICKS[i]; p.t += dt; p.g.rotation.y += dt*(p.kind==='coin'?3:1); p.g.position.y = 0.6 + Math.sin(p.t*3)*0.12 + floorY(p.x, p.z);
    for(const h of HEROES){ if(h.dead) continue; const d = hyp(p.x-h.x, p.z-h.z), R = (1.2 + (h.buff.magnet>0?3:0))*h.mods.pickup;
      if(p.kind==='coin' && d < R+2){ p.x += (h.x-p.x)*Math.min(1, dt*6); p.z += (h.z-p.z)*Math.min(1, dt*6); p.g.position.x = p.x; p.g.position.z = p.z; }
      if(d < 1.1){ if(p.kind==='fruit'){ if(h.hp >= h.maxhp-1 && h.isPlayer){ continue; } h.hp = Math.min(h.maxhp, h.hp + 28); burst(p.x,1,p.z,0x7cff8a,24,6); if(h.isPlayer){ SFX.coin(); big('+28 HP', 600, 'small'); toast('learn:fruit','Fruit heals you.'); } }
        else { if(h.isPlayer){ ST.coins++; addScore(50); SFX.coin(); toast('learn:coin','Coins: you keep them after the run and spend them in Loadout.'); } burst(p.x,1,p.z,0xffd23f,10,5); }
        scene.remove(p.g); PICKS.splice(i,1); break; } } }
  // ---- power-ups: one turns up ahead of you every 20-30 s (never more than two around) ----
  buffT -= dt; if(buffT <= 0 && MODE!=='pvp' && !(BOSS && BOSS.awake)){ buffT = rnd(20,30); if(BUFFS.length < 2) for(let n=0;n<20;n++){ const a = P0.face + rnd(-1,1), d = rnd(9,17), x = P0.x + Math.sin(a)*d, z = P0.z + Math.cos(a)*d;
      if(!blocked(x,z,1.2) && inLane(x,z) && !(MODE==='campaign' && z < STAGE_Z+2)){ spawnBuff(x, z, pick(Object.keys(BUFF_TYPES))); break; } } }
  for(let i=BUFFS.length-1;i>=0;i--){ const b = BUFFS[i]; b.t += dt; b.cap.rotation.y += dt*2; b.g.position.y = 1.1 + Math.sin(b.t*3)*0.2; b.ring.scale.setScalar(1 + 0.15*Math.sin(b.t*5));
    if(b.t > 40){ scene.remove(b.g); BUFFS.splice(i,1); continue; }
    for(const h of HEROES){ if(h.dead || hyp(b.x-h.x, b.z-h.z) > 1.5) continue; const T = BUFF_TYPES[b.type];
      if(b.type==='shield'){ h.shieldT = 6; h.shieldHP = 60; h.absorbed = 0; } else h.buff[b.type] = b.type==='xp' ? 12 : 10;
      burst(b.x, 1.2, b.z, T.col, 50, 10); ringFx(b.x, b.z, 4, T.col, 0.5); if(h.isPlayer){ big(T.n+'!', 900, 'small'); SFX.coin(); tone(660, 0.3, 'square', 0.05, 2); toast('learn:buff', `Power-up: ${T.n} — ${T.d} for a few seconds. They turn up now and then.`); }
      scene.remove(b.g); BUFFS.splice(i,1); break; } }
  // ---- fire bars ----
  for(const F of FIREBARS){ F.ang += F.speed*dt; F.g.rotation.y = F.ang; F.hitT = (F.hitT||0) - dt; const ex = Math.cos(F.ang), ez = -Math.sin(F.ang);
    for(const h of HEROES){ if(h.dead) continue; const px = h.x-F.x, pz = h.z-F.z, along = px*ex + pz*ez, off = Math.abs(px*ez - pz*ex); if(along > -0.3 && along < F.len && off < 0.5 + h.r*0.5 && F.hitT <= 0){ F.hitT = 0.7; hurtHero(h, 14, null); knock(h, F.x, F.z, 6); burst(h.x,1,h.z,0xff7a20,16,6); } }
    for(const g of G){ if(g.dead) continue; const px = g.x-F.x, pz = g.z-F.z, along = px*ex + pz*ez, off = Math.abs(px*ez - pz*ex); if(along > -0.3 && along < F.len && off < 0.8) { g.hp -= 30*dt; g.hitT = 0.05; if(g.hp <= 0) killGhost(g, null, false); } }
    if(hyp(P0.x-F.x, P0.z-F.z) < 16) toast('learn:firebar','Fire bars guard a stash of coins and fruit. Time your way in.'); }
  // ---- clubgoers ----
  // v0.10 (Brent: "just have bad guys"): clubgoers are scenery around the lane — they dance, and flinch when a fight comes close
  for(const c of CIV){ c.ph += dt*6; c.panic -= dt; if(c.panic <= 0 && Math.abs(c.z - P0.z) < 7 && Math.abs(c.x - P0.x) < 7) c.panic = 0.6; }
  // ---- v0.10 THE SWARM (Brent: "doesn't come off at Vampire Survivors pace — enemies don't come"). Vampire Survivors keeps a
  // MINIMUM number of enemies alive that rises every minute and tops it up from just off-screen; we do the same, ahead of and
  // behind you in the lane, twice a second. Every minute a RUSH pours down the lane at you. New colours still debut as one BIG ghost.
  const lv = P0.level, mins = ST.time/60;
  const cols = COLOUR_ORDER.filter((c,i)=> MODE!=='campaign' || lv >= COLOUR_LV[i]);
  if(MODE==='campaign' && !(BOSS && BOSS.intro)) for(const c of cols){ if(c!=='red' && !debuted.has(c) && !debuted.has('p_'+c)){ debuted.add('p_'+c); spawnGhost(c, true); } }
  const poolC = cols.filter(c=>c==='red' || debuted.has(c) || MODE!=='campaign'), smalls = G.filter(g=>!g.big && !g.dead).length;
  const want = MODE==='pvp' ? 10 : Math.round(Math.min(170, MODE==='endless' ? 24 + wave*10 : lv < 1 ? 0 : lv < 2 ? 6 : 16 + mins*12 + lv*2)*D.spawn);
  packT -= dt; if(packT <= 0 && !(BOSS && BOSS.awake)){ packT = 0.5; for(let i=0, n=Math.min(6, want - smalls); i<n; i++) spawnGhost(pick(poolC.length?poolC:['red'])); }
  rushT -= dt; if(rushT <= 0 && MODE!=='pvp' && lv >= 2 && !(BOSS && BOSS.awake)){ rushT = 60; spawnRush(Math.round((12 + mins*5)*D.spawn), poolC.length?poolC:['red']); big('HERE THEY COME', 1100, 'small'); }
  orbT -= dt; if(orbT <= 0 && (lv >= 1 || MODE!=='campaign')){ orbT = rnd(45,65); if(ORBS.length < 2){ let x, z, n = 0; do { x = P0.x + rnd(-16,16); z = P0.z - rnd(8,24); n++; } while((blocked(x,z,1) || !inLane(x,z) || (MODE==='campaign'&&!gateOpen&&z<STAGE_Z+2)) && n < 20); if(n<20) spawnOrb(x, z); } }
  for(let i=ORBS.length-1;i>=0;i--){ const o = ORBS[i]; o.ring.rotation.z += dt*1.5; o.g.lookAt(camera.position); for(const h of HEROES) if(!h.dead && hyp(o.x-h.x, o.z-h.z) < 1.4*h.grow){ eatOrb(i, h); break; } }
  for(const g of G){ if(g.dead) continue; g.bob += dt*4; g.hitT -= dt; g.slowT -= dt; g.stunT -= dt; g.modeT -= dt; g.lungeCd -= dt; g.frozenT = (g.frozenT||0) - dt;
    if(Math.random() < 0.03 && Math.abs(g.z-P0.z) < 30) puff(g.x + rnd(-0.4,0.4), 0.25, g.z + rnd(-0.4,0.4), GHOST_TYPES[g.type].col, 1, 0.3);   // ghostly wisps off the hem
    let tg = null, bd = 1e9; for(const h of HEROES){ if(h.dead) continue; const d = hyp(h.x-g.x, h.z-g.z); if(d < bd){ bd = d; tg = h; } } if(!tg) continue;
    if(g.temper==='wildcard' && g.modeT <= 0){ g.mode = g.mode==='chase' ? 'scatter' : 'chase'; g.modeT = g.mode==='chase' ? rnd(5,8) : rnd(2,3); g.sx = tg.x + rnd(-16,16); g.sz = tg.z + rnd(-12,12); }
    // VS keeps the swarm on you: anything left far behind comes back in from ahead
    if(bd > 46 && !g.big && MODE!=='pvp'){ const z = tg.z - rnd(26,32)*(Math.random()<0.75?1:-1), x = clamp(tg.x + rnd(-14,14), BOUNDS.x0+2, BOUNDS.x1-2); if(!blocked(x,z,0.8) && inLane(x,z)){ g.x = x; g.z = z; } continue; }
    let s = g.sp*(g.slowT>0?0.45:1)*(GHOST_MOVE[g.type]||1); if(g.stunT > 0) s = 0;
    const scared = blueT > 0 && !g.big && tg.isPlayer;
    g.kvx *= Math.pow(0.03, dt); g.kvz *= Math.pow(0.03, dt);
    if(g.lungeT > 0){ g.lungeT -= dt; if(g.lungeT < 0.3){ s = 9; } else s = 0; }
    else if(!scared && g.temper==='chaser' && lv >= 2 && bd < 4.5 && g.lungeCd <= 0){ g.lungeT = 0.65; g.lungeCd = rnd(3,5); }
    let [tx, tz] = scared ? [g.x + (g.x-tg.x), g.z + (g.z-tg.z)] : (bd < 5 ? [tg.x, tg.z] : ghostTarget(g, tg));
    // v0.10 each colour fights the way its face looks (Brent's sketch plan): green HOPS on its spring, orange STAGGERS, blue
    // WEAVES, teal (the engineer) keeps its distance and THROWS WRENCHES; red lunges, purple is slow and tough, black is fast
    if(!scared && g.stunT <= 0 && !g.big){
      if(g.type==='green'){ g.hopT = (g.hopT||Math.random()) - dt; if(g.hopT <= 0) g.hopT = 0.95; s *= g.hopT > 0.7 ? 3.4 : 0.2; }
      else if(g.type==='orange'){ const w = Math.sin(gt*2.3 + g.id); tx += -(tz-g.z)/(bd||1)*w*5; tz += (tx-g.x)/(bd||1)*w*5; if(Math.sin(gt*0.9 + g.id*3) > 0.93) s = 0; }
      else if(g.type==='blue'){ const w = Math.sin(gt*3.2 + g.id)*4; tx += -(tg.z-g.z)/(bd||1)*w; tz += (tg.x-g.x)/(bd||1)*w; }
      else if(g.type==='teal'){ if(bd < 7){ tx = g.x - (tg.x-g.x); tz = g.z - (tg.z-g.z); } else if(bd < 11){ tx = g.x - (tg.z-g.z); tz = g.z + (tg.x-g.x); s *= 0.6; }
        g.shotT = (g.shotT ?? rnd(1,3)) - dt; if(g.shotT <= 0 && bd < 15){ g.shotT = rnd(2.6,3.6); ghostShot(g, tg); } } }
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
  for(let i=BOLTS.length-1;i>=0;i--){ const b = BOLTS[i]; b.delay -= dt; const bx = b.m.position.x, bz = b.m.position.z;
    if(b.homing && b.delay <= 0){ if(!b.tg || b.tg.dead) b.tg = nearestFrom(b.owner.team, bx, bz, 20);      // homing shots find a new target if theirs dies
      if(b.tg){ const a = Math.atan2(b.tg.x-bx, b.tg.z-bz), sp = hyp(b.vx,b.vz), cur = Math.atan2(b.vx,b.vz); const na = cur + clamp(angDiff(cur, a), -b.turn*dt, b.turn*dt); b.vx = Math.sin(na)*sp; b.vz = Math.cos(na)*sp; } }
    if(b.boomer){ if(!b.back && b.life < b.half){ b.back = true; b.hitSet.clear(); }   // v0.9 Shank Hands: halfway out, the shiv turns round and comes home (and can hit everything again)
      if(b.back){ const o = b.owner, dx = o.x-bx, dz = o.z-bz, d = hyp(dx,dz)||1; b.vx = dx/d*24; b.vz = dz/d*24; b.backT += dt; b.life = (d < 1.2 || b.backT > 2 || o.dead) ? 0 : Math.max(b.life, 0.05); } b.m.rotation.y += dt*22; }
    b.m.position.x += b.vx*dt; b.m.position.z += b.vz*dt; b.life -= dt; if(b.boom) b.m.rotation.y = Math.atan2(b.vx, b.vz);
    if(b.el && Math.random() < 0.35) burst(b.m.position.x, b.m.position.y, b.m.position.z, EL[b.el].acc, 1, 1, 0, 0.3);
    for(const e of ENEMY[b.owner.team]){ if(e.dead || b.hitSet.has(e)) continue; if(hyp(e.x-b.m.position.x, e.z-b.m.position.z) < (e.r||0.6)+0.3){ hit(e, b.dmg, b.owner, {el:b.el}); b.hitSet.add(e); burst(b.m.position.x,1,b.m.position.z,b.col||0xfff1b0,4,3); if(b.pierce-- <= 0){ b.life = 0; break; } } }
    if(b.life <= 0 || (!b.boomer && blocked(b.m.position.x, b.m.position.z, 0.05))){ if(b.boom){ areaHit(b.owner, b.m.position.x, b.m.position.z, b.boom, b.dmg*0.6, {el:b.el, knock:1.5}); elBurst(b.el, b.m.position.x, 1, b.m.position.z, 26, 8); elRing(b.el, b.m.position.x, b.m.position.z, b.boom, 0.35); if(b.owner.isPlayer) SFX.pop(); }
      scene.remove(b.m); BOLTS.splice(i,1); } }
  for(let i=PINBALLS.length-1;i>=0;i--){ const b = PINBALLS[i]; b.life -= dt; let nx = b.x + b.vx*dt, nz = b.z + b.vz*dt;
    if(blocked(nx, b.z, 0.4) || nx < BOUNDS.x0+1 || nx > BOUNDS.x1-1){ b.vx = -b.vx; nx = b.x; tone(600, 0.04, 'square', 0.02); } if(blocked(b.x, nz, 0.4) || nz < BOUNDS.z0+1 || nz > BOUNDS.z1-1){ b.vz = -b.vz; nz = b.z; tone(700, 0.04, 'square', 0.02); }
    b.x = nx; b.z = nz; b.m.position.set(b.x, 0.5, b.z); b.m.rotation.x += dt*10;
    for(const e of ENEMY[b.owner.team]){ if(e.dead) continue; if(hyp(e.x-b.x, e.z-b.z) < (e.r||0.6)+0.4 && (b.hitT.get(e)||0) < gt){ b.hitT.set(e, gt+0.4); hit(e, dmgOf(b.owner,'bonusball',ABIL.bonusball.dmg), b.owner, {knock:2, fx:b.x, fz:b.z, el:'void'}); elBurst('void', b.x, 0.6, b.z, 6, 4); } }
    if(b.life <= 0){ burst(b.x,0.6,b.z,0x9fd4ff,20,6); scene.remove(b.m); PINBALLS.splice(i,1); } }
  for(let i=LOBS.length-1;i>=0;i--){ const L = LOBS[i]; L.f += dt*1.6; const f = Math.min(1, L.f); L.m.position.set(L.x0+(L.x1-L.x0)*f, 1+Math.sin(f*Math.PI)*4.5, L.z0+(L.z1-L.z0)*f);
    if(f >= 1){ areaHit(L.owner, L.x1, L.z1, L.rad, L.dmg, {slow:L.slow, el:'fire'}); ringFx(L.x1, L.z1, L.rad, 0xff3b5c, 0.35); elBurst('fire', L.x1, 1, L.z1, 24, 7); scene.remove(L.m); LOBS.splice(i,1); if(L.owner.isPlayer) SFX.pop(); } }
  for(let i=BOMBS.length-1;i>=0;i--){ const B = BOMBS[i];
    if(B.fly != null && B.fly < 1){ if(B.tg && !B.tg.dead){ B.x1 = B.tg.x; B.z1 = B.tg.z; } B.fly = Math.min(1, B.fly + dt/0.55); const f = B.fly;   // v0.9: a lobbed Number Two steers after its target in the air
      B.x = B.x0 + ((B.x1!=null?B.x1:B.x0) - B.x0)*f; B.z = B.z0 + ((B.z1!=null?B.z1:B.z0) - B.z0)*f; B.m.position.set(B.x, Math.sin(f*Math.PI)*3.2 + floorY(B.x, B.z)*f, B.z); B.m.rotation.x += dt*9; if(f >= 1){ B.m.rotation.x = 0; puff(B.x, 0.3, B.z, 0x5a4a1a, 6, 0.8); } continue; }
    B.fuse -= dt; const s = 1 + (1-B.fuse)*0.8; B.m.scale.set(s, s*(1+0.1*Math.sin(gt*30)), s); if(Math.random()<0.2) puff(B.x, 0.8, B.z, 0x5a4a1a, 1, 0.3);
    if(B.fuse <= 0){ const A = ABIL.numbertwo, R = areaOf(B.owner,'numbertwo',A.rad); areaHit(B.owner, B.x, B.z, R, dmgOf(B.owner,'numbertwo',A.dmg), {knock:1.8, el:'toxic'}); burst(B.x,0.6,B.z,0x7a5a22,24,8); elBurst('toxic', B.x, 0.6, B.z, 30, 7); ringFx(B.x,B.z,R,0x6cff3a,0.4); discFx(B.x, B.z, R, 0x3a8a1a, 0.4);
      if(B.owner.isPlayer){ SFX.fart(0.3); noise(0.2, 0.12, null, {freq:600}); } scene.remove(B.m); BOMBS.splice(i,1); } }
  for(let i=TRAILS.length-1;i>=0;i--){ const T = TRAILS[i]; T.life -= dt; T.m.material.opacity = 0.45*T.life/T.max; if(T.puffy && Math.random()<0.15) puff(T.x, 0.4, T.z, T.col, 1, 0.6); else if(Math.random()<0.08) burst(T.x+rnd(-0.5,0.5), 0.2, T.z+rnd(-0.5,0.5), T.col, 1, 1, -1);
    for(const e of ENEMY[T.owner.team]) if(!e.dead && hyp(e.x-T.x, e.z-T.z) < T.rad + (e.r||0.6)*0.5) hit(e, T.dps*dt, T.owner);
    if(T.life <= 0){ scene.remove(T.m); T.m.material.dispose(); TRAILS.splice(i,1); } }
  for(const h of HEROES) if(h.fx.smoke){ const S = h.fx.smoke; S.t -= dt; for(const e of ENEMY[h.team]) if(e.kind==='ghost' && hyp(e.x-S.x, e.z-S.z) < S.R){ e.slowT = Math.max(e.slowT, 0.5); e.temper = 'wildcard'; e.mode = 'scatter'; e.sx = e.x + rnd(-10,10); e.sz = e.z + rnd(-10,10); } if(S.t <= 0) h.fx.smoke = null; }
  for(let i=ALLIES.length-1;i>=0;i--){ const a = ALLIES[i], o = a.owner; a.life -= dt; if(o.dead || a.life <= 0 || (!a.temp && !o.pas.includes('exwife'))){ burst(a.x,1,a.z,0x9fd4ff,14,5); scene.remove(a.g); ALLIES.splice(i,1); continue; } let best = null, bd = 22; for(const e of ENEMY[o.team]){ if(e.kind!=='ghost' || e.dead) continue; const d = hyp(e.x-a.x, e.z-a.z); if(d < bd){ bd = d; best = e; } }
    const tx = best?best.x:o.x+Math.cos(gt+i)*3, tz = best?best.z:o.z+Math.sin(gt+i)*3, dx = tx-a.x, dz = tz-a.z, d = hyp(dx,dz)||1; a.x += dx/d*Math.min(d, 10*dt); a.z += dz/d*Math.min(d, 10*dt);
    a.g.position.set(a.x, Math.sin(gt*4+i)*0.2, a.z); a.g.rotation.y = Math.atan2(dx,dz); if(Math.random()<0.1) puff(a.x, 0.4, a.z, 0xa45cff, 1, 0.3); if(best && bd < 1.3) hit(best, (a.temp?ABIL.posse.dps*o.mods.dmg:dmgOf(o,'exwife',ABIL.exwife.dps))*dt, o, {el:a.temp?'shadow':'void'}); }
}
function eatDot(P, i, h, x, z){
  P.alive[i] = false; P.left--; P.eaten++;
  if(h.isPlayer){ ST.dots++; addScore(10); chain = (gt - lastDotT < 0.55) ? chain+1 : 0; lastDotT = gt; SFX.dot(Math.min(chain, 15)); if(chain === 25) heroSay(h, 'streak'); }
  if(h.rig && rtime - (h.rig.snapAt||-9) > 0.22) h.rig.snapAt = rtime;   // his jaw snaps on every bite
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
const LCUR = LOOK.LIGHT_DIR.clone(), LKEY = new THREE.Vector3(), UPV = new THREE.Vector3(0.25, 1.1, 0); LOOK.hatchU.uLight.value = LCUR;   // ink key light (shared uniform)
// v0.9 FIX: these two colours were swallowed by the comment above since v0.8 — a stunned or frozen ghost crashed the frame
const STUN_COL = new THREE.Color(0xc09aff), ICE_COL = new THREE.Color(0xcfeeff);
function render(rdt){
  const P0 = player(), inMenu = state==='menu', mainOpen = !$('mainMenu').classList.contains('hide'), live = state==='play'||state==='vacuum'||state==='showdown', pdt = (state==='pause'||state==='jack'||state==='tally') ? 0 : rdt;
  for(const h of HEROES){ if(h.dead) continue; animRig(h.rig, h.x, h.z, h.face, hyp(h.vx,h.vz), h.walk, h.grow, {swag:h.char==='pac' ? (state==='pause' ? 1 : clamp(((h.idleT||0)-0.9)*3, 0, 1)) : 0, scale:h.char==='pac'?1.12:1, y:h.hopY||0, throwT:h.throwT, chomp:h.lungeT>0||h.ballT>0, flash:h.hurtT>0 || (h.grace>0 && Math.floor(rtime*12)%2)}); h.ring.material.opacity = 0.45 + 0.2*Math.sin(rtime*4); }
  if(BOSS && BOSS.alive){ animRig(BOSS.rig, BOSS.x, BOSS.z, BOSS.face, BOSS.moving?4:0, BOSS.walk, 1.55, {throwT:BOSS.throwPose, flash:BOSS.hitT>0, armsUp:state==='showdown' && sd && sd.t>0.4 && sd.t<2.4}); BOSS.hitT -= rdt; BOSS.throwPose = Math.max(0, BOSS.throwPose - rdt); }
  if(inMenu && menuHero) animRig(menuHero, 0, -30, Math.sin(rtime*0.4)*0.5, 0, 0, 1, {swag:1});   // v0.9: thumbs up on the menu
  const beat = rtime*(TRACKS[track]||TRACKS.club).bpm/60, onBeat = (beat%1) < 0.15;
  animateWorld(rdt, rtime, P0 && !inMenu ? P0.z : -30, beat);
  // dots: runway-light twinkle + flutter (or the vacuum)
  let n = 0;
  if(state==='vacuum'){ for(const v of vacItems){ if(n >= DMAX) break; dummy.position.set(v.x, 0.8, v.z); dummy.rotation.set(0,0,0); dummy.scale.setScalar(v.kind==='dot'?1:2); dummy.updateMatrix(); dotMesh.setMatrixAt(n, dummy.matrix); dotMesh.setColorAt(n, tmpC.setHex(v.kind==='gem'?v.col:v.kind==='orb'?0x4aa8ff:v.kind==='coin'?0xffd040:0xfff8d0).multiplyScalar(1.4)); n++; } }
  else for(const P of PATS){ for(let i=0;i<P.n;i++){ if(!P.alive[i] || n >= DMAX) continue; const [x,z] = dotPos(P,i); const s = 0.5+0.5*Math.sin(rtime*(P.hw?7:10) - i*(P.hw?0.45:0.6)), pop = Math.min(1, (gt-P.born)*3+0.05);
      dummy.position.set(x, 0.5 + s*0.12 + floorY(x, z), z); dummy.rotation.set(0,0,0); dummy.scale.setScalar((0.75 + s*0.5)*pop*(P.hw?0.9:1.05)); dummy.updateMatrix(); dotMesh.setMatrixAt(n, dummy.matrix);
      const prog = P.eaten/P.n; if(P.hw) tmpC.setRGB(1.0+s*0.5, 0.95+s*0.45, 0.75+s*0.3); else tmpC.setRGB(1.0+s*0.4, 0.85+s*0.3-prog*0.3, 0.45+s*0.3-prog*0.3); dotMesh.setColorAt(n, tmpC); n++; } }
  dotMesh.visible = !((inMenu && mainOpen) || sheetMode==='loadout' || sheetMode==='pause');
  dotMesh.count = n; dotMesh.instanceMatrix.needsUpdate = true; dotMesh.instanceColor.needsUpdate = true;
  renderCrowd(rtime, onBeat);
  // ghosts
  ghostM.count = ghostO.count = ghostS.count = G.length; const fN = {}; for(const t in FACEM) fN[t] = 0; dummy.rotation.order = 'YXZ';   // tilts are relative to where the ghost faces
  for(let i=0;i<G.length;i++){ const g = G[i], s = g.scale*(g.hitT>0?1.12:1)*(g.lungeT>0.3?1.1+0.08*Math.sin(rtime*40):1);
    const scared = blueT>0 && !g.big; let px = g.x, pz = g.z, py = Math.sin(g.bob)*0.14*g.scale, rx = g.lungeT>0&&g.lungeT<0.3?0.35:0, ry = g.face + (scared?Math.PI:0), rz = g.stunT>0?0.3:0;
    // v0.9 personality in the way they move: red jitters, green bounces on its spring, purple nods, orange sways, black keeps glancing round
    if(!scared && g.stunT <= 0){ const b = g.bob; if(g.type==='red'){ px += (Math.random()-0.5)*0.07; pz += (Math.random()-0.5)*0.07; } else if(g.type==='green') py = Math.abs(Math.sin(b*1.6))*0.5*g.scale;
      else if(g.type==='purple') rx += 0.16 + Math.max(0, Math.sin(b*0.45))*0.3; else if(g.type==='orange') rz += Math.sin(b*0.9)*0.22; else if(g.type==='black') ry += Math.sin(b*2.1)*0.35; }
    dummy.position.set(px, py + (g.lungeT>0&&g.lungeT<0.3?0.3:0) + floorY(g.x, g.z), pz); dummy.rotation.set(rx, ry, rz); dummy.scale.set(s,s,s); dummy.updateMatrix();
    ghostM.setMatrixAt(i, dummy.matrix); ghostO.setMatrixAt(i, dummy.matrix); const FM = FACEM[g.type]; if(FM) FM.setMatrixAt(fN[g.type]++, dummy.matrix);
    dummy.position.set(g.x, 0.035 + floorY(g.x, g.z), g.z); dummy.rotation.set(0,0,0); dummy.scale.set(s,1,s); dummy.updateMatrix(); ghostS.setMatrixAt(i, dummy.matrix);
    if(g.hitT>0) tmpC.setRGB(1.4,1.4,1.4); else if(scared) tmpC.setHex(blueT<2 && Math.floor(rtime*8)%2 ? 0xffffff : 0x2a4aff); else tmpC.setHex(GHOST_TYPES[g.type].col);
    if(g.stunT > 0) tmpC.lerp(STUN_COL, 0.5); if(g.frozenT > 0) tmpC.lerp(ICE_COL, 0.75); if(g.lungeT > 0.3) tmpC.lerp(new THREE.Color(1,1,1), 0.35); ghostM.setColorAt(i, tmpC); }
  dummy.rotation.order = 'XYZ'; for(const t in FACEM){ FACEM[t].count = fN[t]; FACEM[t].instanceMatrix.needsUpdate = true; } ghostFx(pdt);
  ghostM.instanceMatrix.needsUpdate = ghostO.instanceMatrix.needsUpdate = ghostS.instanceMatrix.needsUpdate = true; ghostM.instanceColor.needsUpdate = true;
  gemMesh.count = Math.min(900, GEMS.length); for(let i=0;i<gemMesh.count;i++){ const g = GEMS[i]; dummy.position.set(g.x, 0.6+Math.sin(rtime*4+i)*0.12+floorY(g.x, g.z), g.z); dummy.rotation.set(0, rtime*2, 0); dummy.scale.setScalar(g.bonus?1.5:1); dummy.updateMatrix(); gemMesh.setMatrixAt(i, dummy.matrix); gemMesh.setColorAt(i, tmpC.setHex(GHOST_TYPES[g.type].col).multiplyScalar(1.5)); }
  gemMesh.instanceMatrix.needsUpdate = true; gemMesh.instanceColor.needsUpdate = true;
  updateFx(rdt, pdt);
  // ---- camera ----
  const sheetOpen = sheetMode==='pause' || sheetMode==='loadout';
  if(inMenu && (mainOpen || sheetMode==='loadout')){ const a = rtime*0.25; const H = (SAVE.char==='pac' ? 1.45 : 1.1) + floorY(0, -30); camWant.set(Math.sin(a)*1.5+1.2, H+1.3, -30 + 6.6); camLookWant.set(0, H, -30); }   // the menu hero stands down in the pit
  else if(inMenu){ camWant.set(Math.sin(rtime*0.1)*8, 22, -10 - ((rtime*3)%60)); camLookWant.set(0, 0, camWant.z - 22); }
  else if(state==='showdown' && sd){ const t = sd.t;
    if(t < 2.6){ camWant.set(BOSS.x + 3.2, 3.0, BOSS.z + 8.5); camLookWant.set(BOSS.x, 2.2, BOSS.z); }
    else if(t < 4.3){ camWant.set(P0.x - 2.5, 2.4, P0.z + 6.5); camLookWant.set(P0.x, 1.1, P0.z); }
    else { const side = SW > SH ? 7 : 0; camWant.set(P0.x*0.5 + side, SW > SH ? 10 : 13, P0.z + (SW > SH ? 12 : 15)); camLookWant.set((P0.x+BOSS.x)/2, 1, (P0.z+BOSS.z)/2); } }   // wide: over Pac's shoulder, both in frame (portrait too)
  else if(P0 && (state==='pause' || (inspect && state==='play'))){ const a = P0.face + 0.45 + (state==='pause'?rtime*0.35:0), H = (P0.char==='pac' ? 1.5 : 1.0) + floorY(P0.x, P0.z)/Math.max(0.5, P0.grow); camWant.set(P0.x + Math.sin(a)*6.4*P0.grow, (H+1.3)*P0.grow, P0.z + Math.cos(a)*6.4*P0.grow); camLookWant.set(P0.x, H*P0.grow, P0.z); }
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
  // blue orb: v0.10 the inverted grade (an extra full-screen pass) only on High and lighter; every setting gets a blue vignette (cheap)
  { const on = blueT > 0 && state==='play', want = on && Q.level===2 ? Math.min(0.5, blueT*1.5) : 0, u = gradePass.uniforms.uAmt; u.value += (want - u.value)*Math.min(1, 8*rdt); gradePass.enabled = u.value > 0.01;
    const vo = on ? (blueT < 2 && Math.floor(rtime*6)%2 ? 0.45 : 1) : 0; if(vo !== render.vo){ render.vo = vo; $('blueV').style.opacity = vo; } }   // blue orb: the cheap inverted look
  drawGlitch();
  afterimage.enabled = SAVE.set.blur && state==='play' && hyper > 0; if(afterimage.enabled) afterimage.uniforms.damp.value = Math.min(0.88, 0.6 + hyper*0.06);
  if(bloom.enabled || afterimage.enabled || gradePass.enabled) composer.render(rdt); else renderer.render(scene, camera);   // no post effects on? skip the extra full-screen passes
  perFrameUi(P0);   // v0.9: cooldown arc under Pac + the phone aim arrow, every frame
  if(live || state==='pause' || state==='jack'){ if(state!=='showdown'){ updateHud(); updateTags(); } flushDn(G, false); if(BOSS) flushDn([BOSS], false); if(P0) flushDn([P0], true); }
  updateDn(rdt);
}
const gcv = $('glitch'), gx = gcv.getContext('2d');
function drawGlitch(){ if(gcv.width !== (SW|0)){ gcv.width = SW|0; gcv.height = SH|0; } gx.clearRect(0,0,gcv.width,gcv.height); if(glitchT<=0){ gcv.style.opacity = 0; return; } gcv.style.opacity = 1;
  const up = Math.cos(glitchDir) < 0, y0 = up?0:gcv.height/2; for(let i=0;i<300;i++){ gx.fillStyle = ['#00ffcc','#ff2fd0','#ffe14d','#2f6bff','#000'][i%5]; gx.fillRect(Math.random()*gcv.width, y0+Math.random()*gcv.height/2, 8+Math.random()*70, 6+Math.random()*18); } }

// ================= LOOP + BOOT =================
let lastT = performance.now();
function loop(now){
  const raw = Math.max(0, (now-lastT)/1000), rdt = Math.min(0.05, raw); lastT = now; rtime += rdt; LOOK.tick(rtime); qualityTick(raw, state==='play');
  requestAnimationFrame(loop);
  if(state==='boot' || state==='intro') { music(); return; }
  try{ let dt = rdt * ((state==='play'||state==='vacuum') ? SAVE.set.speed : 1); if(slowmo > 0){ slowmo -= rdt; dt *= 0.3; }
    if(state==='play'){ gt += dt; update(dt); } else if(state==='vacuum'){ gt += dt; updateVacuum(dt); } else if(state==='showdown'){ gt += rdt; updateShowdown(rdt); } else if(state==='menu'){ gt += rdt; }
    render(rdt); music(); }
  catch(e){ console.error(e); }
}
function boot(){
  initQuality(); requestAnimationFrame(loop);
  LOOK.loadAll().then(M=>{ MODELS = M; buildWorld(M); buildBalloons(); buildDots(); buildPickups(); buildFx(); buildDn(); buildCrowd(); buildGhosts(); buildGems(); QUALITY_HOOKS.forEach(f=>f(Q.level));
    $('loading').classList.add('hide'); toMenu();
    window.__pac = {get state(){ return state; }, get P(){ return player(); }, ST, get BOSS(){ return BOSS; }, start:(m,o)=>startRun(m||'campaign',o), give:n=>gainXP(player(), n),
      choose:i=>{ if(jackOffers) chooseOffer(jackOffers[i]); }, get offers(){ return jackOffers; }, SAVE, toMenu, openPause, closePause, openSheet, get HEROES(){ return HEROES; }, get G(){ return G; }, get PATS(){ return PATS; }, playIntro};
  }).catch(e=>{ $('loading').textContent = 'Could not load the models: '+e; console.error(e); });
}
boot();
