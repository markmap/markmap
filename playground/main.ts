import { parse } from '@markmap/parse';
import { builtinLayouts, builtinThemes, toSVGString } from '@markmap/render';
import { Markmap, resolveViewOptions, type ViewOptions } from '@markmap/view';
import sample from './sample.md?raw';

const STORAGE_KEY = 'markmap-next:playground';

const editor = document.querySelector<HTMLTextAreaElement>('#editor')!;
const svg = document.querySelector<SVGSVGElement>('#mindmap')!;
const stats = document.querySelector<HTMLSpanElement>('#stats')!;

editor.value = localStorage.getItem(STORAGE_KEY) ?? sample;

const layoutSelect = document.querySelector<HTMLSelectElement>('#layout')!;
const themeSelect = document.querySelector<HTMLSelectElement>('#theme')!;
const schemeSelect = document.querySelector<HTMLSelectElement>('#scheme')!;
const baseOptions: ViewOptions = { maxWidth: 300 };
const mm = new Markmap(svg, baseOptions);

function update() {
  const start = performance.now();
  const { root, frontmatter } = parse(editor.value);
  const { options, warnings } = resolveViewOptions(
    {
      ...baseOptions,
      layout: builtinLayouts[layoutSelect.value],
      theme: builtinThemes[themeSelect.value],
      colorScheme: schemeSelect.value as ViewOptions['colorScheme'],
    },
    frontmatter.markmap,
  );
  mm.setData(root, options);
  const ms = performance.now() - start;
  stats.textContent = `${mm.state?.layout.nodes.length ?? 0} nodes · ${ms.toFixed(1)} ms`;
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

for (const select of [layoutSelect, themeSelect, schemeSelect]) {
  select.addEventListener('change', () => {
    update();
    mm.fit();
  });
}
document.querySelector('#fit')!.addEventListener('click', () => mm.fit());
document.querySelector('#zoom-in')!.addEventListener('click', () => mm.zoomIn());
document.querySelector('#zoom-out')!.addEventListener('click', () => mm.zoomOut());
document.querySelector('#expand-all')!.addEventListener('click', () => mm.expandAll());
const level = document.querySelector<HTMLSelectElement>('#level')!;
level.addEventListener('change', () => {
  if (level.value) mm.foldToLevel(Number(level.value));
  level.value = '';
});

document.querySelector('#download')!.addEventListener('click', () => {
  if (!mm.state) return;
  const svgText = toSVGString(mm.state, { colorScheme: mm.options.colorScheme });
  const blob = new Blob([svgText], { type: 'image/svg+xml' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'markmap.svg';
  a.click();
  URL.revokeObjectURL(a.href);
});

Object.assign(window, { mm });
