import { wrapFunction } from 'markmap-common';
import { ITransformHooks } from '../../types';
import { definePlugin } from '../base';

const name = 'sourceLines';

const plugin = definePlugin({
  name,
  transform(transformHooks: ITransformHooks) {
    let frontmatterLines = 0;
    transformHooks.beforeParse.tap((_md, context) => {
      frontmatterLines = context.frontmatterInfo?.lines || 0;
    });
    transformHooks.parser.tap((md) => {
      md.renderer.renderAttrs = wrapFunction(
        md.renderer.renderAttrs,
        (renderAttrs, token) => {
          let attrs = renderAttrs(token);
          if (token.block && token.map) {
            const lineRange = token.map.map((line) => line + frontmatterLines);
            attrs += ` data-lines=${lineRange.join(',')}`;
          }
          return attrs;
        },
      );
    });
    return {};
  },
});

export default plugin;
