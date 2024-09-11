import { scaleOrdinal, schemeCategory10 } from 'd3';
import { IMarkmapOptions, INode } from 'markmap-common';

export const isMacintosh =
  typeof navigator !== 'undefined' && navigator.userAgent.includes('Macintosh');

export const defaultColorFn = scaleOrdinal(schemeCategory10);

export const defaultOptions: IMarkmapOptions = {
  autoFit: false,
  color: (node: INode): string => defaultColorFn(`${node.state?.path || ''}`),
  duration: 500,
  embedGlobalCSS: true,
  fitRatio: 0.95,
  maxInitialScale: 2,
  maxWidth: 0,
  nodeMinHeight: 16,
  paddingX: 8,
  scrollForPan: isMacintosh,
  spacingHorizontal: 80,
  spacingVertical: 5,
  initialExpandLevel: -1,
  zoom: true,
  pan: true,
  toggleRecursively: false,
};
