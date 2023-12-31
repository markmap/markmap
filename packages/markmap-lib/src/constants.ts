export const template = process.env.TEMPLATE || '';

export const baseJsPaths = [
  `d3@${process.env.D3_VERSION}/dist/d3.min.js`,
  `markmap-view@${process.env.VIEW_VERSION}/dist/browser/index.js`,
];

export const svg_marked = `<svg width="16" height="16" fill="currentColor" class="change_color" viewBox="0 -3 24 24"><path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2m-9 14-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8z"/></svg>`;
export const svg_unmarked = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="change_color" viewBox="0 -3 24 24"><path fill-rule="evenodd" d="M6 5a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1zM3 6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-5z" clip-rule="evenodd"/></svg>`;
