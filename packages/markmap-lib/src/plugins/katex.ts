import type { Remarkable } from 'remarkable';
import remarkableKatex from 'remarkable-katex';
import { noop, wrapFunction } from 'markmap-common';
import { ITransformHooks } from '../types';
import { getConfig } from './katex.config';
import { definePlugin } from './base';

const name = 'katex';

export default definePlugin(() => {
  const plugin = {
    name,
    config: getConfig(),
    transform(transformHooks: ITransformHooks) {
      let enableFeature = noop;
      transformHooks.parser.tap((md) => {
        md.use(remarkableKatex);
        md.renderer.rules.katex = wrapFunction(
          md.renderer.rules.katex as Remarkable.Rule<Remarkable.ContentToken>,
          (render, ...args) => {
            enableFeature();
            return render(...args);
          }
        );
      });
      transformHooks.beforeParse.tap((_, context) => {
        enableFeature = () => {
          context.features[name] = true;
        };
      });
      return {
        styles: plugin.config.styles,
        scripts: plugin.config.scripts,
      };
    },
  };
  return plugin;
});
