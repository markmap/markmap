import { describe, expect, it } from 'vitest';
import { type Scheduler, Tween } from './tween';

function fakeScheduler() {
  let time = 0;
  let queue = new Map<number, () => void>();
  let next = 1;
  const scheduler: Scheduler = {
    now: () => time,
    request: (callback) => {
      queue.set(next, callback);
      return next++;
    },
    cancel: (handle) => void queue.delete(handle),
  };
  const advance = (ms: number) => {
    time += ms;
    const callbacks = [...queue.values()];
    queue = new Map();
    for (const callback of callbacks) callback();
  };
  return { scheduler, advance, pending: () => queue.size };
}

describe('Tween', () => {
  it('reports progress on each frame and ends at exactly 1', () => {
    const { scheduler, advance } = fakeScheduler();
    const tween = new Tween(scheduler);
    const seen: number[] = [];
    tween.start(100, (t) => seen.push(t));
    advance(0);
    advance(40);
    advance(100);
    advance(10);
    expect(seen).toEqual([0, 0.4, 1]);
    expect(tween.running).toBe(false);
  });

  it('stops the previous animation when a new one starts', () => {
    const { scheduler, advance, pending } = fakeScheduler();
    const tween = new Tween(scheduler);
    const first: number[] = [];
    tween.start(100, (t) => first.push(t));
    tween.start(100, () => {});
    expect(pending()).toBe(1);
    advance(50);
    expect(first).toEqual([]);
  });

  it('finishes at once with a zero duration', () => {
    const { scheduler, pending } = fakeScheduler();
    const seen: number[] = [];
    new Tween(scheduler).start(0, (t) => seen.push(t));
    expect(seen).toEqual([1]);
    expect(pending()).toBe(0);
  });
});
