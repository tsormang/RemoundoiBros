import { loadImage } from './assets';

type DrawSpriteOptions = {
  x: number;
  y: number;
  size?: number;
  width?: number;
  height?: number;
  flipX?: boolean;
  rotation?: number;
  anchorX?: number;
  anchorY?: number;
  alpha?: number;
  smooth?: boolean;
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

  const {
    x,
    y,
    size = 0,
    flipX = false,
    rotation = 0,
    anchorX = 0.5,
    anchorY = 0.5,
    alpha = 1,
    smooth = false,
  } = options;
  const width = options.width ?? size;
  const height = options.height ?? size;

  if (width <= 0 || height <= 0) {
    return false;
  }

  ctx.save();
  ctx.imageSmoothingEnabled = smooth;
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);

  if (rotation !== 0) {
    ctx.rotate(rotation);
  }

  if (flipX) {
    ctx.scale(-1, 1);
  }

  ctx.drawImage(image, -width * anchorX, -height * anchorY, width, height);
  ctx.restore();
  return true;
}
