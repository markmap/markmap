import { CSSItem, JSItem } from 'markmap-common';

export default {
  preloadScripts: [
    {
      type: 'script',
      data: {
        src: `https://cdn.jsdelivr.net/npm/prismjs@${process.env.PRISM_VERSION}/components/prism-core.min.js`,
      },
    },
    {
      type: 'script',
      data: {
        src: `https://cdn.jsdelivr.net/npm/prismjs@${process.env.PRISM_VERSION}/plugins/autoloader/prism-autoloader.min.js`,
      },
    },
  ] as JSItem[],
  styles: [
    {
      type: 'stylesheet',
      data: {
        href: `https://cdn.jsdelivr.net/npm/prismjs@${process.env.PRISM_VERSION}/themes/prism.css`,
      },
    },
  ] as CSSItem[],
};
