/**
 * Skeletal animation for the heroines.
 *
 * A clip is a list of keyframes over a shared pose rig plus timed gameplay events. The simulation
 * advances the clip on the simulated clock and resolves every event (damage, projectile spawn,
 * buff, heal…) exactly when it fires, so visuals and combat can never drift apart at 1x or 2x.
 */

import type { AbilityKind, HeroineDef, WeaponKind } from '../game/types';
import type { SfxName } from '../audio/sfx';

export interface Pose {
  /** Vertical bob in pixels (negative is up). */
  bob: number;
  /** Torso lean, radians. Positive leans toward the opponent. */
  lean: number;
  /** Knee bend / lowered centre of mass, 0..1. */
  crouch: number;
  headTilt: number;
  headNod: number;
  /** Limb angles in radians; 0 hangs straight down, positive swings toward the opponent. */
  armFront: number;
  elbowFront: number;
  armBack: number;
  elbowBack: number;
  legFront: number;
  kneeFront: number;
  legBack: number;
  kneeBack: number;
  hairSway: number;
  skirtSway: number;
  weaponAngle: number;
  weaponSpin: number;
  scaleX: number;
  scaleY: number;
  /** Elemental aura strength, 0..1. */
  glow: number;
  alpha: number;
}

export const BASE_POSE: Pose = {
  bob: 0,
  lean: 0.04,
  crouch: 0,
  headTilt: 0,
  headNod: 0,
  armFront: 0.26,
  elbowFront: 0.2,
  armBack: -0.2,
  elbowBack: -0.16,
  legFront: 0.06,
  kneeFront: 0.05,
  legBack: -0.08,
  kneeBack: 0.08,
  hairSway: 0,
  skirtSway: 0,
  weaponAngle: 0,
  weaponSpin: 0,
  scaleX: 1,
  scaleY: 1,
  glow: 0,
  alpha: 1,
};

export type Ease = 'linear' | 'easeIn' | 'easeOut' | 'smooth';
export type ClipEventType =
  | 'impact'
  | 'projectile'
  | 'rain'
  | 'aoe'
  | 'buff'
  | 'heal'
  | 'shield'
  | 'dash'
  | 'sfx'
  | 'ultimate'
  | 'footstep';

export interface ClipEvent {
  at: number;
  type: ClipEventType;
  sfx?: SfxName;
}

interface PoseKey {
  at: number;
  pose: Partial<Pose>;
  ease: Ease;
}

interface ResolvedFrame {
  at: number;
  pose: Pose;
  ease: Ease;
}

export interface AnimClip {
  id: string;
  duration: number;
  loop: boolean;
  keys: ResolvedFrame[];
  events: ClipEvent[];
}

export interface ClipSet {
  clips: Record<string, AnimClip>;
  idle: AnimClip;
  attack: AnimClip;
  hurt: AnimClip;
  victory: AnimClip;
  defeat: AnimClip;
}

const K = (at: number, pose: Partial<Pose>, ease: Ease = 'smooth'): PoseKey => ({ at, pose, ease });

/** Merge a partial key onto the running pose so sampling can interpolate whole poses. */
function resolveKeys(duration: number, keys: PoseKey[]): ResolvedFrame[] {
  const sorted = [...keys].sort((a, b) => a.at - b.at);
  const frames: ResolvedFrame[] = [];
  let running: Pose = { ...BASE_POSE };
  for (const key of sorted) {
    running = { ...running, ...key.pose };
    frames.push({ at: Math.min(duration, key.at), pose: { ...running }, ease: key.ease });
  }
  if (frames.length === 0) frames.push({ at: 0, pose: { ...BASE_POSE }, ease: 'linear' });
  const first = frames[0]!;
  if (first.at > 0) frames.unshift({ at: 0, pose: { ...BASE_POSE }, ease: 'linear' });
  const last = frames[frames.length - 1]!;
  if (last.at < duration) frames.push({ at: duration, pose: { ...last.pose }, ease: 'linear' });
  return frames;
}

function makeClip(
  id: string,
  duration: number,
  loop: boolean,
  keys: PoseKey[],
  events: ClipEvent[] = [],
): AnimClip {
  return { id, duration, loop, keys: resolveKeys(duration, keys), events: [...events].sort((a, b) => a.at - b.at) };
}

const ease = (t: number, kind: Ease): number => {
  switch (kind) {
    case 'linear':
      return t;
    case 'easeIn':
      return t * t;
    case 'easeOut':
      return 1 - (1 - t) * (1 - t);
    default:
      return t * t * (3 - 2 * t);
  }
};

const CHANNELS: Array<keyof Pose> = [
  'bob', 'lean', 'crouch', 'headTilt', 'headNod',
  'armFront', 'elbowFront', 'armBack', 'elbowBack',
  'legFront', 'kneeFront', 'legBack', 'kneeBack',
  'hairSway', 'skirtSway', 'weaponAngle', 'weaponSpin',
  'scaleX', 'scaleY', 'glow', 'alpha',
];

/** Sample one clip at a simulated time (looping when the clip says so). */
export function samplePose(clip: AnimClip, time: number): Pose {
  const t = clip.loop ? ((time % clip.duration) + clip.duration) % clip.duration : Math.min(time, clip.duration);
  const frames = clip.keys;
  if (frames.length === 1) return { ...frames[0]!.pose };

  let a = frames[0]!;
  let b = frames[frames.length - 1]!;
  for (let i = 0; i < frames.length - 1; i += 1) {
    const current = frames[i]!;
    const next = frames[i + 1]!;
    if (t >= current.at && t <= next.at) {
      a = current;
      b = next;
      break;
    }
  }
  if (b === a) return { ...a.pose };
  const span = Math.max(1e-6, b.at - a.at);
  const local = ease(Math.min(1, Math.max(0, (t - a.at) / span)), b.ease);
  const out = {} as Pose;
  for (const channel of CHANNELS) {
    const from = a.pose[channel];
    const to = b.pose[channel];
    (out[channel] as number) = from + (to - from) * local;
  }
  return out;
}

function mixPose(a: Pose, b: Pose, t: number): Pose {
  const out = {} as Pose;
  for (const channel of CHANNELS) (out[channel] as number) = a[channel] + (b[channel] - a[channel]) * t;
  return out;
}

/** Crossfade length in simulated seconds. Kept short so reactions stay snappy. */
const BLEND = 0.09;

/**
 * Stateful animator for one heroine. Only one clip can be active, which makes incompatible
 * poses impossible; callers decide when an action may interrupt the current one.
 */
export class Animator {
  time = 0;
  finished = false;
  private clip: AnimClip;
  private fromPose: Pose;
  private blendTime = BLEND;
  private lastPose: Pose;

  constructor(
    readonly set: ClipSet,
    initial = 'idle',
  ) {
    this.clip = set.clips[initial] ?? set.idle;
    this.fromPose = samplePose(this.clip, 0);
    this.lastPose = this.fromPose;
  }

  get current(): AnimClip {
    return this.clip;
  }

  get progress(): number {
    return this.clip.duration > 0 ? Math.min(1, this.time / this.clip.duration) : 1;
  }

  play(id: string, restart = false): void {
    const next = this.set.clips[id];
    if (!next) return;
    if (this.clip === next && !restart) return;
    this.fromPose = this.lastPose;
    this.clip = next;
    this.time = 0;
    this.finished = false;
    this.blendTime = 0;
  }

  /** Advance the clip and report events crossed this step. */
  update(dt: number): { pose: Pose; events: ClipEvent[]; finished: boolean } {
    const prev = this.time;
    const events: ClipEvent[] = [];

    if (this.clip.loop) {
      this.time += dt;
      const wrapped = this.time;
      const duration = this.clip.duration;
      for (const event of this.clip.events) {
        const crosses =
          (prev <= event.at && wrapped >= event.at) ||
          (wrapped >= duration && event.at <= wrapped - duration);
        if (crosses) events.push(event);
      }
      if (this.time > duration * 64) this.time %= duration;
    } else {
      this.time = Math.min(this.clip.duration, this.time + dt);
      for (const event of this.clip.events) {
        if (event.at > prev && event.at <= this.time) events.push(event);
      }
      if (this.time >= this.clip.duration) this.finished = true;
    }

    const target = samplePose(this.clip, this.time);
    this.blendTime = Math.min(BLEND, this.blendTime + dt);
    const blend = BLEND <= 0 ? 1 : ease(this.blendTime / BLEND, 'smooth');
    this.lastPose = blend >= 1 ? target : mixPose(this.fromPose, target, blend);
    return { pose: this.lastPose, events, finished: this.finished };
  }
}

// ---------------------------------------------------------------------------------------------
// Clip construction
// ---------------------------------------------------------------------------------------------

const castEvents: Record<AbilityKind, ClipEvent[]> = {
  slashArc: [{ at: 0.36, type: 'impact', sfx: 'slash' }],
  wave: [{ at: 0.44, type: 'projectile', sfx: 'slash' }],
  rain: [{ at: 0.55, type: 'rain', sfx: 'buff' }],
  dash: [{ at: 0.06, type: 'dash', sfx: 'buff' }],
  buff: [{ at: 0.52, type: 'buff', sfx: 'buff' }],
  projectile: [{ at: 0.42, type: 'projectile', sfx: 'slash' }],
  aoe: [{ at: 0.5, type: 'aoe', sfx: 'crit' }],
  heal: [{ at: 0.6, type: 'heal', sfx: 'heal' }],
  shield: [{ at: 0.44, type: 'shield', sfx: 'buff' }],
};

function castClip(id: string, kind: AbilityKind): AnimClip {
  const events = castEvents[kind].map((event) => ({ ...event }));
  const gather: PoseKey[] = [
    K(0, { armFront: 0.1, elbowFront: 0.5, armBack: -0.1, glow: 0.15, lean: -0.06 }),
    K(0.3, { armFront: 1.5, elbowFront: 0.35, armBack: 0.35, elbowBack: 0.4, lean: -0.02, glow: 0.7, crouch: 0.08 }),
    K(0.58, { armFront: 1.2, elbowFront: 0.2, lean: 0.22, crouch: 0.16, glow: 1, weaponAngle: -0.4 }),
    K(0.78, { armFront: 0.5, elbowFront: 0.1, lean: 0.1, glow: 0.35, weaponAngle: 0.1 }),
    K(1, { ...BASE_POSE, armFront: BASE_POSE.armFront }),
  ];
  const release: PoseKey[] = [
    K(0, { armBack: -0.4, elbowBack: 0.6, lean: -0.16, crouch: 0.18, glow: 0.2 }),
    K(0.3, { armFront: 0.5, elbowFront: 0.9, lean: -0.2, crouch: 0.26, glow: 0.8, weaponAngle: -0.9 }),
    K(0.52, { armFront: 1.62, elbowFront: 0.05, armBack: 0.2, lean: 0.28, crouch: 0.05, glow: 1, weaponAngle: 0.9 }),
    K(0.72, { armFront: 1.1, elbowFront: 0.3, lean: 0.16, glow: 0.4 }),
    K(1, { ...BASE_POSE, armFront: BASE_POSE.armFront }),
  ];
  const pose =
    kind === 'buff' || kind === 'heal' || kind === 'shield' || kind === 'rain'
      ? gather
      : kind === 'dash'
        ? [
            K(0, { crouch: 0.3, lean: -0.1 }),
            K(0.2, { crouch: 0.05, lean: 0.35, scaleX: 1.1, alpha: 0.5 }),
            K(0.6, { lean: 0.1, scaleX: 1, alpha: 1, crouch: 0.12 }),
            K(1, { ...BASE_POSE }),
          ]
        : release;
  return makeClip(id, kind === 'rain' ? 1.1 : kind === 'buff' ? 1.0 : 0.95, false, pose, events);
}

function idleClip(weapon: WeaponKind, sway: number): AnimClip {
  const rest = weaponRest(weapon);
  return makeClip(
    'idle',
    4.2,
    true,
    [
      K(0, { ...rest, hairSway: 0.02 * sway, bob: 0, lean: 0.03 }),
      K(1.1, { bob: -3.2, headTilt: 0.015, hairSway: -0.03 * sway, skirtSway: 0.02, lean: 0.045 }),
      K(2.2, { bob: 0.6, headTilt: 0, hairSway: 0.04 * sway, skirtSway: -0.01, lean: 0.03 }),
      K(3.2, { bob: -1.8, headTilt: -0.012, hairSway: -0.02 * sway, skirtSway: 0.015, lean: 0.04 }),
      K(4.2, { ...rest, hairSway: 0.02 * sway, bob: 0, headTilt: 0, lean: 0.03 }),
    ],
  );
}

function weaponRest(weapon: WeaponKind): Partial<Pose> {
  switch (weapon) {
    case 'katana':
      return { armFront: 0.16, elbowFront: 0.35, armBack: -0.14, elbowBack: 0.2, weaponAngle: -0.5 };
    case 'twinBlades':
      return { armFront: 0.42, elbowFront: 0.55, armBack: -0.35, elbowBack: 0.5, weaponAngle: -0.1 };
    case 'longsword':
      return { armFront: 0.18, elbowFront: 0.5, armBack: -0.22, elbowBack: 0.24, weaponAngle: -0.25, crouch: 0.04 };
    case 'petalBlades':
      return { armFront: 0.5, elbowFront: 0.7, armBack: -0.3, elbowBack: 0.4, weaponAngle: 0.15 };
    case 'rapier':
      return { armFront: 0.05, elbowFront: 0.15, armBack: -0.5, elbowBack: 0.1, weaponAngle: -0.95, lean: 0.06 };
    case 'staff':
      return { armFront: 0.35, elbowFront: 0.75, armBack: -0.25, elbowBack: 0.3, weaponAngle: 0.2 };
    default:
      return {};
  }
}

function attackClip(weapon: WeaponKind, variant: number): AnimClip {
  const id = variant === 0 ? 'attack' : `attack${variant + 1}`;
  const flip = variant % 2 === 1;
  const events: ClipEvent[] = [{ at: 0.22, type: 'impact', sfx: 'slash' }];

  switch (weapon) {
    case 'katana':
      return makeClip(id, 0.52, false, [
        K(0, { ...BASE_POSE, lean: 0.02 }),
        K(0.13, { armFront: -0.45, elbowFront: 0.7, armBack: -0.55, lean: -0.16, crouch: 0.09, weaponAngle: -1.1, glow: 0.2 }),
        K(0.24, { armFront: 1.55, elbowFront: 0.08, armBack: 0.45, lean: 0.34, crouch: 0.02, weaponAngle: 1.25, glow: 0.75 }),
        K(0.36, { armFront: 1.15, elbowFront: 0.3, lean: 0.2, glow: 0.3, weaponAngle: 0.4 }),
        K(0.52, { ...BASE_POSE }),
      ], events);
    case 'twinBlades':
      return makeClip(id, 0.46, false, [
        K(0, { ...BASE_POSE }),
        K(0.1, { armFront: -0.2, armBack: -0.9, lean: -0.13, crouch: 0.12, glow: 0.25 }),
        K(0.19, { armFront: 1.5, elbowFront: 0.1, armBack: 0.2, lean: 0.28, weaponAngle: 1.1, glow: 0.8 }),
        K(0.27, { armFront: 0.7, armBack: 1.35, elbowBack: 0.05, lean: 0.36, weaponAngle: flip ? -1 : 0.9, glow: 0.9 }),
        K(0.36, { armFront: 1.2, armBack: 0.6, lean: 0.18, glow: 0.4 }),
        K(0.46, { ...BASE_POSE }),
      ], [
        { at: 0.19, type: 'impact', sfx: 'slash' },
        { at: 0.28, type: 'impact', sfx: 'slash' },
      ]);
    case 'longsword':
      return makeClip(id, 0.68, false, [
        K(0, { ...BASE_POSE }),
        K(0.18, { armFront: -0.8, elbowFront: 0.35, armBack: -0.9, lean: -0.22, crouch: 0.16, weaponAngle: -1.5, glow: 0.25 }),
        K(0.36, { armFront: 1.7, elbowFront: 0.02, armBack: 0.7, lean: 0.38, crouch: 0.04, weaponAngle: 1.5, glow: 0.85 }),
        K(0.5, { armFront: 1.2, lean: 0.24, glow: 0.35, weaponAngle: 0.5 }),
        K(0.68, { ...BASE_POSE }),
      ], [{ at: 0.33, type: 'impact', sfx: 'slash' }]);
    case 'petalBlades':
      return makeClip(id, 0.56, false, [
        K(0, { ...BASE_POSE }),
        K(0.12, { lean: -0.1, armFront: 0.9, armBack: 0.7, crouch: 0.08, glow: 0.3 }),
        K(0.24, { lean: 0.3, armFront: 1.4, armBack: 1.1, weaponSpin: 2.2, glow: 0.8 }),
        K(0.36, { lean: 0.34, armFront: 1.0, armBack: 0.9, weaponSpin: 4.4, glow: 0.9 }),
        K(0.44, { lean: 0.18, armFront: 0.6, armBack: 0.5, weaponSpin: 5.2, glow: 0.4 }),
        K(0.56, { ...BASE_POSE }),
      ], [{ at: 0.22, type: 'impact', sfx: 'slash' }, { at: 0.34, type: 'impact', sfx: 'slash' }]);
    case 'rapier':
      return makeClip(id, 0.4, false, [
        K(0, { ...BASE_POSE }),
        K(0.09, { armFront: -0.4, elbowFront: 0.9, lean: -0.2, crouch: 0.12, weaponAngle: -1.2, glow: 0.25 }),
        K(0.18, { armFront: 1.75, elbowFront: 0.0, lean: 0.42, crouch: 0.02, weaponAngle: 1.58, glow: 0.8 }),
        K(0.28, { armFront: 1.5, lean: 0.3, glow: 0.35 }),
        K(0.4, { ...BASE_POSE }),
      ], [{ at: 0.17, type: 'impact', sfx: 'slash' }]);
    case 'staff':
      return makeClip(id, 0.62, false, [
        K(0, { ...BASE_POSE }),
        K(0.14, { armFront: 0.9, elbowFront: 0.6, armBack: 0.4, lean: -0.1, glow: 0.4, weaponAngle: -0.4 }),
        K(0.3, { armFront: 1.45, elbowFront: 0.1, lean: 0.24, glow: 0.95, weaponAngle: 0.4 }),
        K(0.44, { armFront: 0.8, elbowFront: 0.5, lean: 0.1, glow: 0.4 }),
        K(0.62, { ...BASE_POSE }),
      ], [{ at: 0.3, type: 'projectile', sfx: 'slash' }]);
    default:
      return makeClip(id, 0.5, false, [K(0, {}), K(0.2, { lean: 0.3 }), K(0.5, {})], events);
  }
}

function victoryClip(weapon: WeaponKind, stance: number): AnimClip {
  const flourish = stance > 0.5 ? 1 : -1;
  switch (weapon) {
    case 'katana':
      return makeClip('victory', 2.8, false, [
        K(0, { ...BASE_POSE }),
        K(0.25, { armFront: 1.3, elbowFront: 0.15, lean: 0.18, glow: 0.5, weaponAngle: 1.2 }),
        K(0.6, { armFront: 0.15, elbowFront: 0.5, armBack: -0.35, elbowBack: 0.5, lean: 0.04, glow: 0.15, weaponAngle: -0.9 }),
        K(1.0, { armFront: 0.08, elbowFront: 0.35, headTilt: 0.05, glow: 0.05 }),
        K(2.2, { bob: -2, headTilt: -0.02, hairSway: 0.03 }),
        K(2.8, { ...BASE_POSE, headTilt: 0.02 }),
      ]);
    case 'twinBlades':
      return makeClip('victory', 2.6, false, [
        K(0, { ...BASE_POSE }),
        K(0.25, { armFront: 1.9, armBack: 1.5, lean: 0.1, glow: 0.8, weaponSpin: 3 }),
        K(0.5, { armFront: 0.4, armBack: -0.2, lean: 0.2, headTilt: 0.08, glow: 0.4, weaponSpin: 5 }),
        K(0.9, { armFront: 0.3, armBack: -0.1, lean: 0.08, headTilt: -0.06, glow: 0.1 }),
        K(2.6, { ...BASE_POSE, headTilt: 0.03 }),
      ]);
    case 'longsword':
      return makeClip('victory', 3.0, false, [
        K(0, { ...BASE_POSE }),
        K(0.4, { armFront: 1.4, elbowFront: 0.1, lean: 0.12, glow: 0.4, weaponAngle: 1.3 }),
        K(0.9, { armFront: 0.05, elbowFront: 0.25, lean: 0.02, glow: 0.15, weaponAngle: -1.4 }),
        K(1.4, { headTilt: 0.08, bob: -2, glow: 0.05 }),
        K(3.0, { ...BASE_POSE, headTilt: 0.02 }),
      ]);
    case 'petalBlades':
      return makeClip('victory', 2.7, false, [
        K(0, { ...BASE_POSE }),
        K(0.35, { armFront: 1.2, armBack: 0.9, weaponSpin: 2, lean: 0.15, glow: 0.7 }),
        K(0.7, { armFront: 0.5, armBack: 0.3, weaponSpin: 4, headTilt: 0.1, glow: 0.4 }),
        K(1.1, { armFront: 0.4, armBack: 0.2, headTilt: 0.06, glow: 0.1 }),
        K(2.7, { ...BASE_POSE }),
      ]);
    case 'rapier':
      return makeClip('victory', 2.5, false, [
        K(0, { ...BASE_POSE }),
        K(0.22, { armFront: 1.5, elbowFront: 0.05, lean: 0.24, glow: 0.5, weaponAngle: 1.3 }),
        K(0.45, { armFront: 0.9, elbowFront: 0.4, lean: 0.1, headTilt: 0.06, glow: 0.2 }),
        K(0.8, { armFront: 0.6, elbowFront: 0.7, headTilt: 0.1, glow: 0.1, weaponAngle: 0.6 * flourish }),
        K(2.5, { ...BASE_POSE }),
      ]);
    case 'staff':
      return makeClip('victory', 3.0, false, [
        K(0, { ...BASE_POSE }),
        K(0.3, { armFront: 1.6, elbowFront: 0.2, lean: -0.05, glow: 0.8, weaponAngle: 0.9 }),
        K(0.8, { armFront: 1.5, elbowFront: 0.3, headTilt: -0.05, glow: 0.5, weaponAngle: 1.0 }),
        K(1.4, { armFront: 0.7, elbowFront: 0.6, glow: 0.2, headTilt: 0.05 }),
        K(3.0, { ...BASE_POSE }),
      ]);
    default:
      return makeClip('victory', 2.5, false, [K(0, {}), K(1, {}), K(2.5, {})]);
  }
}

function defeatClip(weapon: WeaponKind): AnimClip {
  return makeClip('defeat', 2.2, false, [
    K(0, { ...BASE_POSE }),
    K(0.25, { lean: -0.35, headNod: 0.3, crouch: 0.2, armFront: 0.1, armBack: -0.1 }),
    K(0.9, { lean: -0.9, headNod: 0.7, crouch: 0.55, bob: 34, alpha: 0.95, weaponAngle: -1.4 }),
    K(1.6, { lean: -1.1, headNod: 0.85, crouch: 0.7, bob: 52, alpha: 0.75 }),
    K(2.2, { lean: -1.1, headNod: 0.9, crouch: 0.72, bob: 56, alpha: 0.6, weaponAngle: weapon === 'staff' ? -0.6 : -1.5 }),
  ]);
}

export function buildClipSet(def: HeroineDef): ClipSet {
  const sway = def.sway;
  const clips: Record<string, AnimClip> = {};

  const idle = idleClip(def.weapon, sway);
  clips.idle = idle;

  clips.stepIn = makeClip('stepIn', 0.3, false, [
    K(0, { ...BASE_POSE }),
    K(0.12, { lean: 0.16, crouch: 0.1, legFront: 0.35, kneeFront: 0.25, legBack: -0.35, bob: -3 }),
    K(0.3, { ...BASE_POSE, bob: 0.5 }),
  ], [{ at: 0.12, type: 'footstep' }]);
  clips.stepOut = makeClip('stepOut', 0.3, false, [
    K(0, { ...BASE_POSE }),
    K(0.14, { lean: -0.08, legBack: 0.3, legFront: -0.25, kneeBack: 0.3, bob: -2 }),
    K(0.3, { ...BASE_POSE }),
  ], [{ at: 0.14, type: 'footstep' }]);
  clips.dash = makeClip('dash', 0.36, false, [
    K(0, { ...BASE_POSE, crouch: 0.25 }),
    K(0.12, { lean: 0.3, crouch: 0.05, scaleX: 1.08, glow: 0.5 }),
    K(0.26, { lean: 0.1, crouch: 0.12, glow: 0.2 }),
    K(0.36, { ...BASE_POSE }),
  ], [{ at: 0.06, type: 'dash', sfx: 'buff' }]);
  clips.hurt = makeClip('hurt', 0.34, false, [
    K(0, { ...BASE_POSE }),
    K(0.08, { lean: -0.28, headTilt: -0.12, crouch: 0.16, armFront: -0.2, armBack: -0.4, bob: 2 }),
    K(0.22, { lean: -0.12, headTilt: 0.04, crouch: 0.08 }),
    K(0.34, { ...BASE_POSE }),
  ]);
  clips.heal = makeClip('heal', 1.1, false, [
    K(0, { ...BASE_POSE }),
    K(0.3, { armFront: 1.5, elbowFront: 0.4, armBack: 1.2, elbowBack: 0.4, headNod: 0.12, glow: 0.7, bob: -2 }),
    K(0.75, { armFront: 1.2, elbowFront: 0.5, glow: 0.5, bob: -4, headTilt: 0.05 }),
    K(1.1, { ...BASE_POSE }),
  ], [{ at: 0.45, type: 'heal', sfx: 'heal' }]);
  clips.guard = makeClip('guard', 1.2, false, [
    K(0, { ...BASE_POSE }),
    K(0.18, { armFront: 1.1, elbowFront: 0.9, armBack: 0.9, elbowBack: 0.9, crouch: 0.16, lean: -0.08, glow: 0.5 }),
    K(0.9, { armFront: 1.0, elbowFront: 0.95, armBack: 0.8, crouch: 0.14, glow: 0.35 }),
    K(1.2, { ...BASE_POSE }),
  ], [{ at: 0.2, type: 'shield', sfx: 'buff' }]);
  clips.victory = victoryClip(def.weapon, def.stance);
  clips.defeat = defeatClip(def.weapon);
  clips.spawn = makeClip('spawn', 0.8, false, [
    K(0, { ...BASE_POSE, alpha: 0, bob: 26, glow: 1, crouch: 0.3 }),
    K(0.4, { ...BASE_POSE, alpha: 0.8, bob: 4, glow: 0.6, crouch: 0.1 }),
    K(0.8, { ...BASE_POSE }),
  ]);

  clips.attack = attackClip(def.weapon, 0);
  clips.attack2 = attackClip(def.weapon, 1);
  clips.attack3 = attackClip(def.weapon, 2);

  def.abilities.forEach((ability, index) => {
    clips[`cast${index}`] = castClip(`cast${index}`, ability.kind);
  });

  const ultimateIndex = def.abilities.findIndex((ability) => ability.ultimate);
  if (ultimateIndex >= 0) {
    const events: ClipEvent[] = [
      { at: 0.12, type: 'ultimate', sfx: 'boss' },
      { at: 1.12, type: 'impact', sfx: 'crit' },
      { at: 1.12, type: 'aoe', sfx: 'crit' },
    ];
    clips.ultimate = makeClip('ultimate', 1.9, false, [
      K(0, { ...BASE_POSE, crouch: 0.2, lean: -0.1 }),
      K(0.35, { armFront: -0.9, armBack: -1.1, elbowFront: 0.5, headNod: 0.1, crouch: 0.36, lean: -0.3, glow: 0.6, bob: 4 }),
      K(0.75, { armFront: 2.3, armBack: 2.0, elbowFront: 0.05, lean: -0.1, crouch: 0.1, glow: 1, bob: -8, headNod: -0.1 }),
      K(1.12, { armFront: 1.6, armBack: 1.2, lean: 0.4, crouch: 0.02, glow: 1, weaponAngle: 1.3 }),
      K(1.45, { armFront: 1.2, armBack: 0.7, lean: 0.2, glow: 0.45, weaponAngle: 0.6 }),
      K(1.9, { ...BASE_POSE }),
    ], events);
    clips[`cast${ultimateIndex}`] = clips.ultimate;
  }

  return {
    clips,
    idle,
    attack: clips.attack,
    hurt: clips.hurt,
    victory: clips.victory,
    defeat: clips.defeat,
  };
}
