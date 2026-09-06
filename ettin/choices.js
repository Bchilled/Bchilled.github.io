BARB.push(['WorldTree','L3 reach and vines from the 2024 book. Permanent.']);
const NEST={
TotemWarrior:[['Bear','Almost all damage resisted in rage. Permanent.'],['Eagle','Dash as a bonus action in rage.'],['Wolf','Allies next to you get advantage.']],
StormHerald:[['Desert','Fire aura. Locks fire.'],['Sea','Storm aura. Locks lightning and thunder.'],['Tundra','Cold aura. Locks cold.']],
Beast:[['Bite','1d8 and you can knock prone.'],['Claws','Two 1d6 hits.'],['Tail','1d8 with reach.']],
Giant:[['Hill','Grow. No element.'],['Stone','Grow. Bludgeoning.'],['Frost','Grow. Cold.'],['Fire','Grow. Fire.'],['Cloud','Grow. Thunder.'],['Storm','Grow. Lightning.']],
Zealot:[['Radiant','Extra radiant on a rage hit.'],['Necrotic','Extra necrotic on a rage hit.']],
BattleMaster:[['Maneuvers','Pick 3 with the DM: Trip, Push, Riposte, Menacing, Precision, Disarming, Feinting, Goading, Lunging, Parry, Rally, Sweeping, Commanding, Evasive, Grappling.']],
ArcaneArcher:[['Shots','Needs a bow. Pick 2 shots with the DM: Banishing, Beguiling, Bursting, Enfeebling, Grasping, Piercing, Seeking, Shadow.']],
EldritchKnight:[['Spells','Wizard list. Soft lock Abjuration and Evocation.']],
RuneKnight:[['Runes','Pick 2 runes with the DM: Cloud, Fire, Frost, Hill, Stone, Storm.']]
};
const STYLES=[['Defense','+1 Armor Class in armor.'],['Dueling','+2 damage with one one-handed weapon.'],['GreatWeapon','Reroll 1 or 2 on a two-handed weapon.'],['Protection','Shield: impose disadvantage on a hit next to you.'],['TwoWeapon','Bonus attack with the off-hand.'],['Archery','+2 to hit with ranged weapons.'],['BlindFighting','See 10 feet in darkness or fog.'],['Interception','Reduce a hit next to you.'],['Thrown','Draw and throw in one motion.'],['Unarmed','Better punches.']];
const FEATS=['+2 Strength','+2 Constitution','+1 Strength and +1 Constitution','Alert','Athlete','Charger','Chef','Crusher','Durable','Great Weapon Master','Lucky','Mage Slayer','Mobile','Observant','Polearm Master','Resilient Constitution','Savage Attacker','Sentinel','Sharpshooter','Shield Master','Skilled','Slasher','Tavern Brawler','Tough','War Caster'];
if(typeof extra==='undefined') window.extra={o:{style:'',nest:'',feats:{}},b:{style:'',nest:'',feats:{}}};
function ex(){if(!extra[who])extra[who]={style:'',nest:'',feats:{}};return extra[who]}
function pickStyle(s){ex().style=s;say(s+' Fighting Style locked.');save();paintAll()}
function pickNest(s){ex().nest=s;say(s+' locked for '+niceName(path[who])+'.');save();paintAll()}
function pickFeat(lvAt,s){ex().feats[lvAt]=s;say('Level '+lvAt+' pick: '+s+'.');save();paintAll()}
var _save=save;
save=function(){_save();try{var raw=JSON.parse(localStorage.getItem(store())||'{}');raw.extra=extra;localStorage.setItem(store(),JSON.stringify(raw))}catch(e){}};
(function(){try{var s=JSON.parse(localStorage.getItem(store())||'null');if(s&&s.extra)extra=s.extra}catch(e){}})();
var _levelPanel=levelPanel;
levelPanel=function(){
  var n=lv(),h='',e=ex();
  function card(t,d,btn){h+='<div class="card"><div><b>'+t+'</b><p class="muted">'+(d||'')+'</p></div>'+(btn||'')+'</div>'}
  if(who==='b'&&!e.style){
    card('Level 1 Fighting Style','Pick one. Fighter gets this at 1.');
    STYLES.forEach(function(row){h+='<div class="card"><div><b>'+row[0]+'</b><p class="muted">'+row[1]+'</p></div><button type="button" onclick="pickStyle(\''+row[0]+'\')">Choose '+row[0]+'</button></div>'});
    return h;
  }
  if(who==='b'&&e.style)card('Fighting Style: '+e.style,'Permanent.','<button type="button" onclick="ex().style=\'\';save();paintAll()">Change</button>');
  if(n<3){
    card('Levels 1 to 20','Official last level is 20. Tap + to reach 3, then pick a path.');
    if(who==='o')card('Already on','Rage, Unarmored Defense, Reckless Attack, Danger Sense.');
    if(who==='b')card('Already on','Second Wind, Action Surge'+(e.style?', '+e.style:'')+'.');
    return h;
  }
  var list=who==='o'?BARB:FIGHT;
  if(!path[who]){
    card('Level 3 \u2014 pick a subclass','Permanent.');
    list.forEach(function(row){h+='<div class="card"><div><b>'+niceName(row[0])+'</b><p class="muted">'+row[1]+'</p></div><button type="button" onclick="pickPath(\''+row[0]+'\')">Choose '+niceName(row[0])+'</button></div>'});
    return h;
  }
  card('Subclass: '+niceName(path[who]),'Permanent.','<button type="button" onclick="path[who]=\'\';ex().nest=\'\';save();paintAll()">Change</button>');
  var nests=NEST[codeName(path[who])]||[];
  if(nests.length&&!e.nest){
    card('This path has a nested pick','Tap one.');
    nests.forEach(function(row){h+='<div class="card"><div><b>'+row[0]+'</b><p class="muted">'+row[1]+'</p></div><button type="button" onclick="pickNest(\''+row[0]+'\')">Choose '+row[0]+'</button></div>'});
    return h;
  }
  if(e.nest)card('Path pick: '+e.nest,'Locked to this path.','<button type="button" onclick="ex().nest=\'\';save();paintAll()">Change</button>');
  function featBlock(at){
    if(n<at)return;
    if(e.feats[at]){card('Level '+at+' : '+e.feats[at],'ASI or feat.','<button type="button" onclick="ex().feats['+at+']=\'\';save();paintAll()">Change</button>');return;}
    card('Level '+at+' ASI or feat','Permanent for this slot.');
    FEATS.forEach(function(f){h+='<div class="card"><div><b>'+f+'</b></div><button type="button" onclick="pickFeat('+at+',\''+f+'\')">Choose</button></div>'});
  }
  if(who==='o'){
    if(n>=5)card('Barbarian 5','Extra Attack. Walk 40 feet if not in heavy armor.');
    if(n>=6)card('Barbarian 6',niceName(path[who])+' path feature.');
    if(n>=7)card('Barbarian 7','Feral Instinct. Advantage on initiative.');
    featBlock(4);featBlock(8);
    if(n>=9)card('Barbarian 9','Brutal Critical. Extra weapon die on a crit.');
    if(n>=10)card('Barbarian 10',niceName(path[who])+' path feature.');
    if(n>=11)card('Barbarian 11','Relentless Rage.');
    featBlock(12);
    if(n>=13)card('Barbarian 13','Brutal Critical 2 dice.');
    if(n>=14)card('Barbarian 14',niceName(path[who])+' path feature.');
    if(n>=15)card('Barbarian 15','Persistent Rage.');
    featBlock(16);
    if(n>=17)card('Barbarian 17','Brutal Critical 3 dice.');
    if(n>=18)card('Barbarian 18','Indomitable Might.');
    featBlock(19);
    if(n>=20)card('Barbarian 20','Primal Champion. Last official level.');
  }else{
    if(n>=5)card('Fighter 5','Extra Attack: two attacks.');
    if(n>=6)featBlock(6);
    if(n>=7)card('Fighter 7',niceName(path[who])+' path feature.');
    featBlock(4);featBlock(8);
    if(n>=9)card('Fighter 9','Indomitable.');
    if(n>=10)card('Fighter 10',niceName(path[who])+' path feature.');
    if(n>=11)card('Fighter 11','Extra Attack 2: three attacks.');
    featBlock(12);
    if(n>=13)card('Fighter 13','Indomitable twice.');
    if(n>=14)featBlock(14);
    if(n>=15)card('Fighter 15',niceName(path[who])+' path feature.');
    featBlock(16);
    if(n>=17)card('Fighter 17','Action Surge twice. Indomitable three times.');
    if(n>=18)card('Fighter 18',niceName(path[who])+' path feature.');
    featBlock(19);
    if(n>=20)card('Fighter 20','Extra Attack 3: four attacks.');
  }
  return h;
};
if(typeof paintAll==='function')paintAll();
