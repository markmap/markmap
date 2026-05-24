import { act, create } from 'react-test-renderer';
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
