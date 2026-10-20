# PAC — design doc v0.1 (2026-10-19, owner's pitch + systems pass)

**Genre:** Vampire Survivors-like arena survivor with Pac-Man DNA.
**Energy:** super fast-paced, loud, high-energy, creative chaos.

## The pitch (owner's words, cleaned)
You're Pac. The maps are BIG and looping — not small classic mazes. You run around
gathering dots; ghosts chase you; you find things and eat them; you gain abilities.
Crazy characters of all kinds get thrown in, and like Kirby you take powers from
what you eat and harness a few at a time.

## Core loop
- **Big looping arenas** — the map wraps on every edge (exit left, enter right).
  Dots stream in trails and clusters across the whole map; eating dots = XP + combo.
- **Combo meter** — chained dots raise your speed and the waka pitch; getting hit
  or idling drains it. High combo = score multiplier and power-up drop rate.
- **Ghosts with brains** — the classic four AI personalities (direct chaser,
  ambusher who targets ahead of you, flanker, wildcard), spawning in escalating packs.
- **Power pellets → EAT MODE** — timed windows where enemies are edible.
- **Kirby layer** — eating an enemy copies its power (fire trail, chomp-dash, shield
  bubble, magnet maw, ghost-phase...). Hold up to **3 powers**, swap the active one
  on the fly; eating a new one when full replaces the oldest.
- **Waves of crazy characters** — beyond ghosts: themed mobs and elites; elites drop
  fruit-tier loot (big XP / power refills / one-time nukes).
- **Level-ups** — VS-style 3-choice cards: new powers, power upgrades, stats
  (speed, magnet, chomp radius, eat-mode duration).
- **Bosses** — every few minutes a giant character event (e.g., a mega-ghost that
  splits into the four personalities when damaged).
- **Run structure** — survive the clock; difficulty scales with time and combo.

## Audio direction
High-energy synth loop; waka-combo pitch ladder; eat-mode siren; power-copy sting
per power type. Loud by design, mutable.

## Prototype v1 scope (playable)
One big looping arena, dots/XP, 4 ghost personalities, eat mode, 3 copy powers,
level-up choices, escalating waves, HUD (timer, level, combo), game over + restart.
HTML5 canvas — runs in any browser, no install.

## Note
Personal prototype with friends. Pac-Man/ghost likenesses are Namco IP and the
copy-power idea echoes Nintendo's Kirby — if this ever goes public, characters get
re-skinned as originals (the systems are ours).

## Content bible (owner brainstorm, 2026-10-19 — roadmap, not v1 scope)

### Copy-powers & weapons (eat enemies / level-up cards)
Weapons line, shields, chameleon tongue (long-range grab), laser beam, frost,
fire cone, Thor's hammer, necromancer (raise the eaten as allies), bow & arrow,
vampire teeth (lifesteal chomp). Scaling passives: powers that grow per X eaten.
**Blue (saved) powers:** consumables stored in slots — use on demand; +1 slot upgrades.

### Stat upgrades
Health, speed, mouth size — and SIZE shifting: small Pac (fast, narrow) ↔ large Pac
(slow, huge chomp radius).

### Transformations (timed forms)
Mrs. Pac, Hulk Pac, Wolverine Pac, Werewolf, Rubber-Ducky Pac, Kirby Pac
(steal ability on eat).

### Mounts & pets
- **Horse mount** — ride mode: speed + trample.
- **Capture system:** throw balls at weakened enemies to capture them as PETS that
  fight beside you. "Ball Master" upgrade: +1 pet slot. Capturing grants the Ash hat.

### Enemy roster (parody playground — friends build)
- Ghosts (the core four personalities + variants)
- All WoW classes, all Diablo 2 classes (as enemies with their signature moves)
- Mario villains, Sonic enemies/badniks, iconic Sega & Nintendo retro characters
- Comics & cartoons & video-game icons broadly
- Bosses: e.g. a Homelander-class villain (The Boys), mega-ghosts, Bowser-class heavies

### Scope discipline
v1 prototype = core loop + 3 copy powers. Everything above is the content roadmap,
added system by system. Re-skin rule for any public release stands (see Note).

### Ghost pressure (owner, 2026-10-19)
Ghosts are the core threat in TONS — escalating swarms that eventually flood the
whole screen. The swarm IS the clock: if your build can't keep up with the spawn
curve, you get buried and lose. Eating/clearing efficiency is survival, not score.

## Balancing doctrine (owner, 2026-10-19)
- Long-term balancing is expected and planned — the math is a living document.
- **Balance for style, not meta:** there must never be one correct build. Every
  5-tree neighbourhood on the ring should clear the swarm curve at a comparable
  rate while FEELING different (aggression, army, tank, greed...).
- Tune the spawn curve and outlier nodes — never a tree's identity. No dead picks,
  no auto-picks. If a build dominates, nerf the node, keep the fantasy.
- Playtests judge builds by "did it play like its style and survive", not by a
  single leaderboard number.

## Second ring: 12 stat/resource trees (owner, 2026-10-19)
Alongside the 12 power trees, 12 STAT/RESOURCE trees you PUMP with what you find
(dots, fruit, shards) or upgrade at level-up: Might (damage), Vitality (HP),
Regeneration, Armor, Swiftness (move speed), Haste (cooldowns), Reach (area/size),
Duration, Magnetism (pickup pull), Fortune (drop luck), Appetite (XP gain),
Phoenix (revives/second winds). Same ring logic; stat trees are the long-term grind
that makes any style's numbers hold against the swarm curve.

## Shops (owner, 2026-10-19)
- **Secret shop on every level** — hidden somewhere in the arena; finding it is a
  route decision (time in the open = swarm risk).
- **KIRBY runs the secret shop.** Of course he does — he sells STOLEN ABILITIES
  ("the good stuff"): copy-powers, blue-slot refills, one-off forms. Shady prices,
  paid in dots/fruit. He is, canonically, a dealer of other people's powers.
- **YOSHI sells gear** — the legit shop: saddles/mount gear, shields, charms,
  stat-tree pumps. Yoshi also takes trade-ins.

## Summons (owner, 2026-10-19)
FF7-style SUMMONS: rare, spectacular, screen-filling one-shots earned from elites,
bosses, or Kirby's top shelf — stored in blue slots, unleashed on demand
(giant ghost-dragon strafes the arena, screen-clearing chomp titan, etc.).
Summons are events, not abilities: long cooldowns, run-defining moments.

## Materia (owner, 2026-10-19)
FF7-style MATERIA: socket elemental materia (Fire, Frost, Lightning, Earth, Wind,
Water, Holy, Shadow...) into any power to CONVERT it — fire laser, frost hammer,
lightning tongue, holy chomp. Conversion changes damage type, status effects
(burn / freeze / shock / slow), and visuals. Powers gain materia slots as they
level. Enemies carry elemental weaknesses/resistances (ghost families included),
so re-socketing per level is a real decision. Materia drops from elites, and
Kirby sells the rare ones. This is the variety multiplier: every skill × every
element is a different build toy.

### Elemental status identities (owner + pass, 2026-10-20)
- **Lightning** — chains to nearby enemies. **Frost** — slows; stacks to a freeze.
- **Fire** — burn damage over time. **Psychic** — CONFUSES: enemies wander off or
  attack each other (swarm turns on itself).
- Earth — stagger/knockback. Wind — pushes and spreads the swarm thin.
- Water — soaks (wet targets make Lightning chain farther). Holy — bonus vs ghosts
  and undead. Shadow — blinds (misses).
- Combos are the toys: Water→Lightning, Frost stacks→shatter, Burn+Wind = wildfire.

## Marvel / X-Men layer (owner, 2026-10-20)
- **Stealable powers (Theft/Forms sources):** Wolverine claws + regen, Magneto's
  metal storm (devastates robot/badnik waves), Storm's weather field, Cyclops'
  optic blast (laser variant), Nightcrawler's BAMF teleport-dash, Colossus steel
  form, Phoenix fire (cosmic burn), Spider-sense + webs (slow zones), Iron Man
  repulsor barrage, Doctor Strange portals (teleport the swarm INTO each other),
  Gambit's charged cards, Rogue = the ultimate Theft capstone (touch-steal anything).
- **BATMAN is a boss:** the one enemy who PREPS. He studies your build between
  waves and comes back countering it — resistant to your main element, ready for
  your favourite trick. Beating him means beating your own meta. (Fits the
  balancing doctrine: Batman is the anti-meta made flesh.)

## Run structure: the long game (owner, 2026-10-20)
- Runs are built to last HOURS, not 15 minutes. Pacing, stat-tree pumping, materia
  hunting and shop routes are tuned for the long arc; difficulty breathes in waves
  instead of a straight ramp.
- **Big bosses every so often** — boss gates punctuate the run (mega-ghosts, Bowser-
  class heavies, Homelander-class villains, BATMAN). Each boss kill opens the next
  escalation band and pays out in materia/summons/unlock progress.

## Meta-progression: everyone is unlockable (owner, 2026-10-20)
- Every X runs (and for boss kills / capture milestones), you unlock a NEW PLAYABLE
  CREATURE/CHARACTER. The roster flips: villains and characters you fight become
  playable — ALL of them, eventually: ghosts, Mario villains, Sonic badniks,
  WoW/D2 classes, Marvel/X-Men, retro icons.
- Each unlockable has its own tree affinities (a ghost starts with Ghost Hunter +
  Death open; a knight class starts in Arsenal/Body...), its own base stats, and a
  signature power — the 12+12 rings re-skin around who's driving.
- Collection is the endgame: the roster screen is the trophy case.

## Roster scale: 500–1000 characters (owner, 2026-10-20)
- Target roster: **500–1000 pop-culture characters**, all easy-to-draw 2D
  (silhouette + signature colours + one prop = readable at sprite size).
- **Every character has a sound bite** — a short signature stinger on spawn/eat/
  unlock (synthesized jingles in v1; the roster data carries a `sound` field).
- **Unlocks are RANDOM:** milestone rewards draw a random locked character —
  nobody picks; the roster surprises you. Duplicates convert to shards (pump
  stat trees / that character's affinity).
- Feasibility system: characters are DATA, not bespoke code — archetype (chaser,
  brute, caster, trickster, swarm...) × element × signature power × palette.
  A roster table + template renderer makes 500–1000 tractable and consistent.

### Unlock rule (owner, 2026-10-20)
- A WIN = killing the level's boss. Each boss kill grants **1 unlock drawn from
  that level's enemy roster** (random draw per the unlock rule; duplicates →
  shards). Levels are therefore collection routes: to unlock a specific world's
  characters, you hunt its boss.

### Onboarding levels (owner, 2026-10-20)
- The first few levels keep it small on purpose: exactly **6 enemy types + 1 boss**
  per level, so new players can learn every enemy and the unlock loop.
- Early unlocks are EASY (generous rates) — the system teaches itself.
- The boss is the level's **super-rare** unlock: the trophy of the run.
- After the onboarding levels, rosters widen fast toward the full 500–1000 and
  rates harden to normal.

### Roster growth (owner, 2026-10-20)
- After the onboarding levels, each new level introduces exactly **3 new enemies**.
  The player always knows what's new, what's hunting them, and what's unlockable
  here — the roster grows at reading speed, all the way toward 500–1000.

### Pool & progression rules (owner, 2026-10-20)
- **The unlock pool is everything you have ever played.** Draws are random from
  your lifetime encountered roster. Enemies may fade OUT of later levels' spawns,
  but nothing ever leaves your pool — the pool only grows.
- **No level skipping.** Levels clear in order; the boss kill is the only door.
  Your pool, unlocks, and roster carry across all of it.

### Pool timing (owner, 2026-10-20)
- A level's new enemies join your unlock pool **only when its boss dies**. Seeing
  them mid-level adds nothing yet — kill the boss to pass AND to get the new pool.

## Juice (owner, 2026-10-20)
- BIG effects, shiny everything, BIG NUMBERS: floating damage numbers, particle
  bursts on every eat, hit-flash, screen shake scaled to the moment, boss-kill
  slow-mo + explosion of loot.
- He should eat HELLA pellets: pellet/dot density is generous to the point of
  comedy — rivers of pellets, streak trails, hoovering cascades. Eating should
  always FEEL like a feast, with combo announcements ("RAMPAGE", "FEAST", ...)
  and shiny chroma pickups you can spot across the map.

### The Feast (eat-mode signature, owner 2026-10-20)
- Eating a power-up triggers THE FEAST: the whole screen goes psychedelic (colour
  cycling, trails, warp) for the eat-mode window, and **every pellet on the map
  floods to him at speed** — a map-wide vacuum surge while ghosts turn edible.
  It is the loudest moment in the game and the reward for hunting the pellet.

## Boss timing & the endless map (owner, 2026-10-20)
- Maps are NEVER-ENDING: a level has no finish line, only its boss.
- The boss spawns when the game's math judges you strong enough to fight him
  (your build's power rating crosses his threshold) — not on a fixed clock.
- You may refuse the fight — but a refused boss becomes a SPAWNER: monsters
  increase faster because he is adding his own, and HIS escalation timer runs
  amplified, faster than the game's. Refusing is borrowing time at interest;
  eventually the flood takes you. Fight at your peak or drown at his pace.

## Survival resources (owner, 2026-10-20)
- **Heals scattered around the map** — fruit-tier health pickups placed and
  dropped around the arena; routing to a heal through the swarm is a decision.
- **Energy** — a second resource beside health: powers, dashes and forms burn
  it; it recovers from energy pickups (and its stat tree), not just time.
  Two-resource economy: health keeps you alive, energy keeps you dangerous.

## Voice & humour (owner, 2026-10-20)
- Pac is a FOUL little menace with Duke Nukem energy and a mouth full of Pac-Man
  references. One-liners on everything: eats, Feasts, level-ups, captures, boss
  arrivals, near-deaths. ("I'm here to eat pellets and kick ass — and I've got
  HELLA pellets.")
- Ghosts get taunted by name; bosses banter back (Batman preps in silence, which
  Pac finds rude). Kill streaks escalate his ego. Taking damage = swearing at
  the swarm, never at the player.
- Sound bites carry the roster's personality the same way: every character enters
  loud. Humour is crude, confident, and constant — never mean-spirited at the player.

## Platforms (owner, 2026-10-20)
- Primary: PC browser (big screen, WASD) via brentsnow.online.
- Secondary: MOBILE browser version — v1 already has drag + DASH touch controls;
  a dedicated mobile pass (responsive HUD, portrait play, bigger touch targets,
  swarm caps tuned for phone GPUs) is roadmap v2, not an afterthought port.

## Map themes (owner, 2026-10-20)
- Every level is a classic Nintendo/Sega world reborn as a looping PAC arena,
  with that world's enemies as the level roster and its boss as the gate:
  **Streets of Rage** (city streets, thugs), **Golden Axe** (battlefields,
  skeletons, rideable beasts), **Sonic** (Green Hill loops, badniks, Eggman
  boss), **Mario** (plains/castles, the full villain bench, Bowser), **Shinobi**
  ( rooftops, ninjas) — and more of the era's greats as levels are added.
- The arena logic never changes (looping, swarm, The Feast); the skin, music,
  roster and boss make each level a different game wearing PAC's engine.

## Main villain: BOMBERGUY (owner, 2026-10-20)
- The overarching bad guy of PAC is a Bomberman-class menace renamed **Bomberguy**
  — the name is ours, the menace is his.
- His weapon is AREA DENIAL: cross-shaped bomb blasts and planted bomb grids that
  carve the endless arena into shrinking safe zones while the swarm floods in —
  he doesn't chase you, he edits the map against you.
- Recurring nemesis: he seeds levels, taunts through boss fights (the only villain
  Pac respects enough to swear about), and is the final gate of the campaign.

### Bomberguy encore (owner, 2026-10-20)
- EVERY level ends the same way: kill the boss, then **Bomberguy shows up for the
  encore fight** — and he ALWAYS gets away (bomb-smoke escape at critical health).
  Beating him is never the level clear; the boss kill is. He is the recurring
  promise that the real fight is still coming — until the final level, where he
  doesn't run.

### The Curse (owner, 2026-10-20)
- Every Bomberguy escape ends with him throwing an **original curse** — a unique
  taunt generated for that moment, never repeated across runs. The game keeps a
  CURSE LEDGER: every curse he has ever thrown at you, collected in the roster
  screen like dark trophies. Pac answers with a foul one-liner of his own.
  The longer your history, the more personal the curses get.

## Art direction (owner, 2026-10-20)
- **Pencil & pencil-crayon on paper.** Everything looks hand-drawn: visible crayon
  strokes and paper grain, slightly wobbly sketch lines, colours laid in with
  crayon texture — occasionally colouring outside the lines on purpose.
- The whole roster (all 500–1000) is drawn in this one sketchbook style, which is
  what makes the template system look like a kid's legendary notebook instead of
  asset-store sprites. Juice effects are crayon scribbles going wild.

### The paper (owner, 2026-10-20)
- The ENTIRE game is drawn on SCHOOL PAPER — the maps included. Arenas are doodled
  levels on lined notebook paper: blue rules, red margin line, the works. Levels
  turn pages. The world is a school notebook that got possessed by an arcade.

### Art implementation (owner, 2026-10-20)
- The game is built as a normal 2D world; the look is a **doodle filter** over it:
  paper texture, line wobble/jitter, crayon colour treatment, sketch shading.
  Gameplay art stays simple shapes underneath — the filter makes it a notebook.
  This means prototypes can be re-skinned by the filter, not redrawn.

## Entrances (owner, 2026-10-20)
- **Star Wars style entrances.** Every level opens with an opening crawl up the
  paper telling that level's story. Bosses enter like Vader: the action stills,
  a silhouette, a fanfare sting, THEN the fight. Unlock reveals get the same
  theatre — a hero doesn't just appear in your roster, he ARRIVES.

### The opening (owner, 2026-10-20)
- The game opens on the crawl: "In a galaxy far, far away..." — the crawl text IS
  the rules and the story. Then Pac arrives and **EATS THE TEXT** — chomping
  through the words letter by letter (which quietly teaches movement and eating
  before the arena even starts). When the last word is gone, the paper rips open
  into Level 1. The tutorial is a meal.

### Opening finale (owner, 2026-10-20)
- After the last word of the crawl, the DEATH STAR rolls onto the page — and Pac
  eats that too, chunk by chunk, trench by trench, until the whole station is a
  snack and its little explosion is what rips the paper open into Level 1.
  The game's thesis in the first 60 seconds: nothing is too big to eat.

### The Empire answers (owner, 2026-10-20)
- The Death Star snack has consequences: the Empire sends its enforcer —
  **DARTH BOMBERGUY**. Bomberguy isn't a random villain; he is the retaliation.
  His first appearance is the Level 1 encore, and every escape-curse since is a
  Sith lord personally offended that a yellow circle ate his space station.

### World 1 story (owner, 2026-10-20)
- **World 1 is Pac eating THE EMPEROR.** The first world's boss is the ruler of
  the Empire himself — and Pac eats him like everything else.
- That is when DARTH BOMBERGUY makes his vow: he will END Pac. The vow is the
  campaign's engine — every encore escape, every original curse, is the vow
  renewing itself until the final level settles it.

## World map (owner, 2026-10-20)
- Worlds are **Mario 3-style overworld maps** drawn on the notebook paper: nodes,
  branching paths, your Pac token walking the routes. You CHOOSE where to go —
  which levels, shops (Kirby hides on some node every world), and risks to take.
- Choice is real but the gate is absolute: routes change what you face and what
  joins your pool, but the world's boss node must fall to move on. No skipping
  worlds; plenty of choosing inside them.

## Campaign structure (owner, 2026-10-20)
- **Universe → World/Planet → Levels.** Above the Mario 3 world maps sits a
  GALAXY map: universes (Star Wars, Mario, Sonic, Sega arcade, Marvel...) made of
  worlds/planets, each world holding several levels as its map nodes.
- Every universe stocks its levels with ITS OWN mobs — a universe's levels grow
  your pool with that universe's characters, bosses and flavour.
- Paths are chosen at every layer: which route across the galaxy, which path on
  the world map, which node next — but gates hold (a world's boss must fall
  before its routes onward open).

### Travel: black holes (owner, 2026-10-20)
- Worlds and universes are connected by **BLACK HOLES**. Pac travels mouth-first:
  jump in, ride a psychedelic crayon vortex (the Feast's visual language), get
  spat out on the next world's page. Black holes are the doors of the galaxy map —
  and spotting a new one on your current page is how new routes announce themselves.

## Agency doctrine (owner, 2026-10-20)
- The player is given A LOT of choice in how they set up and in gauging what they
  unlock. Draws are random — but the player steers everything around the draw:
  which character, which 5 trees, which materia loadout, which galaxy route,
  which world's pool to hunt, eat vs capture, shop or save, fight the boss now
  or farm longer. Random decides the card; the player decides the deck, the
  table, and when to play it. That steering IS the game.

## Intro script v2 (owner, 2026-10-20 — LONGER)
1. Black page. STAGE LIGHTING: a spotlight cone snaps onto the notebook paper,
   everything else dark. The crawl text rolls up through the light.
2. The text tells of THE EMPEROR — cut to him, sketched and cackling, and he
   wheezes the word: "DO IT."
3. DARTH BOMBERGUY fires the Death Star and BLOWS UP AN ARCADE-BOOTH PLANET.
4. PAC'S ENTRANCE — pure comedy: he tumbles in, goes ROW BY ROW eating the crawl
   text. The narrator tries to keep up, gets cut off mid-word, gives up. Pac
   GROWS with every row he eats.
5. Full-size Pac turns and eats the entire DEATH STAR. A cathedral-sized BURP.
   Then he FARTS himself backwards into a BLACK HOLE — gone. (That's travel.)
6. Darth Bomberguy escapes in the Q-WING — a stupid-looking ship shaped like the
   letter Q — shakes his fist, and VOWS to hunt Pac down. Title. Level 1.

## Chapter cinematic: PAC — JUDGEMENT DAY (owner, 2026-10-20)
- After the black hole, Pac lands on a planet and ends up at **The Legendary
  Salty Dawg Saloon** — bright neon, shots at the bar, sad and depressed (the
  hero at rock bottom; the saloon is the planet's hub).
- A T-1000 comes through a portal outside, naked as arrival protocol demands,
  sent to kill him. Pac EATS him.
- Pac walks out of the saloon looking like Arnold in T2 — leathers, shades,
  the walk. Title card: **PAC: JUDGEMENT DAY.**
- This is a chapter-opening cinematic in the intro's style: playable tone-setter,
  not a cutscene tax.

### Intro — final act (owner, 2026-10-20)
- The JUDGEMENT DAY sequence is not a separate cinematic: it is the FINAL ACT of
  the one entire intro. Full order: spotlight crawl → Emperor "DO IT" → arcade
  planet destroyed → Pac eats the text, grows, eats the Death Star → burp → fart
  into the black hole → Q-Wing vow → **lands: Salty Dawg Saloon (neon, shots,
  depressed) → T-1000 arrives through the portal → Pac eats him → T2 exit in
  leathers and shades → TITLE: PAC — JUDGEMENT DAY** → menu.

## Character select (owner, 2026-10-20)
- After the intro and title: CHARACTER SELECT. Unlocked heroes in full colour;
  locked heroes shown as SILHOUETTES with lock symbols — you can see the shape of
  who you're hunting (and roughly who it is), never the details. The select screen
  is the collection's shop window: every silhouette is a promise.
