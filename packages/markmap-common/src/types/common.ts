export interface IPureNode {
  /**
   * HTML of the node content.
   */
  content: string;
  /**
   * Additional data created on transformation.
   */
  payload?: {
    [key: string]: unknown;
    /**
     * The folding status of this node.
     *
     * 0 - not folded
     * 1 - folded
     * 2 - folded along with all its child nodes
     */
    fold?: number;
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
  depth: number;
  el: HTMLElement;
  x0: number;
  y0: number;
  size: [width: number, height: number];
}

export type JSScriptItem = {
  type: 'script';
  loaded?: Promise<void>;
  data: {
    src?: string;
    textContent?: string;
    async?: boolean;
    defer?: boolean;
  };
};
export type JSIIFEItem = {
  type: 'iife';
  loaded?: Promise<void>;
  data: {
    fn: (...args: unknown[]) => void;
    getParams?: (context: unknown) => void | unknown[];
  };
};
export type JSItem = JSScriptItem | JSIIFEItem;
export type CSSStyleItem = {
  type: 'style';
  loaded?: Promise<void>;
  data: string;
};
export type CSSStylesheetItem = {
  type: 'stylesheet';
  loaded?: Promise<void>;
  data: {
    href: string;
  };
};
export type CSSItem = CSSStyleItem | CSSStylesheetItem;

export interface IDeferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error?: unknown) => void;
}

export interface IMarkmapOptions {
  autoFit: boolean;
  color: (node: INode) => string;
  duration: number;
  embedGlobalCSS: boolean;
  fitRatio: number;
  id?: string;
  initialExpandLevel: number;
  maxInitialScale: number;
  maxWidth: number;
  nodeMinHeight: number;
  paddingX: number;
  pan: boolean;
  scrollForPan: boolean;
  spacingHorizontal: number;
  spacingVertical: number;
  style?: (id: string) => string;
  toggleRecursively: boolean;
  zoom: boolean;
}

export interface IAssets {
  styles?: CSSItem[];
  scripts?: JSItem[];
}
