export interface IPureNode {
  type: string;
  depth: number;
  /**
   * HTML of the node content.
   */
  content: string;
  /**
   * Additional data created on transformation.
   */
  payload?: {
    /**
     * The folding status of this node.
     *
     * 0 - not folded
     * 1 - folded
     * 2 - folded along with all its child nodes
     */
    fold?: number;
    /**
     * Index of list items.
     */
    index?: number;
    /**
     * Start index of an ordered list.
     */
    startIndex?: number;
    /**
     * First and last lines of the source generating the node.
     */
    lines?: [startLine: number, endLine: number];
  };
  children: IPureNode[];
}

export interface INode extends IPureNode {
  /**
   * Store temporary data that helps rendering.
   */
  state: INodeState;
  children: INode[];
}

export interface INodeState {
  /**
   * An auto-increment unique ID for each node.
   */
  id: number;
  /**
   * A dot separated sequence of the node and its ancestors.
   */
  path: string;
  /**
   * The unique identifier of a node, supposed to be based on content.
   */
  key: string;
  el: HTMLElement;
  x0: number;
  y0: number;
  size: [width: number, height: number];
}

export type JSScriptItem = {
  type: 'script';
  loaded?: Promise<void> | boolean;
  data: {
    src?: string;
    textContent?: string;
    async?: boolean;
    defer?: boolean;
  };
};
export type JSIIFEItem = {
  type: 'iife';
  loaded?: Promise<void> | boolean;
  data: {
    fn: (...args: unknown[]) => void;
    getParams?: (context: unknown) => void | unknown[];
  };
};
export type JSItem = JSScriptItem | JSIIFEItem;
export type CSSStyleItem = {
  type: 'style';
  loaded?: boolean;
  data: string;
};
export type CSSStylesheetItem = {
  type: 'stylesheet';
  loaded?: boolean;
  data: {
    href: string;
  };
};
export type CSSItem = CSSStyleItem | CSSStylesheetItem;

export interface IWrapContext<T extends unknown[], U> {
  args: T;
  result?: U;
}

export interface IDeferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error?: unknown) => void;
}

export interface IMarkmapJSONOptions {
  color?: string[];
  colorFreezeLevel?: number;
  duration?: number;
  maxWidth?: number;
  initialExpandLevel?: number;
  extraJs?: string[];
  extraCss?: string[];
  zoom?: boolean;
  pan?: boolean;
}

export interface IMarkmapOptions {
  id?: string;
  autoFit: boolean;
  color: (node: INode) => string;
  duration: number;
  embedGlobalCSS: boolean;
  fitRatio: number;
  maxWidth: number;
  nodeMinHeight: number;
  paddingX: number;
  scrollForPan: boolean;
  spacingHorizontal: number;
  spacingVertical: number;
  initialExpandLevel: number;
  zoom: boolean;
  pan: boolean;
  toggleRecursively: boolean;
  style?: (id: string) => string;
}
