import type { Markmap } from '@markmap/view';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** A button of your own, or a changed built-in: `{ ...builtinButtons.fit, label: 'Reset' }`. */
export interface ToolbarButton {
  /** Names the button for screen readers and in its tooltip. Shown if there is no `icon`. */
  label: string;
  /** Path data of a line drawing in a 16 × 16 box. */
  icon?: string;
  /** Checked whenever the map changes. */
  disabled?: (mm: Markmap) => boolean;
  onClick: (mm: Markmap) => void;
}

/** Built-in buttons, usable by name in `items`. */
export const builtinButtons = {
  'zoom-in': {
    label: 'Zoom in',
    icon: 'M8 3v10M3 8h10',
    disabled: (mm) => !mm.result || atLimit(mm.transform.k, mm.scaleLimits[1]),
    onClick: (mm) => {
      mm.zoomIn();
    },
  },
  'zoom-out': {
    label: 'Zoom out',
    icon: 'M3 8h10',
    disabled: (mm) => !mm.result || atLimit(mm.transform.k, mm.scaleLimits[0]),
    onClick: (mm) => {
      mm.zoomOut();
    },
  },
  fit: {
    label: 'Fit to view',
    icon: 'M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4',
    disabled: (mm) => !mm.result,
    onClick: (mm) => {
      mm.fit();
    },
  },
  'expand-all': {
    label: 'Expand all',
    icon: 'M4 6l4-4 4 4M4 10l4 4 4-4',
    disabled: (mm) => !mm.foldedIds.size,
    onClick: (mm) => {
      mm.expandAll();
    },
  },
} satisfies Record<string, ToolbarButton>;

/** A built-in by name, `fold-level` for the level menu, or a button of your own. */
export type ToolbarItem = keyof typeof builtinButtons | 'fold-level' | ToolbarButton;

export const defaultToolbarItems: readonly ToolbarItem[] = [
  'zoom-in',
  'zoom-out',
  'fit',
  'expand-all',
  'fold-level',
];

export interface ToolbarOptions {
  /** What to show, in order. Defaults to `defaultToolbarItems`. */
  items?: readonly ToolbarItem[];
}

export interface Toolbar {
  /** Put this on the page. It is not positioned; style `.markmap-toolbar` to place it. */
  readonly element: HTMLDivElement;
  /** Check what is enabled now. Needed only when a custom `disabled` depends on other things. */
  update(): void;
  /** Stop following the map and remove the element. */
  destroy(): void;
}

const CSS = `
.markmap-toolbar {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  border: 1px solid color-mix(in srgb, var(--mm-text, #333) 20%, transparent);
  border-radius: 6px;
  background: var(--mm-bg, #fff);
  color: var(--mm-text, #333);
  font: 13px system-ui, sans-serif;
}
.markmap-toolbar button, .markmap-toolbar select {
  height: 26px;
  border: 0;
  border-radius: 4px;
  background: none;
  color: inherit;
  font: inherit;
  cursor: pointer;
}
.markmap-toolbar button { min-width: 26px; padding: 0 5px; }
.markmap-toolbar button:hover:enabled, .markmap-toolbar select:hover:enabled {
  background: color-mix(in srgb, var(--mm-text, #333) 12%, transparent);
}
.markmap-toolbar button:disabled, .markmap-toolbar select:disabled { opacity: 0.35; cursor: default; }
.markmap-toolbar :focus-visible { outline: 2px solid var(--mm-link, #0097e6); outline-offset: -2px; }
.markmap-toolbar option { background: Canvas; color: CanvasText; }
.markmap-toolbar svg { display: block; margin: auto; width: 16px; height: 16px; }
.markmap-toolbar path { fill: none; stroke: currentColor; stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }
`;

/** Scales only get close to a limit once animations and floats are done with them. */
const atLimit = (scale: number, limit: number) => Math.abs(scale / limit - 1) < 1e-6;

function createIcon(doc: Document, path: string) {
  const svg = doc.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('aria-hidden', 'true');
  const shape = doc.createElementNS(SVG_NS, 'path');
  shape.setAttribute('d', path);
  svg.append(shape);
  return svg;
}

/** Depth of the deepest node with children: folding deeper than that does nothing. */
function deepestParent(node: Markmap['tree'], depth = 0): number {
  if (!node?.children.length) return 0;
  return Math.max(depth, ...node.children.map((child) => deepestParent(child, depth + 1)));
}

/**
 * Controls for a map, in plain DOM. They use the public view API, follow its events, and
 * take their colors from the map's theme.
 */
export function createToolbar(mm: Markmap, options: ToolbarOptions = {}): Toolbar {
  const doc = mm.element.ownerDocument;
  const element = doc.createElement('div');
  element.className = `markmap-toolbar ${mm.themeClass}`;
  element.setAttribute('role', 'toolbar');
  element.setAttribute('aria-label', 'Map controls');
  element.setAttribute('part', 'toolbar');
  const style = doc.createElement('style');
  style.textContent = CSS;
  element.append(style);

  const buttons: { el: HTMLButtonElement; item: ToolbarButton }[] = [];
  let levels: HTMLSelectElement | undefined;

  const updateButtons = () => {
    for (const { el, item } of buttons) el.disabled = item.disabled?.(mm) ?? false;
  };

  const updateLevels = () => {
    if (!levels) return;
    const deepest = deepestParent(mm.tree);
    levels.disabled = !deepest;
    if (levels.options.length === deepest + 1) return;
    const choices = Array.from({ length: deepest + 1 }, (_, i) => {
      const option = doc.createElement('option');
      option.value = i ? `${i}` : '';
      option.textContent = i ? `${i}` : 'Level';
      return option;
    });
    levels.replaceChildren(...choices);
  };

  const update = () => {
    updateButtons();
    updateLevels();
  };

  for (const entry of options.items ?? defaultToolbarItems) {
    if (entry === 'fold-level') {
      const select = doc.createElement('select');
      select.title = 'Fold to level';
      select.setAttribute('aria-label', select.title);
      select.addEventListener('change', () => {
        if (select.value) mm.foldToLevel(Number(select.value));
        // A menu of actions, not a setting: folding by hand would make it wrong.
        select.value = '';
      });
      levels = select;
      element.append(select);
      continue;
    }
    const item = typeof entry === 'string' ? builtinButtons[entry] : entry;
    const el = doc.createElement('button');
    el.type = 'button';
    el.title = item.label;
    el.setAttribute('aria-label', item.label);
    if (item.icon) el.append(createIcon(doc, item.icon));
    else el.textContent = item.label;
    el.addEventListener('click', () => {
      item.onClick(mm);
      update();
    });
    buttons.push({ el, item });
    element.append(el);
  }

  const stop = [
    mm.on('zoom', updateButtons),
    mm.on('fold', updateButtons),
    mm.on('render', update),
  ];
  update();

  return {
    element,
    update,
    destroy() {
      for (const off of stop) off();
      element.remove();
    },
  };
}
