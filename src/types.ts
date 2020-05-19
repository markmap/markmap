import { IMarkmap } from './view';

export { IMarkmap };

export interface IHierachy<T> {
  /**
   * type
   */
  t: string;
  /**
   * payload
   */
  p?: any;
  /**
   * children
   */
  c?: T[];
}

export interface INode extends IHierachy<INode> {
  /**
   * depth
   */
  d?: number;
  /**
   * value
   */
  v: string;
}

export interface IMarkmapCreateOptions {
  /**
   * whether to open the generated markmap in browser
   */
  open?: boolean;
  /**
   * Markdown content as string. It will be ignored if `input` is provided.
   */
  content?: string;
  /**
   * Input file path of a Markdown file. If this is provided, `content` will be ignored.
   */
  input?: string;
  /**
   * Output file path of the markmap HTML file. If not provided, the same basename as the Markdown input file will be used.
   */
  output?: string;
  /**
   * Enable MathJax support. If an object is passed, it will be merged into MathJax options.
   */
  mathJax?: boolean | object;
  /**
   * Enable Prism support for code blocks.
   */
  prism?: boolean;
}

export interface IMarkmapOptions {
  id?: string;
  duration?: number;
  nodeFont?: string;
  nodeMinHeight?: number;
  spacingVertical?: number;
  spacingHorizontal?: number;
  autoFit?: boolean;
  fitRatio?: number;
  color?: (node: INode) => string;
  paddingX?: number;
  style?: (id: string) => string;
}

export interface IMarkmapState {
  id: string;
  data?: INode;
  minX?: number;
  maxX?: number;
  minY?: number;
  maxY?: number;
}

export type JSScriptItem = {
  type: 'script';
  data: {
    src: string;
  };
};
export type JSIIFEItem = {
  type: 'iife';
  data: {
    fn: (...args: any[]) => void;
    getParams?: (context: any) => void | any[];
  };
};
export type JSItem = JSScriptItem | JSIIFEItem;
export type CSSItem = {
  type: 'style' | 'stylesheet';
  data: any;
};

export interface IMarkmapPlugin {
  styles: CSSItem[];
  scripts: JSItem[];
  initialize?: (Markmap: IMarkmap, options) => void;
}

export interface IMarkmapFlexTreeItem {
  parent: IMarkmapFlexTreeItem;
  data: INode;
  depth: number;
  xSize: number;
  ySize: number;
  ySizeInner: number;
  x: number;
  y: number;
}

export interface IMarkmapLinkItem {
  source: IMarkmapFlexTreeItem;
  target: IMarkmapFlexTreeItem;
}
