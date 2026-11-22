import { GROUND_Y } from '../game/constants';
import type { Impact, Projectile, VisualEffect } from '../game/world';
import { hexToRgba } from './hero';

export function drawImpacts(
  ctx: CanvasRenderingContext2D,
  impacts: readonly Impact[],
  mapX: (x: number) => number,
): void {
  for (const impact of impacts) {
    const x = mapX(impact.x);
    const progress = Math.max(0, Math.min(1, 1 - impact.delay / Math.max(0.001, impact.total)));
    const hostile = impact.from === 'enemy';
    const base = hostile ? '#ff7b8f' : impact.color;

    ctx.save();
    ctx.globalAlpha = 0.22 + progress * 0.2;
    ctx.fillStyle = base;
    ctx.beginPath();
    ctx.ellipse(x, GROUND_Y - 6, impact.radius * (0.55 + progress * 0.45), 20 + progress * 8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = hexToRgba(base, 0.95);
    ctx.lineWidth = 2 + progress * 2;
    ctx.beginPath();
    ctx.ellipse(x, GROUND_Y - 6, impact.radius * (0.55 + progress * 0.45), 20 + progress * 8, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Vertical warning shaft so the marker reads even when the screen is busy.
    const glow = ctx.createLinearGradient(0, GROUND_Y - 260, 0, GROUND_Y);
    glow.addColorStop(0, 'rgba(0,0,0,0)');
    glow.addColorStop(1, hexToRgba(base, 0.22));
    ctx.fillStyle = glow;
    ctx.fillRect(x - impact.radius * 0.5, GROUND_Y - 260, impact.radius, 254);
    ctx.restore();
  }
}

export function drawProjectiles(
  ctx: CanvasRenderingContext2D,
  projectiles: readonly Projectile[],
  mapX: (x: number) => number,
): void {
  for (const projectile of projectiles) {
    const x = mapX(projectile.x);
    const y = projectile.y;
    ctx.save();

    if (projectile.kind === 'wave') {
      const gradient = ctx.createLinearGradient(x - 40, 0, x + 40, 0);
      gradient.addColorStop(0, hexToRgba(projectile.color, 0));
      gradient.addColorStop(0.5, hexToRgba(projectile.color, 0.95));
      gradient.addColorStop(1, hexToRgba(projectile.color, 0));
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.arc(x, y + 20, projectile.radius * 1.15, -Math.PI * 0.62, Math.PI * 0.62);
      ctx.stroke();
      ctx.strokeStyle = hexToRgba('#ffffff', 0.75);
      ctx.lineWidth = 3;
      ctx.stroke();
    } else if (projectile.kind === 'orb') {
      const glow = ctx.createRadialGradient(x, y, 2, x, y, projectile.radius * 3.4);
      glow.addColorStop(0, hexToRgba(projectile.color, 0.95));
      glow.addColorStop(1, hexToRgba(projectile.color, 0));
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, projectile.radius * 3.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff6e6';
      ctx.beginPath();
      ctx.arc(x, y, projectile.radius * 0.55, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.translate(x, y);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = hexToRgba(projectile.color, 0.95);
      ctx.shadowColor = projectile.color;
      ctx.shadowBlur = 18;
      ctx.fillRect(-projectile.radius * 0.7, -projectile.radius * 0.7, projectile.radius * 1.4, projectile.radius * 1.4);
    }

    ctx.restore();
  }
}

export function drawEffects(
  ctx: CanvasRenderingContext2D,
  effects: readonly VisualEffect[],
  mapX: (x: number) => number,
  textScale = 1,
): void {
  for (const effect of effects) {
    const x = mapX(effect.x);
    const alpha = Math.max(0, effect.life / effect.max);

    if (effect.kind === 'spark') {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = effect.color;
      ctx.beginPath();
      ctx.arc(x, effect.y, effect.size * (0.4 + alpha * 0.8), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (effect.kind === 'slash') {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(x, effect.y);
      ctx.scale(effect.facing, 1);
      const gradient = ctx.createLinearGradient(-effect.radius, 0, effect.radius, 0);
      gradient.addColorStop(0, hexToRgba(effect.color, 0));
      gradient.addColorStop(0.55, hexToRgba(effect.color, 0.95));
      gradient.addColorStop(1, 'rgba(255,255,255,0.95)');
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 7 + (1 - alpha) * 8;
      ctx.beginPath();
      ctx.arc(0, 0, effect.radius * (0.85 + (1 - alpha) * 0.3), -Math.PI * 0.55, Math.PI * 0.55);
      ctx.stroke();
      ctx.restore();
    } else if (effect.kind === 'ring') {
      ctx.save();
      const grow = 1 - alpha;
      ctx.globalAlpha = alpha * 0.85;
      ctx.strokeStyle = effect.color;
      ctx.lineWidth = 3 + grow * 3;
      ctx.beginPath();
      ctx.ellipse(x, effect.y, effect.radius * (0.45 + grow * 0.75), 16 + grow * 30, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    } else {
      ctx.save();
      ctx.globalAlpha = Math.min(1, alpha * 1.5);
      ctx.font = effect.crit
        ? `700 ${30 * textScale}px "Iowan Old Style", Palatino, Georgia, serif`
        : `600 ${21 * textScale}px "Segoe UI", system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(10, 8, 20, 0.75)';
      ctx.strokeText(effect.text, x, effect.y);
      ctx.fillStyle = effect.crit ? '#ffe08a' : '#fff8ec';
      ctx.fillText(effect.text, x, effect.y);
      ctx.restore();
    }
  }
}
