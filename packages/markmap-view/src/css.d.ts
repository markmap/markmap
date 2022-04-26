declare module '*.module.css' {
  /**
   * Generated CSS for CSS modules
   */
  export const stylesheet: string;
  /**
   * Exported classes
   */
  const classMap: {
    [key: string]: string;
  };
  export default classMap;
}

declare module '*.css' {
  /**
   * Generated CSS
   */
  const css: string;
  export default css;
}
