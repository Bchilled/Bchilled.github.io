# pac/carlon/ — Carlon's PAC research and design-math files

Owner: Carlon (Brent's Grok bot). Added 2026-10-20 so these files live in the same repo as everything else.
Status of everything here: WORKING files, not canon. Each file still needs Kanye's and Claude's review before any number in it is used.
Canon outranks every file in this folder.

Before this commit these files existed only on Google Drive and on Carlon's box. From now on the repo copy is the current one; Drive links in older emails are snapshots.

| File | What it is | Status | Older Drive copy |
|---|---|---|---|
| research/vampire-survivors-dossier.md | Vampire Survivors reference (weapons, passives, level-up offers, XP, stages, PowerUps, enemies). v2.1 with the F1 fixes (Move Speed 300 UNVERIFIED-current, 24 stages, two UNVERIFIABLE totals). | Research, in review (REVIEW-KANYE-carlon-batch1 fixes applied) | 15NXXrKgCD0gOqPi2xtLZTyyA0EWiGXV4 (v2.1). Older: 1BjInEs0nH9hWu6gu04U4mRLYzIHDQdhe (v2), 1O7Sa9TihqTK-iFD86ycntAVlB6XzGBxN (v1, outdated) |
| research/moba-reference.md | MOBA reference (LoL, Dota 2, Pokémon Unite, HotS, MLBB): maps, match length, XP, gold, respawn, structures, comeback systems | Research, in review | 17SrhpzBt_iNIY6oEVYz7o_f5Evv_KQ5m |
| research/tower-defense-dossier.md | R1: BTD6, Kingdom Rush, Gem TD, Legion TD 2 | Research, in review | 1yzTtoxkSHosCNJcR7gGyBfJVVjvI90Nj |
| research/roguelike-meta-dossier.md | R2: Hades, Dead Cells, Risk of Rain 2 meta-progression | Research, in review | 1jPrxujaB9DAPF29qPq19sivCt1R2FEaN |
| research/lol-items-dossier.md | R3: League of Legends item system, patch V26.20 | Research, in review | 1HuSKkIcNYbQdoLfOvazHVs7zqdBQFevq |
| research/diablo2-affix-dossier.md | R4: Diablo II affixes, rarity, MF, runes, sockets (LoD 1.14 + D2R deltas) | Research, in review | 1OMmPhhFTTWVjskWfUhiLjqQWPDsjN0Zm |
| extracts/F2-caps-exchange-extract.md | F2: caps and exchange rates only, from R1-R4, for Claude's detail pack | Research extract, in review | 1s0x6j4gIWY0Zjek0DX_XMSk1esOjMZj0 |
| design/core-loop-v2.md | Run-loop flowchart (mermaid) tagged CANON / CANON-K / OPEN / CONFLICT. Replaces core-loop-skeleton.md (v1, Drive 1cRaZw5fzCSf-Za_DgXJ6mWAv7fhV-tIT), which is outdated. | Working draft, in review | 1kbvp5kHLy4V3gg_ewWEFLpXtfdmWIPbv |
| design/loop-math-v1.md | Loop math framework with OPTIONS and a worked 3-lane EXAMPLE. No decisions. | Working draft, in review | 1cYWpDZkukoiq0Md6Wua3JJAyzOeynrnS |
| calc/loop_math_example.py | Arithmetic check for the worked example in loop-math-v1.md. `python3 loop_math_example.py`, exits non-zero if an assert fails. | Working | 1QNIkB2T4Oi04sfmJIlObbrjPyKETCBcO |
| calc/loop_math_example.out | Output of the script above | Working | none |

Notes
- core-loop-v2.md and loop-math-v1.md cite canon line numbers from the Drive snapshots of FULL-SCOPE.md, DESIGN.md, INTRO.md and STAT-MATH.md posted 2026-10-20 3:21 PM ET (FULL-SCOPE.md 1,681 lines). Kanye's CURRENT-GAME.md (6:13 PM) cites FULL-SCOPE lines past 1,681, so line numbers may have shifted in the newer FULL-SCOPE.
- Carlon's data export is in pac/data/ (commit 7ef99d3), not here.
- Nothing in this folder is a secret; it is published-source research and example math.
