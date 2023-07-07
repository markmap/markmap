import { getFullUrl } from 'markmap-common';
import { definePlugin } from './base';
import { ITransformHooks } from '../types';

const name = 'npmUrl';

export default definePlugin({
  name,
  transform(transformHooks: ITransformHooks) {
    transformHooks.afterParse.tap((_, context) => {
      const { frontmatter } = context;
      if (frontmatter?.markmap) {
        ['extraJs', 'extraCss'].forEach((key) => {
          if (frontmatter.markmap[key]) {
            frontmatter.markmap[key] = frontmatter.markmap[key].map((path) => {
              if (path.startsWith('npm:')) {
                return getFullUrl(path.slice(4));
              }
              return path;
            });
          }
        });
      }
    });
    return {};
  },
});
