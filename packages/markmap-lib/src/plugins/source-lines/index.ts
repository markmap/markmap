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
          if (token.block && token.map) {
            const lineRange = token.map.map((line) => line + frontmatterLines);
            token.attrSet('data-lines', lineRange.join(','));
          }
          return renderAttrs(token);
        },
      );

      if (md.renderer.rules.fence) {
        // In markdown-it, fences with language info are hard-coded as
        // `<pre><code ...>`, so we have to modify the result string directly.
        md.renderer.rules.fence = wrapFunction(
          md.renderer.rules.fence,
          (fence, tokens, idx, ...rest) => {
            let result = fence(tokens, idx, ...rest);
            const token = tokens[idx];
            if (result.startsWith('<pre>') && token.map) {
              const lineRange = token.map.map(
                (line) => line + frontmatterLines,
              );
              result =
                result.slice(0, 4) +
                ` data-lines="${lineRange.join(',')}"` +
                result.slice(4);
            }
            return result;
          },
        );
      }
    });
    return {};
  },
});

export default plugin;
