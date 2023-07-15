import hljs from 'highlight.js';
import { buildCSSItem, noop } from 'markmap-common';
import { ITransformHooks } from '../types';
import { definePlugin } from './base';

const name = 'hljs';

const styles = [
  `highlight.js@${process.env.HLJS_VERSION}/styles/default.css`,
].map((path) => buildCSSItem(path));
const config = {
  versions: {
    hljs: process.env.HLJS_VERSION || '',
  },
  styles,
};

const plugin = definePlugin({
  name,
  config,
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
      styles: plugin.config?.styles,
    };
  },
});

export default plugin;
