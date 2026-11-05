import {
  type ContentPlugin,
  type FrameNode,
  type Layout,
  type LayoutNode,
  type LayoutResult,
  oppositeSide,
  type Measurer,
  type MarkmapNode,
  type MeasureContext,
  type NodeContext,
  type Primitive,
  type Rect,
  type Size,
  type Theme,
  translate,
  unionRects,
} from '@markmap/core';
import { treeLayout, visibleNodes } from './layouts/tree';
import { defaultContentPlugins } from './content';
import { layoutText, type TextLayout, transformContent } from './text';
import { classicTheme } from './themes/classic';

export interface RenderOptions {
  measurer: Measurer;
  theme?: Theme;
  /** Where nodes go. Defaults to {@link treeLayout}. */
  layout?: Layout;
  /** Ids of collapsed nodes. */
  folded?: ReadonlySet<string>;
  /** Wrap labels wider than this, in px. `0` disables wrapping. */
  maxWidth?: number;
  spacingHorizontal?: number;
  spacingVertical?: number;
  /** Inline content renderers. Defaults to {@link defaultContentPlugins}. */
  plugins?: readonly ContentPlugin[];
}

export interface RenderResult {
  theme: Theme;
  layout: LayoutResult;
  /** Edges first, then nodes, so nodes draw on top. */
  primitives: Primitive[];
  /** Area covered by the drawing, including strokes and fold circles. */
  bounds: Rect;
  /** Theme context of every visible node, by id. */
  contexts: Map<string, NodeContext>;
  /** The final frame, as a starting point for animations. */
  state: DrawState;
}

export interface MeasuredNode {
  text: TextLayout;
  box: Size;
}

/** Ids from the root to every node, both included. */
export function nodePaths(root: MarkmapNode): Map<string, readonly string[]> {
  const paths = new Map<string, readonly string[]>();
  const visit = (node: MarkmapNode, parent: readonly string[]) => {
    const path = [...parent, node.id];
    paths.set(node.id, path);
    for (const child of node.children) visit(child, path);
  };
  visit(root, []);
  return paths;
}

/** Measure the label and box of every visible node. */
export function measureTree(root: MarkmapNode, options: RenderOptions): Map<string, MeasuredNode> {
  const theme = options.theme ?? classicTheme;
  const [top, right, bottom, left] = theme.node.padding;
  const result = new Map<string, MeasuredNode>();
  const paths = nodePaths(root);
  for (const node of visibleNodes(root, options.folded)) {
    const path = paths.get(node.id)!;
    const depth = path.length - 1;
    const plugins = options.plugins ?? defaultContentPlugins;
    const inlineCtx = { theme, measurer: options.measurer, node };
    const text = layoutText(transformContent(plugins, inlineCtx), {
      style: { font: theme.font, fill: theme.textFill },
      maxWidth: options.maxWidth,
      plugins,
      ctx: inlineCtx,
    });
    const ctx: MeasureContext = {
      depth,
      path,
      hasChildren: node.children.length > 0,
      folded: !!options.folded?.has(node.id),
    };
    const box = theme.node.measure
      ? theme.node.measure(text, node, ctx)
      : {
          width: text.width + left + right,
          height: Math.max(text.height + top + bottom, theme.node.minHeight ?? 0),
        };
    result.set(node.id, { text, box });
  }
  return result;
}

/** Measure, lay out and draw a tree as backend-neutral primitives. */
export function renderTree(root: MarkmapNode, options: RenderOptions): RenderResult {
  const theme = options.theme ?? classicTheme;
  const measured = measureTree(root, options);
  const paths = nodePaths(root);
  const contexts = new Map<string, NodeContext>();
  const contextOf = (item: LayoutNode): NodeContext => {
    let ctx = contexts.get(item.node.id);
    if (!ctx) {
      ctx = {
        depth: item.depth,
        path: paths.get(item.node.id)!,
        hasChildren: item.node.children.length > 0,
        folded: item.folded,
        direction: item.direction,
      };
      contexts.set(item.node.id, ctx);
    }
    return ctx;
  };
  const layout = (options.layout ?? treeLayout).layout(root, {
    sizes: new Map([...measured].map(([id, { box }]) => [id, box])),
    folded: options.folded,
    spacingHorizontal: options.spacingHorizontal,
    spacingVertical: options.spacingVertical,
  });

  const state: DrawState = {
    nodes: layout.nodes.map((item) => ({
      node: item.node,
      parentId: item.parent?.node.id,
      rect: item.rect,
      ctx: contextOf(item),
      text: measured.get(item.node.id)!.text,
      presence: 1,
    })),
  };
  const primitives = drawState(state, theme);
  const bounds = unionRects([layout.bounds, primitiveBounds(primitives)]);
  return { theme, layout, primitives, bounds, contexts, state };
}

/** A node as drawn in one frame: final, or somewhere along an animation. */
export interface DrawNode extends FrameNode {
  /** Parent in the same state; nodes without one get no edge. */
  parentId?: string;
  text: TextLayout;
}

/** Everything needed to draw one frame. Parents come before their children. */
export interface DrawState {
  nodes: DrawNode[];
}

/**
 * Draw a state as primitives: edges first, then nodes, each in a keyed group so
 * backends can patch them. Edge anchors come from the theme, so animating node rects
 * moves edges along with them.
 */
export function drawState(state: DrawState, theme: Theme): Primitive[] {
  const byId = new Map(state.nodes.map((item) => [item.node.id, item]));
  const edges: Primitive[] = [];
  for (const target of state.nodes) {
    const source = target.parentId ? byId.get(target.parentId) : undefined;
    if (!source) continue;
    edges.push({
      kind: 'group',
      key: `edge:${target.node.id}`,
      nodeId: target.node.id,
      ...(target.presence < 1 && { opacity: target.presence }),
      children: theme.edge.render(
        theme.node.anchor(source.rect, target.ctx.direction, source.ctx),
        theme.node.anchor(target.rect, oppositeSide(target.ctx.direction), target.ctx),
        { source: source.node, target: target.node, node: target.ctx },
      ),
    });
  }

  const [top, , , left] = theme.node.padding;
  const nodes: Primitive[] = state.nodes.map((item) => ({
    kind: 'group',
    key: `node:${item.node.id}`,
    nodeId: item.node.id,
    transform: translate(item.rect.x, item.rect.y),
    ...(item.presence < 1 && { opacity: item.presence }),
    children: [
      ...theme.node.render(
        item.node,
        { width: item.rect.width, height: item.rect.height },
        item.ctx,
      ),
      { kind: 'group', transform: translate(left, top), children: item.text.primitives },
    ],
  }));
  return [...edges, ...nodes];
}

/** Absolute points of a path made of `M`, `L`, `H`, `V` and `C` commands. */
function pathPoints(d: string): [number, number][] {
  const points: [number, number][] = [];
  let [x, y] = [0, 0];
  for (const [, cmd, args] of d.matchAll(/([MLHVC])([^MLHVC]*)/g)) {
    const values = args.match(/-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi)?.map(Number) ?? [];
    if (cmd === 'H') for (const v of values) points.push([(x = v), y]);
    else if (cmd === 'V') for (const v of values) points.push([x, (y = v)]);
    else
      for (let i = 0; i + 1 < values.length; i += 2)
        points.push([(x = values[i]), (y = values[i + 1])]);
  }
  return points;
}

/**
 * Bounding box of rects, paths and images, including stroke widths. Curve control
 * points are included, so curves give a safe over-estimate. Text is not included:
 * it sits inside node boxes, which callers add from the layout.
 */
export function primitiveBounds(primitives: Primitive[]): Rect {
  const rects: Rect[] = [];
  const visit = (items: Primitive[], dx: number, dy: number) => {
    for (const p of items) {
      if (p.kind === 'group') {
        const [, , , , e, f] = p.transform ?? translate(0, 0);
        visit(p.children, dx + e, dy + f);
      } else if (p.kind === 'rect' || p.kind === 'image') {
        const s = p.kind === 'rect' ? strokeOf(p) : 0;
        rects.push({ x: dx + p.x - s, y: dy + p.y - s, width: p.w + 2 * s, height: p.h + 2 * s });
      } else if (p.kind === 'path') {
        const s = strokeOf(p);
        for (const [x, y] of pathPoints(p.d)) {
          rects.push({ x: dx + x - s, y: dy + y - s, width: 2 * s, height: 2 * s });
        }
      }
    }
  };
  visit(primitives, 0, 0);
  return unionRects(rects);
}

function strokeOf(p: { stroke?: string; strokeWidth?: number }): number {
  return p.stroke ? (p.strokeWidth ?? 1) / 2 : 0;
}
