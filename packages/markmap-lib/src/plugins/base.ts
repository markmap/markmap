import { IWrapContext, Hook } from 'markmap-common';

export function createTransformHooks() {
  return {
    parser: new Hook<(md: any, features: any) => void>(),
    htmltag: new Hook<(ctx: IWrapContext<any>) => void>(),
    /**
     * Indicate that the last transformation is not complete for reasons like
     * lack of resources and is called when it is ready for a new transformation.
     */
    retransform: new Hook<() => void>(),
  };
}
