// PAC v0.8 — world.js: World 1, THE CLUB. One long, wide lane you travel UP (toward -z), room by room.
// Glossy satin neon world; characters are ink. Dots: static DOT HIGHWAYS that lead you room to room (runway-light
// sparkle), plus a few MOVING set pieces per room that burst for a bonus. Fruit heals. Coins spin and carry out of the run.
"use strict";
const LANE = {x0:-30, x1:30, z0:-450, z1:50};
let BOUNDS = Object.assign({}, LANE);
const ROOMS = [
  {name:'Entrance',    z0:0,    z1:50,   col:0x41e4ff, col2:0xff4fb8},
  {name:'Dance Floor', z0:-110, z1:0,    col:0xff4fb8, col2:0x41e4ff},
  {name:'The Bar',     z0:-200, z1:-110, col:0xffb340, col2:0xff4fb8},
  {name:'VIP Lounge',  z0:-290, z1:-200, col:0xb070ff, col2:0xff4fb8},
  {name:'Backstage',   z0:-370, z1:-290, col:0x41e4ff, col2:0xffb340},
  {name:'Main Stage',  z0:-450, z1:-370, col:0xff3b4a, col2:0xffb340}];
const STAGE_Z = -370, GATE_X = 8;
const roomAt = z => ROOMS.find(r=>z>=r.z0 && z<=r.z1) || (z>0?ROOMS[0]:ROOMS[5]);
const roomIndex = z => ROOMS.indexOf(roomAt(z));
const inLane = (x,z)=> x>BOUNDS.x0+1.5 && x<BOUNDS.x1-1.5 && z>BOUNDS.z0+1.5 && z<BOUNDS.z1-1.5;

// ---------------- floor ----------------
function floorTexture(seed){
  const N = 1024, P = 128, c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d');
  let r = seed; const rr = ()=>{ r = (r*16807)%2147483647; return r/2147483647; };
  x.fillStyle = '#0d0a16'; x.fillRect(0,0,N,N);
  for(let py=0; py<N; py+=P) for(let px=0; px<N; px+=P){
    const v = 20 + rr()*14; x.fillStyle = `rgb(${v*0.8|0},${v*0.7|0},${v*1.25|0})`; x.fillRect(px+2,py+2,P-4,P-4);
    x.globalAlpha = 0.07; x.strokeStyle = '#c0a8ff'; for(let i=0;i<8;i++){ const yy = py+4+rr()*(P-8); x.beginPath(); x.moveTo(px+4,yy); x.lineTo(px+P-4,yy+(rr()-.5)*3); x.stroke(); }
    x.globalAlpha = 1; x.fillStyle = 'rgba(180,160,255,0.12)'; x.fillRect(px+2,py+2,P-4,2); x.fillRect(px+2,py+2,2,P-4);
    x.fillStyle = 'rgba(0,0,0,0.5)'; x.fillRect(px+2,py+P-4,P-4,2); x.fillRect(px+P-4,py+2,2,P-4);
    x.fillStyle = 'rgba(200,190,240,0.3)'; for(const [ox,oy] of [[8,8],[P-10,8],[8,P-10],[P-10,P-10]]){ x.beginPath(); x.arc(px+ox,py+oy,2,0,7); x.fill(); } }
  x.fillStyle = '#05040a'; for(let i=0;i<=N;i+=P){ x.fillRect(i-1,0,3,N); x.fillRect(0,i-1,N,3); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); return t;
}
const WALLS = [], PROPS = [], SIGNS = [], SPOTS = [], BEAMS = [], DISCOS = [], LASERS = [], SPEAKER_IDX = [];
let gateA = null, gateBeams = [], gateGlow = null, tiles = null, air = null, airPos = null;
const TX = 15, TZ = 22, TILE = 3.6, TILE_COLS = [0xff4fb8, 0x2f6bff, 0x41e4ff, 0xffb340, 0x8a5cff].map(c=>new THREE.Color(c));
const LSLOTS = [], PLIGHTS = [];
const PROP_INST = {};   // kind -> {solid:InstancedMesh, neon:InstancedMesh, n}
// walls are bucketed along the lane (8 m bands) so the hundreds of checks per frame only look at nearby walls; rebuilt when walls come and go
let WGRID = null, wgLen = -1;
function wgrid(){ if(WGRID && wgLen === WALLS.length) return WGRID; WGRID = new Map(); wgLen = WALLS.length;
  for(const w of WALLS) for(let k=Math.floor((w.z0-2.5)/8); k<=Math.floor((w.z1+2.5)/8); k++){ let a = WGRID.get(k); if(!a){ a = []; WGRID.set(k, a); } a.push(w); } return WGRID; }
function blocked(x,z,r){ const L = wgrid().get(Math.floor(z/8)); if(!L) return null; for(const w of L){ if(w.solid && x>w.x0-r && x<w.x1+r && z>w.z0-r && z<w.z1+r) return w; } return null; }
const wallMat = new THREE.MeshStandardMaterial({color:0x1a1426, roughness:0.4, metalness:0.35});
function neonStrip(x0,z0,x1,z1,y,color,w=0.1,glows=true){
  const len = hyp(x1-x0, z1-z0); const m = new THREE.Mesh(new THREE.BoxGeometry(len, w, w), neonMat(color));
  m.position.set((x0+x1)/2, y, (z0+z1)/2); m.rotation.y = -Math.atan2(z1-z0, x1-x0); scene.add(m);
  if(glows){ const n = Math.max(1, Math.floor(len/8)); for(let i=0;i<=n;i++) scene.add(at(glow(color, 3.2, 0.22), x0+(x1-x0)*i/n, y, z0+(z1-z0)*i/n)); }
  return m;
}
function wallSeg(x0,z0,x1,z1,color,h=3.6){
  const t = 0.8, w = Math.abs(x1-x0)||t, d = Math.abs(z1-z0)||t;
  const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), wallMat); m.position.set((x0+x1)/2, h/2, (z0+z1)/2); scene.add(m);
  neonStrip(x0,z0,x1,z1,h+0.04,color); neonStrip(x0,z0,x1,z1,0.22,color,0.06,false);
  const A = {x0:Math.min(x0,x1)-t/2, x1:Math.max(x0,x1)+t/2, z0:Math.min(z0,z1)-t/2, z1:Math.max(z0,z1)+t/2, solid:true}; WALLS.push(A); return A;
}
function podium(x, z){ const g = new THREE.Group(); g.position.set(x, 0, z);
  const b = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.45, 1.0, 24), wallMat); b.position.y = 0.5; g.add(b);
  const r = new THREE.Mesh(new THREE.TorusGeometry(1.32, 0.05, 6, 40), neonMat(0xff4fb8)); r.rotation.x = Math.PI/2; r.position.y = 1.0; g.add(r, at(glow(0xff4fb8, 4, 0.35), 0, 1.2, 0)); scene.add(g);
  WALLS.push({x0:x-1.3, x1:x+1.3, z0:z-1.3, z1:z+1.3, solid:true}); }
function sign(text, color, x, y, z, w){
  const c = document.createElement('canvas'); c.width = 1024; c.height = 220; const g = c.getContext('2d'); const col = '#'+color.toString(16).padStart(6,'0');
  g.font = '900 150px Cinzel, Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = col; g.shadowBlur = 40; g.fillStyle = col; g.fillText(text, 512, 112); g.shadowBlur = 10; g.fillStyle = '#fff'; g.globalAlpha = 0.8; g.fillText(text, 512, 112);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w*220/1024), new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c), transparent:true, blending:THREE.AdditiveBlending, depthWrite:false}));
  m.position.set(x,y,z); m.rotation.x = -0.35; scene.add(m); SIGNS.push(m); return m;
}

function buildWorld(M){
  // floor + void
  const ft = floorTexture(11); ft.repeat.set(60/10, 500/10);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 500), new THREE.MeshStandardMaterial({color:0x8a80b0, map:ft, bumpMap:ft, bumpScale:0.08, roughness:0.62, metalness:0.25}));
  floor.rotation.x = -Math.PI/2; floor.position.set(0, 0, -200); scene.add(floor); window.FLOOR = floor;
  const outside = new THREE.Mesh(new THREE.PlaneGeometry(900,1000), new THREE.MeshBasicMaterial({color:0x030206})); outside.rotation.x = -Math.PI/2; outside.position.set(0,-0.05,-200); scene.add(outside);
  // walls (outer shell coloured per room) + dividers with doorways
  for(const R of ROOMS){ wallSeg(-30,R.z1,-30,R.z0,R.col); wallSeg(30,R.z1,30,R.z0,R.col); }
  wallSeg(-30,50,30,50,0x41e4ff); wallSeg(-30,-450,30,-450,0xff3b4a);
  wallSeg(-30,0,-8,0,0xff4fb8); wallSeg(8,0,30,0,0xff4fb8);
  wallSeg(-30,-110,-18,-110,0xffb340); wallSeg(-6,-110,6,-110,0xffb340); wallSeg(18,-110,30,-110,0xffb340);
  wallSeg(-30,-200,-9,-200,0xb070ff); wallSeg(9,-200,30,-200,0xb070ff);
  wallSeg(-30,-290,-18,-290,0x41e4ff); wallSeg(-6,-290,6,-290,0x41e4ff); wallSeg(18,-290,30,-290,0x41e4ff);
  wallSeg(-30,STAGE_Z,-GATE_X,STAGE_Z,0xff3b4a); wallSeg(GATE_X,STAGE_Z,30,STAGE_Z,0xff3b4a);
  gateA = {x0:-GATE_X, x1:GATE_X, z0:STAGE_Z-0.6, z1:STAGE_Z+0.6, solid:true}; WALLS.push(gateA);
  // v0.8 HALLWAYS + TERRAIN (Brent: "no hallways or use of terrain"): corridors between rooms, side lounges, an island bar, backstage lanes
  wallSeg(-6.5,1,-6.5,14,0xff4fb8); wallSeg(6.5,1,6.5,14,0xff4fb8);                                  // the entrance hallway into the dance floor
  for(const x of [-17,17]){ wallSeg(x,-18,x,-46,0x41e4ff,1.1); wallSeg(x,-62,x,-90,0x41e4ff,1.1); }   // low walls: lounges down both sides of the dance floor
  wallSeg(17,-116,17,-136,0xffb340); wallSeg(17,-148,17,-172,0xffb340);                               // a side bar behind a wall, two ways in
  wallSeg(-6,-201,-6,-216,0xb070ff); wallSeg(6,-201,6,-216,0xb070ff);                                 // the VIP hallway
  wallSeg(-10,-298,-10,-340,0x41e4ff); wallSeg(10,-312,10,-362,0x41e4ff);                             // backstage: three lanes, staggered openings
  for(const [x,z] of [[-9,-40],[9,-40],[-9,-72],[9,-72],[0,-56]]) podium(x, z);                     // go-go podiums on the dance floor
  for(let i=0;i<6;i++){ const b = new THREE.Mesh(new THREE.BoxGeometry(GATE_X*2,0.07,0.07), neonMat(0xff3b3b)); b.position.set(0,0.35+i*0.5,STAGE_Z); scene.add(b); gateBeams.push(b); }
  gateGlow = at(glow(0xff3b3b, 14, 0.45), 0, 1.5, STAGE_Z); scene.add(gateGlow);
  sign('CLUB PAC', 0x41e4ff, 0, 5.6, 48.5, 24); sign('DANCE FLOOR', 0xff4fb8, 0, 5.4, 0.6, 18); sign('THE BAR', 0xffb340, 0, 5.4, -109.4, 15);
  sign('VIP', 0xb070ff, 0, 5.4, -199.4, 9); sign('BACKSTAGE', 0x41e4ff, 0, 5.4, -289.4, 16); sign('MAIN STAGE', 0xff3b4a, 0, 5.6, STAGE_Z+0.6, 18);
  // dance floor light-up tiles
  tiles = new THREE.InstancedMesh(new THREE.PlaneGeometry(TILE*0.93, TILE*0.93), new THREE.MeshBasicMaterial({color:0xffffff, transparent:true, opacity:0.5, depthWrite:false, blending:THREE.AdditiveBlending}), TX*TZ);
  { const d = new THREE.Object3D(); let i = 0; for(let a=0;a<TX;a++) for(let b=0;b<TZ;b++){ d.position.set(-27+TILE/2+a*TILE, 0.03, -6-TILE/2-b*TILE); d.rotation.set(-Math.PI/2,0,0); d.updateMatrix(); tiles.setMatrixAt(i++, d.matrix); } }
  initColors(tiles, TX*TZ, 0); scene.add(tiles);
  // VIP carpet, stage runway, bar floor strips, backstage hazard stripes
  const vip = new THREE.Mesh(new THREE.PlaneGeometry(40, 76), new THREE.MeshStandardMaterial({color:0x3a1030, roughness:0.95})); vip.rotation.x = -Math.PI/2; vip.position.set(0,0.02,-245); scene.add(vip);
  const run = new THREE.Mesh(new THREE.PlaneGeometry(10, 70), new THREE.MeshStandardMaterial({color:0x2a060c, roughness:0.9})); run.rotation.x = -Math.PI/2; run.position.set(0,0.02,-405); scene.add(run);
  for(let z=-116; z>-196; z-=8){ neonStrip(-29,z,-18,z,0.04,0xffb340,0.05,false); neonStrip(18,z,29,z,0.04,0xffb340,0.05,false); }
  for(let z=-294; z>-368; z-=4){ const s = new THREE.Mesh(new THREE.PlaneGeometry(1.4,1.6), new THREE.MeshBasicMaterial({color:0xffb340, transparent:true, opacity:0.3})); s.rotation.set(-Math.PI/2,0,0.6); s.position.set(-28.5,0.03,z); scene.add(s); const s2 = s.clone(); s2.position.x = 28.5; scene.add(s2); }
  // static floor light pools + sweeping disco spots + fog beams + disco balls + lasers
  for(let z=44; z>-446; z-=14){ const R = roomAt(z), k = Math.floor(z/14)%2; const L = pool(R.col, 18, 0.11); L.position.set(k?-14:14, 0.05, z); scene.add(L); const L2 = pool(R.col2, 12, 0.08); L2.position.set(k?15:-15, 0.05, z-7); scene.add(L2); }
  for(let i=0;i<14;i++){ const R = ROOMS[1+(i%5)]; const m = pool(i%2?R.col:R.col2, 9, 0.17); m.position.y = 0.06; scene.add(m); SPOTS.push({m, cz:(R.z0+R.z1)/2, hz:(R.z1-R.z0)/2-6, ph:i*1.7, w:0.25+Math.random()*0.3}); }
  for(let i=0;i<16;i++){ const R = ROOMS[i%6]; const col = i%2?R.col:R.col2;
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 3.4, 14, 16, 1, true), new THREE.MeshBasicMaterial({color:col, transparent:true, opacity:0.03, blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide}));
    const z = R.z0 + 8 + Math.random()*(R.z1-R.z0-16); m.position.set(rnd(-22,22), 7, z); scene.add(m); BEAMS.push({m, ph:Math.random()*6}); }
  for(const [x,z] of [[-24,-30],[24,-75],[-24,-245],[24,-405]]){ const m = new THREE.Mesh(new THREE.IcosahedronGeometry(1.1,1), new THREE.MeshStandardMaterial({color:0xddddff, metalness:1, roughness:0.15, flatShading:true}));
    m.position.set(x,11,z); scene.add(m); scene.add(at(glow(0xd0dcff,6,0.6),x,11,z)); DISCOS.push(m); }
  for(let i=0;i<12;i++){ const col = [0xff4fb8,0x41e4ff,0x7cff4f,0x2f6bff,0xffb340][i%5];
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.035,56,6), new THREE.MeshBasicMaterial({color:new THREE.Color(col).multiplyScalar(1.5), transparent:true, opacity:0.45, blending:THREE.AdditiveBlending, depthWrite:false}));
    m.position.set(0, 3, i<6?-98:-438); scene.add(m); LASERS.push({m, ph:i*0.9}); }
  // real lights: a few PointLights re-assigned to the slots nearest the action every frame
  for(let z=46; z>-448; z-=17){ const R = roomAt(z); LSLOTS.push({x:(LSLOTS.length%2?-15:15), z, col:new THREE.Color(LSLOTS.length%3?R.col:R.col2)}); }
  for(let i=0;i<6;i++){ const L = new THREE.PointLight(0xffffff, 4.5, 40, 1.3); L.position.y = 6; scene.add(L); PLIGHTS.push(L); }
  // sparkle in the air
  const AIRN = 300, g = new THREE.BufferGeometry(); airPos = new Float32Array(AIRN*3); const ac = new Float32Array(AIRN*3);
  for(let i=0;i<AIRN;i++){ airPos[i*3] = rnd(-29,29); airPos[i*3+1] = rnd(0.5,9); airPos[i*3+2] = rnd(-40,40); const c = new THREE.Color(pick([0xff4fb8,0x41e4ff,0xffe08a,0xb070ff])); ac[i*3]=c.r; ac[i*3+1]=c.g; ac[i*3+2]=c.b; }
  g.setAttribute('position', new THREE.BufferAttribute(airPos,3)); g.setAttribute('color', new THREE.BufferAttribute(ac,3));
  air = new THREE.Points(g, new THREE.PointsMaterial({size:0.2, vertexColors:true, map:glowTex, transparent:true, opacity:0.75, blending:THREE.AdditiveBlending, depthWrite:false})); air.frustumCulled = false; scene.add(air);
  buildProps(M);
}

// ---------------- PROPS from the Blender props.glb, instanced per kind ----------------
const PROP_DEF = { // kind: [w (x), d (z), breakable energy cost (0 = solid fixture)]
  speaker:[2.4,2.2,18], dj:[9,3,0], bar:[3,6,0], stool:[0.7,0.7,3], table:[1.4,1.4,6], booth:[4.4,2.2,10], case:[2.2,1.6,8], post:[0.4,0.4,3], stage:[10,9,0], truss:[0.7,0.7,0] };
const PLACE = [];
function placeAll(){
  const P = (kind, x, z, rot=0) => PLACE.push({kind, x, z, rot});
  // entrance: a velvet-rope queue, coat check (a bar segment), tables
  for(let x=-20;x<=20;x+=5) if(Math.abs(x)>5) P('post', x, 22);
  P('bar', -24, 36, Math.PI); P('bar', -24, 30, Math.PI);
  const T = (x, z) => { P('table', x, z); for(const [dx,dz] of [[1.2,0],[-1.2,0],[0,1.2]]) P('stool', x+dx, z+dz); };   // a table with its stools
  for(const [x,z] of [[20,38],[24,30],[16,28],[-14,10],[14,8],[-20,40],[-24,31]]) T(x, z);
  // dance floor: DJ booth up top, speaker stacks, trusses at the corners
  P('dj', 0, -100); for(const x of [-9,9]) P('speaker', x, -100); for(const [x,z] of [[-27,-25],[27,-25],[-27,-65],[27,-65]]) P('speaker', x, z);
  for(const [x,z] of [[-28,-4],[28,-4],[-28,-106],[28,-106]]) P('truss', x, z);
  for(const [x,z] of [[-23,-24],[-23,-36],[-23,-70],[-23,-82],[23,-26],[23,-40],[23,-68],[23,-84]]) T(x, z);   // lounge tables
  // bar: long counter on the left wall, short one on the right, stools, high tables
  for(let z=-124; z>=-184; z-=6) P('bar', -26.5, z, Math.PI);
  for(let z=-140; z>=-164; z-=6) P('bar', 26.5, z);
  for(let z=-122; z>=-186; z-=4) P('stool', -22.6, z);
  for(const [x,z] of [[-8,-124],[-10,-176],[4,-188],[-11,-140],[10,-182]]) T(x, z);
  for(const z of [-149,-155]){ P('bar', -2.6, z); P('bar', 2.6, z, Math.PI); }                     // the island bar (a bartender works inside it)
  for(const z of [-126,-160,-168]) T(23, z);
  // VIP: booths on both walls facing in, a centre island, rope lines
  for(const z of [-215,-235,-255,-275]){ P('booth', -26, z, Math.PI/2); P('booth', 26, z, -Math.PI/2); }
  P('booth', 0, -238, 0); P('booth', 0, -252, Math.PI);
  for(const z of [-208,-282]) for(let x=-12;x<=12;x+=4) P('post', x, z);
  // backstage: road-case clusters, trusses
  for(const [x,z] of [[-20,-300],[-17,-302],[-22,-318],[16,-306],[20,-322],[22,-340],[-5,-330],[-3,-334],[6,-352],[-18,-356],[16,-360],[0,-306]]) P('case', x, z, (x*13+z)%3*0.4);
  for(const [x,z] of [[-28,-294],[28,-294],[-28,-366],[28,-366]]) P('truss', x, z);
  // main stage: riser across the back, trusses, speaker walls
  for(const x of [-20,-10,0,10,20]) P('stage', x, -444.5);
  for(const [x,z] of [[-28,-376],[28,-376],[-28,-436],[28,-436]]) P('truss', x, z);
  for(const x of [-26,26]){ P('speaker', x, -428); P('speaker', x, -420); }
}
function buildProps(M){
  placeAll();
  const byKind = {}; for(const p of PLACE) (byKind[p.kind] = byKind[p.kind]||[]).push(p);
  for(const kind in byKind){
    const list = byKind[kind], src = LOOK.rawPiece(M, 'props', 'prop.'+kind); if(!src) continue;
    const isNeon = o => /neon|glow/i.test(o.material.name||'');
    const gS = LOOK.mergeColored(src, o=>!isNeon(o)), gN = LOOK.mergeColored(src, isNeon);
    const solid = new THREE.InstancedMesh(gS, new THREE.MeshStandardMaterial({vertexColors:true, roughness:0.38, metalness:0.35}), list.length);
    const neon = gN.attributes.position.count ? new THREE.InstancedMesh(gN, new THREE.MeshBasicMaterial({vertexColors:true, color:new THREE.Color(1.7,1.7,1.7)}), list.length) : null;
    list.forEach((p,i)=>{ dummy.position.set(p.x, 0, p.z); dummy.rotation.set(0, p.rot, 0); dummy.scale.set(1,1,1); dummy.updateMatrix(); solid.setMatrixAt(i, dummy.matrix); if(neon) neon.setMatrixAt(i, dummy.matrix);
      const [w,d,cost] = PROP_DEF[kind], sw = Math.abs(Math.sin(p.rot)) > 0.7; const W = sw ? d : w, D = sw ? w : d;
      const A = {x0:p.x-W/2, x1:p.x+W/2, z0:p.z-D/2, z1:p.z+D/2, solid:true, prop:true, kind, cost, color:kind==='speaker'?0xff4fb8:kind==='booth'?0xb070ff:0x41e4ff, dmg:0, push:0, inst:i, mesh:solid, neon, p};
      WALLS.push(A); PROPS.push(A); if(kind==='speaker') SPEAKER_IDX.push(A); });
    solid.instanceMatrix.needsUpdate = true; scene.add(solid); if(neon){ neon.instanceMatrix.needsUpdate = true; scene.add(neon); }
    PROP_INST[kind] = {solid, neon, list};
  }
}
function setPropVisible(A, on){ dummy.position.set(A.p.x, on?0:-50, A.p.z); dummy.rotation.set(0, A.p.rot, 0); dummy.scale.setScalar(on?1:0.001); dummy.updateMatrix();
  A.mesh.setMatrixAt(A.inst, dummy.matrix); A.mesh.instanceMatrix.needsUpdate = true; if(A.neon){ A.neon.setMatrixAt(A.inst, dummy.matrix); A.neon.instanceMatrix.needsUpdate = true; } }
function resetProps(){ for(const P of PROPS){ if(P.broken){ setPropVisible(P, true); WALLS.push(P); } P.broken = false; P.dmg = 0; P.push = 0; } }
function setGate(open){ gateA.solid = !open; gateBeams.forEach(b=>b.visible = !open); gateGlow.visible = !open; }
function placeLights(cz){ const s = LSLOTS.slice().sort((a,b)=>Math.abs(a.z-cz)-Math.abs(b.z-cz)); PLIGHTS.forEach((L,i)=>{ const S = s[i]; L.position.x = S.x; L.position.z = S.z; L.color.copy(S.col); }); }
function animateWorld(rdt, rtNow, focusZ, beat){
  const bn = Math.floor(beat), onBeat = (beat%1) < 0.15;
  for(let i=0;i<TX*TZ;i++){ const a = Math.floor(i/TZ), b = i%TZ, v = Math.sin(rtNow*2.4 + a*0.7 + b*1.3 + bn); tmpC.copy(TILE_COLS[(a+b+bn)%5]).multiplyScalar(v > 0.3 ? (onBeat?0.75:0.45) : 0.03); tiles.setColorAt(i, tmpC); }
  tiles.instanceColor.needsUpdate = true;
  DISCOS.forEach(d=>d.rotation.y += rdt*0.8);
  LASERS.forEach(L=>{ L.m.rotation.z = Math.sin(rtNow*0.6+L.ph)*1.1; L.m.rotation.x = Math.cos(rtNow*0.45+L.ph)*0.7; });
  SPOTS.forEach(s=>{ s.m.position.x = Math.sin(rtNow*s.w + s.ph)*20; s.m.position.z = s.cz + Math.cos(rtNow*s.w*1.3 + s.ph)*s.hz; });
  BEAMS.forEach(b=>{ b.m.rotation.z = Math.sin(rtNow*0.5 + b.ph)*0.25; b.m.material.opacity = 0.025 + (onBeat?0.02:0); });
  for(const kind of ['speaker']){ const I = PROP_INST[kind]; if(!I) continue; } // (speaker pump is done in the shader-free way: the floor pools pulse instead)
  for(let i=0;i<airPos.length/3;i++){ airPos[i*3+1] += rdt*0.35; airPos[i*3] += Math.sin(rtNow+i)*rdt*0.3; if(airPos[i*3+1] > 9) airPos[i*3+1] = 0.3; if(Math.abs(airPos[i*3+2]-focusZ) > 40) airPos[i*3+2] = focusZ + rnd(-38,38); }
  air.geometry.attributes.position.needsUpdate = true;
  placeLights(focusZ);
}

// ---------------- DOTS ----------------
// Highways: fixed lines of dots that run from where you are toward the next doorway (they never move, they twinkle).
// Set pieces: a few patterns per room that DO move (spinning ring, figure-eight chase, breathing circle, spiral, pair).
const DMAX = 3000;
let dotMesh = null, PATS = [];
const PATFN = {
  path:   (P,i)=>P.pts[i],
  spin:   (P,i,t)=>{ const a = i/P.n*6.283 + t*P.w; return [P.cx+Math.cos(a)*P.r, P.cz+Math.sin(a)*P.r]; },
  breathe:(P,i,t)=>{ const a = i/P.n*6.283 - t*P.w*0.5, r = P.r*(0.72+0.28*Math.sin(t*1.4)); return [P.cx+Math.cos(a)*r, P.cz+Math.sin(a)*r]; },
  eight:  (P,i,t)=>{ const s = i/P.n*6.283 + t*P.w; return [P.cx+Math.sin(s)*P.a, P.cz+Math.sin(2*s)*P.b]; },
  spiral: (P,i,t)=>{ const u = i/P.n, a = u*P.turns*6.283 + t*P.w, r = P.r*(1-0.8*u); return [P.cx+Math.cos(a)*r, P.cz+Math.sin(a)*r]; },
  pair:   (P,i,t)=>{ const u = i/P.n, k = u<0.5?0:1, uu = (u%0.5)*2, ca = t*P.w*0.4 + k*Math.PI, cx = P.cx+Math.cos(ca)*P.R, cz = P.cz+Math.sin(ca)*P.R, a = uu*6.283 + t*P.w*(k?-1:1); return [cx+Math.cos(a)*P.r, cz+Math.sin(a)*P.r]; }};
function buildDots(){ dotMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.21,10,8), new THREE.MeshBasicMaterial({color:0xffffff}), DMAX);
  dotMesh.frustumCulled = false; dotMesh.count = 0; initColors(dotMesh, DMAX); scene.add(dotMesh); }
function addPat(P){ P.alive = new Array(P.n).fill(true); P.left = P.n; P.eaten = 0; P.born = gt; PATS.push(P); return P; }
function dotPos(P, i){ return PATFN[P.k](P, i, gt); }
function highway(points, spacing=1.7){ // a smooth static path of dots through the given waypoints
  const curve = new THREE.CatmullRomCurve3(points.map(([x,z])=>new THREE.Vector3(x,0,z)), false, 'catmullrom', 0.3);
  const L = curve.getLength(), n = Math.max(6, Math.floor(L/spacing)), pts = [];
  for(let i=0;i<n;i++){ const p = curve.getPointAt(i/(n-1)); if(!blocked(p.x, p.z, 0.4)) pts.push([p.x, p.z]); }
  if(pts.length < 4) return null;
  return addPat({k:'path', pts, n:pts.length, az:(points[0][1]+points[points.length-1][1])/2, z0:points[0][1], z1:points[points.length-1][1], hw:true});
}
function setPiece(cx, cz){
  const k = pick(['spin','eight','breathe','spiral','pair','eight','spin']), s = Math.random()<.5?-1:1;
  if(k==='spin') return addPat({k, cx, cz, r:rnd(4,5.5), w:s*0.55, n:20, az:cz});
  if(k==='breathe') return addPat({k, cx, cz, r:rnd(4.5,6), w:s*0.6, n:22, az:cz});
  if(k==='eight') return addPat({k, cx, cz, a:rnd(6,8), b:rnd(2.8,3.6), w:s*0.32, n:28, az:cz});
  if(k==='spiral') return addPat({k, cx, cz, r:rnd(5.5,7), turns:2, w:s*0.5, n:28, az:cz});
  return addPat({k:'pair', cx, cz, R:3.6, r:2.4, w:s*0.9, n:22, az:cz});
}
// the doorways of each divider (where highways aim)
const DOORS = {0:[[0,0]], 1:[[-12,-110],[12,-110]], 2:[[0,-200]], 3:[[-12,-290],[12,-290]], 4:[[0,STAGE_Z]]};
const seededRooms = new Set();
function seedRoom(ri, gateOpen){
  if(seededRooms.has(ri)) return; seededRooms.add(ri); const R = ROOMS[ri];
  // highways: from the room's entry to each of its exit doors, snaking through open floor
  const entryZ = R.z1 - 4, exits = DOORS[ri] || [];
  for(const [dx,dz] of exits){
    if(ri===4 && !gateOpen) continue;
    const mid1 = [clamp(dx*0.5 + rnd(-10,10), -24, 24), lerp(entryZ, dz, 0.33)], mid2 = [clamp(dx + rnd(-8,8), -24, 24), lerp(entryZ, dz, 0.66)];
    highway([[rnd(-6,6), entryZ], mid1, mid2, [dx, dz + 3]]);
  }
  // a side highway hugging one wall (a reason to explore the edges)
  const side = Math.random()<.5 ? -22 : 22; highway([[side, R.z1-8], [side*0.8, (R.z0+R.z1)/2], [side, R.z0+10]], 2.0);
  // moving set pieces in open spots
  const nSet = ri===0 ? 2 : 3;
  for(let i=0;i<nSet;i++){ for(let tries=0; tries<20; tries++){ const cx = rnd(-18,18), cz = rnd(R.z0+14, R.z1-14); if(!blocked(cx,cz,7)){ setPiece(cx, cz); break; } } }
}
function refillRoom(ri){ const R = ROOMS[ri]; for(let tries=0; tries<20; tries++){ const cx = rnd(-18,18), cz = rnd(R.z0+12, R.z1-12); if(!blocked(cx,cz,7)){ setPiece(cx, cz); break; } }
  const z0 = R.z1 - 6; highway([[rnd(-20,20), z0], [rnd(-20,20), lerp(R.z1,R.z0,0.5)], [rnd(-16,16), R.z0+8]]); }
function resetDots(){ PATS = []; seededRooms.clear(); }

// ---------------- PICKUPS: fruit heals, coins spin and carry out of the run ----------------
const PICKS = []; let fruitMesh = null, coinMesh = null;
function buildPickups(){
  const fg = new THREE.Group(); const b1 = new THREE.Mesh(new THREE.SphereGeometry(0.28,14,10), LOOK.hatchMat(0xd02a3a)); b1.position.set(-0.16,0.3,0); const b2 = b1.clone(); b2.position.set(0.18,0.26,0.05);
  const st = new THREE.Mesh(new THREE.CylinderGeometry(0.025,0.025,0.6,6), LOOK.hatchMat(0x4a8a3a)); st.position.set(0,0.75,0); st.rotation.z = 0.3; fg.add(b1, b2, st, at(glow(0xff4060, 1.6, 0.6), 0, 0.4, 0));
  fruitMesh = fg;
  coinMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.32,0.32,0.07,20), new THREE.MeshStandardMaterial({color:0xffc830, metalness:0.9, roughness:0.25, emissive:0x3a2800}));
}
function addPick(kind, x, z){ const o = kind==='fruit' ? fruitMesh.clone() : coinMesh.clone(); if(kind==='coin'){ o.rotation.x = Math.PI/2; o.add(at(glow(0xffd040,1.4,0.5),0,0,0)); } const g = new THREE.Group(); g.add(o); g.position.set(x, 0.6, z); scene.add(g); PICKS.push({kind, x, z, g, t:Math.random()*6}); }
function seedPickups(ri){ const R = ROOMS[ri]; for(let i=0;i<3;i++){ for(let tr=0;tr<20;tr++){ const x = rnd(-24,24), z = rnd(R.z0+6, R.z1-6); if(!blocked(x,z,1)){ addPick('fruit', x, z); break; } } }
  for(let i=0;i<6;i++){ for(let tr=0;tr<20;tr++){ const x = rnd(-26,26), z = rnd(R.z0+4, R.z1-4); if(!blocked(x,z,0.8)){ addPick('coin', x, z); break; } } } }
function clearPickups(){ PICKS.forEach(p=>scene.remove(p.g)); PICKS.length = 0; clearBuffs(); }

// ---------------- POWER-UPS: glowing capsules that turn up now and then (Brent: more random buffs) ----------------
const BUFF_TYPES = {dmg:{n:'RAGE', ic:'😡', col:0xff4a2a, d:'+25% damage'}, speed:{n:'SPEED', ic:'⚡', col:0x6cff3a, d:'+30% speed'}, magnet:{n:'MAGNET', ic:'🧲', col:0x22d6a0, d:'pull everything in'},
  cd:{n:'RAPID FIRE', ic:'⏩', col:0xffb020, d:'abilities recharge 40% faster'}, shield:{n:'SHIELD', ic:'🛡️', col:0xa45cff, d:'a bubble soaks the next hits'}, xp:{n:'DOUBLE XP', ic:'✖️', col:0x5ab4ff, d:'twice the XP'}};
const BUFFS = [], buffTex = {};
function iconTex(ic){ if(!buffTex[ic]){ const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); g.font = '84px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ic, 64, 70); buffTex[ic] = new THREE.CanvasTexture(c); } return buffTex[ic]; }
function spawnBuff(x, z, type){ const T = BUFF_TYPES[type], g = new THREE.Group(); g.position.set(x, 1.1, z);
  const cap = new THREE.Group(), m = neonMat(T.col), b = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.7, 18), m), t1 = new THREE.Mesh(new THREE.SphereGeometry(0.34, 18, 10), m), t2 = t1.clone();
  t1.position.y = 0.35; t2.position.y = -0.35; cap.add(b, t1, t2); cap.rotation.z = 0.5; g.add(cap, glow(T.col, 4.5, 0.75));
  const icon = new THREE.Sprite(new THREE.SpriteMaterial({map:iconTex(T.ic), transparent:true, depthTest:false})); icon.scale.set(1.3, 1.3, 1); icon.position.y = 1.4; icon.renderOrder = 9; g.add(icon);
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.2, 36), new THREE.MeshBasicMaterial({color:new THREE.Color(T.col).multiplyScalar(1.4), transparent:true, opacity:0.6, blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide})); ring.rotation.x = -Math.PI/2; ring.position.y = -1.0; g.add(ring);
  scene.add(g); BUFFS.push({g, cap, ring, x, z, type, t:0}); }
function clearBuffs(){ BUFFS.forEach(b=>scene.remove(b.g)); BUFFS.length = 0; }

// ---------------- HAZARDS: Mario-style fire bars guarding a stash (a small challenge with a prize) ----------------
const FIREBARS = [];
function addFirebar(x, z, len=7, speed=1.4){ const g = new THREE.Group(); g.position.set(x, 0.9, z); const balls = [];
  for(let i=0;i<len;i++){ const b = new THREE.Mesh(new THREE.SphereGeometry(0.32,10,8), neonMat(i%2?0xffb030:0xff5a10)); b.position.x = i*0.75; g.add(b); balls.push(b); } g.add(at(glow(0xff7a20, 3, 0.7),0,0,0));
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.35,0.45,1,10), new THREE.MeshStandardMaterial({color:0x3a3240, metalness:0.6, roughness:0.4})); post.position.y = -0.4; g.add(post);
  scene.add(g); FIREBARS.push({g, x, z, len:len*0.75, speed, ang:Math.random()*6});
  for(let i=0;i<5;i++) addPick('coin', x + Math.cos(i*1.26)*2.2, z + Math.sin(i*1.26)*2.2); addPick('fruit', x, z+1.5); }
function clearFirebars(){ FIREBARS.forEach(f=>scene.remove(f.g)); FIREBARS.length = 0; }
