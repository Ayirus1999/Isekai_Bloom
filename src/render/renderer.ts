import { GROUND_Y, VIEW_H, VIEW_W } from '../game/constants';
import type { World } from '../game/world';
import type { GameAssets } from './assets';
import { drawBackground } from './background';
import { drawHero } from './hero';

interface Petal {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  spin: number;
  angle: number;
  tint: string;
}

/** Canvas renderer: fixed 1280x720 logical space, scaled by device pixel ratio for crispness. */
export class Renderer {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly petals: Petal[] = [];

  constructor(
    canvas: HTMLCanvasElement,
    private readonly assets: GameAssets,
  ) {
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = VIEW_W * ratio;
    canvas.height = VIEW_H * ratio;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    this.ctx = ctx;
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    this.seedPetals();
  }

  private seedPetals(): void {
    const tints = ['#ffd7e8', '#ffeaf4', '#d9c8ff', '#fff2c9'];
    for (let i = 0; i < 34; i += 1) {
      this.petals.push({
        x: Math.random() * VIEW_W,
        y: Math.random() * VIEW_H,
        vx: -12 - Math.random() * 22,
        vy: 10 + Math.random() * 20,
        size: 2.4 + Math.random() * 3.4,
        spin: 0.4 + Math.random() * 0.9,
        angle: Math.random() * Math.PI * 2,
        tint: tints[i % tints.length]!,
      });
    }
  }

  draw(world: World, realTime: number, realDelta: number): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    drawBackground(ctx, this.assets.meadowBackground, world.cameraX, realTime);
    this.drawPetals(realDelta);

    drawHero(ctx, world.hero, this.assets.yuzukiSprite, world.cameraX, realTime);

    if (world.hero.hp <= 0) {
      ctx.save();
      ctx.fillStyle = 'rgba(10, 6, 20, 0.45)';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.restore();
    }

    this.drawGroundLine();
  }

  private drawPetals(delta: number): void {
    const ctx = this.ctx;
    ctx.save();
    for (const petal of this.petals) {
      petal.x += petal.vx * delta;
      petal.y += petal.vy * delta;
      petal.angle += petal.spin * delta;
      if (petal.x < -20) petal.x = VIEW_W + 20;
      if (petal.y > VIEW_H + 20) {
        petal.y = -20;
        petal.x = Math.random() * VIEW_W;
      }
      ctx.save();
      ctx.translate(petal.x, petal.y);
      ctx.rotate(petal.angle);
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = petal.tint;
      ctx.beginPath();
      ctx.ellipse(0, 0, petal.size, petal.size * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  private drawGroundLine(): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 238, 205, 0.28)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y + 12);
    ctx.lineTo(VIEW_W, GROUND_Y + 12);
    ctx.stroke();
    ctx.restore();
  }
}
