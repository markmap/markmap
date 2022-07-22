import { Hook } from 'markmap-common';
import { ITransformHooks, ITransformPlugin } from '../types';

export function createTransformHooks(): ITransformHooks {
  return {
    parser: new Hook(),
    beforeParse: new Hook(),
    afterParse: new Hook(),
    htmltag: new Hook(),
    retransform: new Hook(),
  };
}

/**
 * This function is only used to help type checking.
 */
export function definePlugin(plugin: ITransformPlugin) {
  return plugin;
}
