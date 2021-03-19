import { Remarkable } from 'remarkable';
import {
  INode,
  CSSItem,
  JSItem,
  IWrapContext,
  wrapFunction,
} from 'markmap-common';
import {
  ITransformResult,
  ITransformPlugin,
  IAssets,
  IAssetsMap,
  ITransformHooks,
  IFeatures,
} from './types';
import { createTransformHooks, plugins as builtInPlugins } from './plugins';

export { builtInPlugins };

function cleanNode(node: INode, depth = 0): void {
  if (node.t === 'heading') {
    // drop all paragraphs
    node.c = node.c.filter((item) => item.t !== 'paragraph');
  } else if (node.t === 'list_item') {
    // keep first paragraph as content of list_item, drop others
    node.c = node.c.filter((item) => {
      if (['paragraph', 'fence'].includes(item.t)) {
        if (!node.v) {
          node.v = item.v;
          node.p = {
            ...node.p,
            ...item.p,
          };
        }
        return false;
      }
      return true;
    });
    if (node.p?.index != null) {
      node.v = `${node.p.index}. ${node.v}`;
    }
  } else if (node.t === 'ordered_list') {
    let index = node.p?.start ?? 1;
    node.c.forEach((item) => {
      if (item.t === 'list_item') {
        item.p = {
          ...item.p,
          index,
        };
        index += 1;
      }
    });
  }
  if (node.c.length === 0) {
    delete node.c;
  } else {
    node.c.forEach((child) => cleanNode(child, depth + 1));
    if (node.c.length === 1 && !node.c[0].v) {
      node.c = node.c[0].c;
    }
  }
  node.d = depth;
}

export class Transformer {
  plugins: ITransformPlugin[];

  hooks: ITransformHooks;

  md: Remarkable;

  assetsMap: IAssetsMap;

  constructor(plugins: ITransformPlugin[] = builtInPlugins) {
    this.plugins = plugins;
    this.hooks = createTransformHooks();
    const md = new Remarkable({
      html: true,
      breaks: true,
      maxNesting: Infinity,
    });
    md.block.ruler.enable([
      'deflist',
    ]);
    md.renderer.rules.htmltag = wrapFunction(md.renderer.rules.htmltag, {
      after: (ctx: IWrapContext<any>) => {
        this.hooks.htmltag.call(ctx);
      },
    });
    this.md = md;
    const assetsMap = {};
    for (const { name, transform } of plugins) {
      assetsMap[name] = transform(this.hooks);
    }
    this.assetsMap = assetsMap;
  }

  buildTree(tokens): INode {
    const { md } = this;
    // TODO deal with <dl><dt>
    const root: INode = {
      t: 'root',
      d: 0,
      v: '',
      c: [],
      p: {},
    };
    const stack = [root];
    let depth = 0;
    for (const token of tokens) {
      let current = stack[stack.length - 1];
      if (token.type.endsWith('_open')) {
        const type = token.type.slice(0, -5);
        const payload: any = {};
        if (token.lines) {
          payload.lines = token.lines;
        }
        if (type === 'heading') {
          depth = token.hLevel;
          while (current?.d >= depth) {
            stack.pop();
            current = stack[stack.length - 1];
          }
        } else {
          depth = Math.max(depth, current?.d || 0) + 1;
          if (type === 'ordered_list') {
            payload.start = token.order;
          }
        }
        const item: INode = {
          t: type,
          d: depth,
          p: payload,
          v: '',
          c: [],
        };
        current.c.push(item);
        stack.push(item);
      } else if (!current) {
        continue;
      } else if (token.type === `${current.t}_close`) {
        if (current.t === 'heading') {
          depth = current.d;
        } else {
          stack.pop();
          depth = 0;
        }
      } else if (token.type === 'inline') {
        const revoke = this.hooks.htmltag.tap((ctx) => {
          const comment = ctx.result.match(/^<!--([\s\S]*?)-->$/);
          const data = comment?.[1].trim();
          if (data === 'fold') {
            current.p.f = true;
            ctx.result = '';
          }
        });
        const text = md.renderer.render([token], md.options, {});
        revoke();
        current.v = `${current.v || ''}${text}`;
      } else if (token.type === 'fence') {
        let result = md.renderer.render([token], md.options, {});
        // Remarkable only adds className to `<code>` but not `<pre>`, copy it to make PrismJS style work.
        const matches = result.match(/<code( class="[^"]*")>/);
        if (matches) result = result.replace('<pre>', `<pre${matches[1]}>`);
        current.c.push({
          t: token.type,
          d: depth + 1,
          v: result,
          c: [],
        });
      } else {
        // ignore other nodes
      }
    }
    return root;
  }

  transform(content: string): ITransformResult {
    const features: IFeatures = {};
    this.hooks.parser.call(this.md, features);
    const tokens = this.md.parse(content || '', {});
    let root = this.buildTree(tokens);
    cleanNode(root);
    if (root.c?.length === 1) root = root.c[0];
    return { root, features };
  }

  /**
   * Get all assets from enabled plugins or filter them by plugin names as keys.
   */
  getAssets(keys?: string[]): IAssets {
    const styles: CSSItem[] = [];
    const scripts: JSItem[] = [];
    keys ??= Object.keys(this.assetsMap);
    for (const assets of keys.map(key => this.assetsMap[key])) {
      if (assets) {
        if (assets.styles) styles.push(...assets.styles);
        if (assets.scripts) scripts.push(...assets.scripts);
      }
    }
    return { styles, scripts };
  }

  /**
   * Get used assets by features object returned by `transform`.
   */
  getUsedAssets(features: IFeatures): IAssets {
    return this.getAssets(Object.keys(features).filter(key => features[key]));
  }
}
