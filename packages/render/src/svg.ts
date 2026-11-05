import { expandRect, type Primitive, type Rect, type TextRun, type Theme } from '@markmap/core';
import type { RenderResult } from './render';

export interface SVGStringOptions {
  /** Space around the drawing, in px. */
  padding?: number;
  /** Fill the background with `--mm-bg`. */
  background?: boolean;
}

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ESCAPES[char]);
}

const num = (value: number) => String(Math.round(value * 100) / 100);

function attrs(values: Record<string, string | number | undefined>): string {
  let result = '';
  for (const [name, value] of Object.entries(values)) {
    if (value == null || value === '') continue;
    result += ` ${name}="${escapeXml(typeof value === 'number' ? num(value) : value)}"`;
  }
  return result;
}

function style(values: Record<string, string | number | undefined>): string | undefined {
  const parts = Object.entries(values)
    .filter(([, value]) => value != null)
    .map(([name, value]) => `${name}:${typeof value === 'number' ? num(value) : value}`);
  return parts.length ? parts.join(';') : undefined;
}

/** Paints live in `style`, because `var()` is not reliable in presentation attributes. */
function paint(p: { fill?: string; stroke?: string; strokeWidth?: number }) {
  return style({
    fill: p.fill ?? 'none',
    stroke: p.stroke,
    'stroke-width': p.stroke ? p.strokeWidth : undefined,
  });
}

function runToSVG(run: TextRun): string {
  const { font } = run;
  return `<tspan${attrs({
    x: run.x,
    y: run.y,
    style: style({
      'font-family': font.family,
      'font-size': `${num(font.size)}px`,
      'font-weight': font.weight,
      'font-style': font.style === 'italic' ? 'italic' : undefined,
      fill: run.fill,
    }),
  })}>${escapeXml(run.text)}</tspan>`;
}

export function primitivesToSVG(primitives: Primitive[]): string {
  let out = '';
  for (const p of primitives) {
    if (p.backends && !p.backends.includes('svg')) continue;
    switch (p.kind) {
      case 'group':
        out += `<g${attrs({
          transform: p.transform && `matrix(${p.transform.map(num).join(' ')})`,
          opacity: p.opacity,
          'data-node-id': p.nodeId,
        })}>${primitivesToSVG(p.children)}</g>`;
        break;
      case 'rect':
        out += `<rect${attrs({ x: p.x, y: p.y, width: p.w, height: p.h, rx: p.r, style: paint(p) })}/>`;
        break;
      case 'path':
        out += `<path${attrs({ d: p.d, style: paint(p) })}/>`;
        break;
      case 'text':
        out += `<text${attrs({ transform: `translate(${num(p.x)} ${num(p.y)})`, 'xml:space': 'preserve' })}>${p.runs.map(runToSVG).join('')}</text>`;
        break;
      case 'image':
        out += `<image${attrs({ x: p.x, y: p.y, width: p.w, height: p.h, href: p.src })}/>`;
        break;
      case 'link':
        out += `<a${attrs({ href: p.href, target: '_blank' })}><rect${attrs({
          x: p.rect.x,
          y: p.rect.y,
          width: p.rect.width,
          height: p.rect.height,
          style: 'fill:transparent',
        })}/></a>`;
        break;
      case 'custom':
        out += p.svg?.() ?? '';
        break;
      case 'overlay':
        break;
    }
  }
  return out;
}

/** Theme tokens as CSS custom property declarations. */
export function tokensToCSS(theme: Theme): string {
  return Object.entries(theme.tokens)
    .map(([name, value]) => `--${name}:${value};`)
    .join('');
}

/** A standalone SVG document. Theme tokens are embedded so user CSS can still override them. */
export function toSVGString(result: RenderResult, options: SVGStringOptions = {}): string {
  const { padding = 20, background = true } = options;
  const box: Rect = expandRect(result.bounds, padding);
  const viewBox = [box.x, box.y, box.width, box.height].map(num).join(' ');
  const css = `.markmap{${tokensToCSS(result.theme)}}`;
  const bg = background
    ? `<rect${attrs({ x: box.x, y: box.y, width: box.width, height: box.height, style: 'fill:var(--mm-bg)' })}/>`
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" class="markmap"${attrs({
    width: box.width,
    height: box.height,
    viewBox,
  })}><style>${css}</style>${bg}${primitivesToSVG(result.primitives)}</svg>`;
}
