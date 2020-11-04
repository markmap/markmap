import { CSSItem, JSItem, INode } from 'markmap-common';
import { createTransformHooks } from './plugins/base';

export type ITransformHooks = ReturnType<typeof createTransformHooks>;

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
  [key: string]: IAssets,
}

export interface IFeatures { [key: string]: boolean; }

export interface ITransformResult {
  root: INode;
  features: IFeatures;
}

export interface ITransformPlugin {
  name: string;
  transform: (transformHooks: ITransformHooks) => IAssets;
}
