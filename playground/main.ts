import { CanvasBackend, toPNG } from '@markmap/canvas';
import { parse } from '@markmap/parse';
import { mathContent, remarkMath } from '@markmap/plugin-math';
import { builtinLayouts, builtinThemes, defaultContentPlugins, toSVGString } from '@markmap/render';
import { createToolbar, type Toolbar } from '@markmap/toolbar';
import { Markmap, resolveViewOptions, type ViewOptions } from '@markmap/view';
import sample from './sample.md?raw';

const STORAGE_KEY = 'markmap-next:playground';

const editor = document.querySelector<HTMLTextAreaElement>('#editor')!;
const stage = document.querySelector<HTMLDivElement>('#stage')!;
const stats = document.querySelector<HTMLSpanElement>('#stats')!;

editor.value = localStorage.getItem(STORAGE_KEY) ?? sample;

const layoutSelect = document.querySelector<HTMLSelectElement>('#layout')!;
const themeSelect = document.querySelector<HTMLSelectElement>('#theme')!;
const schemeSelect = document.querySelector<HTMLSelectElement>('#scheme')!;
const baseOptions: ViewOptions = {
  wrapWidth: 300,
  plugins: [...defaultContentPlugins, mathContent],
};
const rendererSelect = document.querySelector<HTMLSelectElement>('#renderer')!;

/** A map in a new element, so switching renderers starts clean. */
function createMarkmap(): Markmap {
  if (rendererSelect.value === 'canvas') {
    const canvas = document.createElement('canvas');
    stage.replaceChildren(canvas);
    return new Markmap(new CanvasBackend(canvas), baseOptions);
  }
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  stage.replaceChildren(svg);
  return new Markmap(svg, baseOptions);
}

let mm = createMarkmap();
let toolbar: Toolbar;

function addToolbar() {
  toolbar = createToolbar(mm);
  stage.append(toolbar.element);
}

addToolbar();

function update() {
  const start = performance.now();
  const { root, frontmatter } = parse(editor.value, { plugins: [remarkMath] });
  const { options, warnings } = resolveViewOptions(
    {
      ...baseOptions,
      layout: builtinLayouts[layoutSelect.value],
      theme: builtinThemes[themeSelect.value],
      colorScheme: schemeSelect.value as ViewOptions['colorScheme'],
    },
    frontmatter.markmap,
  );
  mm.setTree(root, options);
  const ms = performance.now() - start;
  stats.textContent = `${mm.result?.layout.nodes.length ?? 0} nodes · ${ms.toFixed(1)} ms`;
  stats.title = warnings.join('\n');
  stats.style.color = warnings.length ? '#c0392b' : '';
  if (warnings.length) stats.textContent += ` · ${warnings.length} option warning(s)`;
}

update();
mm.fit();

let timer: ReturnType<typeof setTimeout> | undefined;
editor.addEventListener('input', () => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    localStorage.setItem(STORAGE_KEY, editor.value);
    update();
  }, 150);
});

rendererSelect.addEventListener('change', () => {
  toolbar.destroy();
  mm.destroy();
  mm = createMarkmap();
  addToolbar();
  Object.assign(window, { mm });
  update();
  mm.fit();
});

for (const select of [layoutSelect, themeSelect, schemeSelect]) {
  select.addEventListener('change', () => {
    update();
    mm.fit();
  });
}

function download(blob: Blob, name: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

document.querySelector('#download')!.addEventListener('click', () => {
  if (!mm.result) return;
  const svgText = toSVGString(mm.result, { colorScheme: mm.options.colorScheme });
  download(new Blob([svgText], { type: 'image/svg+xml' }), 'markmap.svg');
});

document.querySelector('#download-png')!.addEventListener('click', async () => {
  if (!mm.result) return;
  const { colorScheme } = mm.options;
  const dark = matchMedia('(prefers-color-scheme: dark)').matches;
  const scheme = colorScheme === 'auto' ? (dark ? 'dark' : 'light') : colorScheme;
  download(await toPNG(mm.result, { colorScheme: scheme }), 'markmap.png');
});

Object.assign(window, { mm });
