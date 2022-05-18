import type { Remarkable } from 'remarkable';
import remarkableKatex from 'remarkable-katex';
import { wrapFunction } from 'markmap-common';
import { IAssets, ITransformHooks } from '../types';
import config from './katex.config';

export { config };
export const name = 'katex';
export function transform(transformHooks: ITransformHooks): IAssets {
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
  transformHooks.transform.tap((_, context) => {
    enableFeature = () => {
      context.features[name] = true;
    };
  });
  return {
    styles: config.styles,
    scripts: config.scripts,
  };
}
