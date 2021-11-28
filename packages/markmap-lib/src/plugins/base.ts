import { Hook } from 'markmap-common';
import { ITransformHooks } from '../types';

export function createTransformHooks(): ITransformHooks {
  return {
    parser: new Hook(),
    transform: new Hook(),
    htmltag: new Hook(),
    retransform: new Hook(),
  };
}
