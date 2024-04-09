import { ITransformHooks } from '../../types';
import { definePlugin } from '../base';
import svgMarked from './marked.svg?raw';
import svgUnmarked from './unmarked.svg?raw';

const name = 'checkbox';

const images = {
  ' ': svgUnmarked.trim(),
  x: svgMarked.trim(),
};

const plugin = definePlugin({
  name,
  transform(transformHooks: ITransformHooks) {
    transformHooks.parser.tap((md) => {
      md.core.ruler.before('inline', 'checkbox', (state) => {
        for (let i = 2; i < state.tokens.length; i += 1) {
          const token = state.tokens[i];
          if (token.type === 'inline' && token.content) {
            const prevType = state.tokens[i - 1].type;
            const prevPrevType = state.tokens[i - 2].type;
            // accept heading and list items paragraphs
            if (
              prevType === 'heading_open' ||
              (prevType === 'paragraph_open' &&
                prevPrevType === 'list_item_open')
            ) {
              token.content = token.content.replace(/^\[(.)\] /, (m, g) =>
                images[g] ? `${images[g]} ` : m,
              );
            }
          }
        }
        return false;
      });
    });
    return {};
  },
});

export default plugin;
