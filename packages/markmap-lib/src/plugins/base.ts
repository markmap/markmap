import { Hook } from '../util/hook';

export const transformHooks = {
  parser: new Hook<(md: any, features: any) => void>(),
};
