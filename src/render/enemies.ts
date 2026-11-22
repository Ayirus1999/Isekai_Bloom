import { GROUND_Y } from '../game/constants';
import type { Enemy } from '../game/enemy';
import { hexToRgba } from './hero';

/** Draw a single enemy: shadow, archetype body, status markings and health bar. */
export function drawEnemy(
  ctx: CanvasRenderingContext2D,
  enemy: Enemy,
  cameraX: number,
  time: number,
  queenSprite: HTMLCanvasElement | null,
): void {
  const x = enemy.x - cameraX;
  const height = enemy.def.height;
  const bounce = Math.sin(time * 3.4 + enemy.x * 0.03) * (enemy.def.shape === 'slime' ? 3.5 : 1.6);

  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = '#10121f';
  ctx.beginPath();
  ctx.ellipse(x, GROUND_Y + 4, enemy.def.radius * 1.15, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

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

  if (enemy.def.shape === 'queen' && queenSprite) {
    const drawnH = height;
    const drawnW = drawnH * (queenSprite.width / queenSprite.height);
    ctx.drawImage(queenSprite, -drawnW / 2, -drawnH, drawnW, drawnH);
  } else {
    drawBody(ctx, enemy, time);
  }

  if (enemy.hitFlash > 0) {
    ctx.globalAlpha = Math.min(0.7, enemy.hitFlash * 4);
    ctx.filter = 'brightness(2.6) saturate(0.3)';
    if (enemy.def.shape === 'queen' && queenSprite) {
      const drawnH = height;
      const drawnW = drawnH * (queenSprite.width / queenSprite.height);
      ctx.drawImage(queenSprite, -drawnW / 2, -drawnH, drawnW, drawnH);
    } else {
      drawBody(ctx, enemy, time);
    }
    ctx.filter = 'none';
  }

  if (enemy.frozen > 0) {
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = '#bdefff';
    ctx.beginPath();
    ctx.ellipse(0, -height * 0.45, enemy.def.radius * 1.2, height * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

  if (enemy.def.tier !== 'boss') drawHealthBar(ctx, enemy, x, height);
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
    default: {
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.ellipse(0, -h * 0.5, r, h * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }
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
