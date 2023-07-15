export const template = process.env.TEMPLATE || '';

export const baseJsPaths = [
  `d3@${process.env.D3_VERSION}/dist/d3.min.js`,
  `markmap-view@${process.env.VIEW_VERSION}/dist/browser/index.js`,
];
