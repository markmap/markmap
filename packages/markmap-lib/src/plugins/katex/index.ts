import { noop, wrapFunction } from 'markmap-common';
import { ITransformHooks } from '../../types';
import { definePlugin } from '../base';
import { config, name } from './config';
import { katexPlugin } from './vendor';

const plugin = definePlugin({
  name,
  config,
  transform(transformHooks: ITransformHooks) {
    let enableFeature = noop;
    transformHooks.parser.tap((md) => {
      md.use(katexPlugin);
      ['math_block', 'math_inline'].forEach((key) => {
        const fn = md.renderer.rules[key];
        if (fn) {
          md.renderer.rules[key] = wrapFunction(fn, (render, ...args) => {
            enableFeature();
            return render(...args);
          });
        }
      });
    });
    transformHooks.beforeParse.tap((_, context) => {
      enableFeature = () => {
        context.features[name] = true;
      };
    });
    return {
      styles: plugin.config?.styles,
      scripts: plugin.config?.scripts,
    };
  },
});

export default plugin;
