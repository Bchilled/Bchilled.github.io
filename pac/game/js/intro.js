// PAC v0.7 — intro.js. THE INTRO, beat for beat from INTRO.md (Brent's dictation). Not rushed: ~95 s.
// Presented as COMIC WINDOWS: inked panels that slide in like turning pages, with narration boxes and speech bubbles.
// Nothing here is invented beyond what the script says; it only animates it.
"use strict";
const ic = $('introC'), ix = ic.getContext('2d'); let introT = 0, introRAF = 0, introDone = null, introFired = {};
const BEATS = [
  {d:5,  cap:''},                                                             // 1 darkness, spotlight snaps on
  {d:10, cap:''},                                                             // 2 the crawl
  {d:6,  cap:'The Emperor.'},                                                 // 3 Emperor laughing: DO IT
  {d:8,  cap:'Darth Bomberguy turns the Death Star on an arcade-booth planet.'}, // 4 the crime
  {d:8,  cap:'And then — a fool. A legend. Both.'},                           // 5 Pac's comedic entrance, eats the crawl row by row
  {d:6,  cap:''},                                                             // 6 the narrator can't keep up — cut off mid-word
  {d:5,  cap:'Every row he eats, he grows.'},                                 // 7 growth
  {d:6,  cap:'Fully grown, he eats the entire Death Star.'},                  // 8
  {d:6,  cap:''},                                                             // 9 burp — then farts himself into a black hole
  {d:6,  cap:'Darth Bomberguy escapes in the Q-Wing.'},                       // 10 the vow
  {d:8,  cap:'The Legendary Salty Dawg Saloon.'},                             // 11 shots, sad and depressed
  {d:7,  cap:'Outside, something is sent to kill him.'},                      // 12 the whistle, the portal, the chrome assassin (naked)
  {d:4,  cap:''},                                                             // 13 Pac eats him
  {d:6,  cap:''},                                                             // 14 the T2 walk: leathers, shades
  {d:6,  cap:''}];                                                            // 15 TITLE
const BEAT_AT = []; { let a = 0; for(const b of BEATS){ BEAT_AT.push(a); a += b.d; } } const INTRO_LEN = BEATS.reduce((a,b)=>a+b.d, 0);
const CRAWL = ['In a galaxy far, far away...', '', 'THE RULES: eat everything that isn\'t nailed down.', 'Ghosts chase. Pac eats. Towers fall.', 'Every boss you beat joins you.', '',
  'THE STORY: the Emperor rules the arcade galaxy', 'with an iron joystick. His enforcer,', 'DARTH BOMBERGUY, answers only to him...'];
const NARRATION = 'In a galaxy far, far away, the rules are simple: eat everything that isn\'t nailed down. Ghosts chase. Pac eats. Towers fall. The Emperor rules the arcade galaxy with an iron joystick, and his enforcer, Darth Bomb';
const STARS_I = Array.from({length:220}, ()=>[Math.random(), Math.random(), Math.random()]);
function playIntro(done){ introDone = done; state = 'intro'; hideAllOverlays(); ic.classList.remove('hide'); $('skip').classList.remove('hide'); introT = 0; introFired = {}; let lastI = performance.now(); audio(); setTrack('menu');
  const step = now=>{ const dt = Math.max(0, Math.min(0.05, (now-lastI)/1000)); lastI = now; introT += dt; try{ drawIntro(); }catch(e){ console.error(e); } if(introT >= INTRO_LEN){ endIntro(); return; } introRAF = requestAnimationFrame(step); };
  introRAF = requestAnimationFrame(step); ic.onclick = endIntro; }
function endIntro(){ if(state!=='intro') return; cancelAnimationFrame(introRAF); ic.classList.add('hide'); $('skip').classList.add('hide'); if('speechSynthesis' in window) speechSynthesis.cancel(); state = 'menu'; const d = introDone; introDone = null; if(d) d(); else toMenu(); }
const once = (k, f) => { if(!introFired[k]){ introFired[k] = 1; f(); } };
function speak(text, pitch=1, rate=1){ if(SAVE.set.muted || !('speechSynthesis' in window)) return; try{ speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.pitch = pitch; u.rate = rate; speechSynthesis.speak(u); }catch(e){} }
// ---------- ink drawing kit ----------
const INK = '#0c0a08';
function hatch(path, gap, ang, col='#1a120a', alpha=0.5){ ix.save(); path(); ix.clip(); ix.strokeStyle = col; ix.lineWidth = 1.3; ix.globalAlpha = alpha; const W = ic.width, H = ic.height, s = Math.max(W,H)*1.5;
  ix.translate(W/2, H/2); ix.rotate(ang); for(let y=-s; y<s; y+=gap){ ix.beginPath(); ix.moveTo(-s, y + Math.sin(y*0.3)*1.2); ix.lineTo(s, y + Math.cos(y*0.2)*1.2); ix.stroke(); } ix.restore(); }
function shape(path, fill, lw=3, shade=true, sx=0.3, sy=0.3){ ix.fillStyle = fill; path(); ix.fill(); if(shade) hatch(path, 5, -0.7, '#1a120a', 0.35); ix.strokeStyle = INK; ix.lineWidth = lw; path(); ix.stroke(); }
const circ = (x,y,r) => () => { ix.beginPath(); ix.arc(x,y,Math.max(0.5,r),0,Math.PI*2); };
const ell = (x,y,rx,ry,rot=0) => () => { ix.beginPath(); ix.ellipse(x,y,Math.max(0.5,rx),Math.max(0.5,ry),rot,0,Math.PI*2); };
const rect = (x,y,w,h) => () => { ix.beginPath(); ix.rect(x,y,w,h); };
function bubble(x, y, text, size, tail=[0,1], col='#fff', tc=INK){ ix.font = `900 ${size|0}px Cinzel, Georgia`; const w = ix.measureText(text).width*1.2 + size*1.6, h = size*1.9;   // an ellipse needs extra width so the text clears its curved ends
  ix.fillStyle = col; ix.strokeStyle = INK; ix.lineWidth = 3; ix.beginPath(); ix.ellipse(x, y, w/2, h/2, 0, 0, Math.PI*2); ix.fill(); ix.stroke();
  ix.beginPath(); ix.moveTo(x - size*0.4, y + h*0.38); ix.lineTo(x + tail[0]*size*1.6, y + tail[1]*size*1.6); ix.lineTo(x + size*0.4, y + h*0.4); ix.fill(); ix.stroke();
  ix.fillStyle = tc; ix.textAlign = 'center'; ix.textBaseline = 'middle'; ix.fillText(text, x, y+1); }
function caption(x, y, w, text, size){ ix.font = `600 ${size|0}px Rajdhani, system-ui`; const h = size*1.9; ix.fillStyle = '#f2d878'; ix.strokeStyle = INK; ix.lineWidth = 3; ix.fillRect(x, y, w, h); ix.strokeRect(x, y, w, h);
  ix.fillStyle = INK; ix.textAlign = 'left'; ix.textBaseline = 'middle'; ix.fillText(text, x + size*0.6, y + h/2); }
function sfxText(x, y, text, size, fill, rot=0){ ix.save(); ix.translate(x,y); ix.rotate(rot); ix.font = `900 ${size|0}px Cinzel, Georgia`; ix.textAlign = 'center'; ix.textBaseline = 'middle'; ix.lineWidth = size*0.14; ix.strokeStyle = INK; ix.strokeText(text, 0, 0); ix.fillStyle = fill; ix.fillText(text, 0, 0); ix.restore(); }
// Pac in 2D, matching the 3D model: yellow ball, backwards red cap, cocky brows, white gloves, red sneakers
function pac2d(x, y, r, open, o={}){ const face = o.face||1;
  if(o.legs !== false){ for(const s of [-1,1]){ const lx = x + s*r*0.38, sw = Math.sin((o.walk||0) + (s>0?Math.PI:0))*r*0.18; ix.strokeStyle = INK; ix.lineWidth = r*0.2; ix.lineCap = 'round'; ix.beginPath(); ix.moveTo(lx, y + r*0.8); ix.lineTo(lx + sw, y + r*1.45); ix.stroke();
    ix.strokeStyle = '#e0c24e'; ix.lineWidth = r*0.13; ix.stroke(); shape(ell(lx + sw + face*r*0.12, y + r*1.52, r*0.3, r*0.15), o.leather ? '#1a1414' : '#b8362e', 2.5, false); } }
  const body = () => { ix.beginPath(); ix.moveTo(x, y); ix.arc(x, y, r, (face>0?0:Math.PI) + open, (face>0?0:Math.PI) + Math.PI*2 - open); ix.closePath(); };
  shape(body, o.col||'#e3c24a', Math.max(3, r*0.06));
  if(open > 0.05){ ix.fillStyle = '#4a1820'; ix.beginPath(); ix.moveTo(x, y); ix.arc(x, y, r*0.92, (face>0?0:Math.PI) - open*0.9 + Math.PI*2, (face>0?0:Math.PI) + open*0.9 + Math.PI*2); ix.closePath(); ix.globalAlpha = 0.0; ix.fill(); ix.globalAlpha = 1; }
  if(o.leather){ shape(() => { ix.beginPath(); ix.arc(x, y, r, 0.25*Math.PI, 0.75*Math.PI); ix.lineTo(x, y + r*0.3); ix.closePath(); }, '#1c1818', 3); }
  // backwards cap
  if(!o.noCap){ shape(() => { ix.beginPath(); ix.arc(x, y, r*1.02, Math.PI*1.15, Math.PI*1.85); ix.lineTo(x + r*0.6, y - r*0.55); ix.lineTo(x - r*0.6, y - r*0.55); ix.closePath(); }, '#a8362e', 3);
    shape(() => { ix.beginPath(); ix.ellipse(x - face*r*0.95, y - r*0.62, r*0.42, r*0.1, -face*0.35, 0, Math.PI*2); }, '#a8362e', 3, false); }
  // eye + brow (or shades)
  const ex = x + face*r*0.22, ey = y - r*0.42;
  if(o.shades){ shape(rect(ex - r*0.42, ey - r*0.12, r*0.84, r*0.24), '#050505', 3, false); ix.fillStyle = 'rgba(160,200,255,.5)'; ix.fillRect(ex - r*0.3, ey - r*0.08, r*0.18, r*0.06); }
  else { shape(ell(ex, ey, r*0.15, r*0.2), '#f3eee2', 2.5, false); ix.fillStyle = INK; ix.beginPath(); ix.ellipse(ex + face*r*0.05, ey + (o.sad?r*0.06:0), r*0.07, r*0.1, 0, 0, Math.PI*2); ix.fill();
    ix.strokeStyle = '#5a3f14'; ix.lineWidth = r*0.07; ix.lineCap = 'round'; ix.beginPath(); if(o.sad){ ix.moveTo(ex - r*0.2, ey - r*0.2); ix.lineTo(ex + r*0.18, ey - r*0.32); } else { ix.moveTo(ex - r*0.2, ey - r*0.33); ix.lineTo(ex + r*0.2, ey - r*0.27); } ix.stroke(); }
  if(o.arms !== false){ for(const s of [-1,1]){ const hx = x + s*r*1.08, hy = y + r*0.25 + (o.armUp && s===face ? -r*0.9 : 0); shape(circ(hx, hy, r*0.17), '#ebe5d6', 2.5, false); } }
}
function bomberguy(x, y, s, o={}){ // locked look v2: white bomb head, antenna + red ball/fuse, oval eyes, big grin; blue suit, white gloves, black belt + gold buckle, black cape with red lining
  shape(() => { ix.beginPath(); ix.moveTo(x - s*0.55, y - s*0.1); ix.quadraticCurveTo(x - s*1.0 - Math.sin(rtime*3)*s*0.1, y + s*1.1, x - s*0.8, y + s*1.6); ix.lineTo(x + s*0.8, y + s*1.6); ix.quadraticCurveTo(x + s*1.0, y + s*1.1, x + s*0.55, y - s*0.1); ix.closePath(); }, '#121014', 3, false);
  ix.fillStyle = '#7a1018'; ix.beginPath(); ix.moveTo(x - s*0.5, y + s*0.1); ix.lineTo(x - s*0.7, y + s*1.5); ix.lineTo(x + s*0.7, y + s*1.5); ix.lineTo(x + s*0.5, y + s*0.1); ix.fill();
  shape(() => { ix.beginPath(); ix.roundRect ? ix.roundRect(x - s*0.45, y, s*0.9, s*1.0, s*0.25) : ix.rect(x - s*0.45, y, s*0.9, s*1.0); }, '#2a5ad8', 3);
  shape(rect(x - s*0.47, y + s*0.55, s*0.94, s*0.12), '#111', 2, false); shape(rect(x - s*0.1, y + s*0.53, s*0.2, s*0.16), '#e8c040', 2, false);
  for(const k of [-1,1]){ shape(ell(x + k*s*0.25, y + s*1.2, s*0.17, s*0.24), '#2a5ad8', 3, false); shape(ell(x + k*s*0.27, y + s*1.42, s*0.22, s*0.1), '#f0ece0', 2.5, false);
    const hy = y + s*0.4 + (o.fist && k===1 ? -s*0.7 + Math.sin(rtime*14)*s*0.06 : 0); shape(circ(x + k*s*0.6, hy, s*0.16), '#f4f0e6', 2.5, false); }
  shape(circ(x, y - s*0.35, s*0.5), '#f4f0e6', 3);
  ix.strokeStyle = INK; ix.lineWidth = 3; ix.beginPath(); ix.moveTo(x, y - s*0.85); ix.lineTo(x + s*0.05, y - s*1.15); ix.stroke(); shape(circ(x + s*0.05, y - s*1.2, s*0.1), '#d82a2a', 2.5, false);
  ix.fillStyle = 'rgba(255,200,60,'+(0.5+0.5*Math.sin(rtime*20))+')'; ix.beginPath(); ix.arc(x + s*0.08, y - s*1.33, s*0.06, 0, 7); ix.fill();
  for(const k of [-1,1]){ ix.fillStyle = INK; ix.beginPath(); ix.ellipse(x + k*s*0.17, y - s*0.45, s*0.06, s*0.13, 0, 0, 7); ix.fill(); }
  ix.strokeStyle = INK; ix.lineWidth = 3; ix.beginPath(); ix.arc(x, y - s*0.3, s*0.28, 0.15*Math.PI, 0.85*Math.PI); ix.stroke(); ix.fillStyle = '#fff'; ix.beginPath(); ix.arc(x, y - s*0.3, s*0.26, 0.2*Math.PI, 0.8*Math.PI); ix.closePath(); ix.fill(); ix.stroke();
}
function deathStar(x, y, r, o={}){ shape(circ(x,y,r), '#7a7a88', Math.max(3,r*0.03)); ix.strokeStyle = INK; ix.lineWidth = Math.max(2, r*0.03); ix.beginPath(); ix.moveTo(x - r, y); ix.quadraticCurveTo(x, y + r*0.12, x + r, y); ix.stroke();
  shape(circ(x - r*0.38, y - r*0.38, r*0.22), '#4a4a58', 2.5, false); shape(circ(x - r*0.38, y - r*0.38, r*0.08), o.fire ? '#7cff4f' : '#2a2a34', 2, false);
  for(let i=0;i<14;i++){ ix.fillStyle = 'rgba(20,20,30,.5)'; ix.fillRect(x + Math.cos(i*2.3)*r*0.6, y + Math.sin(i*1.7)*r*0.6, r*0.08, r*0.04); } }
function arcadePlanet(x, y, s, t){ // the arcade-booth planet: a planet that IS an arcade cabinet
  shape(() => { ix.beginPath(); ix.moveTo(x - s*0.5, y + s*0.8); ix.lineTo(x - s*0.5, y - s*0.4); ix.lineTo(x - s*0.35, y - s*0.8); ix.lineTo(x + s*0.35, y - s*0.8); ix.lineTo(x + s*0.5, y - s*0.4); ix.lineTo(x + s*0.5, y + s*0.8); ix.closePath(); }, '#c03a8a', 3);
  shape(rect(x - s*0.36, y - s*0.45, s*0.72, s*0.5), '#101028', 3, false); ix.fillStyle = '#41e4ff'; for(let i=0;i<6;i++){ ix.fillRect(x - s*0.3 + i*s*0.1, y - s*0.2 + Math.sin(t*6+i)*s*0.04, s*0.05, s*0.05); }
  pac2d(x - s*0.15 + ((t*0.3)%1)*s*0.3, y - s*0.2, s*0.06, Math.abs(Math.sin(t*12))*0.6, {legs:false, arms:false, noCap:true});
  shape(rect(x - s*0.4, y + s*0.1, s*0.8, s*0.18), '#2a2a3a', 3, false); shape(circ(x - s*0.2, y + s*0.18, s*0.05), '#ff3b3b', 2, false); shape(circ(x + s*0.05, y + s*0.18, s*0.05), '#41e4ff', 2, false); shape(circ(x + s*0.2, y + s*0.18, s*0.05), '#ffe14d', 2, false);
  ix.fillStyle = '#ffe14d'; ix.font = `900 ${s*0.12|0}px Cinzel`; ix.textAlign = 'center'; ix.fillText('ARCADE', x, y - s*0.6); }
function chromeMan(x, y, s, walk){ const g = ix.createLinearGradient(x - s*0.4, y - s*1.2, x + s*0.4, y + s); g.addColorStop(0,'#f4f8ff'); g.addColorStop(0.35,'#8a98a8'); g.addColorStop(0.6,'#e0e8f0'); g.addColorStop(1,'#5a6878');
  for(const k of [-1,1]){ const sw = Math.sin(walk + (k>0?Math.PI:0))*s*0.12; shape(() => { ix.beginPath(); ix.moveTo(x + k*s*0.12, y + s*0.2); ix.lineTo(x + k*s*0.14 + sw, y + s*1.0); ix.lineTo(x + k*s*0.04 + sw, y + s*1.0); ix.lineTo(x + k*s*0.04, y + s*0.2); ix.closePath(); }, g, 2.5, false); }
  shape(ell(x, y - s*0.15, s*0.24, s*0.42), g, 3, false); for(const k of [-1,1]) shape(ell(x + k*s*0.3, y - s*0.1, s*0.07, s*0.36, k*0.1), g, 2.5, false); shape(ell(x, y - s*0.75, s*0.15, s*0.19), g, 3, false); }
function blackHole(x, y, r, t){ for(let i=10;i>0;i--){ ix.strokeStyle = `rgba(${120+i*10},${40+i*6},${200},${0.08*i})`; ix.lineWidth = r*0.08; ix.beginPath(); ix.arc(x, y, r*i/10, t*2 + i, t*2 + i + Math.PI*1.4); ix.stroke(); }
  const g = ix.createRadialGradient(x,y,0,x,y,r*0.55); g.addColorStop(0,'#000'); g.addColorStop(1,'rgba(0,0,0,0)'); ix.fillStyle = g; ix.beginPath(); ix.arc(x,y,r*0.55,0,7); ix.fill(); }
function qWing(x, y, s){ shape(() => { ix.beginPath(); ix.ellipse(x, y, s*0.7, s*0.55, 0, 0, Math.PI*2); }, '#9aa8b8', 3); shape(ell(x, y, s*0.36, s*0.26), '#2a3a5a', 3, false);
  shape(() => { ix.beginPath(); ix.moveTo(x + s*0.35, y + s*0.25); ix.lineTo(x + s*0.95, y + s*0.75); ix.lineTo(x + s*0.75, y + s*0.85); ix.lineTo(x + s*0.2, y + s*0.4); ix.closePath(); }, '#9aa8b8', 3, false);
  ix.fillStyle = 'rgba(255,170,60,.9)'; ix.beginPath(); ix.ellipse(x - s*0.8 - Math.random()*s*0.2, y, s*0.2, s*0.1, 0, 0, 7); ix.fill(); bomberguy(x, y + s*0.02, s*0.14, {}); }
// ---------- the page: one inked panel per beat, sliding in like a turned page ----------
function drawIntro(){
  const W = ic.width = ic.clientWidth, H = ic.height = ic.clientHeight; let b = 0; while(b < BEATS.length-1 && introT >= BEAT_AT[b+1]) b++;
  const t = introT - BEAT_AT[b], f = t/BEATS[b].d, S = Math.min(W, H);
  ix.fillStyle = '#0b0910'; ix.fillRect(0,0,W,H);
  const slide = Math.max(0, 1 - t/0.55), ease = slide*slide; const G = Math.max(10, S*0.03), px = G + ease*W*0.9, py = G, pw = W - G*2, ph = H - G*2 - (BEATS[b].cap ? S*0.11 : 0);
  ix.save(); ix.translate(px - G, 0); ix.beginPath(); ix.rect(G, py, pw, ph); ix.clip();
  const cx = G + pw/2, cy = py + ph/2, s = Math.min(pw, ph), space = b <= 10 && b !== 10;
  const bg = ix.createRadialGradient(cx, cy, 0, cx, cy, s); bg.addColorStop(0, b>=10&&b<=14 ? '#2a1222' : '#0e0c22'); bg.addColorStop(1, '#030206'); ix.fillStyle = bg; ix.fillRect(0, 0, W*2, H);
  if(space && b>=1) for(const [sx,sy,sz] of STARS_I){ ix.fillStyle = `rgba(255,255,255,${0.25+sz*0.75})`; ix.fillRect(G + sx*pw, py + sy*ph, 1+sz*1.6, 1+sz*1.6); }
  ix.textAlign = 'center'; ix.textBaseline = 'middle'; const chomp = Math.abs(Math.sin(introT*12))*0.65;
  if(b===0){ const on = t > 1.4 ? 1 : 0; once('spot', ()=>setTimeout(()=>{ noise(0.15, 0.4, null, {freq:3000}); tone(60,0.3,'sine',0.3,0.5); }, 1400));
    if(on){ const r = s*0.42; const sg = ix.createRadialGradient(cx, cy*1.1, 0, cx, cy*1.1, r); sg.addColorStop(0,'rgba(255,244,210,.55)'); sg.addColorStop(0.8,'rgba(255,244,210,.12)'); sg.addColorStop(1,'rgba(0,0,0,0)'); ix.fillStyle = sg; ix.fillRect(0,0,W*2,H);
      ix.fillStyle = 'rgba(255,244,210,.06)'; ix.beginPath(); ix.moveTo(cx - s*0.05, py); ix.lineTo(cx + s*0.05, py); ix.lineTo(cx + r, cy*1.1 + r*0.3); ix.lineTo(cx - r, cy*1.1 + r*0.3); ix.fill();
      if(t > 3){ ix.globalAlpha = Math.min(1, (t-3)); ix.fillStyle = '#f2d24a'; ix.font = `italic 700 ${s*0.04|0}px Cinzel, Georgia`; ix.fillText('In a galaxy far, far away...', cx, cy*1.1); ix.globalAlpha = 1; } } }
  if(b===1 || b===5 || b===6 || b===4){ // the crawl, scrolling up through the spotlight (and later eaten)
    const sg = ix.createRadialGradient(cx, cy, 0, cx, cy, s*0.55); sg.addColorStop(0,'rgba(255,244,210,.22)'); sg.addColorStop(1,'rgba(0,0,0,0)'); ix.fillStyle = sg; ix.fillRect(0,0,W*2,H);
    const scroll = b===1 ? (1 - f)*ph*0.55 : 0, rowH = s*0.06;
    const eaten = b===4 ? Math.max(0, Math.floor((f-0.35)*5)) : b===5 ? 2 + Math.floor(f*4) : b===6 ? 6 + Math.floor(f*3) : 0;
    CRAWL.forEach((r,i)=>{ if(i < eaten || !r) return; const y = cy - rowH*3.5 + i*rowH + scroll, k = 0.6 + ((y-py)/ph)*0.6; ix.fillStyle = '#f2d24a'; ix.font = `700 ${Math.max(10, s*0.036*k)|0}px Cinzel, Georgia`; ix.fillText(r, cx, y); });
    if(b===1) once('narr', ()=>speak(NARRATION, 0.8, 0.92));
    if(b>=4){ const row = Math.min(CRAWL.length-1, eaten), gr = s*(0.05 + (b===6?0.07*f:0) + (b>=5?0.03:0) + eaten*0.004), y = cy - rowH*3.5 + row*rowH;
      let x; if(b===4 && f < 0.35){ x = G + pw*0.1 + f/0.35*pw*0.25; const trip = f > 0.15 && f < 0.25; pac2d(x, cy + s*0.16 - (trip?Math.sin((f-0.15)*30)*s*0.06:0), s*0.13, chomp*0.6, {walk:introT*10, armUp:trip, face:1}); if(trip){ sfxText(x, cy - s*0.08, 'WHOA!', s*0.07, '#fff', -0.2); once('trip', ()=>{ SFX.boing(); }); } }
      else { x = cx - pw*0.3 + ((introT*0.9)%1)*pw*0.6; pac2d(x, y, gr, chomp, {legs:false, face:1}); if(Math.random()<0.3) SFX.waka(Math.random()<.5); } }
    if(b===5){ const said = NARRATION.slice(0, Math.floor(f*NARRATION.length*0.65)); caption(G + pw*0.05, py + ph*0.8, pw*0.9, 'NARRATOR: "...' + said.slice(-60) + (f > 0.92 ? '—"' : ''), s*0.032); }
    if(b===6){ caption(G + pw*0.05, py + ph*0.8, pw*0.9, 'NARRATOR: "...and his enforcer, Darth Bomb—"', s*0.032); once('cut', ()=>{ if('speechSynthesis' in window) speechSynthesis.cancel(); SFX.chomp(); }); } }
  if(b===2){ // the Emperor, laughing: DO IT
    const sh = Math.sin(introT*30)*s*0.004*(f>0.2?1:0);
    shape(() => { ix.beginPath(); ix.arc(cx + sh, cy - s*0.08, s*0.17, Math.PI, 0); ix.lineTo(cx + s*0.25, cy + s*0.4); ix.lineTo(cx - s*0.25, cy + s*0.4); ix.closePath(); }, '#16121e', 4);
    shape(ell(cx + sh, cy - s*0.04, s*0.09, s*0.11), '#d8ccb4', 3); for(let i=0;i<5;i++){ ix.strokeStyle = 'rgba(60,40,30,.6)'; ix.lineWidth = 1.5; ix.beginPath(); ix.moveTo(cx - s*0.06 + sh, cy - s*0.1 + i*s*0.02); ix.lineTo(cx + s*0.06 + sh, cy - s*0.09 + i*s*0.02); ix.stroke(); }
    for(const k of [-1,1]){ ix.fillStyle = '#ffd23f'; ix.beginPath(); ix.ellipse(cx + k*s*0.035 + sh, cy - s*0.06, s*0.014, s*0.009, 0, 0, 7); ix.fill(); }
    ix.fillStyle = INK; ix.beginPath(); ix.ellipse(cx + sh, cy + s*0.02, s*0.035, s*0.02 + Math.abs(Math.sin(introT*18))*s*0.02, 0, 0, 7); ix.fill();
    for(const k of [-1,1]){ shape(ell(cx + k*s*0.22, cy + s*0.12 - (f>0.2?Math.abs(Math.sin(introT*9))*s*0.03:0), s*0.04, s*0.03), '#d8ccb4', 2.5, false); }
    if(f > 0.2){ once('laugh', ()=>{ for(let i=0;i<8;i++) tone(220 - i*8, 0.12, 'sawtooth', 0.04, 0.8, null, i*0.13); speak('Ha ha ha ha ha!', 0.3, 0.9); }); sfxText(cx - s*0.28, cy - s*0.25, 'HA HA HA', s*0.05, '#c8b4ff', -0.2); }
    if(f > 0.55){ once('doit', ()=>speak('Do it.', 0.2, 0.7)); bubble(cx + s*0.22, cy - s*0.3, 'DO IT.', s*0.07, [-0.6, 1]); } }
  if(b===3){ // Darth Bomberguy fires the Death Star at the arcade-booth planet
    deathStar(G + pw*0.25, cy - s*0.05, s*0.2, {fire:f>0.35}); bomberguy(G + pw*0.12, cy + s*0.22, s*0.1, {fist:f>0.3});
    if(f > 0.3 && f < 0.42) bubble(G + pw*0.2, cy - s*0.33, 'FIRE!', s*0.05, [-0.4, 1]);
    const tx = G + pw*0.78, ty = cy;
    if(f < 0.66) arcadePlanet(tx, ty, s*0.3, introT);
    if(f > 0.4){ const k = Math.min(1, (f-0.4)/0.12); once('laser', ()=>{ tone(880, 0.8, 'sawtooth', 0.06, 0.25); noise(0.8, 0.12, null, {freq:2000, sweep:400}); });
      ix.strokeStyle = '#7cff4f'; ix.shadowColor = '#7cff4f'; ix.shadowBlur = 30; ix.lineWidth = s*0.018; ix.beginPath(); ix.moveTo(G + pw*0.25 - s*0.076, cy - s*0.126); ix.lineTo(lerp(G + pw*0.25, tx, k), lerp(cy - s*0.126, ty, k)); ix.stroke(); ix.shadowBlur = 0; }
    if(f > 0.6){ once('kaboom', ()=>SFX.boom(1.5)); const k = (f-0.6)/0.4; for(let i=0;i<140;i++){ ix.fillStyle = ['#ff4fb8','#ffe14d','#41e4ff','#fff','#ff7a20'][i%5]; const a = i*0.73, r = k*s*0.6*(0.3+(i%9)/9); ix.fillRect(tx + Math.cos(a)*r, ty + Math.sin(a)*r, 6, 6); }
      sfxText(tx, ty - s*0.05, 'KA-BOOM!', s*0.09*(0.6+k*0.5), '#ffe14d', 0.1); } }
  if(b===7){ // fully grown, eats the whole Death Star
    const ds = Math.max(0.02, 1 - f*1.1); deathStar(cx + s*0.2, cy, s*0.22*ds); pac2d(cx - s*0.22 + f*s*0.22, cy, s*0.26, chomp, {legs:false, face:1}); if(Math.random()<0.2) SFX.chomp();
    for(let i=0;i<20*f;i++){ ix.fillStyle = '#7a7a88'; ix.fillRect(cx + s*0.12 + Math.random()*s*0.2, cy - s*0.1 + Math.random()*s*0.2, 5, 5); } }
  if(b===8){ // BURP — then farts himself into a black hole
    const bx = cx + s*0.25; if(f > 0.4) blackHole(bx, cy, s*0.3*Math.min(1,(f-0.4)*3), introT);
    const px2 = f < 0.45 ? cx - s*0.1 : lerp(cx - s*0.1, bx, Math.min(1,(f-0.45)/0.45)), pr = f < 0.45 ? s*0.24 : s*0.24*(1-Math.min(0.9,(f-0.45)/0.5));
    pac2d(px2, cy, pr, f<0.3?0.5:0.1, {legs:false, face:1, armUp:f<0.3});
    if(f < 0.42){ once('burp', ()=>SFX.burp()); sfxText(cx - s*0.1, cy - s*0.32, 'BUUURRRP!', s*0.1, '#7cff8a', -0.12); }
    else { once('fart', ()=>SFX.fart(1.4)); ix.fillStyle = 'rgba(140,200,90,.5)'; for(let i=0;i<10;i++){ ix.beginPath(); ix.arc(px2 - pr*1.2 - i*s*0.03, cy + Math.sin(i+introT*5)*s*0.03, s*0.03 + i*s*0.006, 0, 7); ix.fill(); } sfxText(px2 - s*0.25, cy + s*0.25, 'PFFFRRRT!', s*0.08, '#b8e86a', 0.15); } }
  if(b===9){ // escapes in the Q-Wing and vows to hunt Pac down
    qWing(G + pw*(0.2 + f*0.55), cy - s*0.05 + Math.sin(introT*3)*s*0.02, s*0.22);
    if(f > 0.35){ once('vow', ()=>speak('I will hunt you down, Pac!', 1.3, 1.05)); bubble(G + pw*(0.2 + f*0.55), cy - s*0.33, 'I WILL HUNT YOU DOWN, PAC!', s*0.042, [0, 1]); } }
  if(b===10){ // the Legendary Salty Dawg Saloon: neon, shots, sad and depressed
    if(f < 0.35){ ix.fillStyle = '#2a1414'; ix.fillRect(G, cy - s*0.05, pw, ph); shape(rect(cx - s*0.38, cy - s*0.25, s*0.76, s*0.5), '#3a2014', 4);
      const fl = Math.sin(introT*7) > -0.8 ? 1 : 0.3; ix.globalAlpha = fl; ix.fillStyle = '#ff4fb8'; ix.shadowColor = '#ff4fb8'; ix.shadowBlur = 26; ix.font = `900 ${s*0.05|0}px Cinzel, Georgia`; ix.fillText('THE LEGENDARY', cx, cy - s*0.36); ix.fillStyle = '#41e4ff'; ix.shadowColor = '#41e4ff'; ix.font = `900 ${s*0.07|0}px Cinzel, Georgia`; ix.fillText('SALTY DAWG SALOON', cx, cy - s*0.28); ix.shadowBlur = 0; ix.globalAlpha = 1;
      shape(rect(cx - s*0.08, cy - s*0.05, s*0.16, s*0.3), '#1a0e08', 3, false); }
    else { const k = (f-0.35)/0.65; ix.fillStyle = '#1e0e14'; ix.fillRect(0,0,W*2,H); ix.fillStyle = 'rgba(255,79,184,.25)'; ix.fillRect(G, py, pw, ph*0.12);
      for(let i=0;i<9;i++){ shape(rect(G + pw*0.05 + i*pw*0.1, py + ph*0.2, pw*0.03, ph*0.12), ['#7cff8a','#ffb340','#41e4ff','#ff4fb8'][i%4], 2, false); }
      shape(rect(G, cy + s*0.1, pw, s*0.08), '#4a2a18', 4); pac2d(cx - s*0.05, cy - s*0.03, s*0.13, 0.08, {legs:false, face:1, sad:true});
      for(let i=0;i<Math.floor(3 + k*5);i++){ shape(rect(cx + s*0.12 + i*s*0.045, cy + s*0.035, s*0.03, s*0.065), 'rgba(220,235,255,.85)', 2, false); }
      ix.fillStyle = 'rgba(160,190,255,.7)'; ix.beginPath(); ix.ellipse(cx - s*0.0, cy - s*0.06 + ((introT*0.8)%1)*s*0.08, s*0.008, s*0.014, 0, 0, 7); ix.fill();
      if(k > 0.4) bubble(cx - s*0.22, cy - s*0.25, '...another.', s*0.035, [0.8, 1]); } }
  if(b===11){ // outside: the whistle, a portal tears open, a naked chrome assassin steps out
    ix.fillStyle = '#0c0a12'; ix.fillRect(0,0,W*2,H); ix.fillStyle = '#1a0e10'; ix.fillRect(G, cy + s*0.25, pw, ph); shape(rect(G + pw*0.02, cy - s*0.3, pw*0.3, s*0.55), '#3a2014', 4);
    ix.fillStyle = '#41e4ff'; ix.font = `900 ${s*0.03|0}px Cinzel`; ix.fillText('SALTY DAWG', G + pw*0.17, cy - s*0.22);
    once('whistle', ()=>SFX.whistle(0));
    if(f > 0.4){ const pr = s*0.22*Math.min(1, (f-0.4)*4); for(let i=8;i>0;i--){ ix.strokeStyle = `rgba(120,255,120,${0.12*i})`; ix.lineWidth = 4; ix.beginPath(); ix.ellipse(G + pw*0.72, cy, pr*i/8*0.6, pr*i/8, 0, introT*3+i, introT*3+i+5.5); ix.stroke(); }
      once('portal', ()=>{ noise(1.2, 0.15, null, {freq:400, sweep:3000}); tone(55, 1.2, 'sawtooth', 0.08, 2); }); }
    if(f > 0.6){ const k = (f-0.6)/0.4; chromeMan(G + pw*(0.72 - k*0.22), cy + s*0.05, s*0.3, introT*6); } }
  if(b===12){ // Pac eats him
    ix.fillStyle = '#0c0a12'; ix.fillRect(0,0,W*2,H); ix.fillStyle = '#1a0e10'; ix.fillRect(G, cy + s*0.25, pw, ph);
    if(f < 0.45) chromeMan(cx + s*0.12, cy + s*0.05, s*0.3, introT*6); pac2d(cx - s*0.15 + Math.min(0.45,f)*s*0.5, cy + s*0.05, s*0.2, f<0.5?chomp:0.08, {face:1});
    if(f > 0.4){ once('chomp', ()=>{ SFX.chomp(); setTimeout(()=>SFX.chomp(), 150); }); sfxText(cx + s*0.05, cy - s*0.28, 'CHOMP!', s*0.12, '#ffe14d', -0.1); for(let i=0;i<30*(1-f);i++){ ix.fillStyle = '#c8d4e0'; ix.beginPath(); ix.arc(cx + s*0.1 + Math.random()*s*0.2, cy + Math.random()*s*0.2, 4, 0, 7); ix.fill(); } } }
  if(b===13){ // the walk: out of the saloon looking like Arnold in T2 — leathers, shades
    ix.fillStyle = '#120c10'; ix.fillRect(0,0,W*2,H); ix.fillStyle = '#1e1014'; ix.fillRect(G, cy + s*0.28, pw, ph); shape(rect(G + pw*0.05, cy - s*0.35, pw*0.25, s*0.63), '#3a2014', 4); shape(rect(G + pw*0.13, cy - s*0.08, pw*0.09, s*0.36), '#0a0604', 3, false);
    const x = G + pw*0.17 + f*pw*0.5; pac2d(x, cy + s*0.02, s*0.17, 0.06, {face:1, shades:true, leather:true, walk:introT*4});
    once('bass', ()=>{ for(let i=0;i<6;i++) tone(55, 0.35, 'sawtooth', 0.08, 1, null, i*0.6); }); }
  if(b===14){ ix.fillStyle = '#05030a'; ix.fillRect(0,0,W*2,H); const k = Math.min(1, t/1.2);
    ix.save(); ix.globalAlpha = k; ix.fillStyle = '#f6dc95'; ix.shadowColor = '#ff4fb8'; ix.shadowBlur = 40; ix.font = `900 ${s*0.2|0}px Cinzel, Georgia`; ix.fillText('PAC', cx, cy - s*0.04); ix.font = `700 ${s*0.05|0}px Cinzel, Georgia`; ix.fillStyle = '#ff4fb8'; ix.fillText('J U D G E M E N T   D A Y', cx, cy + s*0.12); ix.restore();
    once('title', ()=>{ SFX.boom(1.2); [262,330,392,523].forEach((fq,i)=>tone(fq, 0.6, 'sawtooth', 0.04, 1, null, i*0.12, 0.6)); }); }
  ix.restore();
  // panel frame + caption box below
  ix.strokeStyle = INK; ix.lineWidth = Math.max(6, S*0.012); ix.strokeRect(px, py, pw, ph); ix.strokeStyle = '#6d5734'; ix.lineWidth = 1.5; ix.strokeRect(px + 6, py + 6, pw - 12, ph - 12);
  if(BEATS[b].cap){ const bh = S*0.08, by = py + ph + S*0.015; ix.fillStyle = '#f2d878'; ix.strokeStyle = INK; ix.lineWidth = 4; ix.fillRect(px, by, pw, bh); ix.strokeRect(px, by, pw, bh);
    const shown = BEATS[b].cap.slice(0, Math.floor(BEATS[b].cap.length*Math.min(1, t*1.4/Math.max(1, BEATS[b].cap.length/22)))); ix.fillStyle = INK; ix.textAlign = 'left'; ix.textBaseline = 'middle'; ix.font = `700 ${Math.max(14, S*0.032)|0}px Rajdhani, system-ui`; ix.fillText(shown, px + S*0.02, by + bh/2); }
}
