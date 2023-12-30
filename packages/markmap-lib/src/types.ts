import {
  CSSItem,
  Hook,
  IPureNode,
  IWrapContext,
  JSItem,
  UrlBuilder,
} from 'markmap-common';
import { IHtmlParserOptions } from 'markmap-html-parser';
import { IMarkmapJSONOptions as IMarkmapJSONOptionsForView } from 'markmap-view';
import type { Remarkable } from 'remarkable';

type Htmltag = Remarkable.Rule<Remarkable.HtmlTagToken, string>;

export interface ITransformHooks {
  transformer: ITransformer;
  /**
   * Tapped once when the parser is created.
   */
  parser: Hook<[md: Remarkable]>;
  /**
   * Tapped every time before Markdown content is parsed.
   */
  beforeParse: Hook<[md: Remarkable, context: ITransformContext]>;
  /**
   * Tapped every time after Markdown content is parsed.
   */
  afterParse: Hook<[md: Remarkable, context: ITransformContext]>;
  /**
   * Tapped when Remarkable renders an HTML tag in Markdown.
   */
  htmltag: Hook<[ctx: IWrapContext<Parameters<Htmltag>, ReturnType<Htmltag>>]>;
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
  /**
   * same as last but for images .png or .jpeg
   */
  outputImage?: string;
}

export interface IFeatures {
  [key: string]: boolean;
}

export interface ITransformer {
  urlBuilder: UrlBuilder;
}

export interface IMarkmapJSONOptions extends IMarkmapJSONOptionsForView {
  htmlParser?: Partial<IHtmlParserOptions>;
}

export interface ITransformContext {
  features: IFeatures;
  content: string;
  frontmatter?: {
    markmap?: IMarkmapJSONOptions;
  };
  /** The index of line where content without frontmatter starts */
  contentLineOffset: number;
}

export interface ITransformResult extends ITransformContext {
  root: IPureNode;
}

export interface ITransformPlugin {
  name: string;
  config?: IAssets & {
    versions?: Record<string, string>;
    preloadScripts?: JSItem[];
  };
  /**
   * @returns The assets that should be loaded for rendering the output.
   */
  transform: (transformHooks: ITransformHooks) => IAssets;
}
