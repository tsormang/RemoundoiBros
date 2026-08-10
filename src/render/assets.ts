const imageCache = new Map<string, HTMLImageElement>();

export function loadImage(src: string): HTMLImageElement {
  const cached = imageCache.get(src);

  if (cached) {
    return cached;
  }

  const image = new Image();
  image.decoding = 'async';
  image.src = src;
  imageCache.set(src, image);
  return image;
}

export function preloadImages(sources: string[]): Promise<void[]> {
  return Promise.all(
    sources.map(
      (src) =>
        new Promise<void>((resolve) => {
          const image = loadImage(src);

          if (image.complete && image.naturalWidth > 0) {
            resolve();
            return;
          }

          image.addEventListener('load', () => resolve(), { once: true });
          image.addEventListener('error', () => resolve(), { once: true });
        }),
    ),
  );
}
