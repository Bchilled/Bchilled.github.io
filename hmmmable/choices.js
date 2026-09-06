const LANDS=[['Arctic','Ice and cold.'],['Coast','Fog and water.'],['Desert','Heat and blur.'],['Forest','Wood and bark.'],['Grassland','Haste and open ground.'],['Mountain','Stone and lightning.'],['Swamp','Acid and web.'],['Underdark','Dark and web.']];
const STARS=[['Archer','Ranged star bolt.'],['Chalice','Heal when you cast a heal or hit.'],['Dragon','Help on concentration.']];
const FORMS=[['Spider','Paper. Climb.'],['Lizard','Paper. Tiny scout.'],['Wolf','Paper. Pack tactics.'],['Horse','Paper. Travel.'],['Cat','Tiny stealth.'],['Frog','Swim jump.'],['Rat','Tiny sewer scout.'],['Owl','Fly sneak.'],['Raven','Fly.'],['Deer','Fast scout.'],['Panther','Climb hunter.'],['Crocodile','Swim bite.'],['Reef Shark','Water only.'],['Draft Horse','Heavy travel.'],['Riding Horse','Fast travel.'],['Warhorse','Combat travel.'],['Black Bear','CR 1/2 fight.'],['Ape','Hands and climb.'],['Giant Frog','Swallow small.'],['Giant Badger','Dig fight.'],['Giant Spider','CR 1 web.'],['Brown Bear','CR 1. Moon later.']];
const FEATS=['+2 Wisdom','+2 Constitution','+1 Wisdom and +1 Constitution','Alert','Chef','Fey Touched','Lucky','Magic Initiate','Observant','Resilient Constitution','Shadow Touched','Skill Expert','Telepathic','Tough','War Caster','Elemental Adept'];
const BOONS=['Boon of Dimensional Travel','Boon of Energy Resistance','Boon of Fate','Boon of Fortitude','Boon of Recovery','Boon of Speed','Boon of Spell Recall','Another feat'];
const CANTRIPS=['Druidcraft','Thorn Whip','Mending','Message','Guidance','Produce Flame','Shillelagh','Starry Wisp','Elementalism'];
if(typeof dPick==='undefined') window.dPick={land:'',stars:'',fury:'',feats:{},forms:{Spider:1,Lizard:1,Wolf:1,Horse:1},cantrips:{Druidcraft:1,'Thorn Whip':1,Mending:1,Message:1}};
(function(){try{var s=JSON.parse(localStorage.getItem('hmmmable_v1')||'null');if(s&&s.dPick){Object.assign(dPick,s.dPick);if(!dPick.forms)dPick.forms={Spider:1,Lizard:1,Wolf:1,Horse:1};if(!dPick.cantrips)dPick.cantrips={Druidcraft:1,'Thorn Whip':1,Mending:1,Message:1};if(!dPick.feats)dPick.feats={}}}catch(e){}})();
function savePick(){try{var raw=JSON.parse(localStorage.getItem('hmmmable_v1')||'{}');raw.dPick=dPick;localStorage.setItem('hmmmable_v1',JSON.stringify(raw))}catch(e){}if(typeof save==='function')save()}
function toggleForm(n){dPick.forms[n]=dPick.forms[n]?0:1;savePick();paintAll()}
function toggleCan(n){dPick.cantrips[n]=dPick.cantrips[n]?0:1;savePick();paintAll()}
function knownForms(){return FORMS.filter(function(f){return dPick.forms[f[0]]}).map(function(f){return f[0]}).join(', ')||'none'}
function slotCap(tier){var t=[[0,0,0,0,0,0,0,0,0],[2,0,0,0,0,0,0,0,0],[3,0,0,0,0,0,0,0,0],[4,2,0,0,0,0,0,0,0],[4,3,0,0,0,0,0,0,0],[4,3,2,0,0,0,0,0,0],[4,3,3,0,0,0,0,0,0],[4,3,3,1,0,0,0,0,0],[4,3,3,2,0,0,0,0,0],[4,3,3,3,1,0,0,0,0],[4,3,3,3,2,0,0,0,0],[4,3,3,3,2,1,0,0,0],[4,3,3,3,2,1,0,0,0],[4,3,3,3,2,1,1,0,0],[4,3,3,3,2,1,1,0,0],[4,3,3,3,2,1,1,1,0],[4,3,3,3,2,1,1,1,0],[4,3,3,3,2,1,1,1,1],[4,3,3,3,3,1,1,1,1],[4,3,3,3,3,2,1,1,1],[4,3,3,3,3,2,2,1,1]];return t[Math.max(0,Math.min(20,lvN))][tier-1]||0}
if(typeof slotsUsed==='undefined') window.slotsUsed=[0,0,0,0,0,0,0,0,0,0];
levelPanel=function(){
  var h='',atk=signed(mod(SCORES.wis)+pb()),dc=8+pb()+mod(SCORES.wis);
  function card(t,d,btn){h+='<div class="card"><div><b>'+t+'</b><p class="muted">'+(d||'')+'</p></div>'+(btn||'')+'</div>'}
  if(!order){
    card('Level 1 Primal Order','Pick one.');
    h+='<div class="card"><div><b>Magician</b><p class="muted">Extra cantrip. Wisdom on Arcana and Nature.</p></div><button type="button" onclick="pickOrder(\'Magician\')">Choose Magician</button></div>';
    h+='<div class="card"><div><b>Warden</b><p class="muted">Martial weapons and medium armor.</p></div><button type="button" onclick="pickOrder(\'Warden\')">Choose Warden</button></div>';
    return h;
  }
  card('Primal Order: '+order,'','<button type="button" onclick="order=\'\';save();paintAll()">Change</button>');
  card('Cantrips','Paper had Druidcraft, Thorn Whip, Mending, Message.');
  CANTRIPS.forEach(function(nm){var on=!!dPick.cantrips[nm];h+='<div class="card"><div><b>'+nm+'</b></div><button type="button" class="'+(on?'on':'')+'" onclick="toggleCan(\''+nm+'\')">'+(on?'Prepared':'Prepare')+'</button></div>'});
  if(lvN>=2){
    card('Wild Shape '+ws+'/'+wsMax(),'Bonus action. DM still sets CR.');
    h+='<div class="card"><div><b>Uses</b></div><span><button type="button" onclick="ws=Math.max(0,ws-1);paintActs();save()">-</button> <b>'+ws+'/'+wsMax()+'</b> <button type="button" onclick="ws=Math.min(wsMax(),ws+1);paintActs();save()">+</button></span></div>';
    card('Known forms',knownForms());
    FORMS.forEach(function(f){var on=!!dPick.forms[f[0]];h+='<div class="card"><div><b>'+f[0]+(on?' \u2014 known':'')+'</b><p class="muted">'+f[1]+'</p></div><button type="button" class="'+(on?'on':'')+'" onclick="toggleForm(\''+f[0]+'\')">'+(on?'Drop':'Know')+'</button></div>'});
  }
  if(lvN>=3&&!circle){
    card('Circle','Permanent.');
    CIRCLES.forEach(function(row){h+='<div class="card"><div><b>Circle of the '+row[0]+'</b><p class="muted">'+row[1]+'</p></div><button type="button" onclick="pickCircle(\''+row[0]+'\')">Choose '+row[0]+'</button></div>'});
    return h;
  }
  if(circle)card('Circle of the '+circle,'','<button type="button" onclick="circle=\'\';save();paintAll()">Change</button>');
  if(circle==='Land'&&!dPick.land){card('Land type','Pick one.');LANDS.forEach(function(row){h+='<div class="card"><div><b>'+row[0]+'</b><p class="muted">'+row[1]+'</p></div><button type="button" onclick="dPick.land=\''+row[0]+'\';savePick();paintAll()">Choose '+row[0]+'</button></div>'});return h;}
  if(dPick.land)card('Land: '+dPick.land,'','<button type="button" onclick="dPick.land=\'\';savePick();paintAll()">Change</button>');
  if(circle==='Stars'&&!dPick.stars){card('Starry Form favorite','You may still swap when you use it.');STARS.forEach(function(row){h+='<div class="card"><div><b>'+row[0]+'</b><p class="muted">'+row[1]+'</p></div><button type="button" onclick="dPick.stars=\''+row[0]+'\';savePick();paintAll()">Choose '+row[0]+'</button></div>'});}
  if(dPick.stars)card('Favorite star: '+dPick.stars,'','<button type="button" onclick="dPick.stars=\'\';savePick();paintAll()">Change</button>');
  function featBlock(at){if(lvN<at)return;if(dPick.feats[at]){card('Level '+at+': '+dPick.feats[at],'','<button type="button" onclick="dPick.feats['+at+']=\'\';savePick();paintAll()">Change</button>');return;}card('Level '+at+' ASI or feat','Pick one.');var list=at===19?BOONS:FEATS;list.forEach(function(f){h+='<div class="card"><div><b>'+f+'</b></div><button type="button" onclick="dPick.feats['+at+']=\''+f+'\';savePick();paintAll()">Choose</button></div>'});}
  featBlock(4);if(lvN>=5)card('Druid 5','Wild Resurgence. 3rd-level slots.');if(lvN>=6&&circle)card('Druid 6','Circle of the '+circle+' feature.');
  if(lvN>=7&&!dPick.fury){card('Elemental Fury','Pick one.');h+='<div class="card"><div><b>Potent Spellcasting</b><p class="muted">Add Wisdom to cantrip damage.</p></div><button type="button" onclick="dPick.fury=\'Potent Spellcasting\';savePick();paintAll()">Choose</button></div>';h+='<div class="card"><div><b>Primal Strike</b><p class="muted">Once a turn +1d8 elemental. 2d8 at 15.</p></div><button type="button" onclick="dPick.fury=\'Primal Strike\';savePick();paintAll()">Choose</button></div>';}
  if(dPick.fury)card('Elemental Fury: '+dPick.fury,'','<button type="button" onclick="dPick.fury=\'\';savePick();paintAll()">Change</button>');
  featBlock(8);if(lvN>=10&&circle)card('Druid 10','Circle of the '+circle+' feature.');featBlock(12);if(lvN>=14&&circle)card('Druid 14','Circle of the '+circle+' feature.');if(lvN>=15)card('Druid 15','Improved Elemental Fury.');featBlock(16);if(lvN>=18)card('Druid 18','Beast Spells.');featBlock(19);if(lvN>=20)card('Druid 20','Archdruid.');
  card('Spell save DC '+dc,'8 + training + Wisdom.');card('Spell attack '+atk,'d20 + training + Wisdom.');
  for(var t=1;t<=9;t++){var cap=slotCap(t);if(!cap)continue;if(slotsUsed[t]==null)slotsUsed[t]=0;h+='<div class="card"><div><b>Level '+t+' slots</b><p class="muted">Long rest fills these.</p></div><span><button type="button" onclick="slotsUsed['+t+']=Math.max(0,(slotsUsed['+t+']||0)-1);paintActs();savePick()">-</button> <b>'+(cap-(slotsUsed[t]||0))+'/'+cap+'</b> <button type="button" onclick="slotsUsed['+t+']=Math.min(cap,(slotsUsed['+t+']||0)+1);paintActs();savePick()">+</button></span></div>';}
  return h;
};
if(typeof paintAll==='function')paintAll();
