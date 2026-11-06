import { type Matrix, multiply, type Point, type Primitive, type Rect } from '@markmap/core';
import Flatbush from 'flatbush';

/** What a point in the drawing can act on. */
export type HitTarget =
  | { kind: 'toggle'; nodeId: string }
  /** A `hit` primitive: a view action such as opening notes. */
  | { kind: 'action'; nodeId: string; action: string }
  | { kind: 'link'; nodeId?: string; href: string };

export interface HitIndexOptions {
  /** Fold anchors, in layout coordinates. */
  toggles?: readonly (Point & { nodeId: string })[];
  /** How close to a fold anchor a point must be to hit it. */
  toggleRadius?: number;
  /** Leave out targets of nodes this returns `false` for, such as nodes on their way out. */
  include?: (nodeId: string) => boolean;
}

interface Entry {
  target: HitTarget;
  /** Toggles are circles around this point; everything else is its box. */
  center?: Point;
}

const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

/**
 * Everything clickable in a drawing, in layout coordinates, for any backend. `hit` and
 * `link` primitives are found by walking the primitives (with their group transforms),
 * fold toggles are given as points. Lookups use a static R-tree, so they stay fast for
 * large maps.
 */
export class HitIndex {
  private entries: Entry[] = [];
  private index?: Flatbush;
  private radius: number;

  constructor(primitives: readonly Primitive[], options: HitIndexOptions = {}) {
    const include = options.include ?? (() => true);
    const radius = (this.radius = options.toggleRadius ?? 10);
    const boxes: Rect[] = [];
    const add = (target: HitTarget, box: Rect, center?: Point) => {
      this.entries.push({ target, center });
      boxes.push(box);
    };
    const visit = (list: readonly Primitive[], matrix: Matrix, nodeId?: string) => {
      for (const p of list) {
        if (p.kind === 'group') {
          const id = p.nodeId ?? nodeId;
          if (id && !include(id)) continue;
          visit(p.children, p.transform ? multiply(matrix, p.transform) : matrix, id);
        } else if (p.kind === 'hit' && nodeId) {
          add({ kind: 'action', nodeId, action: p.action }, transformRect(matrix, p.rect));
        } else if (p.kind === 'link') {
          add({ kind: 'link', nodeId, href: p.href }, transformRect(matrix, p.rect));
        }
      }
    };
    visit(primitives, IDENTITY);
    for (const { x, y, nodeId } of options.toggles ?? []) {
      if (!include(nodeId)) continue;
      add(
        { kind: 'toggle', nodeId },
        { x: x - radius, y: y - radius, width: radius * 2, height: radius * 2 },
        { x, y },
      );
    }
    if (!boxes.length) return;
    this.index = new Flatbush(boxes.length);
    for (const box of boxes) this.index.add(box.x, box.y, box.x + box.width, box.y + box.height);
    this.index.finish();
  }

  /**
   * The target at a point in layout coordinates. Actions and links win over fold
   * toggles, and the one drawn last (on top) wins among them; among toggles, the nearest.
   */
  hit(x: number, y: number): HitTarget | undefined {
    if (!this.index) return undefined;
    let top = -1;
    let toggle: { index: number; distance: number } | undefined;
    for (const i of this.index.search(x, y, x, y)) {
      const { center } = this.entries[i];
      if (!center) {
        top = Math.max(top, i);
        continue;
      }
      const distance = Math.hypot(center.x - x, center.y - y);
      if (distance <= this.radius && (!toggle || distance < toggle.distance)) {
        toggle = { index: i, distance };
      }
    }
    const found = top >= 0 ? top : toggle?.index;
    return found == null ? undefined : this.entries[found].target;
  }
}

/** Bounds of `rect` after `matrix`. */
function transformRect([a, b, c, d, e, f]: Matrix, rect: Rect): Rect {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const [x, y] of [
    [rect.x, rect.y],
    [rect.x + rect.width, rect.y],
    [rect.x, rect.y + rect.height],
    [rect.x + rect.width, rect.y + rect.height],
  ]) {
    xs.push(a * x + c * y + e);
    ys.push(b * x + d * y + f);
  }
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}
