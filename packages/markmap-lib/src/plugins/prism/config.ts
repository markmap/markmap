import { buildJSItem, buildCSSItem } from 'markmap-common';

export const name = 'prism';

const preloadScripts = [
  `prismjs@${__define__.PRISM_VERSION}/components/prism-core.min.js`,
  `prismjs@${__define__.PRISM_VERSION}/plugins/autoloader/prism-autoloader.min.js`,
].map((path) => buildJSItem(path));
const styles = [`prismjs@${__define__.PRISM_VERSION}/themes/prism.css`].map(
  (path) => buildCSSItem(path),
);
export const config = {
  versions: {
    prismjs: __define__.PRISM_VERSION || '',
  },
  preloadScripts,
  styles,
};
