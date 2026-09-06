const LANDS=[['Arctic','Ice and cold spells.'],['Coast','Fog and water.'],['Desert','Heat and blur.'],['Forest','Wood and bark.'],['Grassland','Haste and freedom.'],['Mountain','Stone and lightning.'],['Swamp','Acid and web.'],['Underdark','Dark and web.']];
const STARS=[['Archer','Ranged star attack.'],['Chalice','Heal when you hit or heal.'],['Dragon','Concentration help.']];
const FORMS=[['Spider','Known from his paper.'],['Lizard','Known from his paper.'],['Wolf','Known from his paper.'],['Horse','Known from his paper.'],['Cat','Tiny stealth.'],['Frog','Swim and jump.'],['Deer','Fast scout.'],['Panther','Climb hunter.'],['Crocodile','Swim bite.'],['Reef Shark','Water only.'],['Draft Horse','Heavy travel.'],['Black Bear','CR 1/2 fight.'],['Ape','Hands and climb.'],['Giant Frog','Swallow small things.'],['Warhorse','Fast mount body.']];
const FEATS=['+2 Wisdom','+2 Constitution','+1 Wisdom and +1 Constitution','Alert','Chef','Lucky','Observant','Resilient Constitution','Tough','War Caster','Fey Touched','Shadow Touched','Telepathic','Skill Expert','Magic Initiate'];
const BOONS=['Boon of Dimensional Travel','Boon of Energy Resistance','Boon of Fate','Boon of Fortitude','Boon of Recovery','Boon of Speed','Boon of Spell Recall','Another feat'];
if(typeof dPick==='undefined') window.dPick={land:'',stars:'',fury:'',feats:{},forms:{Spider:1,Lizard:1,Wolf:1,Horse:1}};
(function(){try{var s=JSON.parse(localStorage.getItem('hmmmable_v1')||'null');if(s&&s.dPick)dPick=s.dPick}catch(e){}})();
function savePick(){try{var raw=JSON.parse(localStorage.getItem('hmmmable_v1')||'{}');raw.dPick=dPick;localStorage.setItem('hmmmable_v1',JSON.stringify(raw))}catch(e){}if(typeof save==='function')save()}
function toggleForm(n){dPick.forms[n]=dPick.forms[n]?0:1;savePick();paintAll()}
function knownForms(){return FORMS.filter(function(f){return dPick.forms[f[0]]}).map(function(f){return f[0]}).join(', ')||'none'}
var _levelPanel=levelPanel;
levelPanel=function(){
  var h='',atk=signed(mod(SCORES.wis)+pb()),dc=8+pb()+mod(SCORES.wis);
  function card(t,d,btn){h+='<div class="card"><div><b>'+t+'</b><p class="muted">'+(d||'')+'</p></div>'+(btn||'')+'</div>'}
  if(!order){
    card('Level 1 \u2014 Primal Order','Pick one.');
    h+='<div class="card"><div><b>Magician</b><p class="muted">Extra cantrip. Add Wisdom to Arcana and Nature.</p></div><button type="button" onclick="pickOrder(\'Magician\')">Choose Magician</button></div>';
    h+='<div class="card"><div><b>Warden</b><p class="muted">Martial weapons and medium armor.</p></div><button type="button" onclick="pickOrder(\'Warden\')">Choose Warden</button></div>';
    return h;
  }
  card('Primal Order: '+order,'Permanent.','<button type="button" onclick="order=\'\';save();paintAll()">Change</button>');
  if(lvN>=2){
    card('Wild Shape uses','Bonus action. Known forms are a preference list for the DM.');
    h+='<div class="card"><div><b>Uses</b></div><span><button type="button" onclick="ws=Math.max(0,ws-1);paintActs();save()">-</button> <b>'+ws+'/'+wsMax()+'</b> <button type="button" onclick="ws=Math.min(wsMax(),ws+1);paintActs();save()">+</button></span></div>';
    card('Known forms',knownForms()+'. Tap Know or Drop.');
    FORMS.forEach(function(f){var on=!!dPick.forms[f[0]];h+='<div class="card"><div><b>'+f[0]+(on?' \u2014 known':'')+'</b><p class="muted">'+f[1]+'</p></div><button type="button" class="'+(on?'on':'')+'" onclick="toggleForm(\''+f[0]+'\')">'+(on?'Drop':'Know')+'</button></div>'});
  }
  if(lvN>=3&&!circle){
    card('Level 3 \u2014 Circle','Permanent.');
    CIRCLES.forEach(function(row){h+='<div class="card"><div><b>Circle of the '+row[0]+'</b><p class="muted">'+row[1]+'</p></div><button type="button" onclick="pickCircle(\''+row[0]+'\')">Choose '+row[0]+'</button></div>'});
    return h;
  }
  if(circle)card('Circle of the '+circle,'Permanent.','<button type="button" onclick="circle=\'\';save();paintAll()">Change</button>');
  if(circle==='Land'&&!dPick.land){
    card('Land type','Permanent until you Change.');
    LANDS.forEach(function(row){h+='<div class="card"><div><b>'+row[0]+'</b><p class="muted">'+row[1]+'</p></div><button type="button" onclick="dPick.land=\''+row[0]+'\';savePick();paintAll()">Choose '+row[0]+'</button></div>'});
    return h;
  }
  if(dPick.land)card('Land: '+dPick.land,'','<button type="button" onclick="dPick.land=\'\';savePick();paintAll()">Change</button>');
  if(circle==='Stars'&&!dPick.stars){
    card('Starry Form','Pick a favorite.');
    STARS.forEach(function(row){h+='<div class="card"><div><b>'+row[0]+'</b><p class="muted">'+row[1]+'</p></div><button type="button" onclick="dPick.stars=\''+row[0]+'\';savePick();paintAll()">Choose '+row[0]+'</button></div>'});
  }
  if(dPick.stars)card('Favorite star: '+dPick.stars,'','<button type="button" onclick="dPick.stars=\'\';savePick();paintAll()">Change</button>');
  function featBlock(at){
    if(lvN<at)return;
    if(dPick.feats[at]){card('Level '+at+': '+dPick.feats[at],'','<button type="button" onclick="dPick.feats['+at+']=\'\';savePick();paintAll()">Change</button>');return;}
    card('Level '+at+' ASI or feat','Permanent for this slot.');
    var list=at===19?BOONS:FEATS;
    list.forEach(function(f){h+='<div class="card"><div><b>'+f+'</b></div><button type="button" onclick="dPick.feats['+at+']=\''+f+'\';savePick();paintAll()">Choose</button></div>'});
  }
  featBlock(4);
  if(lvN>=5)card('Druid 5','Wild Resurgence. 3rd-level slots.');
  if(lvN>=6&&circle)card('Druid 6','Circle of the '+circle+' feature.');
  if(lvN>=7&&!dPick.fury){
    card('Elemental Fury','Pick one.');
    h+='<div class="card"><div><b>Potent Spellcasting</b><p class="muted">Add Wisdom to cantrip damage.</p></div><button type="button" onclick="dPick.fury=\'Potent Spellcasting\';savePick();paintAll()">Choose</button></div>';
    h+='<div class="card"><div><b>Primal Strike</b><p class="muted">Once a turn extra 1d8 elemental. 2d8 at 15.</p></div><button type="button" onclick="dPick.fury=\'Primal Strike\';savePick();paintAll()">Choose</button></div>';
  }
  if(dPick.fury)card('Elemental Fury: '+dPick.fury,'','<button type="button" onclick="dPick.fury=\'\';savePick();paintAll()">Change</button>');
  featBlock(8);if(lvN>=10&&circle)card('Druid 10','Circle of the '+circle+' feature.');featBlock(12);
  if(lvN>=14&&circle)card('Druid 14','Circle of the '+circle+' feature.');
  if(lvN>=15)card('Druid 15','Improved Elemental Fury.');featBlock(16);
  if(lvN>=18)card('Druid 18','Beast Spells.');featBlock(19);
  if(lvN>=20)card('Druid 20','Archdruid. Last official level.');
  card('Spell save DC '+dc,'8 + training + Wisdom.');
  card('Spell attack '+atk,'d20 + training + Wisdom.');
  h+='<div class="card"><div><b>Level 1 slots</b></div><span><button type="button" onclick="slot1=Math.max(0,slot1-1);paintActs();save()">-</button> <b>'+slot1+'/'+slots()+'</b> <button type="button" onclick="slot1=Math.min(slots(),slot1+1);paintActs();save()">+</button></span></div>';
  return h;
};
if(typeof paintAll==='function')paintAll();
