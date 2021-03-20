import { promises as fs } from 'fs';
import { EventEmitter } from 'events';
import { AddressInfo } from 'net';
import http from 'http';
import Koa from 'koa';
import open from 'open';
import chokidar from 'chokidar';
import { Transformer, fillTemplate } from 'markmap-lib';
import { IDevelopOptions, addToolbar } from './util';

interface IFileUpdate {
  ts?: number;
  content?: string;
}

interface IFileProvider {
  get: () => Promise<IFileUpdate>;
  getUpdate: (ts: number, timeout?: number) => Promise<IFileUpdate>;
  dispose: () => void;
}

class FileSystemProvider implements IFileProvider {
  private data: IFileUpdate;

  private events = new EventEmitter();

  private promise: Promise<void>;

  private watcher: chokidar.FSWatcher;

  constructor(private fileName: string) {
    this.watcher = chokidar.watch(fileName).on('all', () => this.safeUpdate());
  }

  private async update() {
    const content = await fs.readFile(this.fileName, 'utf8');
    this.data = { ts: Date.now(), content };
    this.events.emit('updated');
    this.promise = null;
  }

  private safeUpdate() {
    if (!this.promise) this.promise = this.update();
    return this.promise;
  }

  async get() {
    if (!this.data) await this.safeUpdate();
    return this.data;
  }

  async getUpdate(ts: number | undefined, timeout = 10000): Promise<IFileUpdate> {
    if (this.data && (Number.isNaN(ts) || ts < this.data.ts)) return this.data;
    try {
      await new Promise((resolve, reject) => {
        this.events.once('updated', resolve);
        setTimeout(() => {
          this.events.off('updated', resolve);
          reject();
        }, timeout);
      });
      return this.data;
    } catch {
      return {};
    }
  }

  dispose() {
    this.watcher.close();
  }
}

function setUpServer(transformer: Transformer, provider: IFileProvider, options: IDevelopOptions) {
  let assets = transformer.getAssets();
  if (options.toolbar) assets = addToolbar(assets);
  const html = fillTemplate(null, assets) + `<script>
{
  let ts = 0;
  function refresh() {
    fetch(\`/data?ts=\${ts}\`).then(res => res.json()).then(res => {
      if (res.ts && res.ts > ts) {
        ts = res.ts;
        if (res.result) {
          mm.setData(res.result.root);
          mm.fit();
        }
      }
      setTimeout(refresh, 300);
    });
  }
  refresh();
}
</script>`;

  const app = new Koa();
  app.use(async (ctx, next) => {
    if (ctx.path === '/') {
      ctx.body = html;
    } else if (ctx.path === '/data') {
      const update = await provider.getUpdate(ctx.query.ts);
      const result = transformer.transform(update.content || '');
      ctx.body = { ts: update.ts, result };
    } else {
      await next();
    }
  });

  const handle = app.callback() as http.RequestListener;
  const server = http.createServer(handle);
  server.listen(() => {
    const { port } = server.address() as AddressInfo;
    console.info(`Listening at http://localhost:${port}`);
    if (options.open) open(`http://localhost:${port}`);
  });
  let closing: Promise<void>;
  return {
    close() {
      if (!closing) {
        closing = new Promise((resolve, reject) => server.close((err?: Error) => {
          if (err) reject(err);
          else resolve();
        }));
      }
      return closing;
    },
  };
}

export async function develop(fileName: string, options: IDevelopOptions) {
  const transformer = new Transformer();
  const provider = new FileSystemProvider(fileName);
  return setUpServer(transformer, provider, options);
}
