# PAC: loop math v1 (framework + options, nothing decided)
Carlon, for Brent Snow. Tue Oct 20 2026, ~5:50 PM ET. Design phase only. This goes through the two-reviewer gate (Kanye, then Claude) before any number is used.
Companion to core-loop-v2.md (node IDs like M14 refer to that chart).

**Labels used:**
- **CANON**: owner-stated in FULL-SCOPE.md (FS) or DESIGN.md (DS), cited.
- **CANON-K**: Kanye's 3:21 PM answers (msg 1a15ac34325d1dfd).
- **PROPOSAL**: from STAT-MATH.md. That's Kanye's math map. It isn't owner-ruled; its own §7 lists it as 10 open decisions.
- **OPTION**: mine, anchored to a published reference in the R1–R4 or VS dossiers. These are for Kanye/Claude review. **No OPTION is a decision.**
- **EXAMPLE**: an illustrative value used only in §7's worked match.

Dossiers cited:
- **VS** = vampire-survivors-dossier.md
- **MOBA** = moba-reference.md
- **R1** = tower-defense-dossier.md
- **R2** = roguelike-meta-dossier.md
- **R3** = lol-items-dossier.md
- **R4** = diablo2-affix-dossier.md

---
## 1. Every canon number the loop touches
| Number | Value | Source |
|---|---|---|
| Lanes per map | 3, 5 or 7 | FS L1601 |
| Enemy towers to open the lair | 3 | FS L1607, L1657 |
| Team size | max 3 (player + up to 2 tag-in) | FS L1093; CANON-K #1 |
| Tag-in unlock | after 10 levels (maps) | FS L1091, L1326 |
| Lives | Easy 3 · Medium 1 · Hard 1, and the character is gone | FS L1052 |
| Level-up ladder | L1–3 skill spins · L4 Bank · L5 weapon · L6 Infinity Stone | FS §4, §25 "LEVEL 4/5/6" |
| Bank capacity | 3 abilities | FS §27 |
| In-run loadout | about 6 things, then locked out of new ones | FS L1540 |
| Trees open per run | 5 of 13 (13-slice era; see CONFLICT C5) | FS §4 |
| Stage 1 exit | opens past character level 6 | FS L1318 |
| Orb growth | at least +1 size step per orb | FS §24 "ORB LAW" |
| Eat-mode chain score | 200 / 400 / 800 / 1600 | FS §7 |
| Onboarding roster | 6 enemy types + 1 boss per level; then +3 new per level | FS §3; DS "Roster growth" |
| Level structure | 7 per slice; boss every level; BIG boss every 3rd; bigger on the 6th; 7th = Bomberman fight | FS L1253 |
| Distance pricing (hero buy) | +5 per distance | FS L1069 |
| Rarity tiers | Common, Rare, Mythic | FS §5, L992 |
| Resources per character | exactly 1 of Mana / Energy / Rage | FS L900–905 |
| Copy powers held | 3 | FS §5; DS "Core loop" |

Canon gives **no number** for any of these: XP per pellet, the XP curve, size thresholds, tower HP, unit/wave strength, wave interval, tower costs, rebuild cost, match length, boss HP, eat-mode duration, respawn time.

---
## 2. Growth: pellets → XP → levels, and chomp → size
**Framework.**
- XP(t) = Σ pellets eaten × xp_per_pellet × growth multiplier.
- Level L needs req(L) XP to reach L+1.
- Size step s rises from a chomp meter and from orbs (≥ +1 per orb, CANON).
- Canon shape constraints:
  - The tempo law: "leveling tempo must be SLOWER than gathering tempo; you eat a lot before you level" (FS §19).
  - The ladder must complete by L6 before the first boss gate (FS §25).
  - Size trades speed for maw: speed = base × (1 − k_s·s), chomp radius = base × (1 + k_r·s) (shape from FS §5 "small = fast ↔ large = huge maw"; k values OPEN).

**XP curve OPTIONS** (req in pellets, with xp_per_pellet = 1):
| Option | Rule | To L6 | To L10 | Anchor |
|---|---|---|---|---|
| X-A, VS shape ×10 | 50 + 100(L−1) | 1,250 | 4,050 | VS §4: 5 XP, then +10 per level to L20 |
| X-B, LoL shape | 280 + 100(L−1) | 2,400 | 6,120 | MOBA §3: 280 to L2, +100 each level |
| X-C, Dota table shape | fixed hand table, no formula | UNKNOWN (dossier only records 240 to L2) | 5,900 (Dota L10 total) | MOBA §3 |
- What tells them apart: VS's curve is front-loaded cheap (fast first picks, which fits the "showcase" first three offers, FS §25), while LoL/Dota are flatter and slower early.
- What VS adds: a level-20/40 "wall" with +100% growth until you pass it (VS §4). That's a possible anchor for slowing the post-ladder game.

**Size OPTIONS** (all keep the canon orb rule):
- S-A, permanent per-run steps: 3 steps (small/medium/huge, the wording on the intro film's growth panel, NOTES.md; not a canon file). The steps fire at cumulative-eaten thresholds; an orb forces the next step. Anchor: Pokémon Unite's mid-match evolution by level (MOBA §3, §11.7).
- S-B, meter with decay: the chomp meter drains when idle or hit (shape from DS "Combo meter": "getting hit or idling drains it"); an orb is +1 step for the eat-mode window, then falls back one step.
- S-C, size = level band: size is tied to the character level (e.g. step at L4/L8/L12), and the orb is a temporary +1. It's the simplest to balance, but it's the weakest "chomp to grow" read.
- Open sub-question for Kanye: can size go down (death, hits, decay)? That was v1 OPEN-11, still open.

---
## 3. Tower HP vs hero DPS per tier
**Framework.**
- Time to break a tower: TTB = HP_tower / (DPS_hero × u_siege + DPS_units).
  - u_siege = the share of siege time the hero is actually hitting the tower (the swarm keeps coming).
  - DPS_units = your little units (FS L1610).
- The canon balance law constrains it: "every 5-tree neighbourhood must clear the swarm curve comparably while feeling different" (FS §4; DS "Balancing doctrine").

**Hero DPS on file (PROPOSAL, STAT-MATH §5, calculator-asserted):**
| Level | Build A melee crit | Build B spell | Build C tank |
|---|---|---|---|
| L1 | 46.5 | 17.3 | 19.3 |
| L6 | 84.0 | 32.5 | 21.8 |
| L10 | 85.8 | 58.6 | 33.0 |
| L20 | 195.5 | 105.6 | 41.6 |
- **Finding (arithmetic, not a design call):** at L10, A out-damages C by 85.8 / 33.0 = **2.6×**.
  - If tower HP is a flat number, the tank takes about 2.6× as long per tower (less with unit DPS added).
  - The comparable-clear law then needs one of the options below. Otherwise the tank's map takes far longer. §7 shows 1.66× over a whole example match.

**Tower HP OPTIONS:**
- T-A, set by target TTB for a reference build: HP = TTB_target × (DPS_ref × u + DPS_units). Anchor: the KR towers are priced and measured by DPS-per-gold (R1 §2a: archer line 10.18 → 12.95 gold per DPS).
- T-B, LoL-shape HP ladder: the outer tower is toughest and deeper towers are softer, because the attacker is stronger by then. Anchor: LoL outer 9,000 / inner 5,000 / inhibitor 4,750 / nexus turret 3,500 (MOBA §7). This is the reverse of the rising ladder used in §7's example; both are on the table.
- T-C, gate-protected towers: towers are invulnerable until the previous one falls, with backdoor protection (Dota, MOBA §7). This controls ORDER, not HP. It pairs with T-A or T-B.
- Equalising OPTIONS for the 2.6× gap (pick any, or none):
  - E1: part of tower damage is a % of tower HP from units or eat mode, so it doesn't scale with hero DPS.
  - E2: the tower damage share depends on build class.
  - E3: accept the gap, and give tanks lane-holding value (defending) instead.
  - Anchor for E1: PU goal zones are "HP" in points dunked, not damage (MOBA §7).

**Own-tower upgrade-cost OPTIONS** (FS L1650 says towers are upgradable; costs are OPEN):
| Option | Shape | Published anchor |
|---|---|---|
| U-A, KR linear | 3 steps at about ×1.5, gold/DPS worsening ~8% a step | KR archer 70 → 110 → 160 → 230; mage 100 → 160 → 240 (R1 §2a) |
| U-B, LTD2 value ladder | total value ×4.5 then ×2.9 | Proton 20 → Atom 90 → Nucleus 265 (R1 §4a) |
| U-C, BTD6 steep top | cheap early tiers, huge top tier | Dart path 1: 140 / 200 / 320 / 1,800 / 15,000 (R1 §1a) |

**Rebuild-cost OPTIONS** (FS L1654: rebuilt "with resources"):
- RB-A, full price: BTD6 has no rebuild rule (R1 §1e).
- RB-B, 60–70% of what was spent: the sell rates in BTD6 70%, KR 60%, LTD2 60% (R1 §1e, §2d, §4d).
- RB-C, rebuild to tier 1 only, and re-upgrade.

---
## 4. Wave scaling and lane pressure
**Framework.** Each lane is a tug-of-war (FS L1610–1612).
- Enemy wave strength: W(n) = W0 × (1+g)^n, with a wave every Δ seconds.
- Your units' strength: U(tier) rises with your tower tier.
- An undefended lane flips when W(n) > U. The flip wave is n* = ⌊ln(U/W0) / ln(1+g)⌋ + 1.
- The hero can only be in one lane, so their share per lane is ≤ 1/L. **That's 33% on 3 lanes, 20% on 5 and 14% on 7** (script-checked).
- The consequence: on 7-lane maps, units plus tower upgrades must hold most lanes alone, or towers fall by design. That fits "towers falling is pressure" (CANON-K #4) and the dot rubber-band pulling you back (FS L1631).
- Swarm shape constraint: few, slow ghosts first; speed and numbers rise together (FS §25 "SWARM CURVE").

**Wave OPTIONS:**
- W-A, VS per-minute table: each minute sets an enemy minimum + spawn interval, topped up to the quota, with periodic spawns stopping above 300 alive (VS §5 Mad Forest: 15 min / 1.0 s at 0:00 → 300 / 0.1 s at 11:00; VS §7 spawn ceiling).
- W-B, LoL fixed cadence: a wave every 30 s, every 25 s from 14:00, every 20 s from 30:00; minions upgrade every 90 s; a siege unit every 3rd wave (MOBA §8).
- W-C, multiplicative HP growth: The Bone Zone +15% HP and +2.5% speed per minute, uncapped; Endless +100% HP per cycle (VS §7). Or a fixed-list design like Legion TD 2's 21 waves (R1 §4f).

---
## 5. Economy: income vs costs
**Framework.** In-match income I(t) = pellets/s eaten (density × route speed × collect radius) + pattern bonuses (FS L1618) + coin blocks (FS L1531).
- Costs: own-tower upgrades, rebuilds, building on taken sites (FS L1660), and the secret shop (FS §9).
- **Open rule for Kanye:** pellets are both XP (DS "Core loop") and the eat-and-gather currency (FS L980). The math needs to know whether spending pellets removes XP. My working assumption in §7 is that it doesn't: XP is counted on eat, and the wallet is separate.
- The unique-use law (FS §22) may matter here; that's Kanye's call to route.

**Income anchors (published):**
- KR: starting gold 265; goblin 3, orc 9 (R1 §2e).
- BTD6: $650 start; $1 per layer popped + $100 + round number per round (R1 §1f).
- LoL: 500 start + 20.4 g / 10 s passive; an average wave is 115–148 g (MOBA §4).

**Cost-to-income OPTIONS** (price a tier-1 own-tower upgrade as seconds of farm income):
- C-A, 30 s: early upgrades every lane phase. KR tier 1 (70 g) ≈ 23 goblins (DERIVED from R1 §2e).
- C-B, 60 s.
- C-C, 120 s: upgrades are rare commitments.
- Catch-up is already CANON: the dot rubber-band (FS L1631), so no LoL-style bounty system is needed (MOBA §10 for comparison).

**Meta (between runs) anchors** (prices are OPEN; R2):
- Recycling returns: Dead Cells Recycling I 7% / II 15% of sale price.
- Tier exchange: RoR2 Cauldron 3 Common → 1 Uncommon, 5 Uncommon → 1 Legendary.
- Respec: Hades Mirror reset refunds 100% for 1 key.
- First-unlock pacing: Hades' first weapon for 1 key, RoR2 "die 5 times" for an item. These fit canon "EARLY UNLOCKS = RETENTION" (FS L1432).

---
## 6. Match length budget
**Framework.** T_match = T_lane(to L6) + Σ_towers (T_gap + TTB_i) + T_lair + T_boss.
- Canon constraints:
  - Levels have time limits, and time bonuses reward speed (FS L1107, L1608).
  - Boss fights are "measured in minutes, not seconds" (DS "Boss fight doctrine").
  - The early minutes "must breathe" (FS §25).
  - CONFLICT C1: "runs escalate for hours" (FS §1, DS "Run structure").

**Length OPTIONS:**
- ML-A, 10–15 min: Pokémon Unite standard 10 min, Quick 5 min (MOBA §2); the VS 15:00 stages (VS §5).
- ML-B, 30 min: the VS normal stage limit, after which the Reaper spawns (VS §5).
- ML-C, open-ended with a soft cap: LoL/Dota have no timer (MOBA §2). This fits the "hours" lines and conflicts with "time limits". **Brent's call (C1).**

**Boss HP OPTIONS:**
- B-A, HP × player level at spawn: VS bosses use base × level, e.g. Giant Werewolf 200 × level, Giant Mummy 250 × level (VS §7). It self-scales to the build, which is close to canon's "boss comes when you're strong enough" intent (FS §8).
- B-B, fixed HP per boss tier: canon tiers are normal / BIG every 3rd / bigger 6th / Bomberman 7th (FS L1253).
- B-C, phase HP: each phase is a separate bar, gated by the mechanic (FS L1084 "a mechanic you need to follow").

---
## 7. Worked example: one 3-lane match (ALL inputs are EXAMPLE values except the PROPOSAL DPS)
Checked by `/workspace/pac-game/calc/loop_math_example.py` (asserts pass; output saved in `calc/loop_math_example.out`).

**Inputs:**
- XP curve X-A; pellet intake 6/s farming, 2/s sieging, 0 in the boss fight; a 120 s farm/defend gap between towers.
- Enemy towers 3,000 / 4,500 / 6,000 HP; units 15 DPS on towers; hero siege uptime 60%.
- Lair: 5 micro towers × 600 HP + 90 s of maze.
- Boss HP 1,000 × level (B-A); boss uptime 50%.
- Hero DPS from STAT-MATH Builds A and C, linear between its L1/6/10/20 points.

| Phase | Build A (s) | Build C (s) |
|---|---|---|
| Lane phase to L6 (1,250 pellets ÷ 6/s) | 208.3 | 208.3 |
| Tower 1 (3,000 HP) | 45.9 | 106.8 |
| Gap | 120.0 | 120.0 |
| Tower 2 (4,500 HP) | 68.5 | 151.2 |
| Gap | 120.0 | 120.0 |
| Tower 3 (6,000 HP) | 91.0 | 181.2 |
| Lair | 135.5 | 180.6 |
| Boss (9,000 HP at L9) | 210.9 | 596.0 |
| **Total** | **1,000.1 s = 16.7 min** | **1,664.1 s = 27.7 min** |

Spot check: tower 1, Build A = 3,000 / (84.0 × 0.6 + 15) = 3,000 / 65.4 = 45.9 s.

What the example shows (arithmetic only):
1. **The tank's match runs 1.66× longer** with flat tower and boss HP. Most of the gap is the boss (596 vs 211 s). This is the §3 equalising question in numbers.
2. **The player only reaches L9 by the boss** under X-A at these intake rates. A different curve or intake moves this, and the pre-boss fairness rule (FS §4) assumes enough picks by then.
3. **Lane pressure:**
   - With wave strength ×1.05 per 30 s wave, an undefended lane flips at wave 4 (2.0 min) behind a tier-0 tower.
   - Behind tier 1 it flips at wave 9 (4.5 min); behind tier 2, wave 14 (7.0 min).
   - The 120 s gaps in this example are already about the tier-0 flip time, so an un-upgraded lane falls while you push another.
4. **Economy:**
   - A KR-shaped own-tower ladder of 300 / 450 / 675 = 1,425 pellets costs 238 s of farm income.
   - That's 42% of everything Build A eats in the whole match (36% for C). It's too heavy if pellets also have to fund rebuilds and shops; that's a signal for C-A/C-B over C-C.
   - A tier-2 rebuild at 70% would cost 525 pellets.

---
## 8. What this hands to whom
- **Kanye/Claude (numbers, OPTIONS above):** XP curve, size model, tower HP model plus the equalising choice, upgrade and rebuild cost shape, wave model, cost-to-income ratio, boss HP model.
- **Kanye (rules canon may already settle in the repo):** whether spending pellets removes XP (§5), whether size can drop, C4 unlock certainty, C5 run build cap, C6 in-map abilities.
- **Brent (scope only, in the delivery note):** C1 match length, C2 boss arrival, C3 whether all levels are lane maps.
