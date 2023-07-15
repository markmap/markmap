import { Remarkable } from 'remarkable';
import {
  UrlBuilder,
  JSItem,
  CSSItem,
  IMarkmapOptions,
  IMarkmapJSONOptions,
  persistJS,
  persistCSS,
  buildJSItem,
  IPureNode,
  wrapFunction,
} from 'markmap-common';
import {
  ITransformResult,
  ITransformPlugin,
  IAssets,
  ITransformHooks,
  IFeatures,
  ITransformContext,
  ITransformer,
} from './types';
import { createTransformHooks, plugins as builtInPlugins } from './plugins';
import { template, baseJsPaths } from './constants';
import { patchCSSItem, patchJSItem } from './plugins/util';

export { builtInPlugins };

function cleanNode(node: IPureNode): void {
  if (node.type === 'heading') {
    // drop all paragraphs
    node.children = node.children.filter((item) => item.type !== 'paragraph');
  } else if (node.type === 'list_item') {
    // keep first paragraph as content of list_item, drop others
    node.children = node.children.filter((item) => {
      if (['paragraph', 'fence'].includes(item.type)) {
        if (!node.content) {
          node.content = item.content;
          node.payload = {
            ...node.payload,
            ...item.payload,
          };
        }
        return false;
      }
      return true;
    });
    if (node.payload?.index != null) {
      node.content = `${node.payload.index}. ${node.content}`;
    }
  } else if (node.type === 'ordered_list') {
    let index = node.payload?.startIndex ?? 1;
    node.children.forEach((item) => {
      if (item.type === 'list_item') {
        item.payload = {
          ...item.payload,
          index,
        };
        index += 1;
      }
    });
  }
  if (node.children.length > 0) {
    node.children.forEach((child) => cleanNode(child));
    if (node.children.length === 1 && !node.children[0].content) {
      node.children = node.children[0].children;
    }
  }
}

function resetDepth(node: IPureNode, depth = 0) {
  node.depth = depth;
  node.children.forEach((child) => {
    resetDepth(child, depth + 1);
  });
}

export class Transformer implements ITransformer {
  hooks: ITransformHooks;

  md: Remarkable;

  assetsMap: Record<string, IAssets> = {};

  urlBuilder = new UrlBuilder();

  plugins: ITransformPlugin[];

  constructor(
    plugins: Array<ITransformPlugin | (() => ITransformPlugin)> = builtInPlugins
  ) {
    this.hooks = createTransformHooks(this);
    this.plugins = plugins.map((plugin) =>
      typeof plugin === 'function' ? plugin() : plugin
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
      }
    );
    this.md = md;
    this.hooks.parser.call(md);
  }

  buildTree(tokens: Remarkable.Token[]): IPureNode {
    const { md } = this;
    const root: IPureNode = {
      type: 'root',
      depth: 0,
      content: '',
      children: [],
      payload: {},
    };
    const stack = [root];
    let depth = 0;
    for (const token of tokens) {
      const payload: IPureNode['payload'] = {};
      if (token.lines) {
        payload.lines = token.lines;
      }
      let current = stack[stack.length - 1];
      if (token.type.endsWith('_open')) {
        const type = token.type.slice(0, -5);
        if (type === 'heading') {
          depth = (token as Remarkable.HeadingOpenToken).hLevel;
          while (current?.depth >= depth) {
            stack.pop();
            current = stack[stack.length - 1];
          }
        } else {
          depth = Math.max(depth, current?.depth || 0) + 1;
          if (type === 'ordered_list') {
            payload.startIndex = (
              token as Remarkable.OrderedListOpenToken
            ).order;
          }
        }
        const item: IPureNode = {
          type,
          depth,
          payload,
          content: '',
          children: [],
        };
        current.children.push(item);
        stack.push(item);
      } else if (!current) {
        continue;
      } else if (token.type === `${current.type}_close`) {
        if (current.type === 'heading') {
          depth = current.depth;
        } else {
          stack.pop();
          depth = 0;
        }
      } else if (token.type === 'inline') {
        const revoke = this.hooks.htmltag.tap((ctx) => {
          const comment = ctx.result?.match(/^<!--([\s\S]*?)-->$/);
          const data = comment?.[1].trim().split(' ');
          if (data?.[0] === 'fold') {
            current.payload = {
              ...current.payload,
              fold: ['all', 'recursively'].includes(data[1]) ? 2 : 1,
            };
            ctx.result = '';
          }
        });
        const text = md.renderer.render([token], (md as any).options, {});
        revoke();
        current.content = `${current.content || ''}${text}`;
      } else if (token.type === 'fence') {
        const result = md.renderer.render([token], (md as any).options, {});
        current.children.push({
          type: token.type,
          depth: depth + 1,
          content: result,
          children: [],
          payload,
        });
      } else {
        // ignore other nodes
      }
    }
    return root;
  }

  transform(content: string): ITransformResult {
    const context: ITransformContext = {
      content,
      features: {},
      contentLineOffset: 0,
    };
    this.hooks.beforeParse.call(this.md, context);
    const tokens = this.md.parse(context.content, {});
    this.hooks.afterParse.call(this.md, context);
    let root = this.buildTree(tokens);
    cleanNode(root);
    if (root.children?.length === 1) root = root.children[0];
    resetDepth(root);
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
      styles: styles.map((item) => patchCSSItem(this, item)),
      scripts: scripts.map((item) => patchJSItem(this, item)),
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
        jsonOptions: IMarkmapJSONOptions
      ) => Partial<IMarkmapOptions>;
    }
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
                jsonOptions: IMarkmapJSONOptions
              ) => {
                const markmap = getMarkmap();
                window.mm = markmap.Markmap.create(
                  'svg#mindmap',
                  (getOptions || markmap.deriveOptions)(jsonOptions),
                  root
                );
              },
              getParams: ({ getMarkmap, getOptions, root, jsonOptions }) => {
                return [getMarkmap, getOptions, root, jsonOptions];
              },
            },
          } as JSItem,
        ],
        context
      ),
    ];
    const html = template
      .replace('<!--CSS-->', () => cssList.join(''))
      .replace('<!--JS-->', () => jsList.join(''));
    return html;
  }
}
