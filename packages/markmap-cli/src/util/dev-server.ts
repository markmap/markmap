import { ServerType, serve } from '@hono/node-server';
import { FSWatcher, watch } from 'chokidar';
import { createHash } from 'crypto';
import { createReadStream } from 'fs';
import { readFile, stat } from 'fs/promises';
import { Context, Hono } from 'hono';
import { getMimeType } from 'hono/utils/mime';
import { IDeferred, defer, mergeAssets } from 'markmap-common';
import { Transformer } from 'markmap-lib';
import { fillTemplate } from 'markmap-render';
import { AddressInfo } from 'net';
import { join, resolve } from 'path';
import { getPortPromise } from 'portfinder';
import { IContentProvider, IDevelopOptions, IFileState } from '../types';
import {
  ASSETS_PREFIX,
  config,
  createStreamBody,
  localProvider,
  toolbarAssets,
} from './common';

type MaybePromise<T> = T | Promise<T>;

function sequence(fn: () => MaybePromise<void>) {
  let promise: Promise<void> | undefined;
  return () => {
    promise ||= Promise.resolve(fn()).finally(() => {
      promise = undefined;
    });
    return promise;
  };
}

class BufferContentProvider implements IContentProvider {
  private deferredSet = new Set<IDeferred<void>>();

  state: IFileState = {
    content: {
      ts: 0,
      value: '',
    },
    line: {
      ts: 0,
      value: 0,
    },
  };

  protected disposeList: Array<() => void> = [];

  constructor(readonly key: string) {}

  async getUpdate(query: Record<string, number>, timeout = 10000) {
    const deferred = defer<void>();
    this.deferredSet.add(deferred);
    setTimeout(() => {
      this.feed(null, deferred);
    }, timeout);
    if (Object.keys(query).some((key) => query[key] < this.state[key].ts)) {
      this.feed(null, deferred);
    }
    await deferred.promise;
  }

  protected feed(data: Partial<IFileState> | null, deferred?: IDeferred<void>) {
    if (data) {
      Object.assign(this.state, data);
    }
    if (deferred) {
      deferred.resolve();
      this.deferredSet.delete(deferred);
    } else {
      for (const d of this.deferredSet) {
        d.resolve();
      }
      this.deferredSet.clear();
    }
  }

  setCursor(line: number) {
    this.feed({
      line: {
        ts: Date.now(),
        value: line,
      },
    });
  }

  setContent(content: string) {
    this.feed({
      content: {
        ts: Date.now(),
        value: content,
      },
    });
  }

  dispose() {
    this.disposeList.forEach((dispose) => dispose());
  }
}

class FileSystemProvider
  extends BufferContentProvider
  implements IContentProvider
{
  constructor(
    key: string,
    readonly filePath: string,
    watch: (callback: () => void) => () => void,
  ) {
    super(key);
    this.disposeList.push(watch(() => this.update()));
  }

  async update() {
    const content = await readFile(this.filePath, 'utf8');
    this.setContent(content);
  }
}

function sha256(input: string) {
  return createHash('sha256').update(input, 'utf8').digest('hex').slice(0, 7);
}

async function sendStatic(c: Context, realpath: string) {
  try {
    const result = await stat(realpath);
    if (!result.isFile()) throw new Error('File not found');
  } catch {
    return c.body('File not found', 404);
  }
  const stream = createReadStream(realpath);
  const type = getMimeType(realpath);
  if (type) c.header('content-type', type);
  return c.body(createStreamBody(stream));
}

export class MarkmapDevServer {
  providers: Record<string, IContentProvider> = {};

  private transformer: Transformer;
  private html: string;

  private watcher: FSWatcher | undefined;
  private callbacks: Record<string, () => void> = {};

  private disposeList: Array<() => void> = [];

  serverInfo: {
    server: ServerType;
    address: AddressInfo;
  } | null = null;

  constructor(
    public options: IDevelopOptions,
    transformer?: Transformer,
  ) {
    this.transformer = transformer || new Transformer();
    this.html = this._buildHtml();
    this.disposeList.push(() => {
      this.watcher?.close();
    });
  }

  private _buildHtml() {
    const otherAssets = mergeAssets(
      this.options.toolbar ? toolbarAssets : null,
      {
        scripts: [
          {
            type: 'iife',
            data: {
              fn: (options) => {
                window.markmap.cliOptions = options;
              },
              getParams: () => [this.options],
            },
          },
        ],
      },
    );
    const assets = mergeAssets(this.transformer.getAssets(), {
      scripts: otherAssets.scripts?.map((item) =>
        this.transformer.resolveJS(item),
      ),
      styles: otherAssets.styles?.map((item) =>
        this.transformer.resolveCSS(item),
      ),
    });
    // Note: `client.js` must be loaded after `mm` is ready
    const html =
      fillTemplate(null, assets, {
        urlBuilder: this.transformer.urlBuilder,
      }) + '<script src="/~client.js"></script>';
    return html;
  }

  async setup() {
    if (this.serverInfo) throw new Error('Server already set up');
    const app = new Hono();
    app.get('/', (c) => {
      const key = c.req.query('key') || '';
      if (!this.providers[key]) return c.notFound();
      return c.html(this.html);
    });
    app.get('/~data', async (c) => {
      const key = c.req.query('key') || '';
      const provider = this.providers[key];
      if (!provider) return c.json({}, 404);
      const query = Object.fromEntries(
        ['content', 'line'].map((key) => [key, +(c.req.query(key) || '') || 0]),
      );
      await provider.getUpdate(query);
      const updatedKeys = Object.keys(query).filter(
        (key) => query[key] < provider.state[key].ts,
      );
      const result = Object.fromEntries(
        updatedKeys.map((key) => {
          let data = provider.state[key];
          if (key === 'content') {
            const result = this.transformer.transform(data.value as string);
            data = {
              ...data,
              value: {
                frontmatter: result.frontmatter,
                root: result.root,
              },
            };
          }
          return [key, data];
        }),
      );
      return c.json(result);
    });
    app.post('/~api', async (c) => {
      const key = c.req.query('key') || '';
      const provider = this.providers[key];
      if (!provider) return c.json({}, 404);
      const { cmd, args } = await c.req.json();
      await provider[cmd]?.(...args);
      return c.body(null, 204);
    });
    const { distDir, assetsDir } = config;
    app.get('/~client.*', async (c) => {
      const realpath = join(distDir, c.req.path.slice(2));
      return sendStatic(c, realpath);
    });
    app.get(`${ASSETS_PREFIX}*`, async (c) => {
      const relpath = c.req.path.slice(ASSETS_PREFIX.length);
      const realpath = join(assetsDir, relpath);
      return sendStatic(c, realpath);
    });

    const deferred = defer<AddressInfo>();
    const server = serve(
      {
        fetch: app.fetch,
        port: this.options.port || (await getPortPromise()),
      },
      deferred.resolve,
    );
    const address = await deferred.promise;
    this.serverInfo = {
      server,
      address,
    };
  }

  async shutdown() {
    if (!this.serverInfo) throw new Error('Server is not set up yet');
    const deferred = defer();
    this.serverInfo.server.close((err) => {
      if (err) deferred.reject();
      else deferred.resolve();
    });
    await deferred.promise;
    this.serverInfo = null;
  }

  async destroy() {
    await this.shutdown();
    this.disposeList.forEach((dispose) => dispose());
  }

  private _watch(filePath: string, callback: () => MaybePromise<void>) {
    let { watcher } = this;
    if (!watcher) {
      watcher = watch([]).on('all', (_event, path) => {
        const callback = this.callbacks[path];
        callback?.();
      });
      this.watcher = watcher;
    }
    watcher.add(filePath);
    this.callbacks[filePath] = sequence(callback);
    return () => {
      watcher.unwatch(filePath);
      delete this.callbacks[filePath];
    };
  }

  addProvider(options?: { key?: string; filePath?: string }) {
    const filePath = options?.filePath && resolve(options.filePath);
    const key =
      options?.key ||
      (filePath ? sha256(filePath) : Math.random().toString(36).slice(2, 9));
    this.providers[key] ||= filePath
      ? new FileSystemProvider(key, filePath, (callback: () => void) =>
          this._watch(filePath, callback),
        )
      : new BufferContentProvider(key);
    return this.providers[key];
  }

  delProvider(key: string) {
    const provider = this.providers[key];
    provider?.dispose();
    delete this.providers[key];
  }
}

export async function develop(options: IDevelopOptions) {
  const transformer = new Transformer();
  transformer.urlBuilder.setProvider('local', localProvider);
  transformer.urlBuilder.provider = 'local';
  const devServer = new MarkmapDevServer(options, transformer);
  await devServer.setup();
  return devServer;
}
