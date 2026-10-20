# R3: League of Legends item system dossier

Prepared by Carlon for Brent Snow / Kanye (PAC research queue). Research only: no design proposals.
Fetched on 2026-10-20 (EDT).

**Patch baseline: V26.20.** The League of Legends Wiki "Patch" page lists V26.20 as the current patch, released October 2026 (the wiki's date cell is garbled as "October 7 23"; V26.19 was 23 Sep 2026). The Item group page is stamped "Last Updated: V26.12" and carries an outdated banner.

**Summoner's Rift (SR) only.** ARAM, Arena and Nexus Blitz items are excluded unless noted.

**Labels used:**
- **UNKNOWN**: not published in the sources checked.
- **(DERIVED)**: a figure I calculated from published data.
- **CONFLICT**: sources disagree.

## Sources

| Short name | What it is |
|---|---|
| [W-Item] | wiki.leagueoflegends.com/en-us/Item |
| [W-Tiers] | wiki pages Basic item, Epic item, Legendary item, Starter item, Boots, Consumable item |
| [W-Myth] | wiki "Mythic item" |
| [W-1401] | wiki "V14.1" and "V14.1/Items" (patch 14.1 notes, 10 Jan 2024) |
| [W-25S1] | wiki "V25.S1.1" |
| [W-RQ] | wiki "Role Quest" |
| [W-Grp] | wiki "Item group" |
| [W-GE] | wiki "Gold efficiency" |
| [W-Shop] | wiki "Shop" |
| [W-Data] | wiki "Module:ItemData/data" (the structured item database behind the wiki's tooltips; raw Lua parsed by me, filtered to `modes["classic sr 5v5"]=true`) |

Raw copies are on the box at /workspace/pac-game/raw/lol/.

---

## 1. Item tiers and gold costs

[W-Item] defines four "quality tiers": **Starter, Basic, Epic, Legendary**. Boots, Consumables, Trinkets and Distributed items sit alongside these tiers as separate classifications.

- **Starter:** "effective at the beginning of the game"; "most starter items are not part of recipes".
- **Basic:** "provide a single stat".
- **Epic:** "may provide higher stats than basic items and/or new effects".
- **Legendary:** "provide the greatest power and effects of all items". They are finished items and are not components of anything else [W-Tiers].

Inventory: 6 main slots plus 1 trinket slot. The Bot and Support Role Quests grant 1 extra slot that holds a specific item [W-Item].

### Item counts per tier

| Tier | Count in [W-Data], SR (DERIVED) | Wiki category list count |
|---|---|---|
| Basic | 15 | 15 |
| Epic | 44 | 46 |
| Legendary | 112 | 127 |
| Starter | 13 | 20 (includes Guardian's/ARAM starters) |

**CONFLICT:** the Epic and Legendary counts differ between the two sources. The wiki category lists include items from non-SR modes; I did not reconcile them item by item.

### Gold cost ranges (SR, [W-Data], DERIVED)

| Tier | Priced items | Min | Max | Median |
|---|---|---|---|---|
| Basic | 15 | 200 | 1300 | 400 |
| Epic | 43 | 600 | 1600 | 1000 |
| Legendary | 106 | 1500 (Mejai's Soulstealer) | 3500 (Infinity Edge, Rabadon's Deathcap) | 2900 |
| Starter | 12 | 350 (Dark Seal) | 450 | — |

Some Legendaries are not bought directly: the support items reached by upgrading Bounty of Worlds have no purchase price.

### Full Basic tier ([W-Data], price, then stat)

- Faerie Charm: 200, 50% base mana regen
- Dagger: 250, 10% attack speed
- Glowing Mote: 250, 5 ability haste
- Cloth Armor: 300, 15 armor
- Sapphire Crystal: 300, 300 mana
- Rejuvenation Bead: 300, 100% base health regen
- Long Sword: 350, 10 AD
- Ruby Crystal: 400, 150 HP
- Null-Magic Mantle: 400, 20 MR
- Amplifying Tome: 400, 20 AP
- Cloak of Agility: 600, 15% crit
- Blasting Wand: 850, 45 AP
- Pickaxe: 875, 25 AD
- Needlessly Large Rod: 1200, 65 AP
- B. F. Sword: 1300, 40 AD

### Boots [W-Item], [W-Data]

Limited to 1 Boots item (Boots item group).

- **Tier 1, +25 move speed:** Boots costs 300. Slightly Magical Boots costs 0 and is distributed.
- **Tier 2, 45 move speed baseline:** 7 items costing 900–1250.
  - Ionian Boots of Lucidity 900
  - Boots of Swiftness 1000 (55 MS)
  - Gluttonous Greaves 1000
  - Sorcerer's Shoes 1100
  - Berserker's Greaves 1100
  - Plated Steelcaps 1200
  - Mercury's Treads 1250
- **Tier 3:** 7 exclusive upgrades of the Tier 2 boots. They are upgraded automatically on completing the **Midlane Quest** [W-Item]. Role Quests were "Added" in **V26.01** [W-RQ].
  - History: Tier 3 boots were first introduced in **V25.S1.1** as a paid unlock via "Feats of Strength". That version required at least 2 Legendary items before buying [W-25S1].

### Consumables

Some consumables stack in one slot up to a cap. For example, Health Potion costs 50 and is "Limited to 5 at a time" [W-Data]. Elixirs cost 500 each, and the Elixir item group allows 1 at a time [W-Grp].

### Selling [W-Shop]

- "Most may sell for 70% of their total gold value"; starter items may sell for 40%; some sell for 30% or 0%.
- Undo is unlimited, with no penalty, until you leave shop range, enter combat, or similar.

## 2. Component and build-path rules

- **Recipes:** Basic and Epic items combine in recipes to make Legendaries [W-Item].
- **Total price** = sum of component prices + a **combine cost** paid in gold. Example [W-1401]: "Lost Chapter + Tear of the Goddess + Fiendish Codex + 500 = 3000".
- **Distribution:** some items cannot be bought and are granted instead.
- **Transformation:** stacks or quest triggers replace an item in place [W-Item].
- **Recipe and transformation bypass item-group locks:** "This excludes acquiring an item within the group by combining its recipe or via transformation" [W-Item].
- **Shop helper:** the "Purchase Components" button auto-buys the highest-cost components first [W-Shop].

### Legendary recipe sizes ([W-Data], SR, 112 items, DERIVED)

| Components | Items |
|---|---|
| 3 | 58 |
| 2 | 46 |
| 1 | 7 (mostly support-quest upgrade chains plus Mejai's from Dark Seal) |
| 4 | 1 |

### Legendary component-tier patterns (DERIVED)

"E" = Epic, "B" = Basic.

| Pattern | Items |
|---|---|
| E+E | 32 |
| B+E+E | 25 |
| B+B+E | 21 |
| B+E | 10 |
| E+E+E | 10 |
| other | 8 |

### Combine cost (DERIVED: item price minus sum of component prices)

| Tier | Min | Max | Median | Items |
|---|---|---|---|---|
| Epic | 50 | 900 | 400 | 43 |
| Legendary | 50 | 1150 | 669 | 106 |

### Example build trees [W-Data]

- **Infinity Edge (3500)** = B. F. Sword + Pickaxe + Cloak of Agility. This is all Basic components; the wiki's internal tier field is 2.
- **Trinity Force (3333)** = Sheen + Phage + Hearthbound Axe.
- **Zhonya's Hourglass (3250)** = Needlessly Large Rod + Seeker's Armguard.
- **Sheen (900)** = Glowing Mote. Its *Spellblade* (100% base AD) is upgraded to 200% in Trinity Force: the Epic holds a lesser version of the Legendary's named passive [W-Item]: "Some Epic items offer a lesser version of the Legendary item(s) that they build into".

## 3. Stat blocks per item class

**Shop class filters**, in UI order: Fighter, Marksman, Assassin, Mage, Tank, Support [W-Shop]. An item can carry several class tags.

The table below is computed over SR Legendaries in [W-Data], grouped by class tag (all DERIVED). "Med" = median; "in N" = how many items in that class carry the stat.

| Class | Items | Price range (median) | Most common stats: in N, range, med |
|---|---|---|---|
| Tank | 23 | 2200–3300 (2800) | HP in 22, 150–1000, med 375; AH in 13, 10–20, med 15; Armor in 12, 20–75, med 50; MR in 9, 20–80, med 45 |
| Fighter | 24 | 2800–3333 (3100) | AD in 20, 30–65, med 42.5; HP in 13, 300–600, med 450; AH in 9, 10–20, med 15; AS in 7, 20–50, med 25 |
| Assassin | 14 | 2500–3200 (3000) | AD in 14, 45–60, med 55; Lethality in 10, 10–22, med 18; AH in 9, 10–20, med 15 |
| Mage | 27 | 1500–3500 (2900) | AP in 26, 20–130, med 77.5; AH in 15, 10–25, med 15; HP in 11, 100–400, med 350; Mana in 7, 300–600, med 600 |
| Marksman | 26 | 2650–3500 (3000) | AD in 19, 30–80, med 50; AS% in 15, 25–65, med 40; Crit% in 14, med 25; MS% in 7, 4–10 |
| Support | 22 | 2200–2850 (2250) | Mana regen % in 16, 75–150, med 100; HP in 15, 200–350, med 200; AH in 13, 10–20, med 15; AP in 9, 25–75, med 45; Heal/shield power % in 6, 8–16; Gold per 10s in 6, 5–9 |

### Verbatim example stat blocks [W-Data]

| Item | Class | Price | Stats | Passive / active |
|---|---|---|---|---|
| Infinity Edge | Marksman | 3500 | 75 AD, 25% crit, 30% crit damage | — |
| Rabadon's Deathcap | Mage | 3500 | 130 AP | Unique passive *Magical Opus*: +30% AP |
| Sunfire Aegis | Tank | 2800 | 350 HP, 50 armor, 10 AH | Passive *Immolate* |
| Black Cleaver | Fighter | 3000 | 45 AD, 400 HP, 20 AH | Passives *Carve* (6% armor reduction per stack, max 5 stacks = 30%) and *Fervor* |
| Youmuu's Ghostblade | Assassin | 2800 | 55 AD, 18 lethality, 4% MS | Active *Wraith Step* (45 s cooldown); passive *Haunt* |
| Ardent Censer | Support | 2200 | 45 AP, 125% mana regen, 10% heal/shield power, 4% MS | Passive *Sanctify* |

### Shape of item effects

- Legendaries in [W-Data] carry **168 named effects**: 146 passives and 22 actives.
- **164 of 168** are flagged `unique` (DERIVED).
- **22 Legendaries** have an active (DERIVED).

## 4. Rarity structure today: what replaced Mythics

- **Removal:** "Mythic item was one of the item classifications… It was **removed in V14.1**" [W-Myth]. V14.1 was released 10 January 2024 [W-1401].
- **How the old system worked** [W-Myth]:
  - Each Mythic had a *Mythic passive* granting small stat bonuses per other Legendary owned. For example: "Empowers each of your other Legendary items with 5 ability haste" [W-1401].
  - A player could equip only 1 Mythic.
  - Ornn could upgrade Mythics to Masterworks.
- **What V14.1 did** [W-1401]:
  - Removed **11 Mythic items** outright: Crown of the Shattered Queen, Divine Sunderer, Duskblade of Draktharr, Evenshroud, Everfrost, Galeforce, Goredrinker, Liandry's Anguish, Luden's Tempest, Night Harvester, Radiant Virtue.
  - Converted the remaining Mythics with "Item type changed to Legendary from Mythic" and removed their Mythic passives.
  - Added 23 new Legendaries, including Liandry's Torment and Luden's Companion as replacements.
  - Ornn can now upgrade *Legendary* items.
- **What replaced it:** **no new rarity tier.** The top tier is now Legendary only. The one-Mythic limit has no single successor. The wiki's live rules are:
  - default one-copy-per-Legendary uniqueness, and
  - named **item groups** that lock out other members (section 5).
- **Later additions to the "top end"** (both are Boots-only systems, not a new rarity):
  - V25.S1.1 added Tier 3 Boots via Feats of Strength.
  - V26.01 added Role Quests; the current Tier 3 Boots unlock is the Midlane Quest [W-25S1], [W-RQ], [W-Item].

## 5. Passive/active uniqueness rules [W-Item]

Verbatim rule set:

1. "By default, only one of each Legendary-tier item may be equipped."
2. **Single effect limitation:** an item's unique effect does not stack with copies of the same item.
3. **Shared effect limitation:** "unique effects can only be gained once from all items that share it, even if the two items seem to be entirely unrelated."
4. **Item group limitation:** you cannot equip more than one item in the same group. The group is *locked* in the shop, except when the item is gained through a recipe combine or transformation.
5. "All buff or debuff auras can only affect a unit once. Damaging auras may be able to stack."
6. Items that share a named effect with a cooldown also share that cooldown.
7. "Items do not possess uniqueness by default." Strict rules apply to **all** Legendaries and **most** consumables.
8. Internally this is handled by name tags and group-ID tags. Each group has "a unique number" [W-Grp].

### Item groups [W-Grp] (stamp V26.12; 23 groups)

- **Annul:** Verdant Barrier, Banshee's Veil, Edge of Night
- **Blight:** Blighting Jewel, Bloodletter's Curse, Cryptbloom, Terminus, Void Staff
- **Boots:** all 16 boots
- **Dirk:** Serrated Dirk
- **Elixir:** 3 elixirs
- **Eternity:** Catalyst of Aeons, Rod of Ages
- **Fatality:** Last Whisper, Black Cleaver, Lord Dominik's Regards, Mortal Reminder, Serylda's Grudge, Terminus
- **Glory:** Dark Seal, Mejai's
- **Guardian:** 4 Guardian's items
- **Hydra:** Tiamat, Profane, Ravenous, Stridebreaker, Titanic
- **Immolate:** Bami's Cinder, Sunfire Aegis, Hollow Radiance
- **Lifeline:** Archangel's Staff, Hexdrinker, Immortal Shieldbow, Maw of Malmortius, Protoplasm Harness, Seraph's Embrace, Sterak's Gage
- **Manaflow:** Archangel's Staff, Manamune, Tear of the Goddess, Whispering Circlet, Winter's Approach
- **Momentum:** Dead Man's Plate
- **Potion:** Health Potion, Refillable Potion
- **Quicksilver:** Mercurial Scimitar, Quicksilver Sash
- **Soul Anchor:** Lifeline, Spectral Cutlass
- **Spellblade:** Sheen, Bloodsong, Dusk and Dawn, Essence Reaver, Iceborn Gauntlet, Lich Bane, Trinity Force
- **Starter:** 16 starters/support items
- **Stasis:** Seeker's Armguard, Shattered Armguard, Zhonya's Hourglass
- **Trinket:** 3 trinkets

Group names often equal the shared passive name (e.g. Spellblade, Immolate, Lifeline, Manaflow, Annul).

### Named effects shared across Legendaries ([W-Data], by name, DERIVED)

| Effect name | Legendaries sharing it |
|---|---|
| Ward | 6 |
| Spellblade | 6 |
| Energized | 4 |
| Lifeline | 4 |
| Cleave | 4 |
| Manaflow | 3 |
| Immolate | 2 |
| Grievous Wounds | 2 |
| Blackout | 2 |
| Annul | 2 |
| Awe | 2 |

V14.1 also stopped listing "Energized" as a unique passive and made it a generic mechanic [W-1401].

## 6. The wiki's gold-efficiency method [W-GE]

- **Formula:** Gold efficiency = (Gold value ÷ Item price) × 100%.
- **Gold value** = the item's stats priced at reference rates. A stat's reference rate comes from "the least expensive basic item that provides only that stat".
- Passive/active effects are counted only if they grant a priced stat.
- "Gold efficiency does not have direct gameplay implications".

### Basic reference rates (gold per stat point)

| Stat | Reference item | Gold per point |
|---|---|---|
| AD | Long Sword 350 / 10 | 35 |
| Ability haste | Glowing Mote 250 / 5 | 50 |
| AP | Amplifying Tome 400 / 20 | 20 |
| Armor | Cloth Armor 300 / 15 | 20 |
| MR | Null-Magic Mantle 400 / 20 | 20 |
| HP | Ruby Crystal 400 / 150 | 2.666667 |
| Mana | Sapphire Crystal 300 / 300 | 1 |
| Base HP regen | Rejuvenation Bead 300 / 100% | 3 per % |
| Base mana regen | Faerie Charm 200 / 50% | 4 per % |
| Crit | Cloak of Agility 600 / 15% | 40 per % |
| Attack speed | Dagger 250 / 10% | 25 per % |
| Flat move speed | Boots 300 / 25 | 12 |

### Secondary rates

These are derived by subtracting known stats from Epic items:

| Stat | Reference item | Gold per point |
|---|---|---|
| % armor pen | Last Whisper | 41.666667 |
| Heal/shield power | Forbidden Idol | 50 |
| Lethality | Serrated Dirk | 30 |
| Life steal | Vampiric Scepter | 53.55 |
| Flat magic pen | Sorcerer's Shoes | 46.666667 |
| % magic pen | Blighting Jewel | 46.15 |
| Omnivamp | Gluttonous Greaves | 46 |
| On-hit damage | Recurve Bow | 21.666666 |
| Tenacity | Mercury's Treads | 10.333334 |

% move speed is averaged across Aether Wisp, Rectrix, Winged Moonplate and Zeal, giving **65.105**.

- **Threshold:** "gold efficient" means at least 100%.
- **Published examples:**

| Item | Efficiency |
|---|---|
| Infinity Edge | 103.57% |
| Rabadon's Deathcap | 74.29% |
| Black Cleaver | 121.39% |
| Trinity Force | 109.45% |
| Zhonya's Hourglass | 95.38% |
| Sunfire Aegis | 86.9% |
| Kindlegem | 129.17% |
| B. F. Sword | 107.69% |

- **Infinity Edge check (DERIVED):** 75×35 + 25×40 = 3625; 3625 ÷ 3500 = 103.57%. This means the wiki values IE's 30% crit damage at **0**. There is no reference rate for crit damage, so crit damage's gold value is UNKNOWN.
- **Spread** over the wiki table's SR Legendaries with a shop price (106 items, DERIVED):

| Measure | Value |
|---|---|
| Median | 99.57% |
| At or above 100% | 51 items |
| Lowest | Sterak's Gage 39.79% |
| Highest | Cryptbloom 129.48% |

- **Spread for Epics** (45 items, DERIVED):

| Measure | Value |
|---|---|
| Median | 100.0% |
| Range | 46.15% (Quicksilver Sash) to 146.25% (Runic Compass) |

## 7. Shop UI categories [W-Shop]

- **Tabs:** Recommended (default), All Items, Item Sets. Cycle with Ctrl+Tab.
- **All Items tab:**
  - "Popular" and "All items" toggles.
  - Top-bar class filters: Fighter, Marksman, Assassin, Mage, Tank, Support. The player's own class is the default.
  - Left-bar stat/effect filters that can be combined.
  - Grid sorted by increasing tier, with a reverse toggle.
- **Left-bar filter labels:** UNKNOWN; [W-Shop] does not list them. The [W-Data] `menu` tags seen on SR items are: onhit effects, movement, lifesteal vamp, health and reg, ability haste, mana and reg, armor pen, attack damage, ability power, attack speed, magic pen. They are likely, but **not confirmed**, to back the filters.
- **Item details panel:**
  - Recipe tree, highest tier at the top.
  - Description: stats, named effects, total cost.
  - "Builds Into" bar: up to 7 items, then an overflow button; Popular items shown first.
- **Quickbuy panels:** Consumables, Boots, Inventory.
- **Purchase button states:**
  1. Purchase Item
  2. Item Unavailable
  3. Not Enough Gold
  4. Too Far From Shop
  5. Queue Item
  6. Purchase Components
  7. Replace Queued Item
- **Item queue:** a HUD circle fills as you gain progress (components + gold) toward the queued item's total cost, and turns yellow when it is affordable.
- **Locked items** show a lock in place of their cost.
- **Search** matches names, descriptions, stats and nicknames (e.g. "bt" finds Bloodthirster).

## UNKNOWN list (6)

1. Exact V26.20 release day: the wiki cell reads "October 7 23" (garbled).
2. The patch that last revised the [W-Data] item values: the module carries no patch stamp. Values are as of the fetch date, 2026-10-20.
3. Item-by-item reconciliation of the Epic and Legendary count CONFLICT (44 vs 46 and 112 vs 127).
4. Labels of the shop's left-bar stat filters.
5. Gold value of crit damage and other stats with no reference item; the wiki effectively values them at 0.
6. Which items use the 30% and 0% sell ratios (the wiki says only "some").

## Relevance to PAC canon (fact mapping only)

| Canon question | Facts from this dossier |
|---|---|
| Item tier ladder | §1: 4 quality tiers plus Boots/Consumable/Trinket/Distributed side classes; Legendary is the top. |
| Price bands per tier | §1: price range and median per tier. |
| Recipe/component model | §2: total = components + combine cost; 2–3 components typical; Epics carry lesser forms of Legendary passives. |
| Stat budgets per role | §3: per-class stat medians (DERIVED); §6: reference gold-per-stat rates. |
| Single "special" slot rule | §4: Mythic one-per rule removed in V14.1 with no successor tier. |
| Exclusivity rules | §5: per-item uniqueness, shared named effects, item groups. |
| Value-balance method | §6: wiki gold-efficiency formula and reference table. |
| Shop UX | §7: class filters, recipe tree, "Builds Into" bar, item queue, undo. |
| Inventory size | §1: 6 slots + trinket + Role Quest slot. |
