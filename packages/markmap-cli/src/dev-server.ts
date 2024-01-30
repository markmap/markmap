import { serve } from '@hono/node-server';
import chokidar from 'chokidar';
import { EventEmitter } from 'events';
import { createReadStream } from 'fs';
import { readFile, stat } from 'fs/promises';
import { Hono } from 'hono';
import { getMimeType } from 'hono/utils/mime';
import { IDeferred, INode, defer } from 'markmap-common';
import { Transformer } from 'markmap-lib';
import { fillTemplate } from 'markmap-render';
import open from 'open';
import { join } from 'path';
import {
  ASSETS_PREFIX,
  addToolbar,
  config,
  createStreamBody,
  localProvider,
} from './util';
import { IDevelopOptions, IContentProvider, IFileUpdate } from './types';

function sequence(fn: () => Promise<void>) {
  let promise: Promise<void> | undefined;
  return () => {
    promise ||= fn().finally(() => {
      promise = undefined;
    });
    return promise;
  };
}

class BufferContentProvider implements IContentProvider {
  private deferredSet = new Set<IDeferred<IFileUpdate>>();

  private events = new EventEmitter();

  private ts = 0;

  private content = '';

  private line = -1;

  constructor() {
    this.events.on('content', () => {
      this.feed({
        ts: this.ts,
        content: this.content,
      });
    });
    this.events.on('cursor', () => {
      this.feed({
        line: this.line,
      });
    });
  }

  async getUpdate(ts: number, timeout = 10000): Promise<IFileUpdate> {
    const deferred = defer<IFileUpdate>();
    this.deferredSet.add(deferred);
    setTimeout(() => {
      this.feed({}, deferred);
    }, timeout);
    if (ts < this.ts) {
      this.feed({ ts: this.ts, content: this.content }, deferred);
    }
    return deferred.promise;
  }

  protected feed(data: IFileUpdate, deferred?: IDeferred<IFileUpdate>) {
    if (deferred) {
      deferred.resolve(data);
      this.deferredSet.delete(deferred);
    } else {
      for (const d of this.deferredSet) {
        d.resolve(data);
      }
      this.deferredSet.clear();
    }
  }

  setCursor(line: number) {
    this.line = line;
    this.events.emit('cursor');
  }

  setContent(content: string) {
    this.ts = Date.now();
    this.content = content;
    this.events.emit('content');
  }

  dispose() {
    /* noop */
  }
}

class FileSystemProvider
  extends BufferContentProvider
  implements IContentProvider
{
  private watcher: chokidar.FSWatcher;

  constructor(private fileName: string) {
    super();
    this.watcher = chokidar.watch(fileName).on(
      'all',
      sequence(() => this.update()),
    );
  }

  private async update() {
    const content = await readFile(this.fileName, 'utf8');
    this.setContent(content);
  }

  dispose() {
    super.dispose();
    this.watcher.close();
  }
}

function startServer(paddingBottom: number) {
  let ts = 0;
  let root: INode;
  let line: number;
  let offset = 0;
  const { mm, markmap } = window;
  refresh();
  function refresh() {
    fetch(`/~data?ts=${ts}`)
      .then((res) => res.json())
      .then((res) => {
        if (res.ts && res.ts > ts && res.result) {
          let frontmatter: any;
          ({ root, frontmatter, contentLineOffset: offset } = res.result);
          mm.setOptions(markmap.deriveOptions(frontmatter?.markmap));
          mm.setData(root);
          if (!ts) mm.fit();
          ts = res.ts;
          line = -1;
        }
        if (root && res.line != null && line !== res.line) {
          line = res.line;
          const active = findActiveNode();
          if (active) mm.ensureView(active, { bottom: paddingBottom });
        }
        setTimeout(refresh, 300);
      });
  }
  function findActiveNode() {
    const lineWithoutFrontmatter = line - offset;
    let best: INode | undefined;
    dfs(root);
    return best;
    function dfs(node: INode) {
      const [start, end] =
        (node.payload?.lines as string | undefined)
          ?.split(',')
          .map((s) => +s) || [];
      if (
        start >= 0 &&
        start <= lineWithoutFrontmatter &&
        lineWithoutFrontmatter < end
      ) {
        best = node;
      }
      node.children?.forEach(dfs);
    }
  }
}

async function setUpServer(
  transformer: Transformer,
  provider: IContentProvider,
  options: IDevelopOptions,
) {
  let assets = transformer.getAssets();
  if (options.toolbar) assets = addToolbar(transformer.urlBuilder, assets);
  const html = `${fillTemplate(null, assets, {
    urlBuilder: transformer.urlBuilder,
  })}<script>(${startServer.toString()})(${options.toolbar ? 60 : 0})</script>`;

  const app = new Hono();
  app.get('/', (c) => c.html(html));
  app.get('/~data', async (c) => {
    const update = await provider.getUpdate(+(c.req.query('ts') || 0));
    const result =
      update.content == null
        ? null
        : transformer.transform(update.content || '');
    return c.json({ ts: update.ts, result, line: update.line });
  });
  app.post('/~api', async (c) => {
    const { cmd, args } = await c.req.json();
    await provider[cmd]?.(...args);
    return c.body(null, 204);
  });
  const { assetsDir } = config;
  app.get(`${ASSETS_PREFIX}*`, async (c) => {
    const relpath = c.req.path.slice(ASSETS_PREFIX.length);
    const realpath = join(assetsDir, relpath);
    try {
      const result = await stat(realpath);
      if (!result.isFile()) throw new Error('File not found');
    } catch {
      return c.body('File not found', 404);
    }
    const stream = createReadStream(realpath);
    const type = getMimeType(relpath);
    if (type) c.header('content-type', type);
    return c.body(createStreamBody(stream));
  });

  const server = serve(
    {
      fetch: app.fetch,
      port: options.port,
    },
    (info) => {
      const { port } = info;
      console.info(`Listening at http://localhost:${port}`);
      if (options.open) open(`http://localhost:${port}`);
    },
  );

  let closing: Promise<void>;
  return {
    provider,
    close() {
      if (!closing) {
        closing = new Promise((resolve, reject) =>
          server.close((err?: Error) => {
            if (err) reject(err);
            else resolve();
          }),
        );
      }
      return closing;
    },
  };
}

export async function develop(
  fileName: string | undefined,
  options: IDevelopOptions,
) {
  const transformer = new Transformer();
  transformer.urlBuilder.setProvider('local', localProvider);
  transformer.urlBuilder.provider = 'local';
  const provider = fileName
    ? new FileSystemProvider(fileName)
    : new BufferContentProvider();
  return setUpServer(transformer, provider, options);
}
