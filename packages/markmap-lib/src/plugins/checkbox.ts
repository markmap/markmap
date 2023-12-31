import { ITransformHooks } from '../types';
import { definePlugin } from './base';

import { svg_marked, svg_unmarked } from '../constants';

const name = 'checkbox';

const plugin = definePlugin({
  name,
  transform(transformHooks: ITransformHooks) {
    transformHooks.parser.tap((md) => {
      md.core.ruler.before(
        'inline',
        'checkbox',
        (state) => {
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
                if (token.content.startsWith('[ ]')) {
                  token.content = `${svg_unmarked} ${token.content.slice(3)}`;
                } else if (token.content.startsWith('[x]')) {
                  token.content = `${svg_marked} ${token.content.slice(3)}`;
                }
              }
            }
          }
          return false;
        },
        {},
      );
    });
    return {};
  },
});

export default plugin;
