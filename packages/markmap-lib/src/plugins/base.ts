import { Hook } from 'markmap-common';
import { ITransformHooks } from '../types';

export function createTransformHooks(): ITransformHooks {
  return {
    parser: new Hook(),
    beforeParse: new Hook(),
    afterParse: new Hook(),
    htmltag: new Hook(),
    retransform: new Hook(),
  };
}
