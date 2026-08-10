import type { BlockerDefinition, BlockerId, Rect } from './types';

const base = '/assets/sprites/props/kids_toys_blockers';
const FRAME_SIZE = 128;
const DRAW_SIZE = 96;
const scale = DRAW_SIZE / FRAME_SIZE;

function scaledBox(
  x: number,
  y: number,
  width: number,
  height: number,
): Rect {
  return {
    x: x * scale,
    y: y * scale,
    width: width * scale,
    height: height * scale,
  };
}

export const blockerDefinitions: Record<BlockerId, BlockerDefinition> = {
  'toy-blocks-pile': {
    id: 'toy-blocks-pile',
    src: `${base}/prop_toy_blocks_pile.png`,
    drawSize: DRAW_SIZE,
    collision: scaledBox(17, 18, 94, 91),
  },
  'toy-chest-open': {
    id: 'toy-chest-open',
    src: `${base}/prop_toy_chest_open.png`,
    drawSize: DRAW_SIZE,
    collision: scaledBox(6, 13, 116, 102),
  },
  'cushion-stack': {
    id: 'cushion-stack',
    src: `${base}/prop_cushion_stack.png`,
    drawSize: DRAW_SIZE,
    collision: scaledBox(13, 22, 101, 84),
  },
  'toy-truck': {
    id: 'toy-truck',
    src: `${base}/prop_toy_truck.png`,
    drawSize: DRAW_SIZE,
    collision: scaledBox(16, 23, 96, 82),
  },
  'stacking-rings-pile': {
    id: 'stacking-rings-pile',
    src: `${base}/prop_stacking_rings_pile.png`,
    drawSize: DRAW_SIZE,
    collision: scaledBox(17, 21, 94, 85),
  },
  'block-fort-wall': {
    id: 'block-fort-wall',
    src: `${base}/prop_block_fort_wall.png`,
    drawSize: DRAW_SIZE,
    collision: scaledBox(13, 24, 102, 80),
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
