// PAC v0.8 — intro.js. THE STORY, told with the game's own 3D models, beat for beat from Brent's INTRO.md (~97 s, not rushed).
// Original stand-ins (v0.8): the Emperor (joystick crown, token throne), Baron Kaboom (bomb-headed knight), the Quarter Moon
// (a battle station shaped like a coin), the Q-Wing, the chrome assassin. The 3D plays in its own scene through the game's
// renderer + glow; a see-through canvas on top carries the comic captions, speech bubbles and sound words.
"use strict";
const ic = $('introC'), ix = ic.getContext('2d');
let introT = 0, introRAF = 0, introDone = null, introFired = {}, IS = null, IC = null, IO = null;
const BEATS = [
  {d:5,  cap:''},                                                       // 1 darkness → a spotlight snaps on
  {d:10, cap:''},                                                       // 2 the crawl (rules + story), read aloud
  {d:6,  cap:'The Emperor.'},                                           // 3 he laughs — DO IT
  {d:8,  cap:'Baron Kaboom turns the Quarter Moon on an arcade-booth planet.'}, // 4 the crime
  {d:8,  cap:'And then — a fool. A legend. Both.'},                     // 5 Pac's entrance; he eats the crawl row by row
  {d:6,  cap:''},                                                       // 6 the narrator is cut off mid-word
  {d:5,  cap:'Every row he eats, he grows.'},                           // 7
  {d:6,  cap:'Fully grown, he eats the entire Quarter Moon.'},          // 8
  {d:6,  cap:''},                                                       // 9 burp — then he farts himself into a black hole
  {d:6,  cap:'Baron Kaboom escapes in the Q-Wing.'},                    // 10 the vow
  {d:8,  cap:'The Legendary Salty Dawg Saloon.'},                       // 11 shots at the bar, sad and depressed
  {d:7,  cap:'Outside, something is sent to kill him.'},                // 12 the whistle, the portal, the chrome assassin
  {d:4,  cap:''},                                                       // 13 Pac eats him
  {d:6,  cap:''},                                                       // 14 the walk: leathers, shades
  {d:6,  cap:''}];                                                      // 15 TITLE
const BEAT_AT = []; { let a = 0; for(const b of BEATS){ BEAT_AT.push(a); a += b.d; } } const INTRO_LEN = BEATS.reduce((a,b)=>a+b.d, 0);
const CRAWL = ['Somewhere past the last arcade in the galaxy...', 'THE RULES: eat everything that isn\'t nailed down.', 'Ghosts chase. You eat. Towers fall.', 'Every boss you beat joins you.',
  'THE STORY: the Emperor rules the arcade galaxy', 'with an iron joystick. His enforcer,', 'BARON KABOOM, answers only to him...'];
const NARRATION = 'Somewhere past the last arcade in the galaxy, the rules are simple. Eat everything that isn\'t nailed down. Ghosts chase. You eat. Towers fall. The Emperor rules the arcade galaxy with an iron joystick, and his enforcer, Baron Kab';
const once = (k, f) => { if(!introFired[k]){ introFired[k] = 1; f(); } };
function speak(text, pitch=1, rate=1){ if(SAVE.set.muted || !('speechSynthesis' in window)) return; try{ speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.pitch = pitch; u.rate = rate; speechSynthesis.speak(u); }catch(e){} }

// ---------------- the 3D sets ----------------
function textSlab(text, w=26, col='#ffd84a'){ const c = document.createElement('canvas'); c.width = 2048; c.height = 128; const g = c.getContext('2d'); g.font = '700 74px Cinzel, Georgia'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = col; g.shadowBlur = 24; g.fillStyle = col; g.fillText(text, 1024, 66); g.shadowBlur = 0; g.fillStyle = '#fff6c8'; g.globalAlpha = 0.6; g.fillText(text, 1024, 66);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w/16), new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c), transparent:true, depthWrite:false, color:new THREE.Color(1.4,1.4,1.4)})); return m; }
function neonSign(lines, w){ const c = document.createElement('canvas'); c.width = 1024; c.height = 512; const g = c.getContext('2d'); g.textAlign = 'center'; g.textBaseline = 'middle';
  lines.forEach(([t, col, size, y])=>{ g.font = `900 ${size}px Cinzel, Georgia`; g.shadowColor = col; g.shadowBlur = 40; g.fillStyle = col; g.fillText(t, 512, y); g.shadowBlur = 8; g.fillStyle = '#fff'; g.globalAlpha = 0.55; g.fillText(t, 512, y); g.globalAlpha = 1; });
  return new THREE.Mesh(new THREE.PlaneGeometry(w, w/2), new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c), transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, color:new THREE.Color(1.6,1.6,1.6)})); }
function chromeMat(){ const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); const gr = g.createLinearGradient(0,0,0,256);
  [[0,'#ffffff'],[0.3,'#9aa6b8'],[0.48,'#2a3040'],[0.52,'#d8e0ec'],[0.75,'#6a7488'],[1,'#f0f4ff']].forEach(([s,cl])=>gr.addColorStop(s,cl)); g.fillStyle = gr; g.fillRect(0,0,256,256);
  const r = g.createRadialGradient(128,128,90,128,128,128); r.addColorStop(0,'rgba(0,0,0,0)'); r.addColorStop(1,'rgba(0,0,0,.6)'); g.fillStyle = r; g.fillRect(0,0,256,256);
  return new THREE.MeshMatcapMaterial({matcap:new THREE.CanvasTexture(c)}); }
const IP = []; let ipPts = null, ipPos, ipCol; const IPMAX = 2500;   // the intro's own particles
function ipBurst(x,y,z,col,n,spd,grav=6,life=1){ const c = new THREE.Color(col); for(let i=0;i<n;i++){ const a = Math.random()*6.28, u = Math.random()*2-1, q = Math.sqrt(1-u*u), s = spd*(0.3+Math.random());
  IP.push({x,y,z, vx:Math.cos(a)*q*s, vy:u*s, vz:Math.sin(a)*q*s, life:life*(0.6+Math.random()*0.6), c, grav}); if(IP.length > IPMAX) IP.shift(); } }
function buildIntro(){
  if(IS) return; IS = new THREE.Scene(); IS.background = new THREE.Color(0x020106); IC = new THREE.PerspectiveCamera(45, 1, 0.1, 3000);
  IS.add(new THREE.HemisphereLight(0x9a8aff, 0x200818, 0.8)); const key = new THREE.PointLight(0xffe8c8, 2.2, 80, 1.2); IS.add(key);
  const O = IO = {key, sets:{}};
  const set = n => { const g = new THREE.Group(); IS.add(g); O.sets[n] = g; return g; };
  // stars (shared by the space beats)
  { const n = 1800, g = new THREE.BufferGeometry(), p = new Float32Array(n*3), c = new Float32Array(n*3); for(let i=0;i<n;i++){ const u = rnd(-1,1), th = rnd(0,6.283), q = Math.sqrt(1-u*u), v = new THREE.Vector3(q*Math.cos(th), u, q*Math.sin(th)).multiplyScalar(rnd(300,900)); p.set([v.x,v.y,v.z], i*3); const b = rnd(0.5,1.4); c.set([b,b,b*1.1], i*3); }
    g.setAttribute('position', new THREE.BufferAttribute(p,3)); g.setAttribute('color', new THREE.BufferAttribute(c,3)); O.stars = new THREE.Points(g, new THREE.PointsMaterial({size:2.2, sizeAttenuation:false, vertexColors:true})); IS.add(O.stars); }
  // particles
  { const g = new THREE.BufferGeometry(); ipPos = new Float32Array(IPMAX*3); ipCol = new Float32Array(IPMAX*3); g.setAttribute('position', new THREE.BufferAttribute(ipPos,3)); g.setAttribute('color', new THREE.BufferAttribute(ipCol,3));
    ipPts = new THREE.Points(g, new THREE.PointsMaterial({size:0.5, vertexColors:true, map:glowTex, transparent:true, blending:THREE.AdditiveBlending, depthWrite:false})); ipPts.frustumCulled = false; IS.add(ipPts); }
  // 1 · the empty stage and one spotlight
  { const S = set('stage'); const fl = new THREE.Mesh(new THREE.CircleGeometry(14, 48), new THREE.MeshStandardMaterial({color:0x14101c, roughness:0.4, metalness:0.3})); fl.rotation.x = -Math.PI/2; S.add(fl);
    O.spot = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 4.5, 16, 32, 1, true), new THREE.MeshBasicMaterial({color:0xfff0d0, transparent:true, opacity:0.09, blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide})); O.spot.position.y = 8; S.add(O.spot);
    O.spotPool = pool(0xfff0d0, 10, 0.6); O.spotPool.position.y = 0.02; S.add(O.spotPool); }
  // 2/5/6/7 · the crawl rows (upright glowing bars, read top to bottom)
  { const S = set('crawl'); O.rows = CRAWL.map((t,i)=>{ const m = textSlab(t, 26, i===0 ? '#ffe9a0' : i===6 ? '#ff9a6a' : '#ffd84a'); m.userData.y0 = -i*1.9; S.add(m); return m; }); }
  // 3 · the Emperor's throne room
  { const S = set('throne'); const fl = new THREE.Mesh(new THREE.CircleGeometry(16, 48), new THREE.MeshStandardMaterial({color:0x1a0a22, roughness:0.3, metalness:0.5})); fl.rotation.x = -Math.PI/2; S.add(fl);
    for(let i=0;i<8;i++){ const a = Math.PI*0.2 + i/7*Math.PI*0.6, p = new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.6,14,12), new THREE.MeshStandardMaterial({color:0x2a1438, roughness:0.5})); p.position.set(Math.cos(a)*12, 7, -Math.sin(a)*12); S.add(p); S.add(at(glow(0xff2a4a, 3, 0.5), p.position.x*0.95, 1.5, p.position.z*0.95)); }
    O.emperor = LOOK.piece(MODELS,'story','story.emperor',{outline:0.03}); O.emperor.scale.setScalar(1.6); S.add(O.emperor);
    O.redLight = new THREE.PointLight(0xff2a3a, 3, 20, 1.4); O.redLight.position.set(0, 0.8, 3.5); S.add(O.redLight); }
  // 4 · space: the Quarter Moon, the arcade planet, Baron Kaboom
  { const S = set('battle'); O.moon = LOOK.piece(MODELS,'story','story.moon',{outline:0.12}); S.add(O.moon); O.planet = LOOK.piece(MODELS,'story','story.arcade',{outline:0.08}); S.add(O.planet);
    O.baron = LOOK.piece(MODELS,'story','story.baron',{outline:0.03}); S.add(O.baron);
    O.beam = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 1, 12), new THREE.MeshBasicMaterial({color:new THREE.Color(0x7cff4f).multiplyScalar(2.2)})); O.beam.visible = false; S.add(O.beam); }
  // 9 · the black hole
  { const S = set('hole'); O.hole = new THREE.Group(); O.hole.add(new THREE.Mesh(new THREE.SphereGeometry(3, 32, 20), new THREE.MeshBasicMaterial({color:0x000000})));
    O.holeRings = [0,1,2,3].map(i=>{ const r = new THREE.Mesh(new THREE.RingGeometry(3.3+i*1.6, 4.3+i*1.9, 64), new THREE.MeshBasicMaterial({color:new THREE.Color([0x7a3aff,0xff4fb8,0x41e4ff,0x7a3aff][i]).multiplyScalar(1.4), transparent:true, opacity:0.55-i*0.1, blending:THREE.AdditiveBlending, side:THREE.DoubleSide, depthWrite:false})); O.hole.add(r); return r; });
    S.add(O.hole); O.qwing = LOOK.piece(MODELS,'story','story.qwing',{outline:0.04}); const pilot = LOOK.piece(MODELS,'story','story.baron',{outline:0.01}); pilot.scale.setScalar(0.22); pilot.position.set(0,-0.2,0); O.qwing.add(pilot); S.add(O.qwing); }
  // 11 · the Legendary Salty Dawg Saloon (outside sign, then the bar)
  { const S = set('saloon'); const fl = new THREE.Mesh(new THREE.PlaneGeometry(40, 30), new THREE.MeshStandardMaterial({color:0x2a1810, roughness:0.6})); fl.rotation.x = -Math.PI/2; S.add(fl);
    const back = new THREE.Mesh(new THREE.PlaneGeometry(40, 12), new THREE.MeshStandardMaterial({color:0x2a1416, roughness:0.9})); back.position.set(0, 6, -4); S.add(back);
    const shelf = LOOK.piece(MODELS,'story','story.shelf',{outline:0.02}); shelf.position.set(0, 0, -3.6); S.add(shelf);
    for(const x of [-4.5,-1.5,1.5,4.5]){ const b = LOOK.piece(MODELS,'props','prop.bar',{outline:0.02}); b.position.set(x, 0, -1); b.rotation.y = Math.PI/2; S.add(b); }
    for(const x of [-3,-1,1,3]){ const st = LOOK.piece(MODELS,'props','prop.stool',{outline:0.02}); st.position.set(x, 0, 1.2); S.add(st); }
    O.shots = []; for(let i=0;i<7;i++){ const sh = LOOK.piece(MODELS,'story','story.shot',{outline:0.008}); sh.position.set(0.8 + i*0.32, 1.12, 0.35); sh.visible = false; S.add(sh); O.shots.push(sh); }
    O.bottle = LOOK.piece(MODELS,'story','story.bottle',{outline:0.01}); O.bottle.position.set(-0.6, 1.12, 0.35); S.add(O.bottle);
    O.salSign = neonSign([['THE LEGENDARY','#ff4fb8',86,150],['SALTY DAWG','#41e4ff',150,290],['SALOON','#ffd23f',96,420]], 12); O.salSign.position.set(0, 9, 12); S.add(O.salSign);
    const front = new THREE.Mesh(new THREE.PlaneGeometry(26, 14), new THREE.MeshStandardMaterial({color:0x3a2014, roughness:0.8})); front.position.set(0, 7, 11.9); S.add(front);
    S.add(at(glow(0xff9a40, 10, 0.35), 0, 5, 0)); O.barLight = new THREE.PointLight(0xffa860, 2.4, 18, 1.4); O.barLight.position.set(0, 4, 2); S.add(O.barLight); }
  // 12-14 · the alley outside, the portal, the chrome assassin
  { const S = set('alley'); const fl = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({color:0x101018, roughness:0.15, metalness:0.6})); fl.rotation.x = -Math.PI/2; S.add(fl);
    const door = LOOK.piece(MODELS,'story','story.door',{outline:0.03}); door.position.set(0, 0, -2); S.add(door);
    const sign = neonSign([['SALTY DAWG','#41e4ff',150,256]], 6); sign.position.set(-2.5, 3.6, -1.6); S.add(sign);
    S.add(at(glow(0xffd8a0, 6, 0.5), 2.6, 3.6, -1.5)); O.alleyLight = new THREE.PointLight(0xffc890, 1.8, 14, 1.4); O.alleyLight.position.set(2.6, 3.6, -1); S.add(O.alleyLight);
    O.portal = new THREE.Group(); O.portal.position.set(6, 1.6, 4); O.portal.rotation.y = -0.6; for(let i=0;i<4;i++){ const r = new THREE.Mesh(new THREE.TorusGeometry(1.1+i*0.12, 0.05, 8, 48), new THREE.MeshBasicMaterial({color:new THREE.Color(0x6cff6a).multiplyScalar(2), transparent:true, opacity:0.8-i*0.15, blending:THREE.AdditiveBlending, depthWrite:false})); O.portal.add(r); }
    O.portalDisc = new THREE.Mesh(new THREE.CircleGeometry(1.1, 40), new THREE.MeshBasicMaterial({color:0x0a3a14, transparent:true, opacity:0.9})); O.portal.add(O.portalDisc, glow(0x6cff6a, 6, 0.6)); S.add(O.portal);
    O.chrome = LOOK.rawPiece(MODELS,'story','story.chrome'); const cm = chromeMat(); O.chrome.traverse(o=>{ if(o.isMesh) o.material = cm; }); S.add(O.chrome); }
  // Pac himself (with the story-only leather jacket + shades, switched on for the walk)
  O.pac = LOOK.character(MODELS, 'pac', {story:true}); IS.add(O.pac.root);
}
const show = (...names) => { for(const k in IO.sets) IO.sets[k].visible = names.includes(k); };
function pacPose(x, y, z, face, scale, o={}){ const R = IO.pac; R.extras.leatherB.visible = R.extras.leatherL.visible = R.extras.leatherR.visible = R.extras.shades.visible = !!o.cool;
  R.root.rotation.set(0, 0, 0); animRig(R, x, z, face, o.spd||0, o.walk||0, scale, {y, chomp:!!o.chomp, armsUp:!!o.armsUp}); if(o.slump && R.bones.body){ R.bones.body.rotation.x = 0.38; if(R.bones.head) R.bones.head.rotation.x = 0.3; } R.root.visible = true; }
const _mv = new THREE.Vector3();
function mouthPos(){ IO.pac.root.updateMatrixWorld(true); return IO.pac.bones.jawL.getWorldPosition(_mv).clone(); }   // where his jaw is in the world (for things he eats)
function cam(px, py, pz, lx, ly, lz){ IC.position.set(px, py, pz); IC.lookAt(lx, ly, lz); }
const ease = f => f<0.5 ? 2*f*f : 1-Math.pow(-2*f+2,2)/2, mix = (a,b,f) => a+(b-a)*f;

// ---------------- the director: one function per beat ----------------
function direct(b, t, f){
  const O = IO; O.pac.root.visible = false; O.stars.visible = [1,3,4,5,6,7,8,9].includes(b); IS.background.setHex(b===2 ? 0x0a0310 : b>=10 ? 0x05030a : 0x020106);
  if(b===0){ show('stage'); const on = t > 1.4; O.spot.visible = O.spotPool.visible = on; once('spot', ()=>setTimeout(()=>{ noise(0.15, 0.4, null, {freq:3000}); tone(60,0.3,'sine',0.3,0.5); }, 1400));
    cam(0, 5 + f*0.5, 14 - f*2, 0, 1.5, 0); O.key.position.set(0, 10, 2); }
  else if(b===1 || (b>=4 && b<=6)){ show('crawl');
    const T4 = BEAT_AT[b]-BEAT_AT[4] + t, rowsUp = b===1 ? f*10.5 - 3 : (-4 + 1.95 - 1.4) + Math.max(0, T4-2.4)*1.0;   // the crawl scrolls up; in beat 5 its top row starts just under his mouth
    if(b===1){ once('narr', ()=>speak(NARRATION, 0.8, 0.92)); O.rows.forEach(r=>{ r.visible = true; r.position.set(0, r.userData.y0 + rowsUp, 0); r.scale.set(1,1,1); }); cam(0, 0.5, 22, 0, 0.5, 0); }
    else { // Pac tumbles in, finds his feet, and starts eating the rows as they reach his mouth — growing with each one
      const T = BEAT_AT[b]-BEAT_AT[4] + t; O.pac.grow = O.pac.grow || 1; const g = 1 + (O.eaten||0)*0.28, px = -9.5, py = -4;
      let x = px, y = py, face = Math.PI/2, spin = 0;
      if(T < 1.6){ const k = T/1.6; x = mix(-24, px, k); y = py + Math.sin(k*Math.PI)*4; spin = k*10; once('tumble', ()=>SFX.whoosh()); }
      else if(T < 2.4){ once('land', ()=>{ SFX.boing(); ipBurst(px, py, 0, 0xffffff, 30, 6); }); y = py + Math.abs(Math.sin((T-1.6)*8))*0.4*(2.4-T); }
      pacPose(x, y, 0, face, g, {chomp: O.chompT > 0, spd: T < 1.6 ? 4 : 0, walk:T*8}); O.pac.root.rotation.z = -spin;
      const mouthY = py + 1.95*g;
      O.chompT = Math.max(0, (O.chompT||0) - 1/60);
      O.rows.forEach((r,i)=>{ if(r.userData.gone){ r.visible = false; return; } r.visible = true; let ry = r.userData.y0 + rowsUp;
        if(T > 2.4 && ry >= mouthY - 0.3 && !r.userData.eat && !O.rows.some(q=>q.userData.eat && !q.userData.gone)){ r.userData.eat = T; }   // one row at a time
        const mouthX = px + 0.75*g;
        if(r.userData.eat){ const k = Math.min(1, (T - r.userData.eat)/0.7); ry = mouthY; r.scale.x = Math.max(0.001, 1-k); r.position.x = mouthX + 13*(1-k); O.chompT = 0.3;   // slurped in like spaghetti
          if(Math.random()<0.6) ipBurst(px + 0.8*g, mouthY, 0, 0xffd84a, 2, 3, 4, 0.5); if(k >= 1){ r.userData.gone = true; O.eaten = (O.eaten||0)+1; SFX.chomp(); ipBurst(px+0.8*g, mouthY, 0, 0xffe9a0, 30, 5); } }
        else r.position.x = mouthX + 13.3;
        r.position.y = ry; });
      if(b===5 && t > 1.2) once('cut', ()=>{ if('speechSynthesis' in window) speechSynthesis.cancel(); SFX.chomp(); });
      const pull = b===6 ? ease(f) : 0; cam(-3, py + 3.2 + pull*3, 15 + pull*7, -2.5, py + 2.6 + pull*2, 0); }   // the camera holds still, so you see him grow
    O.key.position.copy(IC.position).add(new THREE.Vector3(0, 6, 0)); }
  else if(b===2){ show('throne'); const shake = t > 1 ? Math.sin(introT*40)*0.03 : 0; O.emperor.position.set(shake, 0, 0); O.emperor.rotation.y = 0;
    O.redLight.intensity = 3 + Math.sin(introT*9)*1.2; cam(0.6 - f*0.6, 4.2 - f*0.6, 9 - f*3, 0, 3.6, 0); O.key.position.set(0, 6, 6);
    if(t > 1) once('laugh', ()=>{ for(let i=0;i<8;i++) tone(220 - i*8, 0.12, 'sawtooth', 0.04, 0.8, null, i*0.13); speak('Ha ha ha ha ha!', 0.3, 0.9); });
    if(t > 3.2) once('doit', ()=>speak('Do it.', 0.2, 0.7)); }
  else if(b===3){ show('battle'); const fire = t > 3.2, boom = t > 4.4;
    O.moon.position.set(-14, 2, -10); O.moon.rotation.set(0, 0.5, 0); O.planet.position.set(16, 0, -14); O.planet.rotation.y = introT*0.2; O.planet.visible = !boom || t < 4.6;
    O.baron.position.set(-6, -3, 6); O.baron.rotation.y = 0.5; O.baron.visible = t < 3.0;
    if(t < 3.0){ cam(-3.5, -0.5, 13, -6, -0.2, 6); if(t > 1.2) once('fist', ()=>speak('Fire!', 0.4, 0.9)); }
    else cam(0, 4, 30, 1, 0, -12);
    if(fire && t < 4.6){ O.moon.updateMatrixWorld(true); const k = Math.min(1, (t-3.2)/0.6), a = O.moon.localToWorld(new THREE.Vector3(0, 0.7, 0.45)), bpt = new THREE.Vector3(16, 0, -14), mid = a.clone().lerp(bpt, k*0.5), len = a.distanceTo(bpt)*k;
      O.beam.visible = true; O.beam.scale.set(1, len, 1); O.beam.position.copy(a.clone().lerp(bpt, k*0.5)); O.beam.lookAt(bpt); O.beam.rotateX(Math.PI/2); once('laser', ()=>{ tone(880, 0.8, 'sawtooth', 0.06, 0.25); noise(0.8, 0.12, null, {freq:2000, sweep:400}); }); }
    else O.beam.visible = false;
    if(boom) once('kaboom', ()=>{ SFX.boom(1.6); ipBurst(16, 0, -14, 0xff4fb8, 400, 22, 0, 2.2); ipBurst(16, 0, -14, 0xffe14d, 300, 16, 0, 2); ipBurst(16, 0, -14, 0x41e4ff, 200, 26, 0, 1.6); });
    O.key.position.set(0, 10, 10); }
  else if(b===7){ show('battle'); O.planet.visible = false; O.baron.visible = false; O.beam.visible = false;   // the giant eats the Quarter Moon
    const g = 14, k = ease(Math.min(1, t/4.2)); pacPose(-14, -30, 0, Math.PI/2*0.6, g, {chomp: t < 4.6}); const M = mouthPos().add(new THREE.Vector3(2.5, 0.5, 2));
    O.moon.position.set(mix(10, M.x, k), mix(10, M.y, k), mix(-8, M.z, k)); O.moon.scale.setScalar(Math.max(0.01, mix(1, 0.05, Math.max(0, (t-3.6)/1.0))));
    O.moon.rotation.y += 0.01; if(t > 4.4) once('gulp', ()=>{ SFX.chomp(); setTimeout(()=>SFX.chomp(), 180); ipBurst(M.x, M.y, M.z, 0x9a9aa8, 120, 10); });
    cam(8, -2, 46, -7, -5, 0); O.key.position.set(20, 30, 40); }
  else if(b===8){ show('hole'); const g = 14; O.qwing.visible = false;   // BURP — then he farts himself into a black hole
    O.hole.position.set(-40, 2, -10); O.hole.lookAt(IC.position); O.holeRings.forEach((r,i)=>r.rotation.z = introT*(1.5 + i*0.6)); O.hole.scale.setScalar(t < 2.6 ? 0.01 : Math.min(1.6, (t-2.6)*1.2));
    if(t < 2.4){ pacPose(-14, -30, 0, Math.PI/2*0.6, g, {chomp: t > 0.3 && t < 1.6}); if(t > 0.3) once('burp', ()=>{ SFX.burp(); const M = mouthPos(); ipBurst(M.x+2, M.y, M.z+1, 0x7cff8a, 160, 18, 0, 1.2); }); }
    else { const k = Math.min(1, (t-2.6)/3), pos = new THREE.Vector3(-14, -30, 0).lerp(new THREE.Vector3(-40, -8, -10), ease(k));
      pacPose(pos.x, pos.y, pos.z, Math.PI/2*0.6 + k*12, g*(1-k*0.95), {}); once('fart', ()=>{ SFX.fart(1.6); }); if(Math.random()<0.8) ipBurst(pos.x + 10*(1-k), pos.y + 20*(1-k), pos.z, 0x8adc5a, 4, 6, 0, 1.4); }
    cam(10, 4, 70, -14, 2, -4); O.key.position.set(20, 30, 40); }
  else if(b===9){ show('hole'); O.hole.position.set(-40, 2, -10); O.hole.scale.setScalar(Math.max(0.01, 1.6 - t*0.5)); O.holeRings.forEach((r,i)=>r.rotation.z = introT*(1.5 + i*0.6));
    O.qwing.visible = true; O.qwing.position.set(mix(-30, 30, f), 3 + Math.sin(t*2)*0.6, 4); O.qwing.rotation.set(0, 0, 0.25*Math.sin(t*3)); if(Math.random()<0.7) ipBurst(O.qwing.position.x - 1.5, O.qwing.position.y, O.qwing.position.z, 0xff9a30, 3, 3, 0, 0.4);
    once('engine', ()=>{ tone(110, 4, 'sawtooth', 0.03, 1.8); noise(4, 0.05, null, {freq:500}); }); if(t > 2) once('vow', ()=>speak('I will hunt you down, Pac!', 1.3, 1.05));
    cam(0, 4, 18, O.qwing.position.x*0.6, 2.5, 0); O.key.position.set(0, 10, 15); }
  else if(b===10){ show('saloon'); O.stars.visible = false; const out = t < 3;
    if(out){ cam(0, 4, 30, 0, 8, 12); O.salSign.material.opacity = Math.sin(introT*7) > -0.85 ? 1 : 0.25; O.key.position.set(0, 6, 22); }
    else { const k = (t-3)/5; O.salSign.material.opacity = 1; pacPose(0, 0, 1.15, Math.PI, 1, {slump:true}); const nShots = Math.min(7, Math.floor(k*9)); O.shots.forEach((s,i)=>s.visible = i < nShots);
      if(Math.floor(k*9) > (O.lastShot||0)){ O.lastShot = Math.floor(k*9); O.pac.snapAt = rtime; tone(1200, 0.05, 'triangle', 0.03); }
      if(Math.random()<0.04) ipBurst(0.12, 2.6, 1.45, 0x9fc8ff, 1, 0.3, 6, 1);
      cam(1.3, 2.3, -2.3, 0, 2.0, 1.2); O.key.position.set(1, 4, -1); } }
  else if(b>=11 && b<=13){ show('alley'); O.stars.visible = false; O.key.position.set(3, 5, 6);
    if(b===11){ once('whistle', ()=>SFX.whistle(0)); const op = Math.max(0, Math.min(1, (t-2.6)*1.2)); O.portal.visible = op > 0; O.portal.scale.setScalar(op*1.4); O.portal.children.forEach((r,i)=>{ if(r.isMesh && r.geometry.type==='TorusGeometry') r.rotation.z = introT*(2+i); });
      if(op > 0) once('portal', ()=>{ noise(1.2, 0.15, null, {freq:400, sweep:3000}); tone(55, 1.2, 'sawtooth', 0.08, 2); }); if(op > 0 && Math.random()<0.5) ipBurst(6, 1.6, 4, 0x6cff6a, 3, 3, 0, 0.6);
      const w = Math.max(0, t-4.4); O.chrome.visible = t > 4.4; O.chrome.position.set(mix(6, 3.2, Math.min(1, w/2.5)), 0, mix(4, 2.6, Math.min(1, w/2.5))); O.chrome.rotation.y = -2.2; O.chrome.scale.setScalar(1.25);
      cam(-4, 2.2, 10, 3, 1.6, 2); }
    else if(b===12){ O.portal.visible = false; O.chrome.visible = t < 1.5; O.chrome.position.set(2.4, 0, 2.2); const lunge = Math.min(1, t/1.3);
      pacPose(mix(0, 1.6, lunge), 0, mix(-0.6, 1.8, lunge), Math.atan2(2.4, 2.8), 1.15, {chomp: t > 0.5 && t < 1.8, spd:3, walk:t*8});
      if(t > 1.3) once('eat', ()=>{ SFX.chomp(); setTimeout(()=>SFX.chomp(), 150); ipBurst(2.3, 1.4, 2.2, 0xd8e0ec, 120, 7, 6, 1); });
      cam(-1.5, 2.2, 7.5, 1.4, 1.5, 1.6); }
    else { const walkZ = mix(0, 6.5, f); pacPose(0, 0, walkZ, 0, 1.15, {cool:true, spd:2.2, walk:introT*4});   // the walk: slow, cool, toward you
      once('bass', ()=>{ for(let i=0;i<6;i++) tone(55, 0.35, 'sawtooth', 0.08, 1, null, i*0.8); }); cam(0.6, 0.7, walkZ + 4.2, 0, 1.9, walkZ); O.key.position.set(1, 3, walkZ + 3); } }
  else if(b===14){ show(); O.stars.visible = true; cam(0, 0, 30, 0, 0, 0); once('title', ()=>{ SFX.boom(1.2); [262,330,392,523].forEach((fq,i)=>tone(fq, 0.6, 'sawtooth', 0.04, 1, null, i*0.12, 0.6)); }); }
}

// ---------------- the comic overlay: captions, bubbles, sound words ----------------
const INK = '#0c0a08';
function bubble(x, y, text, size, tail=[0,1]){ ix.font = `900 ${size|0}px Cinzel, Georgia`; const w = ix.measureText(text).width*1.2 + size*1.6, h = size*1.9;
  ix.fillStyle = '#fff'; ix.strokeStyle = INK; ix.lineWidth = 3; ix.beginPath(); ix.ellipse(x, y, w/2, h/2, 0, 0, Math.PI*2); ix.fill(); ix.stroke();
  ix.beginPath(); ix.moveTo(x - size*0.4, y + h*0.38); ix.lineTo(x + tail[0]*size*1.6, y + tail[1]*size*1.6); ix.lineTo(x + size*0.4, y + h*0.4); ix.fill(); ix.stroke();
  ix.fillStyle = INK; ix.textAlign = 'center'; ix.textBaseline = 'middle'; ix.fillText(text, x, y+1); }
function sfxText(x, y, text, size, fill, rot=0){ ix.save(); ix.translate(x,y); ix.rotate(rot); ix.font = `900 ${size|0}px Cinzel, Georgia`; ix.textAlign = 'center'; ix.textBaseline = 'middle'; ix.lineWidth = size*0.14; ix.strokeStyle = INK; ix.strokeText(text, 0, 0); ix.fillStyle = fill; ix.fillText(text, 0, 0); ix.restore(); }
function captionBox(text, S, W, H){ const bh = S*0.07, by = H - bh - S*0.05, bx = S*0.04; ix.font = `700 ${Math.max(14, S*0.03)|0}px Rajdhani, system-ui`; const w = Math.min(W - bx*2, ix.measureText(text).width + S*0.05);
  ix.fillStyle = '#f2d878'; ix.strokeStyle = INK; ix.lineWidth = 4; ix.fillRect(bx, by, w, bh); ix.strokeRect(bx, by, w, bh); ix.fillStyle = INK; ix.textAlign = 'left'; ix.textBaseline = 'middle'; ix.fillText(text, bx + S*0.025, by + bh/2); }
function proj(x, y, z){ const v = new THREE.Vector3(x,y,z).project(IC); return [(v.x*0.5+0.5)*ic.width, (-v.y*0.5+0.5)*ic.height]; }
function overlay(b, t, f){
  const W = ic.width = ic.clientWidth, H = ic.height = ic.clientHeight, S = Math.min(W, H); ix.clearRect(0,0,W,H);
  // letterbox bars: it's a film
  ix.fillStyle = '#000'; ix.fillRect(0,0,W,H*0.07); ix.fillRect(0,H*0.93,W,H*0.07);
  if(b===0 && t > 3){ ix.globalAlpha = Math.min(1, t-3); ix.fillStyle = '#f2d24a'; ix.font = `italic 700 ${S*0.04|0}px Cinzel, Georgia`; ix.textAlign = 'center'; ix.fillText(CRAWL[0], W/2, H*0.32); ix.globalAlpha = 1; }
  if(b===2){ if(t > 1) sfxText(W*0.28, H*0.3, 'HA HA HA', S*0.06, '#c8b4ff', -0.2); if(t > 3.2){ const [x,y] = proj(0.4, 5.6, 0); bubble(x + S*0.12, y - S*0.04, 'DO IT.', S*0.07, [-0.8, 1]); } }
  if(b===3){ if(t > 1.2 && t < 3){ const [x,y] = proj(-6, 0.6, 6); bubble(x + S*0.12, y - S*0.08, 'FIRE!', S*0.06, [-0.6, 1]); } if(t > 4.4){ const k = Math.min(1,(t-4.4)/0.6); sfxText(W*0.72, H*0.45, 'KA-BOOM!', S*0.1*(0.6+k*0.5), '#ffe14d', 0.1); } }
  if(b===4 && IO.pac.root.visible && introT - BEAT_AT[4] > 1.4 && introT - BEAT_AT[4] < 2.6) sfxText(W*0.25, H*0.35, 'WHOA—', S*0.06, '#fff', -0.2);
  if(b===5){ const said = NARRATION.slice(0, Math.floor(Math.min(1, t/1.2)*NARRATION.length)); captionBox(t < 1.2 ? 'NARRATOR: "...' + said.slice(-58) + '"' : 'NARRATOR: "...and his enforcer, Baron Kab—"', S, W, H); if(t > 1.2 && t < 2.2) sfxText(W*0.36, H*0.42, 'CHOMP!', S*0.08, '#ffe14d', -0.1); }
  if(b===8){ if(t > 0.3 && t < 2.4) sfxText(W*0.42, H*0.3, 'BUUURRRP!', S*0.11, '#7cff8a', -0.12); if(t > 2.6) sfxText(W*0.3, H*0.68, 'PFFFRRRT!', S*0.09, '#b8e86a', 0.15); }
  if(b===9 && t > 2){ const q = IO.qwing.position, [x,y] = proj(q.x, q.y + 1.5, q.z); bubble(x, y - S*0.06, 'I\'LL HUNT YOU DOWN, PAC!', S*0.04, [0, 1]); }
  if(b===10 && t > 5){ const [x,y] = proj(0, 2.6, 1.15); bubble(x - S*0.2, y - S*0.08, '...another.', S*0.035, [0.9, 1]); }
  if(b===12 && t > 1.3 && t < 3.2) sfxText(W*0.55, H*0.32, 'CHOMP!', S*0.12, '#ffe14d', -0.1);
  if(b===14){ const k = Math.min(1, t/1.2); ix.save(); ix.globalAlpha = k; ix.fillStyle = 'rgba(0,0,0,.55)'; ix.fillRect(0,0,W,H); ix.textAlign = 'center'; ix.textBaseline = 'middle';
    ix.fillStyle = '#f6dc95'; ix.shadowColor = '#ff4fb8'; ix.shadowBlur = 40; ix.font = `900 ${S*0.2|0}px Cinzel, Georgia`; ix.fillText('PAC', W/2, H/2 - S*0.04); ix.font = `700 ${S*0.05|0}px Cinzel, Georgia`; ix.fillStyle = '#ff4fb8'; ix.fillText('J U D G E M E N T   D A Y', W/2, H/2 + S*0.12); ix.restore(); }
  if(BEATS[b].cap) captionBox(BEATS[b].cap.slice(0, Math.floor(BEATS[b].cap.length*Math.min(1, t*1.6/Math.max(1, BEATS[b].cap.length/24)))), S, W, H);
  // a beat change flashes like a comic page turning
  if(t < 0.18){ ix.fillStyle = `rgba(255,255,255,${0.35*(1-t/0.18)})`; ix.fillRect(0,0,W,H); }
}

// ---------------- play / stop ----------------
function playIntro(done){ introDone = done; state = 'intro'; hideAllOverlays(); $('hud').classList.add('hide'); $('touch').classList.add('hide');
  buildIntro(); IO.eaten = 0; IO.lastShot = 0; IO.rows.forEach(r=>{ r.userData.gone = false; r.userData.eat = 0; r.scale.set(1,1,1); }); IO.moon.scale.setScalar(1); IP.length = 0;
  ic.classList.remove('hide'); $('skip').textContent = isMobile ? 'tap to skip' : 'click or any key to skip'; $('skip').classList.remove('hide'); introT = 0; introFired = {}; let lastI = performance.now(); audio(); setTrack('menu');
  renderPass.scene = IS; renderPass.camera = IC; afterimage.enabled = false; gradePass.enabled = false;
  const step = now=>{ const dt = Math.max(0, Math.min(0.05, (now-lastI)/1000)); lastI = now; introT += dt;
    try{ let b = 0; while(b < BEATS.length-1 && introT >= BEAT_AT[b+1]) b++; const t = introT - BEAT_AT[b], f = t/BEATS[b].d;
      IC.aspect = SW/SH; IC.updateProjectionMatrix(); direct(b, t, f);
      LOOK.hatchU.uLight.value.copy(IC.position).sub(IO.key.position.clone().multiplyScalar(0)).normalize().add(new THREE.Vector3(0,1.2,0)).normalize();   // ink light from the camera's side
      for(let i=0;i<IPMAX;i++){ const p = IP[i]; if(p){ p.life -= dt; p.vy -= p.grav*dt; p.x += p.vx*dt; p.y += p.vy*dt; p.z += p.vz*dt; const a = Math.max(0, Math.min(1, p.life*2)); ipPos[i*3] = p.x; ipPos[i*3+1] = p.y; ipPos[i*3+2] = p.z; ipCol[i*3] = p.c.r*a*1.6; ipCol[i*3+1] = p.c.g*a*1.6; ipCol[i*3+2] = p.c.b*a*1.6; } else ipPos[i*3+1] = -9999; }
      for(let i=IP.length-1;i>=0;i--) if(IP[i].life <= 0) IP.splice(i,1);
      ipPts.geometry.attributes.position.needsUpdate = true; ipPts.geometry.attributes.color.needsUpdate = true;
      if(bloom.enabled) composer.render(dt); else renderer.render(IS, IC); overlay(b, t, f); }catch(e){ console.error(e); }
    if(introT >= INTRO_LEN){ endIntro(); return; } introRAF = requestAnimationFrame(step); };
  introRAF = requestAnimationFrame(step); ic.onclick = endIntro; }
function endIntro(){ if(state!=='intro') return; cancelAnimationFrame(introRAF); ic.classList.add('hide'); $('skip').classList.add('hide'); if('speechSynthesis' in window) speechSynthesis.cancel();
  renderPass.scene = scene; renderPass.camera = camera; state = 'menu'; const d = introDone; introDone = null; if(d) d(); else toMenu(); }
