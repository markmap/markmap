import { IWrapContext, IDeferred } from './types';

const uniqId = Math.random().toString(36).slice(2, 8);
let globalIndex = 0;
export function getId(): string {
  globalIndex += 1;
  return `mm-${uniqId}-${globalIndex}`;
}

export function noop(): void {
  // noop
}

export function walkTree<T>(
  tree: T,
  callback: (item: T, next: () => void, parent?: T) => void,
  key = 'c'
): void {
  const walk = (item: T, parent?: T): void =>
    callback(
      item,
      () => {
        item[key]?.forEach((child: T) => {
          walk(child, item);
        });
      },
      parent
    );
  walk(tree);
}

export function arrayFrom<T>(arrayLike: ArrayLike<T>): T[] {
  if (Array.from) return Array.from(arrayLike);
  const array = [];
  for (let i = 0; i < arrayLike.length; i += 1) {
    array.push(arrayLike[i]);
  }
  return array;
}

export function flatMap<T, U>(
  arrayLike: ArrayLike<T>,
  callback: (item?: T, index?: number, thisObj?: ArrayLike<T>) => U | U[]
): U[] {
  if ((arrayLike as Array<T>).flatMap)
    return (arrayLike as Array<T>).flatMap(callback);
  const array = [];
  for (let i = 0; i < arrayLike.length; i += 1) {
    const result = callback(arrayLike[i], i, arrayLike);
    if (Array.isArray(result)) array.push(...result);
    else array.push(result);
  }
  return array;
}

export function addClass(className: string, ...rest: string[]): string {
  const classList = (className || '').split(' ').filter(Boolean);
  rest.forEach((item) => {
    if (item && classList.indexOf(item) < 0) classList.push(item);
  });
  return classList.join(' ');
}

export function childSelector<T extends Element>(
  filter?: string | ((el: T) => boolean)
): () => T[] {
  if (typeof filter === 'string') {
    const tagName = filter;
    filter = (el: T): boolean => el.tagName === tagName;
  }
  const filterFn = filter;
  return function selector(): T[] {
    let nodes = arrayFrom((this as HTMLElement).childNodes as NodeListOf<T>);
    if (filterFn) nodes = nodes.filter((node) => filterFn(node));
    return nodes;
  };
}

export function wrapFunction<T extends (...args: any[]) => any>(
  fn: T,
  {
    before,
    after,
  }: {
    before?: (ctx: IWrapContext<T>) => void;
    after?: (ctx: IWrapContext<T>) => void;
  }
): T {
  return function wrapped(...args: Parameters<T>) {
    const ctx: IWrapContext<T> = {
      args,
      thisObj: this,
    };
    try {
      if (before) before(ctx);
    } catch {
      // ignore
    }
    ctx.result = fn.apply(ctx.thisObj, ctx.args);
    try {
      if (after) after(ctx);
    } catch {
      // ignore
    }
    return ctx.result;
  } as T;
}

export function defer<T>(): IDeferred<T> {
  const obj: any = {};
  obj.promise = new Promise<T>((resolve, reject) => {
    obj.resolve = resolve;
    obj.reject = reject;
  });
  return obj as IDeferred<T>;
}

export function memoize<T extends (...args: any[]) => any>(fn: T): T {
  const cache = {};
  return function memoized(...args: any[]): T {
    const key = `${args[0]}`;
    let data = cache[key];
    if (!data) {
      data = {
        value: fn(...args),
      };
      cache[key] = data;
    }
    return data.value;
  } as T;
}
