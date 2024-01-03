import { loadJS, noop } from 'markmap-common';
import { ITransformHooks } from '../../types';
import { definePlugin } from '../base';
import { patchJSItem } from '../../util';
import { name, config } from './config';

const plugin = definePlugin({
  name,
  config,
  transform(transformHooks: ITransformHooks) {
    let loading: Promise<void>;
    const preloadScripts =
      plugin.config?.preloadScripts?.map((item) =>
        patchJSItem(transformHooks.transformer.urlBuilder, item),
      ) || [];
    const autoload = () => {
      loading ||= loadJS(preloadScripts);
      return loading;
    };

    let enableFeature = noop;
    transformHooks.parser.tap((md) => {
      md.set({
        highlight: (str: string, language?: string) => {
          enableFeature();
          const { hljs } = window;
          if (hljs) {
            return hljs.highlightAuto(str, language ? [language] : undefined)
              .value;
          }
          autoload().then(() => {
            transformHooks.retransform.call();
          });
          return str;
        },
      });
    });
    transformHooks.beforeParse.tap((_, context) => {
      enableFeature = () => {
        context.features[name] = true;
      };
    });
    return {
      styles: plugin.config?.styles,
    };
  },
});

export default plugin;
