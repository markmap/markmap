/** An image ready to draw, with its natural size. */
export interface LoadedImage {
  source: CanvasImageSource;
  width: number;
  height: number;
}

export interface ImageCacheOptions {
  /** Load an image. Defaults to `Image`, which needs a browser. */
  load?: (src: string) => Promise<LoadedImage>;
  /**
   * CORS mode of the default loader. `anonymous` keeps the canvas readable, so it can
   * be exported, and images from servers that do not allow it fail to load.
   */
  crossOrigin?: 'anonymous' | 'use-credentials';
  /** Called when an image is ready, so the caller can draw again. */
  onLoad?: () => void;
}

function browserLoad(src: string, crossOrigin?: string): Promise<LoadedImage> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    if (crossOrigin) image.crossOrigin = crossOrigin;
    image.addEventListener('load', () =>
      resolve({ source: image, width: image.naturalWidth, height: image.naturalHeight }),
    );
    image.addEventListener('error', () => reject(new Error(`Could not load ${src}`)));
    image.src = src;
  });
}

/**
 * Images for {@link drawPrimitives}, which draws synchronously. Asking for an image
 * starts loading it, and gives `undefined` until it is ready. Failures are remembered as
 * `null`, so a broken image is not requested on every frame.
 */
export class ImageCache {
  private images = new Map<string, LoadedImage | null>();
  private loading = new Map<string, Promise<void>>();
  private load: (src: string) => Promise<LoadedImage>;
  private onLoad?: () => void;

  constructor(options: ImageCacheOptions = {}) {
    this.load = options.load ?? ((src) => browserLoad(src, options.crossOrigin));
    this.onLoad = options.onLoad;
  }

  get(src: string): LoadedImage | null | undefined {
    const image = this.images.get(src);
    if (image === undefined) void this.start(src);
    return image;
  }

  /** Settles once all these images are loaded or have failed. */
  async preload(sources: Iterable<string>): Promise<void> {
    await Promise.all(Array.from(sources, (src) => this.start(src)));
  }

  private start(src: string): Promise<void> {
    let task = this.loading.get(src);
    if (!task) {
      task = this.load(src).then(
        (loaded) => {
          this.images.set(src, loaded);
          this.onLoad?.();
        },
        () => {
          this.images.set(src, null);
          // Worth redrawing too: the image's fallback shows now.
          this.onLoad?.();
        },
      );
      this.loading.set(src, task);
    }
    return task;
  }
}
