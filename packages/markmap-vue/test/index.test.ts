// @vitest-environment happy-dom
import { createApp, h, nextTick, ref } from 'vue';
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
  await nextTick();
  await Promise.resolve();
  await nextTick();
}

test('mounts an embedded markmap and emits ready', async () => {
  const ready = vi.fn();
  const { Markmap } = await import('../src/index');
  const host = document.createElement('div');
  document.body.append(host);

  createApp({
    render: () =>
      h(Markmap, { content: '# Root', autoFit: true, onReady: ready }),
  }).mount(host);
  await flush();

  expect(createMindmapMock).toHaveBeenCalledWith(
    expect.any(HTMLElement),
    expect.objectContaining({
      content: '# Root',
      autoFit: true,
      signal: expect.any(AbortSignal),
    }),
  );
  expect(ready).toHaveBeenCalledWith(
    expect.objectContaining({ destroy: destroyMock }),
  );
});

test('updates the embedded markmap when content changes', async () => {
  const content = ref('# First');
  const { Markmap } = await import('../src/index');
  const host = document.createElement('div');
  document.body.append(host);

  createApp({
    setup: () => () => h(Markmap, { content: content.value }),
  }).mount(host);
  await flush();
  content.value = '# Next';
  await flush();

  expect(createMindmapMock).toHaveBeenCalledOnce();
  expect(updateMock).toHaveBeenCalledWith('# Next');
});

test('aborts and destroys the embed on unmount', async () => {
  const { Markmap } = await import('../src/index');
  const host = document.createElement('div');
  document.body.append(host);
  const app = createApp({
    render: () => h(Markmap, { content: '# Root' }),
  });

  app.mount(host);
  await flush();
  app.unmount();

  expect(destroyMock).toHaveBeenCalledOnce();
});

test('emits update error', async () => {
  const error = new Error('update failed');
  const onError = vi.fn();
  updateMock.mockRejectedValueOnce(error);
  const content = ref('# First');
  const { Markmap } = await import('../src/index');
  const host = document.createElement('div');
  document.body.append(host);

  createApp({
    setup: () => () => h(Markmap, { content: content.value, onError }),
  }).mount(host);
  await flush();
  content.value = '# Next';
  await flush();

  expect(onError).toHaveBeenCalledWith(error);
});
