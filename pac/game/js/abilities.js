// PAC v0.9 — abilities.js. Abilities are DATA. Brent's rulings (2026-10-21):
//  · 3 ACTIVE buttons (L-click / R-click / E · phone A / B / C) + 3 PASSIVES (fire by themselves) + the movement ability (Space · phone swipe).
//  · A run holds at most 6 abilities. Once a side is full, a new one only comes as a SWAP on the spot — it loses all that slot's upgrades.
//  · Upgrades are random on level-up, mixed with stats and perks. Pac-themed names, dark and twisted.
//  · Every ability belongs to one of the game's 7 colours (elements), and its effects look like that element.
// Ladder: L1 movement → L2 pick a passive (Brent's three) → L3 pick an active (Brent's defensive three) → L4 pick an active
// (Brent's offensive three) → L5-25 a random mix: new abilities while slots are free, upgrades, stats, perks, swaps.
// v0.9 (Brent: "hard to aim", "you have to get way too close", "we have to push way too many buttons"):
//  · actives AUTO-CAST at the best target when ready (Ball Boy first); a press still fires one early, aimed by you
//  · the early kit chases its targets from about twice as far: Number Twos are lobbed at them, Pellet Puke homes in,
//    Shank Hands are thrown like boomerangs; Rage Quit, Dead Drop and Unhinged reach further
//  · Ball Boy unlocks his creatures one at a time, like Pac's ladder
"use strict";
// ---------- the 7 colours as elements (same order as the ghost colours / stats) ----------
const EL = {
  fire:  {col:0xff5a1a, acc:0xffd040, ghost:'red',    label:'FIRE'},
  toxic: {col:0x6cff3a, acc:0xd8ff8a, ghost:'green',  label:'TOXIC'},
  frost: {col:0x5ab4ff, acc:0xe4f6ff, ghost:'blue',   label:'FROST'},
  void:  {col:0xa45cff, acc:0xff6ad8, ghost:'purple', label:'VOID'},
  shock: {col:0xffb020, acc:0xfff3a0, ghost:'orange', label:'SHOCK'},
  nature:{col:0x22d6a0, acc:0xb8ff60, ghost:'teal',   label:'NATURE'},
  shadow:{col:0x7a3aa8, acc:0xff3050, ghost:'black',  label:'SHADOW'}};
const ABIL = {
  // ---------- PASSIVES ----------
  numbertwo:{side:'pas', who:'pac', el:'toxic', ic:'💩', name:'Number Twos', d:'Forty years of nothing but pellets. Lobs a toxic dump at the nearest threat — it lands, swells, then blows.', cd:1.6, dmg:22, rad:3.3, range:12},
  puke:     {side:'pas', who:'pac', el:'fire',  ic:'🤮', name:'Pellet Puke', d:'Ate a ghost pepper on a dare. Spits flaming half-chewed pellets that chase whatever is closest.', cd:0.5, dmg:7, range:13, arc:0.5},
  shank:    {side:'pas', who:'pac', el:'shadow',ic:'🔪', name:'Shank Hands', d:'Prison habits. Flings two shivs at the nearest threat — they cut through everything, out and back like boomerangs.', cd:1.1, dmg:15, len:9},
  habit:    {side:'pas', who:'all', el:'shock', ic:'🟠', name:'Pellet Habit', d:'He can\'t quit. Flicks homing pellets at the nastiest thing nearby.', cd:1.0, dmg:10},
  pepper:   {side:'pas', who:'all', el:'fire',  ic:'🌶️', name:'Ghost Peppers', d:'Burning peppers circle him. Anything that touches them regrets lunch.', cd:0, dps:24},
  coldturkey:{side:'pas',who:'pac', el:'frost', ic:'🧊', name:'Cold Turkey', d:'Quitting is ugly. A freezing aura slows and frost-bites everything that gets close.', cd:0.5, dps:12, rad:4.2},
  tilt:     {side:'pas', who:'all', el:'shock', ic:'⚡', name:'Tilt', d:'Bangs the machine. Lightning jumps from ghost to ghost.', cd:1.6, dmg:13, req:3, cost:180},
  exwife:   {side:'pas', who:'pac', el:'void',  ic:'👻', name:'Ghost Ex-Wife', d:'She died, she came back, and she still hates everyone more than him. Hunts for you.', cd:0, dps:20, req:6, cost:350},
  bonusball:{side:'pas', who:'pac', el:'void',  ic:'🎱', name:'Bonus Ball', d:'Launches a steel ball that ricochets off walls and through ghosts.', cd:4.5, dmg:16},
  lawn:     {side:'pas', who:'all', el:'nature',ic:'🌿', name:'Get Off My Lawn', d:'Thorns sprout wherever he walks. Kids hate it. Ghosts hate it more.', cd:0.25, dps:14, req:4, cost:240},
  cherry:   {side:'pas', who:'all', el:'fire',  ic:'🍒', name:'Cherry Bombs', d:'He\'s done eating your fruit salad. Lobs cherries that burst and slow.', cd:2.4, dmg:16, rad:3.4, req:2, cost:120},
  bramble:  {side:'pas', who:'ballboy', el:'nature', ic:'🌱', name:'Bramblebud', d:'Bramblebud pops out by the biggest crowd, roots it in place and stabs it with thorns.', cd:7},
  // ---------- ACTIVES ----------
  insurance:{side:'act', who:'pac', el:'void',  ic:'🫧', name:'Life Insurance', d:'A bubble soaks hits for 5 s, then the policy pays out: most of it back as health.', cd:9, absorb:70, dur:5},
  ragequit: {side:'act', who:'pac', el:'shock', ic:'💢', name:'Rage Quit', d:'Flips the table. A lightning blast all around him shoves everything back.', cd:5, dmg:36, rad:10, knock:8},
  deaddrop: {side:'act', who:'pac', el:'shadow',ic:'🪦', name:'Dead Drop', d:'Leaps onto Ball Boy or the thickest crowd (or where you aim) — untouchable in the air — and lands like a coffin lid.', cd:5.5, dmg:42, rad:5.5, dist:11},
  binge:    {side:'act', who:'pac', el:'fire',  ic:'🔴', name:'Power Pellet Binge', d:'Swallows a power pellet whole. Goes huge for 6 s, sucks ghosts in and eats everything he touches.', cd:16, dur:6, dps:90},
  unhinged: {side:'act', who:'pac', el:'shadow',ic:'🦷', name:'Unhinged', d:'His jaw comes off the hinge. Lunges at the nearest threat and swallows the whole cone in front of him.', cd:3.2, dmg:78, range:12, arc:2.1},
  glitter:  {side:'act', who:'pac', el:'toxic', ic:'✨', name:'Toxic Glitter', d:'6 s of top speed, trailing a glitter cloud that eats through the swarm.', cd:12, dur:6, dps:34},
  repo:     {side:'act', who:'pac', el:'void',  ic:'💀', name:'Repo Ghosts', d:'Five repossessed souls home in on the biggest threats and pop.', cd:6, dmg:34, n:5, req:5, cost:300},
  fruitsalad:{side:'act',who:'all', el:'fire',  ic:'🍉', name:'Fruit Salad Massacre', d:'Eight homing fruit. He\'s done eating it — now it\'s eating them.', cd:7, dmg:26, n:8, req:7, cost:420},
  killscreen:{side:'act',who:'pac', el:'shock', ic:'👾', name:'Kill Screen', d:'The level-256 glitch: everything in the half of the screen you aim at gets scrambled.', cd:14, dmg:85},
  coldopen: {side:'act', who:'all', el:'frost', ic:'❄️', name:'Cold Open', d:'Freezes everything around him solid for 2.5 s.', cd:10, dmg:22, rad:8, stun:2.5, req:8, cost:480},
  posse:    {side:'act', who:'pac', el:'shadow',ic:'⚰️', name:'Ghost Posse', d:'Four dead buddies hunt with him for 10 s.', cd:20, n:4, dur:10, dps:30},
  notonlist:{side:'act', who:'all', el:'nature',ic:'🚫', name:'Not On The List', d:'Bouncer shove: a wide cone of everything goes flying.', cd:3.5, dmg:22, range:7, arc:1.6, knock:14},
  smokebreak:{side:'act',who:'pac', el:'shadow',ic:'🚬', name:'Smoke Break', d:'Lights up. Ghosts inside the cloud go slow and stupid.', cd:10, rad:6, dur:4},
  // Ball Boy unlocks these one at a time (v0.9): each throws a creature that does one move and comes back
  hottake:  {side:'act', who:'ballboy', el:'fire',  ic:'🔥', name:'Hot Take', d:'Cindercub lands by the nearest threat (or where you aim) and breathes fire on it.', cd:4.5},
  splashzone:{side:'act',who:'ballboy', el:'frost', ic:'💧', name:'Splash Zone', d:'Splashpup lands where you aim and blasts a wave that shoves everything back.', cd:6},
  jolt:     {side:'act', who:'ballboy', el:'shock', ic:'⚡', name:'Jolt', d:'Voltmoth flutters to Ball Boy or the biggest crowd and zaps it stiff.', cd:6.5}};
const MOVES = {warp:{name:'Warp Tunnel', ic:'🌀', d:'Blink a few metres — through ghosts, crowds and anything thin.', cost:20, cd:2, dist:8},
               peaceout:{name:'Peace Out', ic:'👟', d:'A quick dash. Untouchable while you dash.', cost:15, cd:2.2, dist:7}};
const STATUP = {hp:{n:'+20 Max Health', ic:'❤️'}, spd:{n:'+6% Move Speed', ic:'👟'}, dmg:{n:'+10% Damage', ic:'🗡️'}, cdr:{n:'-8% Cooldowns', ic:'⏱️'}, area:{n:'+12% Area', ic:'⭕'},
  pick:{n:'+30% Pickup Range', ic:'🧲'}, regen:{n:'+50% Energy Regen', ic:'🔋'}, armor:{n:'-6% Damage Taken', ic:'🧱'}, crit:{n:'+5% Crit Chance', ic:'🎯'}, heal:{n:'+1 HP/s Regen', ic:'🩹'}};
const PERKS = {multishot:{n:'Extra Pellet', ic:'➕', d:'+1 projectile on everything that shoots.'}, lifesteal:{n:'Leech', ic:'🩸', d:'Heal 2% of the damage you deal.'},
  overkill:{n:'Overkill', ic:'💥', d:'Kills explode and hurt what\'s next to them.'}, thick:{n:'Thick Skin', ic:'🪨', d:'-10% damage taken, and you barely get knocked around.'}};
const TALENTS = {Glutton:['+5% pickup range','+10 max health','+1 HP/s regen','Eating dots heals'], Brawler:['+5% damage','-4% damage taken','+5% crit','Bigger bites'], 'Ghost Buster':['+10% XP','Blue orb lasts longer','+8% speed','Eat chains score more']};
// run XP (v0.8: quicker than v0.7 — Brent found it a little slow)
// v0.10 (Brent: "they can level past 25"): the run level goes to 60; past 25 the steps grow gently
const RUN_CAP = 60, RANK_MAX = 7;   // an ability has 8 levels like a Vampire Survivors weapon: the pick plus 7 rank-ups
const XPC = [0]; for(let L=1; L<=RUN_CAP; L++){ const inc = L===1?25 : L===2?45 : L===3?70 : L===4?95 : L<=25 ? 85 + (L-5)*20 : 485 + (L-25)*30; XPC.push(XPC[L-1]+inc); }
const shopList = () => Object.keys(ABIL).filter(k=>ABIL[k].req);
// which abilities can show up for this hero (bought shop abilities only for the player's Pac)
function canGet(h, k){ const A = ABIL[k]; if(A.who !== 'all' && A.who !== h.char) return false;
  // v0.10: the Poke Bro only gets his own creature moves (his full set to 25 is being written)
  if(h.char==='ballboy' && A.who==='all') return false; if(A.req && h.isPlayer && h.char==='pac' && !SAVE.pac.bought.includes(k)) return false; if(A.req && h.isPlayer && h.char!=='pac') return false; return true; }

function applyLoadout(h){ // Pac's out-of-game loadout: stats and talents (v0.10: gear removed — Brent: "too complex for this system")
  if(!(h.isPlayer && h.char==='pac')) return; const st = SAVE.pac.stats, m = h.mods;
  m.dmg *= 1 + 0.02*(st.Strength||0); h.maxhp += 6*(st.Vitality||0); m.regen *= 1 + 0.06*(st.Spirit||0); m.cdr *= Math.pow(0.98, st.Intellect||0);
  m.speed *= 1 + 0.015*(st.Agility||0); m.area *= 1 + 0.02*(st.Speciality||0); m.pickup *= 1 + 0.05*(st.Nature||0);
  const T = SAVE.pac.talents, has = (tree,i)=>T[tree+i];
  if(has('Glutton',0)) m.pickup *= 1.05; if(has('Glutton',1)) h.maxhp += 10; if(has('Glutton',2)) m.hpRegen += 1;
  if(has('Brawler',0)) m.dmg *= 1.05; if(has('Brawler',1)) m.armor += 0.04; if(has('Brawler',2)) m.crit += 0.05; if(has('Ghost Buster',2)) m.speed *= 1.08;
  h.hp = h.maxhp;
}
const xpMult = h => (h.buff.xp>0?2:1) * (h.isPlayer && h.char==='pac' && SAVE.pac.talents['Ghost Buster0'] ? 1.1 : 1);
function gainXP(h, n){ if(!h || h.level >= RUN_CAP) return; h.xp += n*xpMult(h); while(h.level < RUN_CAP && h.xp >= XPC[h.level+1]){ h.level++; onLevel(h); } }
const pendingLv = [];
function onLevel(h){ burst(h.x,1,h.z,0xffe14d,60,11);
  if(h.isPlayer){ levelBurst(h); if(h.level>4 && Math.random()<0.3) heroSay(h,'level'); pendingLv.push(h.level); if(state==='play') setTimeout(()=>{ if(state==='play') openJack(); }, 420); }
  else { const o = offersFor(h); if(o.length) applyChoice(h, pick(o)); } }
const held = h => [...h.act, ...h.pas].filter(Boolean);
const freeSlot = (h, side) => (side==='act' ? h.act : h.pas).indexOf(null);
function offersFor(h){
  if(!h.moveOk) return [{kind:'move'}];
  // the fixed ladder (Brent's picks): the 1st passive, then the 1st and 2nd actives, come from set lists of three
  const C = CHARS[h.char], nPas = h.pas.filter(Boolean).length, nAct = h.act.filter(Boolean).length;
  if(C.ladder){ let pSeen = 0, aSeen = 0;
    for(const [side, list] of C.ladder){ const have = side==='pas' ? nPas : nAct, idx = side==='pas' ? pSeen++ : aSeen++;
      const left = list.filter(k=>!held(h).includes(k));   // v0.9: Ball Boy's ladder offers the same three creatures until he has them all
      if(have === idx && freeSlot(h, side) >= 0 && left.length) return left.map(k=>({kind:'ab', k})); } }
  return randomOffers(h);
}
// the level-up mix: new abilities while there's room, random upgrades of what you hold, stats, perks — and swaps once a side is full
function randomOffers(h){
  const c = [], hk = held(h);
  for(const side of ['pas','act']){ const full = freeSlot(h, side) < 0;
    for(const k in ABIL){ const A = ABIL[k]; if(A.side !== side || hk.includes(k) || !canGet(h,k)) continue;
      if(!full) c.push({kind:'ab', k, w:1.5});
      else { const list = side==='act' ? h.act : h.pas; let tgt = 0; for(let i=1;i<3;i++) if((h.rank[list[i]]||0) < (h.rank[list[tgt]]||0) || ((h.rank[list[i]]||0) === (h.rank[list[tgt]]||0) && Math.random()<0.5)) tgt = i;
        c.push({kind:'swap', k, slot:tgt, w:0.9}); } } }
  // v0.10 weights (Brent: "a good chance to rank up into those abilities multiple times rather than choosing new ones";
  // "not everything is a new ability — sometimes stats, buffs"): rank-ups lead, new abilities are rarer, stats show up often
  for(const k of hk) if((h.rank[k]||0) < RANK_MAX) c.push({kind:'rank', k, w:5.0});
  for(const s in STATUP) c.push({kind:'stat', k:s, w:h.level > 25 ? 1.6 : 0.8});
  for(const p in PERKS) if(!h.perk[p]) c.push({kind:'perk', k:p, w:0.7});
  const out = []; const nOf = kd => out.filter(o=>o.kind===kd).length;
  while(out.length < 3 && c.length){ const tot = c.reduce((a,b)=>a+b.w,0); let r = Math.random()*tot, i = 0; for(;i<c.length;i++){ r -= c[i].w; if(r<=0) break; }
    const o = c.splice(Math.min(i,c.length-1),1)[0];
    if((o.kind==='swap' && nOf('swap')) || (o.kind==='stat' && nOf('stat')) || (o.kind==='perk' && nOf('perk')) || (o.kind==='ab' && nOf('ab') >= 2)) continue;   // variety: never three of a kind
    out.push(o); }
  return out;
}
function clearSlotFx(h, k){ if(k==='coldturkey' && h.fx.cold){ scene.remove(h.fx.cold); h.fx.cold = null; } if(k==='pepper' && h.fx.orb){ h.fx.orb.forEach(o=>scene.remove(o)); h.fx.orb = []; }
  if(k==='exwife') for(let i=ALLIES.length-1;i>=0;i--) if(ALLIES[i].owner===h && !ALLIES[i].temp){ scene.remove(ALLIES[i].g); ALLIES.splice(i,1); } }
const KEYS = () => isMobile ? ['A','B','C'] : ['left click','right click','E'];
function applyChoice(h, o){
  if(o.kind==='move'){ h.moveOk = true; if(h.isPlayer) toast('learn:move', `${MOVES[CHARS[h.char].move].name}: ${isMobile?'swipe on the right side of the screen':'press SPACE'}. Ghosts are on their way — and look out for the blue orb.`); }
  else if(o.kind==='ab'){ const A = ABIL[o.k], list = A.side==='act' ? h.act : h.pas, i = list.indexOf(null); if(i < 0) return; list[i] = o.k;
    if(h.isPlayer) toast('learn:'+o.k, A.side==='pas' ? `${A.name}: it fights on its own.` : `${A.name} is on ${KEYS()[i]}. ${SAVE.set.autoCast ? 'It fires by itself when it\'s ready — press it to fire early'+(isMobile?', or drag it to aim':'')+'.' : (isMobile?'It aims itself.':'')}`, 3600); }
  else if(o.kind==='swap'){ const A = ABIL[o.k], list = A.side==='act' ? h.act : h.pas, old = list[o.slot]; if(old){ clearSlotFx(h, old); delete h.rank[old]; } list[o.slot] = o.k; delete h.rank[o.k];
    if(h.isPlayer) toast(null, `${A.name} replaced ${old?ABIL[old].name:'it'}${A.side==='act'?' on '+KEYS()[o.slot]:''}. Its upgrades are gone.`, 3600); }
  else if(o.kind==='rank'){ h.rank[o.k] = (h.rank[o.k]||0)+1; }
  else if(o.kind==='perk'){ h.perk[o.k] = 1; if(o.k==='thick') h.mods.armor = Math.min(0.6, h.mods.armor+0.1); }
  else if(o.kind==='stat'){ const m = h.mods; ({hp:()=>{ h.maxhp += 20; h.hp += 20; }, spd:()=>m.speed*=1.06, dmg:()=>m.dmg*=1.1, cdr:()=>m.cdr*=0.92, area:()=>m.area*=1.12, pick:()=>m.pickup*=1.3,
    regen:()=>m.regen*=1.5, armor:()=>m.armor=Math.min(0.6, m.armor+0.06), crit:()=>m.crit+=0.05, heal:()=>m.hpRegen+=1})[o.k](); }
  if(h.isPlayer) buildSkillHud();
}
const cdOf = (h,k) => (ABIL[k].cd||1) * h.mods.cdr * Math.pow(0.92, h.rank[k]||0) / (h.buff.cd>0?1.4:1);
const dmgOf = (h,k,base) => base * h.mods.dmg * (1 + 0.25*(h.rank[k]||0)) * (h.buff.dmg>0?1.25:1);
const areaOf = (h,k,base) => base * h.mods.area * (1 + 0.1*(h.rank[k]||0));
const shots = (h, n) => n + (h.perk.multishot ? 1 : 0);

// ---------------- element effects: every colour has its own look and sound ----------------
function elBurst(el, x, y, z, n=24, spd=8){ const E = EL[el]; if(!E) return burst(x,y,z,0xffffff,n,spd);
  if(el==='fire'){ burst(x,y,z,E.col,n,spd,6,0.55); puff(x,y,z,E.acc,Math.ceil(n/3),1.2); }
  else if(el==='toxic'){ puff(x,y*0.6,z,E.col,Math.ceil(n/2),1.6); burst(x,y,z,E.acc,Math.ceil(n/2),spd*0.6,10,0.6); }
  else if(el==='frost'){ burst(x,y,z,E.acc,n,spd*1.3,22,0.4); puff(x,0.4,z,E.col,Math.ceil(n/3),1.8); }
  else if(el==='void'){ burst(x,y,z,E.col,n,spd*0.8,-2,0.7); burst(x,y,z,E.acc,Math.ceil(n/3),spd*1.4,4,0.4); ringFx(x, z, 3, E.col, 0.4, 0.3, true); }
  else if(el==='shock'){ burst(x,y,z,E.acc,n,spd*1.5,0,0.25); for(let i=0;i<3;i++){ const a = Math.random()*6.28, r = rnd(1.5,3.5); zapLine(x, z, x+Math.cos(a)*r, z+Math.sin(a)*r, E.col, y); } }
  else if(el==='nature'){ burst(x,y,z,E.col,n,spd*0.8,8,0.7); burst(x,y,z,E.acc,Math.ceil(n/3),spd*0.5,4,0.9); }
  else if(el==='shadow'){ puff(x,y,z,E.col,Math.ceil(n/2),1.4); burst(x,y,z,E.acc,Math.ceil(n/3),spd,8,0.45); } }
const elRing = (el, x, z, r, life=0.45, implode=false) => ringFx(x, z, r, (EL[el]||EL.shock).col, life, 0.25, implode);

// ---------------- targets + damage ----------------
const ENEMY = {0:[], 1:[]};
function buildTargets(){ ENEMY[0].length = 0; ENEMY[1].length = 0; for(const g of G) if(!g.dead){ ENEMY[0].push(g); ENEMY[1].push(g); }
  for(const h of HEROES) if(!h.dead) ENEMY[1-h.team].push(h); if(BOSS && BOSS.alive && BOSS.awake) ENEMY[0].push(BOSS); }
const threat = e => e.kind==='boss'?6 : e.kind==='hero'?4 : e.big?3 : 1;
function priority(h, range, cone, ang){ let best = null, bs = -1; const fa = ang!=null ? ang : h.face;
  for(const e of ENEMY[h.team]){ if(e.dead) continue; const dx = e.x-h.x, dz = e.z-h.z, d = hyp(dx,dz); if(d > range) continue;
    if(cone && Math.abs(angDiff(fa, Math.atan2(dx,dz))) > cone) continue; const s = threat(e)/(d+4); if(s > bs){ bs = s; best = e; } } return best; }
function nearest(h, range){ let best = null, bd = range; for(const e of ENEMY[h.team]){ if(e.dead) continue; const d = hyp(e.x-h.x, e.z-h.z); if(d < bd){ bd = d; best = e; } } return best; }
function nearestFrom(team, x, z, range){ let best = null, bs = -1; for(const e of ENEMY[team]){ if(e.dead) continue; const d = hyp(e.x-x, e.z-z); if(d > range) continue; const s = threat(e)/(d+3); if(s > bs){ bs = s; best = e; } } return best; }
// v0.9: the best target — Ball Boy first (Brent), else the most dangerous thing in range
const bossNear = (h, r) => BOSS && BOSS.alive && BOSS.awake && h.team===0 && hyp(BOSS.x-h.x, BOSS.z-h.z) < r ? BOSS : null;
function bestTarget(h, range){ return bossNear(h, range) || priority(h, range); }
function countNear(h, x, z, r){ let n = 0; for(const e of ENEMY[h.team]) if(!e.dead && hyp(e.x-x, e.z-z) < r) n++; return n; }
// the thickest crowd in range: the enemy with the most others around it
function cluster(h, range, r=4.5){ let best = null, bn = 0; for(const e of ENEMY[h.team]){ if(e.dead || hyp(e.x-h.x, e.z-h.z) > range) continue; let n = 0; for(const f of ENEMY[h.team]) if(!f.dead && hyp(f.x-e.x, f.z-e.z) < r) n++; if(n > bn){ bn = n; best = e; } } return best ? {e:best, n:bn} : null; }
// aim assist for cones: snap to the most dangerous thing within `tol` of where you aim
function aimAssist(h, ang, range, tol=0.55){ const t = priority(h, range, tol, ang); return t ? Math.atan2(t.x-h.x, t.z-h.z) : ang; }
function hit(e, amount, h, o={}){
  if(!e || e.dead) return; const crit = !!h && Math.random() < h.mods.crit, d = amount*(crit?2:1);
  const fx = o.fx!=null ? o.fx : (h?h.x:e.x), fz = o.fz!=null ? o.fz : (h?h.z:e.z);
  if(h && h.perk && h.perk.lifesteal && h.isPlayer) h.hp = Math.min(h.maxhp, h.hp + d*0.02);
  if(e.kind==='ghost'){ e.hp -= d; e.hitT = 0.09; e.hitEl = o.el || e.hitEl; if(o.knock) knock(e, fx, fz, o.knock*(e.big?0.3:1)); if(o.slow) e.slowT = Math.max(e.slowT, o.slow); if(o.stun){ e.stunT = Math.max(e.stunT, o.stun*(e.big?0.4:1)); if(o.freeze) e.frozenT = e.stunT; }
    if(o.eat && !e.big && h) { killGhost(e, h, true); return; } if(e.hp <= 0) killGhost(e, h, false); }
  else if(e.kind==='hero'){ hurtHero(e, d, h); if(o.knock) knock(e, fx, fz, o.knock*0.5); if(o.stun) e.stunT = Math.max(e.stunT, o.stun*0.4); if(o.slow) e.slowT = Math.max(e.slowT, o.slow); }
  else if(e.kind==='boss'){ bossDamage(d); }
  if(e.kind!=='hero') addDn(e, d, crit);
}
function knock(e, fx, fz, f){ if(e.kind==='hero' && e.perk && e.perk.thick) f *= 0.3; const dx = e.x-fx, dz = e.z-fz, d = hyp(dx,dz)||1; e.kvx = (e.kvx||0) + dx/d*f*2.2; e.kvz = (e.kvz||0) + dz/d*f*2.2; }
function areaHit(h, x, z, r, dmg, o={}){
  popNear(x, z, r, h);   // v0.10: blasts pop balloons
  for(const e of ENEMY[h.team]) if(!e.dead && hyp(e.x-x, e.z-z) < r + (e.r||0.6)) hit(e, dmg, h, Object.assign({fx:x, fz:z}, o));
  for(let i=CIV.length-1;i>=0;i--){ const c = CIV[i]; if(hyp(c.x-x, c.z-z) < r){ c.hp -= dmg; c.panic = 2; if(c.hp <= 0) killCiv(i, h); } }
  if(dmg > 4) for(const P of PROPS) if(!P.broken && P.cost>0){ const cx = (P.x0+P.x1)/2, cz = (P.z0+P.z1)/2; if(hyp(cx-x, cz-z) < r*0.8){ P.dmg += dmg; if(P.dmg > 45) breakProp(P, h, false); } }
}
function coneHit(h, x, z, ang, range, arc, dmg, o={}){
  for(const e of ENEMY[h.team]){ if(e.dead) continue; const dx = e.x-x, dz = e.z-z, d = hyp(dx,dz);
    if(d < range + (e.r||0.6) && Math.abs(angDiff(ang, Math.atan2(dx,dz))) < arc/2 + 0.12) hit(e, dmg, h, Object.assign({fx:x, fz:z}, o)); }
  for(let i=CIV.length-1;i>=0;i--){ const c = CIV[i], dx = c.x-x, dz = c.z-z; if(hyp(dx,dz)<range && Math.abs(angDiff(ang, Math.atan2(dx,dz)))<arc/2){ c.hp -= dmg; c.panic = 2; if(c.hp<=0) killCiv(i, h); } } }
let hurtAcc = 0;
function hurtHero(h, d, src){
  if(h.dead || h.iframes > 0 || h.hopT > 0 || h.dashT > 0 || h.grace > 0) return;
  if(h.isPlayer && (!src || src.team !== h.team)) d *= diff().dmg;
  d *= (1 - h.mods.armor);
  if(h.isPlayer) d = Math.min(d, h.maxhp*0.22);       // nothing one-shots you
  if(h.shieldT > 0){ const a = Math.min(h.shieldHP, d); h.shieldHP -= a; h.absorbed += a; d -= a; }
  if(d <= 0) return;
  h.hp -= d; h.hurtT = 0.15; if(h.isPlayer){ addShake(Math.min(0.45, d*0.02)); hurtAcc += d; addDn(h, d, false); if(d > 6) SFX.hurt(); if(h.hp < h.maxhp*0.25 && !h.nearSaid){ h.nearSaid = true; heroSay(h,'near',true); } }
  if(h.hp <= 0) heroDie(h, src);
}

// ---------------- projectiles ----------------
const BOMBS = [], BOLTS = [], LOBS = [], TRAILS = [], ALLIES = [], PINBALLS = [];
const boltGeo = new THREE.IcosahedronGeometry(0.2,1), lobGeo = new THREE.SphereGeometry(0.36,12,8), ballGeo = new THREE.SphereGeometry(0.4,16,12), unitCircle = new THREE.CircleGeometry(1, 16);
let lobMat = null, ballMat = null;
let poopGeo = null;
function poopModel(){ if(!poopGeo){ const g = new THREE.Group(), m = LOOK.hatchMat(0x6b5a22, {emit:0x0a2a00}); [[0.42,0.14],[0.32,0.38],[0.2,0.58]].forEach(([r,y],i)=>{ const t = LOOK.inked(new THREE.TorusGeometry(r*0.7, r*0.42, 10, 18), m, 0.03); t.rotation.x = Math.PI/2; t.position.y = y; g.add(t); });
  const tip = LOOK.inked(new THREE.ConeGeometry(0.14, 0.25, 10), m, 0.03); tip.position.y = 0.78; g.add(tip); g.add(at(glow(0x6cff3a, 2.2, 0.5), 0, 0.4, 0)); poopGeo = g; } return poopGeo.clone(); }
// o: {turn (homing rad/s), boom (explode radius), el, size, mesh, delay (fly straight first), y}
function fireBolt(h, tg, dmg, spd, spread, col=0xfff3c8, life=1.3, homing=true, pierce=0, o={}){
  const m = o.mesh || new THREE.Mesh(boltGeo, neonMat(col)); if(o.size) m.scale.setScalar(o.size/0.2); m.add(glowS(col, o.size ? o.size*8/(o.size/0.2) : 1.6, 0.8)); m.position.set(h.x, o.y||1.0, h.z); scene.add(m);
  const a = (o.ang!=null ? o.ang : tg ? Math.atan2(tg.x-h.x, tg.z-h.z) : Math.atan2(h.ax, h.az)) + spread;
  BOLTS.push({m, vx:Math.sin(a)*spd, vz:Math.cos(a)*spd, life, half:life/2, dmg, owner:h, tg:homing?tg:null, homing, hitSet:new Set(), pierce, turn:o.turn||6, boom:o.boom||0, el:o.el, delay:o.delay||0, col, boomer:!!o.boomer, backT:0}); }
// a shiv for Shank Hands: a flat blade that spins on its way out and back
const shivGeo = new THREE.ConeGeometry(0.13, 0.9, 4); shivGeo.rotateX(Math.PI/2);
const shivMesh = () => new THREE.Mesh(shivGeo, neonMat(0xff3050));
function lob(h, tx, tz, o){ if(!lobMat) lobMat = LOOK.hatchMat(0xd02a3a); const m = new THREE.Mesh(lobGeo, lobMat); m.add(glowS(0xff3b5c, 2, 0.8)); scene.add(m);
  LOBS.push(Object.assign({m, x0:h.x, z0:h.z, x1:tx, z1:tz, f:0, owner:h}, o)); }
function addTrail(h, x, z, rad, life, dps, col, puffy){ const m = new THREE.Mesh(unitCircle, new THREE.MeshBasicMaterial({color:new THREE.Color(col).multiplyScalar(1.3), transparent:true, opacity:0.45, blending:THREE.AdditiveBlending, depthWrite:false}));
  m.scale.set(rad, rad, 1); m.rotation.x = -Math.PI/2; m.position.set(x, 0.07, z); scene.add(m); TRAILS.push({m, x, z, rad, life, max:life, dps, owner:h, col, puffy}); }
function aimAngle(h){ return Math.atan2(h.ax, h.az); }
let skullProto = null;
function skullMesh(){ if(!skullProto){ const b = LOOK.rawPiece(MODELS,'ghost','ghost.body'), e = LOOK.rawPiece(MODELS,'ghost','ghost.eyes'); skullProto = new THREE.Group();
    if(b){ LOOK.inkify(b, {outline:0.04}); b.traverse(o=>{ if(o.isMesh && o.material.uniforms && o.material.uniforms.uTint){ o.material.uniforms.uTint.value.set(0xc8a0ff); o.material.uniforms.uEmit.value.set(0x3a1060); } }); skullProto.add(b); } if(e) skullProto.add(e); skullProto.scale.setScalar(0.42); }
  return skullProto.clone(); }

// ---------------- per-hero runtime: passives fire themselves, actives keep running ----------------
function runPassive(h, k, dt){
  const A = ABIL[k]; if(h.cd[k]==null) h.cd[k] = 0.6; const E = EL[A.el];
  if(k==='pepper'){ h.fx.orb = h.fx.orb || []; const n = 2 + Math.floor((h.rank[k]||0)/2); while(h.fx.orb.length < n){ const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.ConeGeometry(0.22,0.7,10), neonMat(0xff3a10)), glow(0xff7a20,2.6,0.8)); g.children[0].rotation.z = Math.PI/2; scene.add(g); h.fx.orb.push(g); }
    const R = 3.2*h.mods.area; h.fx.orb.forEach((o,i)=>{ const a = gt*3 + i/h.fx.orb.length*6.283; o.position.set(h.x+Math.cos(a)*R, 1, h.z+Math.sin(a)*R); o.rotation.y = -a; if(Math.random()<0.25) burst(o.position.x, 1, o.position.z, 0xff9a30, 1, 2, -2, 0.4);
      for(const e of ENEMY[h.team]) if(!e.dead && hyp(e.x-o.position.x, e.z-o.position.z) < 1.1+(e.r||0.6)*0.5) hit(e, dmgOf(h,k,A.dps)*dt, h, {el:'fire'}); }); return; }
  if(k==='coldturkey'){ const R = areaOf(h,k,A.rad); if(!h.fx.cold){ h.fx.cold = new THREE.Mesh(new THREE.RingGeometry(0.75, 1, 48), new THREE.MeshBasicMaterial({color:0x8ad0ff, transparent:true, opacity:0.35, blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide})); h.fx.cold.rotation.x = -Math.PI/2; scene.add(h.fx.cold); }
    h.fx.cold.position.set(h.x, 0.1, h.z); h.fx.cold.scale.setScalar(R*(1+0.04*Math.sin(gt*4))); if(Math.random()<0.5) burst(h.x+rnd(-R,R)*0.7, rnd(0.2,1.4), h.z+rnd(-R,R)*0.7, 0xe4f6ff, 1, 0.6, -0.3, 0.8);
    if(h.cd[k] <= 0){ h.cd[k] = A.cd; areaHit(h, h.x, h.z, R, dmgOf(h,k,A.dps)*A.cd, {slow:0.7, el:'frost'}); } return; }
  if(k==='exwife'){ const want = 1 + Math.floor((h.rank[k]||0)/2), mine = ALLIES.filter(a=>a.owner===h && !a.temp).length; if(mine < want) addAlly(h, false); return; }
  if(h.cd[k] > 0 || h.stunT > 0) return;
  if(k==='numbertwo'){ h.cd[k] = cdOf(h,k); const tg = bestTarget(h, areaOf(h,k,A.range)), m = poopModel(); m.rotation.y = Math.random()*6; scene.add(m);
    if(tg){ m.position.set(h.x, 1, h.z); BOMBS.push({m, x:h.x, z:h.z, x0:h.x, z0:h.z, tg, fly:0, fuse:0.5, owner:h}); }   // v0.9: lobbed at the target, steering after it in the air
    else { const bx = h.x - Math.sin(h.face)*1.1, bz = h.z - Math.cos(h.face)*1.1; m.position.set(bx, floorY(bx, bz), bz); BOMBS.push({m, x:bx, z:bz, fuse:1.0, owner:h}); }
    if(h.isPlayer) SFX.fart(0.15); }
  else if(k==='puke'){ const range = areaOf(h,k,A.range), tg = bestTarget(h, range); if(!tg) return; h.cd[k] = cdOf(h,k); const ang = Math.atan2(tg.x-h.x, tg.z-h.z), n = shots(h, 3);   // v0.9: homing
    for(let j=0;j<n;j++) fireBolt(h, tg, dmgOf(h,k,A.dmg), 18, (j-(n-1)/2)*A.arc/(n-1||1) + rnd(-0.05,0.05), 0xff7a20, range/18*1.5, true, 0, {ang, el:'fire', turn:6, delay:0.06});
    spray(h.x + Math.sin(ang)*0.6, h.z + Math.cos(ang)*0.6, ang, 1.2, A.arc, 0xffb030, 4, 1.4); if(h.isPlayer) tone(260, 0.05, 'sawtooth', 0.02, 0.6); }
  else if(k==='shank'){ const len = areaOf(h,k,A.len), tg = bestTarget(h, len+1); if(!tg) return; h.cd[k] = cdOf(h,k); const ang = Math.atan2(tg.x-h.x, tg.z-h.z), n = shots(h, 2);   // v0.9: boomerang shivs
    for(let j=0;j<n;j++) fireBolt(h, null, dmgOf(h,k,A.dmg), 20, (j%2?1:-1)*0.4*(1+Math.floor(j/2)*0.6), 0xff3050, len/20*2, false, 99, {ang, el:'shadow', mesh:shivMesh(), boomer:true});
    if(h.isPlayer) tone(1300, 0.03, 'triangle', 0.02); }
  else if(k==='habit'){ const tg = priority(h, 18); if(tg){ h.cd[k] = cdOf(h,k); const n = shots(h, 1 + Math.floor((h.rank[k]||0)/2)); for(let j=0;j<n;j++) fireBolt(h, tg, dmgOf(h,k,A.dmg), 20, (j-(n-1)/2)*0.25, 0xffb020, 1.6, true, 0, {el:'shock', turn:7}); if(h.isPlayer) tone(1500, 0.03, 'square', 0.012); } }
  else if(k==='tilt'){ let from = h, any = false; const seen = new Set(), lv = h.rank[k]||0;
    for(let j=0;j<3+lv;j++){ let b = null, bd = 1e9; for(const e of ENEMY[h.team]){ if(e.dead || seen.has(e)) continue; const d = hyp(e.x-from.x, e.z-from.z); if(d < (j?7:14) && d < bd){ bd = d; b = e; } }
      if(!b) break; seen.add(b); zapLine(from.x, from.z, b.x, b.z, 0xffd040); hit(b, dmgOf(h,k,A.dmg), h, {el:'shock', stun:0.15}); from = b; any = true; }
    if(any){ h.cd[k] = cdOf(h,k); if(h.isPlayer) SFX.zap(); } }
  else if(k==='bonusball'){ h.cd[k] = cdOf(h,k); for(let j=0;j<shots(h,1);j++){ const a = aimAngle(h) + j*0.4; if(!ballMat) ballMat = new THREE.MeshStandardMaterial({color:0xeeeeff, metalness:1, roughness:0.1, emissive:0x2a1050}); const m = new THREE.Mesh(ballGeo, ballMat); m.add(glowS(0xa45cff, 2.4, 0.7)); m.position.set(h.x, 0.5, h.z); scene.add(m);
    PINBALLS.push({m, x:h.x, z:h.z, vx:Math.sin(a)*16, vz:Math.cos(a)*16, life:6, owner:h, hitT:new Map()}); } }
  else if(k==='lawn'){ if(hyp(h.vx,h.vz) > 1){ h.cd[k] = A.cd; addTrail(h, h.x, h.z, 1.3*h.mods.area, 2.5, dmgOf(h,k,A.dps), 0x22d6a0); if(Math.random()<0.3) burst(h.x, 0.3, h.z, 0xb8ff60, 2, 2, 6, 0.5); } }
  else if(k==='cherry'){ const tg = priority(h, 14); if(tg){ h.cd[k] = cdOf(h,k); for(let j=0;j<shots(h,1);j++) lob(h, tg.x + j*rnd(-2,2), tg.z + j*rnd(-2,2), {dmg:dmgOf(h,k,A.dmg), rad:areaOf(h,k,A.rad), slow:2, el:'fire'}); } }
  else if(k==='bramble'){ let best = null, bn = 0; for(const e of ENEMY[h.team]){ if(e.dead || hyp(e.x-h.x,e.z-h.z) > 14) continue; let n = 0; for(const f of ENEMY[h.team]) if(!f.dead && hyp(f.x-e.x,f.z-e.z) < 5) n++; if(n > bn){ bn = n; best = e; } }
    if(best){ h.cd[k] = cdOf(h,k); throwCreature(h, 'bramblebud', best.x, best.z); } }
}
function runHero(h, dt){
  for(const k in h.cd) h.cd[k] -= dt;
  for(const k in h.buff) h.buff[k] = Math.max(0, h.buff[k]-dt);
  for(const k of h.pas) if(k) runPassive(h, k, dt);
  if(h.fx.spikeT > 0){ h.fx.spikeT -= dt; const len = areaOf(h,'shank',ABIL.shank.len), k = Math.sin(clamp(h.fx.spikeT/0.22,0,1)*Math.PI);
    h.spikes.forEach((s,i)=>{ const a = h.face + (i?1:-1)*Math.PI/2; s.visible = true; s.scale.set(1.3, 1.3, Math.max(0.01, len*k)); s.position.set(h.x+Math.sin(a)*(0.6+len*k/2), 0.95, h.z+Math.cos(a)*(0.6+len*k/2)); s.rotation.set(0, a, 0); }); }
  else h.spikes.forEach(s=>s.visible = false);
  // ongoing actives
  if(h.shieldT > 0){ h.shieldT -= dt; h.bubble.visible = true; h.bubble.material.opacity = 0.22 + 0.08*Math.sin(gt*8); h.bubble.scale.setScalar(1 + 0.04*Math.sin(gt*11)); if(Math.random()<0.3) burst(h.x+rnd(-1,1), rnd(0.5,2), h.z+rnd(-1,1), 0xff6ad8, 1, 1, -1, 0.5);
    if(h.shieldT <= 0 || h.shieldHP <= 0){ h.shieldT = 0; h.bubble.visible = false; const heal = h.absorbed*0.7; h.hp = Math.min(h.maxhp, h.hp + heal); elBurst('void', h.x, 1.2, h.z, 40, 7); if(heal > 1){ burst(h.x,1,h.z,0x7cff8a,20,5); if(h.isPlayer) big('+'+Math.round(heal)+' HP', 700, 'small'); } } }
  if(h.ballT > 0){ h.ballT -= dt; const A = ABIL.binge, R = 0.9*h.grow;
    for(const e of ENEMY[h.team]){ if(e.dead) continue; const dx = h.x-e.x, dz = h.z-e.z, d = hyp(dx,dz); if(e.kind==='ghost' && !e.big && d < 9 && d > 0.1){ e.kvx += dx/d*14*dt; e.kvz += dz/d*14*dt; }   // the binge sucks them in
      if(d < R + (e.r||0.6)){ if(e.kind==='ghost' && !e.big) hit(e, 999, h, {eat:true}); else hit(e, dmgOf(h,'binge',A.dps)*dt, h, {el:'fire'}); } }
    if(Math.random()<0.5) burst(h.x+rnd(-1,1), rnd(0.5,3), h.z+rnd(-1,1), pick([0xff5a1a,0xffd040]), 2, 3, -3, 0.5); for(let i=CIV.length-1;i>=0;i--) if(hyp(CIV[i].x-h.x, CIV[i].z-h.z) < R+0.4) killCiv(i, h); }
  if(h.sugarT > 0){ h.sugarT -= dt; h.fx.sug = (h.fx.sug||0) - dt; if(h.fx.sug <= 0){ h.fx.sug = 0.07; const c = pick([0x6cff3a,0xd8ff8a,0x41e4ff,0xffe14d]); addTrail(h, h.x - Math.sin(h.face)*0.8, h.z - Math.cos(h.face)*0.8, 1.6*h.mods.area, 2.2, dmgOf(h,'glitter',ABIL.glitter.dps), c, true); puff(h.x - Math.sin(h.face), 0.7, h.z - Math.cos(h.face), c, 3, 0.6); } }
  if(h.hopT > 0){ h.hopT -= dt; const H = h.hop, f = 1 - Math.max(0,h.hopT)/0.55; h.x = H.x0 + (H.x1-H.x0)*f; h.z = H.z0 + (H.z1-H.z0)*f; h.hopY = Math.sin(f*Math.PI)*2.6;
    if(h.hopT <= 0){ h.hopY = 0; const A = ABIL.deaddrop, R = areaOf(h,'deaddrop',A.rad); areaHit(h, h.x, h.z, R, dmgOf(h,'deaddrop',A.dmg), {knock:5, el:'shadow'}); elRing('shadow', h.x, h.z, R, 0.5); discFx(h.x, h.z, R, 0x3a1050, 0.35); elBurst('shadow', h.x, 0.4, h.z, 60, 10); addShake(0.45); SFX.boom(0.8); } }
  if(h.lungeT > 0){ h.lungeT -= dt; const nx = h.x + h.ax*28*dt, nz = h.z + h.az*28*dt; if(!blocked(nx, nz, h.r)){ h.x = nx; h.z = nz; }
    if(h.lungeT <= 0){ const A = ABIL.unhinged, ang = aimAngle(h), R = areaOf(h,'unhinged',A.range); coneHit(h, h.x, h.z, ang, R, A.arc, dmgOf(h,'unhinged',A.dmg), {eat:true, knock:2.5, el:'shadow'});
      fanFx(h.x, h.z, ang, R, A.arc, 0x7a3aa8, 0.3, 0.5); teethFx(h.x, h.z, ang, R); addShake(0.4); SFX.chomp(); h.rig.snapAt = rtime; } }
  if(h.dashT > 0) h.dashT -= dt;
  if(h.throwT > 0) h.throwT -= dt;
  if(h.grace > 0) h.grace -= dt;
}
// Unhinged: two rows of teeth slam shut over the cone (shadow purple, red edge)
const JAWS = [];
function teethFx(x, z, ang, R){
  const g = new THREE.Group(); g.position.set(x + Math.sin(ang)*R*0.45, 0.2, z + Math.cos(ang)*R*0.45); g.rotation.y = ang; const rows = [];
  const tm = new THREE.MeshBasicMaterial({color:0xfff0e0, transparent:true, opacity:0.95, depthWrite:false}), gm = new THREE.MeshBasicMaterial({color:0xff3050, transparent:true, opacity:0.55, blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide});
  for(const s of [-1,1]){ const row = new THREE.Group(); const n = 7, w = R*0.95;
    for(let i=0;i<n;i++){ const t = new THREE.Mesh(new THREE.ConeGeometry(R*0.07, R*0.22, 4), tm); t.rotation.x = s*Math.PI/2; t.position.set(-w/2 + i*w/(n-1), 0, -s*R*0.08); t.scale.set(1, 1, 1); row.add(t); }
    const gum = new THREE.Mesh(new THREE.PlaneGeometry(w*1.08, R*0.12), gm); gum.rotation.x = -Math.PI/2; gum.position.z = -s*R*0.18; row.add(gum);
    row.position.z = s*R*0.42; g.add(row); rows.push(row); }
  scene.add(g); JAWS.push({g, rows, R, t:0, mats:[tm, gm]}); }
function updateJaws(dt){ for(let i=JAWS.length-1;i>=0;i--){ const J = JAWS[i]; J.t += dt; const k = J.t/0.45, close = Math.min(1, k*3.2);
    J.rows.forEach((r,j)=>{ r.position.z = (j?1:-1)*J.R*0.42*(1-close); }); const o = k < 0.6 ? 1 : 1 - (k-0.6)/0.4; J.mats[0].opacity = 0.95*o; J.mats[1].opacity = 0.55*o;
    if(k >= 1){ scene.remove(J.g); J.g.traverse(o=>{ if(o.geometry) o.geometry.dispose(); }); J.mats.forEach(m=>m.dispose()); JAWS.splice(i,1); } } }
function addAlly(h, temp){ const g = new THREE.Group(); const body = LOOK.rawPiece(MODELS,'ghost','ghost.body'), eyes = LOOK.rawPiece(MODELS,'ghost','ghost.eyes');
  const tint = temp ? 0x9a7ab8 : 0xd8a0ff, emit = temp ? 0x200a30 : 0x3a1060;
  if(body){ LOOK.inkify(body, {outline:0.03}); body.traverse(o=>{ if(o.isMesh && o.material.uniforms && o.material.uniforms.uTint){ o.material.uniforms.uTint.value.set(tint); o.material.uniforms.uEmit.value.set(emit); } }); g.add(body); } if(eyes) g.add(eyes);
  g.add(at(glow(0xa45cff, 3, 0.4), 0, 1, 0)); g.scale.setScalar(temp?0.8:0.9); scene.add(g); ALLIES.push({g, x:h.x, z:h.z, owner:h, temp, life:temp?ABIL.posse.dur:1e9}); }
function lockedMsg(h, idx){ if(!h.isPlayer || h.lockMsgT) return; h.lockMsgT = 1; toast(null, idx===0 && h.level < 3 ? 'Your first active ability comes at level 3.' : 'This button gets an ability when you pick a new active one.', 2200); setTimeout(()=>h.lockMsgT = 0, 2500); }
function useActive(h, idx){
  const k = h.act[idx]; if(!k){ lockedMsg(h, idx); return false; }
  if(h.dead || h.stunT > 0 || (h.cd[k]||0) > 0 || h.hopT > 0) return false;
  const A = ABIL[k]; h.cd[k] = cdOf(h,k); if(h.isPlayer){ flashSlot('a'+idx); SFX.el(A.el); }
  const aimX = h.ax, aimZ = h.az, ang = Math.atan2(aimX, aimZ);
  if(k==='insurance'){ h.shieldT = A.dur; h.shieldHP = A.absorb*(1+0.25*(h.rank[k]||0)); h.absorbed = 0; SFX.shield(); elRing('void', h.x, h.z, 3, 0.5, true); elBurst('void', h.x, 1, h.z, 30, 6); }
  else if(k==='ragequit'){ const R = areaOf(h,k,A.rad); areaHit(h, h.x, h.z, R, dmgOf(h,k,A.dmg), {knock:A.knock, el:'shock', stun:0.3}); elRing('shock', h.x, h.z, R, 0.5); ringFx(h.x, h.z, R*0.6, 0xffffff, 0.3); discFx(h.x, h.z, R, 0xffb020, 0.25);
    for(let i=0;i<9;i++){ const a = i/9*6.283 + rnd(-0.2,0.2); zapLine(h.x, h.z, h.x+Math.cos(a)*R, h.z+Math.sin(a)*R, 0xffd040, 1); } burst(h.x,1,h.z,0xfff3a0,50,14); addShake(0.35); SFX.boom(0.9); }
  // Dead Drop lands on what you (or auto-cast) aimed at, up to 11 m
  else if(k==='deaddrop'){ let d = h.aimPx!=null ? clamp(hyp(h.aimPx-h.x, h.aimPz-h.z), 2, A.dist) : 7, tx = h.x, tz = h.z; while(d > 1){ tx = h.x + aimX*d; tz = h.z + aimZ*d; if(!blocked(tx,tz,h.r) && inLane(tx,tz)) break; d -= 0.5; } if(d <= 1){ tx = h.x; tz = h.z; } h.hop = {x0:h.x, z0:h.z, x1:tx, z1:tz}; h.hopT = 0.55; SFX.boing(); elBurst('shadow', h.x, 0.5, h.z, 20, 5); }
  else if(k==='binge'){ h.ballT = A.dur*(1+0.1*(h.rank[k]||0)); heroSay(h, 'level'); tone(90, 0.8, 'sawtooth', 0.1, 2); addShake(0.3); elBurst('fire', h.x, 1, h.z, 70, 11); elRing('fire', h.x, h.z, 6, 0.5); }
  else if(k==='unhinged'){ const a2 = aimAssist(h, ang, A.range + 3, 0.7); h.ax = Math.sin(a2); h.az = Math.cos(a2); h.lungeT = 0.17; h.face = a2; SFX.whoosh(); }
  else if(k==='glitter'){ h.sugarT = A.dur*(1+0.1*(h.rank[k]||0)); SFX.fart(0.8); elBurst('toxic', h.x, 1, h.z, 40, 7); }
  else if(k==='repo'){ const n = shots(h, A.n + Math.floor((h.rank[k]||0)/2)); for(let i=0;i<n;i++){ const tg = priority(h, 22) || nearest(h, 22);
      fireBolt(h, tg, dmgOf(h,k,A.dmg), 14, (i-(n-1)/2)*0.5, 0xa45cff, 3.2, true, 0, {mesh:skullMesh(), turn:4.5, boom:2.6, el:'void', delay:0.18, y:1.2, ang:aimAngle(h)}); } elRing('void', h.x, h.z, 4, 0.5, true); }
  else if(k==='fruitsalad'){ const n = shots(h, A.n + Math.floor((h.rank[k]||0)/2)); for(let i=0;i<n;i++){ const tg = priority(h, 24) || nearest(h, 24); const m = fruitMesh.clone(); m.scale.setScalar(0.9);
      fireBolt(h, tg, dmgOf(h,k,A.dmg), 15, i/n*6.283, 0xff5a1a, 3.2, true, 0, {mesh:m, turn:5, boom:2.4, el:'fire', delay:0.25, y:1.3, ang:0}); } elBurst('fire', h.x, 1.5, h.z, 30, 6); }
  else if(k==='killscreen'){ const fx = Math.sin(ang), fz = Math.cos(ang); for(const e of ENEMY[h.team]){ if(e.dead) continue; const px = e.x-h.x, pz = e.z-h.z; if(px*fx+pz*fz > 0 && hyp(px,pz) < 30) hit(e, dmgOf(h,k,A.dmg), h, {el:'shock'}); }
    glitchT = 0.6; glitchDir = ang; SFX.zap(); noise(0.5, 0.2); }
  else if(k==='coldopen'){ const R = areaOf(h,k,A.rad); areaHit(h, h.x, h.z, R, dmgOf(h,k,A.dmg), {stun:A.stun, freeze:true, el:'frost'}); elRing('frost', h.x, h.z, R, 0.6); discFx(h.x, h.z, R, 0x5ab4ff, 0.5); elBurst('frost', h.x, 1, h.z, 80, 12); addShake(0.25); }
  else if(k==='posse'){ for(let i=0;i<A.n;i++) addAlly(h, true); elBurst('shadow', h.x, 1, h.z, 40, 6); }
  else if(k==='notonlist'){ const R = areaOf(h,k,A.range), a2 = aimAssist(h, ang, R, 0.6); coneHit(h, h.x, h.z, a2, R, A.arc, dmgOf(h,k,A.dmg), {knock:A.knock, el:'nature'}); fanFx(h.x, h.z, a2, R, A.arc, 0x22d6a0, 0.3); spray(h.x, h.z, a2, R*0.4, A.arc, 0xb8ff60, 20, 1); addShake(0.2); }
  else if(k==='smokebreak'){ const R = areaOf(h,k,A.rad); for(let i=0;i<40;i++) puff(h.x, 0.8, h.z, 0x8a7a9a, 1, R*0.7); addTrail(h, h.x, h.z, R, A.dur, 2, 0x4a3a5a); h.fx.smoke = {x:h.x, z:h.z, R, t:A.dur}; }
  else if(k==='hottake'){ const R = h.aimPx!=null ? clamp(hyp(h.aimPx-h.x, h.aimPz-h.z), 2.5, 12) : 6; throwCreature(h, 'cindercub', h.x+aimX*R, h.z+aimZ*R); }
  else if(k==='splashzone'){ throwCreature(h, 'splashpup', h.x+aimX*2.2, h.z+aimZ*2.2); }
  else if(k==='jolt'){ let best = bossNear(h, 18), bn = best ? 99 : 0; for(const e of ENEMY[h.team]){ if(best && best.kind==='boss') break; if(e.dead || hyp(e.x-h.x,e.z-h.z) > 18) continue; let n = 0; for(const f of ENEMY[h.team]) if(!f.dead && hyp(f.x-e.x,f.z-e.z) < 5) n++; if(n > bn){ bn = n; best = e; } }
    const tx = best ? best.x : h.x+aimX*6, tz = best ? best.z : h.z+aimZ*6; throwCreature(h, 'voltmoth', tx, tz); }
  return true;
}
let glitchT = 0, glitchDir = 0;
// ---------------- v0.9 AUTO-CAST ----------------
// Brent: "auto-cast when ready, aiming at the best target". Every ready active fires itself the moment it would do something
// useful, aimed at the best target (Ball Boy first). Pressing its button still fires it early, aimed by you. One per tick.
const AUTO = {
  insurance: h => h.hp < h.maxhp*0.5 || (h.hp < h.maxhp*0.85 && countNear(h, h.x, h.z, 7) >= 2) || bossNear(h, 10) ? {} : null,
  ragequit:  h => { const R = areaOf(h,'ragequit',ABIL.ragequit.rad)*0.85; return countNear(h, h.x, h.z, R) >= 3 || countNear(h, h.x, h.z, 3) >= 1 || bossNear(h, R) ? {} : null; },
  deaddrop:  h => { const D = ABIL.deaddrop.dist, b = bossNear(h, D); if(b) return {t:b}; const c = cluster(h, D); return c && c.n >= 3 ? {t:c.e} : null; },
  binge:     h => countNear(h, h.x, h.z, 10) >= 7 || bossNear(h, 6) ? {} : null,
  unhinged:  h => { const t = bestTarget(h, areaOf(h,'unhinged',ABIL.unhinged.range)+1); return t ? {t} : null; },
  glitter:   h => countNear(h, h.x, h.z, 8) >= 5 || h.hp < h.maxhp*0.35 ? {} : null,
  repo:      h => { const t = bestTarget(h, 20); return t ? {t} : null; },
  fruitsalad:h => countNear(h, h.x, h.z, 18) >= 3 || bossNear(h, 20) ? {} : null,
  killscreen:h => { const b = bossNear(h, 26); if(b) return {t:b}; const c = cluster(h, 22, 8); return c && c.n >= 7 ? {t:c.e} : null; },
  coldopen:  h => { const R = areaOf(h,'coldopen',ABIL.coldopen.rad)*0.8; return countNear(h, h.x, h.z, R) >= 5 || bossNear(h, R) ? {} : null; },
  posse:     h => countNear(h, h.x, h.z, 14) >= 5 || bossNear(h, 16) ? {} : null,
  notonlist: h => { const t = bestTarget(h, areaOf(h,'notonlist',ABIL.notonlist.range)); return t && (t.kind==='boss' || countNear(h, t.x, t.z, 3) >= 2 || hyp(t.x-h.x, t.z-h.z) < 3) ? {t} : null; },
  smokebreak:h => countNear(h, h.x, h.z, 6) >= 6 ? {} : null,
  hottake:   h => { const t = bestTarget(h, 12); return t ? {t} : null; },
  splashzone:h => { const t = bestTarget(h, 6); return t ? {t} : null; },
  jolt:      h => { const b = bossNear(h, 18); if(b) return {t:b}; const c = cluster(h, 18); return c && c.n >= 2 ? {t:c.e} : null; } };
// point the hero's aim at a target (the casts read h.ax/h.az, and h.aimPx/aimPz for how far)
function aimAt(h, t){ const dx = t.x-h.x, dz = t.z-h.z, d = hyp(dx,dz)||1; h.ax = dx/d; h.az = dz/d; h.aimPx = t.x; h.aimPz = t.z; }
function autoCast(h, dt){ h.autoT = (h.autoT||0) - dt; if(h.autoT > 0 || h.dead || h.stunT > 0 || h.hopT > 0) return; h.autoT = 0.15;
  for(let i=0;i<3;i++){ const k = h.act[i]; if(!k || (h.cd[k]||0) > 0 || h.aimHold === i) continue; const plan = AUTO[k] && AUTO[k](h); if(!plan) continue;
    if(plan.t) aimAt(h, plan.t); if(useActive(h, i)) return; } }

// movement: Space / a swipe on the phone. dir = optional [dx, dz] (the swipe direction)
function useMove(h, dir){
  if(!h || !h.moveOk || h.dead || h.stunT > 0 || h.moveCd > 0) return; const M = MOVES[CHARS[h.char].move]; if(h.energy < M.cost){ if(h.isPlayer) toast(null,'Not enough energy. It refills over time.', 2000); return; }
  let dx = dir ? dir[0] : h.vx, dz = dir ? dir[1] : h.vz, l = hyp(dx,dz); if(l < 0.3){ dx = Math.sin(h.face); dz = Math.cos(h.face); l = 1; } dx /= l; dz /= l;
  if(h.char==='pac'){ let land = null; for(let d=M.dist; d>=2; d-=0.5){ const x = h.x+dx*d, z = h.z+dz*d; if(!blocked(x,z,h.r) && inLane(x,z)){ land = [x,z]; break; } }
    if(!land) return; elBurst('void', h.x, 1, h.z, 24, 6); ringFx(h.x, h.z, 2, 0xa45cff, 0.3, 0.25, true); h.x = land[0]; h.z = land[1]; h.face = Math.atan2(dx, dz); elBurst('void', h.x, 1, h.z, 28, 8); ringFx(h.x, h.z, 2.5, 0xff6ad8, 0.3); h.iframes = 0.35; }
  else { h.dash = {dx, dz}; h.dashT = 0.24; burst(h.x,0.5,h.z,0x41e4ff,18,5); }
  h.energy -= M.cost; h.moveCd = M.cd*h.mods.cdr; if(h.isPlayer){ flashSlot('move'); SFX.whoosh(); }
}
