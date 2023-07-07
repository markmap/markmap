import { JSItem } from 'markmap-common';
import { ITransformPlugin } from 'markmap-lib';

export interface AutoLoaderOptions {
  onReady?: () => void;
  transformPlugins?: Array<ITransformPlugin | (() => ITransformPlugin)>;
  manual?: boolean;
  baseJs?: JSItem[];
}
