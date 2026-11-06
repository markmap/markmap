/** An image ready to draw, with its natural size. */
export interface LoadedImage {
  source: CanvasImageSource;
  width: number;
  height: number;
}

export interface ImageCacheOptions {
  /** Load an image. Defaults to `Image`, which needs a browser. */
  load?: (src: string) => Promise<LoadedImage>;
  /** Called when an image is ready, so the caller can draw again. */
  onLoad?: () => void;
}

function browserLoad(src: string): Promise<LoadedImage> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () =>
      resolve({ source: image, width: image.naturalWidth, height: image.naturalHeight }),
    );
    image.addEventListener('error', () => reject(new Error(`Could not load ${src}`)));
    image.src = src;
  });
}

/**
 * Images for {@link drawPrimitives}, which draws synchronously. Asking for an image
 * starts loading it and returns `undefined` until it is ready. Failures are remembered,
 * so a broken image is not requested on every frame.
 */
export class ImageCache {
  private images = new Map<string, LoadedImage | null>();
  private load: (src: string) => Promise<LoadedImage>;
  private onLoad?: () => void;

  constructor(options: ImageCacheOptions = {}) {
    this.load = options.load ?? browserLoad;
    this.onLoad = options.onLoad;
  }

  get(src: string): LoadedImage | undefined {
    const image = this.images.get(src);
    if (image !== undefined) return image ?? undefined;
    // Marked as missing until it arrives, so it only loads once.
    this.images.set(src, null);
    this.load(src).then(
      (loaded) => {
        this.images.set(src, loaded);
        this.onLoad?.();
      },
      () => {},
    );
    return undefined;
  }
}
