import type { Remarkable } from 'remarkable';
import remarkableKatex from 'remarkable-katex';
import { wrapFunction } from 'markmap-common';
import { ITransformHooks } from '../types';
import config from './katex.config';
import { definePlugin } from './base';

const name = 'katex';

export default definePlugin({
  name,
  config,
  transform(transformHooks: ITransformHooks) {
    let enableFeature = () => {};
    transformHooks.parser.tap((md) => {
      md.use(remarkableKatex);
      md.renderer.rules.katex = wrapFunction(
        md.renderer.rules.katex as Remarkable.Rule<Remarkable.ContentToken>,
        {
          after: () => {
            enableFeature();
          },
        }
      );
    });
    transformHooks.beforeParse.tap((_, context) => {
      enableFeature = () => {
        context.features[name] = true;
      };
    });
    return {
      styles: config.styles,
      scripts: config.scripts,
    };
  },
});
