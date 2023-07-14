import { INode } from 'markmap-common';

export interface IMarkmapState {
  id: string;
  data?: INode;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}
