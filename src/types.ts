export interface IHierachy<T> {
  t: string;
  p?: any;
  c?: T[];
}

export interface IValue extends IHierachy<IValue> {
  v?: string;
}

export interface INode extends IHierachy<INode> {
  d?: number;
  v?: IValue[];
}

export interface IMarkmapCreateOptions {
  open?: boolean;
  content?: string;
  input?: string;
  output?: string;
}
