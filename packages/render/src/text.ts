import type {
  AtomRenderer,
  AtomSize,
  ContentPlugin,
  Decoration,
  Inline,
  InlineContext,
  InlineStyler,
  Primitive,
  Size,
  TextRun,
  TextAlign,
  TextStyle,
} from '@markmap/core';

export interface TextLayout extends Size {
  /** Backgrounds, text, strike lines, atoms and link areas, in text coordinates. */
  primitives: Primitive[];
  runs: TextRun[];
  lines: number;
}

export interface TextLayoutOptions {
  style: TextStyle;
  /** Wrap lines longer than this, in px. `0` or less disables wrapping. */
  wrapWidth?: number;
  plugins: readonly ContentPlugin[];
  ctx: InlineContext;
  /** Alignment of lines within the widest one. Defaults to `start`. */
  align?: TextAlign;
}

/** A styled inline node with a decoration; items inside it share the same span object. */
interface Span {
  decoration: Decoration;
  style: TextStyle;
}

interface ItemBase {
  style: TextStyle;
  spans: readonly Span[];
  width: number;
}

type Item =
  | (ItemBase & { kind: 'text'; text: string })
  /** Padding inside a decorated span. */
  | (ItemBase & { kind: 'pad' })
  | (ItemBase & { kind: 'atom'; inline: Inline; renderer: AtomRenderer; size: AtomSize })
  | (ItemBase & { kind: 'newline' });

/** Items with no break opportunity inside. */
interface Unit {
  items: Item[];
  width: number;
  space: boolean;
  newline: boolean;
}

interface Registry {
  styles: Map<string, InlineStyler>;
  atoms: Map<string, AtomRenderer>;
}

function registry(plugins: readonly ContentPlugin[]): Registry {
  const styles = new Map<string, InlineStyler>();
  const atoms = new Map<string, AtomRenderer>();
  for (const plugin of plugins) {
    for (const [type, fn] of Object.entries(plugin.styles ?? {}))
      styles.set(type, fn as InlineStyler);
    for (const [type, fn] of Object.entries(plugin.atoms ?? {}))
      atoms.set(type, fn as AtomRenderer);
  }
  return { styles, atoms };
}

/** Apply plugin transforms to a node's content, in plugin order. */
export function transformContent(plugins: readonly ContentPlugin[], ctx: InlineContext): Inline[] {
  let content = ctx.node.content;
  for (const plugin of plugins) if (plugin.transform) content = plugin.transform(content, ctx.node);
  return content;
}

/** Turn inline content into styled items. Unknown containers pass their children through. */
function flatten(
  content: readonly Inline[],
  base: TextStyle,
  reg: Registry,
  ctx: InlineContext,
): Item[] {
  const items: Item[] = [];
  const text = (value: string, style: TextStyle, spans: readonly Span[]) => {
    // Soft line breaks are spaces; only `break` nodes end a line.
    if (value)
      items.push({ kind: 'text', text: value.replace(/\s*\n\s*/g, ' '), style, spans, width: 0 });
  };
  const visit = (nodes: readonly Inline[], style: TextStyle, spans: readonly Span[]) => {
    for (const node of nodes) {
      const atom = reg.atoms.get(node.type);
      if (atom) {
        const size = atom.measure(node, style, ctx);
        items.push({
          kind: 'atom',
          inline: node,
          renderer: atom,
          size,
          style,
          spans,
          width: size.width,
        });
        continue;
      }
      if (node.type === 'break') {
        items.push({ kind: 'newline', style, spans, width: 0 });
        continue;
      }
      const styler = reg.styles.get(node.type);
      if (styler) {
        const result = styler(node, style, ctx);
        const inner: TextStyle = {
          font: { ...style.font, ...result.font },
          fill: result.fill ?? style.fill,
        };
        const span = result.decoration && { decoration: result.decoration, style: inner };
        const innerSpans = span ? [...spans, span] : spans;
        const padding = result.decoration?.padding ?? 0;
        if (padding) items.push({ kind: 'pad', style: inner, spans: innerSpans, width: padding });
        if ('value' in node) text(node.value, inner, innerSpans);
        else if ('children' in node) visit(node.children as Inline[], inner, innerSpans);
        if (padding) items.push({ kind: 'pad', style: inner, spans: innerSpans, width: padding });
      } else if (node.type === 'image') text(node.alt ?? '', style, spans);
      else if ('value' in node) text(node.value, style, spans);
      else if ('children' in node) visit(node.children as Inline[], style, spans);
    }
  };
  visit(content, base, []);
  return items;
}

const segmenter = new Intl.Segmenter(undefined, { granularity: 'word' });
const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
const CJK = /[⺀-鿿가-힣豈-﫿＀-￯]/u;
/** Characters that must not start a line. */
const NO_BREAK_BEFORE = /^[\p{Pe}\p{Pf}\p{Po}、。，！？]/u;

/** Group items into unbreakable units, using word boundaries and CJK rules. */
function toUnits(items: Item[], ctx: InlineContext): Unit[] {
  const units: Unit[] = [];
  let current: Unit | undefined;
  let prevSpace = true;
  let prevText = '';
  const start = (space: boolean) => {
    current = { items: [], width: 0, space, newline: false };
    units.push(current);
    return current;
  };

  for (const item of items) {
    if (item.kind === 'newline') {
      units.push({ items: [], width: 0, space: false, newline: true });
      current = undefined;
      prevSpace = true;
      continue;
    }
    if (item.kind === 'atom') {
      start(false).items.push(item);
      current!.width = item.width;
      current = undefined;
      prevSpace = true;
      continue;
    }
    if (item.kind === 'pad') {
      const unit = !current || current.space || prevSpace ? start(false) : current;
      unit.items.push(item);
      unit.width += item.width;
      prevSpace = false;
      continue;
    }
    for (const { segment } of segmenter.segment(item.text)) {
      const space = /^\s+$/.test(segment);
      const breakable =
        space ||
        prevSpace ||
        ((CJK.test(segment[0]) || CJK.test(prevText.at(-1) ?? '')) &&
          !NO_BREAK_BEFORE.test(segment));
      const value = space ? ' ' : segment;
      const unit = !current || breakable || current.space ? start(space) : current;
      const width = ctx.measurer.measure(value, item.style.font);
      const last = unit.items.at(-1);
      if (last?.kind === 'text' && last.style === item.style && last.spans === item.spans) {
        last.text += value;
        last.width += width;
      } else unit.items.push({ ...item, text: value, width });
      unit.width += width;
      prevSpace = space;
      prevText = segment;
    }
  }
  return units;
}

/** Break a unit wider than the line into grapheme-sized units. */
function splitUnit(unit: Unit, ctx: InlineContext): Unit[] {
  const result: Unit[] = [];
  for (const item of unit.items) {
    if (item.kind !== 'text') {
      result.push({ items: [item], width: item.width, space: false, newline: false });
      continue;
    }
    for (const { segment } of graphemes.segment(item.text)) {
      const width = ctx.measurer.measure(segment, item.style.font);
      result.push({
        items: [{ ...item, text: segment, width }],
        width,
        space: false,
        newline: false,
      });
    }
  }
  return result;
}

function breakLines(units: Unit[], wrapWidth: number, ctx: InlineContext): Unit[][] {
  const lines: Unit[][] = [[]];
  let lineWidth = 0;
  const push = (unit: Unit) => {
    const line = lines.at(-1)!;
    if (unit.newline) {
      lines.push([]);
      lineWidth = 0;
      return;
    }
    if (unit.space && !line.length) return;
    if (wrapWidth > 0 && !unit.space && line.length && lineWidth + unit.width > wrapWidth) {
      while (line.at(-1)?.space) lineWidth -= line.pop()!.width;
      lines.push([]);
      lineWidth = 0;
      if (unit.width > wrapWidth) return void splitUnit(unit, ctx).forEach(push);
    } else if (wrapWidth > 0 && !line.length && unit.width > wrapWidth) {
      const parts = splitUnit(unit, ctx);
      if (parts.length > 1) return void parts.forEach(push);
    }
    lines.at(-1)!.push(unit);
    lineWidth += unit.width;
  };
  units.forEach(push);
  for (const line of lines) while (line.at(-1)?.space) line.pop();
  return lines;
}

interface Placed {
  item: Item;
  x: number;
}

/** Lay out inline content into runs, decorations and atoms, wrapping at `wrapWidth`. */
export function layoutText(content: readonly Inline[], options: TextLayoutOptions): TextLayout {
  const { style, plugins, ctx } = options;
  const reg = registry(plugins);
  const lines = breakLines(
    toUnits(flatten(content, style, reg, ctx), ctx),
    options.wrapWidth ?? 0,
    ctx,
  );

  const { font } = style;
  const textAscent = (font.lineHeight + font.size * 0.7) / 2;
  const backgrounds: Primitive[] = [];
  const overlays: Primitive[] = [];
  const atoms: Primitive[] = [];
  const links: Primitive[] = [];
  const runs: TextRun[] = [];
  const lineWidths = lines.map((line) =>
    line.reduce((sum, unit) => sum + unit.items.reduce((w, item) => w + item.width, 0), 0),
  );
  const width = Math.max(0, ...lineWidths);
  const alignFactor = { start: 0, center: 0.5, end: 1 }[options.align ?? 'start'];
  let top = 0;

  for (const [index, line] of lines.entries()) {
    const placed: Placed[] = [];
    let x = (width - lineWidths[index]) * alignFactor;
    for (const item of line.flatMap((unit) => unit.items)) {
      placed.push({ item, x });
      x += item.width;
    }

    // Tall atoms push the baseline down and the line taller.
    let ascent = textAscent;
    let descent = font.lineHeight - textAscent;
    for (const { item } of placed) {
      if (item.kind !== 'atom') continue;
      ascent = Math.max(ascent, item.size.baseline);
      descent = Math.max(descent, item.size.height - item.size.baseline);
    }
    const baseline = top + ascent;
    const lineHeight = ascent + descent;

    for (const { item, x: itemX } of placed) {
      if (item.kind === 'text') {
        const last = runs.at(-1);
        if (
          last &&
          last.y === baseline &&
          last.font === item.style.font &&
          last.fill === item.style.fill &&
          last.x + (last.width ?? 0) === itemX
        ) {
          last.text += item.text;
          last.width = (last.width ?? 0) + item.width;
        } else {
          const run: TextRun = {
            text: item.text,
            x: itemX,
            y: baseline,
            font: item.style.font,
            fill: item.style.fill,
            width: item.width,
          };
          runs.push(run);
        }
      } else if (item.kind === 'atom') {
        const box = {
          x: itemX,
          y: baseline - item.size.baseline,
          width: item.size.width,
          height: item.size.height,
        };
        atoms.push(...item.renderer.render(item.inline, box, item.style, ctx));
      }
    }

    // One decoration piece per span per line, covering every item inside the span.
    const extents = new Map<Span, [number, number]>();
    for (const { item, x: itemX } of placed) {
      for (const span of item.spans) {
        const extent = extents.get(span);
        if (extent) extent[1] = itemX + item.width;
        else extents.set(span, [itemX, itemX + item.width]);
      }
    }
    for (const [span, [x0, x1]] of extents) {
      const { decoration: d, style: s } = span;
      if (d.background) {
        backgrounds.push({
          kind: 'rect',
          x: x0,
          y: baseline - s.font.size * 0.95,
          w: x1 - x0,
          h: s.font.size * 1.3,
          r: d.radius,
          fill: d.background,
        });
      }
      if (d.strike) {
        const y = baseline - s.font.size * 0.3;
        overlays.push({
          kind: 'path',
          d: `M${x0},${y}H${x1}`,
          stroke: d.strike,
          strokeWidth: Math.max(1, s.font.size / 14),
        });
      }
      if (d.href) {
        links.push({
          kind: 'link',
          href: d.href,
          rect: { x: x0, y: top, width: x1 - x0, height: lineHeight },
        });
      }
    }
    top += lineHeight;
  }

  const primitives: Primitive[] = [
    ...backgrounds,
    ...(runs.length ? [{ kind: 'text' as const, x: 0, y: 0, runs }] : []),
    ...overlays,
    ...atoms,
    ...links,
  ];
  return { primitives, runs, width, height: top, lines: lines.length };
}
