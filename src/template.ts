import { wrapHtml } from './util';

const template: string = process.env.TEMPLATE;

const js: (string | object)[] = [
  { src: 'https://cdn.jsdelivr.net/npm/d3@5' },
  { src: 'https://cdn.jsdelivr.net/npm/markmap-lib@process.env.VERSION/dist/view.min.js' },
];

function buildCode(fn: Function, ...args: any[]): string {
  const params = args.map(arg => JSON.stringify(arg ?? null)).join(',');
  return `(${fn.toString()})(${params})`;
}

export function fillTemplate(data: any, opts?: any): string {
  const jsList = [...js];
  const extra = [JSON.stringify(data)];
  if (opts?.mathJax) {
    jsList.push(
      buildCode((mathJax: any) => {
        mathJax = Object.assign({}, mathJax);
        mathJax.options = Object.assign({}, mathJax.options, {
          skipHtmlTags: { '[-]': ['code', 'pre'] },
        });
        (window as any).MathJax = mathJax;
      }, opts.mathJax),
      { src: 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js' },
    );
    extra.push(
      buildCode(() => ({
        processHtml: nodes => {
          (window as any).MathJax.typeset?.(nodes);
        },
      })),
    )
  }
  const jsStr = jsList
    .map(data => wrapHtml('script', typeof data === 'string' ? data : '', typeof data === 'string' ? null : data))
    .join('');
  const html = template
    .replace('<!--JS-->', jsStr)
    .replace('{/*extra*/}', extra.join(','));
  return html;
}
