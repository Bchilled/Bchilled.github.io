# PAC — Arena Muncher (prototype v1)

A Vampire-Survivors-like arena survivor with Pac-Man DNA, in a single HTML page.
No build step, no external assets — canvas primitives + synthesized WebAudio only.

## Run it

Open `index.html` in any modern browser, or serve the folder:

```bash
python3 -m http.server 8077   # then visit http://localhost:8077/
```

Click **START**. (Add `?test=1` to the URL for an auto-playing smoke-test mode.)

## Controls

| Input | Action |
|---|---|
| WASD / arrow keys / touch-drag | Move |
| SPACE | Chomp Dash (once copied) |
| 1 / 2 / 3 | Swap active copied power (or tap a power slot) |
| P | Pause |
| M / 🔊 button | Mute |
| Touch **DASH** button | Dash (touch devices) |

## How it plays

- **One huge looping arena** (3400×2600, wraps on every edge — exit left, enter
  right). Dots stream in trails and clusters; eating them gives XP, score, and combo.
- **Combo meter** — chained dots raise your speed, your score multiplier, and the
  pitch of the waka sound. Getting hit halves it; starving it drains it.
- **Ghosts are the pressure.** Four classic personalities hunt you: the **Chaser**
  targets you, the **Ambusher** targets where you're heading, the **Flanker**
  mirrors a pivot off the Chaser, and the **Wildcard** alternates chase/wander and
  backs off when close. The spawn curve compounds over time (~27 ghosts at 1 min,
  ~62 at 2 min, ~111 at 3 min, up to a 220 cap), eaten ghosts return from the
  edges seconds later, and periodic **GHOST SURGE** rings mass around you.
  If your clear rate falls behind the spawn curve, the screen floods and contact
  damage ends the run — that flood is the lose condition.
- **Power pellets → EAT MODE** (~every 20s): ghosts turn blue, slow down, and
  become edible with classic chain scoring (200/400/800/1600).
- **Kirby layer** — eating a ghost **copies its power**: Chaser → 🔥 **Fire Trail**
  (burn ghosts with your trail), Ambusher → 💨 **Chomp Dash** (SPACE: invulnerable
  dash that can eat ghosts), Flanker → 🧲 **Magnet Maw** (dots/fruit stream to you),
  Wildcard → a random one. Hold up to **3**; eating when full drops the oldest;
  eating a duplicate levels that power up (max Lv3).
- **Level-ups** pause the run with 3 choice cards: new powers, power upgrades,
  and stats (speed, max HP, magnet, chomp radius, eat-mode duration, combo window, heal).
- **Fruit & elites** — fruit drops give big XP and a heal; crowned elite ghosts
  (from ~90s) drop fruit when eaten. 3 lives; HP refills per life lost.

## Saves

Progress persists in the browser via a versioned localStorage save
(key **`pac-save-v1`**). It stores:

- **Best run** — score, survival time, level reached.
- **Lifetime totals** — runs played, ghosts eaten, dots eaten.
- **Unlock roster** — array of unlocked character ids (seeded with `pac`).
  The structure is ready for the design bible's unlock system, and
  `Save.unlock(id)` persists a new unlock the moment it happens.
- **Curse ledger** — an (empty, for now) array ready for Bomberguy's curses.
- **Settings** — mute state (restored on boot, button included).

Saves are written when a run starts, at every level-up, periodically during
play (~15s), when the tab is hidden, and at game over — a live run is merged
into the records on each write and folded in exactly once when it ends, so
closing the tab mid-run never loses or double-counts progress. A small
"✓ Progress saved" tag fades in on event saves. An absent or corrupted
save falls back to a fresh one (an old v0 `pacBest` score is migrated).
**Reset save** buttons on the start and game-over screens wipe it, with a
confirm prompt.

## Sound

All WebAudio-synthesized: waka blips that climb in pitch with your combo, an
eat-mode siren, ghost-eat zaps, copy-power sting, level-up arpeggio, hurt thud,
game-over jingle. Mute with M.

## Performance notes

Ghosts are pooled objects (no allocation churn at full swarm), separation uses a
wrap-aware spatial hash so ~200 ghosts stay smooth, dots are capped (~420) and
particles are capped/pooled. Verified headless: 187-ghost swarm at ~60 fps in
software rendering.

## Stubbed / not yet built (see DESIGN.md)

- Boss events (mega-ghost) — designed, not implemented.
- Music loop — only SFX/siren in v1.
- Extra copy powers (shield bubble, ghost-phase) — designed, only the 3 above ship.
- Themed non-ghost mobs, and the meta-progression unlock system itself —
  the save already carries the roster + curse-ledger structure, but no
  unlock events are wired to gameplay yet.
- Pac-Man/ghost likenesses are Namco IP (Kirby layer echoes Nintendo): personal
  prototype only — re-skin before anything public.
