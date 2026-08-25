/**
 * Slice `Sprites/zagka beach assets.png` into floor tiles, blockers, and the stage thumb.
 * Requires sharp: `npm install --no-save sharp`
 * Usage: `node scripts/extract-zagka-beach.mjs`
 */
import sharp from 'sharp';
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const srcPath = join(root, 'Sprites', 'zagka beach assets.png');
const outSprites = join(root, 'Sprites', 'zagka_beach');
const publicDir = join(root, 'public');

const PROP_FRAME = 384;
const ALPHA_CUTOFF = 20;

const { data, info } = await sharp(srcPath)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const { width, height, channels } = info;

function alphaAt(x, y) {
  return data[(y * width + x) * channels + 3];
}

function isOpaque(x, y) {
  return alphaAt(x, y) > ALPHA_CUTOFF;
}

function bboxInWindow(x0, y0, x1, y1) {
  let minX = x1;
  let minY = y1;
  let maxX = x0 - 1;
  let maxY = y0 - 1;
  let count = 0;

  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      if (!isOpaque(x, y)) continue;
      count += 1;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  if (count === 0) return null;
  return { minX, minY, maxX, maxY, w: maxX - minX + 1, h: maxY - minY + 1, count };
}

function innerOpaqueSquare(box, inset) {
  const left = box.minX + inset;
  const top = box.minY + inset;
  const right = box.maxX - inset;
  const bottom = box.maxY - inset;
  const size = Math.min(right - left + 1, bottom - top + 1);
  if (size < 8) {
    throw new Error('Tile crop too small');
  }
  const x = left + Math.floor((right - left + 1 - size) / 2);
  const y = top + Math.floor((bottom - top + 1 - size) / 2);
  return { left: x, top: y, width: size, height: size };
}

async function saveExtract(crop, dest, { flatten = false } = {}) {
  const fullPath = join(root, dest);
  mkdirSync(dirname(fullPath), { recursive: true });
  let image = sharp(srcPath).extract(crop);
  if (flatten) {
    image = image.flatten({ background: { r: 232, g: 197, b: 90 } });
  }
  await image.png().toFile(fullPath);
  return fullPath;
}

async function extractSquareProp(box, dest, frameSize = PROP_FRAME) {
  const pad = 8;
  const left = Math.max(0, box.minX - pad);
  const top = Math.max(0, box.minY - pad);
  const cropW = Math.min(width - left, box.w + pad * 2);
  const cropH = Math.min(height - top, box.h + pad * 2);
  const sprite = await sharp(srcPath)
    .extract({ left, top, width: cropW, height: cropH })
    .png()
    .toBuffer();

  const maxDim = Math.max(cropW, cropH);
  const scale = Math.min(1, (frameSize - 16) / maxDim);
  const drawW = Math.max(1, Math.round(cropW * scale));
  const drawH = Math.max(1, Math.round(cropH * scale));
  const offsetX = Math.round((frameSize - drawW) / 2);
  const offsetY = Math.round(frameSize - drawH - 6);

  const resized = await sharp(sprite).resize(drawW, drawH).png().toBuffer();
  const fullPath = join(root, dest);
  mkdirSync(dirname(fullPath), { recursive: true });
  await sharp({
    create: {
      width: frameSize,
      height: frameSize,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: resized, left: offsetX, top: offsetY }])
    .png()
    .toFile(fullPath);

  return collisionFromFrame(fullPath, frameSize);
}

async function collisionFromFrame(filePath, frameSize) {
  const { data: frame, info: frameInfo } = await sharp(filePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let minX = frameInfo.width;
  let minY = frameInfo.height;
  let maxX = 0;
  let maxY = 0;

  for (let y = 0; y < frameInfo.height; y += 1) {
    for (let x = 0; x < frameInfo.width; x += 1) {
      if (frame[(y * frameInfo.width + x) * 4 + 3] < 40) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  const opaqueH = maxY - minY + 1;
  const opaqueW = maxX - minX + 1;
  const insetX = Math.round(opaqueW * 0.14);
  const topSkip = Math.round(opaqueH * 0.28);
  const insetBottom = Math.round(opaqueH * 0.06);

  return {
    opaque: {
      x: minX,
      y: minY,
      width: opaqueW,
      height: opaqueH,
    },
    collision: {
      x: minX + insetX,
      y: minY + topSkip,
      width: Math.max(8, opaqueW - insetX * 2),
      height: Math.max(8, opaqueH - topSkip - insetBottom),
    },
    frameSize,
  };
}

const tiles = [
  { id: 'sand_large', window: [0, 0, 710, 655] },
  { id: 'sand_small_tl', window: [710, 0, 1065, 330] },
  { id: 'sand_small_tr', window: [1065, 0, 1536, 330] },
  { id: 'sand_small_bl', window: [710, 320, 1065, 655] },
  { id: 'sand_small_br', window: [1065, 320, 1536, 655] },
];

const props = [
  { id: 'seaweed_green', window: [0, 640, 280, 1024] },
  { id: 'seaweed_teal', window: [270, 640, 550, 1024] },
  { id: 'seaweed_purple', window: [540, 640, 780, 1024] },
  { id: 'tire', window: [770, 680, 1125, 1024] },
  { id: 'rocks', window: [1125, 660, 1536, 1024] },
];

const report = { tiles: [], props: [] };

for (const tile of tiles) {
  const box = bboxInWindow(...tile.window);
  if (!box) throw new Error(`Missing tile ${tile.id}`);
  const crop = innerOpaqueSquare(box, 8);
  await saveExtract(crop, `Sprites/zagka_beach/tiles/${tile.id}.png`, {
    flatten: true,
  });
  report.tiles.push({ id: tile.id, bbox: box, crop });
}

for (const prop of props) {
  const box = bboxInWindow(...prop.window);
  if (!box) throw new Error(`Missing prop ${prop.id}`);
  const meta = await extractSquareProp(
    box,
    `Sprites/zagka_beach/props/prop_beach_${prop.id}.png`,
  );
  report.props.push({ id: prop.id, bbox: box, ...meta });
}

const smallIds = ['sand_small_tl', 'sand_small_tr', 'sand_small_bl', 'sand_small_br'];
const smallMeta = await sharp(join(outSprites, 'tiles', 'sand_small_tl.png')).metadata();
const smallSize = smallMeta.width;
const smallBuffers = [];
for (const id of smallIds) {
  smallBuffers.push(
    await sharp(join(outSprites, 'tiles', `${id}.png`))
      .resize(smallSize, smallSize)
      .png()
      .toBuffer(),
  );
}

await sharp({
  create: {
    width: smallSize * 2,
    height: smallSize * 2,
    channels: 3,
    background: { r: 232, g: 197, b: 90 },
  },
})
  .composite([
    { input: smallBuffers[0], left: 0, top: 0 },
    { input: smallBuffers[1], left: smallSize, top: 0 },
    { input: smallBuffers[2], left: 0, top: smallSize },
    { input: smallBuffers[3], left: smallSize, top: smallSize },
  ])
  .png()
  .toFile(join(outSprites, 'tiles', 'sand_small_mosaic.png'));

mkdirSync(join(publicDir, 'assets', 'backgrounds'), { recursive: true });
await sharp(join(outSprites, 'tiles', 'sand_small_mosaic.png'))
  .resize(512, 512)
  .png()
  .toFile(join(publicDir, 'assets', 'backgrounds', 'background_zagka_beach_floor_tile.png'));

const propPublic = join(publicDir, 'assets', 'sprites', 'props', 'beach_blockers');
mkdirSync(propPublic, { recursive: true });
const propFiles = [
  ['seaweed_green', 'prop_beach_seaweed_green.png'],
  ['seaweed_teal', 'prop_beach_seaweed_teal.png'],
  ['seaweed_purple', 'prop_beach_seaweed_purple.png'],
  ['tire', 'prop_beach_tire.png'],
  ['rocks', 'prop_beach_rocks.png'],
];
for (const [id, file] of propFiles) {
  copyFileSync(join(outSprites, 'props', `prop_beach_${id}.png`), join(propPublic, file));
}

const thumbFloor = await sharp(join(outSprites, 'tiles', 'sand_large.png'))
  .resize(256, 256)
  .png()
  .toBuffer();
const rocksThumb = await sharp(join(outSprites, 'props', 'prop_beach_rocks.png'))
  .resize(158, 158)
  .png()
  .toBuffer();
const seaweedThumb = await sharp(join(outSprites, 'props', 'prop_beach_seaweed_green.png'))
  .resize(118, 118)
  .png()
  .toBuffer();
const tireThumb = await sharp(join(outSprites, 'props', 'prop_beach_tire.png'))
  .resize(100, 100)
  .png()
  .toBuffer();

mkdirSync(join(publicDir, 'assets', 'ui', 'stages'), { recursive: true });
await sharp(thumbFloor)
  .composite([
    { input: seaweedThumb, left: 4, top: 108 },
    { input: tireThumb, left: 78, top: 148 },
    { input: rocksThumb, left: 98, top: 92 },
  ])
  .png()
  .toFile(join(publicDir, 'assets', 'ui', 'stages', 'stage_zagka_beach_thumb.png'));

writeFileSync(join(outSprites, 'extract_report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
