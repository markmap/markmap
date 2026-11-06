import { dedent, type MarkmapViewElement } from '@markmap/element';
import { defaultContentPlugins } from '@markmap/render';
import type { AutoloaderConfig } from './index';

/** Attributes of `<markmap-view>` that a block can also write with a `data-` prefix. */
const ATTRIBUTES = new Set(['src', 'theme', 'layout', 'color-scheme', 'renderer', 'toolbar']);

async function useMath(view: MarkmapViewElement) {
  const { mathContent, remarkMath } = await import('@markmap/plugin-math');
  view.options = {
    ...view.options,
    plugins: [...(view.options.plugins ?? defaultContentPlugins), mathContent],
  };
  view.parseOptions = { plugins: [remarkMath] };
}

/** Put a `<markmap-view>` in place of a block, keeping its id, classes and styles. */
export async function mount(block: Element, config: AutoloaderConfig): Promise<MarkmapViewElement> {
  const view = document.createElement('markmap-view');
  const { theme, layout, colorScheme, renderer, toolbar } = config;
  const defaults = { theme, layout, 'color-scheme': colorScheme, renderer };
  for (const [name, value] of Object.entries(defaults)) {
    if (value != null) view.setAttribute(name, value);
  }
  view.toolbar = !!toolbar;
  for (const { name, value } of block.attributes) {
    if (name === 'data-markmap-pending' || name === 'data-math') continue;
    const short = name.replace(/^data-/, '');
    view.setAttribute(ATTRIBUTES.has(short) ? short : name, value);
  }
  view.options = config.options ?? {};
  if (config.math || block.hasAttribute('data-math')) await useMath(view);
  const script = block.querySelector('script[type="text/markdown"]');
  if (script) view.append(script);
  else if (!view.src) view.markdown = dedent(block.textContent ?? '');
  block.replaceWith(view);
  return view;
}
