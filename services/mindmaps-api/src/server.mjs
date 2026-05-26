import { createServer } from 'node:http';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import path from 'node:path';

const MAX_MARKDOWN_BYTES = 1024 * 1024;
const MAP_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const DEFAULT_SESSION_RATE_LIMIT_MAX = 5;
const DEFAULT_SESSION_RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const DEFAULT_SESSION_TTL_MS = 8 * 60 * 60 * 1000;

function json(response, statusCode, body, headers = {}) {
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    ...headers,
  });
  response.end(JSON.stringify(body));
}

function getBearerToken(request) {
  const header = request.headers.authorization || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || '';
}

function constantTimeEqual(left, right) {
  if (!left || !right) return false;
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function requireAuth(request, response, isValidToken) {
  if (isValidToken(getBearerToken(request))) return true;
  json(
    response,
    401,
    { error: 'Unauthorized' },
    {
      'www-authenticate': 'Bearer',
    },
  );
  return false;
}

function createSessionToken() {
  return randomBytes(32).toString('base64url');
}

function getClientIp(request) {
  const forwardedFor = request.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }
  return request.socket.remoteAddress || 'unknown';
}

function parseMapId(url) {
  const prefix = '/api/mindmaps/';
  if (!url.pathname.startsWith(prefix)) return;
  const id = decodeURIComponent(url.pathname.slice(prefix.length));
  if (!MAP_ID_PATTERN.test(id)) return '';
  return id;
}

async function readJsonBody(request) {
  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (Buffer.byteLength(body) > MAX_MARKDOWN_BYTES + 1024) {
      throw new Error('Request body is too large');
    }
  }
  return body ? JSON.parse(body) : {};
}

async function loadStore(dataFile) {
  try {
    const content = await readFile(dataFile, 'utf8');
    const store = JSON.parse(content);
    if (store && typeof store === 'object' && store.maps) return store;
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  return { maps: {} };
}

async function saveStore(dataFile, store) {
  await mkdir(path.dirname(dataFile), { recursive: true });
  const tempFile = `${dataFile}.${process.pid}.tmp`;
  await writeFile(tempFile, JSON.stringify(store, null, 2), 'utf8');
  await rename(tempFile, dataFile);
}

function validateMarkdownBody(body) {
  if (!body || typeof body.markdown !== 'string') {
    throw new Error('Request body must include markdown.');
  }
  if (Buffer.byteLength(body.markdown) > MAX_MARKDOWN_BYTES) {
    throw new Error('Markdown is too large.');
  }
}

function getMarkdownTitle(markdown, fallback) {
  if (typeof markdown !== 'string') return fallback;
  const heading = markdown
    .split(/\r?\n/)
    .map((line) => line.match(/^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/)?.[1])
    .find(Boolean);
  return heading?.trim() || fallback;
}

function listMapSummaries(store) {
  return Object.values(store.maps)
    .map(({ id, markdown, version, createdAt, updatedAt }) => ({
      id,
      title: getMarkdownTitle(markdown, id),
      version,
      createdAt,
      updatedAt,
    }))
    .sort((left, right) =>
      String(right.updatedAt || '').localeCompare(String(left.updatedAt || '')),
    );
}

export function createMindmapsApiServer({
  adminToken,
  dataFile,
  now = Date.now,
  sessionRateLimitMax = DEFAULT_SESSION_RATE_LIMIT_MAX,
  sessionRateLimitWindowMs = DEFAULT_SESSION_RATE_LIMIT_WINDOW_MS,
  sessionTtlMs = DEFAULT_SESSION_TTL_MS,
  token,
}) {
  if (!dataFile) throw new Error('dataFile is required');
  if (!token) throw new Error('token is required');
  const sessionAdminToken = adminToken || token;
  const sessionFailures = new Map();
  const sessions = new Map();

  function getNowMs() {
    return Number(now());
  }

  function isValidSessionToken(value) {
    const expiresAt = sessions.get(value);
    if (!expiresAt) return false;
    if (expiresAt <= getNowMs()) {
      sessions.delete(value);
      return false;
    }
    return true;
  }

  function isValidApiToken(value) {
    return constantTimeEqual(value, token) || isValidSessionToken(value);
  }

  function getSessionRateLimit(request) {
    const key = getClientIp(request);
    const nowMs = getNowMs();
    const current = sessionFailures.get(key);
    if (!current || current.resetAt <= nowMs) {
      return { allowed: true, key, remainingMs: 0 };
    }
    return {
      allowed: current.count < Number(sessionRateLimitMax),
      key,
      remainingMs: current.resetAt - nowMs,
    };
  }

  function recordSessionFailure(key) {
    const nowMs = getNowMs();
    const current = sessionFailures.get(key);
    if (!current || current.resetAt <= nowMs) {
      sessionFailures.set(key, {
        count: 1,
        resetAt: nowMs + Number(sessionRateLimitWindowMs),
      });
      return;
    }
    current.count += 1;
  }

  function clearSessionFailures(key) {
    sessionFailures.delete(key);
  }

  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url || '/', 'http://127.0.0.1');
      if (request.method === 'GET' && url.pathname === '/healthz') {
        json(response, 200, { ok: true });
        return;
      }

      if (url.pathname === '/api/session') {
        if (request.method !== 'POST') {
          json(
            response,
            405,
            { error: 'Method not allowed' },
            { allow: 'POST' },
          );
          return;
        }
        const rateLimit = getSessionRateLimit(request);
        if (!rateLimit.allowed) {
          json(
            response,
            429,
            { error: 'Too many session attempts' },
            {
              'retry-after': String(
                Math.max(1, Math.ceil(rateLimit.remainingMs / 1000)),
              ),
            },
          );
          return;
        }
        const body = await readJsonBody(request);
        if (!constantTimeEqual(body.adminToken, sessionAdminToken)) {
          recordSessionFailure(rateLimit.key);
          json(
            response,
            401,
            { error: 'Unauthorized' },
            {
              'www-authenticate': 'Bearer',
            },
          );
          return;
        }
        clearSessionFailures(rateLimit.key);
        const sessionToken = createSessionToken();
        const expiresAtMs = getNowMs() + Number(sessionTtlMs);
        sessions.set(sessionToken, expiresAtMs);
        json(response, 200, {
          token: sessionToken,
          expiresAt: new Date(expiresAtMs).toISOString(),
        });
        return;
      }

      if (url.pathname === '/api/mindmaps') {
        if (request.method !== 'GET') {
          json(
            response,
            405,
            { error: 'Method not allowed' },
            { allow: 'GET' },
          );
          return;
        }
        if (!requireAuth(request, response, isValidApiToken)) return;
        const store = await loadStore(dataFile);
        json(response, 200, { maps: listMapSummaries(store) });
        return;
      }

      const id = parseMapId(url);
      if (id == null) {
        json(response, 404, { error: 'Not found' });
        return;
      }
      if (!id) {
        json(response, 400, { error: 'Invalid map id' });
        return;
      }
      if (!requireAuth(request, response, isValidApiToken)) return;

      const store = await loadStore(dataFile);
      const existing = store.maps[id];

      if (request.method === 'GET') {
        if (!existing) {
          json(response, 404, { error: 'Not found' });
          return;
        }
        json(response, 200, existing);
        return;
      }

      if (request.method === 'PUT') {
        const body = await readJsonBody(request);
        validateMarkdownBody(body);
        if (
          existing &&
          body.version != null &&
          Number(body.version) !== existing.version
        ) {
          json(response, 409, {
            error: 'Version conflict',
            version: existing.version,
          });
          return;
        }

        const now = new Date().toISOString();
        const next = {
          id,
          markdown: body.markdown,
          version: existing ? existing.version + 1 : 1,
          createdAt: existing?.createdAt || now,
          updatedAt: now,
        };
        store.maps[id] = next;
        await saveStore(dataFile, store);
        json(response, 200, next);
        return;
      }

      if (request.method === 'DELETE') {
        if (!existing) {
          json(response, 404, { error: 'Not found' });
          return;
        }
        delete store.maps[id];
        await saveStore(dataFile, store);
        json(response, 200, { deleted: true, id });
        return;
      }

      json(
        response,
        405,
        { error: 'Method not allowed' },
        {
          allow: 'GET, PUT, DELETE',
        },
      );
    } catch (error) {
      json(response, 400, { error: error.message || 'Bad request' });
    }
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT || 4178);
  const dataFile =
    process.env.MINDMAPS_DATA_FILE || '/var/lib/capa-mindmaps/maps.json';
  const token = process.env.MINDMAPS_API_TOKEN;
  const adminToken = process.env.MINDMAPS_ADMIN_TOKEN;
  const sessionTtlMs = Number(
    process.env.MINDMAPS_SESSION_TTL_MS || DEFAULT_SESSION_TTL_MS,
  );
  const sessionRateLimitMax = Number(
    process.env.MINDMAPS_SESSION_RATE_LIMIT_MAX ||
      DEFAULT_SESSION_RATE_LIMIT_MAX,
  );
  const sessionRateLimitWindowMs = Number(
    process.env.MINDMAPS_SESSION_RATE_LIMIT_WINDOW_MS ||
      DEFAULT_SESSION_RATE_LIMIT_WINDOW_MS,
  );
  const server = createMindmapsApiServer({
    adminToken,
    dataFile,
    sessionRateLimitMax,
    sessionRateLimitWindowMs,
    sessionTtlMs,
    token,
  });
  server.listen(port, '127.0.0.1', () => {
    console.log(`mindmaps-api listening on 127.0.0.1:${port}`);
  });
}
