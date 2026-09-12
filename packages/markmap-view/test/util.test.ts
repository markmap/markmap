import { expect, test } from 'vitest';
import { deriveOptions } from '../src/util';

test.each([true, false])('derive autoFit: %s', (autoFit) => {
  expect(deriveOptions({ autoFit })).toEqual({ autoFit });
});

test('leave autoFit unset when omitted', () => {
  expect(deriveOptions()).not.toHaveProperty('autoFit');
  expect(deriveOptions({})).not.toHaveProperty('autoFit');
});
