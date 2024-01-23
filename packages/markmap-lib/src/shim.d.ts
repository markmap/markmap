declare interface Window {
  WebFontConfig?: unknown;
  katex?: any;
  Prism?: any;
}

declare module '*.svg?raw' {
  export default string;
}
