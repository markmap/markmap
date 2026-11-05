import type { ContentPlugin } from '@markmap/core';
import { attachmentContent, basicContent } from './content';
import { imageContent } from './image';

/** Plugins used when none are given: basic styles, images, and attachment dots. */
export const defaultContentPlugins: readonly ContentPlugin[] = [
  basicContent,
  imageContent,
  attachmentContent,
];
