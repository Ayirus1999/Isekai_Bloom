import { buildClipSet, samplePose, type Pose } from '../game/anim';
import { HERO_HEIGHT } from '../game/constants';
import type { HeroPhase, HeroineDef, WeaponKind } from '../game/types';

type Mood = 'calm' | 'attack' | 'hurt' | 'victory' | 'defeat';

export interface HeroDrawOptions {
  height?: number;
  facing?: 1 | -1;
  time?: number;
  phase?: HeroPhase;
  hitFlash?: number;
  /** 0..1 elemental aura override (the pose's glow is used when omitted). */
  aura?: number;
}

export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const value = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const int = Number.parseInt(value, 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function moodFor(phase: HeroPhase | undefined): Mood {
  switch (phase) {
    case 'attacking':
    case 'casting':
    case 'ultimate':
      return 'attack';
    case 'hurt':
      return 'hurt';
    case 'victory':
      return 'victory';
    case 'defeated':
      return 'defeat';
    default:
      return 'calm';
  }
}

function limb(
  ctx: CanvasRenderingContext2D,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  width: number,
  color: string,
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.stroke();
}

/** Tapered anime silhouette for a torso/bodice. */
function torsoPath(ctx: CanvasRenderingContext2D, H: number, shoulderY: number, hipY: number): void {
  ctx.beginPath();
  ctx.moveTo(-H * 0.072, hipY);
  ctx.bezierCurveTo(-H * 0.096, hipY * 0.6, -H * 0.09, shoulderY * 0.55, -H * 0.068, shoulderY);
  ctx.quadraticCurveTo(0, shoulderY - H * 0.024, H * 0.072, shoulderY);
  ctx.bezierCurveTo(H * 0.096, shoulderY * 0.52, H * 0.102, hipY * 0.55, H * 0.078, hipY);
  ctx.quadraticCurveTo(0, hipY + H * 0.018, -H * 0.072, hipY);
  ctx.closePath();
}

function drawSkirt(ctx: CanvasRenderingContext2D, def: HeroineDef, H: number, pose: Pose, time: number): void {
  const sway = pose.skirtSway * H * 0.13 + Math.sin(time * 1.4) * H * 0.005;
  const long = def.outfit === 'moonDress' || def.outfit === 'frostDress' || def.outfit === 'crimsonCoat';
  const length = long ? H * 0.245 : H * 0.135;
  const flare = H * (long ? 0.12 : 0.085);
  const y = -H * 0.02;

  const grad = ctx.createLinearGradient(-flare, y, flare, y + length);
  grad.addColorStop(0, def.palette.outfit);
  grad.addColorStop(0.55, def.palette.outfitDark);
  grad.addColorStop(1, def.palette.outfit);

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(-H * 0.062, y);
  ctx.quadraticCurveTo(-flare * 0.8 + sway, y + length * 0.55, -flare + sway, y + length);
  // Layered hem with a soft swing.
  const teeth = long ? 5 : 3;
  for (let i = 1; i <= teeth; i += 1) {
    const t = i / teeth;
    const x = -flare + sway + t * (flare * 2);
    ctx.quadraticCurveTo(x - flare / teeth, y + length + H * 0.018, x, y + length - (i % 2 === 0 ? H * 0.004 : 0));
  }
  ctx.quadraticCurveTo(flare * 0.8 + sway, y + length * 0.55, H * 0.062, y);
  ctx.closePath();
  ctx.fill();

  // Trim
  ctx.strokeStyle = hexToRgba(def.palette.accent, 0.7);
  ctx.lineWidth = H * 0.004;
  ctx.beginPath();
  ctx.moveTo(-flare + sway + H * 0.01, y + length - H * 0.004);
  ctx.quadraticCurveTo(sway, y + length + H * 0.012, flare + sway - H * 0.01, y + length - H * 0.004);
  ctx.stroke();
}

function drawCoatTails(ctx: CanvasRenderingContext2D, def: HeroineDef, H: number, pose: Pose): void {
  const sway = pose.skirtSway * H * 0.09;
  ctx.fillStyle = def.palette.outfitDark;
  ctx.beginPath();
  ctx.moveTo(-H * 0.06, -H * 0.03);
  ctx.quadraticCurveTo(-H * 0.19 + sway, H * 0.1, -H * 0.16 + sway, H * 0.16);
  ctx.quadraticCurveTo(-H * 0.1, H * 0.12, -H * 0.02, H * 0.02);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = hexToRgba(def.palette.outfit, 0.92);
  ctx.beginPath();
  ctx.moveTo(H * 0.055, -H * 0.03);
  ctx.quadraticCurveTo(H * 0.18 + sway, H * 0.09, H * 0.2 + sway, H * 0.18);
  ctx.quadraticCurveTo(H * 0.12, H * 0.14, H * 0.04, H * 0.02);
  ctx.closePath();
  ctx.fill();
}

// --------------------------------------------------------------------------- hair

function drawBackHair(ctx: CanvasRenderingContext2D, def: HeroineDef, H: number, pose: Pose, time: number): void {
  const sway = pose.hairSway * H * 0.06 + Math.sin(time * 1.1 + 0.7) * H * 0.004;
  const c = def.palette.hairDark;
  ctx.fillStyle = c;

  const headY = -H * 0.395;
  const headR = H * 0.076;

  switch (def.hair) {
    case 'silverLong': {
      ctx.beginPath();
      ctx.moveTo(headR * 0.2, headY - headR);
      ctx.bezierCurveTo(H * 0.115, headY + H * 0.02, H * 0.105 + sway, H * 0.12, H * 0.075 + sway, H * 0.29);
      ctx.quadraticCurveTo(H * 0.02, H * 0.34, -H * 0.015 + sway, H * 0.27);
      ctx.bezierCurveTo(-H * 0.09 + sway, H * 0.12, -H * 0.1, headY + H * 0.03, -headR * 0.9, headY - headR * 0.4);
      ctx.closePath();
      ctx.fill();
      // long side lock
      ctx.beginPath();
      ctx.moveTo(headR * 0.72, headY - headR * 0.5);
      ctx.quadraticCurveTo(headR * 1.5, headY + H * 0.08, headR * 1.1 + sway, headY + H * 0.24);
      ctx.quadraticCurveTo(headR * 0.5, headY + H * 0.16, headR * 0.82, headY + H * 0.02);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'coralBob': {
      ctx.beginPath();
      ctx.moveTo(headR, headY - headR * 0.3);
      ctx.quadraticCurveTo(headR * 2.0, headY + H * 0.06, headR * 1.1 + sway, headY + H * 0.12);
      ctx.quadraticCurveTo(headR * 0.3, headY + H * 0.14, -headR * 0.2, headY + H * 0.08);
      ctx.quadraticCurveTo(-headR * 1.7, headY + H * 0.02, -headR * 0.95, headY - headR * 0.7);
      ctx.closePath();
      ctx.fill();
      // high ponytail
      ctx.beginPath();
      ctx.moveTo(-headR * 0.3, headY - headR);
      ctx.quadraticCurveTo(-headR * 1.6 + sway, headY - headR * 1.6, -headR * 2.0 + sway, headY - headR * 0.2);
      ctx.quadraticCurveTo(-headR * 1.2, headY - headR * 0.5, -headR * 0.4, headY - headR * 0.6);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'inkBraid': {
      ctx.beginPath();
      ctx.moveTo(headR * 0.6, headY - headR * 0.4);
      ctx.bezierCurveTo(headR * 2.2, headY + H * 0.08, headR * 1.9 + sway, H * 0.18, headR * 1.2 + sway, H * 0.34);
      ctx.quadraticCurveTo(headR * 0.4, H * 0.24, headR * 0.1, headY + H * 0.06);
      ctx.closePath();
      ctx.fill();
      // thick low braid
      ctx.strokeStyle = def.palette.hair;
      ctx.lineWidth = H * 0.024;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(headR * 1.0, headY + H * 0.06);
      ctx.bezierCurveTo(headR * 2.1 + sway, H * 0.16, headR * 1.4 + sway, H * 0.32, headR * 0.6 + sway, H * 0.4);
      ctx.stroke();
      break;
    }
    case 'peachWaves': {
      ctx.beginPath();
      ctx.moveTo(headR * 0.4, headY - headR);
      ctx.bezierCurveTo(H * 0.145, headY + H * 0.04, H * 0.155 + sway, H * 0.12, H * 0.1 + sway, H * 0.25);
      ctx.bezierCurveTo(H * 0.06, H * 0.3, H * 0.02, H * 0.26, 0, H * 0.18);
      ctx.bezierCurveTo(-H * 0.08 + sway, H * 0.1, -H * 0.12, headY + H * 0.02, -headR, headY - headR * 0.5);
      ctx.closePath();
      ctx.fill();
      // half-up loose tail
      ctx.beginPath();
      ctx.moveTo(-headR * 0.2, headY - headR);
      ctx.quadraticCurveTo(-headR * 1.3 + sway, headY - headR * 0.2, -headR * 0.9 + sway, headY + H * 0.16);
      ctx.quadraticCurveTo(-headR * 0.4, headY + H * 0.04, -headR * 0.1, headY - headR * 0.2);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'chestnutPony': {
      ctx.beginPath();
      ctx.moveTo(headR * 0.7, headY - headR * 0.4);
      ctx.quadraticCurveTo(headR * 1.7, headY + H * 0.1, headR * 1.0 + sway, headY + H * 0.22);
      ctx.quadraticCurveTo(headR * 0.2, headY + H * 0.1, -headR * 0.6, headY - headR * 0.2);
      ctx.closePath();
      ctx.fill();
      // high ponytail with a sweeping fall
      ctx.beginPath();
      ctx.moveTo(-headR * 0.2, headY - headR);
      ctx.quadraticCurveTo(-headR * 2.0, headY - headR * 2.2, -headR * 2.4 + sway, headY + H * 0.16);
      ctx.quadraticCurveTo(-headR * 1.5, headY + H * 0.08, -headR * 0.5, headY - headR * 0.4);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'aquaBraids': {
      ctx.beginPath();
      ctx.moveTo(headR * 0.5, headY - headR * 0.6);
      ctx.bezierCurveTo(H * 0.2, headY + H * 0.06, H * 0.18 + sway, H * 0.16, H * 0.11 + sway, H * 0.3);
      ctx.quadraticCurveTo(H * 0.02, H * 0.34, -H * 0.03 + sway, H * 0.24);
      ctx.bezierCurveTo(-H * 0.12, headY + H * 0.08, -H * 0.13, headY + H * 0.01, -headR * 0.9, headY - headR * 0.6);
      ctx.closePath();
      ctx.fill();
      // two long side braids
      ctx.strokeStyle = def.palette.hair;
      ctx.lineWidth = H * 0.02;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(side * headR * 0.85, headY);
        ctx.bezierCurveTo(side * headR * 1.7 + sway, headY + H * 0.1, side * headR * 1.3 + sway, H * 0.2, side * headR * 1.7 + sway, H * 0.3);
        ctx.stroke();
      }
      break;
    }
    default:
      break;
  }
}

function drawFrontHair(ctx: CanvasRenderingContext2D, def: HeroineDef, H: number, time: number): void {
  const headY = -H * 0.395;
  const headR = H * 0.076;
  const sway = Math.sin(time * 1.3) * H * 0.002;
  const grad = ctx.createLinearGradient(0, headY - headR, 0, headY + headR);
  grad.addColorStop(0, def.palette.hairLight);
  grad.addColorStop(0.55, def.palette.hair);
  grad.addColorStop(1, def.palette.hairDark);

  // Crown: top of the skull only, so the face below stays readable.
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(0, headY - headR * 0.38, headR * 1.04, headR * 0.62, -0.06, Math.PI, Math.PI * 2);
  ctx.lineTo(headR * 1.0, headY - headR * 0.2);
  ctx.quadraticCurveTo(headR * 0.5, headY - headR * 0.5, headR * 0.2, headY - headR * 0.24);
  ctx.quadraticCurveTo(-headR * 0.3, headY - headR * 0.46, -headR * 1.0, headY - headR * 0.18);
  ctx.closePath();
  ctx.fill();

  // Fringe ends above the eyes, with a soft swept part.
  ctx.fillStyle = def.palette.hair;
  ctx.beginPath();
  ctx.moveTo(-headR * 1.0, headY - headR * 0.22);
  ctx.quadraticCurveTo(-headR * 0.55, headY - headR * 1.02, headR * 0.92, headY - headR * 0.5);
  ctx.quadraticCurveTo(headR * 0.6, headY - headR * 0.52, headR * 0.44, headY - headR * 0.22);
  ctx.quadraticCurveTo(headR * 0.12, headY - headR * 0.52, -headR * 0.1, headY - headR * 0.2);
  ctx.quadraticCurveTo(-headR * 0.4, headY - headR * 0.46, -headR * 0.7, headY - headR * 0.08);
  ctx.quadraticCurveTo(-headR * 0.9, headY - headR * 0.28, -headR * 1.0, headY - headR * 0.22);
  ctx.closePath();
  ctx.fill();

  // Long face-framing strand sways with the body.
  ctx.strokeStyle = def.palette.hair;
  ctx.lineWidth = H * 0.018;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(headR * 1.16, headY - headR * 0.3);
  ctx.quadraticCurveTo(headR * 1.42 + sway, headY + H * 0.06, headR * 1.26 + sway, headY + H * 0.12);
  ctx.stroke();

  // Star ornament for Yuzuki, flame clip for Akari, crescent for Shiori.
  if (def.id === 'yuzuki') {
    ctx.fillStyle = def.palette.accent;
    ctx.shadowColor = def.palette.glow;
    ctx.shadowBlur = 8;
    star(ctx, headR * 0.76, headY - headR * 0.55, H * 0.012, 4);
    ctx.shadowBlur = 0;
  } else if (def.id === 'akari') {
    ctx.fillStyle = def.palette.accent;
    ctx.beginPath();
    ctx.moveTo(-headR * 0.55, headY - headR * 0.9);
    ctx.quadraticCurveTo(-headR * 0.75, headY - headR * 1.35, -headR * 0.35, headY - headR * 1.5);
    ctx.quadraticCurveTo(-headR * 0.42, headY - headR * 1.15, -headR * 0.24, headY - headR * 0.95);
    ctx.closePath();
    ctx.fill();
  } else if (def.id === 'shiori') {
    ctx.strokeStyle = '#dfe9ff';
    ctx.lineWidth = H * 0.006;
    ctx.beginPath();
    ctx.arc(headR * 0.78, headY - headR * 0.5, H * 0.016, 0.4, Math.PI * 1.5);
    ctx.stroke();
  }
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, points: number): void {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i += 1) {
    const radius = i % 2 === 0 ? r : r * 0.42;
    const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

// --------------------------------------------------------------------------- face

function drawFace(ctx: CanvasRenderingContext2D, def: HeroineDef, H: number, mood: Mood, time: number, tilt: number): void {
  // Called with the origin already at the centre of the head.
  const headR = H * 0.076;
  const blinkCycle = (time + def.id.length * 0.37) % 4.2;
  const blinking = blinkCycle < 0.11;
  const moodClose = mood === 'hurt' || mood === 'defeat';
  const happyClose = mood === 'victory';
  const eyeOpen = blinking || moodClose || happyClose ? 0.12 : mood === 'attack' ? 0.72 : 1;

  ctx.save();
  ctx.rotate(tilt);

  // Face
  const face = ctx.createLinearGradient(-headR, -headR, headR, headR);
  face.addColorStop(0, def.palette.skin);
  face.addColorStop(1, def.palette.skinShade);
  ctx.fillStyle = face;
  ctx.beginPath();
  ctx.moveTo(-headR * 0.92, -headR * 0.12);
  ctx.quadraticCurveTo(-headR, -headR * 0.95, 0, -headR);
  ctx.quadraticCurveTo(headR * 0.98, -headR * 0.95, headR * 0.9, -headR * 0.05);
  ctx.quadraticCurveTo(headR * 0.72, headR * 0.72, headR * 0.1, headR * 0.95);
  ctx.quadraticCurveTo(-headR * 0.66, headR * 0.7, -headR * 0.92, -headR * 0.12);
  ctx.closePath();
  ctx.fill();

  // Ears
  ctx.fillStyle = def.palette.skinShade;
  ctx.beginPath();
  ctx.ellipse(-headR * 0.82, headR * 0.05, headR * 0.13, headR * 0.22, -0.2, 0, Math.PI * 2);
  ctx.fill();

  // Blush
  ctx.fillStyle = hexToRgba(def.palette.lip, 0.16);
  for (const side of [-0.45, 0.62]) {
    ctx.beginPath();
    ctx.ellipse(headR * side, headR * 0.42, headR * 0.17, headR * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Eyes (leading eye larger; the far eye reads in three-quarter view).
  const drawEye = (cx: number, scale: number, closed: boolean): void => {
    const w = headR * 0.26 * scale;
    const h = headR * 0.3 * scale * (closed ? 0.12 : eyeOpen);
    ctx.save();
    ctx.translate(cx, headR * 0.06);
    // Lash frame
    ctx.fillStyle = '#211a2c';
    ctx.beginPath();
    ctx.ellipse(0, 0, w, h + headR * 0.03, 0, 0, Math.PI * 2);
    ctx.fill();
    if (closed) {
      ctx.strokeStyle = def.palette.eyeDark;
      ctx.lineWidth = headR * 0.035;
      ctx.beginPath();
      if (mood === 'hurt' || mood === 'defeat') {
        ctx.arc(0, h * 0.6, w * 0.8, Math.PI * 1.15, Math.PI * 1.85);
      } else {
        ctx.arc(0, -h * 0.2, w * 0.8, Math.PI * 0.15, Math.PI * 0.85);
      }
      ctx.stroke();
    } else {
      const iris = ctx.createLinearGradient(0, -h, 0, h);
      iris.addColorStop(0, def.palette.eyeDark);
      iris.addColorStop(0.55, def.palette.eye);
      iris.addColorStop(1, def.palette.eyeDark);
      ctx.fillStyle = iris;
      ctx.beginPath();
      ctx.ellipse(0, h * 0.08, w * 0.72, h * 0.82, 0, 0, Math.PI * 2);
      ctx.fill();
      // pupil
      ctx.fillStyle = 'rgba(22, 16, 32, 0.85)';
      ctx.beginPath();
      ctx.ellipse(0, h * 0.12, w * 0.3, h * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      // highlights
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(-w * 0.24, -h * 0.34, w * 0.2, h * 0.28, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.ellipse(w * 0.28, h * 0.32, w * 0.11, h * 0.16, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    // Upper lash line
    ctx.strokeStyle = '#2a2033';
    ctx.lineWidth = headR * (mood === 'attack' ? 0.045 : 0.032);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - w * 1.05, -h * 0.32);
    ctx.quadraticCurveTo(cx, -h * 1.15 - headR * 0.02, cx + w * 1.12, -h * 0.22);
    ctx.stroke();
  };

  drawEye(headR * 0.44, 1, moodClose || happyClose);
  drawEye(-headR * 0.36, 0.72, moodClose || happyClose);

  // Brows
  ctx.strokeStyle = def.palette.hairDark;
  ctx.lineWidth = headR * 0.035;
  ctx.lineCap = 'round';
  const browTilt = mood === 'attack' ? headR * 0.12 : mood === 'hurt' ? -headR * 0.08 : 0;
  ctx.beginPath();
  ctx.moveTo(headR * 0.16, -headR * 0.34 + browTilt);
  ctx.quadraticCurveTo(headR * 0.42, -headR * 0.42, headR * 0.66, -headR * 0.32 + browTilt);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-headR * 0.58, -headR * 0.3 + browTilt);
  ctx.quadraticCurveTo(-headR * 0.38, -headR * 0.38, -headR * 0.18, -headR * 0.32 + browTilt);
  ctx.stroke();

  // Nose
  ctx.strokeStyle = hexToRgba(def.palette.skinShade, 0.75);
  ctx.lineWidth = headR * 0.022;
  ctx.beginPath();
  ctx.moveTo(headR * 0.5, headR * 0.24);
  ctx.lineTo(headR * 0.43, headR * 0.33);
  ctx.stroke();

  // Mouth
  ctx.strokeStyle = def.palette.lip;
  ctx.lineWidth = headR * 0.042;
  ctx.beginPath();
  if (mood === 'victory') {
    ctx.arc(headR * 0.3, headR * 0.48, headR * 0.16, 0.15, Math.PI - 0.15);
  } else if (mood === 'hurt' || mood === 'defeat') {
    ctx.moveTo(headR * 0.2, headR * 0.55);
    ctx.quadraticCurveTo(headR * 0.32, headR * 0.48, headR * 0.44, headR * 0.55);
  } else if (mood === 'attack') {
    ctx.moveTo(headR * 0.2, headR * 0.52);
    ctx.lineTo(headR * 0.46, headR * 0.52);
  } else {
    ctx.moveTo(headR * 0.22, headR * 0.5);
    ctx.quadraticCurveTo(headR * 0.33, headR * 0.56, headR * 0.45, headR * 0.5);
  }
  ctx.stroke();

  ctx.restore();
}

// --------------------------------------------------------------------------- weapon

function drawWeapon(
  ctx: CanvasRenderingContext2D,
  weapon: WeaponKind,
  x: number,
  y: number,
  angle: number,
  H: number,
  def: HeroineDef,
  glow: number,
): void {
  const len = H * 0.4;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  if (glow > 0.05) {
    ctx.shadowColor = def.palette.glow;
    ctx.shadowBlur = 10 + glow * 22;
  }

  const blade = (length: number, width: number, tint: string, curve = 0): void => {
    const grad = ctx.createLinearGradient(0, -width, length, width);
    grad.addColorStop(0, '#f8fcff');
    grad.addColorStop(0.45, tint);
    grad.addColorStop(1, '#ffffff');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(H * 0.012, -width);
    ctx.quadraticCurveTo(length * 0.7, -width - curve, length, -width * 0.2);
    ctx.lineTo(length, width * 0.25);
    ctx.quadraticCurveTo(length * 0.6, width * 0.9 + curve, H * 0.012, width);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = hexToRgba('#ffffff', 0.75);
    ctx.lineWidth = H * 0.003;
    ctx.stroke();
  };

  switch (weapon) {
    case 'katana': {
      // grip
      ctx.strokeStyle = def.palette.outfitDark;
      ctx.lineWidth = H * 0.016;
      ctx.beginPath();
      ctx.moveTo(-H * 0.055, 0);
      ctx.lineTo(0, 0);
      ctx.stroke();
      ctx.fillStyle = def.palette.accent;
      ctx.beginPath();
      ctx.ellipse(0, 0, H * 0.008, H * 0.026, 0, 0, Math.PI * 2);
      ctx.fill();
      blade(len * 0.88, H * 0.011, hexToRgba('#dff3ff', 0.9), H * 0.02);
      break;
    }
    case 'longsword': {
      ctx.strokeStyle = def.palette.outfitDark;
      ctx.lineWidth = H * 0.018;
      ctx.beginPath();
      ctx.moveTo(-H * 0.06, 0);
      ctx.lineTo(0, 0);
      ctx.stroke();
      ctx.fillStyle = '#cfe4ff';
      ctx.beginPath();
      ctx.ellipse(0, 0, H * 0.026, H * 0.009, 0, 0, Math.PI * 2);
      ctx.fill();
      blade(len * 1.1, H * 0.018, hexToRgba('#cfe6ff', 0.9));
      break;
    }
    case 'rapier': {
      ctx.strokeStyle = '#e8d6b0';
      ctx.lineWidth = H * 0.012;
      ctx.beginPath();
      ctx.moveTo(-H * 0.02, 0);
      ctx.lineTo(H * 0.06, 0);
      ctx.stroke();
      ctx.strokeStyle = def.palette.accent;
      ctx.lineWidth = H * 0.008;
      ctx.beginPath();
      ctx.arc(H * 0.06, 0, H * 0.03, -Math.PI * 0.75, Math.PI * 0.75);
      ctx.stroke();
      blade(len * 1.15, H * 0.006, hexToRgba('#ffd9df', 0.92));
      break;
    }
    case 'twinBlades': {
      blade(len * 0.55, H * 0.012, hexToRgba('#ffd2b0', 0.95), H * 0.04);
      break;
    }
    case 'petalBlades': {
      blade(len * 0.6, H * 0.014, hexToRgba('#ffc7dd', 0.95), H * 0.055);
      break;
    }
    case 'staff': {
      ctx.strokeStyle = '#d9e9ff';
      ctx.lineWidth = H * 0.012;
      ctx.beginPath();
      ctx.moveTo(-H * 0.18, 0);
      ctx.lineTo(len * 0.7, 0);
      ctx.stroke();
      const cx = len * 0.72;
      const crystal = ctx.createRadialGradient(cx, 0, 1, cx, 0, H * 0.05);
      crystal.addColorStop(0, '#ffffff');
      crystal.addColorStop(0.5, def.palette.accent);
      crystal.addColorStop(1, hexToRgba(def.palette.accent, 0));
      ctx.fillStyle = crystal;
      ctx.beginPath();
      ctx.arc(cx, 0, H * 0.05, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#eafbff';
      ctx.beginPath();
      ctx.moveTo(cx, -H * 0.04);
      ctx.lineTo(cx + H * 0.018, 0);
      ctx.lineTo(cx, H * 0.04);
      ctx.lineTo(cx - H * 0.018, 0);
      ctx.closePath();
      ctx.fill();
      break;
    }
    default:
      break;
  }
  ctx.restore();
}

// --------------------------------------------------------------------------- full character

/**
 * Draw one fully posed heroine. The same function powers battle, roster cards and the HUD, which
 * is how the character's silhouette, palette and weapon stay identical across every screen.
 */
export function drawHeroine(
  ctx: CanvasRenderingContext2D,
  def: HeroineDef,
  pose: Pose,
  screenX: number,
  groundY: number,
  options: HeroDrawOptions = {},
): void {
  const H = options.height ?? HERO_HEIGHT;
  const facing = options.facing ?? 1;
  const time = options.time ?? 0;
  const mood = moodFor(options.phase);
  const glow = options.aura ?? pose.glow;

  ctx.save();
  ctx.globalAlpha = pose.alpha;

  // Ground shadow
  ctx.save();
  ctx.globalAlpha = 0.3 * pose.alpha;
  ctx.fillStyle = '#0c0a16';
  ctx.beginPath();
  ctx.ellipse(screenX, groundY + 5, H * 0.16, H * 0.035, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Elemental aura
  if (glow > 0.12) {
    const aura = ctx.createRadialGradient(screenX, groundY - H * 0.45, H * 0.02, screenX, groundY - H * 0.45, H * 0.46);
    aura.addColorStop(0, hexToRgba(def.palette.glow, 0.22 * glow));
    aura.addColorStop(0.6, hexToRgba(def.palette.accent, 0.1 * glow));
    aura.addColorStop(1, hexToRgba(def.palette.accent, 0));
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(screenX, groundY - H * 0.45, H * 0.46, 0, Math.PI * 2);
    ctx.fill();

    for (let i = 0; i < 5; i += 1) {
      const angle = time * 1.6 + (i / 5) * Math.PI * 2;
      const radius = H * (0.24 + 0.05 * Math.sin(time * 2 + i));
      ctx.fillStyle = hexToRgba(def.palette.glow, 0.7 * glow);
      star(
        ctx,
        screenX + Math.cos(angle) * radius * 0.8,
        groundY - H * 0.45 + Math.sin(angle) * radius,
        H * 0.008 * (1 + glow),
        4,
      );
    }
  }

  // Lunge: attacks carry her a short distance forward, then the anchor reasserts itself.
  const lunge = pose.lean * H * 0.16 + pose.armFront * H * 0.02;
  ctx.translate(screenX + facing * lunge, groundY + pose.bob);
  ctx.scale(facing * pose.scaleX, pose.scaleY);

  const hipY = -H * 0.47 - H * 0.05 * pose.crouch;
  const shoulderDrop = H * 0.305;
  const headR = H * 0.076;

  // ---- legs (planted; the torso leans over them)
  const drawLeg = (side: number, angles: { hip: number; knee: number }, color: string, bootColor: string): void => {
    const hx = side * H * 0.022;
    const a = angles.hip;
    const kneeX = hx + Math.sin(a) * H * 0.235;
    const kneeY = hipY + Math.cos(a) * H * 0.235;
    const shinAngle = a - angles.knee;
    const footX = kneeX + Math.sin(shinAngle) * H * 0.225;
    const footY = Math.min(0, kneeY + Math.cos(shinAngle) * H * 0.225);

    limb(ctx, hx, hipY, kneeX, kneeY, H * 0.068, color);
    limb(ctx, kneeX, kneeY, footX, footY, H * 0.054, color);

    // Boot / greave
    ctx.strokeStyle = bootColor;
    ctx.lineWidth = H * 0.058;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(kneeX, kneeY + H * 0.01);
    ctx.lineTo(footX, footY);
    ctx.stroke();
    // Outward boot seam
    ctx.strokeStyle = hexToRgba(def.palette.accent, 0.6);
    ctx.lineWidth = H * 0.006;
    ctx.beginPath();
    ctx.moveTo(kneeX + H * 0.026, kneeY + H * 0.03);
    ctx.lineTo(footX + H * 0.022, footY - H * 0.02);
    ctx.stroke();
    // Foot and ankle accent
    ctx.fillStyle = bootColor;
    ctx.beginPath();
    ctx.ellipse(footX + H * 0.024, footY - H * 0.008, H * 0.046, H * 0.018, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = hexToRgba(def.palette.accent, 0.75);
    ctx.lineWidth = H * 0.006;
    ctx.beginPath();
    ctx.moveTo(footX - H * 0.02, footY - H * 0.02);
    ctx.lineTo(footX + H * 0.038, footY - H * 0.02);
    ctx.stroke();
  };

  drawLeg(-1, { hip: pose.legBack, knee: pose.kneeBack }, def.palette.outfitDark, '#232034');
  drawLeg(1, { hip: pose.legFront, knee: pose.kneeFront }, def.palette.outfitDark, '#2c2740');

  // ---- upper body
  ctx.save();
  ctx.translate(0, hipY);
  ctx.rotate(pose.lean);

  // Back arm (darker, behind the torso)
  const shoulderX = H * 0.04;
  const shoulderY = -shoulderDrop;
  const backElbowX = shoulderX + Math.sin(pose.armBack) * H * 0.165;
  const backElbowY = shoulderY + Math.cos(pose.armBack) * H * 0.165;
  const backHandX = backElbowX + Math.sin(pose.armBack + pose.elbowBack) * H * 0.155;
  const backHandY = backElbowY + Math.cos(pose.armBack + pose.elbowBack) * H * 0.155;
  limb(ctx, shoulderX - H * 0.025, shoulderY, backElbowX, backElbowY, H * 0.044, hexToRgba(def.palette.skinShade, 0.95));
  limb(ctx, backElbowX, backElbowY, backHandX, backHandY, H * 0.036, hexToRgba(def.palette.skinShade, 0.95));

  drawBackHair(ctx, def, H, pose, time);
  drawSkirt(ctx, def, H, pose, time);
  if (def.outfit === 'celestialCoat' || def.outfit === 'crimsonCoat' || def.outfit === 'blazeJacket') {
    drawCoatTails(ctx, def, H, pose);
  }

  // Torso
  const bodyGrad = ctx.createLinearGradient(-H * 0.08, shoulderY, H * 0.08, 0);
  bodyGrad.addColorStop(0, def.palette.outfit);
  bodyGrad.addColorStop(0.55, def.palette.outfitDark);
  bodyGrad.addColorStop(1, def.palette.outfit);
  ctx.fillStyle = bodyGrad;
  torsoPath(ctx, H, shoulderY, 0);
  ctx.fill();

  // Layered fabric panels and trim
  ctx.strokeStyle = hexToRgba(def.palette.accent, 0.55);
  ctx.lineWidth = H * 0.005;
  ctx.beginPath();
  ctx.moveTo(-H * 0.03, shoulderY + H * 0.02);
  ctx.quadraticCurveTo(H * 0.01, shoulderY * 0.5, -H * 0.012, -H * 0.02);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(H * 0.035, shoulderY + H * 0.02);
  ctx.quadraticCurveTo(H * 0.06, shoulderY * 0.55, H * 0.04, -H * 0.01);
  ctx.stroke();

  // Waist sash — a slim band, not a disc, so the silhouette stays elegant.
  ctx.fillStyle = def.palette.accent;
  ctx.globalAlpha = 0.75;
  ctx.beginPath();
  ctx.moveTo(-H * 0.07, -H * 0.055);
  ctx.quadraticCurveTo(0, -H * 0.042, H * 0.075, -H * 0.058);
  ctx.lineTo(H * 0.077, -H * 0.036);
  ctx.quadraticCurveTo(0, -H * 0.022, -H * 0.068, -H * 0.034);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  // Small back pauldron with a luminous trim.
  ctx.fillStyle = def.palette.outfitDark;
  ctx.beginPath();
  ctx.ellipse(-H * 0.062, shoulderY + H * 0.022, H * 0.026, H * 0.014, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = hexToRgba(def.palette.accent, 0.55);
  ctx.lineWidth = H * 0.003;
  ctx.stroke();

  // Neck
  ctx.fillStyle = def.palette.skin;
  ctx.beginPath();
  ctx.roundRect(-H * 0.016, shoulderY - H * 0.05, H * 0.032, H * 0.06, H * 0.01);
  ctx.fill();

  // Head + face (the hair functions are authored around this same centre).
  const headY = -H * 0.395;
  ctx.save();
  ctx.translate(0, headY);
  drawFace(ctx, def, H, mood, time, pose.headTilt);
  ctx.restore();

  // Front hair over the face
  drawFrontHair(ctx, def, H, time);

  // ---- front arm
  const frontElbowX = shoulderX + Math.sin(pose.armFront) * H * 0.17;
  const frontElbowY = shoulderY + Math.cos(pose.armFront) * H * 0.17;
  const frontHandX = frontElbowX + Math.sin(pose.armFront + pose.elbowFront) * H * 0.16;
  const frontHandY = frontElbowY + Math.cos(pose.armFront + pose.elbowFront) * H * 0.16;

  // Sleeve: a darker seam keeps the arm readable against the bodice.
  ctx.strokeStyle = hexToRgba(def.palette.outfitDark, 0.85);
  ctx.lineWidth = H * 0.058;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(shoulderX, shoulderY + H * 0.008);
  ctx.lineTo(frontElbowX, frontElbowY);
  ctx.stroke();
  ctx.strokeStyle = def.palette.outfit;
  ctx.lineWidth = H * 0.042;
  ctx.beginPath();
  ctx.moveTo(shoulderX + H * 0.004, shoulderY + H * 0.008);
  ctx.lineTo(frontElbowX, frontElbowY);
  ctx.stroke();
  // forearm + fitted glove
  limb(ctx, frontElbowX, frontElbowY, frontHandX, frontHandY, H * 0.034, def.palette.skin);
  ctx.strokeStyle = def.palette.outfitDark;
  ctx.lineWidth = H * 0.036;
  ctx.beginPath();
  ctx.moveTo(frontElbowX, frontElbowY);
  ctx.lineTo(
    frontElbowX + Math.sin(pose.armFront + pose.elbowFront) * H * 0.095,
    frontElbowY + Math.cos(pose.armFront + pose.elbowFront) * H * 0.095,
  );
  ctx.stroke();
  // wrist trim
  ctx.strokeStyle = hexToRgba(def.palette.accent, 0.8);
  ctx.lineWidth = H * 0.006;
  ctx.beginPath();
  ctx.arc(frontHandX, frontHandY, H * 0.02, 0, Math.PI * 2);
  ctx.stroke();

  drawWeapon(ctx, def.weapon, frontHandX, frontHandY, pose.weaponAngle + pose.weaponSpin - 0.2, H, def, glow);

  if (def.weapon === 'twinBlades' || def.weapon === 'petalBlades') {
    drawWeapon(ctx, def.weapon, backHandX, backHandY, -pose.weaponAngle - pose.weaponSpin - 1.9, H, def, glow * 0.7);
  }

  // Hurt flash on the body silhouette
  if ((options.hitFlash ?? 0) > 0) {
    ctx.globalAlpha = Math.min(0.5, (options.hitFlash ?? 0) * 2.2);
    ctx.fillStyle = '#fff3f6';
    torsoPath(ctx, H, shoulderY, 0);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, headY, headR, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  ctx.restore(); // torso
  ctx.restore(); // world
}

/** Render a roster / HUD portrait from the same rig. */
export function paintHeroinePortrait(
  canvas: HTMLCanvasElement,
  def: HeroineDef,
  width = 240,
  height = 300,
): void {
  const dpr = Math.min(2, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, hexToRgba(def.palette.accent, 0.16));
  grad.addColorStop(1, 'rgba(10, 8, 20, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  const pose = samplePose(buildClipSet(def).idle, 1.4);
  drawHeroine(ctx, def, pose, width * 0.5, height * 0.96, {
    height: height * 0.92,
    time: 1.4,
    phase: 'idle',
  });
}
