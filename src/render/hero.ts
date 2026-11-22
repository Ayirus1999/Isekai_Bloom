import { GROUND_Y, HERO_SPRITE_HEIGHT } from '../game/constants';
import type { Hero } from '../game/hero';

export function drawHeroShadow(ctx: CanvasRenderingContext2D, screenX: number): void {
  ctx.save();
  ctx.globalAlpha = 0.34;
  ctx.fillStyle = '#10121f';
  ctx.beginPath();
  ctx.ellipse(screenX, GROUND_Y + 6, 56, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Draw the heroine. The sprite is mirrored by facing, leaned into attacks and lifted by a small
 * breathing bob; an elemental aura appears while an empowerment buff is active.
 */
export function drawHero(
  ctx: CanvasRenderingContext2D,
  hero: Hero,
  sprite: HTMLCanvasElement,
  cameraX: number,
  time: number,
): void {
  const screenX = hero.x - cameraX;
  const height = HERO_SPRITE_HEIGHT;
  const aspect = sprite.height > 0 ? sprite.width / sprite.height : 0.66;
  const width = height * aspect;

  drawHeroShadow(ctx, screenX);

  if (hero.empowered) {
    const aura = ctx.createRadialGradient(screenX, GROUND_Y - height * 0.5, 10, screenX, GROUND_Y - height * 0.5, width * 0.9);
    aura.addColorStop(0, hexToRgba(hero.def.palette.glow, 0.42));
    aura.addColorStop(1, hexToRgba(hero.def.palette.glow, 0));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(screenX, GROUND_Y - height * 0.5, width * 0.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const bob = hero.moving ? Math.sin(hero.walkPhase) * 3.4 : Math.sin(time * 2.1) * 2;
  const lean = Math.sin(hero.attackAnim * Math.PI) * 8 * hero.facing;
  const idleTilt = hero.moving ? Math.sin(hero.walkPhase) * 1.2 : 0;

  ctx.save();
  ctx.translate(screenX, GROUND_Y - height * 0.5 + bob);
  ctx.rotate(((lean + idleTilt) * Math.PI) / 180);
  ctx.scale(hero.facing, 1);
  ctx.drawImage(sprite, -width / 2, -height / 2, width, height);

  if (hero.hurtFlash > 0) {
    ctx.globalAlpha = Math.min(0.65, hero.hurtFlash * 2.6);
    ctx.filter = 'brightness(2.4) saturate(0.4)';
    ctx.drawImage(sprite, -width / 2, -height / 2, width, height);
    ctx.filter = 'none';
  }
  ctx.restore();

  if (hero.invulnerable > 0) {
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = hexToRgba(hero.def.palette.accent, 0.8);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(screenX, GROUND_Y - height * 0.45, width * 0.62, height * 0.52, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
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
