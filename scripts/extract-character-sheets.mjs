/**
 * Slice character sprite sheets into individual transparent frames.
 * Requires sharp: `npm install --no-save sharp`
 * Usage: `node scripts/extract-character-sheets.mjs`
 */
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const publicDir = join(root, 'public');
const ALPHA = 24;

const sheets = [
  {
    id: 'lago_large',
    src: join(root, 'Sprites', 'Lago_large.png'),
    merge: 8,
    expected: 5,
    flop: true,
    pad: 10,
    targetWalkDraw: 80,
    outputs: [
      { dest: 'assets/sprites/enemies/large_lago/enemy_large_lago_walk_01.png', index: 0 },
      { dest: 'assets/sprites/enemies/large_lago/enemy_large_lago_walk_02.png', index: 1 },
      { dest: 'assets/sprites/enemies/large_lago/enemy_large_lago_walk_03.png', index: 2 },
      { dest: 'assets/sprites/enemies/large_lago/enemy_large_lago_walk_04.png', index: 3 },
      { dest: 'assets/sprites/enemies/large_lago/enemy_large_lago_hit_01.png', index: 4 },
    ],
  },
  {
    id: 'lago_small',
    src: join(root, 'Sprites', 'Lago_small.png'),
    merge: 16,
    expected: 14,
    flop: true,
    pad: 10,
    targetWalkDraw: 52,
    outputs: [
      { dest: 'assets/sprites/enemies/small_lago/enemy_small_lago_walk_01.png', index: 0 },
      { dest: 'assets/sprites/enemies/small_lago/enemy_small_lago_walk_02.png', index: 1 },
      { dest: 'assets/sprites/enemies/small_lago/enemy_small_lago_walk_03.png', index: 2 },
      { dest: 'assets/sprites/enemies/small_lago/enemy_small_lago_walk_04.png', index: 3 },
      { dest: 'assets/sprites/enemies/small_lago/enemy_small_lago_walk_05.png', index: 4 },
      { dest: 'assets/sprites/enemies/small_lago/enemy_small_lago_hit_01.png', index: 11 },
    ],
  },
  {
    id: 'grandpa',
    src: join(root, 'Sprites', 'Grandpa.png'),
    merge: 8,
    expected: 6,
    flop: false,
    pad: 12,
    targetWalkDraw: 136,
    outputs: [
      { dest: 'assets/sprites/enemies/boss_grandpa/boss_grandpa_walk_01.png', index: 0 },
      { dest: 'assets/sprites/enemies/boss_grandpa/boss_grandpa_walk_02.png', index: 1 },
      { dest: 'assets/sprites/enemies/boss_grandpa/boss_grandpa_walk_03.png', index: 2 },
      { dest: 'assets/sprites/enemies/boss_grandpa/boss_grandpa_walk_04.png', index: 3 },
      { dest: 'assets/sprites/enemies/boss_grandpa/boss_grandpa_hit_01.png', index: 4 },
      { dest: 'assets/sprites/enemies/boss_grandpa/boss_grandpa_tell_01.png', index: 5 },
    ],
  },
  {
    id: 'sissy',
    src: join(root, 'Sprites', 'Sissi.png'),
    merge: 8,
    expected: 7,
    flop: false,
    pad: 12,
    targetWalkDraw: 128,
    outputs: [
      { dest: 'assets/sprites/enemies/boss_sissy/boss_sissy_walk_01.png', index: 0 },
      { dest: 'assets/sprites/enemies/boss_sissy/boss_sissy_walk_02.png', index: 1 },
      { dest: 'assets/sprites/enemies/boss_sissy/boss_sissy_hit_01.png', index: 4 },
      { dest: 'assets/sprites/enemies/boss_sissy/boss_sissy_tell_01.png', index: 5 },
      { dest: 'assets/sprites/enemies/boss_sissy/boss_sissy_attack_01.png', index: 6 },
    ],
  },
];

function find(parent, a) {
  while (parent[a] !== a) {
    parent[a] = parent[parent[a]];
    a = parent[a];
  }
  return a;
}

function union(parent, a, b) {
  a = find(parent, a);
  b = find(parent, b);
  if (a !== b) {
    parent[b] = a;
  }
}

function findSpriteBoxes(data, width, height, merge, expected) {
  const n = width * height;
  const original = new Uint8Array(n);
  for (let i = 0; i < n; i += 1) {
    original[i] = data[i * 4 + 3] > ALPHA ? 1 : 0;
  }

  const dilated = original.slice();
  if (merge > 0) {
    const copy = original.slice();
    const mergeSq = merge * merge;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (!copy[y * width + x]) continue;
        const y0 = Math.max(0, y - merge);
        const y1 = Math.min(height - 1, y + merge);
        const x0 = Math.max(0, x - merge);
        const x1 = Math.min(width - 1, x + merge);
        for (let yy = y0; yy <= y1; yy += 1) {
          const dy = yy - y;
          for (let xx = x0; xx <= x1; xx += 1) {
            const dx = xx - x;
            if (dx * dx + dy * dy > mergeSq) continue;
            dilated[yy * width + xx] = 1;
          }
        }
      }
    }
  }

  const parent = new Int32Array(n).fill(-1);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = y * width + x;
      if (!dilated[i]) continue;
      parent[i] = i;
      if (x > 0 && dilated[i - 1]) union(parent, i, i - 1);
      if (y > 0 && dilated[i - width]) union(parent, i, i - width);
    }
  }

  const boxes = new Map();
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = y * width + x;
      if (!original[i] || parent[i] < 0) continue;
      const rootId = find(parent, i);
      let box = boxes.get(rootId);
      if (!box) {
        box = { minX: x, minY: y, maxX: x, maxY: y, count: 0 };
        boxes.set(rootId, box);
      }
      box.minX = Math.min(box.minX, x);
      box.minY = Math.min(box.minY, y);
      box.maxX = Math.max(box.maxX, x);
      box.maxY = Math.max(box.maxY, y);
      box.count += 1;
    }
  }

  const list = [...boxes.values()].filter((box) => box.count > 80);
  while (list.length > expected) {
    list.sort((a, b) => a.count - b.count);
    const small = list.shift();
    let nearest = list[0];
    let nearestDist = Infinity;
    const scx = (small.minX + small.maxX) / 2;
    const scy = (small.minY + small.maxY) / 2;
    for (const other of list) {
      const ocx = (other.minX + other.maxX) / 2;
      const ocy = (other.minY + other.maxY) / 2;
      const dist = (scx - ocx) ** 2 + (scy - ocy) ** 2;
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = other;
      }
    }
    nearest.minX = Math.min(nearest.minX, small.minX);
    nearest.minY = Math.min(nearest.minY, small.minY);
    nearest.maxX = Math.max(nearest.maxX, small.maxX);
    nearest.maxY = Math.max(nearest.maxY, small.maxY);
    nearest.count += small.count;
  }

  if (list.length !== expected) {
    throw new Error(`Expected ${expected} sprites, found ${list.length}`);
  }

  separateOverlaps(list);
  list.sort((a, b) => a.minY - b.minY || a.minX - b.minX);
  const rows = [];
  for (const box of list) {
    const cy = (box.minY + box.maxY) / 2;
    const last = rows[rows.length - 1];
    if (last && Math.abs(cy - last.cy) < 140) {
      last.boxes.push(box);
      last.cy = (last.cy * (last.boxes.length - 1) + cy) / last.boxes.length;
    } else {
      rows.push({ cy, boxes: [box] });
    }
  }
  for (const row of rows) {
    row.boxes.sort((a, b) => a.minX - b.minX);
  }
  return rows.flatMap((row) => row.boxes);
}

function boxesOverlap(a, b) {
  return a.minX < b.maxX && b.minX < a.maxX && a.minY < b.maxY && b.minY < a.maxY;
}

function separateOverlaps(boxes) {
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const a = boxes[i];
      const b = boxes[j];
      if (!boxesOverlap(a, b)) continue;

      const overlapW = Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX);
      const overlapH = Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY);
      if (overlapW <= overlapH) {
        const mid = Math.floor((Math.min(a.maxX, b.maxX) + Math.max(a.minX, b.minX)) / 2);
        if (a.minX < b.minX) {
          a.maxX = Math.min(a.maxX, mid);
          b.minX = Math.max(b.minX, mid + 1);
        } else {
          b.maxX = Math.min(b.maxX, mid);
          a.minX = Math.max(a.minX, mid + 1);
        }
      } else {
        const mid = Math.floor((Math.min(a.maxY, b.maxY) + Math.max(a.minY, b.minY)) / 2);
        if (a.minY < b.minY) {
          a.maxY = Math.min(a.maxY, mid);
          b.minY = Math.max(b.minY, mid + 1);
        } else {
          b.maxY = Math.min(b.maxY, mid);
          a.minY = Math.max(a.minY, mid + 1);
        }
      }
    }
  }
}

function padBox(box, pad, width, height) {
  const minX = Math.max(0, box.minX - pad);
  const minY = Math.max(0, box.minY - pad);
  const maxX = Math.min(width - 1, box.maxX + pad);
  const maxY = Math.min(height - 1, box.maxY + pad);
  return {
    left: minX,
    top: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

async function saveSquareFrame(sprite, frameSize, dest, flop) {
  const source = flop ? await sharp(sprite).flop().png().toBuffer() : sprite;
  const meta = await sharp(source).metadata();
  const left = Math.round((frameSize - meta.width) / 2);
  const top = Math.round((frameSize - meta.height) / 2);
  const fullPath = join(publicDir, dest);
  mkdirSync(dirname(fullPath), { recursive: true });
  await sharp({
    create: {
      width: frameSize,
      height: frameSize,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: source, left, top }])
    .png()
    .toFile(fullPath);
  return fullPath;
}

const report = {};

for (const sheet of sheets) {
  const { data, info } = await sharp(sheet.src)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const boxes = findSpriteBoxes(
    data,
    info.width,
    info.height,
    sheet.merge,
    sheet.expected,
  );

  const usedBoxes = sheet.outputs.map((output) => boxes[output.index]);
  const frameSize =
    Math.ceil(
      (Math.max(
        ...usedBoxes.map((box) =>
          Math.max(box.maxX - box.minX + 1, box.maxY - box.minY + 1),
        ),
      ) +
        sheet.pad * 2) /
        8,
    ) * 8;

  const walkBoxes = sheet.outputs
    .filter((output) => output.dest.includes('_walk_'))
    .map((output) => boxes[output.index]);
  const walkBody = Math.max(
    ...walkBoxes.map((box) =>
      Math.max(box.maxX - box.minX + 1, box.maxY - box.minY + 1),
    ),
  );

  report[sheet.id] = {
    frameSize,
    walkBody,
    suggestedDrawSize: Math.round(sheet.targetWalkDraw * (frameSize / walkBody)),
    frames: [],
  };

  for (const output of sheet.outputs) {
    const box = boxes[output.index];
    const crop = padBox(box, sheet.pad, info.width, info.height);
    const sprite = await sharp(sheet.src).extract(crop).png().toBuffer();
    await saveSquareFrame(sprite, frameSize, output.dest, sheet.flop);
    report[sheet.id].frames.push({
      dest: output.dest,
      index: output.index,
      bbox: box,
      crop,
    });
  }
}

const reportPath = join(root, 'Sprites', 'character_sheets_extract_report.json');
writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
