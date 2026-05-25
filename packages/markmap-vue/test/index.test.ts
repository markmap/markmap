// @vitest-environment happy-dom
import { createApp, h, nextTick, ref } from 'vue';
import { beforeEach, expect, test, vi } from 'vitest';

const createMindmapMock = vi.fn();
const connectMindmapMock = vi.fn();
const updateMock = vi.fn();
const destroyMock = vi.fn();
const saveMapMock = vi.fn();
const hostDestroyMock = vi.fn();
let hostListeners: {
  change?: (result: { dirty: boolean; markdown: string }) => void;
  error?: (result: { message: string }) => void;
};

vi.mock('markmap-embed', () => ({
  createMindmap: createMindmapMock,
  connectMindmap: connectMindmapMock,
}));

beforeEach(() => {
  createMindmapMock.mockReset();
  connectMindmapMock.mockReset();
  updateMock.mockReset();
  destroyMock.mockReset();
  saveMapMock.mockReset();
  hostDestroyMock.mockReset();
  hostListeners = {};
  updateMock.mockResolvedValue({});
  createMindmapMock.mockImplementation((_container, options) => {
    const embed = {
      update: updateMock,
      destroy: destroyMock,
    };
    options?.signal?.addEventListener('abort', embed.destroy, { once: true });
    return Promise.resolve(embed);
  });
  saveMapMock.mockResolvedValue({ id: 'demo', markdown: '# Root' });
  connectMindmapMock.mockReturnValue({
    saveMap: saveMapMock,
    destroy: hostDestroyMock,
    onChange: vi.fn((listener) => {
      hostListeners.change = listener;
      return vi.fn();
    }),
    onError: vi.fn((listener) => {
      hostListeners.error = listener;
      return vi.fn();
    }),
    onReady: vi.fn(() => vi.fn()),
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

test('passes autoResize to the embed', async () => {
  const { Markmap } = await import('../src/index');
  const host = document.createElement('div');
  document.body.append(host);

  createApp({
    render: () => h(Markmap, { content: '# Root', autoResize: true }),
  }).mount(host);
  await flush();

  expect(createMindmapMock).toHaveBeenCalledWith(
    expect.any(HTMLElement),
    expect.objectContaining({
      autoResize: true,
    }),
  );
});

test('passes node event callbacks to the embed', async () => {
  const onNodeClick = vi.fn();
  const onNodeToggle = vi.fn();
  const { Markmap } = await import('../src/index');
  const host = document.createElement('div');
  document.body.append(host);

  createApp({
    render: () =>
      h(Markmap, {
        content: '# Root',
        onNodeClick,
        onNodeToggle,
      }),
  }).mount(host);
  await flush();

  expect(createMindmapMock).toHaveBeenCalledWith(
    expect.any(HTMLElement),
    expect.objectContaining({
      onNodeClick: expect.any(Function),
      onNodeToggle: expect.any(Function),
    }),
  );
  const options = createMindmapMock.mock.calls[0][1];
  const event = { node: { content: 'Root' } };
  options.onNodeClick(event);
  options.onNodeToggle(event);
  expect(onNodeClick).toHaveBeenCalledWith(event);
  expect(onNodeToggle).toHaveBeenCalledWith(event);
});

test('passes theme to the embed', async () => {
  const theme = { textColor: '#111' };
  const { Markmap } = await import('../src/index');
  const host = document.createElement('div');
  document.body.append(host);

  createApp({
    render: () => h(Markmap, { content: '# Root', theme }),
  }).mount(host);
  await flush();

  expect(createMindmapMock).toHaveBeenCalledWith(
    expect.any(HTMLElement),
    expect.objectContaining({
      theme,
    }),
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

test('renders a host iframe and connects it to the iframe SDK', async () => {
  const ready = vi.fn();
  const { MarkmapHostFrame } = await import('../src/index');
  const host = document.createElement('div');
  document.body.append(host);

  createApp({
    render: () =>
      h(MarkmapHostFrame, {
        src: 'about:blank',
        targetOrigin: 'https://mindmaps.capaholdings.com',
        queueUntilReady: true,
        onReady: ready,
      }),
  }).mount(host);
  await flush();

  expect(host.querySelector('iframe')?.getAttribute('src')).toBe('about:blank');
  expect(connectMindmapMock).toHaveBeenCalledWith(
    expect.any(HTMLIFrameElement),
    expect.objectContaining({
      queueUntilReady: true,
      targetOrigin: 'https://mindmaps.capaholdings.com',
    }),
  );
  expect(ready).toHaveBeenCalledWith(
    expect.objectContaining({ saveMap: saveMapMock }),
  );
});

test('autosaves dirty host changes after the debounce delay', async () => {
  vi.useFakeTimers();
  const change = vi.fn();
  const autosave = vi.fn();
  const { MarkmapHostFrame } = await import('../src/index');
  const host = document.createElement('div');
  document.body.append(host);

  createApp({
    render: () =>
      h(MarkmapHostFrame, {
        src: 'about:blank',
        mapId: 'demo',
        autosave: true,
        autosaveDebounceMs: 25,
        onChange: change,
        onAutosave: autosave,
      }),
  }).mount(host);
  await flush();
  hostListeners.change?.({ dirty: true, markdown: '# Root' });

  expect(change).toHaveBeenCalledWith({ dirty: true, markdown: '# Root' });
  expect(saveMapMock).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(25);

  expect(saveMapMock).toHaveBeenCalledWith('demo');
  expect(autosave).toHaveBeenCalledWith({ id: 'demo', markdown: '# Root' });
  vi.useRealTimers();
});

test('destroys the host connection and pending autosave timer on unmount', async () => {
  vi.useFakeTimers();
  const { MarkmapHostFrame } = await import('../src/index');
  const host = document.createElement('div');
  document.body.append(host);
  const app = createApp({
    render: () =>
      h(MarkmapHostFrame, {
        src: 'about:blank',
        mapId: 'demo',
        autosave: true,
        autosaveDebounceMs: 25,
      }),
  });

  app.mount(host);
  await flush();
  hostListeners.change?.({ dirty: true, markdown: '# Root' });
  app.unmount();
  await vi.advanceTimersByTimeAsync(25);

  expect(hostDestroyMock).toHaveBeenCalledOnce();
  expect(saveMapMock).not.toHaveBeenCalled();
  vi.useRealTimers();
});
