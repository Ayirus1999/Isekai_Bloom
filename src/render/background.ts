import { ARENA_WIDTH, GROUND_Y, VIEW_H, VIEW_W } from '../game/constants';

interface Flower {
  x: number;
  scale: number;
  hue: number;
  sway: number;
}

/** Deterministic meadow dressing so the ground looks planted rather than random every frame. */
function buildFlowers(): Flower[] {
  const flowers: Flower[] = [];
  let seed = 1337;
  const rand = (): number => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let x = 40; x < ARENA_WIDTH; x += 26) {
    flowers.push({
      x: x + rand() * 18,
      scale: 0.6 + rand() * 0.9,
      hue: rand(),
      sway: rand() * Math.PI * 2,
    });
  }
  return flowers;
}

const FLOWERS = buildFlowers();

export function drawBackground(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  cameraX: number,
  time: number,
): void {
  const sky = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  sky.addColorStop(0, '#b9d8f6');
  sky.addColorStop(0.45, '#e8d8f4');
  sky.addColorStop(1, '#f7e4d6');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // Parallax: the backdrop slides slower than the arena so the meadow gains depth.
  const scale = (VIEW_H + 30) / image.naturalHeight;
  const drawW = image.naturalWidth * scale;
  const travel = Math.max(0, drawW - VIEW_W);
  const progress = cameraX / Math.max(1, ARENA_WIDTH - VIEW_W);
  ctx.globalAlpha = 0.98;
  ctx.drawImage(image, -progress * travel, -12, drawW, VIEW_H + 30);
  ctx.globalAlpha = 1;

  // Warm haze so characters read clearly against the painted background.
  const haze = ctx.createLinearGradient(0, VIEW_H * 0.42, 0, VIEW_H);
  haze.addColorStop(0, 'rgba(20, 14, 34, 0)');
  haze.addColorStop(1, 'rgba(20, 14, 34, 0.55)');
  ctx.fillStyle = haze;
  ctx.fillRect(0, VIEW_H * 0.42, VIEW_W, VIEW_H * 0.58);

  // Ground: a soft gradient rather than a hard band so the painted meadow stays visible.
  const ground = ctx.createLinearGradient(0, GROUND_Y - 64, 0, VIEW_H);
  ground.addColorStop(0, 'rgba(120, 172, 120, 0)');
  ground.addColorStop(0.28, 'rgba(104, 158, 108, 0.42)');
  ground.addColorStop(0.62, 'rgba(74, 126, 88, 0.74)');
  ground.addColorStop(1, 'rgba(34, 68, 54, 0.92)');
  ctx.fillStyle = ground;
  ctx.fillRect(0, GROUND_Y - 64, VIEW_W, VIEW_H - GROUND_Y + 64);

  const halo = ctx.createLinearGradient(0, GROUND_Y - 60, 0, GROUND_Y + 10);
  halo.addColorStop(0, 'rgba(255, 226, 196, 0)');
  halo.addColorStop(1, 'rgba(255, 226, 196, 0.22)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, GROUND_Y - 60, VIEW_W, 70);

  // Flowers, in world space so they scroll with the ground.
  for (const flower of FLOWERS) {
    const screenX = flower.x - cameraX;
    if (screenX < -20 || screenX > VIEW_W + 20) continue;
    const sway = Math.sin(time * 1.1 + flower.sway) * 2.4;
    const y = GROUND_Y + 4 + (flower.scale - 0.6) * 26;
    const petal = flower.hue > 0.72 ? '#ffe6a8' : flower.hue > 0.4 ? '#ffc7dd' : '#efd6ff';
    ctx.fillStyle = petal;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.ellipse(screenX + sway, y, 2.6 * flower.scale, 4.4 * flower.scale, sway * 0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(88, 152, 104, 0.8)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(screenX + sway, y + 4);
    ctx.lineTo(screenX + sway * 0.4, y + 12);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}
