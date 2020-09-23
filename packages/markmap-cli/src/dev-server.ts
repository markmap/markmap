import { promises as fs } from 'fs';
import { EventEmitter } from 'events';
import { AddressInfo } from 'net';
import http from 'http';
import Koa from 'koa';
import open from 'open';
import chokidar from 'chokidar';
import { transform } from 'markmap-lib/dist/transform';
import { fillTemplate } from 'markmap-lib/dist/template';
import type { IMarkmapCreateOptions } from 'markmap-lib/dist/types';

function watch(input) {
  let data;
  let promise;
  const events = new EventEmitter();
  async function update() {
    const content = await fs.readFile(input, 'utf8');
    const d = transform(content || '');
    data = { ts: Date.now(), d };
    events.emit('updated');
    promise = null;
  }
  function safeUpdate() {
    if (!promise) promise = update();
    return promise;
  }
  function check() {
    chokidar.watch(input).on('all', safeUpdate);
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
  check();
  return {
    get,
    getChanged,
  };
}

export async function develop(options: IMarkmapCreateOptions) {
  const {
    input,
    open: openFile = true,
    ...rest
  } = options;
  const watcher = watch(input);
  const html = fillTemplate(null, rest) + `<script>
{
  let ts = 0;
  function refresh() {
    fetch(\`/data?ts=\${ts}\`).then(res => res.json()).then(res => {
      if (res.ts && res.ts > ts) {
        ts = res.ts;
        mm.setData(res.d);
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
}
