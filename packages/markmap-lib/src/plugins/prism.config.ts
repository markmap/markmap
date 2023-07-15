import { buildJSItem, buildCSSItem } from 'markmap-common';

export const name = 'prism';

export function getConfig() {
  const preloadScripts = [
    `prismjs@${process.env.PRISM_VERSION}/components/prism-core.min.js`,
    `prismjs@${process.env.PRISM_VERSION}/plugins/autoloader/prism-autoloader.min.js`,
  ].map((path) => buildJSItem(path));
  const styles = [`prismjs@${process.env.PRISM_VERSION}/themes/prism.css`].map(
    (path) => buildCSSItem(path)
  );
  return {
    versions: {
      prismjs: process.env.PRISM_VERSION || '',
    },
    preloadScripts,
    styles,
  };
}
