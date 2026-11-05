/** Clock and frame source, injectable for tests. */
export interface Scheduler {
  now(): number;
  request(callback: () => void): number;
  cancel(handle: number): void;
}

export const animationFrames: Scheduler = {
  now: () => performance.now(),
  request: (callback) => requestAnimationFrame(callback),
  cancel: (handle) => cancelAnimationFrame(handle),
};

/**
 * Runs one animation at a time: starting a new one stops the previous one, so callers
 * restart from whatever they last drew.
 */
export class Tween {
  private handle?: number;

  constructor(private scheduler: Scheduler = animationFrames) {}

  get running(): boolean {
    return this.handle != null;
  }

  /**
   * Call `frame` with progress from 0 to 1 on every animation frame for `duration` ms.
   * The last call is always exactly 1. A duration of 0 calls `frame(1)` right away.
   */
  start(duration: number, frame: (t: number) => void): void {
    this.stop();
    if (duration <= 0) {
      frame(1);
      return;
    }
    const start = this.scheduler.now();
    const tick = () => {
      const t = Math.min(1, (this.scheduler.now() - start) / duration);
      this.handle = t < 1 ? this.scheduler.request(tick) : undefined;
      frame(t);
    };
    this.handle = this.scheduler.request(tick);
  }

  stop(): void {
    if (this.handle == null) return;
    this.scheduler.cancel(this.handle);
    this.handle = undefined;
  }
}
