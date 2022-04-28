import type { Remarkable } from 'remarkable';
import { CSSItem, JSItem, INode, IWrapContext, Hook } from 'markmap-common';

type Htmltag = Remarkable.Rule<Remarkable.HtmlTagToken, string>;

export interface ITransformHooks {
  /**
   * Tapped once when the parser is created.
   */
  parser: Hook<[md: Remarkable]>;
  /**
   * Tapped every time when Markdown content is transformed.
   */
  transform: Hook<[md: Remarkable, context: ITransformContext]>;
  /**
   * Tapped when Remarkable renders an HTML tag in Markdown.
   */
  htmltag: Hook<[ctx: IWrapContext<Parameters<Htmltag>, ReturnType<Htmltag>>]>;
  /**
   * Indicate that the last transformation is not complete for reasons like
   * lack of resources and is called when it is ready for a new transformation.
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

export interface IAssetsMap {
  [key: string]: IAssets;
}

export interface IFeatures {
  [key: string]: boolean;
}

export interface ITransformContext {
  features: IFeatures;
  frontmatter?: unknown;
}

export interface ITransformResult extends ITransformContext {
  root: INode;
}

export interface ITransformPlugin {
  name: string;
  transform: (transformHooks: ITransformHooks) => IAssets;
}
