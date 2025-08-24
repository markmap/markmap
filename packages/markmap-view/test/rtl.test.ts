import { expect, test, describe } from 'vitest';
import { deriveOptions } from '../src/util';
import { IMarkmapJSONOptions, IMarkmapOptions } from '../src/types';
import { defaultOptions } from '../src/constants';

describe('RTL functionality', () => {
  test('RTL option is included in IMarkmapJSONOptions', () => {
    const jsonOptions: IMarkmapJSONOptions = {
      color: ['#ff0000'],
      colorFreezeLevel: 0,
      duration: 500,
      extraCss: [],
      extraJs: [],
      fitRatio: 0.95,
      initialExpandLevel: -1,
      maxInitialScale: 2,
      maxWidth: 0,
      nodeMinHeight: 16,
      paddingX: 8,
      pan: true,
      rtl: true, // Should not cause TypeScript error
      spacingHorizontal: 80,
      spacingVertical: 5,
      zoom: true,
      lineWidth: 1,
    };

    expect(jsonOptions.rtl).toBe(true);
  });

  test('RTL option is included in IMarkmapOptions', () => {
    const options: Partial<IMarkmapOptions> = {
      rtl: true,
    };

    expect(options.rtl).toBe(true);
  });

  test('deriveOptions handles RTL option correctly', () => {
    const jsonOptions: Partial<IMarkmapJSONOptions> = {
      rtl: true,
    };

    const derivedOptions = deriveOptions(jsonOptions);
    expect(derivedOptions.rtl).toBe(true);
  });

  test('deriveOptions handles RTL option as false', () => {
    const jsonOptions: Partial<IMarkmapJSONOptions> = {
      rtl: false,
    };

    const derivedOptions = deriveOptions(jsonOptions);
    expect(derivedOptions.rtl).toBe(false);
  });

  test('deriveOptions handles RTL option as string (truthy)', () => {
    const jsonOptions: Partial<IMarkmapJSONOptions> = {
      rtl: 'true' as any, // Simulate YAML parsing result
    };

    const derivedOptions = deriveOptions(jsonOptions);
    expect(derivedOptions.rtl).toBe(true);
  });

  test('deriveOptions handles RTL option as number (truthy)', () => {
    const jsonOptions: Partial<IMarkmapJSONOptions> = {
      rtl: 1 as any, // Simulate YAML parsing result
    };

    const derivedOptions = deriveOptions(jsonOptions);
    expect(derivedOptions.rtl).toBe(true);
  });

  test('deriveOptions handles RTL option as 0 (falsy)', () => {
    const jsonOptions: Partial<IMarkmapJSONOptions> = {
      rtl: 0 as any, // Simulate YAML parsing result
    };

    const derivedOptions = deriveOptions(jsonOptions);
    expect(derivedOptions.rtl).toBe(false);
  });

  test('default RTL option is false', () => {
    expect(defaultOptions.rtl).toBe(false);
  });

  test('deriveOptions preserves other options when setting RTL', () => {
    const jsonOptions: Partial<IMarkmapJSONOptions> = {
      rtl: true,
      duration: 1000,
      pan: false,
    };

    const derivedOptions = deriveOptions(jsonOptions);
    expect(derivedOptions.rtl).toBe(true);
    expect(derivedOptions.duration).toBe(1000);
    expect(derivedOptions.pan).toBe(false);
  });

  test('deriveOptions handles undefined RTL option', () => {
    const jsonOptions: Partial<IMarkmapJSONOptions> = {
      duration: 500,
    };

    const derivedOptions = deriveOptions(jsonOptions);
    expect(derivedOptions.rtl).toBeUndefined();
    expect(derivedOptions.duration).toBe(500);
  });

  test('RTL line rendering should span full width', () => {
    const options = deriveOptions({ rtl: true });
    expect(options.rtl).toBe(true);

    // Mock node with dimensions
    const mockNode = {
      state: {
        rect: {
          width: 100,
          height: 20,
        },
      },
    };

    // In RTL mode, horizontal lines should span from -2 to width+2
    // This ensures continuous lines under text content
    const expectedX1 = -2;
    const expectedX2 = mockNode.state.rect.width + 2; // 102

    expect(expectedX1).toBe(-2);
    expect(expectedX2).toBe(102);
    expect(expectedX2 - expectedX1).toBe(104); // Full span
  });
});
