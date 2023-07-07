import type { Remarkable } from 'remarkable';
import remarkableKatex from 'remarkable-katex';
import { loadJS, noop } from 'markmap-common';
import { ITransformHooks } from '../types';
import config from './katex.config';
import { resolveNpmPaths } from './util';
import { definePlugin } from './base';

let loading: Promise<void>;
const autoload = () => {
  loading ||= loadJS(config.preloadScripts);
  return loading;
};

const name = 'katex';

export default definePlugin({
  name,
  config,
  transform(transformHooks: ITransformHooks) {
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
    let enableFeature = noop;
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
    transformHooks.beforeParse.tap((_, context) => {
      enableFeature = () => {
        context.features[name] = true;
      };
    });
    transformHooks.afterParse.tap((_, context) => {
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
  },
});
