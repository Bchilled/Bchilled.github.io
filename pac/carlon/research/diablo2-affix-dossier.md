# R4 — Diablo II affix & rarity dossier
Prepared by Carlon for Brent Snow / Kanye (PAC research queue). Research only; no design. Fetched 2026-10-20 (EDT).
**Baseline: Diablo II: Lord of Destruction 1.14** (default per brief). **D2R deltas flagged as [D2R]** in each section.
Labels: **UNKNOWN** = not published in sources checked; **(DERIVED)** = I computed it from published data; **CONFLICT** = sources disagree.

## Sources
- [AS] The Arreat Summit (Blizzard's official D2 LoD site): classic.battle.net/diablo2exp/items/magic.shtml, …/items/magic/magicfind.shtml, …/items/basics.shtml. (…/items/rare.shtml returns "Document Not Found".)
- [DW] Diablo Wiki "Item Generation Tutorial" (diablo2.diablowiki.net/Item_Generation_Tutorial) — community reference built from the game's .txt data files.
- [TXT-1.14] Game data tables from d2_patch.mpq (pre-D2R), as published in the blizzhackers/d2data repo at commit e35dcd6 (2021-03-01, pre-D2R launch): ItemRatio, MagicPrefix, MagicSuffix, RarePrefix, RareSuffix, TreasureClassEx, ItemTypes, weapons, armor, gamble. These are datamined game files, not Blizzard-published docs.
- [TXT-D2R] Same repo, master branch, described as "Diablo 2 Resurrected 3.0 JSON Data", last commit "Updated for patch 3.3.93847" (2026-08-21). Datamined, not official.
- [PD] PureDiablo "Magic Find Guide v1.11" (community; corroborates MF factors).
Raw copies: /workspace/pac-game/raw/d2/.

---

## 1. Prefix/suffix pools and max counts by rarity

**Max affix counts**
- **Magic:** "A Magic Item has a Magic Prefix, or a Magic Suffix, or one of both. A Magic item can never have two Prefixes or two Suffixes." Roll odds: **Prefix+Suffix 25%, Prefix only 25%, Suffix only 50%** [AS], identical in [DW]. → max 1+1.
- **Rare:** "there will never be more than 3 Prefixes or 3 Suffixes"; each property 50/50 prefix vs suffix; no affix picked twice; **only one affix per affix *group*** (e.g. Wyrm's and Dragon's are both in the +Mana group) [AS]. → max 3+3.
  - **CONFLICT on total count:** [AS] "Rare Items have 2 to 6 magical properties"; [DW] "Rare Items have 3 to 6 … There is 1/4 chance for every affix number to be generated." Exact count distribution therefore CONFLICT/UNKNOWN officially.
- **Crafted:** fixed recipe properties + 1–4 random affixes; by ilvl: 1–30 → 40% 1 / 20% each 2,3,4; 31–50 → 60% 2 / 20% 3 / 20% 4; 51–70 → 80% 3 / 20% 4; 71+ → 100% 4 [DW].
- **Rare names:** RarePrefix 46 entries, RareSuffix 155 entries [TXT-1.14]; names are cosmetic, not tied to stats [AS].

**Pool sizes (rows with spawnable=1 and frequency>0) (DERIVED from [TXT-1.14])**
| | Magic prefixes | Magic suffixes |
|---|---|---|
| Rollable rows (1.14) | 501 | 466 |
| …of which rare-eligible (rare=1) | 403 | 412 |
| Distinct names | 230 | 204 |
| Affix groups (distinct group ids) | 35 | 38 |
| alvl range | 1–91 | 0–110 |
Top tiers are typically magic-only (rare=0), e.g. Cruel (+201–300% ED, alvl 51), Bahamut's (+91–120 mana), of Luck (26–35% MF), of the Whale (+81–100 life) [TXT-1.14].

**Affix selection weight:** each eligible affix's `frequency` / sum of eligible frequencies [DW]. Example tier ladder, Enhanced Damage prefixes on weapons (group 105) [TXT-1.14]: Jagged alvl1 (10–20%, freq 9) → Deadly 5 (21–30, 9) → Vicious 8 (31–40, 8) → Brutal 14 (41–50, 8) → Massive 20 (51–65, 7) → Savage 26 (66–80, 7) → Merciless 32 (81–100, 6) → Ferocious 41 (101–200, 6) → Cruel 51 (201–300, 5, magic-only).
MF suffix ladder (group 22): of Chance alvl12 (5–15%) → of Fortune 16 (16–25%) → of Luck 26 (26–35%, magic-only; boots/amulet/circlet) [TXT-1.14].

**[D2R]** [TXT-D2R] rollable pool = **517 prefixes / 474 suffixes** (rare-eligible 416 / 420). Diff vs 1.14 (DERIVED): +16 prefix rows, all new class skill-tab/skill affixes (e.g. Chaotic, Fiendish, Sullied, Malevolent, Forbidden, Torrid; mod codes `war`/`skilltab`); +8 suffix rows, all `charged` skills (of Apocalypse, of Lethargy, of Miasma Bolt, of Rancor). No 1.14 affix removed. Rare name tables unchanged (46/155).

## 2. Item level and affix level gating (qlvl / ilvl / alvl)
Terms [DW]: **qlvl** = base item's quality level (weapons/armor/misc.txt) or a unique/set item's level; **ilvl** = item level, = monster level for drops; **alvl** = affix level ("level" column in MagicPrefix/Suffix).
- **Base item gating:** atomic TCs ArmoXX/WeapXX group bases by qlvl in 3-level bands (Armo03 = qlvl 1–3 … Armo87 = 85–87) [DW].
- **Unique/Set gating:** candidate list = items of that base with qlvl ≤ ilvl, chosen by `rarity` weight; if none, a rolled Unique becomes a **3× durability Rare**, a rolled Set becomes a **2× durability Magic** [DW]. Example: unique-ring rarities 15+15+1+1+10+10+3+1+3 = 59, Stone of Jordan 1/59 [DW].
- **Affix level formula** [DW] (integer math):
  ```
  if ilvl>99: ilvl=99
  if qlvl>ilvl: ilvl=qlvl
  if magic_lvl>0: alvl = ilvl + magic_lvl
  elif ilvl < 99 - qlvl/2: alvl = ilvl - qlvl/2
  else: alvl = 2*ilvl - 99
  alvl = min(alvl, 99)
  ```
  An affix is eligible if its level ≤ alvl (and maxlevel, if set, not exceeded), its itype matches, spawnable=1 [DW]. `magic lvl` bonus exists on Circlets, Staves, Wands, Orbs [AS].
  - Worked example [DW]: Normal Pindleskin small charm, ilvl 45, qlvl 28 → alvl 31.
  - **CONFLICT:** [AS] states affixes are chosen from those with "qlvl<=ilvl+2" (no qlvl/2 term). [DW]'s formula is the community data-file reading.
- **Shops:** item ilvl = clvl+5; Normal-difficulty caps 12/20/28/36/45 for Acts 1–5 [DW].
- **Imbue:** ilvl = clvl+4 [DW]; [AS] says magical-property level is "Character Level + 6" — CONFLICT.
- **[D2R]:** UNKNOWN whether the alvl formula changed (no official statement found; datamined affix level columns for 1.14 affixes unchanged — DERIVED from the diff above).

## 3. Published rarity odds and Magic Find

**Base rates (ItemRatio.txt)** [TXT-1.14] — value N means base 1-in-N at ilvl = qlvl; the chance worsens/improves by (ilvl−qlvl)/Divisor.
| Row (LoD = Version 1) | Unique (Div, Min) | Set | Rare | Magic | HiQuality | Normal |
|---|---|---|---|---|---|---|
| LoD normal-tier | 400 (1, 6400) | 160 (2, 5600) | 100 (2, 3200) | 34 (3, 192) | 12 (8) | 2 (2) |
| LoD exceptional/elite ("Uber") | 400 (1, 6400) | 160 (2, 5600) | 100 (2, 3200) | 34 (3, 192) | 12 (8) | 1 (1) |
| LoD class-specific | 240 (3, 6400) | 120 (3, 5600) | 80 (3, 3200) | 17 (6, 192) | 9 (8) | 2 (2) |
| LoD class-specific Uber | 240 (3, 6400) | 120 (3, 5600) | 80 (3, 3200) | 17 (6, 192) | 9 (8) | 1 (1) |
| Classic normal | 400 (2, 6400) | 125 (6, 5600) | 160 (3, 3200) | 30 (16, 192) | 12 (16) | 4 (8) |
| Classic Uber | 240 (2, 6400) | 96 (6, 5600) | 96 (3, 3200) | 3 (100, 192) | 4 (16) | 1 (8) |
Check order: Unique → Set → Rare → Magic → Superior → Normal → else Low quality [DW], [PD].

**Quality-check algorithm** [DW]:
1. Chance = (BaseChance − (ilvl − qlvl)/Divisor) × 128
2. For Unique/Set/Rare: EffectiveMF = MF × Factor / (MF + Factor); Magic uses raw MF
3. Chance = Chance × 100 / (100 + EffectiveMF)
4. if Chance < Min: Chance = Min
5. FinalChance = Chance − Chance × QualityFactor / 1024 (QualityFactor from the monster's TreasureClassEx Unique/Set/Rare/Magic columns)
6. success if rnd[FinalChance] < 128 → probability 128/FinalChance
- Implied floor before TC bonus (DERIVED: Min/128): Unique 1 in 50, Set 1 in 43.75, Rare 1 in 25, Magic 1 in 1.5.
- Boss QualityFactors [TXT-1.14]: Baal/Mephisto/Diablo (H) = 983/983/983/1024 (U/S/R/M), 7 picks; Andariel (H) same factors, NoDrop 19 vs 15; Countess (H) 883/883/983/1024.
- Worked example [DW]: Hell Baal, Unearthed Wand (qlvl 86), 200% MF → unique chance 128/939 per wand pick.

**MF diminishing returns.**
- Official: "there is a diminishing return formula (that is not available) that becomes active over 10% Magic Find for Rare, Set, and Unique Items (But Not Regular … Magic Items)." No cap. MF does **not** affect runes or gambling; it works on chests and bosses; for party kills only the killer's MF counts; hireling kills use hireling + player MF [AS].
- Community formula: **Factor = 250 (Unique), 500 (Set), 600 (Rare); Magic = raw MF** [DW], [PD]. Official factor values: **UNKNOWN** (Blizzard says "not available").
- Effective-MF table (DERIVED from the community formula):
| Raw MF | Unique | Set | Rare | Magic |
|---|---|---|---|---|
| 50 | 41.7 | 45.5 | 46.2 | 50 |
| 100 | 71.4 | 83.3 | 85.7 | 100 |
| 200 | 111.1 | 142.9 | 150.0 | 200 |
| 300 | 136.4 | 187.5 | 200.0 | 300 |
| 500 | 166.7 | 250.0 | 272.7 | 500 |
| 1000 | 200.0 | 333.3 | 375.0 | 1000 |
- [AS] lists a theoretical personal max of **1167% MF** (1.14-era gear list).
- **[D2R]:** ItemRatio rows in [TXT-D2R] are value-for-value identical to 1.14 (DERIVED: compared all six rows). MF factors in D2R: UNKNOWN (hard-coded, not in data files; no official statement found).

## 4. Gambling odds
- Quality odds [DW]: **Unique 1/2000, Set 1/1000, Rare 1/10, Magic 1797/2000** (i.e. every gamble is at least magic). Official confirmation: UNKNOWN (Arreat Summit gambling page not located).
- Gamble ilvl [DW]: ilvl = clvl + rnd[10] − 5 → clvl−5 … clvl+4. **CONFLICT:** [AS] describes affix eligibility checked against "+6 Levels/−3 levels of your character's level".
- Exceptional/elite upgrade chance [DW]: exceptional = 1 + (ilvl − excep qlvl) × 90/100; elite = 1 + (ilvl − elite qlvl) × 33/100 (units as published; denominator UNKNOWN).
- Circlet magic level adds to gamble affix level [AS]. MF has no effect on gambling [AS], [DW].
- Gamble list: **125 entries** in 1.14 gamble.txt [TXT-1.14].
- **[D2R]:** gamble.txt has **121 entries**; diff (DERIVED): Dagger, Dirk, Kriss, Blade removed (remaining differences are whitespace in names). Gamble quality odds in D2R: UNKNOWN (hard-coded).

## 5. Rune drop weights
Runes come from the "Good" TC branch, not affected by MF [AS]. Rune TC ladder [TXT-1.14] — each "Runes N" picks: 2 runes at weights 3 / 2, else falls to Runes N−1:
| TC | Top runes (weight) | Fall-through weight |
|---|---|---|
| Runes 1 | El 3, Eld 2 | — |
| Runes 2 | Tir 3, Nef 2 | 2 |
| Runes 3 | Eth 3, Ith 2 | 5 |
| Runes 4 | Tal 3, Ral 2 | 7 |
| Runes 5 | Ort 3, Thul 2 | 12 |
| Runes 6 | Amn 3, Sol 2 | 22 |
| Runes 7 | Shael 3, Dol 2 | 45 |
| Runes 8 | Hel 3, Io 2 | 90 |
| Runes 9 | Lum 3, Ko 2 | 180 |
| Runes 10 | Fal 3, Lem 2 | 360 |
| Runes 11 | Pul 3, Um 2 | 720 |
| Runes 12 | Mal 3, Ist 2 | 1066 |
| Runes 13 | Gul 3, Vex 2 | 1519 |
| Runes 14 | Ohm 3, Lo 2 | 2170 |
| Runes 15 | Sur 3, Ber 2 | 2941 |
| Runes 16 | Jah 3, Cham 2 | 3957 |
| Runes 17 | Zod 1 | 5170 |

**Which TC by act/difficulty ("Good" TC → rune TC, weight / TC total)** [TXT-1.14]: Act 1 Normal none; Act 2 N: Runes 1 & 2 (3+3/42); Act 3 N: Runes 3 & 4 (3+3/42); Act 4 N: Runes 5 (14/155) & 6 (7/155); Act 5 N: Runes 7 (10/102); Nightmare Acts 1–5: Runes 8–12 (14/130 each); Hell Acts 1–5: Runes 13–17 (14/130 each).

**Per-rune odds given a drop from Runes 17 (Hell Act 5) (DERIVED):** El 1:43, Eld 1:65, Tir 1:17, Nef 1:26, Eth 1:12, Ith 1:19, Tal 1:9, Ral 1:13, Ort 1:9, Thul 1:13, Amn 1:11, Sol 1:17, Shael 1:19, Dol 1:28, Hel 1:34, Io 1:51, Lum 1:64, Ko 1:96, Fal 1:124, Lem 1:186, Pul 1:245, Um 1:367, Mal 1:360, Ist 1:540, Gul 1:511, Vex 1:766, Ohm 1:727, Lo 1:1,091, Sur 1:983, Ber 1:1,475, Jah 1:1,321, Cham 1:1,981, Zod 1:5,171.
"By class": rune weights are by TC/area tier only; no character-class variation exists in the TC data (DERIVED: Runes TCs have no class field). Monster-type differences come from the monster's TC (e.g. [DW]: Hell Cow 3/160 to Good; Hell WSK3 Specter 4/104; Death Lord 2/160).
- **CONFLICT:** [DW]'s Mephisto example cites "Runes 16 … 2/47274 Cham" — does not match 1.14 TreasureClassEx (Cham 2 of 3,962 in Runes 16). Treat [DW] rune figures as older-version.
- Countess (H) [DW]: always 1 drop from "Countess Rune (H)" — 3 picks, 15/20 each from Runes 12 (to Ist) → 98% ≥1 rune.
- **[D2R]:** Runes 1–17 weights in [TXT-D2R] are identical to 1.14 (DERIVED). D2R Terror Zone ("desecrated") TC effects: out of scope / UNKNOWN here.

## 6. Socket count rules by item type
- Socketable: all weapons except throwing weapons; body armor; shields; helms. Misc items (rings, amulets, charms, belts, boots, gloves) cannot have sockets [DW]. Low-quality items cannot spawn with sockets [AS].
- **Natural sockets** [DW]: 1/3 of normal & superior items are socketed, 1 to max; magic only via prefixes Mechanic's (1–2), Artisan's (3), Jeweler's (4); rares only via Mechanist's (1–2); uniques/sets fixed per item (e.g. Crown of Ages 1–2).
- **Max sockets = min(base `gemsockets`, item-type cap by ilvl)** [DW]. Type caps by ilvl band (1–25 / 26–40 / 41+) [TXT-1.14 ItemTypes]:
| Type | ilvl ≤25 | ≤40 | 41+ |
|---|---|---|---|
| Body armor | 3 | 4 | 6 |
| Shield | 3 | 3 | 4 |
| Auric shield (Paladin) | 3 | 4 | 4 |
| Helm | 2 | 2 | 3 |
| Circlet | 1 | 2 | 3 |
| Primal helm / Pelt / Voodoo head | 2 | 3 | 3 |
| Axe | 4 | 5 | 6 |
| Sword, Club, Hammer, Mace, Spear, Polearm, Bow, Crossbow, Amazon spear | 3 | 4 | 6 |
| Amazon bow | 3 | 4 | 5 |
| Scepter | 3 | 5 | 6 |
| Staff | 5 | 6 | 6 |
| Wand | 2 | 2 | 2 |
| Knife | 2 | 3 | 3 |
| Claw (h2h) / Orb | 2 | 3 | 3 |
Base caps examples [TXT-1.14]: Phase Blade 6, Crystal Sword 6, Berserker Axe 6, Thunder Maul 6, Elder Staff 4, Grand Scepter 3, Archon Plate 4, Mage Plate 3, Quilted Armor 2, Monarch 4, Buckler 1, Diadem 3, Shako 2, Dagger 1; Throwing Knife none.
- **Adding sockets** [DW]: Larzuk quest — normal items get max sockets; magic 1–2; rare/unique/set 1. Cube (normal items) rolls 1–6, clamped to max (e.g. claws 1/6 1, 1/6 2, 4/6 3). Rare: 3 Perfect Skulls + SoJ adds 1.
- **[D2R]:** ItemTypes caps identical; thresholds made explicit (25/40) in data; new type **Grimoire** 2/3/3 (DERIVED from [TXT-D2R]).

## UNKNOWN list (9)
1. Official MF diminishing factors (Blizzard: "not available"); 250/500/600 is community.
2. Official rare affix-count distribution (CONFLICT 2–6 [AS] vs 3–6 at 1/4 each [DW]).
3. Official gamble quality odds (only [DW] 1/2000, 1/1000, 1/10).
4. Denominator/units of [DW] gamble exceptional/elite formula.
5. Official alvl formula (CONFLICT [AS] "qlvl≤ilvl+2" vs [DW] qlvl/2 formula).
6. D2R MF factors.
7. D2R gamble quality odds.
8. D2R alvl formula changes.
9. D2R Terror Zone/desecrated drop modifiers.

## Relevance to PAC canon (fact mapping only)
| Canon question | Facts here |
|---|---|
| Affix slots per rarity | §1: magic 1+1 (25/25/50 split); rare ≤3+3, one per group; crafted 1–4 by ilvl |
| Affix pool size & tiering | §1: ~500/~470 rollable rows; tier ladders by alvl; top tiers magic-only |
| Level gating | §2: qlvl/ilvl/alvl formula; unique/set qlvl gate with downgrade-to-rare/magic fallback |
| Rarity odds & luck stat | §3: ItemRatio base 1/400 unique etc., ilvl-qlvl drift, floors, TC quality bonus; MF diminishing (community) |
| Vendor/gamble sink | §4: gamble odds, ilvl window, MF excluded |
| Rune/currency drop ladder | §5: 17-step cascading TC, weights 3/2 + fall-through; per-rune odds |
| Socket rules | §6: type × ilvl caps, base caps, socket sources |
