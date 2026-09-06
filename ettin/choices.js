BARB.push(['WorldTree','L3 reach and vines from the 2024 book. Permanent.']);
const NEST={TotemWarrior:[['Bear','Almost all damage resisted in rage.'],['Eagle','Dash as a bonus action in rage.'],['Wolf','Allies next to you get advantage.']],StormHerald:[['Desert','Fire aura.'],['Sea','Storm aura.'],['Tundra','Cold aura.']],Beast:[['Bite','1d8, can knock prone.'],['Claws','Two 1d6 hits.'],['Tail','1d8 with reach.']],Giant:[['Hill','Grow.'],['Stone','Grow + bludgeoning.'],['Frost','Grow + cold.'],['Fire','Grow + fire.'],['Cloud','Grow + thunder.'],['Storm','Grow + lightning.']],Zealot:[['Radiant','Extra radiant in rage.'],['Necrotic','Extra necrotic in rage.']]};
const MANEUVERS=['Ambush','Bait and Switch','Commanding Presence','Disarming Attack','Distracting Strike','Evasive Footwork','Feinting Attack','Goading Attack','Grappling Strike','Lunging Attack','Maneuvering Attack','Menacing Attack','Parry','Precision Attack','Pushing Attack','Quick Toss','Rally','Riposte','Sweeping Attack','Tactical Assessment','Trip Attack'];
const SHOTS=['Banishing Arrow','Beguiling Arrow','Bursting Arrow','Enfeebling Arrow','Grasping Arrow','Piercing Arrow','Seeking Arrow','Shadow Arrow'];
const RUNES=['Cloud Rune','Fire Rune','Frost Rune','Hill Rune','Stone Rune','Storm Rune'];
const STYLES=[['Defense','+1 AC in armor.'],['Dueling','+2 damage one-handed.'],['GreatWeapon','Reroll 1 or 2 on two-handed.'],['Protection','Shield: disadvantage on a hit next to you.'],['TwoWeapon','Bonus off-hand attack.'],['Archery','+2 ranged to hit.'],['BlindFighting','See 10 feet in dark or fog.'],['Interception','Cut a hit next to you.'],['Thrown','Draw and throw together.'],['Unarmed','Better punches.'],['SuperiorTechnique','One Battle Master maneuver and a d6.']];
const FEATS=['+2 Strength','+2 Constitution','+2 Dexterity','+1 Strength and +1 Constitution','Alert','Athlete','Charger','Chef','Crossbow Expert','Crusher','Defensive Duelist','Dual Wielder','Durable','Great Weapon Master','Heavy Armor Master','Inspiring Leader','Lucky','Mage Slayer','Mobile','Observant','Piercer','Polearm Master','Resilient Constitution','Resilient Dexterity','Savage Attacker','Sentinel','Sharpshooter','Shield Master','Skill Expert','Skilled','Slasher','Tavern Brawler','Tough','War Caster','Fighting Initiate'];
if(typeof extra==='undefined') window.extra={o:{style:'',nest:'',feats:{},list:[]},b:{style:'',nest:'',feats:{},list:[],style2:''}};
function ex(){if(!extra[who])extra[who]={style:'',nest:'',feats:{},list:[],style2:''};if(!extra[who].list)extra[who].list=[];if(!extra[who].feats)extra[who].feats={};return extra[who]}
function pickStyle(s){ex().style=s;say(s+' Fighting Style locked.');save();paintAll()}
function pickStyle2(s){ex().style2=s;say('Second style: '+s);save();paintAll()}
function pickNest(s){ex().nest=s;say(s+' locked.');save();paintAll()}
function pickFeat(lvAt,s){ex().feats[lvAt]=s;say('Level '+lvAt+': '+s);save();paintAll()}
function toggleList(n){var e=ex(),i=e.list.indexOf(n);if(i>=0)e.list.splice(i,1);else e.list.push(n);save();paintAll()}
function needList(){var p=codeName(path[who]);if(p==='BattleMaster')return {need:3,items:MANEUVERS,title:'Maneuvers'};if(p==='ArcaneArcher')return {need:2,items:SHOTS,title:'Arcane shots'};if(p==='RuneKnight')return {need:2,items:RUNES,title:'Runes'};return null}
var _save=save;
save=function(){_save();try{var raw=JSON.parse(localStorage.getItem(store())||'{}');raw.extra=extra;localStorage.setItem(store(),JSON.stringify(raw))}catch(err){}};
(function(){try{var s=JSON.parse(localStorage.getItem(store())||'null');if(s&&s.extra)extra=s.extra}catch(err){}})();
levelPanel=function(){
  var n=lv(),h='',e=ex();
  function card(t,d,btn){h+='<div class="card"><div><b>'+t+'</b><p class="muted">'+(d||'')+'</p></div>'+(btn||'')+'</div>'}
  if(who==='b'&&!e.style){
    card('Level 1 Fighting Style','Fighter gets this at 1. Pick one.');
    STYLES.forEach(function(row){h+='<div class="card"><div><b>'+row[0]+'</b><p class="muted">'+row[1]+'</p></div><button type="button" onclick="pickStyle(\''+row[0]+'\')">Choose</button></div>'});
    return h;
  }
  if(who==='b'&&e.style)card('Fighting Style: '+e.style,'','<button type="button" onclick="ex().style=\'\';save();paintAll()">Change</button>');
  if(n<3){
    card('Levels 1-20','Last official level is 20. + goes to 3 for a subclass.');
    if(who==='o')card('On already','Rage, Unarmored Defense, Reckless Attack, Danger Sense.');
    if(who==='b')card('On already','Second Wind, Action Surge'+(e.style?', '+e.style:'')+'.');
    return h;
  }
  var list=who==='o'?BARB:FIGHT;
  if(!path[who]){
    card('Level 3 subclass','Permanent.');
    list.forEach(function(row){h+='<div class="card"><div><b>'+niceName(row[0])+'</b><p class="muted">'+row[1]+'</p></div><button type="button" onclick="pickPath(\''+row[0]+'\')">Choose '+niceName(row[0])+'</button></div>'});
    return h;
  }
  card('Subclass: '+niceName(path[who]),'','<button type="button" onclick="path[who]=\'\';ex().nest=\'\';ex().list=[];save();paintAll()">Change</button>');
  var spec=needList();
  if(spec){
    card(spec.title,e.list.length+' / '+spec.need+' picked. Tap to add or drop.');
    spec.items.forEach(function(nm){var on=e.list.indexOf(nm)>=0;h+='<div class="card"><div><b>'+nm+'</b></div><button type="button" class="'+(on?'on':'')+'" onclick="toggleList(\''+nm+'\')">'+(on?'Drop':'Take')+'</button></div>'});
  }
  var nests=NEST[codeName(path[who])]||[];
  if(nests.length&&!e.nest){
    card('Nested pick','Tap one.');
    nests.forEach(function(row){h+='<div class="card"><div><b>'+row[0]+'</b><p class="muted">'+row[1]+'</p></div><button type="button" onclick="pickNest(\''+row[0]+'\')">Choose '+row[0]+'</button></div>'});
  }
  if(e.nest)card('Path pick: '+e.nest,'','<button type="button" onclick="ex().nest=\'\';save();paintAll()">Change</button>');
  function featBlock(at){
    if(n<at)return;
    if(e.feats[at]){card('Level '+at+': '+e.feats[at],'','<button type="button" onclick="ex().feats['+at+']=\'\';save();paintAll()">Change</button>');return;}
    card('Level '+at+' ASI or feat','Pick one slot.');
    FEATS.forEach(function(f){h+='<div class="card"><div><b>'+f+'</b></div><button type="button" onclick="pickFeat('+at+',\''+f+'\')">Choose</button></div>'});
  }
  if(who==='o'){
    if(n>=5)card('Barbarian 5','Extra Attack. Speed 40 if not in heavy armor.');
    if(n>=6)card('Barbarian 6',niceName(path[who])+(codeName(path[who])==='TotemWarrior'?' Aspect (Elk or Tiger with the DM).':' path feature.'));
    if(n>=7)card('Barbarian 7','Feral Instinct. Advantage on initiative.');
    featBlock(4);featBlock(8);
    if(n>=9)card('Barbarian 9','Brutal Critical +1 die.');
    if(n>=10)card('Barbarian 10',niceName(path[who])+' path feature.');
    if(n>=11)card('Barbarian 11','Relentless Rage.');
    featBlock(12);
    if(n>=13)card('Barbarian 13','Brutal Critical +2 dice.');
    if(n>=14)card('Barbarian 14',niceName(path[who])+(codeName(path[who])==='TotemWarrior'?' Totemic Attunement.':' path feature.'));
    if(n>=15)card('Barbarian 15','Persistent Rage.');
    featBlock(16);
    if(n>=17)card('Barbarian 17','Brutal Critical +3 dice.');
    if(n>=18)card('Barbarian 18','Indomitable Might.');
    featBlock(19);
    if(n>=20)card('Barbarian 20','Primal Champion. Unlimited rage.');
  }else{
    if(n>=5)card('Fighter 5','Extra Attack.');
    if(n>=6)featBlock(6);
    if(n>=7)card('Fighter 7',niceName(path[who])+' path feature.');
    featBlock(4);featBlock(8);
    if(n>=9)card('Fighter 9','Indomitable 1/long rest.');
    if(n>=10){
      if(codeName(path[who])==='Champion'&&!e.style2){
        card('Champion 10 extra Fighting Style','Pick a second style.');
        STYLES.forEach(function(row){if(row[0]!==e.style)h+='<div class="card"><div><b>'+row[0]+'</b><p class="muted">'+row[1]+'</p></div><button type="button" onclick="pickStyle2(\''+row[0]+'\')">Choose</button></div>'});
      } else card('Fighter 10',e.style2?('Second style: '+e.style2):niceName(path[who])+' path feature.');
    }
    if(n>=11)card('Fighter 11','Extra Attack 2. Three attacks.');
    featBlock(12);
    if(n>=13)card('Fighter 13','Indomitable 2.');
    if(n>=14)featBlock(14);
    if(n>=15)card('Fighter 15',niceName(path[who])+' path feature.');
    featBlock(16);
    if(n>=17)card('Fighter 17','Action Surge 2. Indomitable 3.');
    if(n>=18)card('Fighter 18',niceName(path[who])+' path feature.');
    featBlock(19);
    if(n>=20)card('Fighter 20','Extra Attack 3. Four attacks.');
  }
  return h;
};
if(typeof paintAll==='function')paintAll();
