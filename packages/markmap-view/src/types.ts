import { FlextreeNode } from 'd3-flextree';
import { INode } from 'markmap-common';

export interface IMarkmapState {
  id: string;
  data?: INode;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export type IMarkmapJSONOptions = Partial<{
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
  htmlParser: any;
}>;

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
