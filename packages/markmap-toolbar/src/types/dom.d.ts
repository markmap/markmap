import { VNode } from '@gera2ld/jsx-dom';

declare global {
  namespace JSX {
    type Element = VNode;
  }
}
