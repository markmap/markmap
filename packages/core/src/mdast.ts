import type { Node, Parent, PhrasingContent } from 'mdast';

/** `==highlighted==` text. */
export interface Mark extends Parent {
  type: 'mark';
  children: PhrasingContent[];
}

/** A task-list checkbox, added before a node's label at render time. */
export interface Checkbox extends Node {
  type: 'checkbox';
  checked: boolean;
}

declare module 'mdast' {
  interface PhrasingContentMap {
    mark: Mark;
    checkbox: Checkbox;
  }
  interface RootContentMap {
    mark: Mark;
    checkbox: Checkbox;
  }
}
