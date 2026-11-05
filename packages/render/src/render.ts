import {
  type ContentPlugin,
  hashString,
  type Measurer,
  type MarkmapNode,
  type NodeContext,
  type Primitive,
  type Rect,
  type Size,
  type Theme,
  translate,
  unionRects,
} from '@markmap/core';
import { type LayoutNode, type LayoutResult, layoutTree, visibleNodes } from './layout';
import { defaultContentPlugins } from './content';
import { layoutText, type TextLayout, transformContent } from './text';
import { classicTheme } from './themes/classic';

export interface RenderOptions {
  measurer: Measurer;
  theme?: Theme;
  /** Ids of collapsed nodes. */
  folded?: ReadonlySet<string>;
  /** Wrap labels wider than this, in px. `0` disables wrapping. */
  maxWidth?: number;
  spacingHorizontal?: number;
  spacingVertical?: number;
  /** Inline content renderers. Defaults to {@link defaultContentPlugins}. */
  plugins?: readonly ContentPlugin[];
  /** Nodes deeper than this level (the root is level 1) share their ancestor's color. `0` disables. */
  colorFreezeLevel?: number;
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
}

export interface MeasuredNode {
  text: TextLayout;
  box: Size;
}

/** Number of `--mm-branch-<n>` colors a theme defines, at least 1. */
export function paletteSize(theme: Theme): number {
  return Math.max(
    1,
    Object.keys(theme.tokens).filter((name) => /^mm-branch-\d+$/.test(name)).length,
  );
}

/**
 * Branch color index of every node: a hash of the node id, so colors stay put as the
 * tree changes. With `colorFreezeLevel`, deeper nodes reuse their ancestor's color.
 */
export function computeBranches(
  root: MarkmapNode,
  theme: Theme,
  colorFreezeLevel = 0,
): Map<string, number> {
  const size = paletteSize(theme);
  const branches = new Map<string, number>();
  const visit = (node: MarkmapNode, depth: number, frozen?: number) => {
    const branch = frozen ?? Number.parseInt(hashString(node.id), 36) % size;
    branches.set(node.id, branch);
    // Level n is depth n - 1; its children inherit its color.
    const freeze = colorFreezeLevel > 0 && depth >= colorFreezeLevel - 1 ? branch : undefined;
    for (const child of node.children) visit(child, depth + 1, freeze);
  };
  visit(root, 0);
  return branches;
}

/** Measure the label and box of every visible node. */
export function measureTree(root: MarkmapNode, options: RenderOptions): Map<string, MeasuredNode> {
  const theme = options.theme ?? classicTheme;
  const [top, right, bottom, left] = theme.node.padding;
  const result = new Map<string, MeasuredNode>();
  const branches = computeBranches(root, theme, options.colorFreezeLevel);
  const depths = new Map<MarkmapNode, number>([[root, 0]]);
  for (const node of visibleNodes(root, options.folded)) {
    const depth = depths.get(node)!;
    for (const child of node.children) depths.set(child, depth + 1);
    const plugins = options.plugins ?? defaultContentPlugins;
    const inlineCtx = { theme, measurer: options.measurer, node };
    const text = layoutText(transformContent(plugins, inlineCtx), {
      style: { font: theme.font, fill: theme.textFill },
      maxWidth: options.maxWidth,
      plugins,
      ctx: inlineCtx,
    });
    const ctx: NodeContext = {
      depth,
      branch: branches.get(node.id)!,
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
  const branches = computeBranches(root, theme, options.colorFreezeLevel);
  const contexts = new Map<string, NodeContext>();
  const contextOf = (item: LayoutNode): NodeContext => {
    let ctx = contexts.get(item.node.id);
    if (!ctx) {
      ctx = {
        depth: item.depth,
        branch: branches.get(item.node.id)!,
        hasChildren: item.node.children.length > 0,
        folded: item.folded,
      };
      contexts.set(item.node.id, ctx);
    }
    return ctx;
  };
  const layout = layoutTree(root, {
    sizes: new Map([...measured].map(([id, { box }]) => [id, box])),
    folded: options.folded,
    spacingHorizontal: options.spacingHorizontal,
    spacingVertical: options.spacingVertical,
    anchor: (rect, role, item) => theme.node.anchor(rect, role, contextOf(item)),
  });

  const edges: Primitive[] = layout.edges.map((edge) => ({
    kind: 'group',
    key: `edge:${edge.target.node.id}`,
    nodeId: edge.target.node.id,
    children: theme.edge.render(edge.from, edge.to, {
      source: edge.source.node,
      target: edge.target.node,
      node: contextOf(edge.target),
    }),
  }));

  const [top, , , left] = theme.node.padding;
  const nodes: Primitive[] = layout.nodes.map((item) => {
    const { text } = measured.get(item.node.id)!;
    return {
      kind: 'group',
      key: `node:${item.node.id}`,
      nodeId: item.node.id,
      transform: translate(item.rect.x, item.rect.y),
      children: [
        ...theme.node.render(
          item.node,
          { width: item.rect.width, height: item.rect.height },
          contextOf(item),
        ),
        { kind: 'group', transform: translate(left, top), children: text.primitives },
      ],
    };
  });

  const primitives = [...edges, ...nodes];
  const bounds = unionRects([layout.bounds, primitiveBounds(primitives)]);
  for (const item of layout.nodes) contextOf(item);
  return { theme, layout, primitives, bounds, contexts };
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
