import { IWrapContext, Hook } from 'markmap-common';

export function createTransformHooks() {
  return {
    parser: new Hook<(md: any, features: any) => void>(),
    htmltag: new Hook<(ctx: IWrapContext<any>) => void>(),
    retransform: new Hook<() => void>(),
  };
}
