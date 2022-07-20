import type { Remarkable } from 'remarkable';
import remarkableKatex from 'remarkable-katex';
import { loadJS } from 'markmap-common';
import { IAssets, ITransformHooks } from '../types';
import config from './katex.config';
import { resolveNpmPaths } from './util';

let loading: Promise<void>;
const autoload = () => {
  loading ||= loadJS(config.preloadScripts);
  return loading;
};

export { config };
export const name = 'katex';
export function transform(transformHooks: ITransformHooks): IAssets {
  const renderKatex = (source: string, displayMode: boolean) => {
    const { katex } = window;
    if (katex) {
      return katex.renderToString(source, {
        displayMode,
        throwOnError: false,
      });
    }
    autoload().then(() => {
      transformHooks.retransform.call();
    });
    return source;
  };
  let enableFeature = () => {};
  transformHooks.parser.tap((md) => {
    md.use(remarkableKatex);
    md.renderer.rules.katex = (
      tokens: Remarkable.ContentToken[],
      idx: number
    ) => {
      enableFeature();
      const result = renderKatex(tokens[idx].content, tokens[idx].block);
      return result;
    };
  });
  transformHooks.transform.tap((_, context) => {
    enableFeature = () => {
      context.features[name] = true;
    };
    const { frontmatter } = context;
    if (frontmatter?.markmap) {
      ['extraJs', 'extraCss'].forEach((key) => {
        if (frontmatter.markmap[key]) {
          frontmatter.markmap[key] = resolveNpmPaths(
            frontmatter.markmap[key],
            name,
            config.versions.katex
          );
        }
      });
    }
  });
  return {
    styles: config.styles,
    scripts: config.scripts,
  };
}
