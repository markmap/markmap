import { definePlugin } from '../base';
import { ITransformHooks } from '../../types';

const name = 'npmUrl';

export default definePlugin({
  name,
  transform(transformHooks: ITransformHooks) {
    transformHooks.afterParse.tap((_, context) => {
      const { frontmatter } = context;
      const markmap = frontmatter?.markmap;
      if (markmap) {
        (['extraJs', 'extraCss'] as const).forEach((key) => {
          const value = markmap[key];
          if (value) {
            markmap[key] = value.map((path) => {
              if (path.startsWith('npm:')) {
                return transformHooks.transformer.urlBuilder.getFullUrl(
                  path.slice(4),
                );
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
