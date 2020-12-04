import { promises as fs } from 'fs';
import { EventEmitter } from 'events';
import { AddressInfo } from 'net';
import http from 'http';
import Koa from 'koa';
import open from 'open';
import chokidar from 'chokidar';
import { Transformer, fillTemplate } from 'markmap-lib';

function watch(transformer, input) {
  let data;
  let promise;
  let watcher = chokidar.watch(input).on('all', safeUpdate);
  const events = new EventEmitter();
  return {
    get,
    getChanged,
    revoke,
  };
  async function update() {
    const content = await fs.readFile(input, 'utf8');
    const result = transformer.transform(content || '');
    data = { ts: Date.now(), ...result };
    events.emit('updated');
    promise = null;
  }
  function safeUpdate() {
    if (!promise) promise = update();
    return promise;
  }
  async function get() {
    if (!data) await safeUpdate();
    return data;
  }
  async function getChanged(ts, timeout = 10000) {
    if (data && (Number.isNaN(ts) || ts < data.ts)) return data;
    try {
      await new Promise((resolve, reject) => {
        events.once('updated', resolve);
        setTimeout(() => {
          events.off('updated', resolve);
          reject();
        }, timeout);
      });
      return data;
    } catch {
      return {};
    }
  }
  function revoke() {
    if (watcher) {
      watcher.close();
      watcher = null;
    }
  }
}

function setUpServer(transformer, watcher, openFile: boolean) {
  const assets = transformer.getAssets();
  const html = fillTemplate(null, assets) + `<script>
{
  let ts = 0;
  function refresh() {
    fetch(\`/data?ts=\${ts}\`).then(res => res.json()).then(res => {
      if (res.ts && res.ts > ts) {
        ts = res.ts;
        mm.setData(res.root);
        mm.fit();
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
      ctx.body = await watcher.getChanged(ctx.query.ts);
    } else {
      await next();
    }
  });

  const handle = app.callback() as http.RequestListener;
  const server = http.createServer(handle);
  server.listen(() => {
    const { port } = server.address() as AddressInfo;
    console.info(`Listening at http://localhost:${port}`);
    if (openFile) open(`http://localhost:${port}`);
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

export async function develop(options: {
  input: string;
  open: boolean;
}) {
  const transformer = new Transformer();
  const watcher = watch(transformer, options.input);
  return setUpServer(transformer, watcher, options.open);
}
