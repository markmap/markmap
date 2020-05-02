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
  data?: any;
  minX?: number;
  maxX?: number;
  minY?: number;
  maxY?: number;
}

export type JSItem = {
  type: 'script' | 'iife';
  data: any;
};
export type CSSItem = {
  type: 'style' | 'stylesheet';
  data: any;
};

export interface IMarkmapPlugin {
  styles: CSSItem[];
  scripts: JSItem[];
  transform: (nodes, mm) => void;
}
