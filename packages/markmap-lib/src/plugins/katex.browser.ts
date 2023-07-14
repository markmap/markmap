import type { Remarkable } from 'remarkable';
import remarkableKatex from 'remarkable-katex';
import { loadJS, noop } from 'markmap-common';
import { ITransformHooks } from '../types';
import { getConfig } from './katex.config';
import { addDefaultVersions } from './util';
import { definePlugin } from './base';

const name = 'katex';

export default definePlugin(() => {
  const plugin = {
    name,
    config: getConfig(),
    transform(transformHooks: ITransformHooks) {
      let loading: Promise<void>;
      const autoload = () => {
        loading ||= loadJS(plugin.config.preloadScripts);
        return loading;
      };

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
          const result = renderKatex(tokens[idx].content, !!tokens[idx].block);
          return result;
        };
      });
      transformHooks.beforeParse.tap((_, context) => {
        enableFeature = () => {
          context.features[name] = true;
        };
      });
      transformHooks.afterParse.tap((_, context) => {
        const markmap = context.frontmatter?.markmap;
        if (markmap) {
          ['extraJs', 'extraCss'].forEach((key) => {
            const value = markmap[key];
            if (value) {
              markmap[key] = addDefaultVersions(
                value,
                name,
                plugin.config.versions.katex
              );
            }
          });
        }
      });
      return {
        styles: plugin.config.styles,
        scripts: plugin.config.scripts,
      };
    },
  };
  return plugin;
});
