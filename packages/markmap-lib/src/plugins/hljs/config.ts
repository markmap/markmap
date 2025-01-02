import { buildCSSItem, buildJSItem } from 'markmap-common';

export const name = 'hljs';

const preloadScripts = [
  `@highlightjs/cdn-assets@${__define__.HLJS_VERSION}/highlight.min.js`,
].map((path) => buildJSItem(path));
const styles = [
  `@highlightjs/cdn-assets@${__define__.HLJS_VERSION}/styles/default.min.css`,
].map((path) => buildCSSItem(path));
export const config = {
  versions: {
    hljs: __define__.HLJS_VERSION || '',
  },
  preloadScripts,
  styles,
};
