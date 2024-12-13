import MarkdownIt from 'markdown-it';
import { loadJS, noop } from 'markmap-common';
import { ITransformHooks } from '../../types';
import { patchJSItem } from '../../util';
import { definePlugin } from '../base';
import { addDefaultVersions } from '../util';
import { config, name } from './config';
import { katexPlugin } from './vendor';

const plugin = definePlugin({
  name,
  config,
  transform(transformHooks: ITransformHooks) {
    let loading: Promise<void>;
    const preloadScripts =
      plugin.config?.preloadScripts?.map((item) =>
        patchJSItem(transformHooks.transformer.urlBuilder, item),
      ) || [];
    const autoload = () => {
      loading ||= loadJS(preloadScripts);
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
      md.use(katexPlugin);
      ['math_block', 'math_inline'].forEach((key) => {
        const fn: MarkdownIt.Renderer.RenderRule = (tokens, idx) => {
          enableFeature();
          const result = renderKatex(tokens[idx].content, !!tokens[idx].block);
          return result;
        };
        md.renderer.rules[key] = fn;
      });
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
              plugin.config?.versions?.katex || '',
            );
          }
        });
      }
    });
    return {
      styles: plugin.config?.styles,
      scripts: plugin.config?.scripts,
    };
  },
});

export default plugin;
