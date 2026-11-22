/**
 * Art loading.
 *
 * Character illustrations are delivered on a flat chroma-green backdrop. Rather than shipping
 * cut-outs, the game keys the backdrop out at load time so the source art stays a normal image
 * file and the sprite automatically matches the drawn size.
 */

export interface GameAssets {
  yuzukiSprite: HTMLCanvasElement;
  thornQueenSprite: HTMLCanvasElement;
  meadowBackground: HTMLImageElement;
  yuzukiPortrait: HTMLImageElement;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    image.src = src;
  });
}

/**
 * Remove a flat backdrop colour from an image, despilling green fringing on the remaining edges.
 * Returns a canvas that can be drawn directly.
 */
export function keyOutBackdrop(image: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return canvas;
  ctx.drawImage(image, 0, 0);

  const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = frame.data;

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i]!;
    const g = pixels[i + 1]!;
    const b = pixels[i + 2]!;
    const distance = Math.hypot(r - 0, g - 177, b - 64);
    const greenDominance = g - Math.max(r, b);

    if (distance < 92 || (greenDominance > 64 && distance < 190)) {
      pixels[i + 3] = 0;
    } else if (greenDominance > 24) {
      // Despill: pull the green channel back toward its neighbours so edges do not glow.
      pixels[i + 1] = Math.max(0, Math.round((r + b) / 2 + 12));
    }
  }

  ctx.putImageData(frame, 0, 0);
  return canvas;
}

export async function loadAssets(): Promise<GameAssets> {
  const [sprite, bossSprite, meadowBackground, portrait] = await Promise.all([
    loadImage('./assets/heroes/yuzuki-sprite.jpg'),
    loadImage('./assets/bosses/thorn-queen.jpg'),
    loadImage('./assets/backgrounds/blossom-meadow.jpg'),
    loadImage('./assets/heroes/yuzuki-portrait.jpg'),
  ]);

  return {
    yuzukiSprite: keyOutBackdrop(sprite),
    thornQueenSprite: keyOutBackdrop(bossSprite),
    meadowBackground,
    yuzukiPortrait: portrait,
  };
}
