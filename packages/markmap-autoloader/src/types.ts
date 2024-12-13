import { JSItem, CSSItem } from 'markmap-common';
import { ITransformPlugin } from 'markmap-lib';

export interface AutoLoaderOptions {
  baseJs: (string | JSItem)[];
  baseCss: (string | CSSItem)[];
  provider: string | ((path: string) => string);
  /** Callback when markmap-lib/markmap-view and their dependencies are loaded. We can tweak global options in this callback. */
  onReady: () => void;
  /** Override built-in plugins if provided. Set to `[]` to disable all built-in plugins for auto-loader. */
  transformPlugins: Array<ITransformPlugin | (() => ITransformPlugin)>;
  /** Whether to render markmaps manually. If false, all elements matching `.markmap` will be rendered once this package loads or DOMContentLoaded is emitted, whichever later. */
  manual: boolean;
  /** Whether to create a toolbar for each markmap. */
  toolbar: boolean;
}
