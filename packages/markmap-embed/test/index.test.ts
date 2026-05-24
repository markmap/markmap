import { beforeEach, expect, test, vi } from 'vitest';
import type { INode, IPureNode } from 'markmap-common';

const transformMock = vi.fn();
const setDataMock = vi.fn();
const fitMock = vi.fn();
const destroyMock = vi.fn();
const createMock = vi.fn();
const deriveOptionsMock = vi.fn();

vi.mock('markmap-lib', () => ({
  Transformer: vi.fn(() => ({
    transform: transformMock,
  })),
}));

vi.mock('markmap-view', () => ({
  deriveOptions: deriveOptionsMock,
  Markmap: {
    create: createMock,
  },
}));

beforeEach(() => {
  transformMock.mockReset();
  setDataMock.mockReset();
  fitMock.mockReset();
  destroyMock.mockReset();
  createMock.mockReset();
  deriveOptionsMock.mockReset();
  createMock.mockReturnValue({
    setData: setDataMock,
    fit: fitMock,
    destroy: destroyMock,
  });
  deriveOptionsMock.mockImplementation((options) => ({
    ...(options.maxWidth == null ? {} : { maxWidth: options.maxWidth }),
    ...(options.nodeMinHeight == null
      ? {}
      : { nodeMinHeight: options.nodeMinHeight }),
    ...(options.paddingX == null ? {} : { paddingX: options.paddingX }),
    ...(options.spacingHorizontal == null
      ? {}
      : { spacingHorizontal: options.spacingHorizontal }),
    ...(options.spacingVertical == null
      ? {}
      : { spacingVertical: options.spacingVertical }),
    ...(options.color?.length ? { color: vi.fn() } : {}),
    ...(options.lineWidth == null ? {} : { lineWidth: vi.fn() }),
  }));
});

function createContainer() {
  return {
    firstChild: null as unknown,
    appendChild(child: unknown) {
      this.firstChild = child;
      return child;
    },
    replaceChildren(...children: unknown[]) {
      this.firstChild = children[0] || null;
    },
    ownerDocument: {
      createElementNS(_namespace: string, tagName: string) {
        return { tagName };
      },
    },
  } as unknown as HTMLElement;
}

function createEventContainer() {
  const listeners: Record<string, EventListener> = {};
  const svg = {
    tagName: 'svg',
    addEventListener: vi.fn((type: string, listener: EventListener) => {
      listeners[type] = listener;
    }),
    removeEventListener: vi.fn((type: string, listener: EventListener) => {
      if (listeners[type] === listener) delete listeners[type];
    }),
  };
  const container = {
    firstChild: null as unknown,
    replaceChildren(...children: unknown[]) {
      this.firstChild = children[0] || null;
    },
    ownerDocument: {
      createElementNS() {
        return svg;
      },
    },
  } as unknown as HTMLElement;
  return { container, listeners, svg };
}

function createStyledContainer() {
  const svg = {
    tagName: 'svg',
    style: {
      setProperty: vi.fn(),
      removeProperty: vi.fn(),
    },
  };
  const container = {
    firstChild: null as unknown,
    replaceChildren(...children: unknown[]) {
      this.firstChild = children[0] || null;
    },
    ownerDocument: {
      createElementNS() {
        return svg;
      },
    },
  } as unknown as HTMLElement;
  return { container, svg };
}

function createNodeTarget(node: INode, tagName = 'div') {
  const group = {
    __data__: node,
    parentNode: null,
    getAttribute(name: string) {
      return name === 'class' ? 'markmap-node' : '';
    },
  };
  const target = {
    tagName,
    parentNode: group,
    getAttribute(name: string) {
      return name === 'class' ? '' : '';
    },
  };
  return target as unknown as EventTarget;
}

test('createMindmap mounts an SVG and renders markdown content', async () => {
  const root: IPureNode = { content: 'Root', children: [] };
  transformMock.mockReturnValue({ root });

  const { createMindmap } = await import('../src/index');
  const container = createContainer();
  const embed = await createMindmap(container, {
    content: '# Root',
    autoFit: true,
  });

  expect(container.firstChild).toEqual({ tagName: 'svg' });
  expect(createMock).toHaveBeenCalledWith(container.firstChild, {}, null);
  expect(transformMock).toHaveBeenCalledWith('# Root', undefined);
  expect(setDataMock).toHaveBeenCalledWith(root, undefined);
  expect(fitMock).toHaveBeenCalledOnce();
  expect(embed.element).toBe(container.firstChild);
});

test('update rerenders content without creating a new markmap instance', async () => {
  const firstRoot: IPureNode = { content: 'First', children: [] };
  const nextRoot: IPureNode = { content: 'Next', children: [] };
  transformMock.mockReturnValueOnce({ root: firstRoot }).mockReturnValueOnce({
    root: nextRoot,
  });

  const { createMindmap } = await import('../src/index');
  const embed = await createMindmap(createContainer(), {
    content: '# First',
  });
  await embed.update('# Next');

  expect(createMock).toHaveBeenCalledOnce();
  expect(transformMock).toHaveBeenLastCalledWith('# Next', undefined);
  expect(setDataMock).toHaveBeenLastCalledWith(nextRoot, undefined);
});

test('destroy clears renderer and container', async () => {
  const root: IPureNode = { content: 'Root', children: [] };
  const container = createContainer();
  transformMock.mockReturnValue({ root });

  const { createMindmap } = await import('../src/index');
  const embed = await createMindmap(container, {
    content: '# Root',
  });
  embed.destroy();

  expect(destroyMock).toHaveBeenCalledOnce();
  expect(container.firstChild).toBeNull();
});

test('fits on host resize when autoResize is enabled', async () => {
  const root: IPureNode = { content: 'Root', children: [] };
  const container = createContainer();
  const observeMock = vi.fn();
  const disconnectMock = vi.fn();
  let resizeCallback: ResizeObserverCallback | undefined;
  transformMock.mockReturnValue({ root });
  Object.assign(container.ownerDocument, {
    defaultView: {
      ResizeObserver: vi.fn((callback: ResizeObserverCallback) => {
        resizeCallback = callback;
        return {
          observe: observeMock,
          disconnect: disconnectMock,
        };
      }),
    },
  });

  const { createMindmap } = await import('../src/index');
  const embed = await createMindmap(container, {
    content: '# Root',
    autoResize: true,
  });
  resizeCallback?.([], {} as ResizeObserver);
  await Promise.resolve();
  embed.destroy();

  expect(observeMock).toHaveBeenCalledWith(container, undefined);
  expect(fitMock).toHaveBeenCalledOnce();
  expect(disconnectMock).toHaveBeenCalledOnce();
});

test('applies theme CSS variables and derived view options on mount', async () => {
  const root: IPureNode = { content: 'Root', children: [] };
  const { container, svg } = createStyledContainer();
  transformMock.mockReturnValue({ root });

  const { createMindmap } = await import('../src/index');
  await createMindmap(container, {
    content: '# Root',
    theme: {
      colors: ['#f00', '#0f0'],
      font: '500 14px/18px Inter, sans-serif',
      textColor: '#111',
      linkColor: '#06c',
      codeBackground: '#f7f7f7',
      circleOpenBackground: '#fff',
      maxWidth: 420,
      spacingHorizontal: 48,
      lineWidth: [2, 2, 2],
    },
  });

  expect(svg.style.setProperty).toHaveBeenCalledWith(
    '--markmap-font',
    '500 14px/18px Inter, sans-serif',
  );
  expect(svg.style.setProperty).toHaveBeenCalledWith(
    '--markmap-text-color',
    '#111',
  );
  expect(svg.style.setProperty).toHaveBeenCalledWith(
    '--markmap-a-color',
    '#06c',
  );
  expect(svg.style.setProperty).toHaveBeenCalledWith(
    '--markmap-code-bg',
    '#f7f7f7',
  );
  expect(createMock).toHaveBeenCalledWith(
    svg,
    expect.objectContaining({
      maxWidth: 420,
      spacingHorizontal: 48,
      color: expect.any(Function),
      lineWidth: expect.any(Function),
    }),
    null,
  );
});

test('updates theme at runtime and rerenders current data', async () => {
  const root: IPureNode = { content: 'Root', children: [] };
  const { container, svg } = createStyledContainer();
  transformMock.mockReturnValue({ root });

  const { createMindmap } = await import('../src/index');
  const embed = await createMindmap(container, {
    content: '# Root',
  });
  await embed.setTheme({
    textColor: '#222',
    spacingVertical: 12,
  });

  expect(svg.style.setProperty).toHaveBeenCalledWith(
    '--markmap-text-color',
    '#222',
  );
  expect(setDataMock).toHaveBeenLastCalledWith(
    undefined,
    expect.objectContaining({ spacingVertical: 12 }),
  );
});

test('emits node click and toggle events from delegated SVG clicks', async () => {
  const root = {
    content: 'Root',
    children: [],
    state: {
      id: 1,
      key: '1-root',
      path: '1',
      depth: 1,
      size: [0, 0],
      rect: { x: 0, y: 0, width: 0, height: 0 },
    },
  } satisfies INode;
  const onNodeClick = vi.fn();
  const onNodeToggle = vi.fn();
  const { container, listeners, svg } = createEventContainer();
  transformMock.mockReturnValue({ root });

  const { createMindmap } = await import('../src/index');
  const embed = await createMindmap(container, {
    content: '# Root',
    onNodeClick,
    onNodeToggle,
  });
  listeners.click({ target: createNodeTarget(root) } as unknown as Event);
  listeners.click({
    target: createNodeTarget(root, 'circle'),
  } as unknown as Event);
  embed.destroy();

  expect(onNodeClick).toHaveBeenCalledTimes(2);
  expect(onNodeClick).toHaveBeenCalledWith(
    expect.objectContaining({ node: root, embed }),
  );
  expect(onNodeToggle).toHaveBeenCalledOnce();
  expect(onNodeToggle).toHaveBeenCalledWith(
    expect.objectContaining({ node: root, embed }),
  );
  expect(svg.addEventListener).toHaveBeenCalledWith('click', expect.anything());
  expect(svg.removeEventListener).toHaveBeenCalledWith(
    'click',
    expect.anything(),
  );
});

test('abort signal destroys the embedded markmap', async () => {
  const root: IPureNode = { content: 'Root', children: [] };
  const container = createContainer();
  const controller = new AbortController();
  transformMock.mockReturnValue({ root });

  const { createMindmap } = await import('../src/index');
  await createMindmap(container, {
    content: '# Root',
    signal: controller.signal,
  });
  controller.abort();

  expect(destroyMock).toHaveBeenCalledOnce();
  expect(container.firstChild).toBeNull();
});

test('calls lifecycle callbacks for ready update and destroy', async () => {
  const root: IPureNode = { content: 'Root', children: [] };
  const nextRoot: IPureNode = { content: 'Next', children: [] };
  const onReady = vi.fn();
  const onUpdate = vi.fn();
  const onDestroy = vi.fn();
  transformMock.mockReturnValueOnce({ root }).mockReturnValueOnce({
    root: nextRoot,
  });

  const { createMindmap } = await import('../src/index');
  const embed = await createMindmap(createContainer(), {
    content: '# Root',
    onReady,
    onUpdate,
    onDestroy,
  });
  await embed.update('# Next');
  embed.destroy();
  embed.destroy();

  expect(onReady).toHaveBeenCalledOnce();
  expect(onReady).toHaveBeenCalledWith(embed);
  expect(onUpdate).toHaveBeenCalledTimes(2);
  expect(onUpdate).toHaveBeenNthCalledWith(
    1,
    expect.objectContaining({ root }),
  );
  expect(onUpdate).toHaveBeenNthCalledWith(
    2,
    expect.objectContaining({ root: nextRoot }),
  );
  expect(onDestroy).toHaveBeenCalledOnce();
  expect(onDestroy).toHaveBeenCalledWith(embed);
});

test('reports update errors through callback', async () => {
  const error = new Error('invalid markdown');
  const onError = vi.fn();
  transformMock.mockImplementation(() => {
    throw error;
  });

  const { createMindmap } = await import('../src/index');
  await expect(
    createMindmap(createContainer(), {
      content: '# Root',
      onError,
    }),
  ).rejects.toThrow(error);
  expect(onError).toHaveBeenCalledWith(error);
});

test('rejects updates after destroy', async () => {
  const root: IPureNode = { content: 'Root', children: [] };
  const onError = vi.fn();
  transformMock.mockReturnValue({ root });

  const { createMindmap } = await import('../src/index');
  const embed = await createMindmap(createContainer(), {
    content: '# Root',
    onError,
  });
  embed.destroy();

  await expect(embed.update('# Next')).rejects.toThrow('destroyed');
  await expect(embed.setData(root)).rejects.toThrow('destroyed');
  await expect(embed.fit()).rejects.toThrow('destroyed');
  expect(onError).toHaveBeenCalledTimes(3);
});
