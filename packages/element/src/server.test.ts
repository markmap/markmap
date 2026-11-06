import { describe, expect, it } from 'vitest';

describe('on a server', () => {
  it('can be imported', async () => {
    expect(globalThis.customElements).toBeUndefined();
    const { MarkmapViewElement } = await import('./index');
    expect(MarkmapViewElement.observedAttributes).toContain('theme');
  });
});
