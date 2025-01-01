export interface IDevelopOptions {
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

export interface IVersionedValue<T = unknown> {
  ts: number;
  value: T;
}

export type IFileState = Record<string, IVersionedValue>;

export interface IContentProvider {
  key: string;
  state: IFileState;
  getUpdate: (query: Record<string, number>, timeout?: number) => Promise<void>;
  setContent: (content: string) => void;
  setCursor: (line: number) => void;
  dispose: () => void;
}
