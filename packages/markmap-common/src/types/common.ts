export interface IHierarchy<T> {
  type: string;
  payload?: {
    /**
     * An auto-increment unique ID for each node.
     */
    id?: number;
    /**
     * The unique identifier of a node, supposed to be based on content.
     */
    key?: string;
    /**
     * Whether the node's children are fold.
     */
    fold?: boolean;
    size?: [width: number, height: number];
    el?: HTMLElement;
    x0?: number;
    y0?: number;
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
  children?: T[];
}

export interface INode extends IHierarchy<INode> {
  depth?: number;
  /**
   * HTML of the node content.
   */
  content: string;
}

export type JSScriptItem = {
  type: 'script';
  data: {
    src: string;
    async?: boolean;
    defer?: boolean;
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
export type CSSStyleItem = {
  type: 'style';
  data: string;
};
export type CSSStylesheetItem = {
  type: 'stylesheet';
  data: {
    href: string;
  };
};
export type CSSItem = CSSStyleItem | CSSStylesheetItem;

export interface IWrapContext<T extends (...args: any[]) => any> {
  thisObj: any;
  args: Parameters<T>;
  result?: ReturnType<T>;
}

export interface IDeferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error?: any) => void;
}
