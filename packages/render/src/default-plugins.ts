import type { ContentPlugin } from '@markmap/core';
import { noteContent, basicContent } from './content';
import { imageContent } from './image';

/** Plugins used when none are given: basic styles, images, and note dots. */
export const defaultContentPlugins: readonly ContentPlugin[] = [
  basicContent,
  imageContent,
  noteContent,
];
