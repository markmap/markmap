// @vitest-environment happy-dom
import { approximateMeasurer } from '@markmap/render';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { dedent, type MarkmapViewElement } from './index';

const baseOptions = { measurer: approximateMeasurer, duration: 0 };

function create(setup?: (el: MarkmapViewElement) => void) {
  const el = document.createElement('markmap-view');
  el.options = baseOptions;
  setup?.(el);
  document.body.append(el);
  return el;
}

const script = (text: string) => {
  const node = document.createElement('script');
  node.type = 'text/markdown';
  node.textContent = text;
  return node;
};

const nodes = (el: MarkmapViewElement) => el.mm?.result?.layout.nodes.length ?? 0;
const tick = () => new Promise((resolve) => setTimeout(resolve));
const styles = (el: MarkmapViewElement) =>
  [...el.shadowRoot!.querySelectorAll('style')].map((style) => style.textContent).join('');

function stubFetch(pages: Record<string, string>) {
  vi.stubGlobal('fetch', async (url: URL) => {
    const body = pages[url.pathname];
    return body == null ? new Response('', { status: 404 }) : new Response(body);
  });
}

beforeEach(() => {
  HTMLCanvasElement.prototype.getContext = (() => ({
    setTransform() {},
    clearRect() {},
  })) as never;
});

afterEach(() => {
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});

describe('dedent', () => {
  it('removes shared indentation and blank edges', () => {
    expect(dedent('\n    # A\n\n      - b\n    ## C\n  ')).toBe('# A\n\n  - b\n## C');
    expect(dedent('# A\r\n## B')).toBe('# A\n## B');
    expect(dedent('  \n ')).toBe('');
  });
});

describe('<markmap-view>', () => {
  it('shows indented inline Markdown', () => {
    const el = create((e) => {
      e.append(script('\n      # Root\n      ## A\n      ## B\n    '));
    });
    expect(nodes(el)).toBe(3);
    expect(el.shadowRoot!.querySelector('svg')).not.toBeNull();
  });

  it('follows inline Markdown that arrives later or changes', async () => {
    const el = create();
    expect(el.mm?.result).toBeUndefined();
    const source = script('# Root\n## A');
    el.append(source);
    await tick();
    expect(nodes(el)).toBe(2);
    source.textContent = '# Root\n## A\n## B';
    await tick();
    expect(nodes(el)).toBe(3);
  });

  it('prefers the markdown property, and falls back when it is cleared', () => {
    const el = create((e) => {
      e.append(script('# Inline'));
      e.markdown = '# Property\n## A';
    });
    expect(nodes(el)).toBe(2);
    el.markdown = null;
    expect(nodes(el)).toBe(1);
  });

  it('loads src relative to the page, and fits a new document', async () => {
    const pages = { '/a.md': '# A\n## 1\n## 2', '/b.md': '# B' };
    stubFetch(pages);
    const el = create((e) => {
      e.src = '/a.md';
    });
    await vi.waitFor(() => {
      expect(nodes(el)).toBe(3);
    });
    const fit = vi.spyOn(el.mm!, 'fit');
    el.src = '/b.md';
    await vi.waitFor(() => {
      expect(nodes(el)).toBe(1);
    });
    expect(fit).toHaveBeenCalledOnce();
  });

  it('ignores a response that was overtaken', async () => {
    const slow = Promise.withResolvers<Response>();
    vi.stubGlobal('fetch', async (url: URL) =>
      url.pathname === '/slow.md' ? slow.promise : new Response('# Fast'),
    );
    const el = create((e) => {
      e.src = '/slow.md';
    });
    el.src = '/fast.md';
    await vi.waitFor(() => {
      expect(nodes(el)).toBe(1);
    });
    slow.resolve(new Response('# Slow\n## A'));
    await tick();
    expect(nodes(el)).toBe(1);
  });

  it('reports a failed load', async () => {
    stubFetch({});
    const errors: unknown[] = [];
    const el = create((e) => {
      e.addEventListener('error', (event) => errors.push((event as unknown as CustomEvent).detail));
      e.src = '/missing.md';
    });
    await vi.waitFor(() => {
      expect(errors).toHaveLength(1);
    });
    expect((errors[0] as Error).message).toMatch(/missing\.md: 404/);
    expect(el.mm?.result).toBeUndefined();
  });

  it('puts theme tokens on the host, so the page can override them', () => {
    const el = create((e) => {
      e.markdown = '# Root';
      e.theme = 'cards';
    });
    expect(styles(el)).toMatch(/:host\{--mm-/);
    expect(el.mm?.options.theme?.name).toBe('cards');
  });

  it('applies attributes live, over the frontmatter', () => {
    const markdown = '---\nmarkmap:\n  theme: minimal\n  wrapWidth: 120\n---\n# Root\n## A';
    const el = create((e) => {
      e.markdown = markdown;
    });
    expect(el.mm?.options.theme?.name).toBe('minimal');
    expect(el.mm?.options.wrapWidth).toBe(120);
    const fit = vi.spyOn(el.mm!, 'fit');
    el.theme = 'cards';
    expect(el.mm?.options.theme?.name).toBe('cards');
    expect(el.mm?.options.wrapWidth).toBe(120);
    expect(fit).toHaveBeenCalledOnce();
    el.colorScheme = 'dark';
    expect(el.mm?.options.colorScheme).toBe('dark');
    expect(fit).toHaveBeenCalledOnce();
    el.theme = null;
    expect(el.mm?.options.theme?.name).toBe('minimal');
  });

  it('reports options it ignored', () => {
    const el = create((e) => {
      e.markdown = '# Root';
      e.theme = 'nonsense';
    });
    expect(el.warnings.join()).toContain('nonsense');
  });

  it('switches renderer and keeps the fold state', () => {
    const el = create((e) => {
      e.markdown = '# Root\n## A\n- a1\n## B';
    });
    const [, a] = el.mm!.result!.layout.nodes;
    el.mm!.setFolded(a.node.id, true);
    const before = el.mm;
    el.renderer = 'canvas';
    expect(el.mm).not.toBe(before);
    expect(el.shadowRoot!.querySelector('canvas')).not.toBeNull();
    expect(el.shadowRoot!.querySelector('svg')).toBeNull();
    expect(styles(el)).toMatch(/:host\{--mm-/);
    expect([...el.mm!.foldedIds]).toEqual([a.node.id]);
    expect(document.head.querySelector('style')).toBeNull();
  });

  it('fires render and fold', () => {
    const events: string[] = [];
    const el = create((e) => {
      e.addEventListener('render', () => events.push('render'));
      e.addEventListener('fold', (event) => {
        events.push(`fold ${(event as CustomEvent<Set<string>>).detail.size}`);
      });
      e.markdown = '# Root\n## A\n- a1';
    });
    events.length = 0;
    el.mm!.setFolded(el.mm!.result!.layout.nodes[1].node.id, true);
    expect(events).toEqual(['render', 'fold 1']);
  });

  it('keeps the map when moved, and cleans up when removed', async () => {
    const el = create((e) => {
      e.markdown = '# Root';
    });
    const { mm } = el;
    const box = document.createElement('div');
    document.body.append(box);
    box.append(el);
    await tick();
    expect(el.mm).toBe(mm);
    const destroy = vi.spyOn(mm!, 'destroy');
    el.remove();
    await tick();
    expect(el.mm).toBeUndefined();
    expect(destroy).toHaveBeenCalledOnce();
    box.append(el);
    expect(nodes(el)).toBe(1);
  });

  it('picks up properties set before it was defined', () => {
    const late = document.createElement('markmap-view');
    Object.defineProperty(late, 'markdown', {
      value: '# Late',
      configurable: true,
      writable: true,
    });
    late.options = baseOptions;
    document.body.append(late);
    expect(nodes(late)).toBe(1);
    expect(late.markdown).toBe('# Late');
  });
});
