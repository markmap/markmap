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
}

export interface IMarkmapOptions {
  id?: string;
  duration: number;
  nodeFont: string;
  spacingVertical: number;
  spacingHorizontal: number;
  autoFit: boolean;
  fitRatio: number;
  color: (key: string) => string;
  colorDepth: number;
  paddingX: number;
  style?: (id: string) => string;
}
