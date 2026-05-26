import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';

import { createMindmapsApiServer } from '../src/server.mjs';

let baseUrl;
let server;
let tempDir;
let nowMs;

before(async () => {
  nowMs = Date.parse('2026-05-25T12:00:00.000Z');
  tempDir = await mkdtemp(path.join(tmpdir(), 'mindmaps-api-'));
  server = createMindmapsApiServer({
    dataFile: path.join(tempDir, 'maps.json'),
    adminToken: 'admin-token',
    now: () => nowMs,
    sessionRateLimitMax: 3,
    sessionRateLimitWindowMs: 1000,
    sessionTtlMs: 1000,
    token: 'test-token',
  });
  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

async function createSession(
  body = { adminToken: 'admin-token' },
  headers = {},
) {
  return fetch(`${baseUrl}/api/session`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

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

function sessionAuthHeaders(token, extra = {}) {
  return {
    authorization: `Bearer ${token}`,
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

test('session API rejects invalid admin tokens', async () => {
  const response = await createSession({ adminToken: 'wrong-token' });
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: 'Unauthorized' });
});

test('session API rate limits repeated invalid admin tokens by client IP', async () => {
  nowMs = Date.parse('2026-05-25T12:01:00.000Z');
  const headers = { 'x-forwarded-for': '203.0.113.10' };
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await createSession(
      { adminToken: 'wrong-token' },
      headers,
    );
    assert.equal(response.status, 401);
  }

  const limited = await createSession({ adminToken: 'wrong-token' }, headers);
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get('retry-after'), '1');
  assert.deepEqual(await limited.json(), {
    error: 'Too many session attempts',
  });

  nowMs = Date.parse('2026-05-25T12:01:01.001Z');
  const response = await createSession({ adminToken: 'admin-token' }, headers);
  assert.equal(response.status, 200);
});

test('session API issues short-lived bearer tokens for map access', async () => {
  nowMs = Date.parse('2026-05-25T12:00:00.000Z');
  const sessionResponse = await createSession();
  assert.equal(sessionResponse.status, 200);
  const session = await sessionResponse.json();
  assert.match(session.token, /^[A-Za-z0-9_-]{32,}$/);
  assert.equal(session.expiresAt, '2026-05-25T12:00:01.000Z');

  const saveResponse = await fetch(`${baseUrl}/api/mindmaps/session-map`, {
    method: 'PUT',
    headers: sessionAuthHeaders(session.token, {
      'content-type': 'application/json',
    }),
    body: JSON.stringify({ markdown: '# Session Map' }),
  });
  assert.equal(saveResponse.status, 200);

  const loadResponse = await fetch(`${baseUrl}/api/mindmaps/session-map`, {
    headers: sessionAuthHeaders(session.token),
  });
  assert.equal(loadResponse.status, 200);
  assert.equal((await loadResponse.json()).markdown, '# Session Map');
});

test('session API rejects expired bearer tokens', async () => {
  nowMs = Date.parse('2026-05-25T12:00:00.000Z');
  const sessionResponse = await createSession();
  const session = await sessionResponse.json();
  nowMs = Date.parse('2026-05-25T12:00:01.001Z');

  const response = await fetch(`${baseUrl}/api/mindmaps/session-map`, {
    headers: sessionAuthHeaders(session.token),
  });
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
    body: JSON.stringify({ markdown: '# Strategy', title: 'Client Strategy' }),
  });
  assert.equal(saveResponse.status, 200);
  const saved = await saveResponse.json();
  assert.equal(saved.id, 'client-123');
  assert.equal(saved.markdown, '# Strategy');
  assert.equal(saved.title, 'Client Strategy');
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
  assert.equal(saved.title, 'Client Strategy');
});

test('mindmap API validates and clears explicit titles', async () => {
  const tooLongTitle = 'x'.repeat(257);
  const invalidResponse = await fetch(`${baseUrl}/api/mindmaps/title-map`, {
    method: 'PUT',
    headers: authHeaders({ 'content-type': 'application/json' }),
    body: JSON.stringify({ markdown: '# Title Map', title: tooLongTitle }),
  });
  assert.equal(invalidResponse.status, 400);
  assert.deepEqual(await invalidResponse.json(), {
    error: 'Title is too large.',
  });

  const saveResponse = await fetch(`${baseUrl}/api/mindmaps/title-map`, {
    method: 'PUT',
    headers: authHeaders({ 'content-type': 'application/json' }),
    body: JSON.stringify({ markdown: '# Title Map', title: 'Roadmap' }),
  });
  assert.equal(saveResponse.status, 200);
  const saved = await saveResponse.json();
  assert.equal(saved.title, 'Roadmap');

  const clearResponse = await fetch(`${baseUrl}/api/mindmaps/title-map`, {
    method: 'PUT',
    headers: authHeaders({ 'content-type': 'application/json' }),
    body: JSON.stringify({
      markdown: '# Title Map',
      title: '',
      version: saved.version,
    }),
  });
  assert.equal(clearResponse.status, 200);
  assert.equal('title' in (await clearResponse.json()), false);
});

test('mindmap API lists saved maps without markdown bodies', async () => {
  const firstResponse = await fetch(`${baseUrl}/api/mindmaps/list-first`, {
    method: 'PUT',
    headers: authHeaders({ 'content-type': 'application/json' }),
    body: JSON.stringify({
      markdown: '# First Client Map\n\n## Discovery',
      title: 'Explicit First Map',
    }),
  });
  assert.equal(firstResponse.status, 200);
  const first = await firstResponse.json();

  await new Promise((resolve) => setTimeout(resolve, 5));
  const secondResponse = await fetch(`${baseUrl}/api/mindmaps/list-second`, {
    method: 'PUT',
    headers: authHeaders({ 'content-type': 'application/json' }),
    body: JSON.stringify({ markdown: '- No title here' }),
  });
  assert.equal(secondResponse.status, 200);
  const second = await secondResponse.json();

  const response = await fetch(`${baseUrl}/api/mindmaps`, {
    headers: authHeaders(),
  });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.deepEqual(result.maps.slice(0, 2), [
    {
      id: 'list-second',
      title: 'list-second',
      version: second.version,
      createdAt: second.createdAt,
      updatedAt: second.updatedAt,
    },
    {
      id: 'list-first',
      title: 'Explicit First Map',
      version: first.version,
      createdAt: first.createdAt,
      updatedAt: first.updatedAt,
    },
  ]);
  assert.equal('markdown' in result.maps[0], false);

  const filteredResponse = await fetch(
    `${baseUrl}/api/mindmaps?q=explicit&limit=1`,
    {
      headers: authHeaders(),
    },
  );
  assert.equal(filteredResponse.status, 200);
  const filtered = await filteredResponse.json();
  assert.deepEqual(
    filtered.maps.map((map) => map.id),
    ['list-first'],
  );
});

test('mindmap API deletes saved maps', async () => {
  const saveResponse = await fetch(`${baseUrl}/api/mindmaps/delete-me`, {
    method: 'PUT',
    headers: authHeaders({ 'content-type': 'application/json' }),
    body: JSON.stringify({ markdown: '# Delete Me' }),
  });
  assert.equal(saveResponse.status, 200);

  const deleteResponse = await fetch(`${baseUrl}/api/mindmaps/delete-me`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  assert.equal(deleteResponse.status, 200);
  assert.deepEqual(await deleteResponse.json(), {
    deleted: true,
    id: 'delete-me',
  });

  const loadResponse = await fetch(`${baseUrl}/api/mindmaps/delete-me`, {
    headers: authHeaders(),
  });
  assert.equal(loadResponse.status, 404);

  const missingResponse = await fetch(`${baseUrl}/api/mindmaps/delete-me`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  assert.equal(missingResponse.status, 404);
});
