// @vitest-environment happy-dom
import { beforeEach, expect, test, vi } from 'vitest';

const createMindmapMock = vi.fn();
const updateMock = vi.fn();
const destroyMock = vi.fn();

vi.mock('markmap-embed', () => ({
  createMindmap: createMindmapMock,
}));

beforeEach(() => {
  createMindmapMock.mockReset();
  updateMock.mockReset();
  destroyMock.mockReset();
  updateMock.mockResolvedValue({});
  createMindmapMock.mockImplementation((_container, options) => {
    const embed = {
      update: updateMock,
      destroy: destroyMock,
    };
    options?.signal?.addEventListener('abort', embed.destroy, { once: true });
    return Promise.resolve(embed);
  });
  document.body.replaceChildren();
});

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
}

test('mounts an embedded markmap and calls onReady', async () => {
  const onReady = vi.fn();
  const { markmap } = await import('../src/index');
  const host = document.createElement('div');

  markmap(host, { content: '# Root', autoFit: true, onReady });
  await flush();

  expect(createMindmapMock).toHaveBeenCalledWith(
    host,
    expect.objectContaining({
      content: '# Root',
      autoFit: true,
      signal: expect.any(AbortSignal),
    }),
  );
  expect(onReady).toHaveBeenCalledWith(
    expect.objectContaining({ destroy: destroyMock }),
  );
});

test('updates the embedded markmap when action parameters change', async () => {
  const { markmap } = await import('../src/index');
  const host = document.createElement('div');
  const action = markmap(host, { content: '# First' });
  await flush();

  action.update?.({ content: '# Next', autoFit: true });
  await flush();

  expect(createMindmapMock).toHaveBeenCalledOnce();
  expect(updateMock).toHaveBeenCalledWith(
    '# Next',
    expect.objectContaining({ autoFit: true }),
  );
});

test('aborts and destroys the embed on action destroy', async () => {
  const { markmap } = await import('../src/index');
  const host = document.createElement('div');
  const action = markmap(host, { content: '# Root' });
  await flush();

  action.destroy?.();

  expect(destroyMock).toHaveBeenCalledOnce();
});

test('reports update errors', async () => {
  const error = new Error('update failed');
  const onError = vi.fn();
  updateMock.mockRejectedValueOnce(error);
  const { markmap } = await import('../src/index');
  const host = document.createElement('div');
  const action = markmap(host, { content: '# First', onError });
  await flush();

  action.update?.({ content: '# Next', onError });
  await flush();

  expect(onError).toHaveBeenCalledWith(error);
});
