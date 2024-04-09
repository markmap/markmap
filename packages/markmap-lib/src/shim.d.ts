declare interface Window {
  WebFontConfig?: unknown;
  katex?: any;
  Prism?: any;
  hljs?: typeof import('highlight.js').default;
}

declare module '*.svg?raw' {
  export default string;
}
