import { scaleOrdinal } from 'd3';
import { INode } from 'markmap-common';
import { defaultOptions, lineWidthFactory } from './constants';
import { IMarkmapJSONOptions, IMarkmapOptions } from './types';

export function deriveOptions(jsonOptions?: Partial<IMarkmapJSONOptions>) {
  const derivedOptions: Partial<IMarkmapOptions> = {};
  const options = { ...jsonOptions };

  const { color, colorFreezeLevel, lineWidth } = options;
  if (color?.length === 1) {
    const solidColor = color[0];
    derivedOptions.color = () => solidColor;
  } else if (color?.length) {
    const colorFn = scaleOrdinal(color);
    derivedOptions.color = (node: INode) => colorFn(`${node.state.path}`);
  }
  if (colorFreezeLevel) {
    const color = derivedOptions.color || defaultOptions.color;
    derivedOptions.color = (node: INode) => {
      node = {
        ...node,
        state: {
          ...node.state,
          path: node.state.path.split('.').slice(0, colorFreezeLevel).join('.'),
        },
      };
      return color(node);
    };
  }
  if (lineWidth) {
    const args = Array.isArray(lineWidth) ? lineWidth : [lineWidth, 0, 1];
    derivedOptions.lineWidth = lineWidthFactory(
      ...(args as Parameters<typeof lineWidthFactory>),
    );
  }

  const numberKeys = [
    'duration',
    'fitRatio',
    'initialExpandLevel',
    'maxInitialScale',
    'maxWidth',
    'nodeMinHeight',
    'paddingX',
    'spacingHorizontal',
    'spacingVertical',
  ] as const;
  numberKeys.forEach((key) => {
    const value = options[key];
    if (typeof value === 'number') derivedOptions[key] = value;
  });

  const booleanKeys = ['zoom', 'pan'] as const;
  booleanKeys.forEach((key) => {
    const value = options[key];
    if (value != null) derivedOptions[key] = !!value;
  });

  return derivedOptions;
}

/**
 * Credit: https://gist.github.com/jlevy/c246006675becc446360a798e2b2d781?permalink_comment_id=4738050#gistcomment-4738050
 */
export function simpleHash(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(36);
}

export function childSelector<T extends Element>(
  filter?: string | ((el: T) => boolean),
): () => T[] {
  if (typeof filter === 'string') {
    const selector = filter;
    filter = (el: T): boolean => el.matches(selector);
  }
  const filterFn = filter;
  return function selector(this: Element): T[] {
    let nodes = Array.from(this.childNodes as NodeListOf<T>);
    if (filterFn) nodes = nodes.filter((node) => filterFn(node));
    return nodes;
  };
}
