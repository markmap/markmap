import { JSItem, CSSItem } from '../types';

export const styles: CSSItem[] = [
  {
    type: 'stylesheet',
    data: {
      href: 'https://cdn.jsdelivr.net/npm/prismjs@1/themes/prism.css',
    },
  },
];
export const scripts: JSItem[] = [
  {
    type: 'iife',
    data: {
      fn: () => {
        (window as any).Prism = { manual: true };
      },
    },
  },
  {
    type: 'script',
    data: {
      src: 'https://cdn.jsdelivr.net/npm/prismjs@1/components/prism-core.min.js',
    },
  },
  // components will be added by paths relative to path of autoloader
  {
    type: 'script',
    data: {
      src: 'https://cdn.jsdelivr.net/npm/prismjs@1/plugins/autoloader/prism-autoloader.min.js',
    },
  },
];

export function transform(nodes, mm): void {
  const { Prism } = window as any;
  const langs = nodes.flatMap(node => Array.from(node.querySelectorAll('code[class*=language-]')))
    .map(code => {
      const lang = code.className.match(/(?:^|\s)language-(\S+)|$/)[1];
      if (Prism.languages[lang]) {
        Prism.highlightElement(code);
      } else {
        return lang;
      }
    })
    .filter(Boolean);
  if (langs.length) {
    Prism.plugins.autoloader.loadLanguages(langs, () => {
      mm.setData();
      mm.fit();
    });
  }
}
