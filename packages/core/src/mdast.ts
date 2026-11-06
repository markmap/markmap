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

/** Marks a node that has notes, added after its label at render time. */
export interface NoteMarker extends Node {
  type: 'noteMarker';
  count: number;
}

declare module 'mdast' {
  interface PhrasingContentMap {
    mark: Mark;
    checkbox: Checkbox;
    noteMarker: NoteMarker;
  }
  interface RootContentMap {
    mark: Mark;
    checkbox: Checkbox;
    noteMarker: NoteMarker;
  }
}
