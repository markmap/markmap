import { ITransformHooks } from '../../types';
import { definePlugin } from '../base';

const svg_marked = `<svg width="16" height="16" fill="currentColor" viewBox="0 -3 24 24"><path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2m-9 14-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8z"/></svg>`;
const svg_unmarked = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 -3 24 24"><path fill-rule="evenodd" d="M6 5a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1zM3 6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-5z" clip-rule="evenodd"/></svg>`;

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
