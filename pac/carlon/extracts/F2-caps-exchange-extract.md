# F2: caps and exchange rates extract, for Claude (facts only, cited)

Scope (Kanye msg 1a15b34e8ce22d1e): caps and exchange rates ONLY. R1/R2 upgrade-cost curves are excluded entirely.

Labels:
- (DERIVED): a figure I computed myself.
- UNVERIFIED: the current-build value could not be confirmed.

## 1. Cooldown and attack-speed caps

**Vampire Survivors** (vampire.survivors.wiki/w/Cooldown)
- Cooldown stacks additively.
- Total Cooldown floor: 10%, i.e. a hard cap of −90%. At −90%, weapons fire 10× as fast.
- Some character/item effects are explicitly "not limited by the −90% cap" (e.g. Tragic Princess III).

**League of Legends, patch V26.20** (wiki.leagueoflegends.com/en-us/Attack_speed, /Ability_haste)
- Attack speed: maximum 3.003 attacks/s (1 per 0.333 s); minimum 0.2.
- A few effects lift the attack-speed cap, e.g. Bel'Veth sets it to 9999.00 and Jinx's Get Excited! sets it to 90.00 while active.
- Ability haste: new cooldown = base × 100 / (100 + haste), so cooldown reduction = haste / (100 + haste).
  - 100 haste halves the cooldown; 200 haste cuts it to one third.
  - Haste replaced cooldown reduction in Pre-Season 2021; the old CDR "mandated an artificial cap".

**BTD6** (bloons.fandom.com/wiki/Selling): sellback soft cap 95%, hard cap $10,000,000 per tower.

## 2. VS PowerUp per-rank costs (vampire.survivors.wiki/w/PowerUps)

**Price formula:** Price = InitialPrice × (1 + ranks of that PowerUp already bought) + floor(20 × 1.1^TotalRanksBought). The first purchase ever pays no fee, and fees are additive since v0.7.2.

**Initial cost, max ranks and max effect:**

| PowerUp | Initial cost (gold) | Max ranks | Max effect |
|---|---|---|---|
| Might | 200 | 5 | +25% |
| Armor | 600 | 3 | +3 |
| Max Health | 200 | 3 | +33.1% |
| Recovery | 200 | 5 | +0.5/s |
| Cooldown | 900 | 2 | −5% |
| Area | 300 | 2 | +10% |
| Speed | 300 | 2 | +20% |
| Duration | 300 | 2 | +30% |
| Amount | 5,000 | 1 | +1 |
| Move Speed | 300 (see note) | 2 | +10% |
| Magnet | 300 | 2 | +56.25% |
| Luck | 600 | 3 | +30% |
| Growth | 900 | 5 | +15% |
| Greed | 200 | 5 | +50% |
| Curse | 1,666 | 5 | +50% |
| Revival | 10,000 | 1 | 1 revive |
| Omni | 1,000 | 5 | +10% |
| Charm | 10,000 | 5 | +100 |
| Defang | 10 | 5 | 15% |
| Reroll | 1,000 | 5 | +10 |
| Skip | 100 | 5 | +10 |
| Banish | 100 | 5 | +10 |
| Preserve | 500 | 5 | 50% |
| Seal I–All | 10,000 each | 10 each | — |
| Fever | 50,000 | 5 | +25% |

**Move Speed note: 300 is UNVERIFIED for the current build.** Game code from the 0.3.x era and a third-party site citing build 25016043 both say 300. vampire.survivors.wiki says 600.

**Grand total (42,965,380 per the wiki template): UNVERIFIABLE.**

**Example (DERIVED, ignoring the shop fee):** Might rank N costs 200 × N, so 3,000 base to max.

## 3. Diablo II affix and MF odds at the margins (LoD 1.14; D2R identical unless noted)

Sources:
- Arreat Summit [AS] (classic.battle.net/diablo2exp/items/magic.shtml, …/magic/magicfind.shtml)
- Diablo Wiki Item Generation Tutorial [DW]
- ItemRatio.txt and TreasureClassEx.txt from d2_patch.mpq (datamined, via blizzhackers/d2data)

**Affix counts**
- Magic items: max 1 prefix + 1 suffix, rolled 25% both / 25% prefix only / 50% suffix only [AS].
- Rare items: max 3 prefixes + 3 suffixes, one affix per group [AS].
  - Total affix count is CONFLICT: 2–6 per [AS], 3–6 at 1/4 each per [DW].

**Quality base odds** (1 in N at ilvl = qlvl), LoD normal and exceptional/elite items:

| Quality | Base odds | Floor (Min) |
|---|---|---|
| Unique | 1/400 | 6400 |
| Set | 1/160 | 5600 |
| Rare | 1/100 | 3200 |
| Magic | 1/34 | 192 |

- Class-specific items use 1/240, 1/120, 1/80 and 1/17 instead.
- The floors (Min ÷ 128) work out to best-case odds of unique 1/50, set 1/43.75, rare 1/25 and magic 1/1.5 before boss bonuses (DERIVED).
- Boss quality bonus (QualityFactor): Hell Baal, Mephisto and Diablo have 983 for Unique/Set/Rare and 1024 for Magic.
- The final chance is reduced by Chance × QF / 1024 [DW].

**MF**
- No cap; diminishing returns apply above 10% MF for rare/set/unique, and the formula is "not available" [AS].
- Community formula: effective MF = MF × F / (MF + F), with F = 250 (unique), 500 (set), 600 (rare); magic uses raw MF [DW].
- Effective MF at the margins (DERIVED):

| Raw MF | Unique | Set | Rare |
|---|---|---|---|
| 100 | 71.4 | 83.3 | 85.7 |
| 300 | 136.4 | 187.5 | 200 |
| 1000 | 200 | 333.3 | 375 |

- MF does not affect runes or gambling [AS].

**Gambling** [DW]: unique 1/2000, set 1/1000, rare 1/10, otherwise magic. Official confirmation is UNKNOWN.

**Rarest runes** (DERIVED, per drop from the Hell Act 5 rune table "Runes 17"):

| Rune | Odds |
|---|---|
| Ber | 1:1,475 |
| Jah | 1:1,321 |
| Cham | 1:1,981 |
| Zod | 1:5,171 |

## 4. Exchange rates

**LoL gold value per stat point** (wiki Gold_efficiency; reference = the cheapest single-stat basic item)

| Stat | Gold per point |
|---|---|
| AD | 35 |
| AP | 20 |
| Armor | 20 |
| MR | 20 |
| HP | 2.67 |
| Mana | 1 |
| Ability haste | 50 |
| Crit | 40 per % |
| Attack speed | 25 per % |
| Flat move speed | 12 |
| Lethality | 30 |
| % armor pen | 41.67 |
| Life steal | 53.55 |
| Omnivamp | 46 |
| % move speed | 65.105 |

- Gold efficiency = stat value ÷ price × 100%; "gold efficient" means at least 100%.
- Published examples: Infinity Edge 103.57%, Rabadon's Deathcap 74.29%, Black Cleaver 121.39%.
- Sellback: most items return 70%, starters 40%, and some 30% or 0%.

**Sellback in the tower defense games (R1)**
- BTD6: 70% default (rounded up), soft cap 95%.
- Kingdom Rush: 60%; 90% with Salvage.
- Legion TD 2: 60%; 90% with Pawn Shop / Pirate Skeleton; Hybrid 80%.
- Gem TD: gems can't be sold.

**Roguelike exchanges (R2)**
- Hades Wretched Broker (one-way): 10 Gemstones → 1 Key; 5 Keys → 1 Nectar; 10 Nectar → 1 Diamond; 2 Diamonds → 1 Ambrosia; 1 Ambrosia → 1 Titan Blood.
- Hades Mirror reset: costs 1 Key and refunds 100% of Darkness.
- RoR2 Scrapper: 1 item → 1 scrap of the same tier.
- RoR2 Cauldrons: 3 white → 1 green; 5 green → 1 red; 1 red → 3 white.
- Dead Cells Recycling I/II: floor items become 7% / 15% of their sale price in gold.
