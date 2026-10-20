"""PAC loop-math-v1 worked example: arithmetic check.
Every input here is an EXAMPLE value (labelled in loop-math-v1.md), except the hero DPS figures,
which are STAT-MATH.md PROPOSAL outputs (sec 5.1 Build A, sec 5.3 Build C). Nothing here is decided.
Run: python3 loop_math_example.py   (exits non-zero if any assert fails)
"""
import math

# ---- XP curve, OPTION A (VS shape x10): pellets needed for L -> L+1
def req(L):            # L = current level
    return 50 + 100 * (L - 1)
def cum_to(L):         # total pellets to reach level L from level 1
    return sum(req(l) for l in range(1, L))
assert [req(l) for l in (1, 2, 3)] == [50, 150, 250]
assert cum_to(6) == 1250 and cum_to(10) == 4050
def level_at(pellets):
    L = 1
    while pellets >= cum_to(L + 1):
        L += 1
    return L
assert level_at(1249) == 5 and level_at(1250) == 6

# ---- EXAMPLE inputs
R_FARM, R_SIEGE, R_BOSS = 6.0, 2.0, 0.0   # pellets/s eaten in each phase
FARM_GAP = 120.0                            # s of farm/defend/travel between towers
TOWER_HP = [3000, 4500, 6000]               # enemy towers 1-3
UNIT_DPS = 15.0                             # your little units' DPS on a tower
SIEGE_UPTIME = 0.6                          # share of siege time the hero is hitting the tower
LAIR_MICRO = 5; LAIR_MICRO_HP = 600; LAIR_FIXED = 90.0   # micro towers + maze/puzzle time
BOSS_HP_PER_LEVEL = 1000                    # boss HP = 1000 x player level at boss spawn (VS HP x Level shape)
BOSS_UPTIME = 0.5                           # share of boss time the hero can hit (mechanics, dodging)

# ---- STAT-MATH PROPOSAL DPS (sec 5.1, 5.3) at L1/L6/L10/L20; linear between table points
DPS = {"A melee crit": {1: 46.5, 6: 84.0, 10: 85.8, 20: 195.5},
       "C heavy tank": {1: 19.3, 6: 21.8, 10: 33.0, 20: 41.6}}
def dps_at(tbl, L):
    ks = sorted(tbl)
    L = max(ks[0], min(ks[-1], L))
    for a, b in zip(ks, ks[1:]):
        if a <= L <= b:
            return tbl[a] + (tbl[b] - tbl[a]) * (L - a) / (b - a)
    return tbl[ks[-1]]
assert abs(dps_at(DPS["A melee crit"], 8) - 84.9) < 1e-9

def run(build):
    tbl = DPS[build]
    t = 0.0; eaten = 0.0; log = []
    # Phase 1: lane phase until char level 6 (the canon ladder ends at the L6 stone)
    t1 = cum_to(6) / R_FARM; t += t1; eaten += cum_to(6)
    log.append(("lane phase to L6", t1, level_at(eaten)))
    for i, hp in enumerate(TOWER_HP):
        if i > 0:
            t += FARM_GAP; eaten += FARM_GAP * R_FARM
            log.append((f"farm/defend gap before tower {i+1}", FARM_GAP, level_at(eaten)))
        L = level_at(eaten)
        tt = hp / (dps_at(tbl, L) * SIEGE_UPTIME + UNIT_DPS)
        t += tt; eaten += tt * R_SIEGE
        log.append((f"break tower {i+1} ({hp} HP) at L{L}", tt, level_at(eaten)))
    L = level_at(eaten)
    tl = LAIR_FIXED + LAIR_MICRO * LAIR_MICRO_HP / (dps_at(tbl, L) * SIEGE_UPTIME + UNIT_DPS)
    t += tl; eaten += tl * R_SIEGE
    log.append(("lair (5 micro towers + maze)", tl, level_at(eaten)))
    L = level_at(eaten)
    boss_hp = BOSS_HP_PER_LEVEL * L
    tb = boss_hp / (dps_at(tbl, L) * BOSS_UPTIME)
    t += tb
    log.append((f"boss ({boss_hp} HP at L{L})", tb, L))
    return t, eaten, log

results = {}
for b in DPS:
    total, eaten, log = run(b)
    results[b] = total
    print(f"\n== Build {b} ==")
    for name, dt, L in log:
        print(f"  {name:40s} {dt:8.1f} s   level after: L{L}")
    print(f"  TOTAL {total:8.1f} s = {total/60:5.1f} min; pellets eaten {eaten:,.0f}")

ratio = results["C heavy tank"] / results["A melee crit"]
print(f"\nC/A match-length ratio: {ratio:.2f}x")

# ---- Lane pressure: undefended lane flips when enemy wave strength passes your units
W0, GROWTH, WAVE_S = 1.0, 0.05, 30.0         # EXAMPLE: wave strength x1.05 per wave, every 30 s
def flip_wave(U):                             # first wave n with W0*(1+g)^n > U
    return math.floor(math.log(U / W0) / math.log(1 + GROWTH)) + 1
for tier, U in [(0, 1.2), (1, 1.5), (2, 1.9)]:
    n = flip_wave(U)
    assert W0 * (1 + GROWTH) ** n > U >= W0 * (1 + GROWTH) ** (n - 1)
    print(f"own tower tier {tier}: units {U} -> undefended lane flips at wave {n} = {n*WAVE_S/60:.1f} min")

# Hero time share per lane if spread evenly
for lanes in (3, 5, 7):
    print(f"{lanes} lanes: hero can cover at most {1/lanes:.0%} of each lane's time")

# ---- Economy check: own-tower upgrade ladder (EXAMPLE, KR-like x1.5 steps) vs income
UPG = [300, 450, 675]
assert sum(UPG) == 1425
print(f"\nFull own-tower upgrade (3 steps) = {sum(UPG)} pellets = {sum(UPG)/R_FARM:.0f} s of farm income")
print(f"Rebuild at 70% of spent (BTD6 sell-rate anchor) for a tier-2 tower = {0.7*(UPG[0]+UPG[1]):.0f} pellets")

for b in DPS:
    _, eaten, _ = run(b)
    print(f"Upgrade ladder share of {b} run's pellets: {sum(UPG)/eaten:.1%}")

# ---- XP option X-B (LoL shape) cumulative check
lol = lambda L: 280 + 100 * (L - 1)
assert sum(lol(l) for l in range(1, 6)) == 2400 and sum(lol(l) for l in range(1, 10)) == 6120
print("X-B LoL-shape: to L6 = 2400, to L10 = 6120 (asserted)")
