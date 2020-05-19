export class Hook<T extends (...args: any[]) => void> {
  protected listeners: T[] = [];

  tap(fn: T): void {
    this.listeners.push(fn);
  }

  call(...args: Parameters<T>): void {
    for (const fn of this.listeners) {
      fn(...args);
    }
  }
}
