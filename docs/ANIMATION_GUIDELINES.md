# Animation guidelines

The heroine animation system is a **procedural skeletal rig with keyframed pose clips and timed
gameplay events**. It is original code-driven animation, not sprite sheets and not painted production
animation.

## 1. Non-negotiables

- The heroine is never a static image. Idle breathing, blinking, hair sway and weapon rest run
  continuously.
- Every attack has anticipation, execution, impact and recovery.
- Each ability has its own clip and gesture; one generic swing for all five abilities is a defect.
- Damage, projectiles, healing, shields and buffs resolve from clip events at their timestamp, never
  from arbitrary `setTimeout` calls.
- The heroine may lunge visually but never leaves her simulation anchor; the renderer returns her to
  the anchor as the clip ends.
- Ultimates cannot be interrupted; committed basics and casts keep their timing when she is hit.
- 1× and 2× must keep animation and gameplay synchronized. Both consume the same simulated delta.

## 2. Rig model

`src/game/anim.ts` defines the pose:

| Channel | Meaning |
| --- | --- |
| `bob` | Vertical body offset |
| `lean` | Torso rotation toward/away from target |
| `crouch` | Knee bend and lowered centre |
| `headTilt`, `headNod` | Face/head accent |
| `armFront`, `elbowFront` | Weapon arm |
| `armBack`, `elbowBack` | Off arm |
| `legFront`, `kneeFront`, `legBack`, `kneeBack` | Stance |
| `hairSway`, `skirtSway` | Secondary motion |
| `weaponAngle`, `weaponSpin` | Weapon orientation |
| `scaleX`, `scaleY` | Impact squash and breathing |
| `glow` | Elemental aura |
| `alpha` | Hit/defeat fade |

The renderer (`src/render/hero.ts`) draws in this order: back hair, legs/boots, back arm, skirt/coat
tails, torso, sash/pauldron/neck, head + face, front hair, front sleeve + forearm + wrist trim,
weapon(s), aura/impact overlays. Proportions are authored around a 292 px reference height:
head radius 0.076 H, shoulder width via the torso path, hip at 0.47 H, katana about 0.35 H.

## 3. Clip inventory

`buildClipSet(def)` creates at least:

| Clip | Loop | Purpose |
| --- | --- | --- |
| `idle` | yes | Breathing, blink window, hair/skirt drift |
| `attack` / `attack2` / `attack3` | no | Basic combo, anticipation → lunge → impact → recovery |
| `step` | no | Forward/back footwork accent |
| `cast1` / `cast2` | no | Offensive magic gesture and projectile release |
| `area` | no | Area pulse / spin |
| `buff` | no | Self-empowerment |
| `heal` | no | Healing gesture |
| `shield` | no | Barrier cast |
| `hurt` | no | Flinch and recovery |
| `ultimate` | no | Longer cinematic action |
| `victory` | yes/no hold | Signature finish |
| `defeat` | no | Non-graphic collapse and fade |

Ability → clip mapping is per heroine, not global; a staff heroine casts where a sword heroine
slashes.

## 4. Event timing

Events live on clips and are consumed by `World.advanceHeroAnimation`:

| Event | Gameplay effect |
| --- | --- |
| `impact` | Single-target hit at that frame |
| `projectile` | Spawn projectile(s) |
| `rain` | Queue delayed area impacts |
| `aoe` | Area damage around the heroine/targets |
| `buff` | Attack/attack-speed/damage buff |
| `heal` | Restore health |
| `shield` | Add barrier + brief invulnerability |
| `dash` | Reposition/evade effect |
| `ultimate` | Cinematic emphasis / ultimate lock release |
| `sfx` | Sound cue |
| `footstep` | Footwork accent |

Authoring rules:

1. Anticipation ≥ 0.12 s before an impact.
2. Projectile spawn *before* its travel frames; impact when it reaches a target.
3. Recovery ≥ 0.15 s after the last damage event.
4. Never place two heavy impacts on the same frame for one clip unless the ability is intentionally a
   multi-hit.
5. Clip duration and event list are data; tests can assert impact timing without a browser.

## 5. Character identity

| Heroine | Motion signature | Element FX |
| --- | --- | --- |
| Yuzuki | Composed draw, precise horizontal cut, reserved follow-through | Star blue-white |
| Akari | Fast alternating twin strikes, bouncy stance, big finish | Ember orange/gold |
| Shiori | Controlled longsword arcs, barrier gestures, calm recovery | Moon silver-blue |
| Miyu | Flowing spin, petal trails, soft wrist work | Blossom pink/green |
| Rin | Fencer footwork, quick thrusts, confident flourish | Crimson shadow |
| Airi | Staff point-work, floating crystal, controlled casts | Ice cyan |

The rig is shared, so identity must come from palette, hair/outfit silhouette, weapon shape, stance
values (`sway`, `stance`) and clip selection. A future art pass should give each heroine a separate
skeleton or hand-painted frames where the budget allows.

## 6. Enemies and bosses

- Normal enemies: idle bob, approach, telegraph, attack lunge, recover, hit flash, freeze tint, fade/
  sink death.
- Bosses: larger procedural bodies, idle sway, telegraph body pull-back, strike lunge, phase change
  burst, defeat fade.
- A boss is not a scaled normal enemy: queen, dragon, fallen guardian, empress, celestial, thorn
  guardian, crystal warden, ember beast and moonlit sentinel each have their own silhouette painter.

## 7. Speed and pause

- `SimulationClock` delta advances clips, events, cooldowns and movement together.
- Pausing the clock stops clip advance and event resolution; the renderer keeps drawing the last pose.
- Avoid real-time-driven damage or ability timers. Presentation (background petals, UI transitions)
  may use real time.

## 8. QA checklist

- [ ] Idle never looks frozen for more than a blink interval.
- [ ] Basic attack anticipation, impact and recovery are visible at 1× and 2×.
- [ ] Every ability uses a different clip and fires its event at the right pose.
- [ ] Getting hit between attacks flinches her; getting hit during an attack does not cancel damage.
- [ ] Ultimate plays fully and cannot be interrupted.
- [ ] Lunge returns to the anchor.
- [ ] Health bar, damage numbers and effects align with the strike.
- [ ] Victory/defeat play before results.
- [ ] Boss telegraph is readable before damage.
- [ ] On portrait, the heroine and boss remain fully visible, including weapons.

## 9. Honest status

The system meets the prototype bar: every listed state exists and is event-synchronized. It does not
meet a production anime bar. Shapes are vector primitives, facial expression is limited, and the six
heroines share one skeleton. Treat the current visuals as an original functional prototype, not final
character animation.
