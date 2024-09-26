import type MarkdownIt from 'markdown-it';
import { CSSItem, IPureNode, JSItem, UrlBuilder } from 'markmap-common';
import { IHtmlParserOptions, buildTree } from 'markmap-html-parser';
import { initializeMarkdownIt } from './markdown-it';
import { plugins as availablePlugins, createTransformHooks } from './plugins';
import {
  IAssets,
  IFeatures,
  ITransformContext,
  ITransformHooks,
  ITransformPlugin,
  ITransformResult,
  ITransformer,
} from './types';
import { patchCSSItem, patchJSItem } from './util';

export const builtInPlugins = process.env.NO_PLUGINS ? [] : availablePlugins;

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

  md: MarkdownIt;

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

    const md = initializeMarkdownIt();
    this.md = md;
    this.hooks.parser.call(md);
  }

  transform(
    content: string,
    fallbackParserOptions?: Partial<IHtmlParserOptions>,
  ): ITransformResult {
    const context: ITransformContext = {
      content,
      features: {},
      contentLineOffset: 0,
      parserOptions: fallbackParserOptions,
    };
    this.hooks.beforeParse.call(this.md, context);
    const html = this.md.render(context.content, {});
    this.hooks.afterParse.call(this.md, context);
    const root = cleanNode(buildTree(html, context.parserOptions));
    root.content ||= `${context.frontmatter?.title || ''}`;
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
}
