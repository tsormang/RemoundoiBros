import { loadImage } from './assets';

type DrawSpriteOptions = {
  x: number;
  y: number;
  size: number;
  flipX?: boolean;
  alpha?: number;
};

export function drawSprite(
  ctx: CanvasRenderingContext2D,
  src: string,
  options: DrawSpriteOptions,
): boolean {
  const image = loadImage(src);

  if (!image.complete || image.naturalWidth === 0) {
    return false;
  }

  const { x, y, size, flipX = false, alpha = 1 } = options;

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);

  if (flipX) {
    ctx.scale(-1, 1);
  }

  ctx.drawImage(image, -size / 2, -size / 2, size, size);
  ctx.restore();
  return true;
}
