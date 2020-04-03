export interface IValue {
  t: string;
  v?: string;
  p?: any;
  children?: IValue[];
}

export interface INode {
  t: string;
  d?: number;
  v?: IValue[];
  p?: any;
  children?: INode[];
}

export interface IMarkmapCreateOptions {
  open?: boolean;
  content?: string;
  input?: string;
  output?: string;
}
