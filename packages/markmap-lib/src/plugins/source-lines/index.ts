import { wrapFunction } from 'markmap-common';
import { ITransformHooks } from '../../types';
import { definePlugin } from '../base';

const name = 'sourceLines';

const plugin = definePlugin({
  name,
  transform(transformHooks: ITransformHooks) {
    transformHooks.parser.tap((md) => {
      md.renderer.renderAttrs = wrapFunction(
        md.renderer.renderAttrs,
        (renderAttrs, token) => {
          let attrs = renderAttrs(token);
          if (token.block && token.map) {
            attrs += ` data-lines=${token.map.join(',')}`;
          }
          return attrs;
        },
      );
    });
    return {};
  },
});

export default plugin;
