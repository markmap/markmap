import { scaleOrdinal, schemeCategory10 } from 'd3';
import { INode } from 'markmap-common';
import { IMarkmapOptions } from './types';

export const isMacintosh =
  typeof navigator !== 'undefined' && navigator.userAgent.includes('Macintosh');

export const defaultColorFn = scaleOrdinal(schemeCategory10);

export const lineWidthFactory =
  (baseWidth = 1, deltaWidth: number = 3, k: number = 2) =>
  (node: INode) =>
    baseWidth + deltaWidth / k ** node.state.depth;

export const defaultOptions: IMarkmapOptions = {
  autoFit: false,
  duration: 500,
  embedGlobalCSS: true,
  fitRatio: 0.95,
  maxInitialScale: 2,
  scrollForPan: isMacintosh,
  initialExpandLevel: -1,
  zoom: true,
  pan: true,
  toggleRecursively: false,

  color: (node: INode): string => defaultColorFn(`${node.state?.path || ''}`),
  lineWidth: lineWidthFactory(),
  maxWidth: 0,
  nodeMinHeight: 16,
  paddingX: 8,
  spacingHorizontal: 80,
  spacingVertical: 5,
};
