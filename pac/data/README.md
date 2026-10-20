# pac/data

Data-only export for the PAC engine. Values are copied verbatim from the source files below. Nothing was added or computed. `GAP`, `DRAFT` and `TBD` markers come from the sources themselves.

Source repo: Bchilled/Bchilled.github.io @ 4bbfc378e0ab4e1e3da6a32a0b1a4dcdddaedfaf (main)

| File | Source | Keys / selection |
|---|---|---|
| stats.json | pac/charts/chart-data.json | `wheelOrder`, `stats` (7 stats, 3 shades each) |
| pure-pac-kit.json | pac/charts/chart-data.json + pac/wiki/chars/pure-pac.html | `chartRow` = `items[id=2142]` ("PURE PAC"). The facts, sub-stat growth, pipeline output, kit, super-unique, blue orb and gap table are copied from the wiki page, which cites characters/PURE-PAC.md + STAT-OUT.md (neither file is in the repo). |
| ghosts.json | pac/wiki/ghosts.html + pac/charts/chart-data.json | The 13-ghost table is copied verbatim. `families` groups ghosts by the table's own `Line` column. `chartRow` is the matching `items[cat=Enemies, name=<Ghost>]` row. |
| units.json | (none) | No unit families are filed in chart-data.json, the wiki, hq.html, DESIGN.md or FULL-SCOPE.md, so this file holds only the canon text quotes. |

chart-data.json does not contain a kit, ghost-family or unit field. Its item rows only have: id, name, spoof, cat, stat, shade, sub, also, gated, boss, newDraft, serves.

Validate: `python3 validate.py` (stdlib only).
