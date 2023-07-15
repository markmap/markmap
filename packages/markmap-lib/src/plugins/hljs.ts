import hljs from 'highlight.js';
import { buildCSSItem, noop } from 'markmap-common';
import { ITransformHooks } from '../types';
import { definePlugin } from './base';

const name = 'hljs';

function getConfig() {
  const styles = [
    `highlight.js@${process.env.HLJS_VERSION}/styles/default.css`,
  ].map((path) => buildCSSItem(path));
  return {
    versions: {
      hljs: process.env.HLJS_VERSION || '',
    },
    styles,
  };
}

export default definePlugin(() => {
  const plugin = {
    name,
    config: getConfig(),
    transform(transformHooks: ITransformHooks) {
      let enableFeature = noop;
      transformHooks.parser.tap((md) => {
        md.set({
          highlight: (str: string, language?: string) => {
            enableFeature();
            return hljs.highlightAuto(str, language ? [language] : undefined)
              .value;
          },
        });
      });
      transformHooks.beforeParse.tap((_, context) => {
        enableFeature = () => {
          context.features[name] = true;
        };
      });
      return {
        styles: plugin.config.styles,
      };
    },
  };
  return plugin;
});
