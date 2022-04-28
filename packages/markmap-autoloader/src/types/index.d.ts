import { ITransformPlugin } from 'markmap-lib';

export interface AutoLoaderOptions {
  onReady?: () => void;
  transformPlugins?: ITransformPlugin[];
  manual?: boolean;
}
