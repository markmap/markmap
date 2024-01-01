import { wrapFunction } from 'markmap-common';
import type { Remarkable } from 'remarkable';
import { ITransformHooks } from '../types';
import { definePlugin } from './base';

const name = 'sourceLines';

const plugin = definePlugin({
  name,
  transform(transformHooks: ITransformHooks) {
    transformHooks.parser.tap((md) => {
      Object.entries(md.renderer.rules).forEach(([key, value]) => {
        if (typeof value === 'function') {
          md.renderer.rules[key] = patchRule(value);
        } else {
          Object.entries(value).forEach(([k, v]) => {
            value[k] = patchRule(v);
          });
        }
      });
    });
    return {};
  },
});

function patchRule(rule: Remarkable.Rule) {
  return wrapFunction(rule, (render, tokens, idx, ...rest) => {
    let html = render(tokens, idx, ...rest);
    const { lines } = tokens[idx];
    if (lines) {
      html = html.replace(
        /^<[\w-]+/,
        (m) => `${m} data-lines="${lines.join(',')}"`,
      );
    }
    return html;
  });
}

export default plugin;
