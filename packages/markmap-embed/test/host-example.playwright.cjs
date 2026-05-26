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
        body: JSON.stringify({ id, markdown, version: 7 }),
      });
      return;
    }
    if (route.request().method() === 'PUT') {
      const body = route.request().postDataJSON();
      apiWrites.push({ id, markdown: body.markdown, version: body.version });
      maps.set(id, body.markdown);
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ id, markdown: body.markdown, version: 8 }),
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
  await frame.locator('text=Restored').first().click({ force: true });
  await page.locator('#hostNodeText').fill('HTTP Saved');
  await page.locator('#hostSaveNode').click();
  await expect(page.locator('#hostStatus')).toContainText('Saved line');
  await page.locator('#hostSaveMap').click();
  await expect(page.locator('#hostStatus')).toContainText('Saved map');

  expect(apiWrites.at(-1)).toEqual({
    id: 'server-acme',
    markdown: expect.stringContaining('HTTP Saved'),
    version: 7,
  });
  await expect(errors).toEqual([]);
});

test('host SDK example can create an HTTP API session token', async ({
  page,
}) => {
  const errors = [];
  const apiRequests = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.route('**/api/session', async (route) => {
    const body = route.request().postDataJSON();
    if (body.adminToken !== 'admin-secret') {
      await route.fulfill({ status: 401, body: 'Unauthorized' });
      return;
    }
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        token: 'session-token',
        expiresAt: '2026-05-25T20:00:00.000Z',
      }),
    });
  });
  await page.route('**/api/mindmaps/*', async (route) => {
    apiRequests.push(route.request().headers().authorization);
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'login-acme',
        markdown: route.request().postDataJSON().markdown,
      }),
    });
  });

  await page.goto(`${baseUrl}?host=1&persistence=http&apiBase=/api/mindmaps`);
  await page.locator('#hostApiToken').fill('admin-secret');
  await page.locator('#hostApiLogin').click();
  await expect(page.locator('#hostAuthStatus')).toContainText('Session ready');
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.sessionStorage.getItem('capa:mindmaps:apiToken'),
      ),
    )
    .toBe('session-token');

  const frame = page.frameLocator('#hostMindmapFrame');
  await page.locator('#hostMapId').fill('login-acme');
  await frame.locator('text=Discovery').first().click();
  await page.locator('#hostNodeText').fill('Logged In');
  await page.locator('#hostSaveNode').click();
  await page.locator('#hostSaveMap').click();
  await expect(page.locator('#hostStatus')).toContainText('Saved map');

  expect(apiRequests.at(-1)).toBe('Bearer session-token');
  await expect(errors).toEqual([]);
});

test('host SDK example can refresh and load recent HTTP maps', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.addInitScript(() => {
    window.sessionStorage.setItem('capa:mindmaps:apiToken', 'test-api-token');
  });
  await page.route('**/api/mindmaps**', async (route) => {
    const url = new URL(route.request().url());
    if (!url.pathname.startsWith('/api/mindmaps')) {
      await route.continue();
      return;
    }
    if (route.request().headers().authorization !== 'Bearer test-api-token') {
      await route.fulfill({ status: 401, body: 'Unauthorized' });
      return;
    }
    if (url.pathname === '/api/mindmaps') {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          maps: [
            {
              id: 'client-bravo',
              version: 3,
              updatedAt: '2026-05-26T00:00:00.000Z',
            },
            {
              id: 'client-alpha',
              version: 2,
              updatedAt: '2026-05-25T00:00:00.000Z',
            },
          ],
        }),
      });
      return;
    }
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'client-alpha',
        markdown: '# Alpha Map\n\n## Loaded Recent',
        version: 2,
      }),
    });
  });

  await page.goto(`${baseUrl}?host=1&persistence=http&apiBase=/api/mindmaps`);
  await expect(page.locator('#hostStatus')).toContainText('Ready');
  await page.locator('#hostRefreshMaps').click();
  await expect(page.locator('#hostRecentMaps')).toContainText('client-alpha');
  await page.locator('#hostRecentMaps').selectOption('client-alpha');
  await expect(page.locator('#hostMapId')).toHaveValue('client-alpha');
  await page.locator('#hostLoadMap').click();
  await expect(page.locator('#hostStatus')).toContainText('Loaded map');
  await expect(
    page
      .frameLocator('#hostMindmapFrame')
      .locator('text=Loaded Recent')
      .first(),
  ).toBeVisible();
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
