import { parse } from '@markmap/parse';
import { toSVGString } from '@markmap/render';
import { Markmap, resolveViewOptions, type ViewOptions } from '@markmap/view';
import sample from './sample.md?raw';

const STORAGE_KEY = 'markmap-next:playground';

const editor = document.querySelector<HTMLTextAreaElement>('#editor')!;
const svg = document.querySelector<SVGSVGElement>('#mindmap')!;
const stats = document.querySelector<HTMLSpanElement>('#stats')!;

editor.value = localStorage.getItem(STORAGE_KEY) ?? sample;

const baseOptions: ViewOptions = { maxWidth: 300 };
const mm = new Markmap(svg, baseOptions);

function update() {
  const start = performance.now();
  const { root, frontmatter } = parse(editor.value);
  const { options, warnings } = resolveViewOptions(baseOptions, frontmatter.markmap);
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

document.querySelector('#fit')!.addEventListener('click', () => mm.fit());

document.querySelector('#download')!.addEventListener('click', () => {
  if (!mm.state) return;
  const blob = new Blob([toSVGString(mm.state)], { type: 'image/svg+xml' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'markmap.svg';
  a.click();
  URL.revokeObjectURL(a.href);
});

Object.assign(window, { mm });
