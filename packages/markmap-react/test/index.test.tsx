import { act, create } from 'react-test-renderer';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

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
});

afterEach(() => {
  vi.useRealTimers();
});

function createNodeMock(element: { type: string }) {
  if (element.type === 'div') {
    return {
      replaceChildren: vi.fn(),
      ownerDocument: {
        createElementNS: vi.fn(),
      },
    };
  }
  if (element.type === 'iframe') {
    return {
      contentWindow: { postMessage: vi.fn() },
      src: '',
      style: {},
    };
  }
  return null;
}

test('mounts an embedded markmap and calls onReady', async () => {
  const onReady = vi.fn();
  const { Markmap } = await import('../src/index');

  await act(async () => {
    create(<Markmap content="# Root" autoFit onReady={onReady} />, {
      createNodeMock,
    });
  });

  expect(createMindmapMock).toHaveBeenCalledWith(
    expect.anything(),
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

test('passes embed lifecycle callbacks without rendering them as div props', async () => {
  const onUpdate = vi.fn();
  const onDestroy = vi.fn();
  const { Markmap } = await import('../src/index');
  let renderer: ReturnType<typeof create>;

  await act(async () => {
    renderer = create(
      <Markmap content="# Root" onUpdate={onUpdate} onDestroy={onDestroy} />,
      { createNodeMock },
    );
  });

  const div = renderer.root.findByType('div');
  expect(div.props.onUpdate).toBeUndefined();
  expect(div.props.onDestroy).toBeUndefined();
  expect(createMindmapMock).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({
      onUpdate,
      onDestroy,
    }),
  );
});

test('passes autoResize to the embed without rendering it as a div prop', async () => {
  const { Markmap } = await import('../src/index');
  let renderer: ReturnType<typeof create>;

  await act(async () => {
    renderer = create(<Markmap content="# Root" autoResize />, {
      createNodeMock,
    });
  });

  const div = renderer.root.findByType('div');
  expect(div.props.autoResize).toBeUndefined();
  expect(createMindmapMock).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({
      autoResize: true,
    }),
  );
});

test('passes node event callbacks without rendering them as div props', async () => {
  const onNodeClick = vi.fn();
  const onNodeToggle = vi.fn();
  const { Markmap } = await import('../src/index');
  let renderer: ReturnType<typeof create>;

  await act(async () => {
    renderer = create(
      <Markmap
        content="# Root"
        onNodeClick={onNodeClick}
        onNodeToggle={onNodeToggle}
      />,
      { createNodeMock },
    );
  });

  const div = renderer.root.findByType('div');
  expect(div.props.onNodeClick).toBeUndefined();
  expect(div.props.onNodeToggle).toBeUndefined();
  expect(createMindmapMock).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({
      onNodeClick,
      onNodeToggle,
    }),
  );
});

test('passes theme without rendering it as a div prop', async () => {
  const theme = { textColor: '#111' };
  const { Markmap } = await import('../src/index');
  let renderer: ReturnType<typeof create>;

  await act(async () => {
    renderer = create(<Markmap content="# Root" theme={theme} />, {
      createNodeMock,
    });
  });

  const div = renderer.root.findByType('div');
  expect(div.props.theme).toBeUndefined();
  expect(createMindmapMock).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({
      theme,
    }),
  );
});

test('updates the embedded markmap when content changes', async () => {
  const { Markmap } = await import('../src/index');
  let renderer: ReturnType<typeof create>;

  await act(async () => {
    renderer = create(<Markmap content="# First" />, { createNodeMock });
  });
  await act(async () => {
    renderer.update(<Markmap content="# Next" />);
  });

  expect(createMindmapMock).toHaveBeenCalledOnce();
  expect(updateMock).toHaveBeenCalledWith('# Next');
});

test('aborts and destroys the embed on unmount', async () => {
  const { Markmap } = await import('../src/index');
  let renderer: ReturnType<typeof create>;

  await act(async () => {
    renderer = create(<Markmap content="# Root" />, { createNodeMock });
  });
  await act(async () => {
    renderer.unmount();
  });

  expect(destroyMock).toHaveBeenCalledOnce();
});

test('reports mount errors', async () => {
  const error = new Error('mount failed');
  const onError = vi.fn();
  createMindmapMock.mockRejectedValueOnce(error);
  const { Markmap } = await import('../src/index');

  await act(async () => {
    create(<Markmap content="# Root" onError={onError} />, {
      createNodeMock,
    });
  });

  expect(onError).toHaveBeenCalledWith(error);
});

test('renders a host iframe and connects it to the iframe SDK', async () => {
  const onReady = vi.fn();
  const { MindmapHostFrame } = await import('../src/index');
  let renderer: ReturnType<typeof create>;

  await act(async () => {
    renderer = create(
      <MindmapHostFrame
        src="https://mindmaps.capaholdings.com/?embed=1"
        targetOrigin="https://mindmaps.capaholdings.com"
        queueUntilReady
        onReady={onReady}
      />,
      { createNodeMock },
    );
  });

  const iframe = renderer.root.findByType('iframe');
  expect(iframe.props.src).toBe('https://mindmaps.capaholdings.com/?embed=1');
  expect(iframe.props.targetOrigin).toBeUndefined();
  expect(connectMindmapMock).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({
      queueUntilReady: true,
      targetOrigin: 'https://mindmaps.capaholdings.com',
    }),
  );
  expect(onReady).toHaveBeenCalledWith(
    expect.objectContaining({ saveMap: saveMapMock }),
  );
});

test('autosaves dirty host changes after the debounce delay', async () => {
  vi.useFakeTimers();
  const onChange = vi.fn();
  const { MindmapHostFrame } = await import('../src/index');

  await act(async () => {
    create(
      <MindmapHostFrame
        src="/?embed=1"
        mapId="demo"
        autosave
        autosaveDebounceMs={25}
        onChange={onChange}
      />,
      { createNodeMock },
    );
  });
  hostListeners.change?.({ dirty: true, markdown: '# Root' });

  expect(onChange).toHaveBeenCalledWith({ dirty: true, markdown: '# Root' });
  expect(saveMapMock).not.toHaveBeenCalled();
  await act(async () => {
    vi.advanceTimersByTime(25);
    await Promise.resolve();
  });

  expect(saveMapMock).toHaveBeenCalledWith('demo');
  vi.useRealTimers();
});

test('destroys the host connection and pending autosave timer on unmount', async () => {
  vi.useFakeTimers();
  const { MindmapHostFrame } = await import('../src/index');
  let renderer: ReturnType<typeof create>;

  await act(async () => {
    renderer = create(
      <MindmapHostFrame
        src="/?embed=1"
        mapId="demo"
        autosave
        autosaveDebounceMs={25}
      />,
      { createNodeMock },
    );
  });
  hostListeners.change?.({ dirty: true, markdown: '# Root' });
  await act(async () => {
    renderer.unmount();
  });
  await act(async () => {
    vi.advanceTimersByTime(25);
    await Promise.resolve();
  });

  expect(hostDestroyMock).toHaveBeenCalledOnce();
  expect(saveMapMock).not.toHaveBeenCalled();
});
