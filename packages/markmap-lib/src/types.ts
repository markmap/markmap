import type MarkdownIt from 'markdown-it';
import { CSSItem, Hook, IPureNode, JSItem, UrlBuilder } from 'markmap-common';
import { IHtmlParserOptions } from 'markmap-html-parser';
import { IMarkmapJSONOptions as IMarkmapJSONOptionsForView } from 'markmap-view';

export interface ITransformHooks {
  transformer: ITransformer;
  /**
   * Tapped once when the parser is created.
   */
  parser: Hook<[md: MarkdownIt]>;
  /**
   * Tapped every time before Markdown content is parsed.
   */
  beforeParse: Hook<[md: MarkdownIt, context: ITransformContext]>;
  /**
   * Tapped every time after Markdown content is parsed.
   */
  afterParse: Hook<[md: MarkdownIt, context: ITransformContext]>;
  /**
   * Used in autoloader to force rerender when resource is loaded.
   */
  retransform: Hook<[]>;
}

export interface IAssets {
  styles?: CSSItem[];
  scripts?: JSItem[];
}

export interface IMarkmapCreateOptions {
  /**
   * Markdown content as string.
   */
  content?: string;
  /**
   * Output file path of the markmap HTML file.
   * If not provided, the same basename as the Markdown input file will be used.
   */
  output?: string;
}

export interface IFeatures {
  [key: string]: boolean;
}

export interface ITransformer {
  urlBuilder: UrlBuilder;
}

export interface IMarkmapJSONOptions extends IMarkmapJSONOptionsForView {
  htmlParser: Partial<IHtmlParserOptions>;
}

export interface ITransformContext {
  features: IFeatures;
  content: string;
  frontmatter?: {
    title?: string;
    markmap?: Partial<IMarkmapJSONOptions>;
  };
  frontmatterInfo?: {
    lines: number;
    offset: number;
  };
  parserOptions?: Partial<IHtmlParserOptions>;
}

export interface ITransformResult extends ITransformContext {
  root: IPureNode;
}

export interface ITransformPlugin {
  name: string;
  config?: IAssets & {
    versions?: Record<string, string>;
    /** For browsers only. Scripts that needs to be preloaded for the transformer to work. */
    preloadScripts?: JSItem[];
    /** Additional resources needed for the plugin to work offline. */
    resources?: string[];
  };
  /**
   * @returns The assets that should be loaded for rendering the output.
   */
  transform: (transformHooks: ITransformHooks) => IAssets;
}
