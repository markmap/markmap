import { INode } from 'markmap-common';
import { FlextreeNode } from 'd3-flextree';

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
  fitRatio?: number;
  maxInitialScale?: number;
  extraJs?: string[];
  extraCss?: string[];
  zoom?: boolean;
  pan?: boolean;
}

export interface IPadding {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export type ID3SVGElement = d3.Selection<
  SVGElement,
  FlextreeNode<INode>,
  HTMLElement,
  FlextreeNode<INode>
>;
