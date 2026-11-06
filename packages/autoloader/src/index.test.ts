// @vitest-environment happy-dom
import { approximateMeasurer } from '@markmap/render';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type Autoloader = typeof import('./index');

const instances: { observe: string[]; trigger(target: Element): void }[] = [];

/** Records what is observed, and fires only when a test says a block is near. */
class FakeObserver {
  observed = new Set<Element>();
  constructor(private callback: IntersectionObserverCallback) {
    instances.push(this as never);
  }
  observe(target: Element) {
    this.observed.add(target);
  }
  unobserve(target: Element) {
    this.observed.delete(target);
  }
  trigger(target: Element) {
    this.callback([{ isIntersecting: true, target } as never], this as never);
  }
}

const views = () => [...document.querySelectorAll('markmap-view')];

async function load(html: string): Promise<Autoloader> {
  document.body.innerHTML = html;
  vi.resetModules();
  const autoloader = await import('./index');
  autoloader.configure({ options: { measurer: approximateMeasurer, duration: 0 } });
  return autoloader;
}

const near = async (block: Element) => {
  (instances.at(-1) as unknown as FakeObserver).trigger(block);
  await vi.waitFor(() => {
    expect(block.isConnected).toBe(false);
  });
};

beforeEach(() => {
  instances.length = 0;
  document.head.replaceChildren();
  vi.stubGlobal('IntersectionObserver', FakeObserver);
});

describe('autoloader', () => {
  it('waits until a block is near the viewport', async () => {
    await load(`
      <div class="markmap" id="a"><script type="text/markdown">
        # A
        ## One
      </script></div>
      <div class="markmap" id="b"><script type="text/markdown"># B</script></div>`);
    expect(views()).toHaveLength(0);
    expect(document.head.querySelector('style')?.textContent).toContain('400px');
    await near(document.querySelector('#a')!);
    const [view] = views();
    expect(views()).toHaveLength(1);
    expect(view.id).toBe('a');
    expect(view.mm?.result?.layout.nodes).toHaveLength(2);
    expect(document.querySelector('div#b')).not.toBeNull();
  });

  it('reads Markdown written as text', async () => {
    await load('<pre class="markmap">\n  # A\n  - One\n  - Two\n</pre>');
    await near(document.querySelector('pre')!);
    expect(views()[0].mm?.result?.layout.nodes).toHaveLength(3);
  });

  it('passes on attributes, with or without data-', async () => {
    await load(`<div class="markmap big" style="height: 200px" data-theme="cards"
      layout="tree" data-color-scheme="dark" data-renderer="svg" data-toolbar data-note="x"># A</div>`);
    await near(document.querySelector('.markmap')!);
    const [view] = views();
    expect(view.className).toBe('markmap big');
    expect(view.style.height).toBe('200px');
    expect(view.theme).toBe('cards');
    expect(view.layout).toBe('tree');
    expect(view.colorScheme).toBe('dark');
    expect(view.toolbar).toBe(true);
    expect(view.getAttribute('data-note')).toBe('x');
    expect(view.hasAttribute('data-markmap-pending')).toBe(false);
  });

  it('applies config, which blocks override', async () => {
    const { configure } = await load(`
      <div class="markmap" id="a"># A</div>
      <div class="markmap" id="b" data-theme="minimal"># B</div>`);
    configure({ theme: 'cards', toolbar: true });
    await near(document.querySelector('#a')!);
    await near(document.querySelector('#b')!);
    expect(views().map((view) => view.theme)).toEqual(['cards', 'minimal']);
    expect(views()[0].toolbar).toBe(true);
  });

  it('leaves math out unless asked', async () => {
    const { configure } = await load(`
      <div class="markmap" id="a"># A</div>
      <div class="markmap" id="b" data-math># B</div>
      <div class="markmap" id="c"># C</div>`);
    await near(document.querySelector('#a')!);
    await near(document.querySelector('#b')!);
    configure({ math: true });
    await near(document.querySelector('#c')!);
    const [a, b, c] = views();
    expect(a.parseOptions.plugins).toBeUndefined();
    expect(b.parseOptions.plugins).toHaveLength(1);
    expect(b.options.plugins?.at(-1)?.name).toBe(c.options.plugins?.at(-1)?.name);
    expect(b.hasAttribute('data-math')).toBe(false);
  });

  it('renders everything on request, including later content', async () => {
    const { renderAll } = await load('<div class="markmap"># A</div>');
    const later = document.createElement('section');
    later.innerHTML = '<div class="markmap"># B</div><div class="markmap"># C</div>';
    document.body.append(later);
    const inLater = await renderAll(later);
    expect(inLater).toHaveLength(2);
    expect(document.querySelector('div.markmap')).not.toBeNull();
    await renderAll();
    expect(document.querySelector('div.markmap')).toBeNull();
    expect(views()).toHaveLength(3);
    expect(await renderAll()).toEqual([]);
  });

  it('shows a block once when asked twice', async () => {
    const { renderAll } = await load('<div class="markmap"># A</div>');
    const [first, second] = await Promise.all([renderAll(), renderAll()]);
    expect(first).toEqual(second);
    expect(views()).toHaveLength(1);
  });

  it('skips maps that are already on the page', async () => {
    const { renderAll } = await load(
      '<svg class="markmap"></svg><canvas class="markmap"></canvas>',
    );
    await renderAll();
    expect(views()).toHaveLength(0);
    expect(document.querySelector('svg')?.hasAttribute('data-markmap-pending')).toBe(false);
  });

  it('skips blocks removed before they showed', async () => {
    const { renderAll } = await load('<div class="markmap"># A</div>');
    const block = document.querySelector('.markmap')!;
    const showing = renderAll();
    block.remove();
    expect(await showing).toEqual([]);
  });
});
