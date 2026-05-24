import { beforeEach, expect, test, vi } from 'vitest';
import type { IPureNode } from 'markmap-common';

const transformMock = vi.fn();
const setDataMock = vi.fn();
const fitMock = vi.fn();
const destroyMock = vi.fn();
const createMock = vi.fn();

vi.mock('markmap-lib', () => ({
  Transformer: vi.fn(() => ({
    transform: transformMock,
  })),
}));

vi.mock('markmap-view', () => ({
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
  createMock.mockReturnValue({
    setData: setDataMock,
    fit: fitMock,
    destroy: destroyMock,
  });
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
