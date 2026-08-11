import type { Vec2, Rect } from './types';

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function distanceSquared(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

export function normalize(vector: Vec2): Vec2 {
  const length = Math.hypot(vector.x, vector.y);

  if (length <= 0.0001) {
    return { x: 0, y: 0 };
  }

  return {
    x: vector.x / length,
    y: vector.y / length,
  };
}

export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function randomInt(min: number, max: number): number {
  return Math.floor(randomRange(min, max + 1));
}

export function circleIntersectsRect(
  center: Vec2,
  radius: number,
  rect: Rect,
): boolean {
  const closestX = clamp(center.x, rect.x, rect.x + rect.width);
  const closestY = clamp(center.y, rect.y, rect.y + rect.height);
  const dx = center.x - closestX;
  const dy = center.y - closestY;
  return dx * dx + dy * dy <= radius * radius;
}

export function rectsOverlap(a: Rect, b: Rect, padding = 0): boolean {
  return !(
    a.x + a.width + padding <= b.x ||
    b.x + b.width + padding <= a.x ||
    a.y + a.height + padding <= b.y ||
    b.y + b.height + padding <= a.y
  );
}

export function rotateVector(vector: Vec2, radians: number): Vec2 {
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return {
    x: vector.x * cos - vector.y * sin,
    y: vector.x * sin + vector.y * cos,
  };
}

export function reflectVector(velocity: Vec2, normal: Vec2): Vec2 {
  const dot = velocity.x * normal.x + velocity.y * normal.y;
  return {
    x: velocity.x - 2 * dot * normal.x,
    y: velocity.y - 2 * dot * normal.y,
  };
}

export function findDensestClusterCenter(
  positions: Vec2[],
  clusterRadius: number,
): Vec2 | null {
  if (positions.length === 0) {
    return null;
  }

  const radiusSquared = clusterRadius * clusterRadius;
  let bestCenter = positions[0];
  let bestCount = 0;

  for (const candidate of positions) {
    let count = 0;

    for (const other of positions) {
      if (distanceSquared(candidate, other) <= radiusSquared) {
        count += 1;
      }
    }

    if (count > bestCount) {
      bestCount = count;
      bestCenter = candidate;
    }
  }

  return bestCenter;
}
