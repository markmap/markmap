import { IDeferred } from './types';

const uniqId = Math.random().toString(36).slice(2, 8);
let globalIndex = 0;
export function getId(): string {
  globalIndex += 1;
  return `mm-${uniqId}-${globalIndex}`;
}

export function noop(): void {
  // noop
}

export function walkTree<T extends { children?: T[] }>(
  tree: T,
  callback: (item: T, next: () => void, parent?: T) => void,
): void {
  const walk = (item: T, parent?: T): void =>
    callback(
      item,
      () => {
        item.children?.forEach((child: T) => {
          walk(child, item);
        });
      },
      parent,
    );
  walk(tree);
}

export function addClass(className: string, ...rest: string[]): string {
  const classList = (className || '').split(' ').filter(Boolean);
  rest.forEach((item) => {
    if (item && classList.indexOf(item) < 0) classList.push(item);
  });
  return classList.join(' ');
}

export function childSelector<T extends Element>(
  filter?: string | ((el: T) => boolean),
): () => T[] {
  if (typeof filter === 'string') {
    const tagName = filter;
    filter = (el: T): boolean => el.tagName === tagName;
  }
  const filterFn = filter;
  return function selector(this: HTMLElement): T[] {
    let nodes = Array.from(this.childNodes as NodeListOf<T>);
    if (filterFn) nodes = nodes.filter((node) => filterFn(node));
    return nodes;
  };
}

export function wrapFunction<T extends unknown[], U>(
  fn: (...args: T) => U,
  wrapper: (fn: (...args: T) => U, ...args: T) => U,
) {
  return (...args: T) => wrapper(fn, ...args);
}

export function defer<T>() {
  const obj: Partial<IDeferred<T>> = {};
  obj.promise = new Promise<T>((resolve, reject) => {
    obj.resolve = resolve;
    obj.reject = reject;
  });
  return obj as IDeferred<T>;
}

export function memoize<T extends unknown[], U>(fn: (...args: T) => U) {
  const cache: Record<string, Record<'value', U>> = {};
  return function memoized(...args: T) {
    const key = `${args[0]}`;
    let data = cache[key];
    if (!data) {
      data = {
        value: fn(...args),
      };
      cache[key] = data;
    }
    return data.value;
  };
}
