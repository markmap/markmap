import { INode } from 'markmap-common';

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
