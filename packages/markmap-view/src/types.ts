import { INode } from 'markmap-common';

export interface IMarkmapState {
  id: string;
  data?: INode;
  highlight?: INode;
  rect: {
    x1: number;
    x2: number;
    y1: number;
    y2: number;
  };
}

export interface IMarkmapJSONOptions {
  color: string[];
  colorFreezeLevel: number;
  duration: number;
  extraCss: string[];
  extraJs: string[];
  fitRatio: number;
  initialExpandLevel: number;
  maxInitialScale: number;
  maxWidth: number;
  nodeMinHeight: number;
  paddingX: number;
  pan: boolean;
  spacingHorizontal: number;
  spacingVertical: number;
  zoom: boolean;
  lineWidth: number | number[];
}

export interface IPadding {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export type ID3SVGElement = d3.Selection<SVGElement, INode, HTMLElement, INode>;
