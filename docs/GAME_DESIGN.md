# Game design

**Hoshi no Hanabira: Isekai Bloom** — a 2D side-view anime auto-combat roguelite.

Design pillars:

1. **Beautiful heroines.** Distinct silhouettes, palettes and combat identities.
2. **Automatic combat.** The player watches and thinks; the heroine executes.
3. **Meaningful decisions.** Upgrade choices should change how the next fight plays out.
4. **Satisfying progression.** Visible growth within a run and (planned) across runs.

---

## 1. World of Asteria

Asteria was protected by the Starflower Goddess, who scattered her power as **Star Petals**. Rifts
have begun opening across the land, releasing corrupted creatures. The **Blossom Guardians** travel
between regions to seal them and restore the world's celestial energy.

Tone: adventurous, colourful, uplifting. Combat is magical and exciting, never gory.

### Regions (planned)

| Region | Theme | World boss |
| --- | --- | --- |
| Blossom Meadow | Pastel meadows, cherry blossoms, floating islands | The Thorn Queen |
| Moonlit Forest | Luminous mushrooms, glowing trees, spirits | The Shadow Empress |
| Crystal Kingdom | Crystal formations, ancient arcane architecture | The Crystal Dragon |
| Ember Highlands | Volcanic highlands, fire spirits, lava rivers | The Fallen Star Guardian |
| Celestial Ruins | Celestial architecture, corrupted guardians | The Corrupted Celestial |

Only the Blossom Meadow is implemented in Phase 1.

---

## 2. Run structure

A run is ten stages, escalating in enemy count, enemy tier and stat scaling:

| Stage | Content |
| --- | --- |
| 1 | Introduction — star slimes |
| 2 | Forest sprites and shadow bunnies join |
| 3 | First elite: Corrupted Fairy Knight |
| 4 | Larger mixed waves |
| 5 | Mini-boss: Crystal Golem |
| 6 | Crystal beetles and flame spirits |
| 7 | Elite wolves and treants |
| 8 | Heavy waves |
| 9 | Pre-boss challenge |
| 10 | The Thorn Queen |

Each stage defines timed waves in `src/data/stages.ts`. Clearing every wave ends the stage; the
heroine recovers a small amount of health and the next stage begins. Losing all health ends the run.

---

## 3. Heroine: Yuzuki Hoshino

**The Celestial Swordswoman** · 22 · Light / Stars · Celestial Katana

Balanced melee fighter. Composed, elegant, quietly affectionate. Long pearl-silver hair with
lavender undertones and a narrow side braid, icy turquoise eyes, a white and midnight-blue battle
coat with silver filigree and a small star ornament.

### Kit

| Ability | Type | Behaviour |
| --- | --- | --- |
| Starlight Slash | Melee arc | Fast horizontal strike hitting everything in front |
| Crescent Step | Dash | Short magical reposition with brief invulnerability |
| Astral Crescent | Piercing wave | Wide crescent energy slash that travels forward |
| Starfall | Rain | Calls several stars down onto enemies |
| Celestial Awakening | Self-buff | Temporarily empowers her katana and attack speed |

Basic attack: precise katana slashes with a 150 px reach and a 0.62 s cadence, with a critical
chance.

### Automatic ability rules

- **Starlight Slash** when a target is inside its arc.
- **Astral Crescent** when a target is within its 460 px lane.
- **Starfall** when at least two enemies are alive.
- **Celestial Awakening** against a boss, below 62 % health, or when three or more enemies cluster.
- **Crescent Step** to escape when health drops below 45 % with an enemy inside 130 px.

---

## 4. Roster (planned heroines)

All six are adults (21–23). Designs are original; the archetypes below describe tone only.

| Heroine | Age | Role | Element | Weapon |
| --- | --- | --- | --- | --- |
| Yuzuki Hoshino | 22 | Balanced melee | Light / Stars | Celestial Katana |
| Akari Amamiya | 21 | Fast melee burst | Fire | Twin Flame Blades |
| Shiori Tsukishiro | 22 | Defensive melee / magic | Moon / Water | Moonlight Longsword |
| Miyu Sakuraba | 23 | Sustained damage / healing | Nature | Twin Petal Blades |
| Rin Kisaragi | 21 | Critical melee / shadow | Shadow | Crimson Rapier |
| Airi Mizuhara | 22 | Ranged magic | Ice | Frost staff with a floating crystal |

Their full ability lists live in `src/data/heroines.ts`; only Yuzuki is unlocked in Phase 1.

---

## 5. Enemies

### Basic

| Enemy | Behaviour |
| --- | --- |
| Star Slime | Slow chaser, low health, glowing core |
| Forest Sprite | Small, quick, erratic chaser |
| Shadow Bunny | Very fast, fragile, hit-and-run |
| Mushroomling | Sturdy short-range bruiser |
| Crystal Beetle | Armoured, slow, high defence feel |
| Flame Spirit | Keeps distance and lobs fire projectiles |

### Elite

Corrupted Fairy Knight (shielded bruiser), Shadow Wolf (fast lunges), Enchanted Treant (slow,
heavy), Arcane Beast Guardian (ranged bursts), Crystal Golem (mini-boss, ground slams).

### Boss: The Thorn Queen

- Summons thornlings to pressure the heroine.
- Marks the ground under the heroine; the telegraphed area erupts after a delay.
- Charges across the arena.
- At 50 % health she enters a second phase with faster patterns and a temporary barrier.

---

## 6. Combat model

- Side-view ground plane; both sides walk horizontally and attack in place.
- Damage: `attack × ability power`, reduced by `defence / (defence + 120)`, with a critical roll
  multiplying by the critical-damage stat.
- Target selection scores every enemy by proximity, threat tier and whether it is already engaged,
  then applies hysteresis so the heroine only switches for a meaningfully better target.
- Everything gameplay-related advances through one simulation delta produced by
  `SimulationClock`, which also owns pause and the 1× / 2× multiplier.

---

## 7. Upgrades (planned, Phase 2)

After eligible stages the simulation pauses and three cards are offered. Categories: offensive,
defensive, magical, special and heroine-specific. Rarities Common → Legendary raise impact.

Evolutions trigger when both halves of a pair are owned:

| Pair | Evolution |
| --- | --- |
| Celestial Edge + Astral Resonance | Celestial Excalibur |
| Burning Blades + Explosive Ember | Phoenix Inferno |
| Moonlight Barrier + Healing Moon | Lunar Sanctuary |
| Eternal Blossom + Petal Storm | Eternal Spring |
| Crimson Precision + Phantom Blade | Crimson Phantom |
| Frostbite + Frozen Lance | Absolute Zero |

---

## 8. Progression (planned, Phase 5)

**Astral Coins** are earned from stages, bosses, runs and achievements, then spent on permanent
bonuses (starting health, damage, attack speed, extra upgrade options) and unlocks (heroines,
worlds). Meta upgrades are intentionally modest so runs stay skill- and decision-driven.

---

## 9. Presentation

- Pastel palette, gold filigree interface, serif display type.
- Large character art on the title and roster screens; in-combat sprites keyed from flat-background
  illustrations.
- Element-specific effect colours: starlight blue-white, ember orange, moonlight silver-violet,
  blossom pink-green, crimson shadow, ice cyan.
- Damage numbers, critical flourishes, hit flashes and stage banners keep combat readable.
