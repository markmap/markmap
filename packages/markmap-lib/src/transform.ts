import { Remarkable } from 'remarkable';
import { INode, CSSItem, JSItem, wrapFunction } from 'markmap-common';
import {
  ITransformResult,
  ITransformPlugin,
  IAssets,
  IAssetsMap,
  ITransformHooks,
  IFeatures,
  ITransformContext,
} from './types';
import { createTransformHooks, plugins as builtInPlugins } from './plugins';

export { builtInPlugins };

function cleanNode(node: INode, depth = 0): void {
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
  if (node.children.length === 0) {
    delete node.children;
  } else {
    node.children.forEach((child) => cleanNode(child, depth + 1));
    if (node.children.length === 1 && !node.children[0].content) {
      node.children = node.children[0].children;
    }
  }
  node.depth = depth;
}

export class Transformer {
  hooks: ITransformHooks;

  md: Remarkable;

  assetsMap: IAssetsMap;

  constructor(public plugins: ITransformPlugin[] = builtInPlugins) {
    this.hooks = createTransformHooks();

    const assetsMap = {};
    for (const { name, transform } of plugins) {
      assetsMap[name] = transform(this.hooks);
    }
    this.assetsMap = assetsMap;

    const md = new Remarkable('full', {
      html: true,
      breaks: true,
      maxNesting: Infinity,
    } as Remarkable.Options);
    md.renderer.rules.htmltag = wrapFunction(md.renderer.rules.htmltag, {
      after: (ctx) => {
        this.hooks.htmltag.call(ctx);
      },
    });
    this.md = md;
    this.hooks.parser.call(md);
  }

  buildTree(tokens: Remarkable.Token[]): INode {
    const { md } = this;
    const root: INode = {
      type: 'root',
      depth: 0,
      content: '',
      children: [],
      payload: {},
    };
    const stack = [root];
    let depth = 0;
    for (const token of tokens) {
      let current = stack[stack.length - 1];
      if (token.type.endsWith('_open')) {
        const type = token.type.slice(0, -5);
        const payload: INode['payload'] = {};
        if (token.lines) {
          payload.lines = token.lines;
        }
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
        const item: INode = {
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
          const comment = ctx.result.match(/^<!--([\s\S]*?)-->$/);
          const data = comment?.[1].trim();
          if (data === 'fold') {
            current.payload.fold = true;
            ctx.result = '';
          }
        });
        const text = md.renderer.render([token], (md as any).options, {});
        revoke();
        current.content = `${current.content || ''}${text}`;
      } else if (token.type === 'fence') {
        let result = md.renderer.render([token], (md as any).options, {});
        // Remarkable only adds className to `<code>` but not `<pre>`, copy it to make PrismJS style work.
        const matches = result.match(/<code( class="[^"]*")>/);
        if (matches) result = result.replace('<pre>', `<pre${matches[1]}>`);
        current.children.push({
          type: token.type,
          depth: depth + 1,
          content: result,
          children: [],
        });
      } else {
        // ignore other nodes
      }
    }
    return root;
  }

  transform(content: string): ITransformResult {
    const context: ITransformContext = {
      features: {},
    };
    this.hooks.transform.call(this.md, context);
    const tokens = this.md.parse(content, {});
    let root = this.buildTree(tokens);
    cleanNode(root);
    if (root.children?.length === 1) root = root.children[0];
    return { ...context, root };
  }

  /**
   * Get all assets from enabled plugins or filter them by plugin names as keys.
   */
  getAssets(keys?: string[]): IAssets {
    const styles: CSSItem[] = [];
    const scripts: JSItem[] = [];
    keys ??= Object.keys(this.assetsMap);
    for (const assets of keys.map((key) => this.assetsMap[key])) {
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
    return this.getAssets(Object.keys(features).filter((key) => features[key]));
  }
}
