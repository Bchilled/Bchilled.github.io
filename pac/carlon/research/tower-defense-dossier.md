# Tower defense systems: reference dossier (R1)
Built for Brent Snow's PAC game design files by Carlon. Compiled Tue Oct 20, 2026 (ET). Requested by Kanye (PAC thread, msg 1a15ac96ab1a5445).

**Sources and rules.** Same rules as the Vampire Survivors dossier. Every number comes from an official site or a game wiki, fetched Oct 20, 2026. URLs are listed per section. **UNKNOWN** means none of the pages I fetched publish it. Nothing is estimated. Where a wiki says a number was measured by players, I label it **(wiki-measured)**. Where two sources disagree, I label it **CONFLICT**. Where I did simple arithmetic on published numbers, I label it **DERIVED**.

**Which games.** Kanye's four were kept: Bloons TD 6, Kingdom Rush (the original 2011 game), Gem TD and Legion TD. Two of them need a version note:
- **Gem TD** exists as a Warcraft 3 map, a Dota 2 custom game (Dota 2 wiki), and the Flash game *Gem Tower Defense*, which is now kept alive as a JavaScript restoration at gemtowerdefense.com ("Created by Peter Holko"). I use the Dota 2 wiki for gem stats and waves, and the restoration's published "Classic" rules for the economy. Each fact is tagged **[Dota2]** or **[GTD-Classic]**.
- **Legion TD**: I cover *Legion TD 2* (AutoAttack Games, current official game), using the official manual and unit pages plus the official wiki. The original Warcraft 3 *Legion TD* map is not covered. Its numbers are UNKNOWN here.

---

## 1. Bloons TD 6 (Ninja Kiwi)
Sources: https://www.bloonswiki.com/Dart_Monkey_(BTD6) · https://www.bloonswiki.com/Upgrade · https://bloons.fandom.com/wiki/Crosspathing · https://bloons.fandom.com/wiki/Selling · https://www.bloonswiki.com/Targeting_priority · https://www.bloonswiki.com/Damage_type · https://www.bloonswiki.com/Cash · https://www.bloonswiki.com/Banana_Farm_(BTD6) · https://www.bloonswiki.com/Rounds_(BTD6) · https://www.bloonswiki.com/Difficulty · https://www.bloonswiki.com/Fortified_Bloon_(BTD6)

### 1a. Upgrade paths and costs
- Each tower has **3 upgrade paths with 5 tiers each**, written as path1-path2-path3 (e.g. "5-2-0").
- **Crosspath rule:** only 2 of the 3 paths can be bought on one tower, and only one of those 2 can go past tier 2. (fandom Crosspathing: "three upgrade paths, only 2 of which are selectable per tower. The limitation of not going past tier 2 for both still remains.")
- **Tier 5 is unique:** only one of each tier 5 upgrade can exist at a time. The exceptions are Crossbow Master with the Master Double Cross Monkey Knowledge, and Ice Monkeys used with Silas. In Co-op each player can have one.
- **Paragons** (v27.0+) need all three tier 5s of that tower on screen. Buying it merges every tower of that type into one unit. Its "Degree" (stat level) rises when more towers and Paragon Power Totems are sacrificed.
- **Unlock layer (meta):** each upgrade has a tower-XP unlock cost. Dart Monkey example: tier 1 needs 0 XP, tier 2 needs 100 XP, tier 3 needs 1,900 to 2,100 XP, tier 4 needs 7,500 to 12,000 XP, tier 5 needs 22,000 to 35,000 XP.
- **Difficulty price multiplier:** Easy x0.85, Medium x1.0, Hard x1.08. Impoppable prices on the tower pages run about x1.2 of Medium (e.g. Dart Monkey $240 vs $200). The BTD6 Difficulty page lists Easy/Medium/Hard only.

**Worked example: Dart Monkey, Medium prices (base $200)**

| Path | T1 | T2 | T3 | T4 | T5 |
|---|---|---|---|---|---|
| 1 | Sharp Shots $140 | Razor Sharp Shots $200 | Spike-o-pult $320 | Juggernaut $1,800 | Ultra-Juggernaut $15,000 |
| 2 | Quick Shots $100 | Very Quick Shots $190 | Triple Shot $450 | Super Monkey Fan Club $7,200 | Plasma Monkey Fan Club $45,000 |
| 3 | Long Range Darts $90 | Enhanced Eyesight $200 | Crossbow $575 | Sharp Shooter $2,050 | Crossbow Master $21,500 |

Cumulative cost at Medium: 0-0-0 $200 · 5-0-0 $17,660 · 0-5-0 $53,140 · 0-0-5 $24,615. The tower page has the full cost table for every crosspath and difficulty.

### 1b. Published per-tier scaling (Dart Monkey)
- **Base:** range 32 units, cooldown 0.95 s, pierce 2, damage 1, Sharp damage type, cannot hit Camo.
- **Path 3 range:**
  - Long Range Darts +8 range.
  - Enhanced Eyesight +8 more, plus Camo detection.
  - Crossbow: range 48 → 60, damage 1 → 3, pierce 2 → 5.
  - Sharp Shooter: damage 3 → 6, attack speed +100% (cooldown 0.475 s), every 10th shot crits for 60.
  - Crossbow Master: range 80, damage 8, pierce 8, Normal damage type, crit 80 every 5th shot, two bolts per shot.
- **Path 1:**
  - Spike-o-pult: damage 2, pierce 18, cooldown 1.15 s, +4.8 range.
  - Juggernaut: pierce 60, cooldown 1.0 s, +3 vs Ceramic, +2 vs Fortified.
  - Ultra-Juggernaut: pierce 210, bonus vs Ceramic 8, bonus vs Fortified 5, +20 vs Lead. Splits into 6 Juggernaut balls.
- **Path 2:**
  - Quick Shots: cooldown −15%.
  - Very Quick Shots: cooldown −33%.
  - Triple Shot: 3 darts per shot, cooldown −25%.
  - Super Monkey Fan Club: cooldown −50%, plus an ability (10 Dart Monkeys become Super Monkeys for 15 s, 50 s cooldown).
  - Plasma Monkey Fan Club: 19 towers, +1 damage, +3 pierce, +100% attack speed, Plasma damage type.

### 1c. Targeting modes
- **Standard options:** First (closest to the exit by track length; the default), Last (closest to the entrance), Close (closest to the tower), Strong (most layers; ties go to First).
- Targeting respects line of sight. New towers default to First and can't target Camo.
- Many towers and upgrades add special modes. Examples: Sniper "Elite" (Strong until a bloon passes 75% of the track, then First), Dartling "Target Independent", Etienne drone splits. Tack Shooter and Ice Monkey always target Close.
- **Camo prioritisation** and **Marked prioritisation** are toggles layered on top of the mode.
- **Strong order** is a published 25-step list, from boss and Dreadrock bloons at the top down to Red and Test bloons.

### 1d. Damage types (BTD6) vs bloon immunities
Rows are damage types. Y = can damage, N = cannot. (Wiki table, BTD6 section.)

| Type | Black | White | Lead | Frozen | Purple | Glass |
|---|---|---|---|---|---|---|
| Sharp | Y | Y | N | N | Y | Y |
| Shatter | Y | Y | N | Y | Y | Y |
| Explosion | N | Y | Y | Y | Y | Y |
| Fire | Y | Y | Y | Y | N | Y |
| Cold | Y | N | N | Y | Y | Y |
| Glacier | Y | N | Y | Y | Y | Y |
| Frigid | Y | N | Y | Y | N | Y |
| Energy | Y | Y | N | Y | N | N |
| Plasma | Y | Y | Y | Y | N | N |
| Acid | Y | Y | Y | Y | Y | N |
| Normal | Y | Y | Y | Y | Y | Y |

- BTD6 uses **immunity (can/can't)**, not percentage multipliers.
- **Health modifiers sit on top:**
  - Fortified: Lead takes 4 damage to pop; Ceramic and MOAB-class take 2x damage to pop.
  - Ceramic has 10 HP. From round 81 it is replaced by Super Ceramic at 60 HP.
  - MOAB HP rises per round from round 81 (see 1g).

### 1e. Sell and rebuild values
- **Default sellback is 70%** of total cash spent on the tower and its upgrades, rounded up. (The Flash BTD Battles also used 70%. Most older Bloons games used 80%.)
- **Increases:**
  - +5% from the Better Sell Deals Monkey Knowledge.
  - +4% per Favored Trades in range, stacking 3 times.
  - +10% on Banana Farm with the Banana Salvage upgrade.
  - +2% on Village and Farm from Flat Pack Buildings.
- **Caps:** soft cap 95% sell rate, hard cap $10,000,000 per tower.
- **Special cases:** CHIMPS mode disables selling. While the Lych boss is in play, all sellback is reduced by a flat 35%.
- **Rebuild:** there is no rebuild-discount rule. A sold tower is simply bought again at full price. (I found no published rebuild mechanic.)

### 1f. Income and interest economy
- **Starting cash:** $650 in most Bloons TD games.
- **Per pop:** $1 per layer popped.
- **End of round:** $100 + round number (round 1 pays $101, round 100 pays $200).
- **Late-round cash cut:** pops pay 50% (rounds 51–60), 20% (61–85), 10% (86–100), 5% (101–120), 4% (121–140), 2% (141+).
  - **CONFLICT:** the same page's update history says v53.0 raised rounds 101–120 from 5% to 8%.
- **Banana Farm:** costs $1,250 at Medium. Makes 4 bunches × $20 = $80 per round.
  - Path 1, by tier: 6 bunches ($120), 8 bunches ($160), 16 bunches ($320). Tier 4 makes 5 crates × $300 = $1,500 per round. Tier 5 makes $7,000 per round.
- **Interest exists:** the Monkey Bank (Banana Farm path 2) stores cash and **adds 15% interest at the end of each round**. Capacity is $7,000 ($9,500 with Bigger Banks). It stops producing when full.
- **Other end-of-round income:** Merchantman $200, Favored Trades $500, Trade Empire $800 (Buccaneer path). Monkey Town gives +50% cash per pop. Monkey City gives +20% to all income.

### 1g. Wave (round) composition rules
- **Rounds are fixed and predetermined,** with a published list per round: bloon groups, duration, RBE (total health), cash and XP. Examples:
  - Round 1: Red ×20, 17.51 s.
  - Round 40: one MOAB.
  - Round 100: one BAD.
  - Rounds 101–140 were made predetermined in v25–26.
- **Difficulty sets the round range and lives:**

| Difficulty | Rounds | Starting lives | Bloon speed |
|---|---|---|---|
| Easy | 1–40 | 200 | x1.0 |
| Medium | 1–60 | 150 | x1.1 |
| Hard | 3–80 | 100 | x1.25 |

- **Freeplay scaling:**
  - Speed +2% per round from round 81, with jumps at 101, 151, 201 and 252.
  - MOAB HP +2% per round (81–100), +5% (101–124), +15% (125–150), +35% (151–250), and so on.
  - From round 81, bloons spawn 1 child instead of 2.
  - Status durations drop 10% to 50% from round 150.

---

## 2. Kingdom Rush (Ironhide, original 2011 game)
Sources: https://kingdomrushtd.fandom.com/wiki/Towers/Kingdom_Rush · https://kingdomrushtd.fandom.com/wiki/Archer_Tower (+ Marksmen Tower, Sharpshooter Tower, Rangers Hideout, Musketeer Garrison, Mage Tower, Adept Tower, Wizard Tower, Dwarven Bombard/Artillery/Howitzer pages) · https://kingdomrushtd.fandom.com/wiki/DPS_and_COST_of_towers · https://kingdomrushtd.fandom.com/wiki/Armor_and_Magic_resistance · https://kingdomrushtd.fandom.com/wiki/True_Damage · https://kingdomrushtd.fandom.com/wiki/Gold · https://kingdomrushtd.fandom.com/wiki/Lives · https://kingdomrushtd.fandom.com/wiki/Encyclopedia · https://kingdomrushtd.fandom.com/wiki/Southport

### 2a. Upgrade paths and costs
- **4 tower families:** Ranged (archers), Melee (barracks), Magic (mages), Artillery (dwarves).
- Each family has a **linear chain of levels 1 → 2 → 3**, then **branches into 2 level-4 specialists**. KR has 20 towers in all, including 2 specials used only in the final stage.
  - Archer branch: Rangers Hideout / Musketeer Garrison.
  - Barracks branch: Holy Order / Barbarian Mead Hall.
  - Mage branch: Arcane Wizard / Sorcerer Mage.
  - Artillery branch: Big Bertha / Tesla x104.
- **Level-4 towers have abilities** you buy in 3 ranks. Example: Rangers Hideout Poison Arrows costs 250/500/750 per rank, and Wrath of the Forest costs 300/450/600.
- **Unlock layer (meta):**
  - Level 2 towers unlock at stage The Farmlands, level 3 at Pagras.
  - Each level-4 tower unlocks at a named stage (e.g. Rangers Hideout at Silveroak Forest, Tesla x104 at The Wastes).
  - Star-bought permanent upgrades also exist (e.g. Archer "Salvage", "Eagle Eye").

| Archer line (KR) | Step cost | Damage | Attack rate | Range |
|---|---|---|---|---|
| Archer Tower (L1) | 70 | 4–6 | 0.8 s | Short (280) |
| Marksmen Tower (L2) | 110 | 7–11 | 0.6 s | Average (320) |
| Sharpshooter Tower (L3) | 160 | 10–16 | 0.5 s | Long (360) |
| Rangers Hideout (L4) | 230 | 13–19 | 0.4 s | Great (400) |
| Musketeer Garrison (L4) | 230 | 35–65 | 1.5 s | Extreme (470) |

| Mage line (KR) | Step cost | Damage | Attack rate | Range |
|---|---|---|---|---|
| Mage Tower | 100 (90 with upgrade) | 9–17 | 1.5 s | Short (280) |
| Adept Tower | 160 | 23–43 | 1.5 s | Average (320) |
| Wizard Tower | 240 | 40–74 | 1.5 s | Long (360) |

| Artillery line (KR) | Step cost | Damage | Attack rate | Range |
|---|---|---|---|---|
| Dwarven Bombard | 125 (112) | 8–15 | 3.0 s | Average (320) |
| Dwarven Artillery | 220 (198) | 20–40 | 3.0 s | Average (320) |
| Dwarven Howitzer | 320 (288) | 30–60 | 3.0 s | Average/Long (360) |

- The number in brackets after "Range" is the wiki's "Scope in Major Axis" value.
- **Cumulative cost and DPS (wiki-measured, mobile version):**
  - Archer 70 / 6.88 DPS → Marksmen 180 / 16.5 → Sharpshooter 340 / 28.6 → Rangers 570 / 44.
  - Mage 90 / 10.33 → Adept 234 / 25.67 → Wizard 450 / 44.
  - Gold per DPS gets slightly worse at higher tiers. Archer line: 10.18 → 10.9 → 11.89 → 12.95.

### 2b. Targeting modes
- **No player-set targeting mode is documented** on the wiki pages I fetched. Player-selectable targeting: UNKNOWN.
- What is documented: Poison Arrows targets enemies that are not yet poisoned, then (in some versions) "enemies closest to the exit". A community strategy page says Magic towers "randomly attack both weak and strong enemies". Artillery can't target flyers directly, but its splash hits them (official in-game tip).
- Barracks soldiers block enemies at a **rally point the player can move**. This is the KR control lever in place of a targeting setting.

### 2c. Damage and armor types
- **Two damage channels:** Physical (arrows, melee, artillery), which Armor reduces, and Magic, which Magic Resistance reduces.
- **True Damage** ignores both (confirmed by the developers per the wiki). An official tip says "Poison damage ignores armor".
- **Published bands:**

| Band | Damage reduction |
|---|---|
| None | 0% |
| Low | 1–30% |
| Medium | 31–60% |
| High | 61–90% |
| Great | 91–99% |
| Max / Immune | 100% |

- "Vulnerable" means increased damage taken.
- **Examples (KR):** Orc 30% armor · Brigand 50% · Marauder 60% · Dark Knight 80% · Shaman 85% magic resistance · Giant Spider 65% MR.
- Some upgrades reduce armor. Example: the Piercing Shots star upgrade makes archers ignore 10% of armor.

### 2d. Sell and rebuild values
- **Normal sell return is 60%** of value.
- The "Salvage" star upgrade raises Marksmen-line towers to **90%**.
- Towers are built on fixed **Strategic Points** (Southport starts with 8). Selling frees the point for a different tower.
- Rebuild discount: none published (UNKNOWN).

### 2e. Income economy
- **Each stage sets starting gold** (Southport campaign: 265). Every enemy pays a fixed bounty. **DERIVED** from Southport's wave-income column (income ÷ count): Goblin 3 gold, Orc 9 gold.
- **Summoned or spawned enemies pay no gold.** Examples: skeletons raised by Necromancers, spider hatchlings.
- **Calling a wave early gives bonus cash** and reduces spell cooldowns "a bit" (official in-game tip). The bonus amount: UNKNOWN.
- Interest: none documented (UNKNOWN).
- **Lives:** 20 per campaign level. Most enemies cost 1–6 lives. Bosses cost 20 (first three games), and a boss leak ends the level. Stars: 18+ lives = 3 stars, 6–17 = 2, 1–5 = 1.

### 2f. Wave composition rules
- **Waves are fixed per stage and difficulty mode.** The wiki lists each stage's waves. Example, Southport campaign (7 waves):
  1. Goblin ×3
  2. Goblin ×6
  3. Goblin ×9
  4. Goblin ×4 + Orc ×1
  5. Orc ×3
  6. Goblin ×10 + Orc ×4
  7. Goblin ×16
- **Heroic and Iron challenges use different wave tables** for the same map. Heroic Southport starts with 170 gold and opens with 20 Goblins.

---

## 3. Gem TD
Sources: [Dota2] https://dota2.fandom.com/wiki/Gem_TD · [GTD-Classic] https://www.gemtowerdefense.com/classic-details/ · https://gemtowerdefense.fandom.com/wiki/Upgrading_chances · https://gemtd.fandom.com/wiki/GemTD (recipe list)

### 3a. "Upgrade paths" = random placement + combining
- **Build phase:** place 5 gems, all random type and random quality. Keep one; the other 4 turn into stone, which forms the maze. [Dota2] [GTD-Classic]
- **Merging:**
  - Two matching gems (same type and quality) merge one quality higher.
  - Four matching gems merge two qualities higher.
  - [GTD-Classic] Four Perfect gems make an Uber Stone.
- **Special towers** come from exact recipes, e.g. Silver = Sapphire L1 + Diamond L1 + Topaz L1. They can be upgraded again with further recipes, e.g. Silver Knight = Silver + Aquamarine L2 + Ruby L3. The Dota 2 version also has 5-gem "secret" towers.
- **Quality ladder:** [Dota2] gem levels 1–6. [GTD-Classic] Chipped, Flawed, Normal, Flawless, Perfect.
- **Upgrade Chances** (gold sink that shifts quality odds) [GTD-Classic]:

| Level | Cost to next | Chipped | Flawed | Normal | Flawless | Perfect |
|---|---|---|---|---|---|---|
| 0 | 20 | 100% | 0 | 0 | 0 | 0 |
| 1 | 50 | 70% | 30% | 0 | 0 | 0 |
| 2 | 80 | 60% | 30% | 10% | 0 | 0 |
| 3 | 110 | 50% | 30% | 20% | 0 | 0 |
| 4 | 140 | 40% | 30% | 20% | 10% | 0 |
| 5 | 170 | 30% | 30% | 30% | 10% | 0 |
| 6 | 200 | 20% | 30% | 30% | 20% | 0 |
| 7 | 230 | 10% | 30% | 30% | 30% | 0 |
| 8 | — | 0 | 30% | 30% | 30% | 10% |

Formula: 20 + 30 × level, max level 8. The fandom wiki gives the full tree as 1,000 gold.
- **Other costs** [GTD-Classic]:
  - Repick: 25 × (repicks bought + 1).
  - Buy Life: 10 + 2 × (lives already bought). Lives are capped at 50.
  - [Dota2] Downgrade a gem to a random lower quality: 200 gold.
- **Kill-based levelling** (source is the Japanese atwiki for the Flash game): every 10 kills raises a gem 1 level, adding +10% of base damage. [GTD-Classic] The Uber Stone uses "each 10 kills adds 5% of base damage".

### 3b. Published per-tier scaling [Dota2]
- **Amethyst (P), range 500, 0.60 s:** damage 2/4/6/8/10/70. Armor shred −2/−4/−8/−16/−32/−64.
- **Aquamarine (Q), range 400, 0.25 s (L6: range 500, 0.10 s):** damage 2/4/8/16/24/80.
- **Diamond (D), range 500, 1.00 s (L6 0.70 s):** damage 5/10/20/40/80/460.
- **Emerald (G), range 500, 1.00 s:** damage 2/4/6/8/10/12. Poison DPS 2/4/8/16/32/128 for 5 s.
- **Opal (E), range 500:** damage 1–6. Attack-speed aura +20/30/40/50/60/70.
- **Ruby (R), range 500, 1.00 s:** damage 4/8/12/24/48/150. Cleave 30/40/50/60/70% in a 300–500 radius; L6 does full damage at 700.
- **Sapphire (B), range 600:** slow −60/−90/… movement speed.
- **MVP bonus:** the top-damage tower each round gets +10% damage and −10% enemy magic resistance nearby. At 10 MVPs it gains a 600-range aura that gives +75% damage.

### 3c. Targeting modes
- [Dota2] Towers auto-attack. The player can direct towers manually or tell them to stop, to focus fire or to manage MVP awards.
- Named targeting modes (First/Last etc.): UNKNOWN.

### 3d. Damage and armor types
- [Dota2] Enemies carry skills such as Magic Immunity, Physical Immune, High Armor, Evasion, Refraction and Reactive Armor. Gems have mixed physical/magic damage, so "balance physical and magic damage" is the wiki's advice. A numeric multiplier table: UNKNOWN for Dota 2.
- **[GTD-Classic] full elemental table** (damage before armor). Note: this table was added to Classic by the restoration (shared with its Season 2), so it is not the original Flash rule set.

| Damage type | Yellow | Blazed | White | Pink | Green | Red | Blue |
|---|---|---|---|---|---|---|---|
| Amethyst | 80% | 80% | 80% | 175% | 80% | 80% | 80% |
| Water (Aquamarine/Opal) | 100% | 190% | 80% | 100% | 70% | 100% | 40% |
| Diamond | 60% | 100% | 160% | 20% | 100% | 120% | 100% |
| Emerald | 70% | 70% | 70% | 150% | 170% | 70% | 70% |
| Ruby | 100% | 80% | 100% | 80% | 50% | 180% | 100% |
| Sapphire | 100% | 100% | 100% | 100% | 100% | 100% | 175% |
| Topaz | 160% | 100% | 60% | 120% | 70% | 50% | 100% |

- **Armor value and armor type are separate multipliers.** Worked example from the page: 100 × 1.50 × 0.467 = 70.05 (Emerald vs Pink armor with 19 armor). Negative armor increases damage.
- **Difficulty adds flat armor:** Easy −5, Normal 0, Hard +8, Extreme +12, Survival +16, Legendary +17.

### 3e. Sell and rebuild values
- **Placed gems cannot be sold or removed. Stones can be removed.** (Japanese atwiki: "一度設置した宝石は消せないが、石は消すことが出来る".) Sell value: none, since there is no sell.
- [GTD-Classic] Rock removal is allowed even during a wave.
- Rock removal cost: UNKNOWN.

### 3f. Income economy [GTD-Classic]
- **Start:** 10 gold and 10 lives.
- **Kill gold:** enemies up to level 40 pay (level ÷ 4) + 1 gold. After level 40 they pay 25.
- **Wave-clear gold:** 5 + 2 × (new level).
- **Interest:** none published (UNKNOWN). Gold is spent on chances, repicks, lives and special-tower upgrades.

### 3g. Wave composition rules
- [GTD-Classic] 10 enemies per level, spawning one per second. Every 4th level is flying. Easy to Extreme end after level 50; Survival is endless. Each leak costs 1 life (escalating only on Legendary).
- [Dota2] 50 named waves. A boss every 10 waves (Invincible Dog, Shakbag, Carpet Rider, Thrilling Ghost, Baby Roshan). Some waves can roll an alternative enemy. Waves add skills as they go: Invisibility at 8, Evasion at 9, Disarm at 12, Magic Immunity from 16, Physical Immune from 23, Reactive Armor at 24, and so on. After wave 50, waves repeat with different skills. Creeps path through 5 checkpoints in order, taking the shortest route between them.

---

## 4. Legion TD 2 (AutoAttack Games)
Sources: https://beta.legiontd2.com/manual/ · https://beta.legiontd2.com/units/proton/ · /units/atom/ · /units/nucleus/ · /units/pirate-skeleton/ · /units/spectral-scallywag/ · https://beta.legiontd2.com/legionspells/ · https://beta.legiontd2.com/updates/v605-shop-guilds/ · https://legiontd2.wiki.gg/wiki/Attack_%26_Defense_Types · https://legiontd2.wiki.gg/wiki/Worker · https://legiontd2.wiki.gg/wiki/Income · https://legiontd2.wiki.gg/wiki/Damage_formula · https://legiontd2.wiki.gg/wiki/Wave · https://legiontd2.wiki.gg/wiki/Wave_1:_Crabs · https://legiontd2.wiki.gg/wiki/Pawn_Shop

### 4a. Upgrade paths and costs
- **Fighters** are placed on your own lane grid. After each wave they are fully healed and restored to their original positions (official manual).
- **Each fighter has an upgrade chain**, and some branch. Per the wiki fighter list, some have "two very different upgrade paths" and one has "three upgrade paths".
- **8 legions** with 12–15 fighters each. A Reroll swaps up to 4 fighters once per game.
- **Official per-tier stats** (cost shown as total value = previous + upgrade cost):

| Fighter | Value (gold) | Health | DPS | Range | Types |
|---|---|---|---|---|---|
| Proton (T1 basic) | 20 | 120 | 11.98 | 300 | Pure / Immaterial |
| Atom (upgrade) | 90 (20 + 70) | 640 | 45.51 | 300 | Pure / Immaterial |
| Nucleus (upgrade) | 265 (90 + 175) | 1,880 | 45.51 | 500 | Pure / Immaterial |
| Pirate Skeleton (T3 basic) | 80 | 760 | 25.83 | 100 (melee) | Pierce / Swift |
| Spectral Scallywag (upgrade) | 270 (80 + 190) | 2,400 | 100.00 | 100 (melee) | Pierce / Swift |

Nucleus can only be built once. Its ability gives every Atom and Proton +50% attack speed at full mana.

### 4b. Targeting modes
- Fighters "automatically attack and cast spells" (manual). A player-set targeting mode: UNKNOWN (none documented).
- Player control comes from placement, plus Mastermind "Dual Build" lane sharing.

### 4c. Damage and armor types
- **4 attack types:** Piercing, Impact, Magic, Pure.
- **5 defense types:** Swift, Fortified, Natural, Arcane, Immaterial.
- **Multipliers range from 75% to 125%.** The official wiki chart (image alt text):

| Attack vs | Swift | Natural | Fortified | Arcane | Immaterial |
|---|---|---|---|---|---|
| Impact | −20% | −10% | +15% | +15% | 0 |
| Pierce | +20% | −15% | −20% | +15% | 0 |
| Magic | 0 | +25% | +5% | −25% | 0 |
| Pure | 0 | 0 | 0 | 0 | 0 |

- **Pure and Immaterial are neutral** ("no advantage or disadvantage"; "equally effective against all damage types"). The Immaterial and Pure cells are from the text, not the chart.
- **Damage formula:** percentage modifiers multiply one after another; flat reductions are added after. Wiki example: 34 × 0.75 × 0.9 × 0.955 + (−1) + (−5) = 19.204, rounded to 19.
- **"Ability damage"** is a modifier on top of a base type.

### 4d. Sell and rebuild values
- **Default sell refund is 60%.** Official 6.05 patch notes: the Hybrid builder "Sell units for 80% instead of 60%". Hybrid's Eggsack sells for 95%.
- **Raised refunds:**
  - The Pawn Shop legion spell sets 90% "for the rest of the game" and adds +75 gold.
  - Pirate Skeleton's Secret Stash ability sells it for 90% of total cost.
  - The Sacrifice legion spell: "Refund a fighter for full value + 92 gold".
- **Freshly placed units:** a 100% refund is claimed in a Steam community thread ("If you freshly placed the unit you can sell it for 100%"). That is community, not official; treat it as unconfirmed.
- Fighters can't be moved, only sold and rebuilt (same Steam thread). No official source found for this either.

### 4e. Income economy (two currencies, no interest)
- **Gold** builds fighters and trains workers. Earned from kills, wave clears, opponent leaks, damage to the opposing king, and **income at the end of each battle phase**.
- **Mythium** comes passively from **Workers**: each costs 50 gold and makes 1 mythium per 10 seconds. It is spent on **mercenaries** (units sent to attack the opponent with the next wave) or **King upgrades**.
- **Income rises permanently whenever you spend mythium.** So mythium spending = your gold growth. Saving mythium instead threatens a big leak. King upgrades give the same income as sends, but only during the build phase.
- Interest: none documented (UNKNOWN).
- **Catch-up systems:**
  - "Shutdown Bounty": bonus gold when a player who is ahead in Power Score leaks.
  - Classic mode: bonus income for much lower-rated players. Parties of 5–8 get up to +25%.
- **"Recommended value"** is shown each wave: the fighter value needed to clear, adjusted for the opponent's saved mythium.

### 4f. Wave composition rules
- **21 fixed waves** with "the same stats and in the same order every game" (manual). Most games end before wave 21.
- Each wave has its own attack/defense type. Wave 1: 12 Crabs, Pierce/Fortified, 6 gold each (72 total).
- **Wave list:**

| Waves | Enemies |
|---|---|
| 1–5 | 12 Crab, 12 Wale, 18 Hopper, 12 Flying Chicken, 8 Scorpion + Boss |
| 6–10 | 6 Rocko, 10 Sludge, 12 Kobra, 12 Carapace, Granddaddy (boss) |
| 11–15 | 12 Quill Shooter, 12 Mantis, 6 Drill Golem, 12 Killer Slug, 8 Quadrapus + Boss |
| 16–20 | 18 Cardinal, 12 Metal Dragon, 6 Wale Chief, 12 Dire Toad, Maccabeus |
| 21 | Legion Lord (Immaterial) |

- **The variable part is mercenaries** the opponent sends, which join the next wave.
- **Legion Spells:** on wave 11, pick 1 of 3 (randomised from 25+, the same choices for all players).

---

## 5. Cross-game summary (facts only)

| Topic | BTD6 | Kingdom Rush | Gem TD | Legion TD 2 |
|---|---|---|---|---|
| Upgrade shape | 3 paths × 5 tiers; 2 paths max, only 1 past T2; Paragon merge | Linear L1–L3, then 1 of 2 L4 branches; L4 abilities in 3 ranks | Random gem + merge 2→+1 / 4→+2 quality; recipe towers | Per-fighter chains, some branching |
| Targeting | First/Last/Close/Strong + specials | None documented; barracks rally point | Auto + manual focus/stop | Auto |
| Type system | Immunity grid (can/can't), 11 types | Physical vs Magic; % armor/MR bands; True dmg | [GTD-Classic] 7×7 % table + numeric armor; [Dota2] immunity skills | 4 attack × 5 defense, 75–125% |
| Sell | 70% (cap 95%) | 60% (90% with Salvage) | Gems can't be sold; stones removable | 60% (90% Pawn Shop/Pirate Skeleton; Hybrid 80%) |
| Income | Pop $1/layer + $100+round; farms; 15% bank interest | Kill bounty + early-call bonus | Kill gold + wave-clear gold | Kill/clear gold + income from mythium spent (workers) |
| Interest | Yes (Monkey Bank 15%/round) | UNKNOWN | UNKNOWN | UNKNOWN (none documented) |
| Waves | Fixed per round, difficulty sets range | Fixed per stage/mode | Fixed list, flying every 4th (Classic); boss every 10 (Dota2) | 21 fixed waves + player-sent mercs |

---

## 6. UNKNOWN list (13)
1. BTD6: a rebuild discount or rebuild mechanic.
2. Kingdom Rush: player-selectable targeting mode.
3. Kingdom Rush: early-wave-call bonus amount.
4. Kingdom Rush: interest.
5. Kingdom Rush: rebuild discount.
6. Gem TD: named targeting modes.
7. Gem TD [Dota2]: numeric damage-type multiplier table.
8. Gem TD: rock removal cost.
9. Gem TD: interest.
10. Legion TD 2: player-set targeting mode.
11. Legion TD 2: interest.
12. Legion TD 2: official confirmation of the 100% refund for freshly placed units (community claim only).
13. Original Warcraft 3 Legion TD: not covered.

---

## 7. Relevance to PAC canon (mapping only, no design)
Canon (Kanye, 2026-10-20): PvE survivor MOBA; lane maps (3/5/7 lanes); destroy 3 towers to open the lair; towers are upgradable and rebuildable; towers falling is pressure, not the loss; in-match economy is pellets, coins and XP offers.

| Canon question | Where the facts above apply |
|---|---|
| How do PAC's towers upgrade (shape)? | Four published shapes: BTD6 multi-path with exclusivity caps (1a); KR linear-then-branch (2a); Gem TD merge/recipe (3a); LTD2 per-unit chains (4a). |
| What does a tower cost per tier, and how fast does power grow per tier? | Per-tier cost/stat tables: BTD6 Dart Monkey (1a, 1b); KR archer/mage/artillery (2a), including wiki-measured gold-per-DPS; Gem TD per-level stats (3b); LTD2 official HP/DPS/range per tier (4a). |
| What does "rebuildable" return when a tower is sold or lost? | Published sell rates: 70% BTD6, 60% KR, 60% LTD2; raised rates of 80–95%; Gem TD has no sell (1e, 2d, 3e, 4d). None of the four publishes a rebuild discount. |
| Do towers need a damage/armor web? (Links to Kanye's open stat-math item on damage-type identities and weakness web bounds x1.50/x0.25.) | Published ranges: LTD2 75–125%; Gem TD Classic 20–190%; KR % reduction bands; BTD6 binary immunities (1d, 2c, 3d, 4c). |
| Do towers pick targets on their own or by player setting? | BTD6 player modes (1c); KR rally point instead (2b); Gem TD manual focus (3c); LTD2 auto (4b). |
| How do pellets/coins compare to TD income models? | Per-kill + per-wave (BTD6, Gem TD); per-kill + early-call bonus (KR); spend-to-raise-income (LTD2); interest bank (BTD6 Monkey Bank) (1f, 2e, 3f, 4e). |
| How do PAC's swarm waves compose and scale? | Fixed tables (all four); difficulty-set range (BTD6); flying every Nth wave and a boss every 10 (Gem TD); opponent-added units (LTD2 mercenaries); freeplay % scaling formulas (BTD6 1g). |
