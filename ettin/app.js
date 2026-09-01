const BODY={str:17,dex:13,con:15};
const HEADS={
  o:{name:'OINKER',cls:'Barbarian',side:'Right head, right arm',int:8,wis:10,cha:14,hp:23,die:12,
     worn:['Greatsword','Battleaxe on harness','Hay wig','Purple shell over right eye','Leather harness','Shared hide loincloth']},
  b:{name:'BOINKER',cls:'Fighter',side:'Left head, left arm',int:12,wis:12,cha:10,hp:20,die:10,
     worn:['Brick mace','Flail on harness','Black oily helmet over left eye','Leather harness','Shared hide loincloth']}
};
const CHECKS=[
  ['Strength','Athletics',true,'Barbarian'],
  ['Dexterity','Acrobatics',false,''],
  ['Dexterity','Sleight of Hand',false,''],
  ['Dexterity','Stealth',false,''],
  ['Intelligence','Arcana',false,''],
  ['Intelligence','History',false,''],
  ['Intelligence','Investigation',false,''],
  ['Intelligence','Nature',false,''],
  ['Intelligence','Religion',true,'Hermit'],
  ['Wisdom','Animal Handling',true,'Fighter'],
  ['Wisdom','Insight',false,''],
  ['Wisdom','Medicine',true,'Hermit'],
  ['Wisdom','Perception',true,'Fighter'],
  ['Wisdom','Survival',true,'Barbarian'],
  ['Charisma','Deception',false,''],
  ['Charisma','Intimidation',false,''],
  ['Charisma','Performance',false,''],
  ['Charisma','Persuasion',false,'']
];
const $=id=>document.getElementById(id);
let who='o', goldN=40, bag=[], notes='', oLv=2, bLv=2, rage=2, raging=false, reckless=false, sw=1, surge=1;
let pool={o:{hp:23,max:23,temp:0},b:{hp:20,max:20,temp:0}};
function mod(score){return Math.floor((score-10)/2)}
function signed(n){return (n>=0?'+':'')+n}
function lv(){return who==='o'?oLv:bLv}
function pb(){const l=lv();return l>=17?6:l>=13?5:l>=9?4:l>=5?3:2}
function scoreOf(ab){
  if(ab==='Strength')return BODY.str;
  if(ab==='Dexterity')return BODY.dex;
  if(ab==='Constitution')return BODY.con;
  if(ab==='Intelligence')return HEADS[who].int;
  if(ab==='Wisdom')return HEADS[who].wis;
  return HEADS[who].cha;
}
function say(t){$('say').textContent=t||''}
function hit(){return mod(BODY.str)+pb()}
function ac(){return 10+mod(BODY.dex)+mod(BODY.con)}
function trained(name){return CHECKS.some(c=>c[1]===name&&c[2])}
function tab(id){
  ['fight','scores','checks','pack','journal'].forEach(x=>{
    const p=$('p-'+x); if(p)p.className=x===id?'':'hide';
    const a=$('t-'+x), b=$('b-'+x);
    if(a)a.className=x===id?'on':'';
    if(b)b.className=x===id?'on':'';
  });
}
function save(){
  const data={pool,goldN,bag,notes:$('notes').value,oLv,bLv,rage,raging,reckless,sw,surge,who};
  try{localStorage.setItem('ettinV2',JSON.stringify(data))}catch(e){}
}
function load(){
  try{
    const s=JSON.parse(localStorage.getItem('ettinV2')||'null');
    if(!s)return;
    if(s.pool){if(s.pool.o)Object.assign(pool.o,s.pool.o);if(s.pool.b)Object.assign(pool.b,s.pool.b)}
    if(s.goldN!=null)goldN=s.goldN;
    if(s.bag)bag=s.bag;
    if(s.notes!=null)notes=s.notes;
    if(s.oLv)oLv=s.oLv; if(s.bLv)bLv=s.bLv;
    if(s.rage!=null)rage=s.rage; if(s.raging!=null)raging=s.raging;
    if(s.reckless!=null)reckless=s.reckless;
    if(s.sw!=null)sw=s.sw; if(s.surge!=null)surge=s.surge;
    if(s.who)who=s.who;
  }catch(e){}
}
function explain(kind){
  if(kind==='ac') say('Armor Class '+ac()+'. 10 + Dexterity '+signed(mod(BODY.dex))+' + Constitution '+signed(mod(BODY.con))+'. Unarmored Defense from Barbarian. An enemy must meet or beat this number to hit.');
  if(kind==='init') say('Initiative '+signed(mod(BODY.dex))+'. Only Dexterity from score '+BODY.dex+'. When a fight starts, roll a d20, add Dexterity '+signed(mod(BODY.dex))+', tell the DM that total. Write it down for this fight. It is not a pool you spend.');
  if(kind==='speed') say('Speed 30 feet. That is how far this body walks on its turn.');
  if(kind==='pp'){
    const w=mod(HEADS[who].wis), t=trained('Perception')?pb():0;
    say('Passive Perception '+(10+w+t)+'. 10 + Wisdom '+signed(w)+(t?' + training '+signed(t)+' from Fighter.':'')+' The DM uses this when you are not searching.');
  }
  if(kind==='hd') say('Hit Dice '+lv()+'d'+HEADS[who].die+'. One die per class level. Barbarian uses d12. Fighter uses d10. On a short rest you may roll some of these, add Constitution '+signed(mod(BODY.con))+', and heal that many hit points if the DM allows it.');
}
function paintHUD(){
  const h=HEADS[who], p=pool[who];
  $('name').textContent=h.name;
  $('line').textContent=h.cls+' '+lv()+' \u00b7 Hermit \u00b7 '+h.side;
  $('lv').textContent=lv();
  $('hp').textContent=p.hp; $('hpMax').textContent=p.max;
  $('ac').textContent=ac();
  $('init').textContent=signed(mod(BODY.dex));
  const w=mod(h.wis), t=trained('Perception')?pb():0;
  $('pp').textContent=10+w+t;
  $('temp').textContent=p.temp;
  $('maxLab').textContent=p.max;
  $('hdLine').textContent='Hit Dice '+lv()+'d'+h.die+'. Tap to read.';
  $('hdLine').onclick=()=>explain('hd');
  $('gp').textContent=goldN;
  $('notes').value=notes;
}
function paintScores(){
  const blocks=[['STR',BODY.str,true],['DEX',BODY.dex,false],['CON',BODY.con,true],['INT',HEADS[who].int,false],['WIS',HEADS[who].wis,false],['CHA',HEADS[who].cha,false]];
  function box(a){
    const m=mod(a[1]), sav=m+(a[2]?pb():0);
    const el=document.createElement('div');
    el.className='ab';
    el.innerHTML='<div>'+a[0]+'</div><div class="mod">'+signed(m)+'</div><div class="sub">score '+a[1]+'</div><div class="sub save'+(a[2]?' yes':'')+'">save '+signed(sav)+'</div>';
    el.onclick=()=>{
      let t=a[0]+' score '+a[1]+' gives '+signed(m)+'.';
      if(a[2]) t+=' A save adds training '+signed(pb())+' because Barbarian and Fighter both train Strength and Constitution. Save is '+signed(sav)+'.';
      else t+=' This save is not trained. Roll d20 and add '+signed(m)+'.';
      t+=' A save is rolled when something happens to you: poison, a shove, a spell you try to resist.';
      say(t);
    };
    return el;
  }
  ['railAbs','phoneAbs'].forEach(id=>{const root=$(id); if(!root)return; root.innerHTML=''; blocks.forEach(a=>root.appendChild(box(a)));});
}
function atk(name,dice){
  say(name+'\nAction.\n1. Roll a d20.\n2. Add Strength '+signed(mod(BODY.str))+' and weapon training '+signed(pb())+'. Those parts are '+signed(hit())+' right now.\n3. Tell the DM that total.\n4. If it hits, roll '+dice+' and add Strength '+signed(mod(BODY.str))+(raging&&who==='o'?' and Rage +2.':'')+(reckless&&who==='o'?'\nReckless is on: roll two d20s in step 1, keep the higher. Enemies do the same against you.':''));
}
function paintActs(){
  const root=$('acts');
  const str=signed(mod(BODY.str)), train=signed(pb()), tot=signed(hit());
  const dmg=str+(raging&&who==='o'?' and Rage +2':'');
  function card(title,detail,btn,fn,cls){
    return '<div class="card"><div><b>'+title+'</b><p class="muted">'+detail+'</p></div><button type="button" class="'+(cls||'')+'" onclick="'+fn+'">'+btn+'</button></div>';
  }
  let html='<h3>Action</h3>';
  if(who==='o'){
    html+=card('Greatsword','Melee. d20 + Strength '+str+' + training '+train+' = '+tot+' now. Damage 2d6 + Strength '+dmg+'.','Attack','atk(\'Greatsword\',\'2d6\')');
    html+=card('Battleaxe','Melee. Same to-hit parts as the greatsword. Damage 1d8 + Strength '+dmg+'.','Attack','atk(\'Battleaxe\',\'1d8\')');
  }else{
    html+=card('Brick mace','Melee. d20 + Strength '+str+' + training '+train+' = '+tot+' now. Damage 1d12 + Strength '+str+'.','Attack','atk(\'Brick mace\',\'1d12\')');
    html+=card('Flail','Melee. Same to-hit parts as the mace. Damage 1d8 + Strength '+str+'.','Attack','atk(\'Flail\',\'1d8\')');
  }
  html+=card('Shove','Action. Roll Athletics. Strength '+str+(trained('Athletics')?' + training '+train:'')+'. Target contests. On a win you push 5 feet or knock it prone.','Do it','common(\'Shove\')');
  html+=card('Grapple','Action. Roll Athletics against the target\'s Athletics or Acrobatics. On a win you grab it.','Do it','common(\'Grapple\')');
  html+='<h3>Bonus action</h3>';
  if(who==='o'){
    html+=card('Rage', raging?'On. Melee damage +2. Resistance to bludgeoning, piercing, slashing. Uses left this long rest: '+rage+' of 2.':'Bonus action to start. Uses left this long rest: '+rage+' of 2.', raging?'End':'Start','toggleRage()',raging?'on':'');
  }else{
    html+=card('Second Wind','Bonus action. Roll 1d10 + fighter level ('+bLv+'). Heal that many hit points. Uses left: '+sw+' of 1. Returns after a short rest.','Use','useSW()');
  }
  html+='<h3>On your turn</h3>';
  if(who==='o'){
    html+=card('Reckless Attack',reckless?'On. Two d20s to hit, keep the higher. Enemies do the same to you this turn.':'When you Attack this turn, roll two d20s and keep the higher. Enemies do the same against you.',reckless?'On':'Off','toggleReck()',reckless?'on':'');
  }else{
    html+=card('Action Surge','Take one extra Action now. Uses left: '+surge+' of 1. Returns after a short rest.','Use','useSurge()');
  }
  html+=card('Jump','Part of movement. Strength 17. The DM sets the check if the jump is hard.','Tell DM','common(\'Jump\')');
  html+=card('Dash','Action. Walk another 30 feet this turn.','Tell DM','common(\'Dash\')');
  root.innerHTML=html;
}
function common(n){
  if(n==='Shove'||n==='Grapple'){
    const tot=mod(BODY.str)+(trained('Athletics')?pb():0);
    say(n+'. Action.\nRoll a d20.\nAdd Strength '+signed(mod(BODY.str))+(trained('Athletics')?' and Athletics training '+signed(pb())+'.':'')+' Those parts are '+signed(tot)+' now.\nTell the DM that total.');
    return;
  }
  if(n==='Jump') say('Jump. Use some of your 30 feet of movement. Tell the DM how far. If it is a hard jump, the DM may ask for Athletics.');
  if(n==='Dash') say('Dash. Spend your Action. Walk another 30 feet this turn.');
}
function toggleRage(){
  if(!raging){if(rage<=0){say('No Rage left until a long rest.');return;} rage-=1; raging=true; say('Rage started. Melee damage +2. Uses left this long rest: '+rage+' of 2.');}
  else {raging=false; say('Rage ended.');}
  paintActs(); save();
}
function toggleReck(){reckless=!reckless; paintActs(); save(); say(reckless?'Reckless on.':'Reckless off.');}
function useSW(){if(sw<=0){say('Second Wind already used. It returns after a short rest.');return;} sw-=1; say('Second Wind. Roll 1d10 + '+bLv+'. Then tap + on Hit Points for the result.'); paintActs(); save();}
function useSurge(){if(surge<=0){say('Action Surge already used. It returns after a short rest.');return;} surge-=1; say('Action Surge. Take one extra Action now.'); paintActs(); save();}
function paintChecks(){
  const root=$('checks'); root.innerHTML='';
  let last='';
  CHECKS.forEach(c=>{
    if(c[0]!==last){const h=document.createElement('h3'); h.textContent=c[0]; root.appendChild(h); last=c[0];}
    const m=mod(scoreOf(c[0])), add=c[2]?pb():0, tot=m+add;
    const row=document.createElement('div'); row.className='row';
    row.innerHTML='<span><span class="dot'+(c[2]?' on':'')+'"></span>'+c[1]+'<br><span class="muted">'+c[0]+' '+signed(m)+(c[2]?' + training '+signed(add)+' from '+c[3]:' not trained')+'</span></span><b>'+signed(tot)+'</b>';
    row.onclick=()=>say(c[1]+'.\nRoll a d20.\nAdd '+c[0]+' '+signed(m)+(c[2]?' and training '+signed(add)+' from '+c[3]+'.':'')+'\nThose parts are '+signed(tot)+' right now.\nTell the DM that total.');
    root.appendChild(row);
  });
}
function esc(s){return String(s).replace(/[&<>"']/g,ch=>({'&':'&','<':'<','>':'>','"':'"',"'":'&#39;'}[ch]))}
function paintPack(){
  $('worn').innerHTML=HEADS[who].worn.map(x=>'<li>'+esc(x)+'</li>').join('');
  $('bag').innerHTML=bag.length?bag.map((it,i)=>'<div class="card"><div><b>'+esc(it.name)+'</b> \u00d7'+it.qty+'</div><span><button type="button" onclick="useItem('+i+')">Use</button> <button type="button" onclick="qty('+i+',-1)">-</button> <button type="button" onclick="qty('+i+',1)">+</button></span></div>').join(''):'<p class="muted">Bag empty.</p>';
  $('gp').textContent=goldN;
}
function addItem(){
  const n=($('newItem').value||'').trim(); if(!n){say('Type a name first.');return;}
  const f=bag.find(x=>x.name.toLowerCase()===n.toLowerCase());
  if(f)f.qty+=1; else bag.push({name:n,qty:1});
  $('newItem').value=''; paintPack(); save();
}
function qty(i,n){bag[i].qty=Math.max(0,bag[i].qty+n); if(!bag[i].qty)bag.splice(i,1); paintPack(); save();}
function useItem(i){const n=bag[i].name; qty(i,-1); say('Used 1 '+n+'. Tell the DM.');}
function hp(n){
  const p=pool[who];
  if(n<0){let d=-n; if(p.temp>0){const u=Math.min(p.temp,d); p.temp-=u; d-=u;} p.hp=Math.max(0,p.hp-d);}
  else p.hp=Math.min(p.max,p.hp+n);
  paintHUD(); save();
}
function temp(n){pool[who].temp=Math.max(0,pool[who].temp+n); paintHUD(); save();}
function maxHp(n){const p=pool[who]; p.max=Math.max(1,p.max+n); if(p.hp>p.max)p.hp=p.max; paintHUD(); save();}
function gold(n){goldN=Math.max(0,goldN+n); paintPack(); save();}
function lvlChg(d){
  if(who==='o')oLv=Math.max(1,Math.min(20,oLv+d)); else bLv=Math.max(1,Math.min(20,bLv+d));
  paintAll(); save();
}
function nextLevel(){
  const n=lv()+1, barb=who==='o';
  let g='About +'+(barb?9:8)+' hit points (average die + Constitution '+signed(mod(BODY.con))+').';
  if(barb){
    if(n===3)g+=' Choose a Primal Path.';
    else if([4,8,12,16,19].includes(n))g+=' Ability Score Increase or a feat.';
    else if(n===5)g+=' Extra Attack. Fast Movement: speed becomes 40 from the class.';
  }else{
    if(n===3)g+=' Choose a Martial Archetype.';
    else if([4,6,8,12,14,16,19].includes(n))g+=' Ability Score Increase or a feat.';
    else if(n===5)g+=' Extra Attack.';
  }
  say(HEADS[who].name+' next is level '+n+'. '+g);
}
function shortRest(){
  if(!confirm('Short rest? About one hour. Second Wind and Action Surge return. Hit Dice you spend yourself.'))return;
  sw=1; surge=1; raging=false; paintAll(); save(); say('Short rest finished.');
}
function longRest(){
  if(!confirm('Long rest? Both heads fill hit points. Rage, Second Wind, and Action Surge return.'))return;
  pool.o.hp=pool.o.max; pool.o.temp=0; pool.b.hp=pool.b.max; pool.b.temp=0;
  rage=2; raging=false; reckless=false; sw=1; surge=1; paintAll(); save(); say('Long rest finished.');
}
function head(w){who=w; paintAll(); save();}
function paintAll(){
  $('btnO').className=who==='o'?'on':'';
  $('btnB').className=who==='b'?'on':'';
  paintHUD(); paintScores(); paintActs(); paintChecks(); paintPack();
}
$('notes').addEventListener('input',()=>{notes=$('notes').value;save();});
$('newItem').addEventListener('keydown',e=>{if(e.key==='Enter')addItem();});
load();
if($('notes'))$('notes').value=notes;
paintAll();
