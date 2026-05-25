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
