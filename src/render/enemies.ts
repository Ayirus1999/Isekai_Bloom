import { GROUND_Y } from '../game/constants';
import type { Enemy } from '../game/enemy';
import { hexToRgba } from './hero';

/** Draw a single enemy: shadow, archetype body, status markings and health bar. */
export function drawEnemy(ctx: CanvasRenderingContext2D, enemy: Enemy, cameraX: number, time: number): void {
  const x = enemy.x - cameraX;
  const height = enemy.def.height;
  const alive = enemy.alive;
  const bounce = Math.sin(time * 3.4 + enemy.x * 0.03) * (enemy.def.shape === 'slime' ? 3.5 : 1.6);
  const deathT = alive ? 0 : Math.max(0, 1 - enemy.deathTimer / 0.55);

  ctx.save();
  ctx.globalAlpha = 0.3 * (1 - deathT);
  ctx.fillStyle = '#10121f';
  ctx.beginPath();
  ctx.ellipse(x, GROUND_Y + 4, enemy.def.radius * 1.15, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // A telegraph ring gives the player time to read an incoming boss attack.
  if (alive && enemy.state === 'telegraph') {
    const pulse = 0.35 + 0.3 * Math.sin(time * 15);
    ctx.save();
    ctx.strokeStyle = hexToRgba(enemy.def.accent, pulse);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(x, GROUND_Y + 2, enemy.def.radius * 1.75, enemy.def.radius * 0.42, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = pulse * 0.35;
    ctx.fillStyle = enemy.def.accent;
    ctx.fill();
    ctx.restore();
  }

  if (enemy.def.tier !== 'normal') {
    const aura = ctx.createRadialGradient(x, GROUND_Y - height * 0.45, 4, x, GROUND_Y - height * 0.45, enemy.def.radius * 2.4);
    aura.addColorStop(0, hexToRgba(enemy.def.accent, 0.26));
    aura.addColorStop(1, hexToRgba(enemy.def.accent, 0));
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(x, GROUND_Y - height * 0.45, enemy.def.radius * 2.4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.save();
  ctx.translate(x, GROUND_Y + bounce);
  ctx.scale(enemy.facing, 1);

  if (deathT > 0) {
    ctx.globalAlpha = Math.max(0, 1 - deathT * deathT);
    ctx.translate(0, deathT * 22);
    ctx.scale(1 - deathT * 0.12, 1 - deathT * 0.12);
  } else {
    // Wind-up pulls the body back; the strike carries it toward the heroine. Visual only —
    // simulation coordinates never leave their lane.
    const forward =
      enemy.state === 'telegraph' ? -enemy.attackAnim * 10 : enemy.state === 'recover' ? enemy.attackAnim * 26 : 0;
    ctx.translate(forward, 0);
  }

  drawBody(ctx, enemy, time);

  if (enemy.hitFlash > 0 && alive) {
    ctx.globalAlpha = Math.min(0.7, enemy.hitFlash * 4);
    ctx.filter = 'brightness(2.6) saturate(0.3)';
    drawBody(ctx, enemy, time);
    ctx.filter = 'none';
    ctx.globalAlpha = 1;
  }

  if (enemy.frozen > 0) {
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = '#bdefff';
    ctx.beginPath();
    ctx.ellipse(0, -height * 0.45, enemy.def.radius * 1.2, height * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

  if (enemy.def.tier !== 'boss' && alive) drawHealthBar(ctx, enemy, x, height);
}

function drawHealthBar(ctx: CanvasRenderingContext2D, enemy: Enemy, x: number, height: number): void {
  const width = Math.max(38, enemy.def.radius * 2.1);
  const top = GROUND_Y - height - 14;
  ctx.save();
  ctx.fillStyle = 'rgba(12, 9, 24, 0.72)';
  ctx.fillRect(x - width / 2, top, width, 6);
  ctx.fillStyle = enemy.def.tier === 'elite' ? '#ffcf8a' : '#8ff0c8';
  ctx.fillRect(x - width / 2 + 1, top + 1, (width - 2) * enemy.hpRatio, 4);
  ctx.restore();
}

function drawBody(ctx: CanvasRenderingContext2D, enemy: Enemy, time: number): void {
  const h = enemy.def.height;
  const r = enemy.def.radius;
  const body = enemy.def.color;
  const accent = enemy.def.accent;
  const glow = enemy.def.glow;

  switch (enemy.def.shape) {
    case 'slime': {
      const wobble = Math.sin(time * 5 + enemy.x * 0.05) * 0.08;
      const gradient = ctx.createLinearGradient(0, -h, 0, 0);
      gradient.addColorStop(0, hexToRgba(accent, 0.95));
      gradient.addColorStop(0.55, body);
      gradient.addColorStop(1, hexToRgba(body, 0.75));
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.ellipse(0, -h * 0.38, r * (1 + wobble), h * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = hexToRgba('#ffffff', 0.5);
      ctx.beginPath();
      ctx.ellipse(-r * 0.35, -h * 0.6, r * 0.22, h * 0.1, -0.3, 0, Math.PI * 2);
      ctx.fill();
      eyes(ctx, -h * 0.42, r, 3.4);
      ctx.fillStyle = hexToRgba(accent, 0.85);
      ctx.beginPath();
      ctx.arc(0, -h * 0.3, r * 0.22, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'sprite': {
      ctx.fillStyle = hexToRgba(accent, 0.4);
      ctx.beginPath();
      ctx.ellipse(-r * 1.1, -h * 0.6, r * 0.85, r * 0.42, -0.5, 0, Math.PI * 2);
      ctx.ellipse(r * 1.1, -h * 0.6, r * 0.85, r * 0.42, 0.5, 0, Math.PI * 2);
      ctx.fill();
      const glow = ctx.createRadialGradient(0, -h * 0.55, 2, 0, -h * 0.55, r);
      glow.addColorStop(0, '#ffffff');
      glow.addColorStop(0.5, accent);
      glow.addColorStop(1, hexToRgba(body, 0.1));
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, -h * 0.55, r * 0.8, 0, Math.PI * 2);
      ctx.fill();
      eyes(ctx, -h * 0.58, r * 0.5, 2.6);
      break;
    }
    case 'bunny': {
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.ellipse(0, -h * 0.28, r * 0.95, h * 0.26, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(0, -h * 0.55, r * 0.62, h * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(-r * 0.34, -h * 0.82, r * 0.18, h * 0.16, -0.18, 0, Math.PI * 2);
      ctx.ellipse(r * 0.34, -h * 0.82, r * 0.18, h * 0.16, 0.18, 0, Math.PI * 2);
      ctx.fill();
      eyes(ctx, -h * 0.56, r * 0.42, 3);
      break;
    }
    case 'mushroom': {
      ctx.fillStyle = hexToRgba(accent, 0.95);
      ctx.fillRect(-r * 0.36, -h * 0.42, r * 0.72, h * 0.42);
      const cap = ctx.createLinearGradient(0, -h, 0, -h * 0.4);
      cap.addColorStop(0, accent);
      cap.addColorStop(1, body);
      ctx.fillStyle = cap;
      ctx.beginPath();
      ctx.ellipse(0, -h * 0.52, r * 1.15, h * 0.34, 0, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = hexToRgba('#ffffff', 0.55);
      ctx.beginPath();
      ctx.arc(-r * 0.4, -h * 0.66, r * 0.14, 0, Math.PI * 2);
      ctx.arc(r * 0.35, -h * 0.72, r * 0.1, 0, Math.PI * 2);
      ctx.fill();
      eyes(ctx, -h * 0.3, r * 0.4, 3);
      break;
    }
    case 'beetle': {
      const shell = ctx.createLinearGradient(0, -h, 0, 0);
      shell.addColorStop(0, accent);
      shell.addColorStop(0.6, body);
      shell.addColorStop(1, hexToRgba(body, 0.6));
      ctx.fillStyle = shell;
      ctx.beginPath();
      ctx.ellipse(0, -h * 0.32, r * 1.1, h * 0.34, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = hexToRgba('#ffffff', 0.45);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -h * 0.62);
      ctx.lineTo(0, -h * 0.06);
      ctx.stroke();
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.moveTo(r * 0.9, -h * 0.58);
      ctx.lineTo(r * 1.6, -h * 0.72);
      ctx.lineTo(r * 0.9, -h * 0.44);
      ctx.closePath();
      ctx.fill();
      eyes(ctx, -h * 0.4, r * 0.55, 2.8);
      break;
    }
    case 'flame': {
      const flicker = Math.sin(time * 9 + enemy.x) * 0.08;
      const flame = ctx.createLinearGradient(0, -h, 0, 0);
      flame.addColorStop(0, hexToRgba(accent, 0.95));
      flame.addColorStop(0.5, body);
      flame.addColorStop(1, hexToRgba('#ff5c3a', 0.35));
      ctx.fillStyle = flame;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-r * 1.3, -h * 0.4, -r * 0.35, -h * (0.85 + flicker));
      ctx.quadraticCurveTo(0, -h * 1.05, r * 0.35, -h * (0.8 + flicker));
      ctx.quadraticCurveTo(r * 1.3, -h * 0.4, 0, 0);
      ctx.fill();
      eyes(ctx, -h * 0.45, r * 0.4, 2.8);
      break;
    }
    case 'knight': {
      ctx.fillStyle = hexToRgba(body, 0.6);
      ctx.beginPath();
      ctx.moveTo(-r * 0.6, -h * 0.9);
      ctx.quadraticCurveTo(-r * 2.2, -h * 0.4, -r * 1.2, 0);
      ctx.lineTo(-r * 0.2, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = body;
      ctx.fillRect(-r * 0.55, -h * 0.86, r * 1.1, h * 0.86);
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(0, -h * 0.9, r * 0.42, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1a1626';
      ctx.fillRect(-r * 0.16, -h * 0.94, r * 0.32, h * 0.035);
      ctx.strokeStyle = '#f2e7ff';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(r * 0.9, -h * 0.5);
      ctx.lineTo(r * 0.9, -h * 0.9);
      ctx.stroke();
      break;
    }
    case 'golem': {
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.ellipse(0, -h * 0.3, r * 1.05, h * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = hexToRgba(body, 0.9);
      ctx.beginPath();
      ctx.ellipse(-r * 1.15, -h * 0.52, r * 0.35, h * 0.14, -0.4, 0, Math.PI * 2);
      ctx.ellipse(r * 1.15, -h * 0.52, r * 0.35, h * 0.14, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(0, -h * 0.42, r * 0.22, 0, Math.PI * 2);
      ctx.fill();
      eyes(ctx, -h * 0.56, r * 0.5, 3);
      break;
    }
    case 'wolf': {
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.ellipse(0, -h * 0.36, r * 1.15, h * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(r * 1.05, -h * 0.55, r * 0.55, h * 0.15, 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(r * 0.85, -h * 0.64);
      ctx.lineTo(r * 0.98, -h * 0.86);
      ctx.lineTo(r * 1.15, -h * 0.64);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = hexToRgba(body, 0.85);
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(-r * 1.05, -h * 0.34);
      ctx.quadraticCurveTo(-r * 1.8, -h * 0.5, -r * 2.1, -h * 0.2);
      ctx.stroke();
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(r * 1.15, -h * 0.58, 2.6, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'treant': {
      ctx.fillStyle = '#8a6a4a';
      ctx.beginPath();
      ctx.moveTo(-r * 0.45, 0);
      ctx.lineTo(-r * 0.3, -h * 0.85);
      ctx.lineTo(r * 0.3, -h * 0.85);
      ctx.lineTo(r * 0.45, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#8a6a4a';
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.moveTo(-r * 0.2, -h * 0.7);
      ctx.lineTo(-r * 1.3, -h * 0.85);
      ctx.moveTo(r * 0.2, -h * 0.75);
      ctx.lineTo(r * 1.25, -h * 0.95);
      ctx.stroke();
      const canopy = ctx.createRadialGradient(0, -h * 0.95, 4, 0, -h * 0.95, r * 1.5);
      canopy.addColorStop(0, accent);
      canopy.addColorStop(0.6, body);
      canopy.addColorStop(1, hexToRgba(body, 0.1));
      ctx.fillStyle = canopy;
      ctx.beginPath();
      ctx.arc(0, -h * 0.95, r * 1.05, 0, Math.PI * 2);
      ctx.fill();
      eyes(ctx, -h * 0.62, r * 0.42, 3.2);
      break;
    }
    case 'guardian': {
      ctx.fillStyle = hexToRgba(body, 0.85);
      ctx.beginPath();
      ctx.moveTo(0, -h);
      ctx.lineTo(r * 1.25, 0);
      ctx.lineTo(-r * 1.25, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(0, -h * 0.98, r * 0.34, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = hexToRgba(accent, 0.9);
      ctx.beginPath();
      ctx.arc(r * 0.8, -h * 0.6, r * 0.24, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'queen': {
      drawThornQueen(ctx, h, r, body, accent, glow, time);
      break;
    }
    case 'dragon': {
      drawCrystalDragon(ctx, h, r, body, accent, glow, time);
      break;
    }
    case 'fallen': {
      drawFallenGuardian(ctx, h, r, body, accent, glow, time);
      break;
    }
    case 'empress': {
      drawShadowEmpress(ctx, h, r, body, accent, glow, time);
      break;
    }
    case 'celestial': {
      drawCorruptedCelestial(ctx, h, r, body, accent, glow, time);
      break;
    }
    case 'thornGuardian': {
      drawThornGuardian(ctx, h, r, body, accent, glow, time);
      break;
    }
    case 'warden': {
      drawCrystalWarden(ctx, h, r, body, accent, glow, time);
      break;
    }
    case 'emberBeast': {
      drawEmberBeast(ctx, h, r, body, accent, glow, time);
      break;
    }
    case 'sentinel': {
      drawMoonlitSentinel(ctx, h, r, body, accent, glow, time);
      break;
    }
    case 'fairy': {
      drawFairy(ctx, h, r, body, accent, glow, time);
      break;
    }
    case 'wisp': {
      drawWisp(ctx, h, r, body, accent, glow, time);
      break;
    }
    default: {
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.ellipse(0, -h * 0.5, r, h * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }
}

function petal(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, angle: number): void {
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, angle, 0, Math.PI * 2);
  ctx.fill();
}

function spike(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, lean: number): void {
  ctx.beginPath();
  ctx.moveTo(x - w, y);
  ctx.lineTo(x + lean, y - h);
  ctx.lineTo(x + w, y);
  ctx.closePath();
  ctx.fill();
}

/** The Thorn Queen: a crowned rift-rose with a vine mantle and a glowing heart-petal. */
function drawThornQueen(
  ctx: CanvasRenderingContext2D,
  h: number,
  r: number,
  body: string,
  accent: string,
  glow: string,
  time: number,
): void {
  const sway = Math.sin(time * 1.6) * r * 0.05;

  // Thorned vines framing the silhouette.
  ctx.save();
  ctx.strokeStyle = hexToRgba(accent, 0.45);
  ctx.lineWidth = 3;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * r * 0.5, -h * 0.62);
    ctx.bezierCurveTo(side * r * 1.4, -h * 0.8, side * r * 1.75, -h * 0.5, side * r * 1.4, -h * 0.08);
    ctx.stroke();
    ctx.fillStyle = hexToRgba(accent, 0.65);
    for (let i = 0; i < 4; i += 1) {
      const t = 0.2 + i * 0.2;
      spike(ctx, side * r * (0.9 + t * 0.5), -h * (0.62 + t * 0.14), 3, 9, side * 5);
    }
  }
  ctx.restore();

  // Gown.
  const gown = ctx.createLinearGradient(0, -h * 0.6, 0, 0);
  gown.addColorStop(0, hexToRgba(glow, 0.9));
  gown.addColorStop(0.24, body);
  gown.addColorStop(1, '#3a1224');
  ctx.fillStyle = gown;
  ctx.beginPath();
  ctx.moveTo(-r * 0.34 + sway, -h * 0.58);
  ctx.bezierCurveTo(-r * 0.8, -h * 0.4, -r * 1.08, -h * 0.14, -r * 1.16, 0);
  ctx.lineTo(-r * 0.55, 0);
  ctx.quadraticCurveTo(-r * 0.32, h * 0.03, -r * 0.12, 0);
  ctx.quadraticCurveTo(r * 0.1, h * 0.03, r * 0.32, 0);
  ctx.lineTo(r * 0.62, 0);
  ctx.quadraticCurveTo(r * 0.3, h * 0.03, r * 0.5, 0);
  ctx.lineTo(r * 1.16, 0);
  ctx.bezierCurveTo(r * 1.08, -h * 0.14, r * 0.8, -h * 0.4, r * 0.34 + sway, -h * 0.58);
  ctx.closePath();
  ctx.fill();

  // Petal hem.
  ctx.fillStyle = hexToRgba(glow, 0.35);
  for (let i = -2; i <= 2; i += 1) petal(ctx, i * r * 0.42, -h * 0.03, r * 0.3, h * 0.05, i * 0.18);

  // Bodice.
  ctx.fillStyle = hexToRgba(glow, 0.55);
  ctx.beginPath();
  ctx.moveTo(-r * 0.34 + sway, -h * 0.58);
  ctx.quadraticCurveTo(-r * 0.48, -h * 0.72, -r * 0.36, -h * 0.8);
  ctx.quadraticCurveTo(0, -h * 0.87, r * 0.36, -h * 0.8);
  ctx.quadraticCurveTo(r * 0.48, -h * 0.72, r * 0.34 + sway, -h * 0.58);
  ctx.quadraticCurveTo(0, -h * 0.54, -r * 0.34 + sway, -h * 0.58);
  ctx.fill();
  ctx.strokeStyle = hexToRgba(accent, 0.6);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-r * 0.36, -h * 0.61);
  ctx.quadraticCurveTo(0, -h * 0.56, r * 0.36, -h * 0.61);
  ctx.stroke();

  // Arms and thorn claws.
  ctx.strokeStyle = hexToRgba(glow, 0.85);
  ctx.lineWidth = r * 0.11;
  ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * r * 0.3, -h * 0.78);
    ctx.quadraticCurveTo(side * r * 0.85, -h * 0.72, side * r * 1.0, -h * 0.48);
    ctx.stroke();
    ctx.fillStyle = hexToRgba(accent, 0.9);
    for (let i = -1; i <= 1; i += 1) spike(ctx, side * r * 1.02, -h * 0.46, 2.5, 14, i * 6);
  }

  // Hair and head.
  ctx.fillStyle = '#4b1730';
  ctx.beginPath();
  ctx.ellipse(0, -h * 0.9, r * 0.34, h * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-r * 0.3, -h * 0.9);
  ctx.quadraticCurveTo(-r * 0.6, -h * 0.72, -r * 0.4, -h * 0.5);
  ctx.lineTo(-r * 0.16, -h * 0.76);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffe0e8';
  ctx.beginPath();
  ctx.ellipse(0, -h * 0.9, r * 0.18, r * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.ellipse(-r * 0.07, -h * 0.91, r * 0.035, r * 0.02, 0, 0, Math.PI * 2);
  ctx.ellipse(r * 0.07, -h * 0.91, r * 0.035, r * 0.02, 0, 0, Math.PI * 2);
  ctx.fill();

  // Crown of thorns.
  ctx.fillStyle = '#2f4a2c';
  for (let i = -2; i <= 2; i += 1) spike(ctx, i * r * 0.13, -h * 0.965, 4, 22 - Math.abs(i) * 4, i * 3);
  ctx.strokeStyle = hexToRgba(accent, 0.8);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, -h * 0.93, r * 0.24, r * 0.1, 0, Math.PI * 1.05, Math.PI * 1.95);
  ctx.stroke();

  // Heart-petal.
  const pulse = 0.75 + 0.25 * Math.sin(time * 3);
  const roseGlow = ctx.createRadialGradient(0, -h * 0.7, 2, 0, -h * 0.7, r * 0.5);
  roseGlow.addColorStop(0, hexToRgba('#ffffff', 0.9 * pulse));
  roseGlow.addColorStop(0.4, hexToRgba(glow, 0.75 * pulse));
  roseGlow.addColorStop(1, hexToRgba(glow, 0));
  ctx.fillStyle = roseGlow;
  ctx.beginPath();
  ctx.arc(0, -h * 0.7, r * 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = hexToRgba(glow, 0.95);
  for (let i = 0; i < 6; i += 1) {
    const angle = (i / 6) * Math.PI * 2 + time * 0.25;
    petal(ctx, Math.cos(angle) * r * 0.12, -h * 0.7 + Math.sin(angle) * r * 0.1, r * 0.15, r * 0.07, angle);
  }
  ctx.fillStyle = '#fff6fb';
  ctx.beginPath();
  ctx.arc(0, -h * 0.7, r * 0.06, 0, Math.PI * 2);
  ctx.fill();
}

/** The Crystal Dragon: a faceted wyrm with a wingspan wider than the boss bar. */
function drawCrystalDragon(
  ctx: CanvasRenderingContext2D,
  h: number,
  r: number,
  body: string,
  accent: string,
  glow: string,
  time: number,
): void {
  const flap = Math.sin(time * 1.4) * r * 0.12;

  // Tail.
  ctx.fillStyle = hexToRgba(body, 0.9);
  ctx.beginPath();
  ctx.moveTo(-r * 0.4, -h * 0.36);
  ctx.bezierCurveTo(-r * 1.2, -h * 0.3, -r * 1.9, -h * 0.06, -r * 2.5, -h * 0.02);
  ctx.lineTo(-r * 2.0, -h * 0.13);
  ctx.bezierCurveTo(-r * 1.4, -h * 0.2, -r * 0.9, -h * 0.22, -r * 0.4, -h * 0.24);
  ctx.closePath();
  ctx.fill();

  // Wings.
  for (const side of [-1, 1]) {
    const wing = ctx.createLinearGradient(side * r * 0.4, -h * 0.7, side * r * 2.2, -h * 0.35);
    wing.addColorStop(0, hexToRgba(glow, 0.8));
    wing.addColorStop(1, hexToRgba(accent, 0.05));
    ctx.fillStyle = wing;
    ctx.beginPath();
    ctx.moveTo(side * r * 0.35, -h * 0.62);
    ctx.quadraticCurveTo(side * r * 1.5, -h * 0.95 + flap, side * r * 2.15, -h * 0.72 + flap);
    ctx.quadraticCurveTo(side * r * 1.7, -h * 0.5, side * r * 2.0, -h * 0.3);
    ctx.quadraticCurveTo(side * r * 1.2, -h * 0.46, side * r * 0.4, -h * 0.42);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = hexToRgba(glow, 0.55);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(side * r * 0.4, -h * 0.58);
    ctx.lineTo(side * r * 1.8, -h * 0.72 + flap);
    ctx.moveTo(side * r * 0.45, -h * 0.5);
    ctx.lineTo(side * r * 1.9, -h * 0.4);
    ctx.stroke();
  }

  // Legs.
  ctx.strokeStyle = hexToRgba(body, 0.95);
  ctx.lineWidth = r * 0.17;
  ctx.lineCap = 'round';
  for (const x of [-r * 0.3, r * 0.36]) {
    ctx.beginPath();
    ctx.moveTo(x, -h * 0.38);
    ctx.lineTo(x - r * 0.12, -h * 0.18);
    ctx.lineTo(x + r * 0.18, 0);
    ctx.stroke();
    ctx.fillStyle = hexToRgba(accent, 0.9);
    spike(ctx, x + r * 0.28, 0, 4, 10, 8);
  }

  // Body.
  const torso = ctx.createLinearGradient(0, -h * 0.7, 0, -h * 0.2);
  torso.addColorStop(0, hexToRgba(glow, 0.95));
  torso.addColorStop(0.45, body);
  torso.addColorStop(1, hexToRgba(body, 0.65));
  ctx.fillStyle = torso;
  ctx.beginPath();
  ctx.ellipse(0, -h * 0.44, r * 0.78, h * 0.2, 0.05, 0, Math.PI * 2);
  ctx.fill();

  // Dorsal crystals.
  ctx.fillStyle = hexToRgba(glow, 0.9);
  for (let i = 0; i < 4; i += 1) {
    spike(ctx, -r * (0.45 - i * 0.2), -h * (0.52 + i * 0.045), 4, 16 + i * 3, -4);
  }

  // Neck and head, facing the heroine.
  ctx.strokeStyle = hexToRgba(body, 0.98);
  ctx.lineWidth = r * 0.36;
  ctx.beginPath();
  ctx.moveTo(r * 0.25, -h * 0.52);
  ctx.quadraticCurveTo(r * 0.62, -h * 0.66, r * 0.55, -h * 0.8);
  ctx.stroke();
  ctx.fillStyle = hexToRgba(glow, 0.95);
  ctx.beginPath();
  ctx.moveTo(r * 0.4, -h * 0.86);
  ctx.lineTo(r * 0.95, -h * 0.84);
  ctx.lineTo(r * 1.02, -h * 0.78);
  ctx.quadraticCurveTo(r * 0.8, -h * 0.69, r * 0.5, -h * 0.73);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = hexToRgba(accent, 0.95);
  spike(ctx, r * 0.5, -h * 0.86, 4, 20, -8);
  spike(ctx, r * 0.72, -h * 0.85, 3, 14, -4);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(r * 0.68, -h * 0.82, 3.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#254e72';
  ctx.beginPath();
  ctx.arc(r * 0.68, -h * 0.82, 1.6, 0, Math.PI * 2);
  ctx.fill();

  // Chest gem.
  const gem = 0.7 + 0.3 * Math.sin(time * 2.2);
  const gemGlow = ctx.createRadialGradient(r * 0.22, -h * 0.44, 1, r * 0.22, -h * 0.44, r * 0.45);
  gemGlow.addColorStop(0, hexToRgba('#ffffff', gem));
  gemGlow.addColorStop(0.5, hexToRgba(glow, 0.6));
  gemGlow.addColorStop(1, hexToRgba(glow, 0));
  ctx.fillStyle = gemGlow;
  ctx.beginPath();
  ctx.arc(r * 0.22, -h * 0.44, r * 0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#eaffff';
  ctx.beginPath();
  ctx.moveTo(r * 0.22, -h * 0.51);
  ctx.lineTo(r * 0.34, -h * 0.44);
  ctx.lineTo(r * 0.22, -h * 0.36);
  ctx.lineTo(r * 0.1, -h * 0.44);
  ctx.closePath();
  ctx.fill();
}

/** The Fallen Star Guardian: a broken halo, winged plate and a spear of old light. */
function drawFallenGuardian(
  ctx: CanvasRenderingContext2D,
  h: number,
  r: number,
  body: string,
  accent: string,
  glow: string,
  time: number,
): void {
  // Wings.
  ctx.fillStyle = hexToRgba(glow, 0.32);
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i += 1) {
      petal(ctx, side * r * (0.75 + i * 0.26), -h * (0.62 - i * 0.12), r * 0.5, h * 0.07, side * (0.5 + i * 0.25));
    }
    ctx.strokeStyle = hexToRgba(glow, 0.4);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(side * r * 0.4, -h * 0.7);
    ctx.lineTo(side * r * 1.3, -h * 0.82);
    ctx.stroke();
  }

  // Broken halo.
  ctx.strokeStyle = hexToRgba(accent, 0.85);
  ctx.lineWidth = 4;
  for (const [start, end] of [
    [0.15, 2.5],
    [2.8, 4.6],
    [5.0, 6.1],
  ] as const) {
    ctx.beginPath();
    ctx.ellipse(0, -h * 1.0, r * 0.62, r * 0.2, 0, Math.PI + start * 0.5, Math.PI + end * 0.5);
    ctx.stroke();
  }

  // Cape.
  ctx.fillStyle = hexToRgba(body, 0.55);
  ctx.beginPath();
  ctx.moveTo(-r * 0.4, -h * 0.72);
  ctx.quadraticCurveTo(-r * 0.95, -h * 0.4, -r * 0.8, -h * 0.06);
  ctx.lineTo(r * 0.5, -h * 0.06);
  ctx.quadraticCurveTo(r * 0.7, -h * 0.4, r * 0.36, -h * 0.72);
  ctx.closePath();
  ctx.fill();

  // Legs.
  ctx.strokeStyle = hexToRgba(body, 0.95);
  ctx.lineWidth = r * 0.16;
  ctx.lineCap = 'round';
  for (const x of [-r * 0.18, r * 0.2]) {
    ctx.beginPath();
    ctx.moveTo(x, -h * 0.34);
    ctx.lineTo(x, 0);
    ctx.stroke();
  }
  ctx.fillStyle = accent;
  ctx.fillRect(-r * 0.3, -h * 0.04, r * 0.24, h * 0.04);
  ctx.fillRect(r * 0.1, -h * 0.04, r * 0.24, h * 0.04);

  // Armour and chest core.
  const plate = ctx.createLinearGradient(0, -h * 0.78, 0, -h * 0.3);
  plate.addColorStop(0, '#fdf5df');
  plate.addColorStop(1, body);
  ctx.fillStyle = plate;
  ctx.beginPath();
  ctx.moveTo(-r * 0.34, -h * 0.74);
  ctx.lineTo(r * 0.36, -h * 0.74);
  ctx.lineTo(r * 0.42, -h * 0.36);
  ctx.lineTo(0, -h * 0.26);
  ctx.lineTo(-r * 0.42, -h * 0.36);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = hexToRgba(accent, 0.75);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-r * 0.32, -h * 0.66);
  ctx.lineTo(r * 0.3, -h * 0.66);
  ctx.stroke();
  const core = 0.6 + 0.4 * Math.sin(time * 2.4);
  const coreGlow = ctx.createRadialGradient(0, -h * 0.52, 1, 0, -h * 0.52, r * 0.4);
  coreGlow.addColorStop(0, hexToRgba('#ffffff', core));
  coreGlow.addColorStop(0.5, hexToRgba(accent, 0.7));
  coreGlow.addColorStop(1, hexToRgba(accent, 0));
  ctx.fillStyle = coreGlow;
  ctx.beginPath();
  ctx.arc(0, -h * 0.52, r * 0.4, 0, Math.PI * 2);
  ctx.fill();

  // Head and helmet.
  ctx.fillStyle = '#ffe7d9';
  ctx.beginPath();
  ctx.ellipse(0, -h * 0.85, r * 0.18, r * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = hexToRgba(body, 0.95);
  ctx.beginPath();
  ctx.moveTo(-r * 0.22, -h * 0.88);
  ctx.quadraticCurveTo(0, -h * 0.98, r * 0.24, -h * 0.88);
  ctx.lineTo(r * 0.16, -h * 0.84);
  ctx.lineTo(-r * 0.16, -h * 0.84);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = accent;
  ctx.fillRect(-r * 0.04, -h * 0.9, r * 0.1, 2.5);

  // Spear.
  ctx.strokeStyle = hexToRgba('#f6e6bf', 0.9);
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(r * 1.05, -h * 0.05);
  ctx.lineTo(-r * 0.38, -h * 0.98);
  ctx.stroke();
  ctx.fillStyle = hexToRgba(accent, 0.95);
  ctx.beginPath();
  ctx.moveTo(-r * 0.38, -h * 0.98);
  ctx.lineTo(-r * 0.2, -h * 0.9);
  ctx.lineTo(-r * 0.26, -h * 0.82);
  ctx.closePath();
  ctx.fill();
}

/** The Shadow Empress: high collar, horned crown, a sceptre and a floor-length cloak. */
function drawShadowEmpress(
  ctx: CanvasRenderingContext2D,
  h: number,
  r: number,
  body: string,
  accent: string,
  glow: string,
  time: number,
): void {
  // Cloak.
  const cloak = ctx.createLinearGradient(0, -h * 0.72, 0, 0);
  cloak.addColorStop(0, '#2a1a3e');
  cloak.addColorStop(0.7, body);
  cloak.addColorStop(1, '#120b22');
  ctx.fillStyle = cloak;
  ctx.beginPath();
  ctx.moveTo(-r * 0.36, -h * 0.72);
  ctx.lineTo(-r * 1.0, -h * 0.6);
  ctx.lineTo(-r * 1.22, 0);
  ctx.lineTo(-r * 0.86, -h * 0.06);
  ctx.lineTo(-r * 0.54, 0);
  ctx.lineTo(-r * 0.18, -h * 0.06);
  ctx.lineTo(r * 0.28, 0);
  ctx.lineTo(r * 0.6, -h * 0.05);
  ctx.lineTo(r * 1.1, 0);
  ctx.lineTo(r * 0.95, -h * 0.6);
  ctx.lineTo(r * 0.34, -h * 0.72);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = hexToRgba(accent, 0.45);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-r * 0.9, -h * 0.1);
  ctx.lineTo(-r * 0.5, -h * 0.62);
  ctx.moveTo(r * 0.88, -h * 0.1);
  ctx.lineTo(r * 0.5, -h * 0.62);
  ctx.stroke();

  // High collar.
  ctx.fillStyle = '#1b102c';
  ctx.beginPath();
  ctx.moveTo(-r * 0.62, -h * 0.74);
  ctx.lineTo(-r * 0.28, -h * 0.98);
  ctx.lineTo(-r * 0.08, -h * 0.78);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(r * 0.62, -h * 0.74);
  ctx.lineTo(r * 0.28, -h * 0.98);
  ctx.lineTo(r * 0.08, -h * 0.78);
  ctx.closePath();
  ctx.fill();

  // Gown.
  ctx.fillStyle = hexToRgba(glow, 0.55);
  ctx.beginPath();
  ctx.moveTo(-r * 0.26, -h * 0.68);
  ctx.lineTo(r * 0.26, -h * 0.68);
  ctx.lineTo(r * 0.42, -h * 0.04);
  ctx.lineTo(-r * 0.42, -h * 0.04);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = hexToRgba(accent, 0.55);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -h * 0.66);
  ctx.lineTo(0, -h * 0.06);
  ctx.stroke();

  // Sceptre.
  ctx.strokeStyle = hexToRgba(accent, 0.85);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-r * 0.9, -h * 0.02);
  ctx.lineTo(-r * 0.7, -h * 0.82);
  ctx.stroke();
  const orbPulse = 0.6 + 0.4 * Math.sin(time * 2.8);
  const orb = ctx.createRadialGradient(-r * 0.68, -h * 0.88, 1, -r * 0.68, -h * 0.88, r * 0.26);
  orb.addColorStop(0, hexToRgba('#ffffff', orbPulse));
  orb.addColorStop(0.5, hexToRgba(accent, 0.75));
  orb.addColorStop(1, hexToRgba(accent, 0));
  ctx.fillStyle = orb;
  ctx.beginPath();
  ctx.arc(-r * 0.68, -h * 0.88, r * 0.26, 0, Math.PI * 2);
  ctx.fill();

  // Head and crown.
  ctx.fillStyle = '#ffdce6';
  ctx.beginPath();
  ctx.ellipse(0, -h * 0.84, r * 0.17, r * 0.19, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = hexToRgba(glow, 0.25);
  ctx.beginPath();
  ctx.ellipse(0, -h * 0.86, r * 0.1, r * 0.06, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = accent;
  ctx.fillRect(-r * 0.1, -h * 0.86, r * 0.06, 2);
  ctx.fillRect(r * 0.04, -h * 0.86, r * 0.06, 2);
  ctx.fillStyle = '#1b102c';
  for (const x of [-0.2, 0, 0.2]) spike(ctx, x * r, -h * 0.94, 5, 20 - Math.abs(x) * 30, x * 4);
  ctx.strokeStyle = hexToRgba(accent, 0.8);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, -h * 0.9, r * 0.24, Math.PI * 1.05, Math.PI * 1.95);
  ctx.stroke();

  // Shadow wisps.
  ctx.fillStyle = hexToRgba(accent, 0.18);
  for (let i = 0; i < 3; i += 1) {
    const drift = Math.sin(time * 1.2 + i) * r * 0.12;
    ctx.beginPath();
    ctx.arc(-r * (1.15 + i * 0.08), -h * (0.3 + i * 0.18) + drift, r * (0.16 - i * 0.03), 0, Math.PI * 2);
    ctx.fill();
  }
}

/** The Corrupted Celestial: a haloed oracle whose light has gone wrong. */
function drawCorruptedCelestial(
  ctx: CanvasRenderingContext2D,
  h: number,
  r: number,
  body: string,
  accent: string,
  glow: string,
  time: number,
): void {
  const float = Math.sin(time * 1.5) * 3;
  ctx.save();
  ctx.translate(0, float);

  // Halo rings.
  ctx.strokeStyle = hexToRgba(accent, 0.55);
  ctx.lineWidth = 3;
  for (let i = 0; i < 2; i += 1) {
    ctx.beginPath();
    ctx.ellipse(0, -h * 0.99, r * (0.62 + i * 0.18), r * (0.16 + i * 0.06), i * 0.2, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Robe.
  const robe = ctx.createLinearGradient(0, -h * 0.8, 0, 0);
  robe.addColorStop(0, '#fff8e6');
  robe.addColorStop(0.45, body);
  robe.addColorStop(1, hexToRgba(glow, 0.25));
  ctx.fillStyle = robe;
  ctx.beginPath();
  ctx.moveTo(-r * 0.32, -h * 0.76);
  ctx.quadraticCurveTo(-r * 0.8, -h * 0.5, -r * 1.12, -h * 0.04);
  ctx.quadraticCurveTo(-r * 0.5, -h * 0.14, 0, -h * 0.02);
  ctx.quadraticCurveTo(r * 0.5, -h * 0.14, r * 1.12, -h * 0.04);
  ctx.quadraticCurveTo(r * 0.8, -h * 0.5, r * 0.32, -h * 0.76);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = hexToRgba(accent, 0.55);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-r * 0.6, -h * 0.2);
  ctx.quadraticCurveTo(0, -h * 0.1, r * 0.6, -h * 0.2);
  ctx.stroke();

  // Sleeves and hands.
  ctx.strokeStyle = '#fff6e2';
  ctx.lineWidth = r * 0.24;
  ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * r * 0.28, -h * 0.7);
    ctx.quadraticCurveTo(side * r * 0.72, -h * 0.62, side * r * 0.62, -h * 0.46);
    ctx.stroke();
    ctx.fillStyle = '#ffe9d8';
    ctx.beginPath();
    ctx.arc(side * r * 0.62, -h * 0.45, r * 0.07, 0, Math.PI * 2);
    ctx.fill();
  }

  // Mask and cracked face.
  ctx.fillStyle = '#fff2df';
  ctx.beginPath();
  ctx.ellipse(0, -h * 0.85, r * 0.21, r * 0.24, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(72, 46, 40, 0.7)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-r * 0.1, -h * 0.97);
  ctx.lineTo(-r * 0.04, -h * 0.88);
  ctx.lineTo(-r * 0.12, -h * 0.82);
  ctx.moveTo(r * 0.13, -h * 0.9);
  ctx.lineTo(r * 0.06, -h * 0.84);
  ctx.stroke();
  ctx.strokeStyle = hexToRgba(accent, 0.8);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-r * 0.12, -h * 0.87);
  ctx.quadraticCurveTo(-r * 0.06, -h * 0.89, 0, -h * 0.87);
  ctx.moveTo(r * 0.03, -h * 0.87);
  ctx.quadraticCurveTo(r * 0.08, -h * 0.89, r * 0.13, -h * 0.87);
  ctx.stroke();

  // Corrupted core.
  const corePulse = 0.65 + 0.35 * Math.sin(time * 2);
  const core = ctx.createRadialGradient(0, -h * 0.56, 2, 0, -h * 0.56, r * 0.35);
  core.addColorStop(0, hexToRgba('#2b1636', corePulse));
  core.addColorStop(0.55, hexToRgba(accent, 0.5));
  core.addColorStop(1, hexToRgba(accent, 0));
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(0, -h * 0.56, r * 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = hexToRgba(accent, 0.85);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, -h * 0.56, r * 0.2, 0, Math.PI * 2);
  ctx.stroke();

  // Floating shards.
  ctx.fillStyle = hexToRgba(glow, 0.55);
  for (let i = 0; i < 4; i += 1) {
    const angle = time * 0.5 + (i / 4) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * r * 1.1, -h * 0.55 + Math.sin(angle) * h * 0.22);
    ctx.lineTo(Math.cos(angle) * r * 1.1 + 5, -h * 0.55 + Math.sin(angle) * h * 0.22 - 9);
    ctx.lineTo(Math.cos(angle) * r * 1.1 + 10, -h * 0.55 + Math.sin(angle) * h * 0.22);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** A low, hulking thorn beast — bulk and thorns instead of the Queen's height. */
function drawThornGuardian(
  ctx: CanvasRenderingContext2D,
  h: number,
  r: number,
  body: string,
  accent: string,
  glow: string,
  time: number,
): void {
  // Legs.
  ctx.strokeStyle = '#3d1a2a';
  ctx.lineWidth = r * 0.22;
  ctx.lineCap = 'round';
  for (const x of [-r * 0.6, -r * 0.1, r * 0.45]) {
    ctx.beginPath();
    ctx.moveTo(x, -h * 0.36);
    ctx.lineTo(x - r * 0.08, -h * 0.1);
    ctx.lineTo(x + r * 0.12, 0);
    ctx.stroke();
  }

  // Tail vine.
  ctx.strokeStyle = hexToRgba(accent, 0.5);
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-r * 0.75, -h * 0.48);
  ctx.quadraticCurveTo(-r * 1.6, -h * 0.5, -r * 2.0, -h * 0.18);
  ctx.stroke();

  // Body.
  const hide = ctx.createLinearGradient(0, -h * 0.72, 0, -h * 0.2);
  hide.addColorStop(0, hexToRgba(glow, 0.8));
  hide.addColorStop(0.3, body);
  hide.addColorStop(1, '#4a1c2d');
  ctx.fillStyle = hide;
  ctx.beginPath();
  ctx.ellipse(0, -h * 0.44, r * 1.15, h * 0.26, 0, 0, Math.PI * 2);
  ctx.fill();
  // Head.
  ctx.fillStyle = hexToRgba(body, 0.98);
  ctx.beginPath();
  ctx.ellipse(r * 0.92, -h * 0.6, r * 0.58, h * 0.15, -0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(r * 1.15, -h * 0.68);
  ctx.lineTo(r * 1.55, -h * 0.6);
  ctx.lineTo(r * 1.15, -h * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(r * 1.05, -h * 0.63, r * 0.07, 0, Math.PI * 2);
  ctx.fill();

  // Thorn ridge and front claws.
  ctx.fillStyle = hexToRgba(accent, 0.75);
  for (let i = 0; i < 5; i += 1) {
    spike(ctx, -r * (0.55 - i * 0.22), -h * (0.62 + (i % 2) * 0.03), 5, 16 + (i % 2) * 6, 2);
  }
  ctx.strokeStyle = hexToRgba(glow, 0.8);
  ctx.lineWidth = r * 0.13;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(r * 0.5, -h * 0.38);
    ctx.quadraticCurveTo(r * 0.9, -h * 0.26, r * 1.2, -h * 0.12);
    ctx.stroke();
    ctx.fillStyle = hexToRgba(accent, 0.9);
    spike(ctx, r * 1.22, -h * 0.1, 4, 12, side * 2);
  }
  // Glowing seeds along the flank.
  for (let i = 0; i < 3; i += 1) {
    const pulse = 0.4 + 0.3 * Math.sin(time * 3 + i);
    ctx.fillStyle = hexToRgba(glow, pulse);
    ctx.beginPath();
    ctx.arc(-r * 0.3 + i * r * 0.3, -h * 0.5, r * 0.05, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** A faceted crystal sentinel: angular plates, a crown of shards, a cold core. */
function drawCrystalWarden(
  ctx: CanvasRenderingContext2D,
  h: number,
  r: number,
  body: string,
  accent: string,
  glow: string,
  time: number,
): void {
  // Floating shards behind.
  ctx.fillStyle = hexToRgba(glow, 0.45);
  for (let i = 0; i < 4; i += 1) {
    const angle = time * 0.6 + i * 1.7;
    const cx = Math.cos(angle) * r * 1.2;
    const cy = -h * 0.55 + Math.sin(angle) * h * 0.16;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 10);
    ctx.lineTo(cx + 6, cy);
    ctx.lineTo(cx, cy + 10);
    ctx.lineTo(cx - 6, cy);
    ctx.closePath();
    ctx.fill();
  }

  // Legs.
  ctx.fillStyle = hexToRgba(body, 0.6);
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * r * 0.18, -h * 0.44);
    ctx.lineTo(side * r * 0.48, 0);
    ctx.lineTo(side * r * 0.08, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = hexToRgba(accent, 0.6);
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  // Torso.
  const plate = ctx.createLinearGradient(0, -h * 0.85, 0, -h * 0.4);
  plate.addColorStop(0, hexToRgba(accent, 0.95));
  plate.addColorStop(0.5, body);
  plate.addColorStop(1, hexToRgba(body, 0.5));
  ctx.fillStyle = plate;
  ctx.beginPath();
  ctx.moveTo(-r * 0.42, -h * 0.42);
  ctx.lineTo(-r * 0.62, -h * 0.72);
  ctx.lineTo(-r * 0.24, -h * 0.86);
  ctx.lineTo(r * 0.3, -h * 0.86);
  ctx.lineTo(r * 0.6, -h * 0.68);
  ctx.lineTo(r * 0.4, -h * 0.4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = hexToRgba('#ffffff', 0.4);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-r * 0.3, -h * 0.82);
  ctx.lineTo(0, -h * 0.5);
  ctx.lineTo(r * 0.3, -h * 0.8);
  ctx.stroke();

  // Arms and blade.
  ctx.strokeStyle = hexToRgba(body, 0.85);
  ctx.lineWidth = r * 0.14;
  ctx.beginPath();
  ctx.moveTo(-r * 0.5, -h * 0.72);
  ctx.lineTo(-r * 1.0, -h * 0.48);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(r * 0.5, -h * 0.72);
  ctx.lineTo(r * 1.0, -h * 0.46);
  ctx.stroke();
  ctx.fillStyle = hexToRgba(accent, 0.85);
  ctx.beginPath();
  ctx.moveTo(r * 1.02, -h * 0.44);
  ctx.lineTo(r * 1.5, -h * 0.78);
  ctx.lineTo(r * 1.58, -h * 0.7);
  ctx.lineTo(r * 1.12, -h * 0.36);
  ctx.closePath();
  ctx.fill();

  // Crown shards.
  ctx.fillStyle = hexToRgba(accent, 0.9);
  for (let i = -2; i <= 2; i += 1) {
    spike(ctx, i * r * 0.13, -h * 0.87, 3, 20 - Math.abs(i) * 4, i * 2);
  }
  // Core.
  const pulse = 0.6 + 0.4 * Math.sin(time * 2.6);
  const core = ctx.createRadialGradient(0, -h * 0.64, 1, 0, -h * 0.64, r * 0.34);
  core.addColorStop(0, hexToRgba('#ffffff', pulse));
  core.addColorStop(0.5, hexToRgba(accent, 0.6));
  core.addColorStop(1, hexToRgba(accent, 0));
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(0, -h * 0.64, r * 0.34, 0, Math.PI * 2);
  ctx.fill();
}

/** A four-legged ember beast with a mane of fire and burning paws. */
function drawEmberBeast(
  ctx: CanvasRenderingContext2D,
  h: number,
  r: number,
  body: string,
  accent: string,
  glow: string,
  time: number,
): void {
  // Legs.
  ctx.strokeStyle = '#4a1c12';
  ctx.lineWidth = r * 0.2;
  ctx.lineCap = 'round';
  for (const x of [-r * 0.65, -r * 0.1, r * 0.55]) {
    ctx.beginPath();
    ctx.moveTo(x, -h * 0.32);
    ctx.lineTo(x, 0);
    ctx.stroke();
  }
  // Tail flame.
  const flicker = Math.sin(time * 7) * 0.15;
  ctx.fillStyle = hexToRgba(accent, 0.55);
  ctx.beginPath();
  ctx.moveTo(-r * 1.0, -h * 0.5);
  ctx.quadraticCurveTo(-r * 1.9, -h * (0.7 + flicker), -r * 1.7, -h * (0.95 + flicker));
  ctx.quadraticCurveTo(-r * 1.4, -h * 0.68, -r * 1.0, -h * 0.58);
  ctx.closePath();
  ctx.fill();

  // Body.
  const fur = ctx.createLinearGradient(0, -h * 0.7, 0, -h * 0.2);
  fur.addColorStop(0, hexToRgba(glow, 0.9));
  fur.addColorStop(0.5, body);
  fur.addColorStop(1, '#5a2413');
  ctx.fillStyle = fur;
  ctx.beginPath();
  ctx.ellipse(0, -h * 0.42, r * 1.05, h * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();

  // Head and jaw.
  ctx.fillStyle = hexToRgba(body, 0.98);
  ctx.beginPath();
  ctx.ellipse(r * 0.85, -h * 0.55, r * 0.5, h * 0.13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(r * 1.1, -h * 0.63);
  ctx.lineTo(r * 1.55, -h * 0.58);
  ctx.lineTo(r * 1.1, -h * 0.47);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = hexToRgba(accent, 0.9);
  spike(ctx, r * 0.8, -h * 0.62, 5, 16, 3);
  spike(ctx, r * 1.0, -h * 0.6, 4, 10, 4);
  ctx.fillStyle = '#2a141a';
  ctx.beginPath();
  ctx.arc(r * 1.05, -h * 0.58, 2.6, 0, Math.PI * 2);
  ctx.fill();

  // Flame mane and back spikes.
  for (let i = 0; i < 5; i += 1) {
    const x = -r * (0.5 - i * 0.3);
    const hh = 24 + (i % 2) * 12 + Math.sin(time * 6 + i) * 4;
    ctx.fillStyle = hexToRgba(i % 2 ? accent : glow, 0.55);
    spike(ctx, x, -h * 0.57, 8, hh, -6);
  }
  // Paws.
  ctx.fillStyle = hexToRgba(accent, 0.8);
  for (const x of [-r * 0.65, -r * 0.1, r * 0.55]) {
    ctx.beginPath();
    ctx.ellipse(x, -h * 0.01, r * 0.16, h * 0.03, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** A hovering moon knight with a crescent behind her and a long thin blade. */
function drawMoonlitSentinel(
  ctx: CanvasRenderingContext2D,
  h: number,
  r: number,
  body: string,
  accent: string,
  glow: string,
  time: number,
): void {
  const hover = Math.sin(time * 1.4) * 4;
  ctx.save();
  ctx.translate(0, hover);

  // Crescent moon.
  ctx.strokeStyle = hexToRgba(accent, 0.35);
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(0, -h * 0.62, r * 1.28, Math.PI * 0.2, Math.PI * 1.45);
  ctx.stroke();

  // Cloak / lower body.
  const cloth = ctx.createLinearGradient(0, -h * 0.62, 0, 0);
  cloth.addColorStop(0, hexToRgba(body, 0.85));
  cloth.addColorStop(1, hexToRgba(body, 0.1));
  ctx.fillStyle = cloth;
  ctx.beginPath();
  ctx.moveTo(-r * 0.36, -h * 0.6);
  ctx.quadraticCurveTo(-r * 0.7, -h * 0.2, -r * 0.5, 0);
  ctx.quadraticCurveTo(0, -h * 0.1, r * 0.5, 0);
  ctx.quadraticCurveTo(r * 0.7, -h * 0.2, r * 0.36, -h * 0.6);
  ctx.closePath();
  ctx.fill();

  // Armour.
  ctx.fillStyle = hexToRgba(glow, 0.8);
  ctx.beginPath();
  ctx.moveTo(-r * 0.32, -h * 0.76);
  ctx.lineTo(r * 0.32, -h * 0.76);
  ctx.lineTo(r * 0.4, -h * 0.5);
  ctx.lineTo(0, -h * 0.42);
  ctx.lineTo(-r * 0.4, -h * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = hexToRgba(accent, 0.7);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-r * 0.26, -h * 0.68);
  ctx.lineTo(r * 0.26, -h * 0.68);
  ctx.stroke();

  // Arms and blade.
  ctx.strokeStyle = hexToRgba(glow, 0.7);
  ctx.lineWidth = r * 0.1;
  ctx.beginPath();
  ctx.moveTo(r * 0.3, -h * 0.7);
  ctx.lineTo(r * 0.72, -h * 0.55);
  ctx.stroke();
  ctx.strokeStyle = hexToRgba(accent, 0.9);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(r * 0.7, -h * 0.52);
  ctx.lineTo(r * 1.45, -h * 0.92);
  ctx.stroke();
  ctx.fillStyle = hexToRgba(accent, 0.8);
  ctx.beginPath();
  ctx.moveTo(r * 1.3, -h * 0.84);
  ctx.lineTo(r * 1.45, -h * 0.92);
  ctx.lineTo(r * 1.38, -h * 0.8);
  ctx.stroke();

  // Helmet and crescent crest.
  ctx.fillStyle = '#f2efff';
  ctx.beginPath();
  ctx.ellipse(0, -h * 0.85, r * 0.17, r * 0.19, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = hexToRgba(body, 0.9);
  ctx.beginPath();
  ctx.moveTo(-r * 0.2, -h * 0.88);
  ctx.quadraticCurveTo(0, -h * 0.96, r * 0.2, -h * 0.88);
  ctx.lineTo(r * 0.14, -h * 0.82);
  ctx.lineTo(-r * 0.14, -h * 0.82);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = hexToRgba(accent, 0.9);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, -h * 0.87, r * 0.24, Math.PI * 1.1, Math.PI * 1.9);
  ctx.stroke();
  ctx.restore();
}

/** A small corrupted fairy: bright wings, tiny body, an unkind smile. */
function drawFairy(
  ctx: CanvasRenderingContext2D,
  h: number,
  r: number,
  body: string,
  accent: string,
  glow: string,
  time: number,
): void {
  const bob = Math.sin(time * 3 + r) * 4;
  ctx.save();
  ctx.translate(0, bob);
  // Wings.
  for (const side of [-1, 1]) {
    const flutter = 0.25 * Math.sin(time * 12 + side);
    ctx.fillStyle = hexToRgba(glow, 0.4);
    petal(ctx, side * r * 0.6, -h * 0.62, r * 0.52, r * 0.22, side * (0.6 + flutter));
    petal(ctx, side * r * 0.52, -h * 0.44, r * 0.36, r * 0.16, side * (0.2 + flutter));
  }
  // Glow body.
  const aura = ctx.createRadialGradient(0, -h * 0.48, 2, 0, -h * 0.48, r * 0.9);
  aura.addColorStop(0, hexToRgba('#ffffff', 0.9));
  aura.addColorStop(0.45, hexToRgba(accent, 0.7));
  aura.addColorStop(1, hexToRgba(accent, 0));
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(0, -h * 0.48, r * 0.9, 0, Math.PI * 2);
  ctx.fill();
  // Dress.
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(0, -h * 0.6);
  ctx.lineTo(r * 0.28, -h * 0.16);
  ctx.quadraticCurveTo(0, -h * 0.08, -r * 0.28, -h * 0.16);
  ctx.closePath();
  ctx.fill();
  // Head.
  ctx.fillStyle = '#ffe9e4';
  ctx.beginPath();
  ctx.arc(0, -h * 0.68, r * 0.24, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(-r * 0.08, -h * 0.69, 2, 0, Math.PI * 2);
  ctx.arc(r * 0.08, -h * 0.69, 2, 0, Math.PI * 2);
  ctx.fill();
  // Antennae.
  ctx.strokeStyle = hexToRgba(accent, 0.8);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-r * 0.1, -h * 0.78);
  ctx.lineTo(-r * 0.28, -h * 0.95);
  ctx.moveTo(r * 0.1, -h * 0.78);
  ctx.lineTo(r * 0.28, -h * 0.95);
  ctx.stroke();
  ctx.restore();
}

/** A stray-magic wisp: a bright nucleus inside orbiting rings and a smoky trail. */
function drawWisp(
  ctx: CanvasRenderingContext2D,
  h: number,
  r: number,
  body: string,
  accent: string,
  glow: string,
  time: number,
): void {
  const pulse = 0.75 + 0.25 * Math.sin(time * 3.2 + r);
  const drift = Math.sin(time * 1.8) * 2;
  ctx.save();
  ctx.translate(drift, 0);
  // Trail.
  ctx.fillStyle = hexToRgba(glow, 0.2);
  for (let i = 0; i < 3; i += 1) {
    ctx.beginPath();
    ctx.arc(-r * (0.3 + i * 0.35), -h * (0.45 - i * 0.06), r * (0.3 - i * 0.07), 0, Math.PI * 2);
    ctx.fill();
  }
  // Halo.
  const aura = ctx.createRadialGradient(0, -h * 0.55, 2, 0, -h * 0.55, r * 0.95);
  aura.addColorStop(0, hexToRgba('#ffffff', 0.95 * pulse));
  aura.addColorStop(0.35, hexToRgba(accent, 0.65));
  aura.addColorStop(1, hexToRgba(accent, 0));
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(0, -h * 0.55, r * 0.95, 0, Math.PI * 2);
  ctx.fill();
  // Core.
  ctx.fillStyle = '#fdfbff';
  ctx.beginPath();
  ctx.arc(0, -h * 0.55, r * 0.26 * pulse, 0, Math.PI * 2);
  ctx.fill();
  // Orbiting rings.
  ctx.strokeStyle = hexToRgba(body, 0.75);
  ctx.lineWidth = 2;
  for (let i = 0; i < 2; i += 1) {
    ctx.beginPath();
    ctx.ellipse(0, -h * 0.55, r * 0.55, r * (0.16 + i * 0.06), time * (0.6 + i * 0.3) + i, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function eyes(ctx: CanvasRenderingContext2D, y: number, spacing: number, size: number): void {
  ctx.fillStyle = '#1c1630';
  ctx.beginPath();
  ctx.arc(-spacing * 0.36, y, size * 0.5, 0, Math.PI * 2);
  ctx.arc(spacing * 0.36, y, size * 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.arc(-spacing * 0.36 + size * 0.15, y - size * 0.18, size * 0.16, 0, Math.PI * 2);
  ctx.arc(spacing * 0.36 + size * 0.15, y - size * 0.18, size * 0.16, 0, Math.PI * 2);
  ctx.fill();
}
