// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

let customElementCounter = 0;

beforeEach(() => {
  document.body.replaceChildren();
});

afterEach(() => {
  vi.useRealTimers();
});

function createHostHarness(src = 'https://mindmaps.capaholdings.com/?embed=1') {
  let messageHandler: ((event: MessageEvent) => void) | undefined;
  const childWindow = {
    postMessage: vi.fn(),
  };
  const hostWindow = {
    addEventListener: vi.fn((type: string, handler: EventListener) => {
      if (type === 'message') messageHandler = handler as typeof messageHandler;
    }),
    removeEventListener: vi.fn((type: string, handler: EventListener) => {
      if (type === 'message' && messageHandler === handler) {
        messageHandler = undefined;
      }
    }),
  };
  const iframe = {
    src,
    contentWindow: childWindow,
    style: {},
  } as unknown as HTMLIFrameElement;

  return {
    childWindow,
    hostWindow,
    iframe,
    send(data: unknown, origin = 'https://mindmaps.capaholdings.com') {
      messageHandler?.({
        data,
        origin,
        source: childWindow,
      } as unknown as MessageEvent);
    },
  };
}

function createCustomElementName() {
  customElementCounter += 1;
  return `markmap-host-frame-test-${customElementCounter}`;
}

function sendFrameMessage(
  iframe: HTMLIFrameElement,
  data: unknown,
  origin = 'https://mindmaps.capaholdings.com',
) {
  window.dispatchEvent(
    new MessageEvent('message', {
      data,
      origin,
      source: iframe.contentWindow,
    }),
  );
}

test('connectMindmap posts host commands to the iframe origin', async () => {
  const { childWindow, hostWindow, iframe } = createHostHarness();
  const { connectMindmap } = await import('../src/host');

  const connection = connectMindmap(iframe, { window: hostWindow });
  connection.setContent('# Client Map', { theme: 'capa' });
  connection.fit();

  expect(childWindow.postMessage).toHaveBeenCalledWith(
    {
      type: 'capa:mindmap',
      action: 'setContent',
      content: '# Client Map',
      theme: 'capa',
    },
    'https://mindmaps.capaholdings.com',
  );
  expect(childWindow.postMessage).toHaveBeenCalledWith(
    {
      type: 'capa:mindmap',
      action: 'fit',
    },
    'https://mindmaps.capaholdings.com',
  );
});

test('connectMindmap resolves matching export responses and ignores wrong origins', async () => {
  const { childWindow, hostWindow, iframe, send } = createHostHarness();
  const { connectMindmap } = await import('../src/host');

  const connection = connectMindmap(iframe, { window: hostWindow });
  const pending = connection.export(['markdown', 'svg'], {
    requestId: 'export-1',
  });

  send(
    {
      type: 'capa:mindmap:export',
      requestId: 'export-1',
      markdown: '# Evil',
      svg: '<svg />',
      theme: 'dark',
    },
    'https://evil.example',
  );
  send({
    type: 'capa:mindmap:export',
    requestId: 'export-1',
    markdown: '# Client Map',
    svg: '<svg data-ok="1" />',
    theme: 'capa',
  });

  await expect(pending).resolves.toEqual({
    type: 'capa:mindmap:export',
    requestId: 'export-1',
    markdown: '# Client Map',
    svg: '<svg data-ok="1" />',
    theme: 'capa',
  });
  expect(childWindow.postMessage).toHaveBeenCalledWith(
    {
      type: 'capa:mindmap',
      action: 'export',
      formats: ['markdown', 'svg'],
      requestId: 'export-1',
    },
    'https://mindmaps.capaholdings.com',
  );
});

test('connectMindmap emits node clicks and removes listeners on destroy', async () => {
  const { hostWindow, iframe, send } = createHostHarness();
  const { connectMindmap } = await import('../src/host');
  const onNodeClick = vi.fn();

  const connection = connectMindmap(iframe, { window: hostWindow });
  const unsubscribe = connection.onNodeClick(onNodeClick);
  send({
    type: 'capa:mindmap:nodeClick',
    node: {
      content: 'Discovery',
      id: 'node-discovery',
      rawContent: 'Discovery',
      depth: 2,
      path: '1.2',
      payload: { tag: 'h2' },
    },
  });
  unsubscribe();
  send({
    type: 'capa:mindmap:nodeClick',
    node: { content: 'Delivery', rawContent: 'Delivery' },
  });
  connection.destroy();

  expect(onNodeClick).toHaveBeenCalledOnce();
  expect(onNodeClick).toHaveBeenCalledWith({
    content: 'Discovery',
    id: 'node-discovery',
    rawContent: 'Discovery',
    depth: 2,
    path: '1.2',
    payload: { tag: 'h2' },
  });
  expect(hostWindow.removeEventListener).toHaveBeenCalledWith(
    'message',
    expect.any(Function),
  );
});

test('connectMindmap handles iframe resize messages', async () => {
  const { hostWindow, iframe, send } = createHostHarness();
  const { connectMindmap } = await import('../src/host');
  const onResize = vi.fn();

  const connection = connectMindmap(iframe, {
    window: hostWindow,
    autoResize: true,
  });
  connection.onResize(onResize);
  send({
    type: 'capa:mindmap:resize',
    height: 720,
    width: 960,
  });

  expect(iframe.style.height).toBe('720px');
  expect(onResize).toHaveBeenCalledWith({ height: 720, width: 960 });
});

test('connectMindmap can queue host commands until iframe ready', async () => {
  const { childWindow, hostWindow, iframe, send } = createHostHarness();
  const { connectMindmap } = await import('../src/host');

  const connection = connectMindmap(iframe, {
    window: hostWindow,
    queueUntilReady: true,
  });
  const ready = connection.ready();
  connection.setContent('# Queued Map', { theme: 'capa' });
  connection.fit();

  expect(childWindow.postMessage).not.toHaveBeenCalled();
  send({ type: 'capa:mindmap:ready' });
  await ready;

  expect(childWindow.postMessage).toHaveBeenCalledWith(
    {
      type: 'capa:mindmap',
      action: 'setContent',
      content: '# Queued Map',
      theme: 'capa',
    },
    'https://mindmaps.capaholdings.com',
  );
  expect(childWindow.postMessage).toHaveBeenCalledWith(
    {
      type: 'capa:mindmap',
      action: 'fit',
    },
    'https://mindmaps.capaholdings.com',
  );
});

test('connectMindmap rejects exports that time out', async () => {
  vi.useFakeTimers();
  const { hostWindow, iframe } = createHostHarness();
  const { connectMindmap } = await import('../src/host');

  const connection = connectMindmap(iframe, { window: hostWindow });
  const pending = connection.export(['png'], {
    requestId: 'slow-export',
    timeoutMs: 250,
  });
  vi.advanceTimersByTime(250);

  await expect(pending).rejects.toThrow(
    'Mindmap export timed out: slow-export',
  );
  vi.useRealTimers();
});

test('connectMindmap rejects pending exports on destroy', async () => {
  const { hostWindow, iframe } = createHostHarness();
  const { connectMindmap } = await import('../src/host');

  const connection = connectMindmap(iframe, { window: hostWindow });
  const pending = connection.export(['svg'], { requestId: 'destroyed-export' });
  connection.destroy();

  await expect(pending).rejects.toThrow(
    'Mindmap connection destroyed before export completed: destroyed-export',
  );
});

test('connectMindmap rejects ready when iframe does not become ready in time', async () => {
  vi.useFakeTimers();
  const { hostWindow, iframe } = createHostHarness();
  const { connectMindmap } = await import('../src/host');

  const connection = connectMindmap(iframe, {
    window: hostWindow,
    readyTimeoutMs: 250,
  });
  const pending = connection.ready();
  vi.advanceTimersByTime(250);

  await expect(pending).rejects.toThrow('Mindmap ready timed out');
  vi.useRealTimers();
});

test('connectMindmap rejects ready on destroy before iframe ready', async () => {
  const { hostWindow, iframe } = createHostHarness();
  const { connectMindmap } = await import('../src/host');

  const connection = connectMindmap(iframe, { window: hostWindow });
  const pending = connection.ready();
  connection.destroy();

  await expect(pending).rejects.toThrow(
    'Mindmap connection destroyed before ready',
  );
});

test('connectMindmap emits iframe error events', async () => {
  const { hostWindow, iframe, send } = createHostHarness();
  const { connectMindmap } = await import('../src/host');
  const onError = vi.fn();

  const connection = connectMindmap(iframe, { window: hostWindow });
  connection.onError(onError);
  send({
    type: 'capa:mindmap:error',
    action: 'setContent',
    message: 'Unable to render markdown',
    requestId: 'content-1',
  });

  expect(onError).toHaveBeenCalledWith({
    action: 'setContent',
    message: 'Unable to render markdown',
    requestId: 'content-1',
  });
});

test('connectMindmap emits node edit events', async () => {
  const { hostWindow, iframe, send } = createHostHarness();
  const { connectMindmap } = await import('../src/host');
  const onNodeEdit = vi.fn();

  const connection = connectMindmap(iframe, { window: hostWindow });
  connection.onNodeEdit(onNodeEdit);
  send({
    type: 'capa:mindmap:nodeEdit',
    node: {
      content: 'Assessment',
      id: 'node-discovery',
      previousContent: 'Discovery',
      line: 2,
    },
    markdown: '# Client Map\n\n## Assessment',
  });

  expect(onNodeEdit).toHaveBeenCalledWith({
    node: {
      content: 'Assessment',
      id: 'node-discovery',
      previousContent: 'Discovery',
      line: 2,
    },
    markdown: '# Client Map\n\n## Assessment',
  });
});

test('connectMindmap emits change events', async () => {
  const { hostWindow, iframe, send } = createHostHarness();
  const { connectMindmap } = await import('../src/host');
  const onChange = vi.fn();

  const connection = connectMindmap(iframe, { window: hostWindow });
  connection.onChange(onChange);
  send({
    type: 'capa:mindmap:change',
    dirty: true,
    markdown: '# Client Map\n\n## Assessment',
    reason: 'nodeEdit',
    requestId: 'edit-1',
  });

  expect(onChange).toHaveBeenCalledWith({
    dirty: true,
    markdown: '# Client Map\n\n## Assessment',
    reason: 'nodeEdit',
    requestId: 'edit-1',
  });
});

test('connectMindmap posts edit node commands to the iframe origin', async () => {
  const { childWindow, hostWindow, iframe } = createHostHarness();
  const { connectMindmap } = await import('../src/host');

  const connection = connectMindmap(iframe, { window: hostWindow });
  connection.editNode({
    content: 'Assessment',
    line: 2,
    requestId: 'edit-1',
  });

  expect(childWindow.postMessage).toHaveBeenCalledWith(
    {
      type: 'capa:mindmap',
      action: 'editNode',
      content: 'Assessment',
      line: 2,
      requestId: 'edit-1',
    },
    'https://mindmaps.capaholdings.com',
  );
});

test('connectMindmap posts edit node commands by opaque node id', async () => {
  const { childWindow, hostWindow, iframe } = createHostHarness();
  const { connectMindmap } = await import('../src/host');

  const connection = connectMindmap(iframe, { window: hostWindow });
  connection.editNode({
    content: 'Assessment',
    id: 'node-discovery',
    requestId: 'edit-by-id-1',
  });

  expect(childWindow.postMessage).toHaveBeenCalledWith(
    {
      type: 'capa:mindmap',
      action: 'editNode',
      content: 'Assessment',
      id: 'node-discovery',
      requestId: 'edit-by-id-1',
    },
    'https://mindmaps.capaholdings.com',
  );
});

test('connectMindmap loads persisted maps by id', async () => {
  const { childWindow, hostWindow, iframe } = createHostHarness();
  const { connectMindmap } = await import('../src/host');
  const load = vi.fn().mockResolvedValue('# Persisted Map');

  const connection = connectMindmap(iframe, {
    window: hostWindow,
    persistence: {
      load,
      save: vi.fn(),
    },
  });

  await expect(
    connection.loadMap('client-123', { theme: 'capa' }),
  ).resolves.toBe('# Persisted Map');
  expect(load).toHaveBeenCalledWith('client-123');
  expect(childWindow.postMessage).toHaveBeenCalledWith(
    {
      type: 'capa:mindmap',
      action: 'setContent',
      content: '# Persisted Map',
      theme: 'capa',
    },
    'https://mindmaps.capaholdings.com',
  );
});

test('connectMindmap saves current maps by id', async () => {
  const { childWindow, hostWindow, iframe, send } = createHostHarness();
  const { connectMindmap } = await import('../src/host');
  const save = vi.fn().mockResolvedValue(undefined);

  const connection = connectMindmap(iframe, {
    window: hostWindow,
    persistence: {
      load: vi.fn(),
      save,
    },
  });
  const pending = connection.saveMap('client-123', {
    requestId: 'save-1',
    title: 'Client Map',
    timeoutMs: 500,
  });
  send({
    type: 'capa:mindmap:export',
    requestId: 'save-1',
    markdown: '# Current Map',
    svg: '<svg />',
  });

  await expect(pending).resolves.toEqual({
    id: 'client-123',
    markdown: '# Current Map',
    title: 'Client Map',
  });
  expect(childWindow.postMessage).toHaveBeenCalledWith(
    {
      type: 'capa:mindmap',
      action: 'export',
      formats: ['markdown'],
      requestId: 'save-1',
    },
    'https://mindmaps.capaholdings.com',
  );
  expect(save).toHaveBeenCalledWith('client-123', '# Current Map', {
    title: 'Client Map',
  });
});

test('defineMindmapHostFrame registers a custom element that exposes the host connection', async () => {
  const tagName = createCustomElementName();
  const { defineMindmapHostFrame } = await import('../src/host');

  defineMindmapHostFrame(tagName);
  const element = document.createElement(tagName) as HTMLElement & {
    getConnection(): unknown;
  };
  const ready = vi.fn();
  element.setAttribute('src', 'about:blank');
  element.setAttribute('target-origin', '*');
  element.addEventListener('ready', (event) => {
    ready((event as CustomEvent).detail.connection);
  });
  document.body.append(element);

  const iframe = element.shadowRoot?.querySelector('iframe');
  expect(iframe?.getAttribute('src')).toBe('about:blank');
  expect(element.getConnection()).toBeDefined();
  sendFrameMessage(iframe!, { type: 'capa:mindmap:ready' });
  await (element.getConnection() as { ready(): Promise<void> }).ready();

  expect(ready).toHaveBeenCalledWith(element.getConnection());
});

test('markmap host custom element autosaves dirty changes', async () => {
  vi.useFakeTimers();
  const tagName = createCustomElementName();
  const { defineMindmapHostFrame } = await import('../src/host');
  const save = vi.fn().mockResolvedValue(undefined);
  const change = vi.fn();
  const autosave = vi.fn();

  defineMindmapHostFrame(tagName);
  const element = document.createElement(tagName) as HTMLElement & {
    persistence: {
      load: () => string;
      save: (id: string, markdown: string) => Promise<void>;
    };
  };
  element.persistence = {
    load: () => '# Current Map',
    save,
  };
  element.setAttribute('src', 'about:blank');
  element.setAttribute('target-origin', '*');
  element.setAttribute('autosave', '');
  element.setAttribute('map-id', 'client-123');
  element.setAttribute('autosave-debounce-ms', '25');
  element.addEventListener('change', (event) => {
    change((event as CustomEvent).detail);
  });
  element.addEventListener('autosave', (event) => {
    autosave((event as CustomEvent).detail);
  });
  document.body.append(element);

  const iframe = element.shadowRoot!.querySelector('iframe')!;
  const postMessage = vi.spyOn(iframe.contentWindow!, 'postMessage');
  sendFrameMessage(iframe, {
    type: 'capa:mindmap:change',
    dirty: true,
    markdown: '# Current Map',
    reason: 'nodeEdit',
  });
  await vi.advanceTimersByTimeAsync(25);
  const exportMessage = postMessage.mock.calls.at(-1)?.[0] as {
    requestId: string;
  };
  sendFrameMessage(iframe, {
    type: 'capa:mindmap:export',
    requestId: exportMessage.requestId,
    markdown: '# Saved Map',
    svg: '<svg />',
  });
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();

  expect(change).toHaveBeenCalledWith({
    dirty: true,
    markdown: '# Current Map',
    reason: 'nodeEdit',
    requestId: undefined,
  });
  expect(save).toHaveBeenCalledWith('client-123', '# Saved Map');
  expect(autosave).toHaveBeenCalledWith({
    id: 'client-123',
    markdown: '# Saved Map',
  });
});

test('markmap host custom element destroys its connection on disconnect', async () => {
  const tagName = createCustomElementName();
  const { defineMindmapHostFrame } = await import('../src/host');
  const change = vi.fn();

  defineMindmapHostFrame(tagName);
  const element = document.createElement(tagName) as HTMLElement & {
    getConnection(): unknown;
  };
  element.setAttribute('src', 'about:blank');
  element.setAttribute('target-origin', '*');
  element.addEventListener('change', change);
  document.body.append(element);
  const iframe = element.shadowRoot!.querySelector('iframe')!;

  element.remove();
  sendFrameMessage(iframe, {
    type: 'capa:mindmap:change',
    dirty: true,
    markdown: '# Ignored',
  });

  expect(element.getConnection()).toBeUndefined();
  expect(change).not.toHaveBeenCalled();
});
