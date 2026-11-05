import type { BlockContent, DefinitionContent, PhrasingContent } from 'mdast';

/** Inline content of a node label: a subset of mdast phrasing content. */
export type Inline = PhrasingContent;

/** A block that is not a heading or list item, attached to the node that owns it. */
export type MdastBlock = BlockContent | DefinitionContent;

export interface Attachment {
  block: MdastBlock;
  /** Number of children that precede this block in source order. */
  after: number;
}

export interface MarkmapNode {
  /** Stable id derived from the parent path and content. */
  id: string;
  type: 'heading' | 'listItem' | (string & {});
  content: Inline[];
  attachments: Attachment[];
  /** Plugin data such as fold, checked, color or icon. */
  data: Record<string, unknown>;
  /** Source offsets, for click-to-source and graph-to-Markdown editing. */
  position?: { start: number; end: number };
  children: MarkmapNode[];
}
