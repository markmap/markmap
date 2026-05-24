// eslint-disable-next-line @typescript-eslint/no-require-imports
const { expect, test } = require('@playwright/test');

let server;
let baseUrl;

test.beforeAll(async () => {
  const { createServer } = await import('vite');
  server = await createServer({
    root: process.cwd(),
    logLevel: 'error',
    server: {
      host: '127.0.0.1',
      port: 0,
    },
  });
  await server.listen();
  baseUrl = server.resolvedUrls.local[0];
});

test.afterAll(async () => {
  await server.close();
});

test('mounts updates and destroys a real embedded markmap', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await page.goto(`${baseUrl}packages/markmap-embed/test/browser-smoke.html`);
  await page.waitForFunction(() => window.__markmapSmoke?.ready === true);
  const result = await page.evaluate(() => window.__markmapSmoke);

  expect(errors).toEqual([]);
  expect(result.svgCount).toBe(1);
  expect(result.initialText).toContain('Root');
  expect(result.initialText).toContain('Child');
  expect(result.clickedNodeContent).toContain('Root');
  expect(result.updatedText).toContain('Next');
  expect(result.updatedText).toContain('Item');
  expect(result.afterDestroyChildCount).toBe(0);
});
