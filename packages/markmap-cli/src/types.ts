export interface IDevelopOptions {
  /**
   * Whether to open the generated markmap in browser
   */
  open: boolean;
  /**
   * Whether to show the default toolbar
   */
  toolbar: boolean;
  /**
   * Whether to inline all assets to make the HTML work offline.
   * Ignored in watching mode.
   */
  offline: boolean;
  /** Port number for the devServer to listen. */
  port?: number;
}

export interface IFileUpdate {
  ts?: number;
  content?: string;
  line?: number;
}

export interface IContentProvider {
  getUpdate: (ts: number, timeout?: number) => Promise<IFileUpdate>;
  setContent: (content: string) => void;
  setCursor: (line: number) => void;
  dispose: () => void;
}
