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

export function walkTree<T extends { children?: T[] }, U = void>(
  tree: T,
  callback: (item: T, next: () => U[] | undefined, parent?: T) => U,
): U {
  const walk = (item: T, parent?: T): U =>
    callback(
      item,
      () => item.children?.map((child: T) => walk(child, item)),
      parent,
    );
  return walk(tree);
}

export function addClass(className: string, ...rest: string[]): string {
  const classList = (className || '').split(' ').filter(Boolean);
  rest.forEach((item) => {
    if (item && classList.indexOf(item) < 0) classList.push(item);
  });
  return classList.join(' ');
}

export function wrapFunction<T extends unknown[], U>(
  fn: (...args: T) => U,
  wrapper: (fn: (...args: T) => U, ...args: T) => U,
) {
  return (...args: T) => wrapper(fn, ...args);
}

export function defer<T = void>() {
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

export function debounce<T extends unknown[], U>(
  fn: (...args: T) => U,
  time: number,
) {
  const state: {
    timer: number;
    result?: U;
    args?: T;
  } = {
    timer: 0,
  };
  function reset() {
    if (state.timer) {
      window.clearTimeout(state.timer);
      state.timer = 0;
    }
  }
  function run() {
    reset();
    if (state.args) state.result = fn(...state.args);
  }
  return function debounced(...args: T) {
    reset();
    state.args = args;
    state.timer = window.setTimeout(run, time);
    return state.result;
  };
}
