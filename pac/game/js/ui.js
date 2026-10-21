// PAC v0.9 — ui.js: input (keyboard, mouse, gamepad, phone overlay), HUD, edge markers, level-up jackpot,
// menus (main, worlds, characters, endless, PvP, settings), the character sheet (pause + loadout), end-of-run tally.
"use strict";
// v0.9: phone A/B/C tap / drag-to-aim / hold-and-slide-to-swap; the cooldown arc under Pac's feet; the aim arrow; swapping
// actives on the pause screen (click or drag). Changelog in index.html.
// ================= INPUT =================
const keys = {}; let mouseAim = null, inspect = false; const ray = new THREE.Raycaster(), mouseV = new THREE.Vector2(), groundPlane = new THREE.Plane(new THREE.Vector3(0,1,0), 0);
addEventListener('keydown', e=>{ const k = e.key.toLowerCase(); audio();
  if(state==='intro'){ endIntro(); return; }
  if(state==='jack' && jackOffers && ['1','2','3'].includes(k)){ const o = jackOffers[+k-1]; if(o) chooseOffer(o); return; }
  if(k==='escape' || k==='p'){ if(state==='play') openPause(); else if(state==='pause') closePause(); else if(!$('subOv').classList.contains('hide')) closeSub(); else if(state==='menu' && sheetMode==='loadout') closeSheet(); return; }
  if(k==='m'){ setMute(!SAVE.set.muted); return; }
  if(e.key==='Tab'){ e.preventDefault(); inspect = true; }
  if(k===' '){ e.preventDefault(); if(state==='play') useMove(player()); }
  if(k==='e' && state==='play') useActive(player(), 2);      // the third active button
  keys[k] = true; });
addEventListener('keyup', e=>{ keys[e.key.toLowerCase()] = false; if(e.key==='Tab') inspect = false; });
cv.addEventListener('contextmenu', e=>e.preventDefault());
function updateMouse(e){ const r = cv.getBoundingClientRect(); mouseV.set((e.clientX-r.left)/r.width*2-1, -((e.clientY-r.top)/r.height)*2+1); ray.setFromCamera(mouseV, camera); const p = new THREE.Vector3(); if(ray.ray.intersectPlane(groundPlane, p)) mouseAim = p; }
cv.addEventListener('pointermove', e=>{ if(e.pointerType==='mouse') updateMouse(e); });
const mouseDown = {0:false, 2:false};
cv.addEventListener('pointerdown', e=>{ audio(); if(e.pointerType!=='mouse' || state!=='play') return; updateMouse(e); mouseDown[e.button] = true; });
addEventListener('pointerup', e=>{ if(e.pointerType==='mouse') mouseDown[e.button] = false; });
let padVec = null;
function moveInput(){
  let x = 0, z = 0; if(keys.a||keys.arrowleft) x -= 1; if(keys.d||keys.arrowright) x += 1; if(keys.w||keys.arrowup) z -= 1; if(keys.s||keys.arrowdown) z += 1;
  const gp = navigator.getGamepads ? [...navigator.getGamepads()].find(g=>g) : null, P0 = player();
  if(gp && P0){ const ax = gp.axes[0]||0, az = gp.axes[1]||0; if(hyp(ax,az) > 0.2){ x = ax; z = az; }
    const rx = gp.axes[2]||0, rz = gp.axes[3]||0; if(hyp(rx,rz) > 0.3){ P0.ax = rx/hyp(rx,rz); P0.az = rz/hyp(rx,rz); P0.gpAim = true; } else P0.gpAim = false;
    const b = i => gp.buttons[i] && gp.buttons[i].pressed;
    if(b(0) && !moveInput.a) useMove(P0); moveInput.a = b(0); if(b(7)||b(5)) useActive(P0,0); if(b(6)||b(4)) useActive(P0,1); if(b(1)||b(3)) useActive(P0,2); if(b(9) && !moveInput.st) openPause(); moveInput.st = b(9); }
  if(padVec){ x = padVec[0]; z = padVec[1]; }
  const l = hyp(x,z); return l > 0.08 ? [x/Math.max(1,l), z/Math.max(1,l)] : [0,0];
}
// phone: a floating stick under the left thumb; A / B / C under the right thumb; a quick SWIPE on the right side fires the movement ability
// in the direction you swipe (a tap there fires it the way you're moving). Everything sits over the game, see-through.
(()=>{ const zone = $('tLeft'), base = $('stickBase'), knob = $('stickKnob'); let id = null, ox = 0, oy = 0; const R = 48;
  zone.addEventListener('pointerdown', e=>{ audio(); e.preventDefault(); id = e.pointerId; try{ zone.setPointerCapture(id); }catch(er){} const r = zone.getBoundingClientRect(); ox = e.clientX; oy = e.clientY;
    base.style.left = (ox - r.left)+'px'; base.style.top = (oy - r.top)+'px'; base.classList.add('on'); knob.style.transform = ''; padVec = [0,0]; });
  zone.addEventListener('pointermove', e=>{ if(e.pointerId!==id) return; const dx = e.clientX-ox, dy = e.clientY-oy, d = hyp(dx,dy), k = Math.min(1, d/R);
    padVec = d < 5 ? [0,0] : [dx/d*k, dy/d*k]; const m = Math.min(d, R); knob.style.transform = `translate(${dx/Math.max(d,1)*m}px,${dy/Math.max(d,1)*m}px)`; });
  const end = e=>{ if(e.pointerId!==id) return; id = null; padVec = null; base.classList.remove('on'); }; zone.addEventListener('pointerup', end); zone.addEventListener('pointercancel', end);
  // v0.9 A / B / C (Brent: "hard to aim in a direction while moving", "a quick swap tool to put abilities on keys"):
  //  TAP fires it now at the best target · DRAG off the button to aim (an arrow shows the way), let go to fire that way ·
  //  HOLD still for half a second and the button lifts: slide onto another button and let go to swap the two.
  const pbs = [$('bA'), $('bB'), $('bC')], overEl = (b, e) => { const r = b.getBoundingClientRect(), p = 12; return e.clientX > r.left-p && e.clientX < r.right+p && e.clientY > r.top-p && e.clientY < r.bottom+p; };
  pbs.forEach((el, idx)=>{ let pid = null, x0 = 0, y0 = 0, mode = null, holdTm = null;
    el.addEventListener('pointerdown', e=>{ audio(); e.preventDefault(); e.stopPropagation(); if(pid!=null) return; pid = e.pointerId; try{ el.setPointerCapture(pid); }catch(er){} x0 = e.clientX; y0 = e.clientY; mode = 'tap'; el.classList.add('on');
      clearTimeout(holdTm); holdTm = setTimeout(()=>{ const P0 = player(); if(mode==='tap' && P0 && P0.act[idx]){ mode = 'swap'; el.classList.add('lift'); toast('learn:swap', 'Slide onto another button and let go to swap them.', 2400); } }, 480); });
    el.addEventListener('pointermove', e=>{ if(e.pointerId!==pid) return; const dx = e.clientX-x0, dy = e.clientY-y0, d = hyp(dx,dy), P0 = player();
      if(mode==='tap' && d > 18){ mode = 'aim'; clearTimeout(holdTm); }
      if(mode==='aim' && P0 && d > 1){ P0.aimHold = idx; P0.dragAim = [dx/d, dy/d]; }     // screen right = +x, screen down = +z
      if(mode==='swap') pbs.forEach((b,j)=>b.classList.toggle('drop', j!==idx && overEl(b, e))); });
    const end = e=>{ if(e.pointerId!==pid) return; pid = null; clearTimeout(holdTm); el.classList.remove('on','lift'); pbs.forEach(b=>b.classList.remove('drop')); const P0 = player();
      if(P0 && state==='play' && e.type==='pointerup'){
        if(mode==='tap') useActive(P0, idx);
        else if(mode==='aim' && P0.dragAim){ const [dx, dz] = P0.dragAim; P0.ax = dx; P0.az = dz; P0.aimPx = P0.x + dx*9; P0.aimPz = P0.z + dz*9; P0.aimLockUntil = performance.now() + 350; useActive(P0, idx); }
        else if(mode==='swap'){ const j = pbs.findIndex((b,j)=>j!==idx && overEl(b, e)); if(j >= 0) swapActives(P0, idx, j); } }
      if(P0){ P0.aimHold = null; P0.dragAim = null; } mode = null; };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end); });
  const sw = $('tRight'); let sid = null, sx = 0, sy = 0, st = 0;
  sw.addEventListener('pointerdown', e=>{ audio(); e.preventDefault(); sid = e.pointerId; sx = e.clientX; sy = e.clientY; st = performance.now(); });
  const swEnd = e=>{ if(e.pointerId !== sid) return; sid = null; const dx = e.clientX-sx, dy = e.clientY-sy, d = hyp(dx,dy); if(state!=='play' || performance.now()-st > 600) return;
    if(d > 26){ useMove(player(), [dx/d, dy/d]); $('swipeHint').classList.add('fire'); setTimeout(()=>$('swipeHint').classList.remove('fire'), 200); } else useMove(player()); };   // screen right = +x, screen down = +z
  sw.addEventListener('pointerup', swEnd); sw.addEventListener('pointercancel', e=>{ if(e.pointerId===sid) sid = null; });
})();
function playerAim(P0){
  if(P0.aimLockUntil > performance.now()) return;   // a phone drag-aim holds for a moment while the cast plays out
  if(!isMobile && mouseAim && !P0.gpAim){ const dx = mouseAim.x-P0.x, dz = mouseAim.z-P0.z, d = hyp(dx,dz)||1; P0.ax = dx/d; P0.az = dz/d; P0.aimPx = mouseAim.x; P0.aimPz = mouseAim.z; return; }
  P0.aimPx = null; P0.aimPz = null; if(P0.gpAim) return;
  // phone: aim at the most dangerous thing in front of you, else the nearest anywhere, else straight ahead
  const tg = priority(P0, 14, 1.4) || priority(P0, 10);
  if(tg){ const dx = tg.x-P0.x, dz = tg.z-P0.z, d = hyp(dx,dz)||1; P0.ax = dx/d; P0.az = dz/d; P0.aimPx = tg.x; P0.aimPz = tg.z; } else { P0.ax = Math.sin(P0.face); P0.az = Math.cos(P0.face); }
}

// swap two active slots (their cooldowns and upgrades go with the ability)
// pause screen: click an active row then another, or drag one onto another, to swap their keys
let swapSel = null;
function wireSwapRows(){ const P0 = player(); if(!P0) return; document.querySelectorAll('#sheetPane tr.swp').forEach(tr=>{ const i = +tr.dataset.i;
  tr.onclick = ()=>{ if(swapSel==null){ swapSel = i; } else { swapActives(P0, swapSel, i); swapSel = null; } renderSheet(); };
  tr.ondragstart = e=>{ e.dataTransfer.setData('text/plain', String(i)); }; tr.ondragover = e=>{ e.preventDefault(); tr.classList.add('drop'); }; tr.ondragleave = ()=>tr.classList.remove('drop');
  tr.ondrop = e=>{ e.preventDefault(); const j = +e.dataTransfer.getData('text/plain'); swapSel = null; swapActives(P0, j, i); renderSheet(); }; }); }
function swapActives(h, i, j){ if(i===j) return; const t = h.act[i]; h.act[i] = h.act[j]; h.act[j] = t; buildSkillHud(); SFX.pick && SFX.pick();
  const n = k => k ? ABIL[k].name : 'nothing'; toast(null, `${n(h.act[i])} is on ${KEYLAB[i]}, ${n(h.act[j])} on ${KEYLAB[j]}.`, 2200); }
// ---------- every frame: the cooldown arc under Pac's feet, and the aim arrow while a phone button is dragged ----------
let aimArrow = null; const CA = [];
function perFrameUi(P0){
  const arc = $('cdArc'), show = state==='play' && P0 && !P0.dead && !inspect && SAVE.set.cdArc !== false;
  arc.style.display = show ? 'block' : 'none';
  if(show){ const [sx, sy] = project(P0.x, floorY(P0.x, P0.z), P0.z); arc.style.transform = `translate(${sx|0}px,${sy|0}px)`;
    if(!CA.length) for(let i=0;i<3;i++){ const d = document.createElement('div'); d.className = 'ca'; d.innerHTML = '<span></span><i></i>'; arc.appendChild(d); CA.push({d, ic:d.lastChild, k:undefined, f:-1}); }
    CA.forEach((c, i)=>{ const k = P0.act[i]; if(k !== c.k){ c.k = k; c.d.style.display = k ? '' : 'none'; if(k){ c.ic.textContent = ABIL[k].ic; c.d.style.setProperty('--el', hexc(EL[ABIL[k].el].col)); } }
      if(!k) return; const f = Math.round(clamp((P0.cd[k]||0)/cdOf(P0,k), 0, 1)*40)/40; if(f !== c.f){ c.f = f; c.d.style.setProperty('--cd', (f*100)+'%'); c.d.classList.toggle('rdy', f <= 0); } }); }
  const aiming = P0 && P0.dragAim && P0.aimHold != null && state==='play';
  if(aiming && !aimArrow){ const s = new THREE.Shape(); s.moveTo(-0.22,0.12); s.lineTo(0.22,0.12); s.lineTo(0.22,0.78); s.lineTo(0.55,0.78); s.lineTo(0,1); s.lineTo(-0.55,0.78); s.lineTo(-0.22,0.78); s.closePath();
    const g = new THREE.ShapeGeometry(s); g.rotateX(Math.PI/2); aimArrow = new THREE.Mesh(g, new THREE.MeshBasicMaterial({color:0xffffff, transparent:true, opacity:0.55, blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide})); scene.add(aimArrow); }
  if(aimArrow){ aimArrow.visible = !!aiming; if(aiming){ const k = P0.act[P0.aimHold], A = k && ABIL[k], L = A ? (A.dist || A.range || A.rad || 9) : 9;
    aimArrow.position.set(P0.x, 0.12 + floorY(P0.x, P0.z), P0.z); aimArrow.rotation.y = Math.atan2(P0.dragAim[0], P0.dragAim[1]); aimArrow.scale.set(1.6, 1, L);
    aimArrow.material.color.setHex(A ? EL[A.el].col : 0xffffff).multiplyScalar(1.4); } }
}

// ================= HUD =================
// slots: p0-p2 passives, a0-a2 actives, move
function slotInfo(h, slot){ if(slot==='move'){ const M = MOVES[CHARS[h.char].move]; return h.moveOk ? {ic:M.ic, nm:M.name, cd:Math.max(0,h.moveCd), cdMax:M.cd} : null; }
  const k = (slot[0]==='a' ? h.act : h.pas)[+slot[1]]; if(!k) return null; const A = ABIL[k], rk = h.rank[k]||0; return {k, el:A.el, ic:A.ic, nm:A.name+(rk?' +'+rk:''), cd:Math.max(0,h.cd[k]||0), cdMax:cdOf(h,k)}; }
const KEYLAB = isMobile ? ['A','B','C'] : ['L·CLICK','R·CLICK','E'];
const SLOT_DEF = [['p0','AUTO','',1],['p1','AUTO','',1],['p2','AUTO','',1],['a0',KEYLAB[0],''],['a1',KEYLAB[1],''],['a2',KEYLAB[2],''],['move', isMobile?'SWIPE':'SPACE','']];
const hexc = c => '#'+c.toString(16).padStart(6,'0');
function buildSkillHud(){ const P0 = player(); if(!P0) return;
  $('skills').innerHTML = SLOT_DEF.map(([s,key,lab,small],i)=>{ const I = slotInfo(P0, s); const col = I && I.el ? hexc(EL[I.el].col) : '#6d5734';
    return (i===3?'<div class="sdiv"></div>':'')+`<div class="slot${small?' small':''}${I?'':' empty'}" id="sl_${s}" style="--el:${col}"><span class="key">${key}</span><div class="ic">${I?I.ic:'·'}</div><div class="nm">${I?I.nm:lab}</div><div class="cdv"></div><div class="cdn"></div></div>`; }).join('');
  $('microRow').innerHTML = Object.keys(P0.perk).map(k=>`<div class="micro" title="${PERKS[k].n}">${PERKS[k].ic}</div>`).join('')
    + (P0.bufl||[]).map(k=>`<div class="micro" title="${ABIL[k].name}">${ABIL[k].ic}<b>${(P0.rank[k]||0)+1}</b></div>`).join('');   // v0.11: the shared boosts and their level
  [['bA','bAi','a0'],['bB','bBi','a1'],['bC','bCi','a2']].forEach(([b,ic,s])=>{ const I = slotInfo(P0, s); $(ic).textContent = I ? I.ic : '🔒'; $(b).classList.toggle('locked', !I); $(b).style.setProperty('--el', I ? hexc(EL[I.el].col) : '#888'); });
  const m = slotInfo(P0,'move'); $('swipeHint').classList.toggle('locked', !m); $('swI').textContent = m ? m.ic : '🔒';
  $('pasRow').innerHTML = P0.pas.map(k=>k ? `<span style="--el:${hexc(EL[ABIL[k].el].col)}">${ABIL[k].ic}</span>` : '<span class="e">·</span>').join('');
}
function flashSlot(s){ const el = $('sl_'+s); if(el){ el.classList.add('fire'); setTimeout(()=>el.classList.remove('fire'), 160); } const pb = {a0:'bA', a1:'bB', a2:'bC', move:'swipeHint'}[s]; if(pb){ $(pb).classList.add('fire'); setTimeout(()=>$(pb).classList.remove('fire'), 160); } }
function setCd(el, I){ if(!el) return; const f = I && I.cdMax ? clamp(I.cd/I.cdMax,0,1) : 0; el.querySelector('.cdv').style.setProperty('--cd', (f*100).toFixed(0)+'%'); const n = el.querySelector('.cdn'); if(n) n.textContent = I && I.cdMax >= 2 && I.cd > 0.05 ? (I.cd < 1 ? I.cd.toFixed(1) : Math.ceil(I.cd)) : ''; }
const MARKS = []; function mark(i){ if(!MARKS[i]){ const d = document.createElement('div'); d.className = 'mark'; d.innerHTML = '<i></i><span></span>'; $('marks').appendChild(d); MARKS[i] = d; } return MARKS[i]; }
// v0.9 speed: the HUD redraws 20 times a second (not every frame), text only when it changes, the score sheet 4 times a second
let hudT = 0, hudSlowT = 0; const _txt = new WeakMap();
const setTxt = (el, v) => { if(_txt.get(el) !== v){ _txt.set(el, v); el.textContent = v; } }, setHtml = (el, v) => { if(_txt.get(el) !== v){ _txt.set(el, v); el.innerHTML = v; } };
function updateHud(){
  const P0 = player(); if(!P0) return; const now = performance.now(); if(now - hudT < 50) return; hudT = now; const slow = now - hudSlowT > 250; if(slow) hudSlowT = now;
  const hp = clamp(P0.hp/P0.maxhp,0,1), en = clamp(P0.energy/P0.maxEnergy,0,1);
  $('gHpF').style.height = (hp*100)+'%'; setTxt($('gHpT'), Math.max(0,Math.round(P0.hp))); $('gHp').classList.toggle('shield', P0.shieldT>0);
  $('gEnF').style.height = (en*100)+'%'; setTxt($('gEnT'), Math.round(P0.energy));
  const xpN = XPC[Math.min(RUN_CAP,P0.level+1)], xpP = XPC[P0.level], xf = P0.level>=RUN_CAP ? 1 : (P0.xp-xpP)/(xpN-xpP);
  $('xpBar').firstChild.style.width = (clamp(xf,0,1)*100)+'%'; setTxt($('lvN'), 'LV '+P0.level);
  $('mHp').style.width = hp*100+'%'; $('mEn').style.width = en*100+'%'; $('mXp').style.width = clamp(xf,0,1)*100+'%'; setTxt($('mLv'), 'LV '+P0.level);
  for(const [s] of SLOT_DEF) setCd($('sl_'+s), slotInfo(P0, s));
  setCd($('bA'), slotInfo(P0,'a0')); setCd($('bB'), slotInfo(P0,'a1')); setCd($('bC'), slotInfo(P0,'a2')); setCd($('swipeHint'), slotInfo(P0,'move'));
  const bl = []; if(hyper>0) bl.push(`<span style="color:#ff4fb8">HYPER ×${hyper}</span>`); if(blueT>0) bl.push(`<span style="color:#6ab0ff">EAT MODE ${blueT.toFixed(1)}</span>`);
  for(const [k,v] of Object.entries(P0.buff)) if(v>0) bl.push(`<span>${{dmg:'DMG+',speed:'SPEED+',xp:'XP×2',cd:'FAST CD',magnet:'MAGNET'}[k]||k} ${v.toFixed(0)}</span>`);
  setHtml($('buffs'), bl.join(''));
  setTxt($('scoreN'), Math.round(ST.score).toLocaleString());
  const m = Math.floor(ST.time/60), s = Math.floor(ST.time%60);
  if(slow) setHtml($('scoreDet'), [['Dots eaten',ST.dots],['Patterns cleared',ST.patterns],['Ghosts killed',ST.ghosts],MODE==='campaign'?['Boss',ST.boss?'beaten':'—']:null,['Civilian casualties',ST.civ],['Props smashed',ST.props],['Coins',ST.coins],
    MODE==='endless'?['Wave',wave]:null, MODE==='pvp'?['Your kills',P0.kills]:null,['Time',`${m}:${String(s).padStart(2,'0')}`],['Difficulty',diff().label+' · '+SAVE.set.speed+'×'],['Best',Math.round(Math.max(SAVE.best[MODE]||0, ST.score)).toLocaleString()]]
    .filter(Boolean).map(([a,b])=>`<div><span>${a}</span><b>${b}</b></div>`).join(''));
  // one short objective line
  let obj = '';
  if(MODE==='campaign'){ obj = !P0.moveOk ? 'Eat the dots' : P0.level < 4 ? `Grow — the stage opens at level 4 (${P0.level}/4)` : BOSS && BOSS.alive && !BOSS.intro ? 'Get to the main stage' : BOSS && BOSS.alive ? 'Beat Pokey Bro' : ''; }
  else if(MODE==='endless') obj = `Wave ${wave} · next in ${Math.ceil(waveT)}s`; else obj = `First to ${PVP.target}`;
  setTxt($('obj'), obj);
  // edge markers: coloured triangles toward things that matter (not every mob)
  const L = [];
  for(const b of BUFFS) L.push({x:b.x, z:b.z, col:hexc(BUFF_TYPES[b.type].col), lab:'', small:true});
  if(MODE==='campaign' && BOSS && BOSS.alive){ if(gateOpen && !BOSS.intro) L.push({x:0, z:STAGE_Z, col:'#ffd23f', lab:'STAGE'}); if(BOSS.awake) L.push({x:BOSS.x, z:BOSS.z, col:'#ff4a2a', lab:'POKEY BRO'}); }
  for(const o of ORBS) L.push({x:o.x, z:o.z, col:'#4aa8ff', lab:'ORB'});
  for(const g of G) if(g.big) L.push({x:g.x, z:g.z, col:'#'+GHOST_TYPES[g.type].col.toString(16).padStart(6,'0'), lab:''});
  if(blueT > 0){ let c = 0; for(const g of G) if(!g.big && hyp(g.x-P0.x,g.z-P0.z) > 14 && c++ < 6) L.push({x:g.x, z:g.z, col:'#6ab0ff', lab:'', small:true}); }
  if(P0.hp < P0.maxhp*0.5){ let bf = null, bd = 60; for(const p of PICKS) if(p.kind==='fruit'){ const d = hyp(p.x-P0.x,p.z-P0.z); if(d < bd){ bd = d; bf = p; } } if(bf) L.push({x:bf.x, z:bf.z, col:'#7cff8a', lab:'FRUIT'}); }
  if(MODE==='pvp') for(const h of HEROES) if(h.team===1 && !h.dead) L.push({x:h.x, z:h.z, col:'#ff5a5a', lab:''});
  // markers ride the edge of a frame kept clear of the score (top) and the skill bar / thumbs (bottom)
  let n = 0; const M2 = 26, T = 76, B = isMobile ? 200 : 132, cx = SW/2, cy = (T + SH - B)/2, hh = Math.max(40, (SH - B - T)/2);
  for(const t of L.slice(0, 14)){ const [sx, sy, front] = project(t.x, 1, t.z); const on = front && sx>M2 && sx<SW-M2 && sy>T && sy<SH-B; if(on) continue;
    let dx = sx-cx, dy = sy-cy; if(!front){ dx = -dx; dy = -dy; } const k = Math.min((SW/2-M2)/Math.max(1e-6,Math.abs(dx)), hh/Math.max(1e-6,Math.abs(dy)));
    const el = mark(n++); el.style.display = 'block'; el.style.left = (cx+dx*k)+'px'; el.style.top = (cy+dy*k)+'px'; el.className = 'mark'+(t.small?' small':'');
    el.firstChild.style.transform = `translate(-50%,-50%) rotate(${Math.atan2(dy,dx)+Math.PI/2}rad)`; el.firstChild.style.borderBottomColor = t.col; el.lastChild.textContent = t.lab; el.lastChild.style.color = t.col; }
  for(let i=n;i<MARKS.length;i++) MARKS[i].style.display = 'none';
  if(MODE==='pvp') setHtml($('pvpBox'), `<span style="color:#41e4ff">BLUE ${PVP.kills[0]}</span> &nbsp;—&nbsp; <span style="color:#ff5a5a">${PVP.kills[1]} RED</span>`);
}
$('scoreBox').onclick = ()=>$('scoreDet').classList.toggle('open');
const TAGS = new Map();
function updateTags(){ const live = new Set();
  for(const h of HEROES){ if(h.isPlayer || h.dead) continue; live.add(h.id); let el = TAGS.get(h.id); if(!el){ el = document.createElement('div'); el.className = 'tag'; el.innerHTML = `<div class="tn"></div><div class="hb"><i></i></div>`; $('tags').appendChild(el); TAGS.set(h.id, el); }
    const [sx, sy, f] = project(h.x, h.rig.height*h.grow+0.5, h.z); el.style.display = f?'block':'none'; el.style.left = sx+'px'; el.style.top = sy+'px';
    el.querySelector('.tn').textContent = `${h.name} · ${h.level}`; el.querySelector('.tn').style.color = h.team?'#ff8a8a':'#8ae8ff'; const i = el.querySelector('i'); i.style.width = clamp(h.hp/h.maxhp,0,1)*100+'%'; i.style.background = h.team?'#ff4a4a':'#41e4ff'; }
  for(const [id, el] of TAGS) if(!live.has(id)){ el.remove(); TAGS.delete(id); } }

// ================= LEVEL-UP JACKPOT (v0.8: big and splashy — flash, confetti, slow-mo, cards slam in, the pick explodes in its colour) =================
let jackOffers = null, reelTimer = null;
// confetti: a full-screen canvas burst (its own little loop, runs only while there's confetti)
const CONF = []; let confOn = false;
function confetti(n=120, cols=['#ffe14d','#ff4fb8','#41e4ff','#7cff8a','#ffffff']){ const c = $('confetti'); c.width = c.clientWidth; c.height = c.clientHeight; const W = c.width, H = c.height;
  for(let i=0;i<n;i++) CONF.push({x:W/2 + rnd(-W*0.1, W*0.1), y:H*0.45, vx:rnd(-9,9), vy:rnd(-15,-4), r:rnd(0,6.28), vr:rnd(-0.3,0.3), w:rnd(6,12), h:rnd(3,7), c:pick(cols), life:rnd(1.4,2.4)});
  if(!confOn){ confOn = true; let last = performance.now(); const g = c.getContext('2d');
    const step = now=>{ const dt = Math.min(0.05,(now-last)/1000); last = now; g.clearRect(0,0,c.width,c.height);
      for(let i=CONF.length-1;i>=0;i--){ const p = CONF[i]; p.life -= dt; p.vy += 22*dt; p.vx *= 0.99; p.x += p.vx*60*dt; p.y += p.vy*60*dt*0.5; p.r += p.vr; if(p.life <= 0){ CONF.splice(i,1); continue; }
        g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.globalAlpha = Math.min(1, p.life*2); g.fillStyle = p.c; g.fillRect(-p.w/2, -p.h/2, p.w, p.h*Math.abs(Math.cos(p.r*2))); g.restore(); }
      if(CONF.length) requestAnimationFrame(step); else { confOn = false; g.clearRect(0,0,c.width,c.height); } };
    requestAnimationFrame(step); } }
function screenFlash(col='#fff3c0', o=0.65){ const f = $('flash'); f.style.background = col; f.style.transition = 'none'; f.style.opacity = o; void f.offsetWidth; f.style.transition = 'opacity .55s'; f.style.opacity = 0; }
function levelBurst(h){ SFX.level(); big('LEVEL '+h.level, 1000, 'lvl'); slowmo = Math.max(slowmo, 0.45); screenFlash('#fff1b0', 0.55); confetti(90);
  ringFx(h.x, h.z, 7, 0xffe14d, 0.6); ringFx(h.x, h.z, 4, 0xffffff, 0.4); burst(h.x, 1.5, h.z, 0xffe14d, 80, 14); burst(h.x, 1.5, h.z, 0xffffff, 30, 8); addShake(0.2); }
function offerInfo(o, h){
  const SI = skOfferInfo(o, h); if(SI) return SI;   // v0.11: the VS set's cards (levels, boosts, evolutions, stones)
  if(o.kind==='move'){ const M = MOVES[CHARS[h.char].move]; return {k:'MOVEMENT · '+(isMobile?'swipe':'SPACE'), n:M.name, d:M.d, ic:M.ic, el:'void', badge:'NEW'}; }
  if(o.kind==='ab'){ const A = ABIL[o.k], slot = (A.side==='act'?h.act:h.pas).indexOf(null); return {k:A.side==='pas' ? 'PASSIVE · fights by itself' : 'ACTIVE · '+(isMobile?'button ':'')+KEYLAB[slot], n:A.name, d:A.d, ic:A.ic, el:A.el, badge:'NEW'}; }
  if(o.kind==='swap'){ const A = ABIL[o.k], old = (A.side==='act'?h.act:h.pas)[o.slot], r = h.rank[old]||0; return {k:`REPLACES ${old?ABIL[old].name.toUpperCase():''}${r?' (+'+r+' LOST)':''}`, n:A.name, d:A.d, ic:A.ic, el:A.el, badge:'SWAP'}; }
  if(o.kind==='rank'){ const A = ABIL[o.k], r = (h.rank[o.k]||0)+1; return {k:'UPGRADE', n:`${A.name} +${r}`, d:'Hits 25% harder, reaches 10% further, recharges 8% faster.', ic:A.ic, el:A.el, badge:'+'+r}; }
  if(o.kind==='perk'){ const P = PERKS[o.k]; return {k:'PERK · lasts the run', n:P.n, d:P.d, ic:P.ic, el:null, col:'#ffd23f', badge:'PERK'}; }
  const S = STATUP[o.k]; return {k:'STAT · lasts the run', n:S.n, d:'Permanent for this run.', ic:S.ic, el:null, badge:'STAT'}; }
function offerHtml(o, h, i){ const I = offerInfo(o, h), col = I.el ? hexc(EL[I.el].col) : (I.col || '#9ad0c8');
  return `<div class="card offer" data-i="${i}" style="--el:${col};animation-delay:${i*0.13}s"><span class="badge">${I.badge}</span>${I.el?`<span class="chip">${EL[I.el].label}</span>`:''}<div class="ic">${I.ic}</div><div class="k">${I.k}</div><div class="n">${I.n}</div><div class="d">${I.d}</div><div class="k" style="margin-top:8px">${isMobile?'tap':'press '+(i+1)}</div></div>`; }
function openJack(){
  if(!pendingLv.length){ state = 'play'; return; } const lv = pendingLv[0], h = player(); state = 'jack'; $('jack').classList.remove('hide'); mouseDown[0] = mouseDown[2] = false;
  const offers = offersFor(h); jackOffers = null; $('offers').innerHTML = '';
  $('jackT').textContent = 'LEVEL '+lv; $('jackS').textContent = !h.moveOk ? 'Your movement' : offers[0] && offers[0].kind==='ab' && offers.every(o=>o.kind==='ab') ? (ABIL[offers[0].k].side==='pas' ? 'Pick a passive — it fights on its own' : 'Pick an active ability') : 'Pick one';
  const syms = ['🍒','👻','⭐','💎','7','🔵','🍉'], reels = [$('r0'),$('r1'),$('r2')]; const stopAt = SAVE.set.fastReels || lv > 4 ? [0.2,0.32,0.44] : [0.5,0.8,1.1]; const t0 = performance.now(); let skip = false;
  reels.forEach(r=>r.classList.remove('stop')); clearInterval(reelTimer);
  reelTimer = setInterval(()=>{ const el = skip ? 9 : (performance.now()-t0)/1000; reels.forEach((r,i)=>{ if(el < stopAt[i]) r.textContent = pick(syms); else { const o = offers[Math.min(i, offers.length-1)]; if(!r.classList.contains('stop')){ r.classList.add('stop'); tone(700+i*200, 0.06, 'square', 0.04); } r.textContent = offerInfo(o, h).ic; } });
    if(el >= stopAt[2]){ clearInterval(reelTimer); jackOffers = offers; $('offers').innerHTML = offers.map((o,i)=>offerHtml(o,h,i)).join(''); $('offers').querySelectorAll('.card').forEach(c=>c.onclick = ()=>chooseOffer(offers[+c.dataset.i])); SFX.jackpot(); confetti(60); }
    else tone(500+Math.random()*400, 0.02, 'square', 0.02); }, 55);
  $('spd').onclick = ()=>{ skip = true; };
}
function chooseOffer(o){ if(!jackOffers || !o) return; const offers = jackOffers; jackOffers = null; const h = player(), I = offerInfo(o, h), i = offers.indexOf(o);
  $('offers').querySelectorAll('.card').forEach((c,j)=>c.classList.add(j===i?'chosen':'gone')); SFX.pick();
  setTimeout(()=>{ if(state!=='jack' || player()!==h) return; applyChoice(h, o); pendingLv.shift(); $('jack').classList.add('hide');   // (the run may have ended meanwhile)
    // the pick is sacred: a moment of grace, the swarm is pushed back, and the choice goes off in its own colour
    h.grace = 1.6; for(const g of G){ const dx = g.x-h.x, dz = g.z-h.z, d = hyp(dx,dz)||1; if(d < 8){ g.kvx += dx/d*12; g.kvz += dz/d*12; } }
    const col = I.el ? EL[I.el].col : 0xffe14d; ringFx(h.x, h.z, 8, col, 0.6); if(I.el) elBurst(I.el, h.x, 1.2, h.z, 70, 12); screenFlash(I.el ? hexc(EL[I.el].col) : '#fff1b0', 0.35); big(I.n.toUpperCase(), 900, 'small'); addShake(0.25);
    state = 'play'; if(pendingLv.length) setTimeout(()=>{ if(state==='play') openJack(); }, 350); }, 280); }

// ================= MENUS =================
function hideAllOverlays(){ ['mainMenu','subOv','sheetOv','jack','tally'].forEach(id=>$(id).classList.add('hide')); sheetMode = null; camera.clearViewOffset(); }
let menuHero = null;
function showMenuHero(){ if(menuHero) scene.remove(menuHero.root); menuHero = makeRig(SAVE.char, 0); menuHero.root.position.set(0,0,-30); scene.add(menuHero.root); }
function renderMain(){ const C = CHARS[SAVE.char], L = SAVE.lvl[SAVE.char];
  $('mmCn').textContent = C.name; $('mmCl').textContent = `${C.sub} · Level ${L.level} / 100`;
  $('mCharS').textContent = SAVE.unlocked.length > 1 ? SAVE.unlocked.map(k=>CHARS[k].name).join(' · ') : 'Beat a world boss to unlock more';
  $('mLoad').classList.toggle('off', !C.loadout); $('mLoadS').textContent = C.loadout ? 'Gear, stats, abilities, talents' : `${C.name} has no loadout yet`;
  const beaten = Object.keys(SAVE.beaten).length > 0; $('mEndless').classList.toggle('off', !beaten); $('mEndS').textContent = beaten ? 'Waves forever on worlds you have beaten' : 'Beat World 1 to unlock';
  $('mmAcct').textContent = `Coins ${SAVE.coins} · Best ${Math.round(SAVE.best.campaign).toLocaleString()}`; }
function openSub(html, after){ $('subWin').innerHTML = html; $('subOv').classList.remove('hide'); if(after) after($('subWin')); }
function closeSub(){ $('subOv').classList.add('hide'); }
$('subOv').addEventListener('pointerdown', e=>{ if(e.target.id==='subOv') closeSub(); });
const seg = (id, vals, cur, lab) => `<span class="seg" id="${id}">${vals.map(v=>`<button class="btn ${v===cur?'sel':''}" data-v="${v}">${lab?lab(v):v}</button>`).join('')}</span>`;
function worldSelect(){ const b1 = SAVE.beaten[1];
  openSub(`<h2>New Game</h2><div class="note">Playing as ${CHARS[SAVE.char].name}. Worlds unlock in order.</div>
   <div class="row" style="margin:16px 0">
    <div class="card" id="w1"><div class="ic">🪩</div><div class="k">WORLD 1</div><div class="n">The Club</div><div class="d">Eat your way up the club, room by room, to the main stage. Boss: Pokey Bro.${b1?`<br><span style="color:#ffd23f">${'★'.repeat(b1)}${'☆'.repeat(5-b1)}</span>`:''}</div></div>
    <div class="card lock"><div class="ic">🔒</div><div class="k">WORLD 2</div><div class="n">${b1?'Coming soon':'Locked'}</div><div class="d">${b1?'Pokey Bro\'s world is being built.':'Beat World 1 to unlock.'}</div></div>
   </div>
   <table style="width:100%"><tr><td class="cz" style="font-size:13px;padding:6px 10px 6px 0;width:1%;white-space:nowrap">Difficulty</td><td>${seg('segD',['easy','normal','hard'],SAVE.set.diff,v=>DIFF[v].label)}</td></tr>
   <tr><td class="cz" style="font-size:13px;padding:6px 10px 6px 0;white-space:nowrap">Game speed</td><td>${seg('segS',[0.75,1,1.25,1.5],SAVE.set.speed,v=>v+'×')}</td></tr></table>
   <div class="note" style="margin-top:6px">Harder and faster games score more.</div>
   <div class="foot"><button class="btn" id="wGo">Start World 1</button><button class="btn" id="wBack">Back</button></div>`, w=>{
    w.querySelectorAll('#segD .btn').forEach(b=>b.onclick = ()=>{ SAVE.set.diff = b.dataset.v; save(); worldSelect(); });
    w.querySelectorAll('#segS .btn').forEach(b=>b.onclick = ()=>{ SAVE.set.speed = +b.dataset.v; save(); worldSelect(); });
    const go = ()=>{ closeSub(); if(!SAVE.seenIntro){ SAVE.seenIntro = true; save(); playIntro(()=>startRun('campaign')); } else startRun('campaign'); };
    $('w1').onclick = go; $('wGo').onclick = go; $('wBack').onclick = closeSub; }); }
function charSelect(){ openSub(`<h2>Character Select</h2><div class="note">Beat a world's boss and he becomes playable.</div><div class="row" style="margin:16px 0">${SAVE.unlocked.map(k=>{ const C = CHARS[k], L = SAVE.lvl[k];
    return `<div class="card ${k===SAVE.char?'sel':''}" data-k="${k}"><div class="k">${C.sub.toUpperCase()}</div><div class="n">${C.name}</div><div class="d">${C.desc}<br><span style="color:#d8b46a">Level ${L.level} / 100</span></div></div>`; }).join('')}</div>
   <div class="foot"><button class="btn" id="cBack">Done</button></div>`, w=>{ w.querySelectorAll('.card').forEach(c=>c.onclick = ()=>{ SAVE.char = c.dataset.k; save(); showMenuHero(); renderMain(); charSelect(); }); $('cBack').onclick = closeSub; }); }
function endlessSelect(){ openSub(`<h2>Endless</h2><div class="note">Pick a world you have beaten. Waves never stop. No boss. Play for a high score.</div>
  <div class="row" style="margin:16px 0"><div class="card" id="e1"><div class="ic">🪩</div><div class="k">WORLD 1</div><div class="n">The Club</div><div class="d">Best: ${Math.round(SAVE.best.endless).toLocaleString()}</div></div></div>
  <div class="foot"><button class="btn" id="eBack">Back</button></div>`, w=>{ $('e1').onclick = ()=>startRun('endless'); $('eBack').onclick = closeSub; }); }
const pvpCfg = {a:1, b:1, target:10};
function pvpSelect(){
  openSub(`<h2>PvP</h2><div class="note">Bots for now. Uneven teams are allowed (3v1, 2v3...). You fight on the dance floor.</div>
   <table style="width:100%;margin:14px 0"><tr><td class="cz" style="font-size:13px;padding:8px 12px 8px 0;width:1%;white-space:nowrap">Your team</td><td>${seg('pA',[1,2,3],pvpCfg.a,v=>v===1?'Just you':'You + '+(v-1))}</td></tr>
   <tr><td class="cz" style="font-size:13px;padding:8px 12px 8px 0;white-space:nowrap">Opponents</td><td>${seg('pB',[1,2,3],pvpCfg.b)}</td></tr>
   <tr><td class="cz" style="font-size:13px;padding:8px 12px 8px 0;white-space:nowrap">Kills to win</td><td>${seg('pT',[5,10,15],pvpCfg.target)}</td></tr></table>
   <div class="note">You play ${CHARS[SAVE.char].name}. Bots are picked from your unlocked characters.</div>
   <div class="foot"><button class="btn" id="pGo">Fight ${pvpCfg.a}v${pvpCfg.b}</button><button class="btn" id="pBack">Back</button></div>`, w=>{
    w.querySelectorAll('#pA .btn').forEach(b=>b.onclick = ()=>{ pvpCfg.a = +b.dataset.v; pvpSelect(); }); w.querySelectorAll('#pB .btn').forEach(b=>b.onclick = ()=>{ pvpCfg.b = +b.dataset.v; pvpSelect(); });
    w.querySelectorAll('#pT .btn').forEach(b=>b.onclick = ()=>{ pvpCfg.target = +b.dataset.v; pvpSelect(); });
    $('pGo').onclick = ()=>startRun('pvp', {size:[pvpCfg.a, pvpCfg.b], target:pvpCfg.target}); $('pBack').onclick = closeSub; }); }
function settingsHtml(){ const s = SAVE.set;
  return `<table><tr><td>Difficulty</td><td>${seg('sD',['easy','normal','hard'],s.diff,v=>DIFF[v].label)}<div class="note">Easy 0.75× score · Hard 1.5× score</div></td></tr>
  <tr><td>Game speed</td><td>${seg('sS',[0.75,1,1.25,1.5],s.speed,v=>v+'×')}<div class="note">Slower for learning, faster for a rush. Faster scores more.</div></td></tr>
  <tr><td>Volume</td><td><input id="sVol" type="range" min="0" max="1" step="0.05" value="${s.vol}"></td></tr>
  <tr><td>Music</td><td><input id="sMus" type="range" min="0" max="1" step="0.05" value="${s.music}"></td></tr>
  <tr><td>Sound</td><td>${seg('sM',['on','muted'],s.muted?'muted':'on')}</td></tr>
  <tr><td>Spoken lines</td><td>${seg('sV',['off','on'],s.voice?'on':'off')}<div class="note">Uses your browser's voice.</div></td></tr>
  <tr><td>Graphics</td><td>${seg('sQ',['auto','high','medium','low'],s.quality)}<div class="note">Auto starts at what suits your device and steps down by itself if it lags.</div></td></tr>
  <tr><td>Glow</td><td>${seg('sG',['on','off'],s.bloom?'on':'off')}<div class="note">Only on the high setting.</div></td></tr>
  <tr><td>Frame counter</td><td>${seg('sF',['on','off'],s.showFps?'on':'off')}<div class="note">Top right. Tell me the number if it's low.</div></td></tr>
  <tr><td>Auto-cast</td><td>${seg('sA',['on','off'],s.autoCast?'on':'off')}<div class="note">Active abilities fire by themselves at the best target when ready.</div></td></tr>
  <tr><td>Hyper blur</td><td>${seg('sB',['on','off'],s.blur?'on':'off')}</td></tr>
  <tr><td>Level-up reels</td><td>${seg('sR',['normal','fast'],s.fastReels?'fast':'normal')}</td></tr></table>`; }
function bindSettings(root, rerender){ const s = SAVE.set; const on = (id, f)=>root.querySelectorAll('#'+id+' .btn').forEach(b=>b.onclick = ()=>{ f(b.dataset.v); save(); rerender(); });
  on('sD', v=>s.diff = v); on('sS', v=>s.speed = +v); on('sM', v=>setMute(v==='muted')); on('sV', v=>s.voice = v==='on'); on('sB', v=>s.blur = v==='on'); on('sR', v=>s.fastReels = v==='fast'); on('sG', v=>{ s.bloom = v==='on'; bloom.enabled = s.bloom && Q.level===2; }); on('sQ', v=>{ s.quality = v; initQuality(); }); on('sF', v=>s.showFps = v==='on'); on('sA', v=>s.autoCast = v==='on');
  const vol = root.querySelector('#sVol'); if(vol) vol.oninput = ()=>{ s.vol = +vol.value; applyVol(); save(); }; const mus = root.querySelector('#sMus'); if(mus) mus.oninput = ()=>{ s.music = +mus.value; applyVol(); save(); }; }
function settingsMenu(){ openSub(`<h2>Settings</h2><div class="pane" style="margin-top:10px">${settingsHtml()}</div><div class="foot"><button class="btn" id="sBack">Done</button></div>`, w=>{ bindSettings(w, settingsMenu); $('sBack').onclick = closeSub; }); }
$('mNew').onclick = ()=>{ audio(); worldSelect(); }; $('mChar').onclick = charSelect; $('mLoad').onclick = ()=>openSheet('loadout'); $('mEndless').onclick = endlessSelect; $('mPvp').onclick = pvpSelect; $('mSet').onclick = settingsMenu;
$('mIntro').onclick = ()=>playIntro(toMenu); $('mQuit').onclick = ()=>{ try{ window.close(); }catch(e){} toast(null, 'A browser tab can only be closed by you.', 3000); };

// ================= CHARACTER SHEET (pause + loadout): live close-up in the frame, gear slots around it =================
let sheetMode = null, sheetTab = 'stats';
const GEAR_SLOTS = [['Headpiece',50,8],['Neck',80,16],['Chest',86,36],['Weapon 1',10,40],['Weapon 2',90,56],['Gloves',10,62],['Ring 1',84,74],['Ring 2',68,90],['Legs',18,84],['Boots',40,92],['Banner',18,16]];
const GEAR_HAS = {Headpiece:1, Gloves:1, 'Weapon 1':1, Boots:1};
function openSheet(mode){ sheetMode = mode; sheetTab = 'stats'; $('sheetOv').classList.remove('hide'); if(mode==='loadout') $('mainMenu').classList.add('hide'); renderSheet(); }
function closeSheet(){ const was = sheetMode; $('sheetOv').classList.add('hide'); camera.clearViewOffset(); sheetMode = null; if(was==='loadout'){ $('mainMenu').classList.remove('hide'); showMenuHero(); renderMain(); } }
function renderSheet(){
  const ch = sheetMode==='pause' ? player().char : SAVE.char, C = CHARS[ch], L = SAVE.lvl[ch], gear = null;
  $('dollT').textContent = C.name;
  $('dollSlots').innerHTML = '';   // v0.10: no gear slots (Brent: no helmets, armour or weapons)
  $('sheetT').textContent = sheetMode==='pause' ? 'Paused' : 'Loadout';
  $('sheetSub').textContent = `${C.name} · ${C.sub} · Character level ${L.level} / 100 · Coins ${SAVE.coins}`;
  const tabs = sheetMode==='pause' ? [['stats','Stats'],['abil','Abilities'],['rules','Rules'],['set','Settings']] : C.loadout ? [['stats','Stats'],['abil','Abilities'],['tal','Talents']] : [['stats','Stats']];
  if(!tabs.some(t=>t[0]===sheetTab)) sheetTab = tabs[0][0];
  $('sheetTabs').innerHTML = tabs.map(([k,l])=>`<button class="btn ${k===sheetTab?'sel':''}" data-t="${k}">${l}</button>`).join('');
  $('sheetTabs').querySelectorAll('.btn').forEach(b=>b.onclick = ()=>{ sheetTab = b.dataset.t; renderSheet(); });
  let h = '';
  if(sheetMode==='pause'){ const P0 = player();
    if(sheetTab==='stats') h = `<table><tr><td>Run level</td><td>${P0.level}</td></tr><tr><td>Health</td><td>${Math.round(P0.hp)} / ${P0.maxhp}</td></tr><tr><td>Energy</td><td>${Math.round(P0.energy)} / ${P0.maxEnergy}</td></tr>
      <tr><td>Damage</td><td>×${P0.mods.dmg.toFixed(2)}</td></tr><tr><td>Area</td><td>×${P0.mods.area.toFixed(2)}</td></tr><tr><td>Cooldowns</td><td>×${P0.mods.cdr.toFixed(2)}</td></tr><tr><td>Speed</td><td>×${P0.mods.speed.toFixed(2)}</td></tr>
      <tr><td>Crit</td><td>${Math.round(P0.mods.crit*100)}%</td></tr><tr><td>Damage taken</td><td>-${Math.round(P0.mods.armor*100)}%</td></tr><tr><td>Score</td><td>${Math.round(ST.score).toLocaleString()}</td></tr></table>`;
    if(sheetTab==='abil'){ const row = (lab, I, d, i)=>`<tr${i!=null?` class="swp${swapSel===i?' sel':''}" draggable="true" data-i="${i}"`:''}><td>${lab}${i!=null?' <span class="swh">⇅</span>':''}</td><td>${I?`<b style="color:${I.el?hexc(EL[I.el].col):'inherit'}">${I.ic} ${I.nm}</b><br><span class="note">${d}</span>`:'<span class="note">empty</span>'}</td></tr>`;
      h = `<div class="note" style="margin-bottom:6px">Swap keys: drag an active onto another, or click one then the other.</div><table>${[0,1,2].map(i=>row('Active · '+KEYLAB[i], slotInfo(P0,'a'+i), P0.act[i]?ABIL[P0.act[i]].d:'', i)).join('')}${[0,1,2].map(i=>row('Passive', slotInfo(P0,'p'+i), P0.pas[i]?ABIL[P0.pas[i]].d:'')).join('')}
        ${row('Move · '+(isMobile?'swipe':'SPACE'), slotInfo(P0,'move'), MOVES[CHARS[P0.char].move].d)}${Object.keys(P0.perk).map(k=>`<tr><td>Perk</td><td><b>${PERKS[k].ic} ${PERKS[k].n}</b><br><span class="note">${PERKS[k].d}</span></td></tr>`).join('')}</table>
        <div class="note" style="margin-top:8px">A run holds 3 actives and 3 passives. Once a side is full, a new one only comes as a swap — and the swapped slot loses its upgrades.</div>`; }
    if(sheetTab==='rules') h = `<table><tr><td>Dots</td><td>Eat them to grow. Finish a whole moving pattern and its last dot explodes for a bonus and stacks HYPER.</td></tr>
      <tr><td>Levels</td><td>Level 1 gives your move. Level 2 a passive, levels 3 and 4 your first two actives. After that each level is a random mix: new abilities while you have room (3 actives, 3 passives), upgrades, stats, perks — and swaps once a side is full (the swapped slot loses its upgrades).</td></tr>
      <tr><td>Actives</td><td>With Auto-cast on (Settings) they fire by themselves at the best target when ready — Pokey Bro first. Press one to fire it early. On a phone, drag a button to aim it; hold a button and slide it onto another to swap them. On a computer, swap keys on the Abilities tab here.</td></tr>
      <tr><td>Colours</td><td>Every ability is one of the 7 colours: fire, toxic, frost, void, shock, nature, shadow. Its effects look and sound like it.</td></tr>
      <tr><td>Power-ups</td><td>Glowing capsules show up now and then: rage, speed, magnet, rapid fire, a shield, double XP. Ten seconds each.</td></tr>
      <tr><td>Ghosts</td><td>Seven colours, one per stat. Each colour drops its own bonus. A new colour first shows up as one BIG ghost.</td></tr>
      <tr><td>Blue orb</td><td>The ghosts scatter and you can eat them for a few seconds.</td></tr><tr><td>Fruit</td><td>Heals you.</td></tr><tr><td>Coins</td><td>Kept after the run. Spend them in Loadout.</td></tr>
      <tr><td>Clubgoers</td><td>They run from you. Eating one costs energy and scores nothing.</td></tr><tr><td>Furniture</td><td>Walk into it to tear through (costs energy), or blow it up.</td></tr>
      <tr><td>Main stage</td><td>Opens at level 4. Pokey Bro throws four creatures — fire, water, shock, plant. He can't go down until you've faced three of them.</td></tr></table>`;
    if(sheetTab==='set') h = settingsHtml();
    setTimeout(wireSwapRows, 0);
    $('sheetFoot').innerHTML = `<button class="btn" id="fRes">Resume</button><button class="btn" id="fMenu">Quit to Menu</button><button class="btn" id="fQuit">Quit Game</button>`;
    $('fRes').onclick = closePause; $('fMenu').onclick = ()=>{ $('sheetOv').classList.add('hide'); toMenu(); }; $('fQuit').onclick = ()=>{ try{ window.close(); }catch(e){} toast(null,'A browser tab can only be closed by you.',3000); }; }
  else {
    if(!C.loadout) h = `<p>${C.name} has no loadout options yet. Gear, stats and talents for him come later.</p><p class="note">He unlocks his creatures one at a time as he levels: ${C.ladder[0][1].map(k=>ABIL[k].name).join(', ')}.</p>`;
    else if(sheetTab==='stats'){ const pts = L.level - 1, used = WHEEL.reduce((a,k)=>a+(SAVE.pac.stats[k]||0),0), eff = {Strength:'+2% damage',Vitality:'+6 health',Spirit:'+6% energy regen',Intellect:'-2% cooldowns',Agility:'+1.5% speed',Speciality:'+2% area',Nature:'+5% pickup range'};
      h = `<div class="note">1 point per character level. Points left: <b style="color:#f6dc95">${pts-used}</b></div><table style="margin-top:8px">${WHEEL.map(k=>`<tr><td style="color:${STAT_COL[k]}">${k}</td><td><button class="btn pm" data-s="${k}" data-d="-1">−</button> <b style="display:inline-block;min-width:26px;text-align:center">${SAVE.pac.stats[k]||0}</b> <button class="btn pm" data-s="${k}" data-d="1">+</button> <span class="note">${eff[k]} per point</span></td></tr>`).join('')}</table>`; }
    else if(sheetTab==='gear') h = `<div class="note">Test sets until items and crafting are built. The same pieces fit every character.</div><div class="seg" style="margin:10px 0">${['none','crude','quality','epic'].map(t=>`<button class="btn ${(gear||'none')===t?'sel':''}" data-g="${t}">${t}</button>`).join('')}</div>
      <table><tr><td>Crude</td><td>Matte. +3% damage, +10 health.</td></tr><tr><td>Quality</td><td>Glossy. +7% damage, +20 health.</td></tr><tr><td>Epic</td><td>Radiates. +12% damage, +35 health.</td></tr></table>`;
    else if(sheetTab==='abil'){ const nm = k=>`<span style="color:${hexc(EL[ABIL[k].el].col)}">${ABIL[k].ic} ${ABIL[k].name}</span>`;
      const base = `<tr><td>Level 2</td><td>${C.ladder[0][1].map(nm).join(', ')}</td></tr><tr><td>Level 3</td><td>${C.ladder[1][1].map(nm).join(', ')}</td></tr><tr><td>Level 4</td><td>${C.ladder[2][1].map(nm).join(', ')}</td></tr>`;
      const later = Object.keys(ABIL).filter(k=>!ABIL[k].req && (ABIL[k].who==='pac'||ABIL[k].who==='all') && !C.ladder.some(l=>l[1].includes(k))).map(nm).join(', ');
      h = `<div class="note">Buy abilities so they can show up in your games. Better ones unlock at higher character levels.</div><table style="margin-top:8px">${base}<tr><td>Can show up later</td><td>${later}</td></tr>${Object.keys(ABIL).filter(k=>ABIL[k].req).map(k=>{ const A = ABIL[k], owned = SAVE.pac.bought.includes(k), lock = L.level < A.req;
        return `<tr><td>${A.ic} ${A.name}</td><td>${A.d}<br>${owned?'<b style="color:#7cff8a">Owned</b>':lock?`<span class="note">Unlocks at level ${A.req}</span>`:`<button class="btn" data-buy="${k}" ${SAVE.coins<A.cost?'disabled style="opacity:.4"':''}>Buy · ${A.cost} coins</button>`}</td></tr>`; }).join('')}</table>`; }
    else if(sheetTab==='tal'){ const pts = Math.floor(L.level/2), used = Object.keys(SAVE.pac.talents).length;
      h = `<div class="note">1 talent point every 2 character levels. Points left: <b style="color:#f6dc95">${pts-used}</b>. Trees are drafts.</div><table style="margin-top:8px">${Object.entries(TALENTS).map(([tree, nodes])=>`<tr><td>${tree}</td><td>${nodes.map((n,i)=>{ const key = tree+i, has = SAVE.pac.talents[key], req = 2+i*4, lock = L.level < req;
        return `<button class="btn ${has?'sel':''}" data-tal="${key}" ${lock||(!has&&pts-used<=0)?'disabled style="opacity:.35;margin:2px;font-size:11px;padding:5px 8px"':'style="margin:2px;font-size:11px;padding:5px 8px"'}>${n}${lock?' · Lv '+req:''}</button>`; }).join('')}</td></tr>`).join('')}</table>`; }
    $('sheetFoot').innerHTML = `<button class="btn" id="fDone">Done</button>`; $('fDone').onclick = closeSheet;
  }
  $('sheetPane').innerHTML = h;
  const P = $('sheetPane');
  P.querySelectorAll('[data-s]').forEach(b=>b.onclick = ()=>{ const k = b.dataset.s, d = +b.dataset.d, pts = L.level-1, used = WHEEL.reduce((a,x)=>a+(SAVE.pac.stats[x]||0),0); if(d>0 && used>=pts) return; SAVE.pac.stats[k] = Math.max(0,(SAVE.pac.stats[k]||0)+d); save(); renderSheet(); });
  P.querySelectorAll('[data-g]').forEach(b=>b.onclick = ()=>{ SAVE.pac.gear = b.dataset.g==='none'?null:b.dataset.g; save(); if(menuHero) equipSet(menuHero, SAVE.pac.gear); renderSheet(); });
  P.querySelectorAll('[data-buy]').forEach(b=>b.onclick = ()=>{ const k = b.dataset.buy, A = ABIL[k]; if(SAVE.coins < A.cost) return; SAVE.coins -= A.cost; SAVE.pac.bought.push(k); save(); SFX.coin(); renderSheet(); });
  P.querySelectorAll('[data-tal]').forEach(b=>b.onclick = ()=>{ const k = b.dataset.tal; if(SAVE.pac.talents[k]) delete SAVE.pac.talents[k]; else SAVE.pac.talents[k] = 1; save(); renderSheet(); });
  if(sheetMode==='pause' && sheetTab==='set') bindSettings(P, renderSheet);
}
function openPause(){ if(state!=='play') return; state = 'pause'; mouseDown[0] = mouseDown[2] = false; $('hud').classList.add('hide'); $('tags').style.display = 'none'; $('touch').classList.add('hide'); openSheet('pause'); }
function closePause(){ $('sheetOv').classList.add('hide'); camera.clearViewOffset(); sheetMode = null; state = 'play'; $('hud').classList.remove('hide'); $('tags').style.display = ''; $('touch').classList.remove('hide'); buildSkillHud(); }
$('menuB').onclick = ()=>{ if(state==='play') openPause(); else if(state==='pause') closePause(); };
$('muteB').onclick = ()=>{ audio(); setMute(!SAVE.set.muted); };

// ================= END OF RUN: vacuum, lottery tally, stars, unlocks =================
let vacT = 0, vacItems = [];
function startVacuum(){ state = 'vacuum'; vacT = 0; const P0 = player(); vacItems = [];
  for(const P of PATS) for(let i=0;i<P.n;i++) if(P.alive[i]){ const [x,z] = dotPos(P,i); vacItems.push({x, z, sx:x, sz:z, kind:'dot'}); P.alive[i] = false; }
  for(const g of GEMS) vacItems.push({x:g.x, z:g.z, sx:g.x, sz:g.z, kind:'gem', col:GHOST_TYPES[g.type].col}); GEMS.length = 0;
  for(const p of PICKS) if(p.kind==='coin'){ vacItems.push({x:p.x, z:p.z, sx:p.x, sz:p.z, kind:'coin'}); scene.remove(p.g); } for(let i=PICKS.length-1;i>=0;i--) if(PICKS[i].kind==='coin') PICKS.splice(i,1);
  ORBS.forEach(o=>{ vacItems.push({x:o.x, z:o.z, sx:o.x, sz:o.z, kind:'orb'}); scene.remove(o.g); }); ORBS.length = 0;
  big('JACKPOT!', 1500); }
function updateVacuum(dt){ vacT += dt; const P0 = player(), f = Math.min(1, vacT/1.9), e = f*f;
  for(const v of vacItems){ v.x = v.sx + (P0.x - v.sx)*e; v.z = v.sz + (P0.z - v.sz)*e; }
  if(Math.random() < 0.7) tone(400 + f*1600, 0.035, 'square', 0.025);
  if(f >= 1){ const dots = vacItems.filter(v=>v.kind==='dot').length, coins = vacItems.filter(v=>v.kind==='coin').length, gems = vacItems.length - dots - coins; ST.dots += dots; ST.coins += coins; addScore(dots*10 + gems*60 + coins*50); vacItems = []; burst(P0.x,1,P0.z,0xffe14d,140,15); openTally(true); } }
function openTally(win){
  if(state==='tally' || state==='menu') return; state = 'tally'; cv.style.filter = ''; $('jack').classList.add('hide'); clearInterval(reelTimer); $('touch').classList.add('hide');
  const P0 = player(), mode = MODE, m = Math.floor(ST.time/60), s = Math.floor(ST.time%60);
  const finalScore = Math.round(ST.score), newBest = finalScore > (SAVE.best[mode]||0); SAVE.best[mode] = Math.max(SAVE.best[mode]||0, finalScore);
  const par = mode==='campaign' ? 40000 : mode==='endless' ? 50000 : 20000;
  const stars = (win || mode==='endless') ? clamp(Math.round(finalScore/par*5 - ST.civ*0.15), 1, 5) : 0;
  if(mode==='campaign' && win) SAVE.beaten[1] = Math.max(SAVE.beaten[1]||0, stars);
  let unlocked = null; if(mode==='campaign' && win && !SAVE.unlocked.includes('ballboy')){ SAVE.unlocked.push('ballboy'); unlocked = 'ballboy'; }
  const ch = P0.char, L = SAVE.lvl[ch], cxp = Math.floor(finalScore/40), coins = ST.coins + Math.floor(finalScore/200); L.xp += cxp; SAVE.coins += coins; let ups = 0;
  while(L.level < 100 && L.xp >= charNeed(L.level)){ L.xp -= charNeed(L.level); L.level++; ups++; } save();
  if(!win && mode!=='pvp') heroSay(P0, 'death', true);
  $('tT').textContent = mode==='pvp' ? (win?'VICTORY':'DEFEAT') : mode==='endless' ? `ENDLESS · WAVE ${wave}` : win ? 'WORLD 1 COMPLETE' : `${CHARS[ch].name.toUpperCase()} WENT DOWN`;
  const rows = [['Dots eaten', ST.dots], ['Patterns cleared', ST.patterns], ['Ghosts killed', ST.ghosts], ['Coins', ST.coins], ['Props smashed', ST.props], ['Civilian casualties', ST.civ], ['Time', `${m}:${String(s).padStart(2,'0')}`], ['Difficulty', `${diff().label} · ${SAVE.set.speed}×`], ['SCORE', finalScore]];
  if(mode==='pvp') rows.splice(3, 0, ['Your kills', P0.kills], ['Team score', `${PVP.kills[0]} – ${PVP.kills[1]}`]);
  $('tRows').innerHTML = rows.map(([a,b],i)=>`<div><span>${a}</span><b data-v="${typeof b==='number'?b:''}" id="tr${i}">${typeof b==='number'?0:b}</b></div>`).join('');
  $('stars').innerHTML = mode==='pvp' ? '' : [0,1,2,3,4].map(i=>`<span id="st${i}">★</span>`).join('');
  $('tAcct').innerHTML = `${CHARS[ch].name} +${cxp} character XP${ups?` · <b style="color:#f6dc95">LEVEL UP → ${L.level}</b>`:''} · +${coins} coins${newBest?' · <b style="color:#ffd23f">NEW HIGH SCORE</b>':''}`;
  $('unlockCard').classList.add('hide'); $('tally').classList.remove('hide'); $('hud').classList.add('hide');
  let i = 0; const nums = rows.map((r,j)=>typeof r[1]==='number'?j:-1).filter(j=>j>=0);
  const starStep = n => { if(n >= stars){ [1046,1318,1568,2093].forEach((f,k)=>tone(f, 0.25, 'square', 0.05, 0, null, k*0.1, 0.4));
      if(unlocked){ const C = CHARS[unlocked]; $('unlockCard').innerHTML = `<div class="cz" style="font-size:12px;letter-spacing:.3em">NEW CHARACTER UNLOCKED</div><div class="cz" style="font-size:28px;color:#f6dc95;margin:6px 0">${C.name}</div><div>${C.desc}</div>`; $('unlockCard').classList.remove('hide'); noise(0.5,0.1); }
      return; }
    const el = $('st'+n); if(el) el.classList.add('on'); tone(880+n*180, 0.22, 'triangle', 0.08, 0, null, 0, 0.4); setTimeout(()=>starStep(n+1), 320); };
  const countNext = ()=>{ if(state!=='tally') return; if(i >= nums.length){ starStep(0); return; } const j = nums[i++], el = $('tr'+j), target = +el.dataset.v; let k = 0; const steps = 16, t0 = performance.now();
    const tm = setInterval(()=>{ k = Math.min(steps, Math.floor((performance.now()-t0)/30)+1); el.textContent = Math.round(target*k/steps).toLocaleString(); tone(500+k*60+i*40, 0.03, 'square', 0.03); if(k >= steps){ clearInterval(tm); setTimeout(countNext, 80); } }, 30); };
  setTimeout(countNext, 300);
  // v0.9 (Brent: "there was no continue option"): each world is its own run, and World 2 isn't built yet — say so
  if(mode==='campaign' && win) $('tAcct').innerHTML += '<div style="margin-top:8px;color:#f6dc95">World 2 is next — it\'s being built. Each world is its own run, so you\'ll start it fresh.</div>';
  $('tCont').textContent = 'Play Again';
  $('tCont').onclick = ()=>{ if(mode==='pvp') startRun('pvp', {size:PVP.size, target:PVP.target}); else startRun(mode); };
  $('tMenu').onclick = toMenu;
}
