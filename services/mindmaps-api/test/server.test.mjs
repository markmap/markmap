import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';

import { createMindmapsApiServer } from '../src/server.mjs';

let baseUrl;
let server;
let tempDir;

before(async () => {
  tempDir = await mkdtemp(path.join(tmpdir(), 'mindmaps-api-'));
  server = createMindmapsApiServer({
    dataFile: path.join(tempDir, 'maps.json'),
    token: 'test-token',
  });
  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  await rm(tempDir, { recursive: true, force: true });
});

function authHeaders(extra = {}) {
  return {
    authorization: 'Bearer test-token',
    ...extra,
  };
}

test('health check does not require auth', async () => {
  const response = await fetch(`${baseUrl}/healthz`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
});

test('mindmap API requires bearer auth', async () => {
  const response = await fetch(`${baseUrl}/api/mindmaps/client-123`);
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: 'Unauthorized' });
});

test('mindmap API rejects invalid map ids', async () => {
  const response = await fetch(`${baseUrl}/api/mindmaps/..%2Fsecret`, {
    headers: authHeaders(),
  });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'Invalid map id' });
});

test('mindmap API saves and loads markdown with metadata', async () => {
  const saveResponse = await fetch(`${baseUrl}/api/mindmaps/client-123`, {
    method: 'PUT',
    headers: authHeaders({ 'content-type': 'application/json' }),
    body: JSON.stringify({ markdown: '# Strategy' }),
  });
  assert.equal(saveResponse.status, 200);
  const saved = await saveResponse.json();
  assert.equal(saved.id, 'client-123');
  assert.equal(saved.markdown, '# Strategy');
  assert.equal(saved.version, 1);
  assert.match(saved.createdAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(saved.createdAt, saved.updatedAt);

  const loadResponse = await fetch(`${baseUrl}/api/mindmaps/client-123`, {
    headers: authHeaders(),
  });
  assert.equal(loadResponse.status, 200);
  assert.deepEqual(await loadResponse.json(), saved);
});

test('mindmap API prevents stale version overwrites', async () => {
  const staleResponse = await fetch(`${baseUrl}/api/mindmaps/client-123`, {
    method: 'PUT',
    headers: authHeaders({ 'content-type': 'application/json' }),
    body: JSON.stringify({ markdown: '# Stale', version: 0 }),
  });
  assert.equal(staleResponse.status, 409);
  assert.deepEqual(await staleResponse.json(), {
    error: 'Version conflict',
    version: 1,
  });

  const saveResponse = await fetch(`${baseUrl}/api/mindmaps/client-123`, {
    method: 'PUT',
    headers: authHeaders({ 'content-type': 'application/json' }),
    body: JSON.stringify({ markdown: '# Updated', version: 1 }),
  });
  assert.equal(saveResponse.status, 200);
  const saved = await saveResponse.json();
  assert.equal(saved.version, 2);
  assert.equal(saved.markdown, '# Updated');
});
