import { Hook } from 'markmap-common';
import { ITransformer, ITransformHooks, ITransformPlugin } from '../types';

export function createTransformHooks(
  transformer: ITransformer,
): ITransformHooks {
  return {
    transformer,
    parser: new Hook(),
    beforeParse: new Hook(),
    afterParse: new Hook(),
    retransform: new Hook(),
  };
}

/**
 * This function is only used to help type checking.
 */
export function definePlugin(plugin: ITransformPlugin) {
  return plugin;
}
