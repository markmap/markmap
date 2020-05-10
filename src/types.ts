import { Markmap } from './view';

export interface IHierachy<T> {
  t: string;
  p?: any;
  c?: T[];
}

export interface INode extends IHierachy<INode> {
  d?: number;
  v: string;
}

export interface IMarkmapCreateOptions {
  open?: boolean;
  content?: string;
  input?: string;
  output?: string;
  mathJax?: boolean | object;
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
  color?: (key: string) => string;
  colorDepth?: number;
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
  transform: (nodes: HTMLElement[], mm: Markmap) => void;
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
