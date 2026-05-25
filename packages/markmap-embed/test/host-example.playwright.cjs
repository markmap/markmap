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
