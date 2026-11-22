import { ENEMY_LANE_MAX, GROUND_Y, HERO_HEIGHT, HERO_X, VIEW_H, VIEW_W } from '../game/constants';
import type { World } from '../game/world';
import { drawWorldBackdrop } from './background';
import { drawEffects, drawImpacts, drawProjectiles } from './effects';
import { drawEnemy } from './enemies';
import { drawHeroine, hexToRgba } from './hero';

interface StageLayout {
  scale: number;
  x0: number;
  offsetX: number;
  offsetY: number;
  groundY: number;
  portrait: boolean;
  /** Logical-x mapper: combatants keep their own size while the lane compresses on phones. */
  mapX: (x: number) => number;
}

/**
 * Canvas renderer. The backdrop fills the viewport; combatants are drawn in the fixed 1280x720
 * arena and fitted to the available space. On portrait phones the camera crops the empty sky and
 * margins so the fighters stay as large as the screen allows.
 */
export class Renderer {
  private readonly ctx: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private dpr = 1;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    this.ctx = ctx;
  }

  private resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (width === this.width && height === this.height && dpr === this.dpr) return;
    this.width = width;
    this.height = height;
    this.dpr = dpr;
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private layout(): StageLayout {
    const w = this.width;
    const h = this.height;
    const portrait = h / w > 1.12;

    if (portrait) {
      // Portrait gets its own camera. Sprites stay at their true aspect and a larger scale; the
      // empty gap between the heroine and the enemy lane is compressed instead of shrinking the
      // whole fight into a corner. Distances near the heroine stay honest so melee spacing reads.
      const scale = Math.min(0.8, w / 640);
      const groundY = h * 0.68;
      const heroScreenX = w * 0.18;
      const nearZone = 300;
      const nearPx = nearZone * scale;
      const farZone = ENEMY_LANE_MAX - HERO_X - nearZone;
      const farStart = heroScreenX + nearPx;
      const farPx = Math.max(0, w * 0.94 - farStart);
      const mapScreenX = (x: number): number => {
        const dx = Math.max(0, x - HERO_X);
        if (dx <= nearZone) return heroScreenX + dx * scale;
        return Math.min(w * 0.94, farStart + ((dx - nearZone) / farZone) * farPx);
      };
      return {
        scale,
        x0: 0,
        offsetX: 0,
        offsetY: groundY - GROUND_Y * scale,
        groundY,
        portrait,
        mapX: (x) => mapScreenX(x) / scale,
      };
    }

    const scale = Math.min(w / VIEW_W, h / VIEW_H);
    const offsetX = (w - VIEW_W * scale) * 0.5;
    const offsetY = (h - VIEW_H * scale) * 0.5 + (h > w ? h * 0.02 : 0);
    return {
      scale,
      x0: 0,
      offsetX,
      offsetY,
      groundY: offsetY + GROUND_Y * scale,
      portrait: false,
      mapX: (x) => x,
    };
  }

  draw(world: World, realTime: number, realDelta: number): void {
    this.resize();
    const ctx = this.ctx;
    const layout = this.layout();
    const w = this.width;
    const h = this.height;

    ctx.clearRect(0, 0, w, h);
    if (world.worldDef) {
      drawWorldBackdrop(ctx, world.worldDef, w, h, layout.groundY, realTime);
    } else {
      ctx.fillStyle = '#0b0818';
      ctx.fillRect(0, 0, w, h);
    }

    if (world.status === 'idle') return;

    const shakeX = world.shake > 0 ? (Math.random() - 0.5) * world.shake * 0.7 : 0;
    const shakeY = world.shake > 0 ? (Math.random() - 0.5) * world.shake * 0.5 : 0;

    const mapX = layout.mapX;

    ctx.save();
    ctx.translate(layout.offsetX - layout.x0 * layout.scale + shakeX, layout.offsetY + shakeY);
    ctx.scale(layout.scale, layout.scale);

    drawImpacts(ctx, world.impacts, mapX);

    const ordered = [...world.enemies].sort((a, b) => a.x - b.x);
    for (const enemy of ordered) {
      drawEnemy(ctx, enemy, enemy.x - mapX(enemy.x), realTime);
    }

    drawHeroine(ctx, world.hero.def, world.hero.pose, mapX(world.hero.x), GROUND_Y, {
      height: HERO_HEIGHT,
      facing: world.hero.facing,
      time: realTime,
      phase: world.hero.phase,
      hitFlash: world.hero.hurtFlash,
      aura: Math.max(world.hero.pose.glow, world.hero.empowered ? 0.7 : 0),
    });

    drawProjectiles(ctx, world.projectiles, mapX);
    drawEffects(ctx, world.effects, mapX, layout.portrait ? 1.5 : 1);

    ctx.restore();

    // Cinematic emphasis for ultimates and boss arrivals.
    if (world.cinematic > 0) {
      const strength = Math.min(1, world.cinematic);
      ctx.save();
      ctx.fillStyle = `rgba(8, 6, 18, ${0.34 * strength})`;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = hexToRgba('#ffe6a8', 0.5 * strength);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(w * 0.4, layout.groundY - h * 0.18, Math.min(w, h) * 0.28 * (1.1 - strength * 0.3), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (world.hero.hurtFlash > 0) {
      ctx.save();
      ctx.fillStyle = `rgba(255, 96, 128, ${Math.min(0.16, world.hero.hurtFlash * 0.5)})`;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    if (world.status === 'defeat') {
      ctx.save();
      ctx.fillStyle = 'rgba(10, 6, 20, 0.42)';
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    void realDelta;
  }
}
