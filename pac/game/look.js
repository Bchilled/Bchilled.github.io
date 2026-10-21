// PAC — look.js (v0.7). The shared art pipeline for the game and the model sheet.
// Blender-built models (assets/*.glb) are loaded, and every material is swapped for the ink-hatch shader:
// muted, matte, sketched strokes that are never filled solid; uGloss = shine of better gear, uEmit = epic glow.
// Characters are rigid parts parented in Blender exactly like the game rig (hips → legs → feet, body → arms → hands),
// so the node names ARE the bones. Crowds (clubgoers, ghosts) are merged into one coloured geometry for instancing.
(function(){
const LIGHT_DIR = new THREE.Vector3(-0.4, 1, 0.45).normalize();
const hatchU = {uTime:{value:0}, uLight:{value:LIGHT_DIR}};
const HATCH_VS = `varying vec3 vN; varying vec3 vW; varying vec3 vC; uniform float uWave; uniform float uTime;
  void main(){ vec4 p = vec4(position,1.0); vec3 n = normal;
    #ifdef USE_INSTANCING
      if(uWave > 0.0){ vec3 ip = instanceMatrix[3].xyz; float w = clamp(1.0 - p.y/0.7, 0.0, 1.0);   // ghost hem ripples, each ghost on its own phase
        p.x += sin(uTime*6.0 + p.z*9.0 + ip.x*1.7)*0.07*w*uWave; p.z += cos(uTime*5.0 + p.x*9.0 + ip.z*1.3)*0.07*w*uWave; p.y += sin(uTime*7.0 + atan(p.z,p.x)*6.0 + ip.x)*0.05*w*uWave; }
      p = instanceMatrix * p; n = mat3(instanceMatrix) * n;
    #endif
    vC = vec3(1.0);
    #ifdef USE_COLOR
      vC *= color;
    #endif
    #ifdef USE_INSTANCING_COLOR
      vC *= instanceColor;
    #endif
    vec4 w = modelMatrix * p; vW = w.xyz; vN = normalize(mat3(modelMatrix) * n); gl_Position = projectionMatrix * viewMatrix * w; }`;
const HATCH_FS = `uniform vec3 uTint; uniform vec3 uInk; uniform vec3 uLight; uniform float uTime; uniform float uGloss; uniform vec3 uEmit; uniform float uDensity; uniform float uFlash; uniform vec3 uRim; uniform float uGlow;
  varying vec3 vN; varying vec3 vW; varying vec3 vC;
  float h(float n){ return fract(sin(n)*43758.5453); }
  float strokes(vec2 p, float ang, float gap, float seed){ vec2 d = vec2(cos(ang), sin(ang)), q = vec2(-d.y, d.x);
    float t = dot(p,d) + sin(dot(p,q)*0.045 + seed*7.0)*2.2 + sin(dot(p,q)*0.17 + seed)*0.7;
    float f = abs(fract(t/gap) - 0.5)*gap; float br = step(0.2, h(floor(dot(p,q)/9.0) + floor(t/gap)*3.1 + seed));
    return (1.0 - smoothstep(0.5, 1.3, f))*br; }
  void main(){ vec3 n = normalize(vN); float ndl = clamp(dot(n, normalize(uLight)), 0.0, 1.0);
    vec3 V = normalize(cameraPosition - vW); float rim = pow(1.0 - clamp(dot(n,V),0.0,1.0), 2.0);
    float tone = ndl*0.7 + 0.3 - rim*0.22; float s8 = floor(uTime*8.0);
    vec2 p = gl_FragCoord.xy + vec2(h(s8)*3.0, h(s8+1.7)*3.0); float g = 3.4*uDensity, ink = 0.0;
    if(tone < 0.84) ink = max(ink, strokes(p, 0.78, g, 1.0+s8*0.13)*0.75);
    if(tone < 0.6) ink = max(ink, strokes(p, -0.70, g, 2.0+s8*0.11));
    if(tone < 0.4) ink = max(ink, strokes(p, 0.10, g*0.9, 3.0+s8*0.07));
    if(tone < 0.22) ink = max(ink, strokes(p, 1.45, g*0.8, 4.0+s8*0.05));
    vec3 base = uTint*vC;
    vec3 col = mix(base*(0.78 + 0.42*tone), uInk, ink*0.78);
    vec3 H = normalize(normalize(uLight) + V);
    col += vec3(1.0)*pow(clamp(dot(n,H),0.0,1.0), 36.0)*uGloss*1.2 + rim*uGloss*0.35 + uEmit*(0.6+0.4*rim) + vec3(uFlash) + uRim*rim*0.9 + vC*uTint*rim*uGlow*1.6;
    gl_FragColor = vec4(col, 1.0); }`;
function hatchMat(tint, o={}){ const m = new THREE.ShaderMaterial({uniforms:Object.assign({uTint:{value:new THREE.Color(tint)}, uInk:{value:new THREE.Color(o.ink||0x15110d)},
  uGloss:{value:o.gloss||0}, uEmit:{value:new THREE.Color(o.emit||0)}, uDensity:{value:o.density||1}, uFlash:{value:0}, uRim:{value:new THREE.Color(o.rim||0x000000)}, uWave:{value:o.wave||0}, uGlow:{value:o.glow||0}}, hatchU),
  vertexShader:HATCH_VS, fragmentShader:HATCH_FS}); if(o.vertexColors) m.vertexColors = true; return m; }
const OUT_VS = `uniform float uTime; uniform float uW; uniform float uWave; float h(float n){ return fract(sin(n)*43758.5453); }
  void main(){ vec3 p = position; vec3 n = normal;
    #ifdef USE_INSTANCING
      if(uWave > 0.0){ vec3 ip = instanceMatrix[3].xyz; float w = clamp(1.0 - p.y/0.7, 0.0, 1.0);
        p.x += sin(uTime*6.0 + p.z*9.0 + ip.x*1.7)*0.07*w*uWave; p.z += cos(uTime*5.0 + p.x*9.0 + ip.z*1.3)*0.07*w*uWave; p.y += sin(uTime*7.0 + atan(p.z,p.x)*6.0 + ip.x)*0.05*w*uWave; }
      p = (instanceMatrix * vec4(p,1.0)).xyz; n = mat3(instanceMatrix) * n;
    #endif
    float s = floor(uTime*8.0); float j = 0.75 + 0.5*h(dot(position, vec3(12.9,78.2,37.7)) + s);
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(p + normalize(n)*uW*j, 1.0); }`;
const outMats = {};
function outlineMat(w=0.03, wave=0){ const k = w.toFixed(3)+'/'+wave; if(!outMats[k]) outMats[k] = new THREE.ShaderMaterial({uniforms:{uTime:hatchU.uTime, uW:{value:w}, uWave:{value:wave}}, vertexShader:OUT_VS,
  fragmentShader:`void main(){ gl_FragColor = vec4(0.045,0.038,0.03,1.0); }`, side:THREE.BackSide}); return outMats[k]; }
function inked(geo, mat, w=0.03){ const g = new THREE.Group(); g.add(new THREE.Mesh(geo, outlineMat(w)), new THREE.Mesh(geo, mat)); return g; }

// --- swap every GLB material for ink: same colour; "glow"/"neon" materials become flat emissive light
function inkify(root, opt={}){
  const mats = [], w = opt.outline ?? 0.022;
  const meshes = []; root.traverse(o=>{ if(o.isMesh) meshes.push(o); });
  for(const m of meshes){
    const src = m.material, name = (src.name||'').toLowerCase(), col = src.color ? src.color.clone() : new THREE.Color(1,1,1);
    if(name.includes('neon') || name.includes('glow') || name.includes('light')){ m.material = new THREE.MeshBasicMaterial({color:col.multiplyScalar(1.6)}); continue; }
    const hm = hatchMat(col, {gloss:opt.gloss, density:opt.density}); hm.userData.base = col.clone(); m.material = hm; mats.push(hm);
    // v0.9: no outline on small face details (teeth, mouth, creases, brows, tape...) — their ink rings cluttered close-ups
    if(w > 0 && !name.includes('pupil') && !name.includes('nooutline') && !/tooth|mouth|crease|bags|scar|brow|eye_white|tape|cap_band|cap_patch|pac_gold|tongue/.test(name)){ const o = new THREE.Mesh(m.geometry, outlineMat(w)); o.name = 'outline'; m.add(o); }
  }
  return mats;
}
// --- one geometry with per-vertex colours from the materials (for InstancedMesh crowds)
function mergeColored(root, keep){
  root.updateMatrixWorld(true); const pos = [], nor = [], col = [], idx = []; let base = 0;
  root.traverse(o=>{ if(!o.isMesh || (keep && !keep(o))) return; const g = o.geometry; const P = g.attributes.position, N = g.attributes.normal; const c = o.material.color || new THREE.Color(1,1,1);
    const M = o.matrixWorld, NM = new THREE.Matrix3().getNormalMatrix(M), v = new THREE.Vector3();
    for(let i=0;i<P.count;i++){ v.fromBufferAttribute(P,i).applyMatrix4(M); pos.push(v.x,v.y,v.z); v.fromBufferAttribute(N,i).applyMatrix3(NM).normalize(); nor.push(v.x,v.y,v.z); col.push(c.r,c.g,c.b); }
    if(g.index) for(let i=0;i<g.index.count;i++) idx.push(base + g.index.getX(i)); else for(let i=0;i<P.count;i++) idx.push(base+i);
    base += P.count; });
  const G = new THREE.BufferGeometry(); G.setAttribute('position', new THREE.Float32BufferAttribute(pos,3)); G.setAttribute('normal', new THREE.Float32BufferAttribute(nor,3)); G.setAttribute('color', new THREE.Float32BufferAttribute(col,3)); G.setIndex(idx);
  G.computeBoundingSphere(); return G;
}
// --- load every model file once
const FILES = ['pac','ballboy','crowd','ghost','creatures','props','story'];
let cache = null;
function loadAll(base='assets/'){
  if(cache) return cache; const L = new THREE.GLTFLoader(); const M = {};
  cache = Promise.all(FILES.map(f=>new Promise(res=>{ L.load(base+f+'.glb', g=>{ M[f] = g.scene; res(); }, undefined, e=>{ console.warn('model missing', f, e); res(); }); }))).then(()=>M);
  return cache;
}
const node = (root, name) => root.getObjectByName(name.replace(/[\[\]\.:\/]/g,''));
// --- a playable character: clone the GLB hierarchy; its nodes are the bones
function character(M, key, opt={}){
  const src = M[key==='pac'?'pac':'ballboy']; if(!src) return null;
  const root = new THREE.Group(), body = src.getObjectByName(key==='pac'?'pac':'ballboy').clone(true); root.add(body);
  if(opt.tint) body.traverse(o=>{ if(o.isMesh && o.material.name && o.material.name.includes(opt.tintMat||'jacket')) o.material = o.material.clone(), o.material.color.set(opt.tint); });
  const mats = inkify(body, {outline:opt.outline ?? 0.022});
  const p = key==='pac' ? 'pac.' : 'bb.'; const B = {};   // the bones (v0.9: + forearms, Pac's elbows)
  for(const n of ['hips','body','head','jawU','jawL','armL','armR','foreL','foreR','handL','handR','legL','legR','footL','footR']){ const o = node(body, p+n); if(o){ B[n] = o; o.userData.rest = {p:o.position.clone(), r:o.rotation.clone()}; } }
  if(!B.head) B.head = B.jawU || B.body;
  // story-only pieces (Pac's leather jacket + shades) start hidden; the intro switches them on
  const extras = {}; for(const n of ['leatherB','leatherL','leatherR','shades']){ const o = node(body, p+n); if(o){ o.visible = !!opt.story; extras[n] = o; } }
  const rig = {root, bones:B, mats, extras, kind:key==='pac'?'pac':'bb', height:key==='pac'?2.35:2.0, jawU:B.jawU, jawL:B.jawL,
    anchors:{headpiece:key==='pac' ? (B.jawU||B.head) : B.head, chest:B.body, gloveL:B.handL, gloveR:B.handR, weaponR:B.handR, bootL:B.footL, bootR:B.footR},
    p: key==='pac' ? {legLen:1.0, armLen:0.7, headR:0.27, bodyY:B.body?B.body.position.y:0.38} : {legLen:0.82, armLen:0.62, headR:0.3, bodyY:B.body?B.body.position.y:0.42}};
  return rig;
}
// --- pieces for crowds/props: returns a fresh inked clone of a named node
function piece(M, file, name, opt={}){ const src = M[file] && node(M[file], name); if(!src) return null; const o = src.clone(true); o.position.set(0,0,0); inkify(o, opt); return o; }
function rawPiece(M, file, name){ const src = M[file] && node(M[file], name); if(!src) return null; const o = src.clone(true); o.position.set(0,0,0); o.rotation.set(0,0,0); return o; }
function showcase(M){
  const out = [];
  const add = (key, label, obj, h) => { if(obj) out.push({key, label, obj, h}); };
  const pac = character(M, 'pac'); if(pac) add('pac', 'PAC', pac.root);
  const bb = character(M, 'ballboy'); if(bb) add('ballboy', 'BALL BOY', bb.root);
  for(const [n,l] of [['crowd.raver','RAVER'],['crowd.dancer','DANCER'],['crowd.bouncer','BOUNCER'],['crowd.bro','BRO']]){ const o = piece(M,'crowd',n); add(n.split('.')[1], l, o); }
  // v0.9: the seven ghost faces, each on a body in its colour
  for(const [t,c] of [['red',0xc0453f],['green',0x4aa860],['blue',0x4a7fd0],['purple',0x8a5ac8],['orange',0xd88a3a],['teal',0x3aa8a0],['black',0x3a3a44]]){ const g = piece(M,'ghost','ghost.body'); if(!g) continue;
    g.traverse(o=>{ if(o.isMesh && o.material.uniforms && o.material.userData.base && o.material.userData.base.r>0.9) o.material.uniforms.uTint.value.set(c); });
    const f = piece(M,'ghost','ghost.face.'+t, {outline:0.012}); if(f) g.add(f); add('ghost_'+t, t.toUpperCase(), g); }
  for(const [n,l] of [['cre.cindercub','CINDERCUB'],['cre.splashpup','SPLASHPUP'],['cre.voltmoth','VOLTMOTH'],['cre.bramblebud','BRAMBLEBUD']]) add(n.split('.')[1], l, piece(M,'creatures',n));
  for(const [n,l] of [['story.emperor','THE EMPEROR'],['story.baron','BARON KABOOM'],['story.chrome','CHROME GUY'],['story.qwing','Q-WING'],['story.moon','QUARTER MOON'],['story.arcade','ARCADE PLANET']]) add(n.split('.')[1], l, piece(M,'story',n));
  return out;
}
window.LOOK = {hatchU, hatchMat, outlineMat, inked, inkify, mergeColored, loadAll, character, piece, rawPiece, node, showcase, tick:t=>{ hatchU.uTime.value = t; }, LIGHT_DIR};
})();
