import type { AttachmentMarker, Checkbox, ContentPlugin, Inline } from '@markmap/core';

const SAFE_URL = /^(?:https?:|mailto:|tel:|#|\/|\.{1,2}\/|[^:/?#]*(?:[/?#]|$))/i;

/** Keep http(s), mailto, tel and relative URLs. Anything else, such as `javascript:`, is dropped. */
export function sanitizeUrl(url: string): string | undefined {
  const trimmed = url.trim();
  return SAFE_URL.test(trimmed) ? trimmed : undefined;
}

/** Bold, italic, inline code, links, strikethrough, highlight and task checkboxes. */
export const basicContent: ContentPlugin = {
  name: 'basic',
  transform(content, node) {
    const { checked } = node.data;
    if (typeof checked !== 'boolean') return content;
    return [{ type: 'checkbox', checked } satisfies Checkbox, ...content] as Inline[];
  },
  styles: {
    strong: () => ({ font: { weight: 700 } }),
    emphasis: () => ({ font: { style: 'italic' } }),
    delete: (_inline, style) => ({ decoration: { strike: style.fill } }),
    mark: () => ({ decoration: { background: 'var(--mm-mark-bg)', radius: 2 } }),
    inlineCode: (_inline, style, ctx) => ({
      font: {
        family: ctx.theme.codeFontFamily,
        size: style.font.size * 0.875,
        weight: 400,
        style: 'normal',
      },
      fill: 'var(--mm-code-color)',
      decoration: { background: 'var(--mm-code-bg)', radius: 3, padding: style.font.size * 0.2 },
    }),
    link: (inline) => {
      const href = sanitizeUrl(inline.url);
      return { fill: 'var(--mm-link-color)', decoration: href ? { href } : undefined };
    },
  },
  atoms: {
    checkbox: {
      measure(_inline, style) {
        const size = Math.round(style.font.size * 0.8);
        // The box sits on the baseline, followed by a small gap.
        return { width: size + style.font.size * 0.35, height: size, baseline: size };
      },
      render(inline, box, style) {
        const size = box.height;
        const stroke = Math.max(1, style.font.size / 12);
        const frame = {
          kind: 'rect' as const,
          x: box.x + stroke / 2,
          y: box.y + stroke / 2,
          w: size - stroke,
          h: size - stroke,
          r: size * 0.2,
          stroke: 'var(--mm-checkbox)',
          strokeWidth: stroke,
          fill: inline.checked ? 'var(--mm-checkbox)' : 'none',
        };
        if (!inline.checked) return [frame];
        const [x, y] = [box.x, box.y];
        return [
          frame,
          {
            kind: 'path',
            d: `M${x + size * 0.25},${y + size * 0.52}L${x + size * 0.43},${y + size * 0.7}L${x + size * 0.76},${y + size * 0.32}`,
            stroke: 'var(--mm-bg)',
            strokeWidth: stroke * 1.5,
          },
        ];
      },
    },
  },
};

/**
 * Adds a dot after the label of nodes with attachments, with a hit area that asks the
 * view to open them. The dot is exported; the hit area is interactive-only.
 */
export const attachmentContent: ContentPlugin = {
  name: 'attachments',
  transform(content, node) {
    const count = node.attachments.length;
    if (!count) return content;
    return [...content, { type: 'attachmentMarker', count } satisfies AttachmentMarker] as Inline[];
  },
  atoms: {
    attachmentMarker: {
      measure(_inline, style) {
        const dot = Math.round(style.font.size * 0.4);
        const gap = style.font.size * 0.35;
        // Center the dot on the middle of lowercase letters.
        return { width: gap + dot, height: dot, baseline: dot / 2 + style.font.size * 0.27 };
      },
      render(_inline, box) {
        const dot = box.height;
        const x = box.x + box.width - dot;
        const hit = Math.max(16, dot * 2.5);
        return [
          { kind: 'rect', x, y: box.y, w: dot, h: dot, r: dot / 2, fill: 'var(--mm-attachment)' },
          {
            kind: 'hit',
            action: 'attachments',
            rect: {
              x: x + dot / 2 - hit / 2,
              y: box.y + dot / 2 - hit / 2,
              width: hit,
              height: hit,
            },
          },
        ];
      },
    },
  },
};
