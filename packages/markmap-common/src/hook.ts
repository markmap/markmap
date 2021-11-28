export type HookCallback<T extends any[]> = (...args: T) => void;

export class Hook<T extends any[]> {
  protected listeners: Array<HookCallback<T>> = [];

  tap(fn: HookCallback<T>): () => void {
    this.listeners.push(fn);
    return () => this.revoke(fn);
  }

  revoke(fn: HookCallback<T>): void {
    const i = this.listeners.indexOf(fn);
    if (i >= 0) this.listeners.splice(i, 1);
  }

  revokeAll(): void {
    this.listeners.splice(0);
  }

  call(...args: T): void {
    for (const fn of this.listeners) {
      fn(...args);
    }
  }
}
