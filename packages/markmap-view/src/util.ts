import { scaleOrdinal } from 'd3';
import { IMarkmapOptions, INode } from 'markmap-common';
import { defaultOptions } from './constants';
import { IMarkmapJSONOptions } from './types';

export function deriveOptions(jsonOptions?: IMarkmapJSONOptions) {
  const derivedOptions: Partial<IMarkmapOptions> = {};
  const options = { ...jsonOptions };

  const { color, colorFreezeLevel } = options;
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
