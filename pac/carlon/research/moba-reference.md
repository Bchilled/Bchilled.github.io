# MOBA design reference for PAC (groundwork, not decisions)
Carlon, for Brent Snow. Pulled Tue Oct 20 2026 (ET) from official/community wikis. Raw pulls: /workspace/pac-game/raw/moba/.
Rules: numbers are as published on the cited page. **UNKNOWN** = not on the pages fetched. **DERIVED** = arithmetic from cited numbers. **CONFLICT** = two cited statements disagree. Live-service games patch often; re-check before relying on a number.

Wikis used: LoL = wiki.leagueoflegends.com (official-community wiki) · Dota 2 = liquipedia.net/dota2 (dota2.fandom.com blocked the fetch) · Pokémon Unite (PU) = Bulbapedia · HotS = heroesofthestorm.fandom.com · MLBB = mobile-legends.fandom.com (several MLBB pages are marked incomplete by the wiki itself).

---
## 1. Map and lane structure
| Game | Layout | Source |
|---|---|---|
| LoL (Summoner's Rift) | 3 lanes from bases in opposite corners; river crosses the other diagonal; jungle with neutral camps between. Per team: outer, inner, inhibitor turret per lane + 2 Nexus turrets (= 11, DERIVED), 3 inhibitors, 1 Nexus | wiki.leagueoflegends.com/en-us/Summoner%27s_Rift · /Turret |
| Dota 2 | 3 lanes (top/mid/bot), river splits the map; safe lane vs off lane. 11 towers per side (3 per lane T1-T3 + 2 T4 at the Ancient), 6 barracks (melee + ranged per lane), 1 Ancient | liquipedia.net/dota2/Map · /Buildings |
| PU (Theia Sky Ruins) | 5v5; Top Path, Bottom Path, Central Area (jungle). 5 goal zones per team: 2 top, 2 bottom, 1 base goal (indestructible). Speed-flux roads between intact goals | bulbapedia.bulbagarden.net/wiki/Theia_Sky_Ruins |
| HotS | Multiple battlegrounds, each with its own objective; lanes guarded by Forts, Keeps, Towers; Core in base | heroesofthestorm.fandom.com/wiki/Core |
| MLBB (Land of Dawn) | 5v5, 3 lanes, 3 turrets per lane then base; jungle with buff monsters; Turtle + Lord bosses | mobile-legends.fandom.com/wiki/Battlefield_Guide · /Classic |

## 2. Match length and win condition
| Game | Win condition | Length |
|---|---|---|
| LoL | Destroy enemy Nexus (5,500 HP) | No timer; typical length UNKNOWN (not published) |
| Dota 2 | Destroy enemy Ancient (4,500 HP, 12 regen, 23 armor; invulnerable until both T4 towers fall) | No timer; UNKNOWN typical |
| PU | Highest score when time runs out; tie → team that reached the score first | Standard 10 min 5v5; Quick Battle 5 min 3v3/4v4; "First to 500" mode has no timer |
| HotS | Destroy enemy Core; Core is protected until Fort + Keep fall in at least one lane | No timer; UNKNOWN typical |
| MLBB | Destroy enemy base | UNKNOWN (not on pages fetched) |
Sources: LoL /Nexus · liquipedia /Buildings · bulbapedia /Unite_Battle · HotS /Core · MLBB /Classic

## 3. In-match XP and level curve
- **LoL:** cap 18 (20 via role quest). XP to next level: 280 (L2), +100 each level, 1,880 for L18. Total to L18 = 18,360 (DERIVED). Wiki table: L6 after ~9 solo waves, L18 after ~60 solo waves. Kill XP falls off against lower-level targets (min 40%); "comeback bonus" XP when killing higher-level enemies. — /Experience_(champion)
- **Dota 2:** cap 30. Fixed table, no formula: 240 to L2, total 5,900 at L10, 21,400 at L20, 34,400 at L25, 64,400 at L30 (DERIVED from table last step 8,000). XP shared within 1,500 radius. — liquipedia /Experience
- **PU:** every match starts at L1 at the lowest evolution stage; max L15 (14 level-ups). Levels raise stats, unlock/upgrade moves (choose 1 of 2 at set levels), and evolve the Pokémon mid-match; Unite Move unlocks at L8 or 9. — bulbapedia /Level · /Unite_Battle
- **HotS:** XP is pooled per TEAM; all heroes level together. Passive 23 XP/s from 0:35; minion 80 XP (+2/min); destroying a Fort or Keep adds +20% passive XP (stacking). Big power spikes at team L10 (heroic abilities) and L20 (heroic upgrades). Max level UNKNOWN on fetched pages. — HotS /Experience · /Game_phase
- **MLBB:** UNKNOWN (not on pages fetched).

## 4. Gold income
| Source | LoL | Dota 2 | MLBB |
|---|---|---|---|
| Start | 500 | 600 + TP scroll | UNKNOWN |
| Passive | 20.4 g per 10 s from 1:05 | 90 gpm from 0:00, rising ~2/min (94.8 at 12:00, 99.8 at 30:00, 105.5 at 45:00) | UNKNOWN |
| Minions / last hit | Melee 20, caster 14, siege 50-69; avg wave 115-148 g (patch V26.01) | Per-creep bounty UNKNOWN on fetched page | Lancer 33 / Infantry 65 / Cannon 100, rising to ~90/120/150 by 30:00, shared with nearby heroes |
| Hero kill | 300 base until L6, +10/level to 420 cap; First Blood +100; assist pool = half the kill bounty (capped at 50% base); bounty grows with gold earned, shutdowns up to base +700 | 125 + 8×victim level + streak gold; First Blood +135; assist gold scales by victim-team/killer-team net-worth ratio | UNKNOWN |
| Objectives | Turrets: global 50 (outer), 25 (inner/inhib), 50 (nexus) + plating; Objective bounties (see §9) | Towers: team gold + last-hit bonus; deny gives 50% | Turtle 60/70/80 g for 1st/2nd/3rd; Lord 500 g (old version, wiki) |
| Death loss | none | lose NetWorth/40 unreliable gold | UNKNOWN |
- **PU and HotS have no gold.** PU's currency is Aeos energy, carried and dunked to score (§10). HotS uses team XP only.
Sources: LoL /Gold · /Minion · /Champion_gold_bounties · /Turret · liquipedia /Gold · MLBB /Minions · /Turtle · /Lord

## 5. Item systems
- **LoL:** 6 inventory slots; tiers Starter → Basic → Epic → Legendary (recipes combine); sell back at 70% (40% for consumables/starters). — /Item · /Gold
- **Dota 2:** gold buys items; reliable vs unreliable gold (deaths only take unreliable). Slot count / tier details UNKNOWN on fetched pages. — liquipedia /Gold
- **PU:** no in-match shop. Up to 3 held items (passive stat + effect, upgraded outside matches) + 1 battle item chosen pre-match. — bulbapedia /Pok%C3%A9mon_UNITE
- **HotS / MLBB:** UNKNOWN on fetched pages (HotS progression is talents at team-level milestones per /Game_phase).

## 6. Respawn timers
- **LoL:** BRW by level (L1-18): 10,10,12,12,14,16,20,25,28,32.5,35,37.5,40,42.5,45,47.5,50,52.5 s. After 15:00 a time factor adds +0.425%/30 s (15-30 min), +0.3% (30-45), +1.45% (45-55), capped at +50%. Total = BRW × (1 + TIF). Max 78.75 s. — /Death
- **Dota 2:** 12,15,18,21,24,26,28,30,32,34,36,44,46,48,50,52,54,65,70,75,80,85,90,95,100 s (L1-25+). Buyback = 200 + NetWorth/13 gold, +25 s on next respawn. — liquipedia /Death · /Gold
- **HotS:** 15,16,17,18,19,21,22,24,25,27,29,31,33,35,37,40,43,46,51,54 s (L1-20). — HotS /Death
- **PU / MLBB:** UNKNOWN. (MLBB: "death timer greatly increased" at 18:00 per /Battlefield_Guide.)

## 7. Towers and structures
- **LoL:** outer turret 9,000 HP (decays 11:00-15:00), inner 5,000, inhibitor turret 4,750, nexus turret 3,500 (respawns after 3 min at 40% HP); turret damage 182 → 350 by 13:30. Inhibitor 4,000 HP, respawns after 5 min; while down, enemy spawns super minions in that lane. Nexus 5,500 HP. — /Turret · /Inhibitor · /Nexus
- **Dota 2:** towers invulnerable until the previous tier falls; backdoor protection when no enemy creeps nearby; team Glyph makes buildings briefly invulnerable. Melee barracks 2,200 HP, ranged 1,300; losing barracks gives the enemy super creeps (all six → mega creeps). Ancient 4,500 HP. — liquipedia /Buildings
- **PU:** goal zones instead of towers; "HP" is points absorbed: outer 80, middle 100, base indestructible (Theia, Rayquaza layout). Standing on own goal gives shield + regen. — /Goal_zone · /Theia_Sky_Ruins
- **HotS:** Core HP scales to 22,000 + 11,000 shield by 20:00; Core attacks. — HotS /Core
- **MLBB:** outer turret shields drop at 5:00, inner damage reduction ends 8:00, inhibitor turret DR ends 12:00. Turret HP UNKNOWN. — /Battlefield_Guide

## 8. Minion waves
- **LoL:** first wave 0:30, then every 30 s; every 25 s from 14:00; every 20 s from 30:00. Wave = 3 melee + 3 caster, + siege every 3rd wave (every 2nd after 14:00, every wave after 25:00). Minions upgrade every 90 s. — /Minion
- **Dota 2:** first wave 0:00, every 30 s. Start 3 melee + 1 ranged; more creeps added at 15:00, 30:00, 40:00, 45:00, 60:00. — liquipedia /Lane_Creeps
- **HotS:** waves of 7 per lane every 30 s. — HotS /Experience
- **PU:** no lane minions; wild Pokémon camps give XP + Aeos energy, respawning on set timers. — /Theia_Sky_Ruins
- **MLBB:** periodic waves; minions speed up at 12:00. Interval UNKNOWN. — /Battlefield_Guide

## 9. Big objectives (dragon/Roshan-style)
- **LoL:** Voidgrubs 8:00 (once; gone 14:45); Rift Herald 15:00; first drake 5:00, next 5 min after a kill; after a team's 4th drake, Elder Dragon every 6 min (V9.23 rules quoted on /Dragon_pit history; current patch may differ). Baron 20:00, respawn 6:00, buff 180 s. — /Voidgrub_camp · /Rift_Herald · /Dragon_pit · /Baron_Nashor
- **Dota 2:** Roshan respawns 8-11 min (hidden roll), damage +10/min; drops Aegis (revive at death spot after 5 s). Bounty runes every 3 min, power runes every 2 min. — liquipedia /Roshan · /Map · /Death
- **PU:** objective Pokémon at fixed times; Rayquaza in the last 2 min gives a scoring shield. — /Unite_Battle · /Theia_Sky_Ruins
- **MLBB:** Turtle 2:00 (gold + XP + shield); Lord 8:00 or 2 min after the last Turtle, respawn 180 s (8-18 min) then 120 s; evolves at 18:00. CONFLICT: /Turtle says no Turtle after 6:00 in one place and "stop respawning: 8 min" in its infobox. — /Lord · /Turtle

## 10. Comeback (catch-up) mechanics
- **LoL:** Objective bounties (from 14:00, team behind on gold/XP/objectives for 60 s): extra gold on turrets/dragons/Baron, +10% of the team gold deficit, cap 1,000; Baron min 300, dragons 500. Kill bounties suppressed when the leading team isn't convincingly winning. XP comeback bonus on higher-level kills. — /Objective_bounties · /Champion_gold_bounties · /Experience_(champion)
- **Dota 2:** assist gold multiplied by (victim team net worth / killer team net worth); streak-ending gold. — liquipedia /Gold
- **HotS:** underdog XP: up to +100% kill XP at 4+ team levels behind; leader gets down to -95%. — HotS /Experience
- **PU:** Final Stretch (last 2 min of standard): points doubled; Rayquaza (last 2 min) gives its slayer team a scoring shield. — /Unite_Battle
- **MLBB:** UNKNOWN on fetched pages.

## 11. How short mobile MOBAs compress it (observed patterns, cited above)
1. **Hard clock.** PU fixes 10 min (5 min quick); win by score, not base kill. LoL/Dota/HotS have no clock.
2. **Fewer, faster levels.** PU L15 in 10 min vs LoL L18 / Dota L30 over open-ended games.
3. **Front-loaded objective timeline.** MLBB: 2:00 Turtle → 5:00 outer shields drop → 8:00 Lord → 12:00 → 18:00 final evolution. LoL's equivalents are 5:00 / 8:00 / 15:00 / 20:00.
4. **Smaller shops.** PU: 3 pre-set held items + 1 battle item, no mid-match shopping.
5. **Built-in late swing.** PU Final Stretch doubles points in the last 2 min.
6. **Shared or simplified economies.** HotS shares XP across the team; PU has no gold.
7. **Mid-match evolution as progression.** PU evolves the character's form by level, the closest published analogue to PAC's small > medium > huge.

---
## 12. Vampire Survivors systems that COULD translate (OPTIONS, not decisions)
From /workspace/pac-game/vampire-survivors-dossier.md (vampire.survivors.wiki). Brent/Kanye decide.
| VS system (sourced) | Possible MOBA use (option) | Closest MOBA precedent |
|---|---|---|
| XP gems on the floor (blue ≤2, green ≤9, red more) picked up by magnet radius | Option: chomp pickups from minions/camps as the XP source | HotS XP globes (/Experience) |
| XP curve +10/level, with big extra costs at L20/L40 | Option: growth-tier gates cost a lump of extra XP (e.g. small→medium) | PU evolution levels |
| 3 level-up choices, rarity-weighted; reroll/skip/banish | Option: pick 1 of N upgrades at each level instead of a fixed skill tree | PU move choice (1 of 2) |
| Evolution = max weapon + catalyst passive + boss chest | Option: an item/weapon combo that transforms after an objective kill | LoL item recipe tiers; Dota Aegis drop |
| 6 weapon + 6 passive slots | Option: slot limits as the build constraint | LoL 6 slots; PU 3 held items |
| Reaper at the time limit | Option: a hard end-of-match event to force a finish | PU Final Stretch / Rayquaza |
| Enemy HP × player level, endless scaling per cycle | Option: neutral/minion scaling by average team level | LoL minion level = team average level (/Minion) |
| PowerUp shop between runs | Option: out-of-match meta progression | PU held-item grades |
