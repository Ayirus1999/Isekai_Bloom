# Game design

**Hoshi no Hanabira: Isekai Bloom** — a 2D side-view anime auto-battler roguelite.

## Design pillars

1. **Animated heroines are the centrepiece.** Each should read as a character with her own silhouette,
   palette, weapon and combat temperament.
2. **Automatic combat.** The player never moves, aims or presses attack. Watching should be legible
   and satisfying.
3. **Build decisions matter.** Three cards after every reward; rarity, stacking and evolutions change
   real damage, survivability and pacing.
4. **Short, replayable adventures.** Ten encounters per world, two boss peaks, permanent growth.

## World of Asteria

The Starflower Goddess scattered her power as **Star Petals**. Rifts now release corrupted creatures;
the **Blossom Guardians** travel between regions to seal them. Tone is adventurous, colourful and
uplifting; combat is magical, never gory.

| World | Motif | Mini-boss | Final boss | Unlock |
| --- | --- | --- | --- | --- |
| Blossom Meadow | Pastel meadow, blossom trees | The Thorn Guardian | The Thorn Queen | Free |
| Moonlit Forest | Indigo forest, luminous mushrooms | The Moonlit Sentinel | The Crystal Dragon | 250 ✦ |
| Crystal Kingdom | Pale crystal court | The Crystal Warden | The Crystal Dragon | 500 ✦ |
| Ember Highlands | Ember sky, volcanic ground | The Ember Beast | The Fallen Star Guardian | 800 ✦ |
| Celestial Ruins | Violet celestial architecture | The Moonlit Sentinel | The Corrupted Celestial | 1200 ✦ |

The Crystal Kingdom currently reuses the Crystal Dragon as its final boss; the other four finals are
unique.

## Adventure structure

Every world is ten encounters:

| # | Kind | Content |
| --- | --- | --- |
| 1 | Group | Intro formation (3 enemies) |
| 2 | Group | Wider formation (4–5) |
| 3 | Event | Star Petal choice / coins |
| 4 | Group | Mixed group |
| 5 | **Mini-boss** | Exactly one mini-boss |
| 6 | Group | Larger formation |
| 7 | Group | Elite vanguard |
| 8 | Event | Blessing / coins |
| 9 | Group | Final threshold |
| 10 | **Final boss** | Exactly one boss |

Group sizes include formations with up to eight weaker enemies. The encounter's `hpScale` and
`damageScale` rise by world. Bosses ignore encounter scaling and use their own tuned multipliers.

### Boss rules

- Mini-bosses and final bosses are **always solo**. The spawn layer slices any boss roster to one.
- No summons, adds, clones or adds-by-phase. A boss may change patterns at 50% health, never its
  entourage.
- Bosses have a dedicated DOM health bar, a canvas telegraph ring, wind-up and strike body motion, a
  phase label, and a larger procedural body than normal enemies.
- Boss patterns: `sweep` (close arc or wave), `volley` (three projectiles), `slam` (delayed area),
  `beam`, `meteor` (two delayed areas), `drain` (damage + self-heal). Phase two shortens wind-ups and
  cooldowns.

## Roster

All heroines are adults (21–23), original designs.

### Yuzuki Hoshino — The Celestial Swordswoman
22 · Light / Stars · Celestial katana · Balanced melee.
Composed, elegant, quietly affectionate. Pearl-silver hair with lavender undertones, icy-turquoise
eyes, white and midnight-blue battle coat with celestial trim.

Kit: Starlight Slash (melee arc), Crescent Step (defensive dash), Astral Crescent (piercing wave),
Starfall (three-star rain), Celestial Awakening (area ultimate + attack/speed buff).

### Akari Amamiya — The Blazing Duelist
21 · Fire · Twin flame blades · Fast melee burst.
Energetic and protective. Coral-pink layered bob with high ponytail, emerald eyes, white/charcoal
jacket with ember-gold details.

Kit: Flame Rush (multi-hit arc), Burning Cross (two waves), Ember Trail (dash), Phoenix Burst (area),
Crimson Phoenix (ultimate area + empowerment).

### Shiori Tsukishiro — The Moonlit Princess
22 · Moon / Water · Moonlight longsword · Defensive hybrid.
Gentle, thoughtful, quietly determined. Ink-black braid, violet eyes, ivory and moon-blue dress armour.

Kit: Lunar Edge (arc), Moonveil (barrier), Falling Moon (wave), Silver Tide (area), Moonlit Sanctuary
(healing ultimate that also sears enemies).

### Miyu Sakuraba — The Blossom Guardian
23 · Nature / Blossoms · Twin petal blades · Sustained damage / healing.
Warm, patient, emotionally generous. Honey-peach waves, amber eyes, ivory/blossom dress with
rose-gold ornaments.

Kit: Petal Dance (twin arc), Blossom Shot (petal projectiles), Healing Bloom (heal over time), Thorn
Waltz (area), Eternal Spring (ultimate storm + healing).

### Rin Kisaragi — The Crimson Aristocrat
21 · Shadow / Crimson · Crimson rapier · Critical melee.
Refined, teasing, three moves ahead. Dark-chestnut high ponytail, ruby-violet eyes, burgundy and
ivory coat-dress.

Kit: Crimson Pierce (precision arc), Shadow Waltz (multi-target dash), Scarlet Phantom (afterimage
projectile), Royal Decree (crit buff), Crimson Eclipse (ultimate area + crit damage).

### Airi Mizuhara — The Frost Enchantress
22 · Ice · Frost staff · Ranged magic.
Calm, curious, quietly humorous. Aqua-to-ocean-blue hair in side braids, sapphire eyes, pale-blue
dress with crystal ornaments.

Kit: Ice Shard (volley), Frost Ring (area slow), Crystal Lance (piercing wave), Frozen Prison
(delayed freeze rain), Absolute Zero (crystalline ultimate + shield).

Each kit has different ranges, attack cadence, crit profiles and survivability. The shared rig means
visual distinction is carried mainly by hair, palette, outfit accents, weapon geometry and clip
selection.

## Combat model

- Heroine at a fixed left anchor, enemies in a right-hand lane.
- Basic attacks auto-target with a loyalty bonus; abilities fire on ready + trigger.
- A committed attack keeps its timing even when hit; flinches play between actions. This keeps boss
  fights from erasing the heroine's damage output.
- Damage: `attack × power × crit multiplier`, then `120 / (120 + defence)` mitigation, minimum 1.
- Status: freeze, slow, shields, attack/speed buffs, heal-over-time.
- Attack ranges are measured in logical units; the renderer compresses the far lane on portrait
  phones without changing simulation distances.

## Upgrades

After each reward the simulation pauses and offers exactly three cards. Player picks one.

Categories: Offense, Defense, Magic, Special, plus heroine-specific cards. Rarities: Common,
Uncommon, Rare, Epic, Legendary. Effects include attack %, attack speed, crit, crit damage, max HP,
defence, regen, lifesteal, shields, area size, extra projectiles, boss/elite damage, execute thresholds,
coin gain and heal-on-kill.

Rarity weighting rises with encounter depth. Cards respect stack caps. Character cards appear only for
the active heroine. When both halves of an evolution pair are owned, one evolution is guaranteed in
the next offer.

Evolutions:

| Pair | Evolution |
| --- | --- |
| Celestial Edge + Astral Resonance | Celestial Excalibur |
| Burning Blades + Explosive Ember | Phoenix Inferno |
| Moonlight Barrier + Healing Moon | Lunar Sanctuary |
| Eternal Blossom + Petal Storm | Eternal Spring |
| Crimson Precision + Phantom Blade | Crimson Phantom |
| Frostbite + Frozen Lance | Absolute Zero |

Evolved cards are flagged in the offer and unlock an achievement.

## Permanent progression

Astral Coins are earned from encounters, events and bosses, and from achievements. They buy:

- **Star Vitality** — +6% max HP per level (8 levels).
- **Celestial Might** — +4% attack (8).
- **Petal Haste** — +3% attack speed (6).
- **Starlit Insight** — +2% crit chance (5).
- **Prosperity** — +10% coins (5).

Heroine unlocks: Akari 300, Shiori 450, Miyu 600, Rin 750, Airi 900. World unlocks as listed above.

Lifetime stats and achievements persist. The save format is one versioned localStorage object; no
account or cloud sync exists.

## Difficulty and pacing

- Between encounters the heroine heals 20% of max HP; events also open an upgrade.
- Boss HP is multiplied by 0.42 and damage by 0.88 relative to the authored boss line, because boss
  stats are peaks rather than trash scaling.
- Headless auto-runs with first-card picks (a deliberately naive player) produce a mix of victories
  and close losses. In the last recorded sweep, five of six heroines cleared Blossom Meadow; Akari
  was defeated at 8/10 encounters. This is the current balance baseline, not a claim of final tuning.
- A full run takes roughly 1.5–6 simulated minutes depending on heroine and build; results show the
  simulated duration.

## Interface and input

- Portrait-first layout; landscape/desktop centers the arena in a shell.
- Touch: all interactive controls are native buttons with minimum 44 px targets; menus scroll when
  needed. Combat controls are only pause and speed.
- Mouse: all screens work by click; keyboard `Esc`/`P` pause, `T` speed.
- Battle HUD: heroine portrait/name/HP, coins, encounter number/title/progress, build chips, speed,
  pause and boss bar when present.
- Upgrade screen: three cards with rarity, category glyph, name, numeric effect and description.
- Results: encounters cleared, enemies, guardians, damage dealt/taken, time, coins, build,
  achievements, retry and return.

## Out of scope for this build

- Manual combat controls or movement.
- Additional adds during boss fights.
- Cloud saves, accounts, leaderboards, multiplayer.
- Store publication or platform approval claims.
