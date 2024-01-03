import { loadJS, noop } from 'markmap-common';
import { ITransformHooks } from '../../types';
import { definePlugin } from '../base';
import { config, name } from './config';
import { patchJSItem } from '../../util';

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

    function loadLanguageAndRefresh(
      lang: string,
      transformHooks: ITransformHooks,
    ) {
      autoload().then(() => {
        window.Prism.plugins.autoloader.loadLanguages([lang], () => {
          transformHooks.retransform.call();
        });
      });
    }

    let enableFeature = noop;
    transformHooks.parser.tap((md) => {
      md.set({
        highlight: (str, lang) => {
          enableFeature();
          const { Prism } = window;
          const grammar = Prism?.languages?.[lang];
          if (!grammar) {
            loadLanguageAndRefresh(lang, transformHooks);
            return '';
          }
          return Prism.highlight(str, grammar, lang);
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
