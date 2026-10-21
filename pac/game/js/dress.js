// PAC v0.9 — dress.js: THE CLUB, ROOM BY ROOM.
// Brent: "the level is still incredibly poorly done", "there's not enough clutter", "the club atmosphere still doesn't do it".
// Every room gets
//   - its own FLOOR, painted once into a canvas: the pattern (street + checker lobby / glitter concrete round an LED pit /
//     wood planks / patterned carpet / taped concrete / black rubber), baked light pools in the room's colours, soft shadows
//     under every piece of furniture, dark corners at the walls, and litter: cables, cups, confetti, puddles, flyers, petals...
//   - its own WALL look (brick + graffiti, quilted foam + neon tubes, back-lit bottle shelves, velvet folds, painted block +
//     pipes, black star-cloth drape)
//   - a CLUTTER mesh: hundreds of small shapes (cars, coats, couches, balloons, kegs, palms, mirrors, amps, a drum kit, a
//     lighting rig...) merged into one solid + one glowing mesh per room — a couple of draw calls, lit per vertex
// Big clutter is solid (it goes into WALLS like everything else). Nothing here is random at run time: the seed is fixed.
"use strict";
let RS = 7; const dressSeed = s => { RS = s; };
const SHADES = [];   // soft floor shadows under furniture: {x,z,w,d,rot,a,round}
function shade(x, z, w, d, rot=0, a=0.55, round=false){ SHADES.push({x, z, w, d, rot, a, round}); }

// ---------------- merging ----------------
// plain geometries (walls): position/normal/uv concatenated, one index buffer
function mergeGeos(list){ const names = ['position','normal','uv'].filter(n=>list[0].attributes[n]); let nv = 0, ni = 0;
  for(const g of list){ nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; }
  const out = new THREE.BufferGeometry();
  for(const n of names){ const sz = list[0].attributes[n].itemSize, arr = new Float32Array(nv*sz); let o = 0; for(const g of list){ arr.set(g.attributes[n].array, o); o += g.attributes[n].count*sz; } out.setAttribute(n, new THREE.BufferAttribute(arr, sz)); }
  const idx = new (nv > 65535 ? Uint32Array : Uint16Array)(ni); let io = 0, vo = 0;
  for(const g of list){ const c = g.attributes.position.count; if(g.index){ const I = g.index.array; for(let i=0;i<I.length;i++) idx[io++] = I[i] + vo; } else for(let i=0;i<c;i++) idx[io++] = vo + i; vo += c; }
  out.setIndex(new THREE.BufferAttribute(idx, 1)); out.computeBoundingSphere(); return out; }
// shared unit shapes the Kit stamps out
const KG = {};
function kgeo(k){ if(KG[k]) return KG[k]; const a = k.split(':'); let g;
  if(a[0]==='box') g = new THREE.BoxGeometry(1,1,1);
  else if(a[0]==='cyl') g = new THREE.CylinderGeometry(+a[2], 1, 1, +a[1]);            // unit height, bottom radius 1, top radius a[2]
  else if(a[0]==='ball') g = new THREE.SphereGeometry(1, +a[1], Math.max(3, (+a[1])>>1));
  else g = new THREE.TorusGeometry(1, +a[2], 4, +a[1]);
  return KG[k] = g; }
// A Kit collects coloured shapes (with a parent transform stack) and merges them: solid ones lit per vertex, glowing ones unlit
const DRESS_MAT = new THREE.MeshLambertMaterial({vertexColors:true}), DRESS_GLOW = new THREE.MeshBasicMaterial({vertexColors:true, color:new THREE.Color(1.6,1.6,1.6)});
const _q = new THREE.Quaternion(), _eu = new THREE.Euler(), _v3 = new THREE.Vector3(), _s3 = new THREE.Vector3(), _UP = new THREE.Vector3(0,1,0);
function Kit(){ this.s = []; this.e = []; this.P = new THREE.Matrix4(); }
Kit.prototype.at = function(x, z, ry, fn, y=0){ const old = this.P; this.P = old.clone().multiply(new THREE.Matrix4().makeRotationY(ry).setPosition(x, y, z)); fn(); this.P = old; return this; };
Kit.prototype.put = function(g, x,y,z, sx,sy,sz, col, o){ _eu.set(o.rx||0, o.ry||0, o.rz||0); _q.setFromEuler(_eu);
  (o.glow ? this.e : this.s).push({g, m:this.P.clone().multiply(new THREE.Matrix4().compose(_v3.set(x,y,z), _q, _s3.set(sx,sy,sz))), c:col}); return this; };
Kit.prototype.box = function(x,y,z,w,h,d,col,o={}){ return this.put(kgeo('box'), x, y+h/2, z, w, h, d, col, o); };                 // y = its bottom
Kit.prototype.cyl = function(x,y,z,r,h,col,o={}){ return this.put(kgeo('cyl:'+(o.seg||10)+':'+(o.top==null?1:o.top)), x, y+h/2, z, r, h, r, col, o); };
Kit.prototype.ball = function(x,y,z,r,col,o={}){ return this.put(kgeo('ball:'+(o.seg||8)), x, y, z, r*(o.sx||1), r*(o.sy||1), r*(o.sz||1), col, o); };
Kit.prototype.ring = function(x,y,z,r,tube,col,o={}){ return this.put(kgeo('tor:'+(o.seg||16)+':'+(Math.round(tube/r*100)/100)), x,y,z, r,r,r, col, Object.assign({rx:Math.PI/2}, o)); };
Kit.prototype.seg = function(x0,y0,z0,x1,y1,z1,t,col,o={}){ const a = new THREE.Vector3(x0,y0,z0), d = new THREE.Vector3(x1-x0,y1-y0,z1-z0), L = d.length(); if(L < 1e-4) return this;
  _q.setFromUnitVectors(_UP, d.divideScalar(L)); (o.glow ? this.e : this.s).push({g:kgeo(o.round ? 'cyl:6:1' : 'box'), m:this.P.clone().multiply(new THREE.Matrix4().compose(a.addScaledVector(d, L/2), _q, _s3.set(t, L, t))), c:col}); return this; };
function mergeItems(list){ let nv = 0, ni = 0; for(const it of list){ nv += it.g.attributes.position.count; ni += it.g.index.count; }
  const pos = new Float32Array(nv*3), nor = new Float32Array(nv*3), col = new Float32Array(nv*3), idx = new (nv > 65535 ? Uint32Array : Uint16Array)(ni);
  const nm = new THREE.Matrix3(), v = new THREE.Vector3(), c = new THREE.Color(); let vo = 0, io = 0;
  for(const it of list){ const P = it.g.attributes.position, N = it.g.attributes.normal, I = it.g.index.array; nm.getNormalMatrix(it.m); c.set(it.c);
    for(let i=0;i<P.count;i++){ const o = (vo+i)*3; v.fromBufferAttribute(P,i).applyMatrix4(it.m); pos[o] = v.x; pos[o+1] = v.y; pos[o+2] = v.z;
      v.fromBufferAttribute(N,i).applyMatrix3(nm).normalize(); nor[o] = v.x; nor[o+1] = v.y; nor[o+2] = v.z; col[o] = c.r; col[o+1] = c.g; col[o+2] = c.b; }
    for(let i=0;i<I.length;i++) idx[io++] = I[i] + vo; vo += P.count; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos,3)); g.setAttribute('normal', new THREE.BufferAttribute(nor,3)); g.setAttribute('color', new THREE.BufferAttribute(col,3));
  g.setIndex(new THREE.BufferAttribute(idx,1)); g.computeBoundingSphere(); return g; }
Kit.prototype.build = function(){ const out = []; if(this.s.length) out.push(new THREE.Mesh(mergeItems(this.s), DRESS_MAT)); if(this.e.length) out.push(new THREE.Mesh(mergeItems(this.e), DRESS_GLOW));
  out.forEach(m=>{ m.matrixAutoUpdate = false; scene.add(m); }); this.s = []; this.e = []; return out; };

// ---------------- everything else is private to this file ----------------
const DRESS = (()=>{
const sr = ()=>{ RS = RS*16807 % 2147483647; return RS/2147483647; }, sr2 = (a,b)=>a+(b-a)*sr(), spick = a=>a[Math.floor(sr()*a.length)];
const DQ = isMobile ? 0.55 : 1;   // phones paint less litter (and at half the resolution)
const rgba = (c,a)=>`rgba(${c>>16&255},${c>>8&255},${c&255},${a})`;
const vc = (hex, k)=>new THREE.Color(hex).multiplyScalar(k);
const GL = [], FLICK = [], WSIGN = [];             // glow sprites, flickering glows, wall signs: made in finish()
const gl = (x,y,z,col,size,op=0.6)=>GL.push([x,y,z,col,size,op]);
function solid(x, z, w, d, a=0.6){ WALLS.push({x0:x-w/2, x1:x+w/2, z0:z-d/2, z1:z+d/2, solid:true}); if(a) shade(x, z, w, d, 0, a); }
// is a spot clear of walls, clutter and furniture? (litter goes on open floor)
function open(x, z, r){ if(blocked(x, z, r)) return false; for(const p of PLACE){ const D = PROP_DEF[p.kind]; if(Math.abs(p.x-x) < D[0]/2+r && Math.abs(p.z-z) < D[1]/2+r) return false; } return true; }

// ======================= CLUTTER BUILDERS (local coords, then placed) =======================
const CUPS = [0xd8202e, 0xd8202e, 0x2a6ae0, 0xf2f2f2, 0x2ab04a];
function cup(k, x, y, z, col=0xd8202e, down=false){ if(down) k.put(kgeo('cyl:8:1.3'), x, y+0.07, z, 0.075, 0.15, 0.075, col, {rz:Math.PI/2, ry:sr()*6.3}); else { k.cyl(x, y, z, 0.075, 0.15, col, {seg:8, top:1.3}); } }
function bottle(k, x, y, z, col, down=false){ if(down){ k.put(kgeo('cyl:8:1'), x, y+0.065, z, 0.065, 0.3, 0.065, col, {rz:Math.PI/2, ry:sr()*6.3}); return; } k.cyl(x, y, z, 0.065, 0.26, col, {seg:8}); k.cyl(x, y+0.26, z, 0.028, 0.12, col, {seg:6}); }
function litter(k, x0, z0, x1, z1, n, kinds){ for(let i=0;i<n;i++){ const x = sr2(x0,x1), z = sr2(z0,z1); if(!open(x, z, 0.15)) continue; const y = floorY(x, z), t = spick(kinds);
    if(t==='cup') cup(k, x, y, z, spick(CUPS), sr() < 0.6); else if(t==='can') k.put(kgeo('cyl:8:1'), x, y+0.06, z, 0.06, 0.2, 0.06, spick([0xc8c8d0, 0xd02a2a, 0x2a8ad0, 0x1a1a1a, 0x8ad02a]), {rz:Math.PI/2, ry:sr()*6.3});
    else if(t==='bottle') bottle(k, x, y, z, spick([0x2a6a2a, 0x8a5a1a, 0x9ad0e8, 0x3a2a1a]), sr() < 0.7);
    else if(t==='glow') k.box(x, y, z, 0.03, 0.03, 0.2, spick([0x7cff4f, 0xff4fb8, 0x41e4ff, 0xffe040]), {ry:sr()*6.3, glow:true});
    else if(t==='napkin') k.ball(x, y+0.03, z, 0.09, 0xf2efe8, {seg:5, sy:0.45});
    else if(t==='roll') k.ring(x, y+0.025, z, 0.08, 0.035, spick([0x9a9aa0, 0x1a1a1a, 0xe8c020]), {seg:10});
    else if(t==='cork') k.cyl(x, y, z, 0.04, 0.05, 0xc89a60, {seg:6}); } }
function couch(k, x, z, ry, len, col){ const c2 = vc(col, 1.3);
  k.at(x, z, ry, ()=>{ k.box(0,0,0, len,0.42,1.0, col); k.box(0,0.42,-0.36, len,0.62,0.28, col); for(const sx of [-1,1]) k.box(sx*(len/2-0.14),0.42,0.04, 0.28,0.3,0.92, col);
    const n = Math.max(2, Math.round(len/1.4)), cw = (len-0.6)/n; for(let i=0;i<n;i++) k.box(-len/2+0.3+(i+0.5)*cw, 0.42, 0.08, cw-0.06, 0.13, 0.78, c2);
    k.box(sr2(-len/4,len/4), 0.55, -0.12, 0.42, 0.36, 0.12, spick([0xffc860, 0xff4fb8, 0x41e4ff, 0xf2f2f2]), {rx:-0.2, ry:sr2(-0.3,0.3)}); });
  const sw = Math.abs(Math.sin(ry)) > 0.7; solid(x, z, sw?1.0:len, sw?len:1.0); }
function lowTable(k, x, z, w=1.3, d=0.7){ k.box(x,0,z, w,0.34,d, 0x18121e); k.box(x,0.34,z, w+0.08,0.04,d+0.08, 0xc8a050);
  cup(k, x+sr2(-0.4,0.4), 0.38, z+sr2(-0.15,0.15), spick(CUPS)); cup(k, x+sr2(-0.4,0.4), 0.38, z+sr2(-0.15,0.15), spick(CUPS)); bottle(k, x+sr2(-0.3,0.3), 0.38, z, spick([0x2a6a2a, 0x8a5a1a]));
  k.cyl(x, 0.38, z+0.1, 0.035, 0.07, 0xffb340, {glow:true, seg:6}); solid(x, z, w, d, 0.5); }
function balloons(k, x, z, n){ const y0 = floorY(x, z); for(let i=0;i<n;i++){ const bx = x+sr2(-0.7,0.7), bz = z+sr2(-0.7,0.7), by = y0+sr2(2.0,3.0), col = spick([0xff4fb8,0x41e4ff,0xffd84a,0xb070ff,0xf4f4f4,0xff3b4a,0xc0c0d0]);
    k.ball(bx, by, bz, 0.3, col, {seg:10, sy:1.2}); k.seg(x, y0+0.12, z, bx, by-0.36, bz, 0.012, 0xdddddd); } k.box(x, y0, z, 0.3, 0.12, 0.3, 0x333340); }
function iceBucket(k, x, z){ k.cyl(x,0,z,0.2,0.04,0xc8a050); k.cyl(x,0,z,0.025,0.8,0xc8a050,{seg:6}); k.cyl(x,0.8,z,0.17,0.24,0xd8d8e0,{top:1.15,seg:12}); k.ball(x,1.02,z,0.12,0xe8f4ff,{seg:6,sy:0.4});
  k.put(kgeo('cyl:8:1'), x+0.04, 1.12, z, 0.05, 0.36, 0.05, spick([0x1a4a1a, 0x101010, 0xe8c040]), {rz:0.35}); solid(x, z, 0.45, 0.45, 0.4); }
function plant(k, x, z, s=1){ k.cyl(x,0,z,0.32*s,0.55*s,0x2a2228,{top:1.2,seg:10}); k.cyl(x,0.5*s,z,0.36*s,0.06,0xc8a050,{seg:10});
  for(let i=0;i<9;i++){ const a = i/9*6.283 + sr(), r = sr2(0.15,0.4)*s; k.ball(x+Math.cos(a)*r, sr2(0.8,1.5)*s, z+Math.sin(a)*r, sr2(0.22,0.34)*s, vc(0x2a7a3a, sr2(0.7,1.2)), {seg:6, sy:1.3}); } solid(x, z, 0.7*s, 0.7*s, 0.5); }
function palm(k, x, z){ k.cyl(x,0,z,0.42,0.7,0xc8a050,{top:1.25,seg:12}); k.cyl(x,0.68,z,0.5,0.05,0x1a1210,{seg:12});
  for(let i=0;i<6;i++) k.cyl(x+i*0.03, 0.7+i*0.42, z, 0.12-i*0.008, 0.42, vc(0x6a4a2a, i%2?0.8:1.0), {seg:7, top:0.85});
  for(let i=0;i<8;i++){ const a = i/8*6.283 + sr()*0.3, L = sr2(1.4,1.9); k.seg(x+0.15, 3.2, z, x+Math.cos(a)*L, 2.4+sr()*0.5, z+Math.sin(a)*L, 0.07, vc(0x2a8a3a, sr2(0.7,1.1))); k.seg(x+0.15, 3.2, z, x+Math.cos(a)*L*0.9, 2.65+sr()*0.4, z+Math.sin(a)*L*0.9, 0.22, vc(0x2a8a3a, sr2(0.6,1.0))); }
  solid(x, z, 0.9, 0.9, 0.55); }
function lamp(k, x, z){ k.cyl(x,0,z,0.18,0.3,0x26262c,{seg:8}); k.cyl(x,0,z,0.08,5.2,0x2a2a32,{seg:8}); k.box(x,5.0,z+0.55,0.1,0.1,1.2,0x2a2a32); k.box(x,4.78,z+1.1,0.5,0.22,0.36,0x2a2a32); k.box(x,4.74,z+1.1,0.4,0.04,0.28,0xffe2a8,{glow:true});
  gl(x, 4.55, z+1.1, 0xffd89a, 5, 0.55); solid(x, z, 0.4, 0.4, 0); }
function car(k, x, z, ry, col, kind){ const L = kind==='limo' ? 7.6 : 4.5, W = 1.95;
  k.at(x, z, ry, ()=>{ k.box(0,0.3,0, L,0.6,W, col); k.box(0,0.22,0, L+0.12,0.16,W+0.04, 0x16161a);
    const cl = kind==='limo' ? L-2.6 : 2.4, cx = kind==='limo' ? -0.4 : -0.3; k.box(cx,0.9,0, cl,0.52,W-0.2, 0x14243a); k.box(cx,1.42,0, cl-0.25,0.06,W-0.32, col);
    if(kind==='limo') for(const s of [-1,1]) for(let i=0;i<4;i++) k.box(cx-cl/2+0.6+i*1.2, 1.0, s*(W/2-0.09), 0.9, 0.3, 0.02, 0x2a4a6a);
    for(const wx of [-L/2+0.85, L/2-0.85]) for(const s of [-1,1]){ k.put(kgeo('cyl:12:1'), wx, 0.36, s*(W/2-0.12), 0.36, 0.26, 0.36, 0x101012, {rx:Math.PI/2}); k.put(kgeo('cyl:10:1'), wx, 0.36, s*(W/2-0.0), 0.2, 0.04, 0.2, 0xb8b8c0, {rx:Math.PI/2}); }
    for(const s of [-1,1]){ k.box(L/2+0.02, 0.48, s*0.62, 0.04, 0.16, 0.38, 0xfff4d0, {glow:true}); k.box(-L/2-0.02, 0.5, s*0.66, 0.04, 0.14, 0.3, 0xff2020, {glow:true}); }
    if(kind==='taxi'){ k.box(cx, 1.48, 0, 0.7, 0.22, 0.3, 0xffe680, {glow:true}); k.box(0, 0.55, W/2+0.01, L-1, 0.12, 0.02, 0x101010); } });
  gl(x+Math.cos(ry)*(L/2+0.6), 0.5, z-Math.sin(ry)*(L/2+0.6), 0xfff0c0, 2.4, 0.5); const sw = Math.abs(Math.sin(ry)) > 0.7; solid(x, z, sw?W:L, sw?L:W, 0.75); }
function cone(k, x, z){ k.box(x,0,z,0.42,0.05,0.42,0xff5a10); k.cyl(x,0.05,z,0.17,0.62,0xff6a1a,{top:0.15,seg:10}); k.cyl(x,0.3,z,0.12,0.12,0xf4f4f4,{top:0.8,seg:10}); }
function bin(k, x, z, col=0x1f3a2a){ k.cyl(x,0,z,0.32,0.95,col,{seg:12,top:1.08}); k.cyl(x,0.95,z,0.36,0.08,vc(col,0.8),{seg:12}); k.ball(x+0.1,1.05,z,0.14,0xd8202e,{seg:6}); solid(x, z, 0.65, 0.65, 0.5); }
function hydrant(k, x, z){ k.cyl(x,0,z,0.17,0.62,0xd02020,{seg:10}); k.ball(x,0.62,z,0.17,0xd02020,{seg:8,sy:0.8}); k.put(kgeo('cyl:8:1'), x, 0.45, z, 0.08, 0.5, 0.08, 0xd02020, {rz:Math.PI/2}); solid(x, z, 0.4, 0.4, 0.4); }
function coat(k, x, y, z, ry){ const col = spick([0x101012, 0x6a4a2a, 0x8a1a24, 0x1a2a4a, 0xc8b8a0, 0x2a2a2a, 0x4a1a4a, 0x7a7a80]); k.box(x, y-1.0, z, 0.5, 1.0, 0.1, col, {ry}); k.box(x, y-0.12, z, 0.2, 0.1, 0.06, 0x8a8a90, {ry}); }
function trussBar(k, x0, x1, y, z){ const h = 0.24, M = 0x9a9aa8; for(const [dy,dz] of [[-h,-h],[-h,h],[h,-h],[h,h]]) k.seg(x0,y+dy,z+dz, x1,y+dy,z+dz, 0.06, M, {round:true});
  const n = Math.round(Math.abs(x1-x0)/0.6); for(let i=0;i<n;i++){ const a = x0+i*(x1-x0)/n, b = x0+(i+1)*(x1-x0)/n; k.seg(a,y-h,z-h, b,y+h,z-h, 0.035, M); k.seg(a,y-h,z+h, b,y+h,z+h, 0.035, M); k.seg(a,y+h,z-h, b,y+h,z+h, 0.035, M); } }
function parCan(k, x, y, z, col, t=0.55){ k.seg(x, y, z, x, y-0.3, z, 0.04, 0x555560); k.put(kgeo('cyl:10:0.8'), x, y-0.5, z, 0.17, 0.42, 0.17, 0x141418, {rx:-t});
  const lx = x, ly = y-0.5-Math.cos(t)*0.22, lz = z+Math.sin(t)*0.22; k.put(kgeo('cyl:10:1'), lx, ly, lz, 0.15, 0.03, 0.15, col, {rx:-t, glow:true}); gl(lx, ly-0.05, lz+0.08, col, 1.8, 0.85); }
// an amp stack: two speaker cabs (grille fronts) and the head on top with its logo plate and power light
function amp(k, x, y, z, ry){ k.at(x, z, ry, ()=>{ const h = 0.75; for(const b of [0, h]){ k.box(0,b,0, 0.8,h,0.4, 0x141416); k.box(0,b+0.05,0.205, 0.7,h-0.1,0.01, 0x2a2a2e); }
  k.box(0,2*h,0, 0.8,0.3,0.4, 0x141416); k.box(0,2*h+0.11,0.205, 0.4,0.06,0.01, 0xd8d8d8); k.box(0.3,2*h+0.12,0.21, 0.05,0.04,0.01, 0xff3030, {glow:true}); }, y); }
function guitar(k, x, z, col){ k.box(x,0,z,0.4,0.05,0.3,0x1a1a1a); k.seg(x,0.05,z-0.1,x,0.55,z,0.03,0x1a1a1a);
  k.ball(x, 0.5, z+0.02, 0.22, col, {seg:10, sz:0.35, sy:1.25}); k.box(x, 0.75, z+0.02, 0.06, 0.62, 0.03, 0x3a2414, {rx:0.1}); k.box(x, 1.38, z+0.08, 0.09, 0.16, 0.03, 0x1a1a1a, {rx:0.1}); }
function mirrorDesk(k, x, z, ry){ k.at(x, z, ry, ()=>{ k.box(0,0,0, 1.8,0.78,0.65, 0x3a3238); k.box(0,0.78,0, 1.86,0.04,0.7, 0x8a8a90);
  k.box(0,1.0,-0.3, 1.3,1.0,0.04, 0x9ab0c0); for(let i=0;i<5;i++){ k.ball(-0.66+i*0.33, 2.03, -0.28, 0.05, 0xfff2c8, {glow:true}); } for(let i=0;i<3;i++){ k.ball(-0.69, 1.15+i*0.36, -0.28, 0.05, 0xfff2c8, {glow:true}); k.ball(0.69, 1.15+i*0.36, -0.28, 0.05, 0xfff2c8, {glow:true}); }
  for(let i=0;i<5;i++) k.cyl(sr2(-0.7,0.7), 0.82, sr2(-0.2,0.2), 0.03, sr2(0.06,0.16), spick([0xff4fb8, 0xd02a2a, 0xf2f2f2, 0x1a1a1a, 0xc8a050]), {seg:6});
  k.box(0,0,0.75, 0.5,0.45,0.5, 0x2a2228); k.box(0,0.45,0.98, 0.5,0.5,0.06, 0x2a2228); });
  gl(x+Math.sin(ry)*-0.2, 1.6, z+Math.cos(ry)*-0.2, 0xfff0c8, 2.6, 0.45); }
function clothesRack(k, x, z, len){ for(const s of [-1,1]){ k.cyl(x, 0, z+s*len/2, 0.03, 1.75, 0x9a9aa8, {seg:6}); k.box(x, 0, z+s*len/2, 0.5, 0.04, 0.06, 0x9a9aa8); } k.seg(x, 1.75, z-len/2, x, 1.75, z+len/2, 0.03, 0x9a9aa8, {round:true});
  for(let zz=z-len/2+0.2; zz<z+len/2-0.1; zz+=0.22) coat(k, x, 1.75, zz, sr2(-0.25,0.25)); solid(x, z, 0.6, len, 0.4); }
function spool(k, x, z){ for(const s of [-1,1]) k.put(kgeo('cyl:16:1'), x, 0.6, z+s*0.3, 0.6, 0.06, 0.6, 0x8a6a40, {rx:Math.PI/2}); k.put(kgeo('cyl:12:1'), x, 0.6, z, 0.38, 0.54, 0.38, spick([0x1a1a1a, 0xc85a1a, 0x2a4ac8]), {rx:Math.PI/2}); solid(x, z, 1.2, 0.7, 0.5); }
function lockers(k, x, z0, n){ for(let i=0;i<n;i++){ const z = z0 - i*0.6; k.box(x, 0, z, 0.55, 2.0, 0.58, vc(0x4a5a6a, sr2(0.85,1.1))); for(let j=0;j<4;j++) k.box(x+0.28, 1.4+j*0.08, z, 0.01, 0.03, 0.3, 0x2a3a4a); } solid(x, z0-(n-1)*0.3, 0.6, n*0.6, 0.4); }
function arcade(k, x, z, ry, col){ k.at(x, z, ry, ()=>{ k.box(0,0,0, 0.85,1.85,0.85, 0x16141e); k.box(0,1.05,0.3, 0.86,0.4,0.4, 0x22202a, {rx:0.6});
  k.box(0,1.25,0.28, 0.7,0.5,0.02, col, {glow:true, rx:-0.25}); k.box(0,1.78,0.43, 0.84,0.22,0.02, vc(col, 1.2), {glow:true}); k.box(0,0.97,0.5, 0.86,0.06,0.25, 0x2a2834);
  for(const bx of [-0.2,-0.05,0.1]) k.cyl(bx, 1.0, 0.52, 0.03, 0.03, spick([0xff3b3b, 0x41e4ff, 0xffe040]), {glow:true, seg:6}); k.box(-0.42,0,0, 0.02,1.85,0.85, vc(col,0.8), {glow:true}); k.box(0.42,0,0, 0.02,1.85,0.85, vc(col,0.8), {glow:true}); });
  gl(x+Math.sin(ry)*0.6, 1.3, z+Math.cos(ry)*0.6, col, 2.4, 0.4); solid(x, z, 0.9, 0.9, 0.5); }
function poolTable(k, x, z){ k.box(x,0,z, 1.5,0.75,2.7, 0x3a2414); k.box(x,0.75,z, 1.56,0.1,2.76, 0x4a2e18); k.box(x,0.85,z, 1.3,0.02,2.5, 0x1a6a3a);
  for(let i=0;i<9;i++) k.ball(x+sr2(-0.5,0.5), 0.92, z+sr2(-1,1), 0.06, spick([0xffd020, 0x2a4ad0, 0xd02a2a, 0x6a2ad0, 0xff7a1a, 0x1a8a3a, 0x8a1a1a, 0x101010, 0xf8f8f8]), {seg:6});
  k.seg(x+0.6, 0.95, z-0.6, x-0.2, 0.98, z+1.0, 0.025, 0xc8a070, {round:true}); k.box(x, 2.4, z, 0.5, 0.12, 1.6, 0x1a3a2a); k.box(x, 2.38, z, 0.4, 0.02, 1.5, 0xf4ffe0, {glow:true}); k.seg(x, 2.52, z, x, 5, z, 0.02, 0x333333);
  solid(x, z, 1.5, 2.7, 0.6); }
function keg(k, x, y, z){ k.cyl(x, y, z, 0.28, 0.6, 0xb8bcc4, {seg:12}); k.ring(x, y+0.12, z, 0.285, 0.02, 0x8a8e96, {seg:12}); k.ring(x, y+0.48, z, 0.285, 0.02, 0x8a8e96, {seg:12}); }
function crate(k, x, y, z, col){ k.box(x, y, z, 0.55, 0.3, 0.38, col); for(let i=0;i<4;i++) for(let j=0;j<3;j++) k.cyl(x-0.2+i*0.13, y+0.3, z-0.12+j*0.12, 0.025, 0.06, 0x2a4a1a, {seg:5}); }
function champagneTower(k, x, z){ k.cyl(x,0,z,0.75,0.95,0x1a1218,{seg:16}); k.cyl(x,0.95,z,0.8,0.03,0x2a1a24,{seg:16}); k.ring(x,0.97,z,0.8,0.03,0xc8a050,{seg:20});
  for(let lv=0; lv<4; lv++){ const n = [10,6,3,1][lv], r = [0.55,0.38,0.2,0][lv]; for(let i=0;i<n;i++){ const a = i/n*6.283; k.cyl(x+Math.cos(a)*r, 0.98+lv*0.17, z+Math.sin(a)*r, 0.07, 0.15, 0xffe8a0, {seg:6, top:1.4, glow:true}); } }
  gl(x, 1.4, z, 0xffe0a0, 2.2, 0.4); solid(x, z, 1.5, 1.5, 0.5); }
function chandelier(k, x, y, z){ k.ring(x, y, z, 0.9, 0.04, 0xc8a050, {seg:20}); k.ring(x, y+0.35, z, 0.5, 0.035, 0xc8a050, {seg:16}); k.seg(x, y+0.35, z, x, y+3, z, 0.03, 0x8a7040);
  for(let i=0;i<14;i++){ const a = i/14*6.283; k.ball(x+Math.cos(a)*0.9, y-0.14, z+Math.sin(a)*0.9, 0.07, 0xfff4e0, {seg:4, sy:1.6, glow:true}); } gl(x, y, z, 0xffe8b0, 4.5, 0.55); }
function wallSign(text, col, x, y, z, ry, w, font='900'){ WSIGN.push({text, col, x, y, z, ry, w, font}); }

// ======================= THE ROOMS =======================
function entrance(k){
  // the street: a curb, the closed-off far side (jersey barriers + cones + a sawhorse), parked cars, street lamps, bins, a hot-dog cart
  k.box(0, 0, 33.8, 60, 0.14, 0.42, 0x8a8478);
  for(let x=-28.5, i=0; x<=28.6; x+=3.05, i++) k.at(x, 49.35, 0, ()=>{ k.box(0,0,0, 2.95,0.22,0.78, 0xb8b2a6); k.box(0,0.22,0, 2.95,0.6,0.42, 0xc8c2b6); k.box(0,0.55,0.215, 2.7,0.1,0.02, i%2 ? 0xff3030 : 0xf4f4f4, {glow:true}); });
  for(const [x,z] of [[-26,44],[-24.5,45.6],[-22.8,44.2],[19,47],[20.6,46]]) cone(k, x, z);
  k.at(-24, 41.5, 0.2, ()=>{ for(const s of [-1,1]) k.seg(s*0.9, 0, -0.3, s*0.9, 1.0, 0, 0.06, 0xd8d8d8), k.seg(s*0.9, 0, 0.3, s*0.9, 1.0, 0, 0.06, 0xd8d8d8); k.box(0, 0.85, 0, 2.2, 0.25, 0.06, 0xff6a1a, {glow:true}); for(let i=0;i<4;i++) k.box(-0.8+i*0.55, 0.85, 0.035, 0.18, 0.25, 0.01, 0xf4f4f4); }); solid(-24, 41.5, 2.2, 0.8);
  car(k, 13.6, 35.6, 0, 0x0c0c10, 'limo'); car(k, -13.5, 35.5, Math.PI, 0xe8c020, 'taxi'); car(k, -23.6, 35.6, Math.PI, 0x5a1a24); car(k, 24.4, 35.6, 0, 0x2a3a5a);
  for(const x of [-22, -10, 10, 22]) lamp(k, x, 32.6);
  bin(k, -16.8, 32.8); bin(k, 17.2, 32.8); hydrant(k, -6.6, 32.9);
  k.box(6.8, 0, 32.9, 0.55, 1.15, 0.5, 0x1a4aa0); k.box(6.8, 0.7, 33.16, 0.4, 0.3, 0.02, 0xf2f2e8); solid(6.8, 32.9, 0.6, 0.6, 0.4);   // a newspaper box
  // the hot-dog cart (umbrella and all)
  k.at(-17, 25.5, 0, ()=>{ k.box(0,0.25,0, 2.0,0.85,1.0, 0xd8d8e0); k.box(0,1.1,0, 2.05,0.06,1.05, 0x9a9aa8); for(const s of [-1,1]) k.put(kgeo('cyl:12:1'), s*0.6, 0.25, 0.52, 0.25, 0.06, 0.25, 0x16161a, {rx:Math.PI/2});
    k.seg(0,1.1,0, 0,2.5,0, 0.04, 0x8a8a90); k.put(kgeo('cyl:12:0.05'), 0, 2.55, 0, 1.3, 0.45, 1.3, 0xd83030, {}); k.box(0,0.55,0.51, 1.6,0.32,0.02, 0xffe060, {glow:true}); k.cyl(-0.5,1.16,0, 0.3, 0.08, 0x8a8a90); }); solid(-17, 25.5, 2.1, 1.1);
  // dumpster and bags down the side of the building
  k.box(-28.4, 0.15, 22.5, 1.9, 1.3, 3.2, 0x1f4a2a); k.box(-28.4, 1.45, 22.5, 2.0, 0.1, 3.3, 0x173a20, {rz:0.08}); solid(-28.4, 22.5, 1.9, 3.2);
  for(let i=0;i<6;i++) k.ball(-27+sr2(-0.6,0.6), 0.35, 19.6+sr2(-1,1), sr2(0.35,0.5), 0x111116, {seg:7, sy:0.75});
  // the club front: a lit header over the door, the door frame in neon
  k.box(0, 3.3, 14.5, 12.6, 0.07, 0.06, 0xff4fb8, {glow:true}); for(let x=-5; x<=5; x+=2.5) k.ball(x, 3.15, 14.55, 0.09, 0xfff2d0, {glow:true});   // a lit header over the door (no canopy: it hid the doorway)
  for(const s of [-1,1]) k.box(s*6.05, 0, 14.42, 0.08, 3.6, 0.06, s<0 ? 0x41e4ff : 0xff4fb8, {glow:true});
  gl(0, 2.6, 15.6, 0xff6ad0, 7, 0.4);
  // LOBBY: coat check on the left (counter along the room, two racks of coats against the wall), tickets on the right,
  // a step-and-repeat photo wall on the dance-floor wall, plants by the doors, a chandelier
  k.box(-20, 0, 7, 1.0, 1.1, 9, 0x2a1a14); k.box(-20, 1.1, 7, 1.2, 0.07, 9.2, 0xc8a050); k.box(-19.48, 0.15, 7, 0.02, 0.06, 8.8, 0xffc860, {glow:true}); solid(-20, 7, 1.0, 9);
  for(let z=3; z<11.5; z+=0.9) k.cyl(-19.8, 1.17, z+sr2(-0.2,0.2), 0.03, 0.01, 0xf4e8c0, {seg:6});
  for(const rx of [-28.6, -26.2]){ k.seg(rx, 1.95, 2.4, rx, 1.95, 11.6, 0.04, 0x9a9aa8, {round:true}); k.cyl(rx, 0, 2.4, 0.03, 1.95, 0x9a9aa8, {seg:6}); k.cyl(rx, 0, 11.6, 0.03, 1.95, 0x9a9aa8, {seg:6});
    for(let z=2.7; z<11.4; z+=0.24) coat(k, rx, 1.95, z, sr2(-0.25,0.25)); }
  wallSign('COAT CHECK', 0xffc860, -29.5, 3.4, 7, Math.PI/2, 6);
  k.box(22, 0, 9.2, 1.0, 1.15, 6.4, 0x1a1420); k.box(22, 1.15, 9.2, 1.2, 0.07, 6.6, 0xc8a050); k.box(22.3, 1.22, 8.2, 0.05, 0.35, 0.5, 0x41e4ff, {glow:true, ry:0.3}); solid(22, 9.2, 1.0, 6.4);
  wallSign('TICKETS', 0x41e4ff, 29.5, 3.2, 9, -Math.PI/2, 5);
  wallSign('PAC · PAC · PAC', 0xb8b0ff, 19.5, 2.2, 0.58, 0, 8, '700');
  k.box(19.5, 0, 0.5, 14, 3.4, 0.08, 0x101018); k.ring(13.6, 1.7, 2.2, 0.55, 0.05, 0xfff4e0, {rx:0, glow:true, seg:24}); k.cyl(13.6, 0, 2.2, 0.03, 1.15, 0x2a2a2e, {seg:6});
  for(const [x,z] of [[-7.4,12.8],[7.4,12.8],[-12.6,1.2],[12.6,1.4]]) plant(k, x, z, 1.1);
  chandelier(k, 0, 4.6, 7);
  litter(k, -29, 14.5, 29, 49, 70*DQ, ['cup','can','cup','napkin','bottle']); litter(k, -28, 0.8, 28, 13, 14*DQ, ['cup','napkin']);
}
function dance(k){
  // the pit: four lit steps down on every side, a dark rim
  const {x0,x1,z0,z1,d} = PIT, sc = [0xff4fb8, 0x41e4ff];
  k.box(0, -d, z1+0.06, x1-x0+0.24, d-0.005, 0.12, 0x1a1420); k.box(0, -d, z0-0.06, x1-x0+0.24, d-0.005, 0.12, 0x1a1420);
  k.box(x0-0.06, -d, (z0+z1)/2, 0.12, d-0.005, z1-z0, 0x1a1420); k.box(x1+0.06, -d, (z0+z1)/2, 0.12, d-0.005, z1-z0, 0x1a1420);
  for(let s=0;s<4;s++){ const a = s*0.4, b = (s+1)*0.4, top = -d*(s+1)/5, h = top + d, col = s%2 ? 0x241c30 : 0x2c2238;
    k.box(0, -d, z1-(a+b)/2, (x1-x0)-2*a, h, b-a, col); k.box(0, -d, z0+(a+b)/2, (x1-x0)-2*a, h, b-a, col);
    k.box(x0+(a+b)/2, -d, (z0+z1)/2, b-a, h, (z1-z0)-2*b, col); k.box(x1-(a+b)/2, -d, (z0+z1)/2, b-a, h, (z1-z0)-2*b, col);
    const c = sc[s%2], W = (x1-x0)-2*a, D = (z1-z0)-2*a, y = top-0.004;
    k.box(0, y, z1-a-0.04, W, 0.02, 0.05, c, {glow:true}); k.box(0, y, z0+a+0.04, W, 0.02, 0.05, c, {glow:true});
    k.box(x0+a+0.04, y, (z0+z1)/2, 0.05, 0.02, D, c, {glow:true}); k.box(x1-a-0.04, y, (z0+z1)/2, 0.05, 0.02, D, c, {glow:true}); }
  // chrome rails between the pit and the lounges (glass panel, LED strip under the top rail)
  for(const x of [-17, 17]) for(const [za,zb] of [[-18,-46],[-62,-90]]){ const n = Math.round((za-zb)/1.4);
    for(let i=0;i<=n;i++) k.cyl(x, 0, za-(za-zb)*i/n, 0.05, 1.05, 0xb8b8c8, {seg:6});
    k.seg(x,1.06,za, x,1.06,zb, 0.09, 0xe0e0ea, {round:true}); k.seg(x,0.5,za, x,0.5,zb, 0.04, 0x9898a8, {round:true}); k.box(x, 0.98, (za+zb)/2, 0.05, 0.03, za-zb, 0xff4fb8, {glow:true});
    k.box(x, 0.12, (za+zb)/2, 0.03, 0.8, za-zb-0.2, 0x1c2c48); }
  // the lounges: couches against the walls, low tables, balloons, champagne, plants
  for(const s of [-1,1]){ for(const z of [-24, -36, -70, -82]){ couch(k, s*28.6, z, s<0 ? Math.PI/2 : -Math.PI/2, 4.2, spick([0x6a1a4a, 0x1a3a6a, 0x5a1a6a, 0x7a2a1a])); lowTable(k, s*26.3, z, 0.7, 1.4); }
    balloons(k, s*24.2, -30, 8); balloons(k, s*24.2, -77, 8); iceBucket(k, s*25.8, -29.6); iceBucket(k, s*25.8, -75.8); plant(k, s*28.6, -46, 1.2); plant(k, s*28.6, -62, 1.2); }
  // the DJ riser: steps of light on its front, confetti cannons on its corners, a truss arch with lights over it
  k.box(0, 0, -102.5, 14, 1.0, 11, 0x1c1626); k.box(0, 0.92, -96.98, 14, 0.05, 0.05, 0x41e4ff, {glow:true}); k.box(0, 0.08, -96.98, 14, 0.05, 0.05, 0xff4fb8, {glow:true});
  for(let i=0;i<7;i++) k.box(-6+i*2, 0.3, -96.98, 1.2, 0.3, 0.02, i%2 ? 0xff4fb8 : 0x41e4ff, {glow:true}); solid(0, -102.5, 14, 11);
  for(const s of [-1,1]){ k.put(kgeo('cyl:10:1'), s*6.3, 1.4, -97.8, 0.18, 0.9, 0.18, 0x26262c, {rx:0.5, rz:-s*0.3}); FLICK.push([s*6.5, 1.9, -97.4, 0xffffff]); }
  trussBar(k, -7.6, 7.6, 7.0, -107); for(let i=0;i<7;i++) parCan(k, -6+i*2, 6.75, -107, spick([0xff4fb8, 0x41e4ff, 0xb070ff, 0xffffff]), 0.7);
  litter(k, x0+1.8, z0+1.8, x1-1.8, z1-1.8, 150*DQ, ['cup','cup','can','glow','glow','bottle','napkin']);
  litter(k, -29, -94, -17.6, -12, 40*DQ, ['cup','bottle','can','napkin']); litter(k, 17.6, -94, 29, -12, 40*DQ, ['cup','bottle','can','napkin']); litter(k, -29, -11, 29, -1, 25*DQ, ['cup','can']);
  wallSign('DANCE', 0xff4fb8, -29.5, 3.6, -54, Math.PI/2, 9); wallSign('DANCE', 0x41e4ff, 29.5, 3.6, -54, -Math.PI/2, 9);
}
function bar(k){
  // pendant lamps over the long bar, beer taps on it, a back cabinet of glowing fridges, kegs and crates at the end
  for(let z=-124; z>=-184; z-=6){ k.seg(-25.6, 5, z, -25.6, 3.3, z, 0.02, 0x333333); k.cyl(-25.6, 3.0, z, 0.3, 0.32, 0xc8a050, {top:0.25, seg:10}); gl(-25.6, 2.9, z, 0xffc070, 3.2, 0.6);
    for(let i=0;i<4;i++) k.cyl(-26.0, 1.25, z-1.2+i*0.25, 0.025, 0.36, spick([0xd02a2a, 0x2a8a3a, 0xf2f2f2, 0x1a1a1a]), {seg:6}); }
  k.box(-29.2, 0, -154, 0.7, 0.95, 62, 0x1e1418); for(let z=-123; z>=-185; z-=2.2) k.box(-28.84, 0.1, z, 0.02, 0.75, 1.8, 0x9adcff, {glow:true});
  for(let i=0;i<9;i++) keg(k, -28.6+(i%3)*0.62, i<6 ? 0 : 0.6, -189.4 - Math.floor(i/3)%2*0.62);
  for(let i=0;i<12;i++) crate(k, -26.2+(i%2)*0.6, Math.floor(i/4)*0.3, -192 - (i%4)*0.45, spick([0xc82a2a, 0x2a5ac8, 0xe8c020]));
  for(let i=0;i<6;i++) keg(k, -28.6+(i%3)*0.62, 0, -194.5 - Math.floor(i/3)*0.62); solid(-27, -192.5, 4.6, 8.6);
  // the island bar: a ring of hanging glasses above it
  k.ring(0, 3.4, -152, 2.4, 0.06, 0xc8a050, {seg:24}); for(let i=0;i<18;i++){ const a = i/18*6.283; k.cyl(Math.cos(a)*2.4, 3.05, -152+Math.sin(a)*2.4, 0.06, 0.22, 0xd8f0ff, {seg:6, top:1.4, glow:true}); } gl(0, 3.2, -152, 0xffc070, 7, 0.4);
  for(const s of [-1,1]) k.seg(s*2.4, 3.4, -152, s*2.4, 6, -152, 0.02, 0x333333);
  // a wet-floor sign and a mop by a spill, crates of empties near the island
  k.at(-14, -158, 0.4, ()=>{ k.seg(-0.25,0,-0.18, 0,0.62,0, 0.05, 0xffd020); k.seg(0.25,0,-0.18, 0,0.62,0, 0.05, 0xffd020); k.seg(-0.25,0,0.18, 0,0.62,0, 0.05, 0xffd020); k.seg(0.25,0,0.18, 0,0.62,0, 0.05, 0xffd020); k.box(0,0.25,0.12, 0.38,0.3,0.02, 0x1a1a1a, {rx:-0.3}); });
  k.cyl(-12.6, 0, -159, 0.25, 0.32, 0xe8c020, {seg:10}); k.seg(-12.6, 0.3, -159, -12.3, 1.6, -158.6, 0.03, 0xc8a070);
  // the GAME ROOM behind the right wall: two pool tables, a row of arcade cabinets, a jukebox, a couch, dartboards
  poolTable(k, 23.5, -126); poolTable(k, 23.5, -160);
  for(let i=0;i<6;i++) arcade(k, 28.9, -178-i*1.05, -Math.PI/2, spick([0x41e4ff, 0xff4fb8, 0x7cff4f, 0xffb340, 0xb070ff]));
  k.at(28.9, -140.5, -Math.PI/2, ()=>{ k.box(0,0,0, 1.1,1.4,0.7, 0x3a1a10); k.cyl(0,1.4,0, 0.55,0.01,0x3a1a10,{seg:12}); k.box(0,1.4,0, 1.1,0.01,0.7,0x3a1a10); k.ball(0,1.4,0, 0.55, 0x3a1a10, {seg:12, sz:0.64});
    k.box(0,0.25,0.36, 0.9,0.08,0.02, 0xff4fb8, {glow:true}); k.box(0,0.6,0.36, 0.7,0.4,0.02, 0xffc860, {glow:true}); k.box(-0.5,0.3,0.36, 0.04,1.1,0.02, 0x41e4ff, {glow:true}); k.box(0.5,0.3,0.36, 0.04,1.1,0.02, 0x41e4ff, {glow:true}); });
  solid(28.9, -140.5, 0.8, 1.2); gl(28.2, 1.0, -140.5, 0xffa0d0, 3, 0.5);
  couch(k, 28.6, -152, -Math.PI/2, 4.0, 0x2a1a4a); wallSign('◎', 0xff3b3b, 29.5, 2.4, -168, -Math.PI/2, 1.6); wallSign('◎', 0x41e4ff, 29.5, 2.4, -170.4, -Math.PI/2, 1.6);
  wallSign('COCKTAILS', 0xffb340, -29.5, 4.5, -142, Math.PI/2, 9); wallSign('GAME ROOM', 0x7cff4f, 29.5, 4.3, -184, -Math.PI/2, 8); wallSign('SHOTS', 0xff4fb8, -29.5, 4.5, -168, Math.PI/2, 6);
  litter(k, -24.6, -199, 16.4, -111, 120*DQ, ['cup','bottle','bottle','can','napkin','cup']); litter(k, 17.6, -199, 29.4, -111, 30*DQ, ['cup','can','bottle']);
}
function vip(k){
  for(const s of [-1,1]){ for(const z of [-219.6, -239.6, -259.6, -279.6]) iceBucket(k, s*23.6, z); for(const z of [-225, -245, -265]) palm(k, s*28.4, z);
    for(const z of [-205, -288]){ k.cyl(s*28.8, 0, z, 0.2, 0.05, 0xc8a050); k.cyl(s*28.8, 0, z, 0.03, 2.1, 0xc8a050, {seg:6}); k.cyl(s*28.8, 2.1, z, 0.3, 0.4, 0xf4e8d0, {top:0.6, seg:10, glow:true}); gl(s*28.8, 2.2, z, 0xffd8a0, 3.4, 0.5); }
    k.cyl(s*10.5, 0, -219, 0.5, 1.0, 0x1a1218, {seg:12}); k.ball(s*10.5, 1.4, -219, 0.4, 0xd8b050, {seg:10}); k.ball(s*10.5, 2.0, -219, 0.28, 0xd8b050, {seg:10}); k.ball(s*10.5, 2.4, -219, 0.18, 0xd8b050, {seg:8}); solid(s*10.5, -219, 1.0, 1.0); }
  champagneTower(k, 0, -232.6); champagneTower(k, 0, -268);
  chandelier(k, -14, 4.6, -245); chandelier(k, 14, 4.6, -245); chandelier(k, 0, 4.8, -262);
  // the VIP's own little bar at the back, and a white grand piano
  k.box(24.2, 0, -285.6, 8.6, 1.1, 0.9, 0x1a0e18); k.box(24.2, 1.1, -285.6, 8.8, 0.07, 1.1, 0xc8a050); k.box(24.2, 0.1, -285.13, 8.4, 0.05, 0.02, 0xb070ff, {glow:true}); solid(24.2, -285.6, 8.6, 0.9);
  for(let i=0;i<14;i++) bottle(k, 20.4+i*0.55, 1.17, -285.8, spick([0x2a6a2a, 0xe8c040, 0x101010, 0xd8d8e8]));
  k.at(-24, -284.6, 0.3, ()=>{ k.box(0,0.62,0, 2.6,0.36,1.6, 0xf2f0ec); k.box(0.9,0.62,0.2, 1.0,0.36,1.0, 0xf2f0ec); k.box(-0.1,1.2,-0.3, 2.4,0.04,1.4, 0xf2f0ec, {rx:-0.6});
    for(const [lx,lz] of [[-1.1,-0.6],[-1.1,0.6],[1.1,0]]) k.cyl(lx,0,lz, 0.07,0.62, 0xe8e6e0, {seg:6}); k.box(-0.5,0.85,0.82, 1.4,0.06,0.25, 0xf8f8f8); k.box(-0.5,0.0,1.3, 0.9,0.5,0.4, 0x1a1a1a); });
  solid(-24, -284.6, 3.2, 2.2);
  wallSign('VIP', 0xffc860, -29.5, 4.2, -235, Math.PI/2, 5); wallSign('VIP', 0xffc860, 29.5, 4.2, -255, -Math.PI/2, 5); wallSign('STAFF ONLY', 0xff3b4a, 0, 3.0, -289.55, 0, 6);
  litter(k, -24, -288, 24, -202, 60*DQ, ['cork','cork','napkin','cup','bottle']);
}
function backstage(k){
  // dressing room on the left: mirror desks with bulbs, racks of costumes, lockers, a couch, catering
  for(const z of [-300, -305, -310, -315, -320, -325]) mirrorDesk(k, -28.9, z, Math.PI/2);
  for(const z of [-300, -305, -310, -315, -320, -325]) solid(-28.9, z, 0.7, 1.8, 0.4);
  for(const z of [-304.5, -319.5, -334.5]) clothesRack(k, -21.5, z, 3.2);
  lockers(k, -29.2, -330, 12); couch(k, -10.9, -322, -Math.PI/2, 4.0, 0x3a3a48);
  k.at(-20, -352, 0, ()=>{ k.box(0,0,0, 3.2,0.78,1.0, 0xf4f4f0); k.box(0,0.78,0, 3.3,0.03,1.1, 0xf8f8f8);
    for(let i=0;i<5;i++) k.cyl(-1.3+i*0.65, 0.81, 0, 0.26, 0.04, spick([0xd8a040, 0xd84a3a, 0x7ac84a, 0xf4e8c8]), {seg:12}); for(let i=0;i<8;i++) bottle(k, -1.4+i*0.4, 0.81, -0.38, 0x9ad0f0); });
  solid(-20, -352, 3.2, 1.0);
  k.box(-29.1, 0, -341.4, 0.55, 1.3, 0.55, 0xf2f2f2); k.cyl(-29.1, 1.3, -341.4, 0.17, 0.48, 0x7ab8f0, {seg:10}); k.box(-29.0, 0, -344.8, 0.75, 1.9, 0.75, 0xc8c8cc); solid(-29.1, -343.1, 0.8, 4.0);
  // the middle lane: cable spools, a ladder, gear carts
  spool(k, -6, -312); spool(k, 5, -325); spool(k, -4, -358);
  k.at(7.5, -301, 0.3, ()=>{ for(const s of [-1,1]){ k.seg(s*0.4,0,-0.6, s*0.25,2.6,0, 0.05, 0xd8d8e0); k.seg(s*0.4,0,0.6, s*0.25,2.6,0, 0.05, 0xd8d8e0); } for(let i=1;i<6;i++){ const y = i*0.42; k.seg(-0.38+i*0.025,y,-0.6+y*0.23, 0.38-i*0.025,y,-0.6+y*0.23, 0.04, 0xd8d8e0); } k.box(0,2.6,0, 0.6,0.06,0.3, 0xd8d8e0); });
  solid(7.5, -301, 1.0, 1.4);
  for(const [x,z] of [[-7.5,-347],[6.5,-318]]){ k.box(x,0.2,z, 1.4,0.06,0.8, 0x6a6a72); for(const sx of [-0.6,0.6]) for(const sz of [-0.3,0.3]) k.cyl(x+sx,0,z+sz,0.08,0.18,0x1a1a1a,{seg:6});
    for(let i=0;i<4;i++) k.box(x+sr2(-0.4,0.4), 0.26+i*0.32, z+sr2(-0.15,0.15), sr2(0.5,0.8), 0.3, sr2(0.4,0.6), spick([0x1a1a1e, 0x2a2a30, 0x8a6a40]), {ry:sr2(-0.3,0.3)}); solid(x, z, 1.4, 0.8); }
  // the band's corner on the right: amp stacks, guitars on stands, drum cases, pallets of boxes
  for(const z of [-297, -300, -303, -306]) amp(k, 28.8, 0, z, -Math.PI/2);
  for(const [z,c] of [[-299.6,0xd02a2a],[-301.2,0xf2f2f2],[-302.8,0x2a2a2a],[-304.4,0xe8a020]]) guitar(k, 25.6, z, c);
  solid(28.8, -301.5, 0.6, 10.4, 0.3);
  for(const [x,z,r] of [[13.6,-296.4,0.55],[14.9,-298.2,0.45],[13.4,-298.8,0.4]]){ k.cyl(x,0,z,r,0.5,0x1a1a1e,{seg:14}); k.cyl(x,0.5,z,r*0.85,0.4,0x1a1a1e,{seg:14}); solid(x, z, r*2, r*2, 0.4); }
  for(const [x,z] of [[22,-350],[26,-356]]){ k.box(x,0,z, 1.4,0.15,1.2, 0x8a6a40); for(let i=0;i<6;i++) k.box(x-0.35+(i%2)*0.7, 0.15+Math.floor(i/2)*0.42, z, 0.62, 0.4, 1.0, vc(0x9a7a50, sr2(0.85,1.1))); solid(x, z, 1.4, 1.2); }
  // pipes and fluorescent tubes run along the walls (painted), plus a couple of hazard beacons
  for(const [x,z] of [[-9.6,-298],[9.6,-312]]){ k.cyl(x,3.7,z,0.12,0.2,0xff8a10,{glow:true,seg:8}); FLICK.push([x, 3.8, z, 0xff8a10]); }
  wallSign('QUIET — SHOW ON', 0xff3b4a, -29.5, 3.5, -335, Math.PI/2, 9); wallSign('STAGE ▶', 0xf4f4f4, 29.5, 3.5, -340, -Math.PI/2, 6); wallSign('LOAD IN', 0xffb340, 29.5, 3.5, -320, -Math.PI/2, 6);
  litter(k, -28, -368, 28, -292, 70*DQ, ['roll','cup','bottle','can','napkin','roll']);
}
function stage(k){
  // the crowd barrier in front of the stage
  for(let x=-21; x<=21; x+=2){ k.box(x, 0, -437, 1.9, 0.06, 0.9, 0x6a6a72); k.box(x, 0, -437.25, 1.9, 1.1, 0.06, 0x9a9aa8); for(let i=0;i<5;i++) k.box(x-0.8+i*0.4, 0.15, -437.25, 0.04, 0.85, 0.08, 0x8a8a92); }
  solid(0, -437.1, 44, 0.6);
  // on the stage (1.3 m up): a drum riser and kit, amp walls, mics, wedges, a keyboard, pyro along the front
  const Y = 1.3; k.box(0, Y, -446.6, 5, 0.5, 3.6, 0x1a1a20); k.box(0, Y+0.48, -444.78, 5, 0.04, 0.04, 0xff3b4a, {glow:true});
  const DY = Y+0.5; k.put(kgeo('cyl:16:1'), 0, DY+0.45, -446.4, 0.45, 0.42, 0.45, 0xf2f2f2, {rx:Math.PI/2}); k.put(kgeo('cyl:16:1'), 0, DY+0.45, -446.18, 0.38, 0.02, 0.38, 0xd02a2a, {rx:Math.PI/2});
  for(const [x,z,r,y] of [[-0.5,-446.6,0.2,1.0],[0.5,-446.6,0.2,1.0],[-0.95,-446.0,0.24,0.62],[0.95,-446.2,0.26,0.5]]) k.cyl(x, DY+y-0.15, z, r, 0.28, 0xf2f2f2, {seg:12});
  for(const [x,z,y] of [[-1.3,-446.6,1.25],[1.3,-446.8,1.35],[-0.9,-447.2,1.45]]){ k.cyl(x, DY, z, 0.02, y, 0x9a9aa8, {seg:5}); k.cyl(x, DY+y, z, 0.38, 0.02, 0xd8b040, {seg:14}); }
  k.cyl(0, DY, -447.4, 0.22, 0.55, 0x1a1a1a, {seg:10});
  for(const s of [-1,1]){ amp(k, s*9.6, Y, -447.9, 0); amp(k, s*10.4, Y, -447.9, 0); amp(k, s*11.2, Y, -447.9, 0); }
  for(const x of [-16,-6,6,16]){ k.cyl(x, Y, -441.9, 0.22, 0.04, 0x1a1a1a, {seg:10}); k.cyl(x, Y, -441.9, 0.018, 1.5, 0x2a2a2e, {seg:5}); k.ball(x, Y+1.55, -441.75, 0.06, 0x3a3a40, {seg:6});
    k.at(x, -440.5, 0, ()=>{ k.box(0,0,0, 0.9,0.42,0.5, 0x141416, {rx:-0.35}); }, Y); }
  k.at(11.6, -444.4, 0, ()=>{ k.seg(-0.5,0,-0.3, 0.5,0.85,0.3, 0.04, 0x2a2a2e); k.seg(0.5,0,-0.3, -0.5,0.85,0.3, 0.04, 0x2a2a2e); k.box(0,0.88,0, 1.3,0.08,0.36, 0x1a1a1e); k.box(0,0.96,0.04, 1.2,0.01,0.18, 0xf4f4f4); }, Y);
  for(const x of [-22, -12.5, 12.5, 22]){ k.box(x, Y, -440.6, 0.6, 0.35, 0.6, 0x1a1a20); k.box(x, Y+0.35, -440.6, 0.3, 0.05, 0.3, 0xff7a20, {glow:true}); FLICK.push([x, Y+0.9, -440.6, 0xff8a30]); }
  // the lighting rig across the back trusses: par cans down its length, moving heads on top, blinders on the towers
  trussBar(k, -28, 28, 7.4, -436); for(let x=-25; x<=25; x+=2.5) parCan(k, x, 7.15, -436, spick([0xff3b4a, 0xffb340, 0xffffff, 0xff4fb8, 0x41e4ff]), 0.45);
  for(let x=-22; x<=22; x+=7.3){ k.box(x, 7.66, -436, 0.5, 0.25, 0.35, 0x141418); k.ball(x, 8.05, -436, 0.25, 0x1a1a20, {seg:8}); k.cyl(x, 7.95, -435.78, 0.16, 0.03, 0xf4f4ff, {glow:true, seg:10}); }
  for(const s of [-1,1]) for(let i=0;i<3;i++){ k.box(s*27.3, 4.6+i*0.6, -435.5, 0.5, 0.45, 0.2, 0x141418); k.box(s*27.3, 4.65+i*0.6, -435.39, 0.36, 0.34, 0.02, 0xfff0c8, {glow:true}); }
  litter(k, -27, -436, 27, -372, 120*DQ, ['cup','cup','can','glow','glow','bottle','napkin']);
}

// ======================= PAINTED FLOORS =======================
const box = (g, x0, z0, x1, z1, f)=>{ g.fillStyle = f; g.fillRect(x0, z0, x1-x0, z1-z0); };
const disc = (g, x, z, r, f)=>{ g.fillStyle = f; g.beginPath(); g.arc(x, z, r, 0, 6.2832); g.fill(); };
const line = (g, x0, z0, x1, z1, w, s)=>{ g.strokeStyle = s; g.lineWidth = w; g.beginPath(); g.moveTo(x0, z0); g.lineTo(x1, z1); g.stroke(); };
function speck(g, x0, z0, x1, z1, n, cols, s0, s1){ for(let i=0;i<n;i++){ g.fillStyle = spick(cols); const s = sr2(s0, s1); g.fillRect(sr2(x0,x1), sr2(z0,z1), s, s); } }
function blotch(g, x0, z0, x1, z1, n, col, a, r0, r1){ for(let i=0;i<n;i++){ const x = sr2(x0,x1), z = sr2(z0,z1), r = sr2(r0,r1), gr = g.createRadialGradient(x,z,0,x,z,r); gr.addColorStop(0, rgba(col,a)); gr.addColorStop(1, rgba(col,0)); g.fillStyle = gr; g.fillRect(x-r, z-r, 2*r, 2*r); } }
function light(g, x, z, r, col, a){ g.globalCompositeOperation = 'lighter'; const gr = g.createRadialGradient(x,z,0,x,z,r); gr.addColorStop(0, rgba(col,a)); gr.addColorStop(0.45, rgba(col,a*0.4)); gr.addColorStop(1, rgba(col,0)); g.fillStyle = gr; g.fillRect(x-r, z-r, 2*r, 2*r); g.globalCompositeOperation = 'source-over'; }
function cracks(g, x0, z0, x1, z1, n, col='rgba(0,0,0,0.5)'){ g.strokeStyle = col; for(let i=0;i<n;i++){ let x = sr2(x0,x1), z = sr2(z0,z1), a = sr()*6.3; g.lineWidth = sr2(0.02, 0.05); g.beginPath(); g.moveTo(x, z); for(let j=0;j<8;j++){ a += sr2(-0.8,0.8); x += Math.cos(a)*sr2(0.3,0.8); z += Math.sin(a)*sr2(0.3,0.8); g.lineTo(x, z); } g.stroke(); } }
function blob(g, x, z, r, n=14){ g.beginPath(); for(let i=0;i<n;i++){ const a = i/n*6.2832, rr = r*sr2(0.65,1.15); i ? g.lineTo(x+Math.cos(a)*rr, z+Math.sin(a)*rr*0.8) : g.moveTo(x+Math.cos(a)*rr, z+Math.sin(a)*rr*0.8); } g.closePath(); }
function puddle(g, x, z, r, tint, base='rgba(6,8,16,0.6)'){ blob(g, x, z, r); g.fillStyle = base; g.fill(); g.save(); g.clip(); g.globalCompositeOperation = 'lighter';
  const gr = g.createRadialGradient(x+r*0.25, z+r*0.1, 0, x, z, r*1.3); gr.addColorStop(0, rgba(tint, 0.55)); gr.addColorStop(1, rgba(tint, 0)); g.fillStyle = gr; g.fillRect(x-r*1.5, z-r*1.5, r*3, r*3);
  g.restore(); g.strokeStyle = 'rgba(255,255,255,0.2)'; g.lineWidth = 0.04; g.stroke(); }
function cable(g, x0, z0, x1, z1, col){ const c1x = lerp(x0,x1,0.33)+sr2(-3,3), c1z = lerp(z0,z1,0.33)+sr2(-3,3), c2x = lerp(x0,x1,0.66)+sr2(-3,3), c2z = lerp(z0,z1,0.66)+sr2(-3,3);
  for(const [w,s] of [[0.2,'rgba(0,0,0,0.35)'],[0.08,col],[0.025,'rgba(255,255,255,0.18)']]){ g.strokeStyle = s; g.lineWidth = w; g.beginPath(); g.moveTo(x0,z0); g.bezierCurveTo(c1x,c1z,c2x,c2z,x1,z1); g.stroke(); } }
function hazard(g, x0, z0, x1, z1, w=0.14){ g.lineCap = 'butt'; line(g, x0, z0, x1, z1, w, '#e8c020'); g.setLineDash([w*1.2, w*1.2]); line(g, x0, z0, x1, z1, w, '#141414'); g.setLineDash([]); g.lineCap = 'round'; }
function tapeX(g, x, z, s, col){ g.lineCap = 'butt'; line(g, x-s, z-s, x+s, z+s, 0.06, col); line(g, x-s, z+s, x+s, z-s, 0.06, col); g.lineCap = 'round'; }
function paper(g, x, z, w, d, col, ink){ g.save(); g.translate(x, z); g.rotate(sr()*6.3); g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(-w/2+0.03, -d/2-0.03, w, d); g.fillStyle = col; g.fillRect(-w/2, -d/2, w, d);
  if(ink){ g.fillStyle = ink; g.fillRect(-w*0.38, d*0.12, w*0.76, d*0.25); for(let i=0;i<3;i++) g.fillRect(-w*0.38, -d*0.05-i*d*0.12, w*0.7*sr2(0.4,1), d*0.05); } g.restore(); }
function confetti(g, x0, z0, x1, z1, n, cols, s=0.07){ for(let i=0;i<n;i++){ g.save(); g.translate(sr2(x0,x1), sr2(z0,z1)); g.rotate(sr()*3.2); g.fillStyle = spick(cols); g.fillRect(-s, -s/2, 2*s, s); g.restore(); } }
function streamer(g, x, z, col){ g.strokeStyle = col; g.lineWidth = 0.05; g.beginPath(); g.moveTo(x, z); let a = sr()*6.3; for(let i=0;i<10;i++){ a += sr2(-1.4,1.4); x += Math.cos(a)*0.25; z += Math.sin(a)*0.25; g.lineTo(x, z); } g.stroke(); }
function glowstick(g, x, z, col){ const a = sr()*6.3, dx = Math.cos(a)*0.14, dz = Math.sin(a)*0.14; g.globalCompositeOperation = 'lighter'; line(g, x-dx, z-dz, x+dx, z+dz, 0.3, rgba(col, 0.2)); line(g, x-dx, z-dz, x+dx, z+dz, 0.06, rgba(col, 1)); g.globalCompositeOperation = 'source-over'; }
// floor text: glyph-up = world -z = up the screen
function text(g, s, x, z, size, fill, rot=0, weight='900'){ g.save(); g.translate(x, z); g.scale(0.1, 0.1); g.rotate(rot); g.font = `${weight} ${size*10}px Arial Black, Arial, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = fill; g.fillText(s, 0, 0); g.restore(); }
function lattice(g, x0, z0, x1, z1, s, col, w){ g.strokeStyle = col; g.lineWidth = w; g.beginPath(); for(let k=x0-(z1-z0); k<x1; k+=s){ g.moveTo(k, z0); g.lineTo(k+(z1-z0), z1); g.moveTo(k+(z1-z0), z0); g.lineTo(k, z1); } g.stroke(); }

const FLOOR = [
  // 0 ENTRANCE: the street (road with a zebra crossing, curb, slab sidewalk, the red carpet to the door) and the checker lobby
  { base(g){ box(g,-30,34,30,51,'#1d1d24'); speck(g,-30,34,30,51, 7000*DQ, ['#2c2c35','#131318','#3a3a44','#24242c'], 0.04, 0.1); blotch(g,-30,34,30,51, 24, 0x000000, 0.3, 1, 4); blotch(g,-30,34,30,51, 10, 0x6a6a80, 0.07, 2, 5); cracks(g,-30,35,30,50, 16);
      g.fillStyle = '#c8a020'; for(let x=-29; x<30; x+=4) g.fillRect(x, 41.92, 2.2, 0.16);
      g.fillStyle = 'rgba(232,232,226,0.85)'; g.fillRect(-30, 34.75, 60, 0.12); g.fillRect(-30, 48.9, 60, 0.12); for(let z=35.3; z<48.6; z+=1.1) g.fillRect(-3.2, z, 6.4, 0.55);
      speck(g,-3.2,35,3.2,48.6, 900*DQ, ['#1d1d24','#2a2a30'], 0.05, 0.14);
      disc(g, 13, 44, 0.78, '#2c2c32'); g.strokeStyle = '#4a4a52'; g.lineWidth = 0.06; g.beginPath(); g.arc(13, 44, 0.74, 0, 6.3); g.stroke(); for(let i=-3;i<=3;i++) box(g, 12.45, 44+i*0.18-0.03, 13.55, 44+i*0.18+0.03, '#17171b');
      box(g,-30,33.6,30,34,'#7a756c'); box(g,-30,34,30,34.35,'#111115');
      box(g,-30,14,30,33.6,'#58544f'); speck(g,-30,14,30,33.6, 6000*DQ, ['#66625c','#4c4844','#6e6a64','#5e5a55'], 0.04, 0.09); blotch(g,-30,14,30,33.6, 18, 0x000000, 0.18, 1, 3);
      g.strokeStyle = '#3a3734'; g.lineWidth = 0.05; g.beginPath(); for(let x=-30; x<=30; x+=2){ g.moveTo(x,14); g.lineTo(x,33.6); } for(let z=14; z<=33.6; z+=2){ g.moveTo(-30,z); g.lineTo(30,z); } g.stroke(); cracks(g,-30,14,30,33, 10);
      for(let i=0;i<260*DQ;i++) disc(g, sr2(-30,30), sr2(14,33.6), sr2(0.04,0.08), spick(['#2a2826','#3a3632','#24221f']));
      for(let x=-30; x<30; x+=1) for(let z=0; z<14; z+=1){ const L = ((x+z)&1); box(g, x, z, x+1, z+1, L ? '#cfc9bd' : '#16131b'); if(L && sr() < 0.5){ g.strokeStyle = 'rgba(120,110,100,0.35)'; g.lineWidth = 0.02; g.beginPath(); g.moveTo(x+sr(), z); g.quadraticCurveTo(x+sr(), z+0.5, x+sr(), z+1); g.stroke(); } }
      g.strokeStyle = '#c8a050'; g.lineWidth = 0.1; g.strokeRect(-28.6, 1.0, 57.2, 12.2);
      disc(g, 0, 7, 3.3, '#c8a050'); disc(g, 0, 7, 3.1, '#1a1018'); g.fillStyle = '#ff4fb8'; g.beginPath(); for(let i=0;i<16;i++){ const a = i/16*6.2832, r = i%2 ? 1.1 : 2.8; i ? g.lineTo(r*Math.cos(a), 7+r*Math.sin(a)) : g.moveTo(r*Math.cos(a), 7+r*Math.sin(a)); } g.closePath(); g.fill(); disc(g, 0, 7, 0.9, '#c8a050'); text(g, 'PAC', 0, 7, 0.7, '#1a1018');
      for(const [z0,z1] of [[14,33.6],[0,14]]){ box(g,-2.2,z0,2.2,z1,'#8a0f1e'); speck(g,-2.2,z0,2.2,z1, 600*DQ, ['#9a1626','#7a0c18'], 0.04, 0.08); box(g,-2.26,z0,-2.16,z1,'#d8b050'); box(g,2.16,z0,2.26,z1,'#d8b050'); } },
    decals(g){ for(let i=0;i<70*DQ;i++) paper(g, sr2(-29,29), sr2(14.5,49), 0.28, 0.4, spick(['#f0e8d8','#ff4fb8','#41e4ff','#ffe060','#f0e8d8']), '#2a2a2a');
      for(let i=0;i<220*DQ;i++){ const x = sr2(-29,29), z = sr2(14.5,49); line(g, x, z, x+sr2(-0.1,0.1), z+sr2(-0.1,0.1), 0.035, spick(['#f0e8d8','#e8a060'])); }
      for(const [x,z,r,c] of [[-18,38,1.9,0x41e4ff],[6,45.5,1.3,0xff4fb8],[22,40,1.6,0xffd89a],[-12,24,1.0,0xff4fb8],[17,27,0.9,0x41e4ff],[-26,46,1.2,0xffd89a],[0.5,39,0.9,0xff4fb8]]) puddle(g, x, z, r, c);
      confetti(g, -2, 14.5, 2, 33, 300*DQ, ['#ffd84a','#ff4fb8','#ffffff']); },
    lights(g){ for(const x of [-22,-10,10,22]) light(g, x, 34, 7.5, 0xffd8a0, 0.32); light(g, 0, 16.5, 9, 0xff4fb8, 0.35); light(g, -4, 15.5, 4, 0x41e4ff, 0.3); light(g, 4, 15.5, 4, 0xff4fb8, 0.3);
      light(g, 0, 7, 9, 0xffe0b0, 0.2); light(g, -24, 7, 5, 0xffc070, 0.25); light(g, 22, 9, 4, 0x41e4ff, 0.2); light(g, 19, 2, 6, 0xffffff, 0.14);
      for(const [x,z] of [[13.6,35.6],[-13.5,35.5],[-23.6,35.6],[24.4,35.6]]) light(g, x, z+1.6, 2.2, 0xffffff, 0.08); } },
  // 1 DANCE FLOOR: glitter concrete up top, plush lounges, the dark glass of the LED pit, rubber round the DJ riser
  { base(g){ const {x0,x1,z0,z1} = PIT; box(g,-30,-110,30,0,'#15111d'); speck(g,-30,-110,30,0, 9000*DQ, ['#1e1828','#0e0b14','#241c30'], 0.03, 0.08);
      for(const s of [-1,1]){ const a = s<0 ? -30 : 17, b = s<0 ? -17 : 30; box(g, a, z0, b, z1, '#1c0e22'); for(let x=a+0.4; x<b; x+=0.8) for(let z=z0+0.4; z<z1; z+=0.8){ disc(g, x, z, 0.08, '#2c1636'); } }
      box(g, x0, z0, x1, z1, '#07060b'); g.strokeStyle = '#000'; g.lineWidth = 0.14; g.beginPath(); for(let i=0;i<=TX;i++){ const x = x0+(x1-x0)*i/TX; g.moveTo(x, z0); g.lineTo(x, z1); } for(let i=0;i<=TZ;i++){ const z = z0+(z1-z0)*i/TZ; g.moveTo(x0, z); g.lineTo(x1, z); } g.stroke();
      blotch(g, x0, z0, x1, z1, 30, 0x8070a0, 0.06, 1, 3);
      box(g, -12, -109.6, 12, -95, '#100c16'); speck(g, -12, -109.6, 12, -95, 1200*DQ, ['#18141e','#0a080e'], 0.03, 0.06); hazard(g, -7, -96.7, 7, -96.7, 0.18);
      speck(g,-30,-110,30,0, 1600*DQ, ['#ff4fb8','#41e4ff','#ffffff','#ffe060'], 0.02, 0.045); },
    decals(g){ const {x0,x1,z0,z1} = PIT, C = ['#ff4fb8','#41e4ff','#ffe060','#b070ff','#ffffff','#7cff4f'];
      confetti(g, x0, z0, x1, z1, 5000*DQ, C); confetti(g, -30, -110, 30, 0, 2500*DQ, C);
      for(let i=0;i<120*DQ;i++) streamer(g, sr2(-29,29), sr2(-108,-2), spick(C)); for(let i=0;i<40*DQ;i++) paper(g, sr2(-29,29), sr2(-108,-2), 0.28, 0.4, spick(['#f0e8d8','#ff4fb8','#41e4ff']), '#222');
      for(let i=0;i<10;i++) puddle(g, spick([-1,1])*sr2(19,28), sr2(-92,-14), sr2(0.5,1.0), spick([0xff4fb8, 0x41e4ff, 0xffc860]));
      for(let i=0;i<8;i++) puddle(g, sr2(x0+3,x1-3), sr2(z0+3,z1-3), sr2(0.6,1.2), spick([0xff4fb8, 0x41e4ff]), 'rgba(20,10,30,0.5)'); },
    lights(g){ for(const s of [-1,1]) for(let z=-18; z>-94; z-=12) light(g, s*24, z, 6.5, z%24 ? 0xff4fb8 : 0x41e4ff, 0.26);
      light(g, 0, -101, 12, 0xb070ff, 0.32); light(g, 0, -96, 8, 0x41e4ff, 0.25); light(g, 0, -5, 9, 0x41e4ff, 0.22); light(g, -20, -6, 6, 0xff4fb8, 0.2); light(g, 20, -6, 6, 0xff4fb8, 0.2); },
    glows(g){ for(let i=0;i<70*DQ;i++) glowstick(g, sr2(-29,29), sr2(-108,-2), spick([0x7cff4f, 0xff4fb8, 0x41e4ff, 0xffe040])); } },
  // 2 THE BAR: warm wood planks, a sticky trail along the counter, an arcade carpet in the game room
  { base(g){ for(let x=-30; x<30; x+=0.24){ let z = -200 - sr()*3; while(z < -110){ const L = sr2(1.8, 4.2), v = sr2(0.7, 1.2), r = 74*v|0, gg = 44*v|0, b = 26*v|0; box(g, x, z, x+0.24, z+L, `rgb(${r},${gg},${b})`);
          g.strokeStyle = `rgba(${r+30},${gg+20},${b+10},0.35)`; g.lineWidth = 0.012; g.beginPath(); for(let j=0;j<3;j++){ const xx = x+0.04+j*0.07; g.moveTo(xx, z); g.lineTo(xx+sr2(-0.03,0.03), z+L); } g.stroke(); box(g, x, z+L-0.02, x+0.24, z+L+0.02, '#140a06'); z += L; } box(g, x+0.235, -200, x+0.245, -110, '#120804'); }
      g.globalCompositeOperation = 'lighter'; const gr = g.createLinearGradient(-12, 0, 12, 0); gr.addColorStop(0, 'rgba(255,220,170,0)'); gr.addColorStop(0.5, 'rgba(255,220,170,0.07)'); gr.addColorStop(1, 'rgba(255,220,170,0)'); g.fillStyle = gr; g.fillRect(-12, -200, 24, 90); g.globalCompositeOperation = 'source-over';
      box(g, -25, -190, -21.5, -118, 'rgba(10,4,2,0.32)');
      box(g, 17.4, -200, 30, -110, '#0d0b26'); const A = ['#ff4fb8','#41e4ff','#ffe060','#7cff4f','#b070ff','#ff7a2a'];
      for(let i=0;i<520*DQ;i++){ const x = sr2(17.4,30), z = sr2(-200,-110), c = spick(A), t = sr(); g.fillStyle = c; g.strokeStyle = c; g.lineWidth = 0.05;
        if(t < 0.3){ g.beginPath(); g.moveTo(x, z); g.lineTo(x+0.3, z+0.1); g.lineTo(x+0.1, z+0.32); g.fill(); } else if(t < 0.6){ g.beginPath(); g.arc(x, z, 0.12, 0, 6.3); g.stroke(); } else { g.beginPath(); g.moveTo(x, z); g.quadraticCurveTo(x+0.2, z+0.3, x+0.4, z); g.stroke(); } } },
    decals(g){ for(let i=0;i<70*DQ;i++) paper(g, sr2(-25,16), sr2(-198,-112), 0.28, 0.28, '#f2efe8');
      for(let i=0;i<40*DQ;i++){ const x = sr2(-24,16), z = sr2(-198,-112); g.fillStyle = '#7ac83a'; g.beginPath(); g.arc(x, z, 0.12, 0, 3.14); g.fill(); g.fillStyle = '#d8f0a0'; g.beginPath(); g.arc(x, z, 0.08, 0, 3.14); g.fill(); }
      for(let i=0;i<180*DQ;i++) disc(g, sr2(-25,29), sr2(-199,-111), 0.04, spick(['#d8b050','#c8c8c8','#d02a2a']));
      for(let i=0;i<300*DQ;i++) disc(g, sr2(-25,16), sr2(-199,-111), 0.025, '#c8a070');
      for(let i=0;i<14;i++) puddle(g, sr2(-24,14), sr2(-196,-114), sr2(0.4,1.0), 0xffb340, 'rgba(40,20,4,0.5)');
      g.globalCompositeOperation = 'lighter'; for(let i=0;i<60*DQ;i++){ const x = sr2(-24,16), z = sr2(-198,-112); line(g, x, z, x+sr2(-0.12,0.12), z+sr2(-0.12,0.12), 0.025, 'rgba(255,255,255,0.6)'); } g.globalCompositeOperation = 'source-over'; },
    lights(g){ for(let z=-124; z>=-184; z-=6) light(g, -24.6, z, 4.6, 0xffb860, 0.38); light(g, 0, -152, 8, 0xffb860, 0.3);
      for(const [x,z] of [[-8,-124],[-10,-176],[4,-188],[-12,-142],[10,-182],[8,-128],[-6,-166],[11,-136],[23,-145],[21.5,-186],[21.5,-194]]) light(g, x, z, 2.2, 0xffc070, 0.3);
      for(const z of [-126,-160]) light(g, 23.5, z, 3.6, 0xe0ffd0, 0.3); light(g, 27.5, -186, 5, 0xff4fb8, 0.22); light(g, 27.5, -182, 4, 0x41e4ff, 0.2); light(g, 27.8, -140.5, 3, 0xffa0d0, 0.25); } },
  // 3 VIP: deep carpet with a gold lattice, a red runner in from the hallway, petals, banknotes and gold confetti
  { base(g){ box(g,-30,-290,30,-200,'#24081e'); speck(g,-30,-290,30,-200, 5000*DQ, ['#2c0c26','#1c0618','#300e2a'], 0.04, 0.09);
      lattice(g, -30, -290, 30, -200, 1.4, 'rgba(200,160,80,0.32)', 0.04); for(let x=-30; x<30; x+=1.4) for(let z=-290; z<-200; z+=1.4){ disc(g, x+0.7, z+0.7, 0.1, 'rgba(200,160,80,0.4)'); }
      box(g,-2.6,-282,2.6,-200,'#5c0a1a'); speck(g,-2.6,-282,2.6,-200, 900*DQ, ['#6a1020','#4a0814'], 0.04, 0.08); box(g,-2.66,-282,-2.54,-200,'#d8b050'); box(g,2.54,-282,2.66,-200,'#d8b050');
      for(let z=-204; z>-282; z-=2.2){ g.fillStyle = 'rgba(216,176,80,0.5)'; g.beginPath(); g.moveTo(0, z-0.5); g.lineTo(0.5, z); g.lineTo(0, z+0.5); g.lineTo(-0.5, z); g.closePath(); g.fill(); } },
    decals(g){ for(let i=0;i<420*DQ;i++){ g.save(); g.translate(sr2(-28,28), sr2(-288,-202)); g.rotate(sr()*6.3); g.fillStyle = spick(['#c81a3a','#e83a5a','#a01030']); g.beginPath(); g.ellipse(0, 0, 0.09, 0.06, 0, 0, 6.3); g.fill(); g.restore(); }
      for(let i=0;i<110*DQ;i++){ g.save(); g.translate(sr2(-27,27), sr2(-288,-202)); g.rotate(sr()*6.3); g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(-0.2,-0.12,0.42,0.22); g.fillStyle = '#7aa070'; g.fillRect(-0.21,-0.09,0.42,0.2); g.fillStyle = '#a8c8a0'; g.fillRect(-0.07,-0.06,0.14,0.14); g.restore(); }
      confetti(g, -29, -289, 29, -201, 1600*DQ, ['#ffd84a','#e8c040','#fff2b0'], 0.06);
      for(let i=0;i<8;i++) puddle(g, sr2(-24,24), sr2(-285,-205), sr2(0.4,0.8), 0xc8a050, 'rgba(30,20,8,0.22)'); },
    lights(g){ for(const s of [-1,1]) for(const z of [-215,-235,-255,-275]) light(g, s*23, z, 5.5, 0xffb070, 0.3);
      light(g, -14, -245, 8, 0xffe0a0, 0.25); light(g, 14, -245, 8, 0xffe0a0, 0.25); light(g, 0, -262, 8, 0xffe0a0, 0.25); for(let z=-206; z>-282; z-=10) light(g, 0, z, 5, 0xb070ff, 0.2);
      light(g, 0, -232.6, 3.5, 0xffe0a0, 0.3); light(g, 0, -268, 3.5, 0xffe0a0, 0.3); light(g, 24, -284, 5, 0xb070ff, 0.28); } },
  // 4 BACKSTAGE: work-lit concrete, oil stains, expansion joints, hazard tape along every wall, spike marks, cables everywhere
  { base(g){ box(g,-30,-370,30,-290,'#4a4a52'); speck(g,-30,-370,30,-290, 8000*DQ, ['#55555e','#3e3e46','#5c5c64','#46464e'], 0.04, 0.1); blotch(g,-30,-370,30,-290, 34, 0x000000, 0.28, 0.8, 2.6); blotch(g,-30,-370,30,-290, 12, 0x3a2a10, 0.2, 1, 3);
      g.strokeStyle = '#34343a'; g.lineWidth = 0.05; g.beginPath(); for(let x=-28; x<30; x+=4){ g.moveTo(x,-370); g.lineTo(x,-290); } for(let z=-370; z<-290; z+=4){ g.moveTo(-30,z); g.lineTo(30,z); } g.stroke(); cracks(g,-30,-370,30,-290, 20);
      for(const x of [-29, 29]) hazard(g, x, -369, x, -291, 0.16); hazard(g, -10.6, -297, -10.6, -341, 0.14); hazard(g, -9.4, -297, -9.4, -341, 0.14); hazard(g, 9.4, -311, 9.4, -363, 0.14); hazard(g, 10.6, -311, 10.6, -363, 0.14);
      for(const z of [-296, -330, -364]) text(g, 'STAGE ▲', 0, z, 1.1, 'rgba(240,240,240,0.55)');
      for(const [x,z] of [[-20,-296],[20,-366],[0,-368]]){ box(g, x-0.5, z-0.3, x+0.5, z+0.3, '#26262c'); for(let i=0;i<6;i++) box(g, x-0.45+i*0.16, z-0.25, x-0.39+i*0.16, z+0.25, '#121216'); } },
    decals(g){ for(let i=0;i<40*DQ;i++) tapeX(g, sr2(-28,28), sr2(-368,-292), 0.2, spick(['#ff4fb8','#7cff4f','#41e4ff','#ffe040','#f4f4f4']));
      const cc = ['#16161a','#16161a','#c85a1a','#2a4ac8','#16161a']; for(let i=0;i<46*DQ;i++){ const x = sr2(-28,28), z = sr2(-368,-292); cable(g, x, z, x+sr2(-10,10), z+sr2(-10,10), spick(cc)); }
      for(let i=0;i<4;i++) cable(g, -5+i*3, -291, -5+i*3+sr2(-3,3), -369, spick(cc));
      for(let i=0;i<30*DQ;i++) paper(g, sr2(-28,28), sr2(-368,-292), 0.3, 0.42, '#f4f4f0', '#1a1a1a'); for(let i=0;i<6;i++) puddle(g, sr2(-26,26), sr2(-366,-294), sr2(0.4,0.8), 0xbfe8ff, 'rgba(10,12,16,0.45)'); },
    lights(g){ for(const s of [-1,1]) for(let z=-296; z>-368; z-=12) light(g, s*27, z, 4.5, 0xcfe8ff, 0.24); for(const z of [-305,-320,-335]) light(g, -10, z, 3.5, 0xcfe8ff, 0.18); for(const z of [-325,-345]) light(g, 10, z, 3.5, 0xcfe8ff, 0.18);
      light(g, -28, -312, 6, 0xfff0c8, 0.3); light(g, 0, -350, 6, 0xffc070, 0.22); } },
  // 5 MAIN STAGE: black rubber, gobo projections on the floor, the photo pit, confetti and cups
  { base(g){ box(g,-30,-450,30,-370,'#0d0b10'); speck(g,-30,-450,30,-370, 7000*DQ, ['#16131a','#08070a','#1c1820'], 0.03, 0.07); box(g,-24,-440,24,-437,'#060508');
      g.globalCompositeOperation = 'lighter'; for(const [x,z,r,c] of [[0,-405,12,0xff3b4a],[-15,-392,6,0x41e4ff],[15,-392,6,0xffb340]]){ g.strokeStyle = rgba(c, 0.16); g.lineWidth = r*0.06; g.beginPath(); g.arc(x, z, r*0.92, 0, 6.3); g.stroke(); g.beginPath(); g.arc(x, z, r*0.6, 0, 6.3); g.stroke();
        g.fillStyle = rgba(c, 0.08); g.beginPath(); for(let i=0;i<10;i++){ const a = i/10*6.2832, rr = i%2 ? r*0.25 : r*0.55; i ? g.lineTo(x+rr*Math.cos(a), z+rr*Math.sin(a)) : g.moveTo(x+rr*Math.cos(a), z+rr*Math.sin(a)); } g.closePath(); g.fill(); } g.globalCompositeOperation = 'source-over'; },
    decals(g){ const C = ['#ff3b4a','#ffb340','#ffffff','#ffd84a','#ff4fb8']; confetti(g, -29, -440, 29, -372, 4200*DQ, C); confetti(g, -25, -440, 25, -415, 2000*DQ, C);
      for(let i=0;i<30*DQ;i++) paper(g, sr2(-27,27), sr2(-436,-374), 0.3, 0.42, '#f4f4f0', '#1a1a1a'); for(let i=0;i<60*DQ;i++) streamer(g, sr2(-28,28), sr2(-436,-374), spick(C));
      for(let i=0;i<6;i++) puddle(g, sr2(-24,24), sr2(-432,-376), sr2(0.5,1.0), 0xff3b4a, 'rgba(14,8,10,0.5)'); },
    lights(g){ for(let x=-20; x<=20; x+=8) light(g, x, -433, 5.5, 0xfff0e0, 0.36); light(g, -12, -410, 9, 0xff3b4a, 0.24); light(g, 12, -410, 9, 0xffb340, 0.24); light(g, 0, -380, 8, 0xff3b4a, 0.2); },
    glows(g){ for(let i=0;i<80*DQ;i++) glowstick(g, sr2(-28,28), sr2(-436,-374), spick([0x7cff4f, 0xff4fb8, 0x41e4ff, 0xffe040])); } }];

function paintFloor(ri){ const R = ROOMS[ri], len = R.z1 - R.z0, W = isMobile ? 512 : 1024; let H = 256; while(H < len*W/60*0.85 && H < 4096) H *= 2;
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'), F = FLOOR[ri];
  g.setTransform(W/60, 0, 0, -H/len, 30*W/60, R.z1*H/len); g.lineCap = 'round'; g.lineJoin = 'round';   // draw in metres, world x and z
  F.base(g); F.decals(g); F.lights(g);
  // dark at the foot of every wall, a thin spill of neon right against it
  for(const s of WSEGS){ const x0 = Math.min(s.x0,s.x1)-0.4, x1 = Math.max(s.x0,s.x1)+0.4, z0 = Math.min(s.z0,s.z1)-0.4, z1 = Math.max(s.z0,s.z1)+0.4; if(z1 < R.z0-2 || z0 > R.z1+2) continue;
    for(let k=4;k>=1;k--){ const e = k*0.35; g.fillStyle = 'rgba(0,0,0,0.13)'; g.fillRect(x0-e, z0-e, x1-x0+2*e, z1-z0+2*e); }
    g.globalCompositeOperation = 'lighter'; const C = ROOMS[s.ri].col2; g.fillStyle = rgba(C, 0.09); g.fillRect(x0-0.55, z0-0.55, x1-x0+1.1, z1-z0+1.1); g.fillStyle = rgba(C, 0.12); g.fillRect(x0-0.18, z0-0.18, x1-x0+0.36, z1-z0+0.36); g.globalCompositeOperation = 'source-over'; }
  // soft shadows under everything that stands on the floor
  for(const s of SHADES){ if(s.z < R.z0-3 || s.z > R.z1+3) continue; g.save(); g.translate(s.x, s.z); g.rotate(-s.rot);
    for(let k=4;k>=0;k--){ const e = 0.08 + k*0.15; g.fillStyle = `rgba(0,0,0,${s.a/5})`; if(s.round){ g.beginPath(); g.ellipse(0, 0, s.w/2+e, s.d/2+e, 0, 0, 6.2832); g.fill(); } else g.fillRect(-s.w/2-e, -s.d/2-e, s.w+2*e, s.d+2*e); } g.restore(); }
  if(F.glows) F.glows(g);
  const t = new THREE.CanvasTexture(c); t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); return t; }
function streetTex(){ const c = document.createElement('canvas'); c.width = isMobile ? 256 : 512; c.height = c.width/4; const g = c.getContext('2d'), k = c.width/60;   // 60 x 15 m beyond the barriers
  g.setTransform(k, 0, 0, -k, 30*k, 65*k); box(g,-30,50,30,66,'#1d1d24'); speck(g,-30,50,30,66, 1800*DQ, ['#2c2c35','#131318','#3a3a44'], 0.05, 0.12); g.fillStyle = 'rgba(232,232,226,0.8)'; g.fillRect(-30, 56, 60, 0.12);
  box(g,-30,57,30,57.4,'#7a756c'); box(g,-30,57.4,30,66,'#4a4743'); light(g, -14, 58, 6, 0xffd8a0, 0.2); light(g, 14, 58, 6, 0xffd8a0, 0.2); return new THREE.CanvasTexture(c); }

// ======================= WALL LOOKS =======================
// each texture covers 6 m along the wall and 6 m up (walls use the bottom 3.6 or 5 m; the top band is the dark cap on top)
const WT = {};
const WPAINT = {
  brick(g, col, col2){ box(g,0,0,6,6,'#2a1512'); for(let r=0; r<38; r++){ const y = r*0.16, off = (r%2)*0.2; for(let x=-0.4; x<6.4; x+=0.4){ const v = sr2(0.7,1.15); box(g, x+off+0.012, y+0.012, x+off+0.388, y+0.148, `rgb(${112*v|0},${46*v|0},${36*v|0})`); } }
    const gr = g.createLinearGradient(0,0,0,1.4); gr.addColorStop(0,'rgba(0,0,0,0.65)'); gr.addColorStop(1,'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0,0,6,1.4);
    for(let i=0;i<2;i++){ const x = 0.6+i*3, y = 1.1; box(g, x, y, x+0.8, y+1.1, spick(['#f0e8d8','#ffe060','#41e4ff'])); box(g, x+0.08, y+0.55, x+0.72, y+1.0, spick(['#ff4fb8','#1a1a1a','#d02a2a'])); box(g, x+0.08, y+0.1, x+0.6, y+0.18, '#1a1a1a'); }
    for(let i=0;i<3;i++){ const c = spick(['#ff4fb8','#41e4ff','#7cff4f','#ffe060','#f4f4f4']); let x = sr2(0.8,4.6), y = sr2(0.4,1.8); g.lineWidth = 0.09; g.strokeStyle = c; g.beginPath(); g.moveTo(x, y); for(let j=0;j<6;j++){ g.bezierCurveTo(x+sr2(-0.3,0.4), y+sr2(-0.4,0.4), x+sr2(0,0.5), y+sr2(-0.4,0.4), x+sr2(0.15,0.35), y+sr2(-0.2,0.2)); x += 0.25; } g.stroke(); }
    light(g, 3, 0, 1.6, col2, 0.25); },
  foam(g, col, col2){ box(g,0,0,6,6,'#0d0a14'); lattice(g, 0, 0, 6, 6, 0.6, '#1f1830', 0.03); for(let x=0; x<6; x+=0.6) for(let y=0; y<6; y+=0.6) disc(g, x+0.3, y+0.3, 0.04, '#2c2240');
    g.globalCompositeOperation = 'lighter'; for(const x of [1, 4]){ line(g, x, 0.3, x, 4.7, 0.5, rgba(col, 0.16)); line(g, x, 0.3, x, 4.7, 0.08, rgba(col, 1)); line(g, x, 0.3, x, 4.7, 0.025, 'rgba(255,255,255,0.9)'); }
    for(let x=0.125; x<6; x+=0.25) disc(g, x, 2.9, 0.04, rgba(col2, 0.9)); light(g, 3, 0, 1.6, col2, 0.2); g.globalCompositeOperation = 'source-over'; },
  bottles(g, col, col2){ for(let x=0; x<6; x+=0.2) box(g, x, 0, x+0.2, 1.15, `rgb(${58*sr2(0.8,1.1)|0},${34*sr2(0.8,1.1)|0},${20*sr2(0.8,1.1)|0})`); for(let x=0; x<6; x+=0.2) box(g, x, 0, x+0.015, 1.15, '#140a06');
    box(g, 0, 1.12, 6, 1.18, '#c8a040'); const gr = g.createLinearGradient(0,1.2,0,4.7); gr.addColorStop(0,'#c87a2a'); gr.addColorStop(0.5,'#7a3a14'); gr.addColorStop(1,'#2a1208'); g.fillStyle = gr; g.fillRect(0,1.2,6,3.5);
    g.globalCompositeOperation = 'lighter'; for(const y of [1.75, 2.55, 3.35, 4.15]) light(g, 3, y+0.15, 3.2, 0xffb35a, 0.12); g.globalCompositeOperation = 'source-over';
    const BC = [0xc87a1a, 0x2a8a3a, 0xd8e8f0, 0x2a4ad0, 0xd02a2a, 0xe8c040, 0x6a2a8a];
    for(const y of [1.75, 2.55, 3.35, 4.15]){ box(g, 0, y-0.04, 6, y, '#ffe8c0'); for(let x=0.08; x<5.9; x+=sr2(0.12,0.2)){ const w = sr2(0.08,0.11), h = sr2(0.24,0.4), c = spick(BC); box(g, x, y, x+w, y+h*0.7, rgba(c, 0.85)); box(g, x+w*0.32, y+h*0.7, x+w*0.68, y+h, rgba(c, 0.85)); box(g, x+w*0.15, y+0.03, x+w*0.3, y+h*0.6, 'rgba(255,255,255,0.3)'); } }
    box(g, 0, 4.7, 6, 6, '#1a0e08'); box(g, 0, 4.7, 6, 4.76, '#c8a040'); },
  velvet(g, col, col2){ for(let x=0; x<6; x+=0.3){ const gr = g.createLinearGradient(x,0,x+0.3,0); gr.addColorStop(0,'#2a0620'); gr.addColorStop(0.5,'#6e1648'); gr.addColorStop(1,'#2a0620'); g.fillStyle = gr; g.fillRect(x,0,0.3,6); }
    box(g, 0, 0.3, 6, 0.42, '#c8a040'); for(let x=0.02; x<6; x+=0.06) box(g, x, 0.14, x+0.02, 0.3, '#a88030'); for(let x=0; x<6; x+=1.5){ g.strokeStyle = '#c8a040'; g.lineWidth = 0.06; g.beginPath(); g.moveTo(x, 4.75); g.quadraticCurveTo(x+0.75, 4.25, x+1.5, 4.75); g.stroke(); }
    for(const x of [1.5, 4.5]){ light(g, x, 2.7, 1.3, 0xffc870, 0.5); box(g, x-0.1, 2.3, x+0.1, 2.7, '#c8a040'); } },
  block(g, col, col2){ box(g,0,0,6,6,'#55555c'); for(let r=0; r<30; r++){ const y = r*0.2, off = (r%2)*0.2; for(let x=-0.4; x<6.4; x+=0.4){ const v = sr2(0.88,1.08); box(g, x+off+0.015, y+0.015, x+off+0.385, y+0.185, `rgb(${92*v|0},${92*v|0},${100*v|0})`); } }
    box(g, 0, 0, 6, 1.2, 'rgba(70,90,120,0.45)'); box(g, 0, 0, 6, 0.32, '#e8c020'); g.save(); g.beginPath(); g.rect(0,0,6,0.32); g.clip(); for(let x=-0.4; x<6.4; x+=0.4){ g.fillStyle = '#141414'; g.beginPath(); g.moveTo(x,0); g.lineTo(x+0.2,0); g.lineTo(x+0.52,0.32); g.lineTo(x+0.32,0.32); g.fill(); } g.restore();
    for(const [y,r] of [[3.6,0.09],[3.85,0.06]]){ const gr = g.createLinearGradient(0,y-r,0,y+r); gr.addColorStop(0,'#3a3a40'); gr.addColorStop(0.4,'#9a9aa4'); gr.addColorStop(1,'#2a2a30'); g.fillStyle = gr; g.fillRect(0, y-r, 6, 2*r); } for(let x=0.75; x<6; x+=1.5) box(g, x, 3.45, x+0.06, 3.95, '#2a2a30');
    g.globalCompositeOperation = 'lighter'; line(g, 1.5, 3.05, 4.5, 3.05, 0.5, rgba(col, 0.15)); line(g, 1.5, 3.05, 4.5, 3.05, 0.07, '#e8f6ff'); light(g, 3, 2.6, 2.4, col, 0.2); g.globalCompositeOperation = 'source-over'; },
  drape(g, col, col2){ for(let x=0; x<6; x+=0.25){ const gr = g.createLinearGradient(x,0,x+0.25,0); gr.addColorStop(0,'#050307'); gr.addColorStop(0.5,'#1c1018'); gr.addColorStop(1,'#050307'); g.fillStyle = gr; g.fillRect(x,0,0.25,6); }
    g.globalCompositeOperation = 'lighter'; const gr = g.createLinearGradient(0,0,0,1.6); gr.addColorStop(0, rgba(col, 0.35)); gr.addColorStop(1, rgba(col, 0)); g.fillStyle = gr; g.fillRect(0,0,6,1.6);
    for(let i=0;i<70;i++) disc(g, sr2(0,6), sr2(0.8,5.8), sr2(0.015,0.03), spick(['rgba(255,255,255,0.9)','rgba(255,220,180,0.8)'])); g.globalCompositeOperation = 'source-over'; } };
function wallTex(style, col, col2){ const key = style+col; if(WT[key]) return WT[key]; const S = isMobile ? 256 : 512, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  g.setTransform(S/6, 0, 0, -S/6, 0, S); g.lineCap = 'round'; WPAINT[style](g, col, col2); box(g, 0, 5.85, 6, 6, '#0a080e');
  const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); return WT[key] = t; }

// ======================= LED SCREENS (a shader: equaliser, rings, plasma, sunburst; cycles every 8 s) =======================
const LED_VS = ['varying vec2 vUv;', '#include <fog_pars_vertex>', 'void main(){ vUv = uv; vec4 mvPosition = modelViewMatrix*vec4(position,1.0); gl_Position = projectionMatrix*mvPosition;', '#include <fog_vertex>', '}'].join('\n');
const LED_FS = ['uniform float uT; uniform vec3 uA; uniform vec3 uB; uniform float uMode; uniform vec2 uRes; varying vec2 vUv;', '#include <fog_pars_fragment>',
  'void main(){ vec2 gp = vUv*uRes, p = (floor(gp)+0.5)/uRes, c = fract(gp); float led = smoothstep(0.04,0.28,c.x)*smoothstep(0.96,0.72,c.x)*smoothstep(0.04,0.28,c.y)*smoothstep(0.96,0.72,c.y);',
  '  float m = mod(uMode + floor(uT/8.0), 4.0); vec3 col; vec2 q = (p-0.5)*vec2(uRes.x/uRes.y, 1.0); float r = length(q), a = atan(q.y, q.x);',
  '  if(m < 1.0){ float b = floor(p.x*24.0); float hgt = 0.12 + 0.8*abs(sin(uT*3.1 + b*1.7)*sin(uT*1.3 + b*0.6)); col = p.y < hgt ? mix(uA, uB, p.y/hgt) : vec3(0.015); }',
  '  else if(m < 2.0){ col = mix(uA, uB, 0.5+0.5*sin(r*16.0 - uT*5.0)) * (0.55+0.45*sin(a*6.0 + uT*2.0)); }',
  '  else if(m < 3.0){ float v = sin(p.x*9.0 + uT) + sin(p.y*7.0 - uT*1.3) + sin((p.x+p.y)*6.0 + uT*0.7); col = mix(uA, uB, 0.5+0.5*sin(v*2.0)); }',
  '  else { float s = step(0.5, fract(a/6.2832*12.0 + uT*0.4)); col = mix(uA*0.15, mix(uA, uB, r), s) * (1.0 - smoothstep(0.6, 1.2, r)) + uB*0.6*smoothstep(0.12, 0.0, r); }',
  '  gl_FragColor = vec4(col*led*1.3, 1.0);', '#include <fog_fragment>', '}'].join('\n');
function ledScreen(x, y, z, w, h, ry, c1, c2, mode){ const mat = new THREE.ShaderMaterial({uniforms:THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {uT:{value:0}, uA:{value:new THREE.Color(c1)}, uB:{value:new THREE.Color(c2)}, uMode:{value:mode}, uRes:{value:new THREE.Vector2(Math.round(w*6), Math.round(h*6))}}]), fog:true, vertexShader:LED_VS, fragmentShader:LED_FS});
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, y+h/2, z); m.rotation.y = ry; scene.add(m); LEDS.push(m);
  const bz = new THREE.Mesh(new THREE.BoxGeometry(w+0.3, h+0.3, 0.2), new THREE.MeshLambertMaterial({color:0x0c0c10})); bz.position.set(x - Math.sin(ry)*0.11, y+h/2, z - Math.cos(ry)*0.11); bz.rotation.y = ry; scene.add(bz); return m; }

// ======================= put it all together =======================
// velvet ropes between the brass posts: a sagging line of six short tubes (cheap), placed where placeAll() put 'rope'
function ropes(kits){ for(const p of PLACE){ if(p.kind!=='rope') continue; const k = kits[roomIndex(p.z)], dx = Math.cos(p.rot), dz = -Math.sin(p.rot); let px = p.x, pz = p.z, py = 0.95;
    for(let i=1;i<=6;i++){ const f = i/6, x = p.x+dx*4*f, z = p.z+dz*4*f, y = 0.95 - 0.26*Math.sin(f*Math.PI); k.seg(px, py, pz, x, y, z, 0.07, 0x8a1030, {round:true}); px = x; py = y; pz = z; } } }
// v0.10 the LANE's edges (Brent: "lanes and guided paths"): a rail down both sides of the 36 m play lane, in each room's style —
// bollards and chains on the street, velvet ropes in the lobby and VIP, a brass rail with a light strip in the bar, crowd
// barriers backstage and at the stage. The dance floor already has its pit rails. The game keeps you inside (BOUNDS in main.js).
function railPost(k, x, z, st){ if(st==='bollard'){ k.cyl(x,0,z,0.13,0.9,0x2a2a30,{seg:8}); k.cyl(x,0.7,z,0.137,0.12,0xe8c020,{seg:8}); }
  else if(st==='velvet'){ k.cyl(x,0,z,0.2,0.05,0xc8a050,{seg:10}); k.cyl(x,0,z,0.045,1.0,0xc8a050,{seg:6}); k.ball(x,1.03,z,0.07,0xd8b060,{seg:6}); }
  else if(st==='brass') k.cyl(x,0,z,0.04,1.05,0xc8a050,{seg:6});
  else { k.box(x,0,z,0.5,0.05,0.12,0x5a5a62); k.cyl(x,0,z,0.03,1.1,0x9a9aa8,{seg:5}); } }
function railLink(k, x, za, zb, st, col){ const zm = (za+zb)/2;
  if(st==='bollard'){ k.seg(x,0.82,za, x,0.62,zm, 0.035, 0x18181c); k.seg(x,0.62,zm, x,0.82,zb, 0.035, 0x18181c); }
  else if(st==='velvet'){ k.seg(x,0.95,za, x,0.74,zm, 0.06, 0x8a1030, {round:true}); k.seg(x,0.74,zm, x,0.95,zb, 0.06, 0x8a1030, {round:true}); }
  else if(st==='brass'){ k.seg(x,1.05,za, x,1.05,zb, 0.065, 0xd8b060, {round:true}); k.box(x, 0.95, zm, 0.04, 0.03, Math.abs(zb-za), col, {glow:true}); }
  else { for(const y of [1.08, 0.18]) k.seg(x,y,za, x,y,zb, 0.04, 0x9a9aa8, {round:true}); const n = 6; for(let i=1;i<n;i++){ const z = za + (zb-za)*i/n; k.seg(x,0.18,z, x,1.08,z, 0.02, 0x8a8a96); } } }
function railLine(k, x, z0, z1, st, col){ const n = Math.max(1, Math.round(Math.abs(z1-z0)/(st==='bollard' ? 2.6 : 2.0)));
  for(let i=0;i<=n;i++) railPost(k, x, z0 + (z1-z0)*i/n, st); for(let i=0;i<n;i++) railLink(k, x, z0 + (z1-z0)*i/n, z0 + (z1-z0)*(i+1)/n, st, col); }
function laneRails(kits){ const X = 18.4;
  for(const s of [-1,1]){ railLine(kits[0], s*X, 49, 14.5, 'bollard'); railLine(kits[0], s*X, 13.4, 0.6, 'velvet');
    railLine(kits[3], s*X, -200.6, -289.4, 'velvet'); railLine(kits[4], s*X, -290.6, -369.4, 'metal'); railLine(kits[5], s*X, -370.6, -436.4, 'metal'); }
  railLine(kits[2], -X, -110.6, -199.4, 'brass', 0xffb340); for(const [a,b] of [[-110.6,-115.6],[-136.4,-147.6],[-172.4,-199.4]]) railLine(kits[2], X, a, b, 'brass', 0xffb340); }
function dressClub(){ const kits = [entrance, dance, bar, vip, backstage, stage].map(f=>{ const k = new Kit(); f(k); return k; }); ropes(kits); laneRails(kits); return kits; }
const FL = [];
function finishDress(){
  ledScreen(0, 1.2, -109.5, 11.4, 4.9, 0, 0xff4fb8, 0x41e4ff, 0);                        // behind the DJ
  ledScreen(0, 1.5, -449.45, 40, 8.2, 0, 0xff3b4a, 0xffb340, 1);                           // the main stage wall
  for(const s of [-1,1]) ledScreen(s*24.2, 1.6, -449.45, 4.4, 7.2, 0, 0xffb340, 0xff4fb8, 2+(s>0?1:0));
  for(const [x,y,z,col,size,op] of GL) scene.add(at(glowS(col, size, op), x, y, z));
  for(const [x,y,z,col] of FLICK){ const s = glow(col, 2.2, 0.0); s.position.set(x, y, z); scene.add(s); FL.push({s, ph:sr()*6, col}); }
  for(const W of WSIGN){ const c = document.createElement('canvas'); c.width = 1024; c.height = 256; const g = c.getContext('2d'), col = '#'+W.col.toString(16).padStart(6,'0');
    g.font = `${W.font} ${W.text.length > 10 ? 120 : 160}px Arial Black, Arial, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = col; g.shadowBlur = 30; g.fillStyle = col; g.fillText(W.text, 512, 132); g.shadowBlur = 6; g.fillStyle = '#fff'; g.globalAlpha = 0.75; g.fillText(W.text, 512, 132);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(W.w, W.w/4), new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c), transparent:true, blending:THREE.AdditiveBlending, depthWrite:false}));
    m.position.set(W.x, W.y, W.z); m.rotation.y = W.ry; scene.add(m); }
}
// pyro and confetti cannons flicker on the beat; beacons spin
function animateDress(t, onBeat){ for(const f of FL){ const v = onBeat && Math.sin(t*0.7 + f.ph) > 0.3 ? 0.9 : Math.max(0, f.s.material.opacity - 0.06); f.s.material.opacity = v; f.s.scale.setScalar(1.6 + v*2.4); } }

return {dressClub, finishDress, animateDress, paintFloor, streetTex, wallTex};
})();
const {dressClub, finishDress, animateDress, paintFloor, streetTex, wallTex} = DRESS;
