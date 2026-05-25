// eslint-disable-next-line @typescript-eslint/no-require-imports
const { expect, test } = require('@playwright/test');

let server;
let baseUrl;

test.beforeAll(async () => {
  const { createServer } = await import('vite');
  server = await createServer({
    root: 'examples/mindmaps-playground',
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

test('host SDK example edits a clicked iframe node', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await page.goto(`${baseUrl}?host=1`);
  await expect(page.locator('#hostStatus')).toContainText('Ready');

  const frame = page.frameLocator('#hostMindmapFrame');
  await frame.locator('text=Discovery').first().click();

  await expect(page.locator('#hostNodeText')).toHaveValue('Discovery');
  await expect(page.locator('#hostNodeId')).toHaveValue(/^node-/);
  await page.locator('#hostNodeText').fill('Assessment');
  await page.locator('#hostSaveNode').click();

  await expect(page.locator('#hostStatus')).toContainText('Saved line 2');
  await expect(frame.locator('text=Assessment').first()).toBeVisible();
  await expect(errors).toEqual([]);
});

test('host SDK example saves and loads maps by id', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await page.goto(`${baseUrl}?host=1`);
  await expect(page.locator('#hostStatus')).toContainText('Ready');

  const frame = page.frameLocator('#hostMindmapFrame');
  await frame.locator('text=Discovery').first().click();
  await page.locator('#hostNodeText').fill('Assessment');
  await page.locator('#hostSaveNode').click();
  await expect(page.locator('#hostStatus')).toContainText('Saved line 2');

  await page.locator('#hostMapId').fill('client-acme');
  await page.locator('#hostSaveMap').click();
  await expect(page.locator('#hostStatus')).toContainText('Saved map');

  await page.locator('#hostNodeText').fill('Discovery Reloaded');
  await page.locator('#hostSaveNode').click();
  await expect(page.locator('#hostStatus')).toContainText('Saved line 2');
  await expect(frame.locator('text=Discovery Reloaded').first()).toBeVisible();

  await page.locator('#hostLoadMap').click();
  await expect(page.locator('#hostStatus')).toContainText('Loaded map');
  await expect(frame.locator('text=Assessment').first()).toBeVisible();
  await expect(errors).toEqual([]);
});

test('host SDK example autosaves dirty changes after node edits', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await page.goto(`${baseUrl}?host=1`);
  await expect(page.locator('#hostStatus')).toContainText('Ready');

  const frame = page.frameLocator('#hostMindmapFrame');
  await page.locator('#hostMapId').fill('autosave-acme');
  await frame.locator('text=Discovery').first().click();
  await page.locator('#hostAutosave').check();
  await page.locator('#hostNodeText').fill('Assessment');
  await page.locator('#hostSaveNode').click();

  await expect(page.locator('#hostDirtyState')).toContainText('Dirty');
  await expect(page.locator('#hostDirtyState')).toContainText('Saved', {
    timeout: 5000,
  });
  await page.reload();
  await expect(page.locator('#hostStatus')).toContainText('Ready');
  await page.locator('#hostMapId').fill('autosave-acme');
  await page.locator('#hostLoadMap').click();
  await expect(page.locator('#hostStatus')).toContainText('Loaded map');
  await expect(frame.locator('text=Assessment').first()).toBeVisible();
  await expect(errors).toEqual([]);
});

test('host SDK example can persist maps through an HTTP API adapter', async ({
  page,
}) => {
  const errors = [];
  const apiWrites = [];
  const maps = new Map([['server-acme', '# Server Map\n\n## Restored']]);
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.addInitScript(() => {
    window.sessionStorage.setItem('capa:mindmaps:apiToken', 'test-api-token');
  });
  await page.route('**/api/mindmaps/*', async (route) => {
    if (route.request().headers().authorization !== 'Bearer test-api-token') {
      await route.fulfill({ status: 401, body: 'Unauthorized' });
      return;
    }
    const url = new URL(route.request().url());
    const id = decodeURIComponent(url.pathname.split('/').pop() || '');
    if (route.request().method() === 'GET') {
      const markdown = maps.get(id);
      if (!markdown) {
        await route.fulfill({ status: 404, body: 'Not found' });
        return;
      }
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ id, markdown }),
      });
      return;
    }
    if (route.request().method() === 'PUT') {
      const body = route.request().postDataJSON();
      apiWrites.push({ id, markdown: body.markdown });
      maps.set(id, body.markdown);
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ id, markdown: body.markdown }),
      });
      return;
    }
    await route.fulfill({ status: 405, body: 'Method not allowed' });
  });

  await page.goto(`${baseUrl}?host=1&persistence=http&apiBase=/api/mindmaps`);
  await expect(page.locator('#hostStatus')).toContainText('Ready');
  await page.locator('#hostMapId').fill('server-acme');
  await page.locator('#hostLoadMap').click();
  await expect(page.locator('#hostStatus')).toContainText('Loaded map');

  const frame = page.frameLocator('#hostMindmapFrame');
  await expect(frame.locator('text=Restored').first()).toBeVisible();
  await frame.locator('text=Restored').first().click();
  await page.locator('#hostNodeText').fill('HTTP Saved');
  await page.locator('#hostSaveNode').click();
  await expect(page.locator('#hostStatus')).toContainText('Saved line');
  await page.locator('#hostSaveMap').click();
  await expect(page.locator('#hostStatus')).toContainText('Saved map');

  expect(apiWrites.at(-1)).toEqual({
    id: 'server-acme',
    markdown: expect.stringContaining('HTTP Saved'),
  });
  await expect(errors).toEqual([]);
});

test('embed help page shows integration snippets and iframe preview', async ({
  page,
}) => {
  const errors = [];
  const requestedUrls = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('request', (request) => {
    if (request.frame() === page.mainFrame()) requestedUrls.push(request.url());
  });

  await page.goto(`${baseUrl}embed-help`);

  await expect(page.locator('h1')).toContainText('Embed CAPA Mindmaps');
  await expect(page.locator('#embedHelpPreview')).toHaveAttribute(
    'src',
    /embed=1/,
  );
  await expect(page.locator('[data-snippet-tab="web-component"]')).toHaveClass(
    /active/,
  );
  await expect(page.locator('#embedHelpSnippet')).toContainText(
    '<markmap-host-frame',
  );

  await page.locator('[data-snippet-tab="react"]').click();
  await expect(page.locator('#embedHelpSnippet')).toContainText(
    'MindmapHostFrame',
  );

  await page.locator('[data-snippet-tab="vue"]').click();
  await expect(page.locator('#embedHelpSnippet')).toContainText(
    'MarkmapHostFrame',
  );
  await expect(page.locator('#embedHelpCsp')).toContainText(
    "frame-ancestors 'self' https://capaholdings.com",
  );
  expect(
    requestedUrls.some((url) =>
      url.includes('/packages/markmap-embed/src/index.ts'),
    ),
  ).toBe(false);
  expect(
    requestedUrls.some((url) => url.includes('/packages/markmap-lib/')),
  ).toBe(false);
  await expect(errors).toEqual([]);
});

test('embed mode ignores host commands from unconfigured origins', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await page.goto(
    `${baseUrl}?embed=1&parentOrigin=${encodeURIComponent('https://app.example.com')}`,
  );
  await expect(page.locator('text=Discovery').first()).toBeVisible();

  await page.evaluate(() => {
    window.dispatchEvent(
      new MessageEvent('message', {
        origin: 'https://evil.example',
        data: {
          type: 'capa:mindmap',
          action: 'setContent',
          content: '# Evil Map',
        },
      }),
    );
  });
  await page.waitForTimeout(250);
  await expect(page.locator('text=Evil Map')).toHaveCount(0);

  await page.evaluate(() => {
    window.dispatchEvent(
      new MessageEvent('message', {
        origin: 'https://app.example.com',
        data: {
          type: 'capa:mindmap',
          action: 'setContent',
          content: '# Trusted Map',
        },
      }),
    );
  });
  await expect(page.locator('text=Trusted Map')).toBeVisible();
  await expect(errors).toEqual([]);
});
