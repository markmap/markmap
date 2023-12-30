import { INode } from 'markmap-common';

export interface IMarkmapState {
  id: string;
  data?: INode;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
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
