import { IWrapContext } from '../types';
import { Hook } from '../util/hook';

export function createTransformHooks() {
  return {
    parser: new Hook<(md: any, features: any) => void>(),
    htmltag: new Hook<(ctx: IWrapContext<any>) => void>(),
  };
}

export type ITransformHooks = ReturnType<typeof createTransformHooks>;
