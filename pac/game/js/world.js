// PAC v0.9 — world.js: World 1, THE CLUB. One long, wide lane you travel UP (toward -z), room by room.
// v0.9 rebuild (Brent: "the level is still incredibly poorly done", "laggy even when very little is happening"):
//  - every room has its OWN floor, painted once into a canvas (pattern + baked light pools + soft shadows under the furniture +
//    litter) and drawn unlit — the old lit, bump-mapped floor and the static glow pools were the biggest cost on screen
//  - walls are unlit textured boxes, merged per room (brick street, foam + neon dance floor, back-lit bottle bar, velvet VIP,
//    block backstage, black drape stage); every neon trim is one merged mesh
//  - the DANCE FLOOR IS SUNKEN (stairs with lit edges all round, LED tiles): floorY(x,z) is the floor height anywhere and
//    everything that stands on the floor uses it
//  - the clutter is dress.js: hundreds of small things merged into one or two meshes per room
//  - 3 point lights (was 6), 8 sweeping spots (was 14), 8 haze beams (was 16), 160 air sparkles (was 300)
// Dots: static DOT HIGHWAYS that lead you room to room, plus moving set pieces that burst for a bonus. Fruit heals. Coins carry out.
"use strict";
const LANE = {x0:-30, x1:30, z0:-450, z1:50};
let BOUNDS = Object.assign({}, LANE);
// each room: its span, its two light colours, and its wall look (dress.js paints the textures)
const ROOMS = [
  {name:'Entrance',    z0:0,    z1:50,   col:0x41e4ff, col2:0xff4fb8, wall:'brick'},
  {name:'Dance Floor', z0:-110, z1:0,    col:0xff4fb8, col2:0x41e4ff, wall:'foam'},
  {name:'The Bar',     z0:-200, z1:-110, col:0xffb340, col2:0xff4fb8, wall:'bottles'},
  {name:'VIP Lounge',  z0:-290, z1:-200, col:0xb070ff, col2:0xffc860, wall:'velvet'},
  {name:'Backstage',   z0:-370, z1:-290, col:0xbfe8ff, col2:0xffb340, wall:'block'},
  {name:'Main Stage',  z0:-450, z1:-370, col:0xff3b4a, col2:0xffb340, wall:'drape'}];
const STAGE_Z = -370, GATE_X = 8;
const roomAt = z => ROOMS.find(r=>z>=r.z0 && z<=r.z1) || (z>0?ROOMS[0]:ROOMS[5]);
const roomIndex = z => ROOMS.indexOf(roomAt(z));
const inLane = (x,z)=> x>BOUNDS.x0+1.5 && x<BOUNDS.x1-1.5 && z>BOUNDS.z0+1.5 && z<BOUNDS.z1-1.5;

// ---------------- the sunken dance floor ----------------
// The pit is 0.45 m down, reached by four lit steps on every side (1.6 m of stairs). floorY is the height of the floor at any
// point: heroes, ghosts, the crowd, dots, pickups and floor effects all add it, so they walk down into the pit and back up.
const PIT = {x0:-16, x1:16, z0:-94, z1:-12, d:0.45, ramp:1.6};
function floorY(x, z){ if(x <= PIT.x0 || x >= PIT.x1 || z <= PIT.z0 || z >= PIT.z1) return 0;
  const e = Math.min(x-PIT.x0, PIT.x1-x, z-PIT.z0, PIT.z1-z); return -PIT.d*Math.min(1, e/PIT.ramp); }

const WALLS = [], PROPS = [], SIGNS = [], SPOTS = [], BEAMS = [], DISCOS = [], LASERS = [], SPEAKER_IDX = [], LEDS = [];
let gateA = null, gateBeams = [], gateGlow = null, air = null, airPos = null, tileTex = null;
const TX = 9, TZ = 23, TILE_COLS = [0xff4fb8, 0x2f6bff, 0x41e4ff, 0xffb340, 0x8a5cff].map(c=>new THREE.Color(c));
const LSLOTS = [], PLIGHTS = [];
const PROP_INST = {};   // kind -> {solid:InstancedMesh, neon:InstancedMesh, list}
// walls are bucketed along the lane (8 m bands) so the hundreds of checks per frame only look at nearby walls; rebuilt when walls come and go
let WGRID = null, wgLen = -1;
function wgrid(){ if(WGRID && wgLen === WALLS.length) return WGRID; WGRID = new Map(); wgLen = WALLS.length;
  for(const w of WALLS) for(let k=Math.floor((w.z0-2.5)/8); k<=Math.floor((w.z1+2.5)/8); k++){ let a = WGRID.get(k); if(!a){ a = []; WGRID.set(k, a); } a.push(w); } return WGRID; }
function blocked(x,z,r){ const L = wgrid().get(Math.floor(z/8)); if(!L) return null; for(const w of L){ if(w.solid && x>w.x0-r && x<w.x1+r && z>w.z0-r && z<w.z1+r) return w; } return null; }

// ---------------- walls ----------------
const WSEGS = [];   // walls to draw: {x0,z0,x1,z1,h,ri} — ri picks the room look
function solidWall(x0,z0,x1,z1){ const t = 0.8, A = {x0:Math.min(x0,x1)-t/2, x1:Math.max(x0,x1)+t/2, z0:Math.min(z0,z1)-t/2, z1:Math.max(z0,z1)+t/2, solid:true}; WALLS.push(A); return A; }
function wallSeg(x0,z0,x1,z1,ri,h=3.6){ WSEGS.push({x0,z0,x1,z1,h,ri}); return solidWall(x0,z0,x1,z1); }
// a merged, textured box per room look. UVs come from world position (6 m of texture per repeat), so every wall lines up.
function buildWalls(){
  const trims = new Kit();
  for(let ri=0; ri<ROOMS.length; ri++){ const R = ROOMS[ri], segs = WSEGS.filter(s=>s.ri===ri); if(!segs.length) continue;
    const geos = segs.map(s=>{ const t = 0.8, w = Math.abs(s.x1-s.x0)||t, d = Math.abs(s.z1-s.z0)||t, ext = (s.x0===s.x1 && Math.abs(s.x0)===30) ? 0 : t;   // outer walls meet end to end; the rest cover their collision box
      const g = new THREE.BoxGeometry(w + (w>t?ext:0), s.h, d + (d>t?ext:0));
      g.translate((s.x0+s.x1)/2, s.h/2, (s.z0+s.z1)/2); const P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv;
      for(let i=0;i<P.count;i++){ const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
        if(Math.abs(N.getY(i)) > 0.5) U.setXY(i, (x+z)/6, 0.99);                  // top: the dark cap band at the top of the texture
        else U.setXY(i, (Math.abs(N.getX(i)) > 0.5 ? -z*Math.sign(N.getX(i)) : x*Math.sign(N.getZ(i)))/6, y/6); }
      // neon trim along the top of the wall in the room colour, a thinner one along the foot in the second colour
      trims.seg(s.x0, s.h+0.05, s.z0, s.x1, s.h+0.05, s.z1, 0.12, R.col, {glow:true}); return g; });
    const m = new THREE.Mesh(mergeGeos(geos), new THREE.MeshBasicMaterial({map:wallTex(R.wall, R.col, R.col2)})); m.matrixAutoUpdate = false; scene.add(m); }
  // skirting lights, only where you can see them: the room-facing side of the outer walls
  for(const R of ROOMS) for(const x of [-29.55, 29.55]) trims.seg(x, 0.16, R.z1, x, 0.16, R.z0, 0.07, R.col2, {glow:true});
  trims.build();
}
function sign(text, color, x, y, z, w){
  const c = document.createElement('canvas'); c.width = 1024; c.height = 220; const g = c.getContext('2d'); const col = '#'+color.toString(16).padStart(6,'0');
  g.font = '900 150px Cinzel, Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = col; g.shadowBlur = 40; g.fillStyle = col; g.fillText(text, 512, 112); g.shadowBlur = 10; g.fillStyle = '#fff'; g.globalAlpha = 0.8; g.fillText(text, 512, 112);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w*220/1024), new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c), transparent:true, blending:THREE.AdditiveBlending, depthWrite:false}));
  m.position.set(x,y,z); m.rotation.x = -0.35; scene.add(m); SIGNS.push(m); return m;
}
function podium(x, z){ const y = floorY(x, z), g = new THREE.Group(); g.position.set(x, y, z);
  const b = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.45, 1.0, 24), new THREE.MeshLambertMaterial({color:0x2a2234})); b.position.y = 0.5; g.add(b);
  const r = new THREE.Mesh(new THREE.TorusGeometry(1.32, 0.05, 6, 40), neonMat(0xff4fb8)); r.rotation.x = Math.PI/2; r.position.y = 1.0; g.add(r, at(glowS(0xff4fb8, 4, 0.35), 0, 1.2, 0));
  const r2 = r.clone(); r2.position.y = 0.06; r2.scale.setScalar(1.1); g.add(r2); scene.add(g);
  WALLS.push({x0:x-1.3, x1:x+1.3, z0:z-1.3, z1:z+1.3, solid:true}); }

// ---------------- the floors ----------------
// One canvas per room (dress.js paints it). Unlit, so it costs almost nothing to draw; the dance floor is cut around the pit.
function floorPiece(mat, R, x0, x1, z0, z1, y){ const g = new THREE.PlaneGeometry(x1-x0, z1-z0); g.rotateX(-Math.PI/2); g.translate((x0+x1)/2, y, (z0+z1)/2);
  const P = g.attributes.position, U = g.attributes.uv; for(let i=0;i<P.count;i++) U.setXY(i, (P.getX(i)+30)/60, (P.getZ(i)-R.z0)/(R.z1-R.z0));
  const m = new THREE.Mesh(g, mat); m.matrixAutoUpdate = false; scene.add(m); return m; }
function buildFloors(){
  ROOMS.forEach((R, ri)=>{ const mat = new THREE.MeshBasicMaterial({map:paintFloor(ri)});
    if(ri !== 1){ floorPiece(mat, R, -30, 30, R.z0, R.z1, 0); return; }
    // dance floor: the raised floor around the pit, then the pit itself with its light-up tiles
    floorPiece(mat, R, -30, 30, PIT.z1, R.z1, 0); floorPiece(mat, R, -30, 30, R.z0, PIT.z0, 0);
    floorPiece(mat, R, -30, PIT.x0, PIT.z0, PIT.z1, 0); floorPiece(mat, R, PIT.x1, 30, PIT.z0, PIT.z1, 0);
    tileTex = new THREE.DataTexture(new Uint8Array(TX*TZ*4), TX, TZ, THREE.RGBAFormat); tileTex.magFilter = tileTex.minFilter = THREE.NearestFilter;
    const pm = mat.clone(), U = new THREE.Vector4((PIT.x0+30)/60, (PIT.z0-R.z0)/(R.z1-R.z0), (PIT.x1+30)/60, (PIT.z1-R.z0)/(R.z1-R.z0));
    pm.onBeforeCompile = sh => { sh.uniforms.tTiles = {value:tileTex}; sh.uniforms.uPit = {value:U};
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D tTiles; uniform vec4 uPit;')
        .replace('#include <map_fragment>', `#include <map_fragment>
          { vec2 q = (vUv - uPit.xy)/(uPit.zw - uPit.xy); vec2 c = fract(q*vec2(${TX}.0, ${TZ}.0));
            float m = smoothstep(0.03,0.08,c.x)*smoothstep(0.97,0.92,c.x)*smoothstep(0.03,0.08,c.y)*smoothstep(0.97,0.92,c.y);
            diffuseColor.rgb += texture2D(tTiles, q).rgb * m * 1.5; }`); };
    floorPiece(pm, R, PIT.x0, PIT.x1, PIT.z0, PIT.z1, -PIT.d); });
  // the street goes on past the barriers, and the void beyond everything is a long way down
  const st = new THREE.Mesh(new THREE.PlaneGeometry(60, 15), new THREE.MeshBasicMaterial({map:streetTex()})); st.rotation.x = -Math.PI/2; st.position.set(0, 0, 57.5); scene.add(st);
  const outside = new THREE.Mesh(new THREE.PlaneGeometry(900,1000), new THREE.MeshBasicMaterial({color:0x030206})); outside.rotation.x = -Math.PI/2; outside.position.set(0,-1.2,-200); scene.add(outside);
}

function buildWorld(M){
  RS = 7;   // dress.js's random numbers: the same club every run
  // walls (outer shell per room) + dividers with doorways
  for(let i=0;i<ROOMS.length;i++){ const R = ROOMS[i]; wallSeg(-30,R.z1,-30,R.z0,i,5); wallSeg(30,R.z1,30,R.z0,i,5); }
  solidWall(-30,50,30,50);                                                                                // the street is closed: road barriers show it
  wallSeg(-30,-450,30,-450,5,10);                                                                         // behind the stage (the LED wall hangs on it)
  wallSeg(-30,14,-6,14,0); wallSeg(6,14,30,14,0);                                                         // the club's front wall: the street is outside
  wallSeg(-30,0,-8,0,0); wallSeg(8,0,30,0,0);
  wallSeg(-30,-110,-18,-110,1); wallSeg(-6,-110,6,-110,1); wallSeg(18,-110,30,-110,1);
  wallSeg(-30,-200,-9,-200,2); wallSeg(9,-200,30,-200,2);
  wallSeg(-30,-290,-18,-290,3); wallSeg(-6,-290,6,-290,3); wallSeg(18,-290,30,-290,3);
  wallSeg(-30,STAGE_Z,-GATE_X,STAGE_Z,4); wallSeg(GATE_X,STAGE_Z,30,STAGE_Z,4);
  gateA = {x0:-GATE_X, x1:GATE_X, z0:STAGE_Z-0.6, z1:STAGE_Z+0.6, solid:true}; WALLS.push(gateA);
  // hallways + terrain: the game room in the bar, the VIP hallway, three backstage lanes, the rails round the pit (drawn by dress.js)
  wallSeg(17,-116,17,-136,2); wallSeg(17,-148,17,-172,2);
  wallSeg(-6,-201,-6,-216,3); wallSeg(6,-201,6,-216,3);
  wallSeg(-10,-298,-10,-340,4); wallSeg(10,-312,10,-362,4);
  for(const x of [-17,17]){ solidWall(x,-18,x,-46); solidWall(x,-62,x,-90); }
  for(const [x,z] of [[-9,-40],[9,-40],[-9,-72],[9,-72],[0,-56]]) podium(x, z);                     // go-go podiums down in the pit
  for(let i=0;i<6;i++){ const b = new THREE.Mesh(new THREE.BoxGeometry(GATE_X*2,0.07,0.07), neonMat(0xff3b3b)); b.position.set(0,0.35+i*0.5,STAGE_Z); scene.add(b); gateBeams.push(b); }
  gateGlow = at(glow(0xff3b3b, 14, 0.45), 0, 1.5, STAGE_Z); scene.add(gateGlow);
  sign('CLUB PAC', 0xff4fb8, 0, 5.2, 14.6, 16); sign('DANCE FLOOR', 0xff4fb8, 0, 5.4, 0.6, 18); sign('THE BAR', 0xffb340, 0, 5.4, -109.4, 15);
  sign('VIP', 0xb070ff, 0, 5.4, -199.4, 9); sign('BACKSTAGE', 0x41e4ff, 0, 5.4, -289.4, 16); sign('MAIN STAGE', 0xff3b4a, 0, 5.6, STAGE_Z+0.6, 18);
  placeAll();                // the instanced furniture (props.glb) — placed first so the floors can paint shadows under it
  const kits = dressClub();  // dress.js: clutter per room (+ its collision and floor shadows)
  buildWalls(); buildFloors(); buildLights(); buildProps(M);
  kits.forEach(k=>k.build()); finishDress();
}
function buildLights(){
  // sweeping disco spots on the floor, haze beams, disco balls, lasers
  for(let i=0;i<8;i++){ const R = ROOMS[1+(i%5)]; const m = pool(i%2?R.col:R.col2, 9, 0.15); m.position.y = 0.06; scene.add(m); SPOTS.push({m, cz:(R.z0+R.z1)/2, hz:(R.z1-R.z0)/2-8, ph:i*1.7, w:0.25+Math.random()*0.3}); }
  const BEAM_AT = [[-10,-30,1],[10,-70,1],[0,-150,2],[-14,-240,3],[14,-250,3],[-14,-420,5],[0,-425,5],[14,-420,5]];
  for(const [x,z,ri] of BEAM_AT){ const R = ROOMS[ri], col = BEAMS.length%2?R.col:R.col2;
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 3.0, 13, 12, 1, true), new THREE.MeshBasicMaterial({color:col, transparent:true, opacity:0.03, blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide}));
    m.position.set(x, 6.5, z); scene.add(m); BEAMS.push({m, ph:Math.random()*6}); }
  for(const [x,z] of [[-24,-30],[24,-75],[-24,-245],[24,-405]]){ const m = new THREE.Mesh(new THREE.IcosahedronGeometry(1.1,1), new THREE.MeshStandardMaterial({color:0xddddff, metalness:1, roughness:0.15, flatShading:true}));
    m.position.set(x,11,z); scene.add(m); scene.add(at(glowS(0xd0dcff,6,0.6),x,11,z)); DISCOS.push(m); }
  for(let i=0;i<12;i++){ const col = [0xff4fb8,0x41e4ff,0x7cff4f,0x2f6bff,0xffb340][i%5];
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.035,56,6), new THREE.MeshBasicMaterial({color:new THREE.Color(col).multiplyScalar(1.5), transparent:true, opacity:0.45, blending:THREE.AdditiveBlending, depthWrite:false}));
    m.position.set(0, 3, i<6?-98:-438); scene.add(m); LASERS.push({m, ph:i*0.9}); }
  // real lights: three PointLights moved to the slots nearest the action (they light the furniture and clutter, per vertex)
  for(let z=46; z>-448; z-=17){ const R = roomAt(z); LSLOTS.push({x:(LSLOTS.length%2?-14:14), z, col:new THREE.Color(LSLOTS.length%3?R.col:R.col2)}); }
  for(let i=0;i<3;i++){ const L = new THREE.PointLight(0xffffff, 3.5, 42, 1.3); L.position.y = 6; scene.add(L); PLIGHTS.push(L); }
  // sparkle in the air
  const AIRN = 160, g = new THREE.BufferGeometry(); airPos = new Float32Array(AIRN*3); const ac = new Float32Array(AIRN*3);
  for(let i=0;i<AIRN;i++){ airPos[i*3] = rnd(-29,29); airPos[i*3+1] = rnd(0.5,9); airPos[i*3+2] = rnd(-40,40); const c = new THREE.Color(pick([0xff4fb8,0x41e4ff,0xffe08a,0xb070ff])); ac[i*3]=c.r; ac[i*3+1]=c.g; ac[i*3+2]=c.b; }
  g.setAttribute('position', new THREE.BufferAttribute(airPos,3)); g.setAttribute('color', new THREE.BufferAttribute(ac,3));
  air = new THREE.Points(g, new THREE.PointsMaterial({size:0.22, vertexColors:true, map:glowTex, transparent:true, opacity:0.75, blending:THREE.AdditiveBlending, depthWrite:false})); air.frustumCulled = false; scene.add(air);
}

// ---------------- PROPS from the Blender props.glb, instanced per kind ----------------
const PROP_DEF = { // kind: [w (x), d (z), breakable energy cost (0 = solid fixture), walk-through]
  speaker:[2.4,2.2,18], dj:[9,3,0], bar:[3,6,0], stool:[0.7,0.7,3], table:[1.4,1.4,6], booth:[4.4,2.2,10], case:[2.2,1.6,8], post:[0.4,0.4,3], rope:[4,0.12,0,1], stage:[10,9,0], truss:[0.7,0.7,0] };
const PLACE = [];
function placeAll(){
  const P = (kind, x, z, rot=0, y=0) => PLACE.push({kind, x, z, rot, y});
  const T = (x, z) => { P('table', x, z); for(const [dx,dz] of [[1.2,0],[-1.2,0],[0,1.2]]) P('stool', x+dx, z+dz); };   // a table with its stools
  // ENTRANCE: the red-carpet lane and the two queue lines along the club front (velvet rope between brass posts)
  for(const x of [-2.6, 2.6]){ for(const z of [30,26,22,18]) P('post', x, z); for(const z of [30,26,22]) P('rope', x, z, Math.PI/2); }
  for(let i=0;i<6;i++){ P('post', 6.5+i*4, 18.6); P('post', -6.5-i*4, 18.6); } for(let i=0;i<5;i++){ P('rope', 6.5+i*4, 18.6); P('rope', -26.5+i*4, 18.6); }
  // DANCE FLOOR: the DJ booth and speakers up on the riser, speaker stacks in the lounges, trusses, lounge tables
  P('dj', 0, -101.2, 0, 1.0); for(const x of [-5.8, 5.8]) P('speaker', x, -101.6, 0, 1.0);
  for(const x of [-27.6, 27.6]) for(const z of [-16, -54]) P('speaker', x, z, x<0 ? Math.PI/2 : -Math.PI/2);
  for(const [x,z] of [[-28,-4],[28,-4],[-28,-106],[28,-106],[-7.6,-107],[7.6,-107]]) P('truss', x, z);
  for(const [x,z] of [[-23,-6],[23,-6],[-21.5,-41],[21.5,-41],[-21.5,-67],[21.5,-67]]) T(x, z);
  // BAR: the long counter on the left wall with its stools, the island bar, high tables; the game room on the right
  for(let z=-124; z>=-184; z-=6) P('bar', -26.5, z, Math.PI);
  for(let z=-122.5; z>=-186; z-=2.6) P('stool', -23.8, z);
  for(const z of [-149,-155]){ P('bar', -2.6, z); P('bar', 2.6, z, Math.PI); }
  for(const [x,z] of [[-8,-124],[-10,-176],[4,-188],[-12,-142],[10,-182],[8,-128],[-6,-166],[11,-136],[23,-145],[21.5,-186],[21.5,-194]]) T(x, z);
  // VIP: booths on both walls facing in, a centre island, a rope lane in from the hallway, a rope line across the back
  for(const z of [-215,-235,-255,-275]){ P('booth', -26, z, Math.PI/2); P('booth', 26, z, -Math.PI/2); }
  P('booth', 0, -238, 0); P('booth', 0, -252, Math.PI);
  for(const x of [-4.5, 4.5]){ for(const z of [-217,-221,-225,-229]) P('post', x, z); for(const z of [-217,-221,-225]) P('rope', x, z, Math.PI/2); }
  for(let x=-12; x<=12; x+=4) P('post', x, -282); for(let x=-12; x<12; x+=4) P('rope', x, -282);
  // BACKSTAGE: road cases everywhere, trusses
  for(const [x,z] of [[-20,-344],[-17,-346],[16,-306],[20,-322],[22,-340],[-5,-330],[-3,-334],[6,-352],[-18,-362],[16,-360],[0,-306],[3,-342]]) P('case', x, z, ((x*13+z)%3)*0.4);
  for(const [x,z] of [[-28,-294],[28,-294],[-28,-366],[28,-366]]) P('truss', x, z);
  // MAIN STAGE: riser across the back, trusses that hold the lighting rig, speaker walls
  for(const x of [-20,-10,0,10,20]) P('stage', x, -444.5);
  for(const [x,z] of [[-28,-376],[28,-376],[-28,-436],[28,-436]]) P('truss', x, z);
  for(const x of [-26,26]){ P('speaker', x, -428); P('speaker', x, -420); }
  for(const p of PLACE){ const [w,d] = PROP_DEF[p.kind]; if(p.kind!=='rope' && p.y < 0.5) shade(p.x, p.z, w, d, p.rot, p.kind==='post'?0.35:0.6, p.kind==='table'||p.kind==='stool'||p.kind==='post'); }
}
const PROP_MAT = new THREE.MeshLambertMaterial({vertexColors:true});
function buildProps(M){
  const byKind = {}; for(const p of PLACE) (byKind[p.kind] = byKind[p.kind]||[]).push(p);
  for(const kind in byKind){ if(kind==='rope') continue;   // velvet ropes are drawn by dress.js (the Blender rope was 11,000 triangles a piece)
    const list = byKind[kind], src = LOOK.rawPiece(M, 'props', 'prop.'+kind); if(!src) continue;
    const isNeon = o => /neon|glow/i.test(o.material.name||'');
    const gS = LOOK.mergeColored(src, o=>!isNeon(o)), gN = LOOK.mergeColored(src, isNeon);
    const solid = new THREE.InstancedMesh(gS, PROP_MAT, list.length);
    const neon = gN.attributes.position.count ? new THREE.InstancedMesh(gN, new THREE.MeshBasicMaterial({vertexColors:true, color:new THREE.Color(1.7,1.7,1.7)}), list.length) : null;
    list.forEach((p,i)=>{ dummy.position.set(p.x, p.y, p.z); dummy.rotation.set(0, p.rot, 0); dummy.scale.set(1,1,1); dummy.updateMatrix(); solid.setMatrixAt(i, dummy.matrix); if(neon) neon.setMatrixAt(i, dummy.matrix);
      const [w,d,cost,thru] = PROP_DEF[kind]; if(thru) return; const sw = Math.abs(Math.sin(p.rot)) > 0.7; const W = sw ? d : w, D = sw ? w : d;
      const A = {x0:p.x-W/2, x1:p.x+W/2, z0:p.z-D/2, z1:p.z+D/2, solid:true, prop:true, kind, cost, color:kind==='speaker'?0xff4fb8:kind==='booth'?0xb070ff:0x41e4ff, dmg:0, push:0, inst:i, mesh:solid, neon, p};
      WALLS.push(A); PROPS.push(A); if(kind==='speaker') SPEAKER_IDX.push(A); });
    solid.instanceMatrix.needsUpdate = true; scene.add(solid); if(neon){ neon.instanceMatrix.needsUpdate = true; scene.add(neon); }
    PROP_INST[kind] = {solid, neon, list};
  }
}
function setPropVisible(A, on){ dummy.position.set(A.p.x, on?A.p.y:-50, A.p.z); dummy.rotation.set(0, A.p.rot, 0); dummy.scale.setScalar(on?1:0.001); dummy.updateMatrix();
  A.mesh.setMatrixAt(A.inst, dummy.matrix); A.mesh.instanceMatrix.needsUpdate = true; if(A.neon){ A.neon.setMatrixAt(A.inst, dummy.matrix); A.neon.instanceMatrix.needsUpdate = true; } }
function resetProps(){ for(const P of PROPS){ if(P.broken){ setPropVisible(P, true); WALLS.push(P); } P.broken = false; P.dmg = 0; P.push = 0; } }
function setGate(open){ gateA.solid = !open; gateBeams.forEach(b=>b.visible = !open); gateGlow.visible = !open; }
function placeLights(cz){ const s = LSLOTS.slice().sort((a,b)=>Math.abs(a.z-cz)-Math.abs(b.z-cz)); PLIGHTS.forEach((L,i)=>{ const S = s[i]; L.position.x = S.x; L.position.z = S.z; L.color.copy(S.col); }); }
function animateWorld(rdt, rtNow, focusZ, beat){
  const bn = Math.floor(beat), onBeat = (beat%1) < 0.15;
  // the pit's light-up tiles: one tiny texture, rewritten each frame (was 330 see-through planes)
  if(tileTex){ const D = tileTex.image.data; for(let a=0;a<TX;a++) for(let b=0;b<TZ;b++){ const v = Math.sin(rtNow*2.4 + a*0.7 + b*1.3 + bn), k = v > 0.3 ? (onBeat?0.62:0.38) : 0.03, C = TILE_COLS[(a+b+bn)%5], o = (b*TX+a)*4;
    D[o] = Math.min(255, C.r*k*255); D[o+1] = Math.min(255, C.g*k*255); D[o+2] = Math.min(255, C.b*k*255); D[o+3] = 255; } tileTex.needsUpdate = true; }
  DISCOS.forEach(d=>d.rotation.y += rdt*0.8);
  LASERS.forEach(L=>{ L.m.rotation.z = Math.sin(rtNow*0.6+L.ph)*1.1; L.m.rotation.x = Math.cos(rtNow*0.45+L.ph)*0.7; });
  SPOTS.forEach(s=>{ s.m.position.x = Math.sin(rtNow*s.w + s.ph)*20; s.m.position.z = s.cz + Math.cos(rtNow*s.w*1.3 + s.ph)*s.hz; s.m.position.y = 0.06 + floorY(s.m.position.x, s.m.position.z); });
  BEAMS.forEach(b=>{ b.m.rotation.z = Math.sin(rtNow*0.5 + b.ph)*0.25; b.m.material.opacity = 0.025 + (onBeat?0.02:0); });
  for(const L of LEDS) L.material.uniforms.uT.value = rtNow;
  animateDress(rtNow, onBeat);
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
function buildDots(){ dotMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.21,1), new THREE.MeshBasicMaterial({color:0xffffff}), DMAX);   // 80 triangles a dot, not 160
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
function spawnBuff(x, z, type){ const T = BUFF_TYPES[type], g = new THREE.Group(); g.position.set(x, 1.1+floorY(x, z), z);
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
