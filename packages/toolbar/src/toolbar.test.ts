// @vitest-environment happy-dom
import { parse } from '@markmap/parse';
import { approximateMeasurer } from '@markmap/render';
import { Markmap } from '@markmap/view';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { builtinButtons, createToolbar } from './toolbar';

const SVG_NS = 'http://www.w3.org/2000/svg';
const MARKDOWN = '# Root\n\n## A\n\n- a1\n  - a2\n\n## B';

function createMap(markdown: string | undefined = MARKDOWN, options = {}) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.getBoundingClientRect = () => ({ x: 0, y: 0, width: 800, height: 600 }) as DOMRect;
  document.body.append(svg);
  const root = markdown == null ? undefined : parse(markdown).root;
  return Markmap.create(svg, root, {
    measurer: approximateMeasurer,
    duration: 0,
    ...options,
  });
}

const button = (bar: { element: HTMLElement }, label: string) =>
  bar.element.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;
const menu = (bar: { element: HTMLElement }) => bar.element.querySelector('select')!;

function choose(select: HTMLSelectElement, value: string) {
  select.value = value;
  select.dispatchEvent(new Event('change'));
}

beforeEach(() => {
  document.body.replaceChildren();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('createToolbar', () => {
  it('shows the default controls and takes the map theme', () => {
    const mm = createMap();
    const bar = createToolbar(mm);
    const labels = [...bar.element.querySelectorAll('button')].map((b) => b.title);
    expect(labels).toEqual(['Zoom in', 'Zoom out', 'Fit to view', 'Expand all']);
    expect(menu(bar)).not.toBeNull();
    expect(bar.element.getAttribute('role')).toBe('toolbar');
    expect(bar.element.classList.contains(mm.themeClass)).toBe(true);
  });

  it('is all disabled with nothing to show', () => {
    const bar = createToolbar(createMap(null as never));
    for (const b of bar.element.querySelectorAll('button')) expect(b.disabled).toBe(true);
    expect(menu(bar).disabled).toBe(true);
  });

  it('runs view actions', () => {
    const mm = createMap();
    const bar = createToolbar(mm);
    const fit = vi.spyOn(mm, 'fit');
    const zoomIn = vi.spyOn(mm, 'zoomIn');
    button(bar, 'Fit to view').click();
    button(bar, 'Zoom in').click();
    expect(fit).toHaveBeenCalledOnce();
    expect(zoomIn).toHaveBeenCalledOnce();
  });

  it('disables zoom buttons at the limits, whoever moved the view', () => {
    const mm = createMap(MARKDOWN, { minScale: 0.5, maxScale: 2, fitMaxScale: 1 });
    const bar = createToolbar(mm);
    expect(button(bar, 'Zoom in').disabled).toBe(false);
    for (let i = 0; i < 10; i += 1) mm.zoomIn();
    expect(button(bar, 'Zoom in').disabled).toBe(true);
    expect(button(bar, 'Zoom out').disabled).toBe(false);
    for (let i = 0; i < 10; i += 1) mm.zoomOut();
    expect(button(bar, 'Zoom in').disabled).toBe(false);
    expect(button(bar, 'Zoom out').disabled).toBe(true);
  });

  it('enables expand all only while something is folded', () => {
    const mm = createMap();
    const bar = createToolbar(mm);
    expect(button(bar, 'Expand all').disabled).toBe(true);
    mm.foldToLevel(1);
    expect(button(bar, 'Expand all').disabled).toBe(false);
    button(bar, 'Expand all').click();
    expect(mm.foldedIds.size).toBe(0);
    expect(button(bar, 'Expand all').disabled).toBe(true);
  });

  it('offers a level for each depth with children, and resets the menu', () => {
    const mm = createMap();
    const bar = createToolbar(mm);
    const select = menu(bar);
    expect([...select.options].map((o) => o.value)).toEqual(['', '1', '2']);
    choose(select, '2');
    expect(select.value).toBe('');
    expect(mm.foldedIds.size).toBe(1);
  });

  it('keeps the levels up to date when the tree changes', () => {
    const mm = createMap();
    const bar = createToolbar(mm);
    mm.setTree(parse('# Root\n\n## A').root);
    expect([...menu(bar).options].map((o) => o.value)).toEqual(['']);
    expect(menu(bar).disabled).toBe(true);
  });

  it('counts levels below folded nodes', () => {
    const mm = createMap();
    mm.foldToLevel(1);
    expect([...menu(createToolbar(mm)).options]).toHaveLength(3);
  });

  it('takes custom buttons and changed built-ins', () => {
    const mm = createMap();
    const onClick = vi.fn<(map: Markmap) => void>();
    let locked = true;
    const bar = createToolbar(mm, {
      items: [
        { ...builtinButtons.fit, label: 'Reset' },
        { label: 'Share', disabled: () => locked, onClick },
      ],
    });
    expect(button(bar, 'Reset').querySelector('svg')).not.toBeNull();
    const share = button(bar, 'Share');
    expect(share.textContent).toBe('Share');
    expect(share.disabled).toBe(true);
    expect(menu(bar)).toBeNull();
    locked = false;
    bar.update();
    share.click();
    expect(onClick).toHaveBeenCalledWith(mm);
  });

  it('stops following the map when destroyed', () => {
    const mm = createMap();
    const bar = createToolbar(mm);
    document.body.append(bar.element);
    bar.destroy();
    expect(bar.element.isConnected).toBe(false);
    mm.foldToLevel(1);
    expect(button(bar, 'Expand all').disabled).toBe(true);
  });
});
