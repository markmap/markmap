declare interface Window {
  WebFontConfig?: unknown;
  katex?: any;
  Prism?: any;
  markmap: typeof import('markmap-view');
  mm: import('markmap-view').Markmap;
}
