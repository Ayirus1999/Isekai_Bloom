import type { WorldDef } from '../game/types';
import { hexToRgba } from './hero';

interface Mote {
  x: number;
  y: number;
  radius: number;
  speed: number;
  phase: number;
  tint: string;
}

const MOTE_TINTS: Record<string, string[]> = {
  meadow: ['#ffd2e6', '#fff0c9', '#d9c8ff'],
  forest: ['#9ff5d2', '#c9a6ff', '#f4ffb8'],
  crystal: ['#cfefff', '#ffffff', '#a6c8ff'],
  ember: ['#ffb27a', '#ff7a5c', '#ffe0a8'],
  celestial: ['#ffe6a8', '#d9c8ff', '#ffffff'],
};

const moteCache = new Map<string, Mote[]>();

function motesFor(motif: WorldDef['motif']): Mote[] {
  const cached = moteCache.get(motif);
  if (cached) return cached;
  const tints = MOTE_TINTS[motif] ?? MOTE_TINTS.meadow!;
  let seed = 9187;
  const rand = (): number => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const list: Mote[] = [];
  for (let i = 0; i < 46; i += 1) {
    list.push({
      x: rand(),
      y: rand(),
      radius: 1.2 + rand() * 2.8,
      speed: 4 + rand() * 14,
      phase: rand() * Math.PI * 2,
      tint: tints[i % tints.length]!,
    });
  }
  moteCache.set(motif, list);
  return list;
}

function hill(ctx: CanvasRenderingContext2D, w: number, groundY: number, color: string, lift: number, phase: number): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-40, groundY + 20);
  for (let x = -40; x <= w + 40; x += 40) {
    const y = groundY - lift - Math.sin(x * 0.004 + phase) * lift * 0.45 - Math.cos(x * 0.0017 + phase) * lift * 0.3;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(w + 40, groundY + 40);
  ctx.closePath();
  ctx.fill();
}

/**
 * World backdrop. Drawn directly in CSS pixels so it fills any aspect ratio; the actors are then
 * drawn in the fixed logical arena on top of it.
 */
export function drawWorldBackdrop(
  ctx: CanvasRenderingContext2D,
  world: WorldDef,
  w: number,
  h: number,
  groundY: number,
  time: number,
): void {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, world.skyTop);
  sky.addColorStop(0.62, world.skyBottom);
  sky.addColorStop(1, world.skyTop);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // Moon / sun disc
  ctx.save();
  ctx.globalAlpha = 0.5;
  const disc = ctx.createRadialGradient(w * 0.72, h * 0.18, 4, w * 0.72, h * 0.18, Math.min(w, h) * 0.3);
  disc.addColorStop(0, hexToRgba(world.accent, 0.9));
  disc.addColorStop(0.25, hexToRgba(world.accent, 0.22));
  disc.addColorStop(1, hexToRgba(world.accent, 0));
  ctx.fillStyle = disc;
  ctx.fillRect(w * 0.32, 0, w * 0.8, h * 0.7);
  ctx.restore();

  switch (world.motif) {
    case 'meadow': {
      hill(ctx, w, groundY, hexToRgba('#8fd6a0', 0.32), h * 0.18, 1.2);
      hill(ctx, w, groundY, hexToRgba('#5ea87a', 0.45), h * 0.11, 2.6);
      // distant blossom trees
      for (let i = 0; i < 7; i += 1) {
        const x = (i / 6) * w + Math.sin(i * 2.7) * 20;
        const size = h * (0.05 + (i % 3) * 0.012);
        ctx.fillStyle = hexToRgba('#7c5a8f', 0.35);
        ctx.fillRect(x - size * 0.16, groundY - size * 2.2, size * 0.32, size * 2.2);
        ctx.fillStyle = hexToRgba('#ffc3dd', 0.38);
        ctx.beginPath();
        ctx.arc(x, groundY - size * 2.5, size * 1.05, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'forest': {
      for (let i = 0; i < 9; i += 1) {
        const x = (i / 8) * w;
        const trunkW = w * 0.012;
        ctx.fillStyle = hexToRgba('#0b1622', 0.55);
        ctx.fillRect(x - trunkW / 2, groundY - h * 0.55, trunkW, h * 0.55);
        ctx.fillStyle = hexToRgba('#0e2230', 0.55);
        ctx.beginPath();
        ctx.ellipse(x, groundY - h * 0.52, w * 0.07, h * 0.16, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      for (let i = 0; i < 5; i += 1) {
        const x = w * (0.12 + i * 0.19);
        const y = groundY - h * 0.02;
        ctx.fillStyle = hexToRgba('#b7ffd9', 0.28);
        ctx.beginPath();
        ctx.ellipse(x, y, w * 0.03, h * 0.03, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'crystal': {
      for (let i = 0; i < 11; i += 1) {
        const x = (i / 10) * w;
        const height = h * (0.08 + ((i * 7) % 5) * 0.035);
        ctx.fillStyle = hexToRgba(i % 2 ? '#bfe9ff' : '#8fb8f0', 0.3);
        ctx.beginPath();
        ctx.moveTo(x - w * 0.02, groundY);
        ctx.lineTo(x, groundY - height);
        ctx.lineTo(x + w * 0.025, groundY);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }
    case 'ember': {
      hill(ctx, w, groundY, hexToRgba('#4a1830', 0.65), h * 0.2, 0.4);
      ctx.fillStyle = hexToRgba('#2a0f1a', 0.7);
      ctx.beginPath();
      ctx.moveTo(w * 0.12, groundY);
      ctx.lineTo(w * 0.32, groundY - h * 0.28);
      ctx.lineTo(w * 0.42, groundY);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = hexToRgba('#ff7a4d', 0.28);
      ctx.beginPath();
      ctx.moveTo(w * 0.3, groundY - h * 0.26);
      ctx.lineTo(w * 0.34, groundY);
      ctx.lineTo(w * 0.25, groundY);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'celestial': {
      for (let i = 0; i < 5; i += 1) {
        const x = w * (0.12 + i * 0.2);
        const height = h * 0.24;
        ctx.strokeStyle = hexToRgba('#ffe6a8', 0.24);
        ctx.lineWidth = Math.max(1.5, w * 0.004);
        ctx.beginPath();
        ctx.moveTo(x, groundY);
        ctx.lineTo(x, groundY - height);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, groundY - height, w * 0.012, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.strokeStyle = hexToRgba('#ffe6a8', 0.18);
      ctx.beginPath();
      ctx.arc(w * 0.5, groundY - h * 0.34, w * 0.16, Math.PI, Math.PI * 2);
      ctx.stroke();
      break;
    }
    default:
      break;
  }

  // Ground
  const ground = ctx.createLinearGradient(0, groundY - 30, 0, h);
  ground.addColorStop(0, world.ground);
  ground.addColorStop(0.35, world.groundDark);
  ground.addColorStop(1, '#0b0a16');
  ctx.fillStyle = ground;
  ctx.fillRect(0, groundY - 10, w, h - groundY + 10);

  // Warm rim where the arena meets the sky, keeping fighters readable.
  const rim = ctx.createLinearGradient(0, groundY - 70, 0, groundY + 24);
  rim.addColorStop(0, 'rgba(255, 240, 220, 0)');
  rim.addColorStop(0.8, hexToRgba(world.accent, 0.16));
  rim.addColorStop(1, hexToRgba(world.accent, 0.04));
  ctx.fillStyle = rim;
  ctx.fillRect(0, groundY - 70, w, 94);

  // Drifting motes
  for (const mote of motesFor(world.motif)) {
    const y = ((mote.y * h + time * mote.speed) % (h + 40)) - 20;
    const x = mote.x * w + Math.sin(time * 0.6 + mote.phase) * 14;
    ctx.globalAlpha = 0.34 + Math.sin(time * 1.4 + mote.phase) * 0.16;
    ctx.fillStyle = mote.tint;
    ctx.beginPath();
    ctx.ellipse(x, y, mote.radius, mote.radius * 0.55, mote.phase, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Darkened top and bottom keep the HUD legible without hiding the stage.
  const topFade = ctx.createLinearGradient(0, 0, 0, h * 0.22);
  topFade.addColorStop(0, 'rgba(6, 5, 14, 0.72)');
  topFade.addColorStop(1, 'rgba(6, 5, 14, 0)');
  ctx.fillStyle = topFade;
  ctx.fillRect(0, 0, w, h * 0.22);

  const bottomFade = ctx.createLinearGradient(0, groundY + 40, 0, h);
  bottomFade.addColorStop(0, 'rgba(6, 5, 14, 0)');
  bottomFade.addColorStop(1, 'rgba(6, 5, 14, 0.8)');
  ctx.fillStyle = bottomFade;
  ctx.fillRect(0, groundY + 40, w, h - groundY - 40);
}
