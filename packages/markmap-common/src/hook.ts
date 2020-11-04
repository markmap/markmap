export class Hook<T extends (...args: any[]) => void> {
  protected listeners: T[] = [];

  tap(fn: T): () => void {
    this.listeners.push(fn);
    return () => this.revoke(fn);
  }

  revoke(fn: T): void {
    const i = this.listeners.indexOf(fn);
    if (i >= 0) this.listeners.splice(i, 1);
  }

  revokeAll(): void {
    this.listeners.splice(0);
  }

  call(...args: Parameters<T>): void {
    for (const fn of this.listeners) {
      fn(...args);
    }
  }
}
