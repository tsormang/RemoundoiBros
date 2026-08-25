const imageCache = new Map<string, HTMLImageElement>();

function stripQuery(src: string): string {
  return src.split('?')[0];
}

export function invalidateImageCache(src?: string): void {
  if (src) {
    imageCache.delete(stripQuery(src));
    return;
  }

  imageCache.clear();
}

export function loadImage(src: string, reload = false): HTMLImageElement {
  const cacheKey = stripQuery(src);

  if (reload) {
    imageCache.delete(cacheKey);
  }

  const cached = imageCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const image = new Image();
  image.decoding = 'async';
  image.src = reload ? `${cacheKey}?v=${Date.now()}` : src;
  imageCache.set(cacheKey, image);
  return image;
}

function waitForImage(image: HTMLImageElement): Promise<void> {
  return new Promise<void>((resolve) => {
    if (image.complete && image.naturalWidth > 0) {
      resolve();
      return;
    }

    image.addEventListener('load', () => resolve(), { once: true });
    image.addEventListener('error', () => resolve(), { once: true });
  });
}

export async function preloadImagesWithProgress(
  sources: string[],
  onProgress?: (loaded: number, total: number) => void,
  reloadSources?: string[],
): Promise<void> {
  const uniqueSources = [...new Set(sources.filter(Boolean))];
  const reloadSet = new Set(reloadSources?.map(stripQuery));
  const total = uniqueSources.length;
  let loaded = 0;

  onProgress?.(loaded, total);

  await Promise.all(
    uniqueSources.map(async (src) => {
      const reload = reloadSet.has(stripQuery(src));
      await waitForImage(loadImage(src, reload));
      loaded += 1;
      onProgress?.(loaded, total);
    }),
  );
}

export function preloadImages(sources: string[]): Promise<void> {
  return preloadImagesWithProgress(sources);
}
