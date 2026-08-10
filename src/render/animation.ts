export type SpriteAnimation = {
  frames: string[];
  frameDuration: number;
};

export function getAnimationFrame(
  animation: SpriteAnimation,
  elapsedSeconds: number,
): string {
  if (animation.frames.length === 0) {
    return '';
  }

  if (animation.frames.length === 1 || animation.frameDuration <= 0) {
    return animation.frames[0];
  }

  const frameIndex =
    Math.floor(elapsedSeconds / animation.frameDuration) %
    animation.frames.length;

  return animation.frames[frameIndex];
}
