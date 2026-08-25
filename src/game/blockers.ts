import type { BlockerDefinition, BlockerId, Rect } from './types';

const kidsBase = '/assets/sprites/props/kids_toys_blockers';
const beachBase = '/assets/sprites/props/beach_blockers';
const KIDS_FRAME_SIZE = 128;
const KIDS_DRAW_SIZE = 96;
const BEACH_FRAME_SIZE = 384;
const BEACH_DRAW_SIZE = 112;

function scaledBox(
  x: number,
  y: number,
  width: number,
  height: number,
  frameSize: number,
  drawSize: number,
): Rect {
  const scale = drawSize / frameSize;
  return {
    x: x * scale,
    y: y * scale,
    width: width * scale,
    height: height * scale,
  };
}

function kidsBox(x: number, y: number, width: number, height: number): Rect {
  return scaledBox(x, y, width, height, KIDS_FRAME_SIZE, KIDS_DRAW_SIZE);
}

function beachBox(x: number, y: number, width: number, height: number): Rect {
  return scaledBox(x, y, width, height, BEACH_FRAME_SIZE, BEACH_DRAW_SIZE);
}

export const blockerDefinitions: Record<BlockerId, BlockerDefinition> = {
  'toy-blocks-pile': {
    id: 'toy-blocks-pile',
    src: `${kidsBase}/prop_toy_blocks_pile.png`,
    drawSize: KIDS_DRAW_SIZE,
    collision: kidsBox(17, 18, 94, 91),
  },
  'toy-chest-open': {
    id: 'toy-chest-open',
    src: `${kidsBase}/prop_toy_chest_open.png`,
    drawSize: KIDS_DRAW_SIZE,
    collision: kidsBox(6, 13, 116, 102),
  },
  'cushion-stack': {
    id: 'cushion-stack',
    src: `${kidsBase}/prop_cushion_stack.png`,
    drawSize: KIDS_DRAW_SIZE,
    collision: kidsBox(13, 22, 101, 84),
  },
  'toy-truck': {
    id: 'toy-truck',
    src: `${kidsBase}/prop_toy_truck.png`,
    drawSize: KIDS_DRAW_SIZE,
    collision: kidsBox(16, 23, 96, 82),
  },
  'stacking-rings-pile': {
    id: 'stacking-rings-pile',
    src: `${kidsBase}/prop_stacking_rings_pile.png`,
    drawSize: KIDS_DRAW_SIZE,
    collision: kidsBox(17, 21, 94, 85),
  },
  'block-fort-wall': {
    id: 'block-fort-wall',
    src: `${kidsBase}/prop_block_fort_wall.png`,
    drawSize: KIDS_DRAW_SIZE,
    collision: kidsBox(13, 24, 102, 80),
  },
  'beach-seaweed-green': {
    id: 'beach-seaweed-green',
    src: `${beachBase}/prop_beach_seaweed_green.png`,
    drawSize: BEACH_DRAW_SIZE,
    collision: beachBox(109, 125, 166, 225),
    fallbackColor: '#7cbc3a',
  },
  'beach-seaweed-teal': {
    id: 'beach-seaweed-teal',
    src: `${beachBase}/prop_beach_seaweed_teal.png`,
    drawSize: BEACH_DRAW_SIZE,
    collision: beachBox(106, 122, 172, 227),
    fallbackColor: '#2fa39a',
  },
  'beach-seaweed-purple': {
    id: 'beach-seaweed-purple',
    src: `${beachBase}/prop_beach_seaweed_purple.png`,
    drawSize: BEACH_DRAW_SIZE,
    collision: beachBox(124, 145, 137, 206),
    fallbackColor: '#c44ec4',
  },
  'beach-tire': {
    id: 'beach-tire',
    src: `${beachBase}/prop_beach_tire.png`,
    drawSize: BEACH_DRAW_SIZE,
    collision: beachBox(74, 158, 237, 194),
    fallbackColor: '#4a4a4a',
  },
  'beach-rocks': {
    id: 'beach-rocks',
    src: `${beachBase}/prop_beach_rocks.png`,
    drawSize: BEACH_DRAW_SIZE,
    collision: beachBox(65, 155, 254, 198),
    fallbackColor: '#7a7a7a',
  },
};

export const blockerIds = Object.keys(blockerDefinitions) as BlockerId[];

export function getBlockerDefinition(id: BlockerId): BlockerDefinition {
  return blockerDefinitions[id];
}

export function allBlockerSpriteSources(): string[] {
  return Object.values(blockerDefinitions).map((blocker) => blocker.src);
}

export function getBlockerWorldRect(
  position: { x: number; y: number },
  definition: BlockerDefinition,
): Rect {
  const left = position.x - definition.drawSize / 2;
  const top = position.y - definition.drawSize / 2;

  return {
    x: left + definition.collision.x,
    y: top + definition.collision.y,
    width: definition.collision.width,
    height: definition.collision.height,
  };
}
