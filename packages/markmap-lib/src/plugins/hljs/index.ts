import hljs from 'highlight.js';
import { noop } from 'markmap-common';
import { ITransformHooks } from '../../types';
import { definePlugin } from '../base';
import { name, config } from './config';

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
