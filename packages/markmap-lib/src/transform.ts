import {
  CSSItem,
  IMarkmapOptions,
  IPureNode,
  JSItem,
  UrlBuilder,
  buildJSItem,
  persistCSS,
  persistJS,
  wrapFunction,
} from 'markmap-common';
import { IHtmlParserOptions, buildTree } from 'markmap-html-parser';
import { Remarkable } from 'remarkable';
import { baseJsPaths, template } from './constants';
import { plugins as builtInPlugins, createTransformHooks } from './plugins';
import {
  IAssets,
  IFeatures,
  ITransformContext,
  ITransformHooks,
  ITransformPlugin,
  ITransformResult,
  ITransformer,
  IMarkmapJSONOptions,
} from './types';
import { patchCSSItem, patchJSItem } from './util';

export { builtInPlugins };

function cleanNode(node: IPureNode): IPureNode {
  while (!node.content && node.children.length === 1) {
    node = node.children[0];
  }
  while (node.children.length === 1 && !node.children[0].content) {
    node = {
      ...node,
      children: node.children[0].children,
    };
  }
  return {
    ...node,
    children: node.children.map(cleanNode),
  };
}

export class Transformer implements ITransformer {
  hooks: ITransformHooks;

  md: Remarkable;

  assetsMap: Record<string, IAssets> = {};

  urlBuilder = new UrlBuilder();

  plugins: ITransformPlugin[];

  constructor(
    plugins: Array<
      ITransformPlugin | (() => ITransformPlugin)
    > = builtInPlugins,
  ) {
    this.hooks = createTransformHooks(this);
    this.plugins = plugins.map((plugin) =>
      typeof plugin === 'function' ? plugin() : plugin,
    );

    const assetsMap: typeof this.assetsMap = {};
    for (const { name, transform } of this.plugins) {
      assetsMap[name] = transform(this.hooks);
    }
    this.assetsMap = assetsMap;

    const md = new Remarkable('full', {
      html: true,
      breaks: true,
      maxNesting: Infinity,
    } as Remarkable.Options);
    md.renderer.rules.htmltag = wrapFunction(
      md.renderer.rules.htmltag,
      (render, ...args) => {
        const result = render(...args);
        this.hooks.htmltag.call({ args, result });
        return result;
      },
    );
    this.md = md;
    this.hooks.parser.call(md);
  }

  transform(
    content: string,
    opts?: Partial<IHtmlParserOptions>,
  ): ITransformResult {
    const context: ITransformContext = {
      content,
      features: {},
      contentLineOffset: 0,
    };
    this.hooks.beforeParse.call(this.md, context);
    const html = this.md.render(context.content, {});
    this.hooks.afterParse.call(this.md, context);
    const root = cleanNode(
      buildTree(html, {
        ...context.frontmatter?.markmap?.htmlParser,
        ...opts,
      }),
    );
    return { ...context, root };
  }

  /**
   * Get all assets from enabled plugins or filter them by plugin names as keys.
   */
  getAssets(keys?: string[]): IAssets {
    const styles: CSSItem[] = [];
    const scripts: JSItem[] = [];
    keys ??= this.plugins.map((plugin) => plugin.name);
    for (const assets of keys.map((key) => this.assetsMap[key])) {
      if (assets) {
        if (assets.styles) styles.push(...assets.styles);
        if (assets.scripts) scripts.push(...assets.scripts);
      }
    }
    return {
      styles: styles.map((item) => patchCSSItem(this.urlBuilder, item)),
      scripts: scripts.map((item) => patchJSItem(this.urlBuilder, item)),
    };
  }

  /**
   * Get used assets by features object returned by `transform`.
   */
  getUsedAssets(features: IFeatures): IAssets {
    const keys = this.plugins
      .map((plugin) => plugin.name)
      .filter((name) => features[name]);
    return this.getAssets(keys);
  }

  fillTemplate(
    root: IPureNode | null,
    assets: IAssets,
    extra?: {
      baseJs?: JSItem[];
      jsonOptions?: IMarkmapJSONOptions;
      getOptions?: (
        jsonOptions: IMarkmapJSONOptions,
      ) => Partial<IMarkmapOptions>;
    },
  ): string {
    extra = {
      ...extra,
    };
    extra.baseJs ??= baseJsPaths
      .map((path) => this.urlBuilder.getFullUrl(path))
      .map((path) => buildJSItem(path));
    const { scripts, styles } = assets;
    const cssList = [...(styles ? persistCSS(styles) : [])];
    const context = {
      getMarkmap: () => window.markmap,
      getOptions: extra.getOptions,
      jsonOptions: extra.jsonOptions,
      root,
    };
    const jsList = [
      ...persistJS(
        [
          ...extra.baseJs,
          ...(scripts || []),
          {
            type: 'iife',
            data: {
              fn: (
                getMarkmap: (typeof context)['getMarkmap'],
                getOptions: (typeof context)['getOptions'],
                root: (typeof context)['root'],
                jsonOptions: IMarkmapJSONOptions,
              ) => {
                const markmap = getMarkmap();
                window.mm = markmap.Markmap.create(
                  'svg#mindmap',
                  (getOptions || markmap.deriveOptions)(jsonOptions),
                  root,
                );
              },
              getParams: ({ getMarkmap, getOptions, root, jsonOptions }) => {
                return [getMarkmap, getOptions, root, jsonOptions];
              },
            },
          } as JSItem,
        ],
        context,
      ),
    ];
    const html = template
      .replace('<!--CSS-->', () => cssList.join(''))
      .replace('<!--JS-->', () => jsList.join(''));
    return html;
  }
}
