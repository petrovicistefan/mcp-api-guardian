import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createHostedServer } from '../src/hosted.js';
import { consume } from '../src/control-plane-client.js';

const KEY = 'mcp_test_key';

const spec = () => ({
  openapi: '3.1.0',
  info: { title: 'Demo', version: '1' },
  security: [{ bearer: [] }],
  components: { securitySchemes: { bearer: { type: 'http', scheme: 'bearer' } } },
  paths: {
    '/users/{id}': {
      get: {
        operationId: 'getUser',
        parameters: [{ name: 'id', in: 'path', required: true }],
        responses: { 200: { description: 'OK' } },
      },
    },
  },
});

async function listen(server) {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return `http://127.0.0.1:${server.address().port}`;
}

/** Minimal control-plane stand-in so CI does not need a sibling checkout. */
function createFakeControlPlane({ limit = 2 } = {}) {
  const seen = new Map();
  let used = 0;
  const events = [];
  const server = http.createServer(async (req, res) => {
    const send = (status, body) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(body));
    };
    if (req.method !== 'POST' || new URL(req.url, 'http://x').pathname !== '/v1/usage/consume') {
      return send(404, { error: 'not_found' });
    }
    if ((req.headers.authorization ?? '') !== `Bearer ${KEY}`) return send(401, { error: 'unauthorized' });
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString());
    events.push(body);
    const prev = seen.get(body.requestId);
    if (prev !== undefined) {
      if (prev !== body.units) return send(409, { error: 'request_id_conflict' });
      return send(200, { allowed: true, duplicate: true, used, limit });
    }
    if (used + body.units > limit) return send(429, { allowed: false, used, limit, error: 'quota_exceeded' });
    used += body.units;
    seen.set(body.requestId, body.units);
    return send(200, { allowed: true, duplicate: false, used, limit });
  });
  return { server, events };
}

test('hosted audit consumes quota, retries, rejects over-quota and bad keys; specs never reach control plane', async t => {
  const { server: controlPlane, events } = createFakeControlPlane();
  const controlPlaneUrl = await listen(controlPlane);

  const consumeCalls = [];
  const consumeImpl = async opts => {
    const result = await consume(opts);
    consumeCalls.push(result.payload);
    return result;
  };

  const hosted = createHostedServer({ controlPlaneUrl, consumeImpl });
  const hostedUrl = await listen(hosted);
  t.after(async () => {
    await Promise.all([
      new Promise(resolve => controlPlane.close(resolve)),
      new Promise(resolve => hosted.close(resolve)),
    ]);
  });

  const hostedCall = async (path, token, body) => {
    const response = await fetch(`${hostedUrl}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() };
  };

  assert.equal((await fetch(`${hostedUrl}/health`)).status, 200);

  const auditBody = { requestId: 'scan-1', spec: spec() };
  const first = await hostedCall('/v1/audit', KEY, auditBody);
  assert.equal(first.status, 200);
  assert.equal(first.body.report.summary.errors, 0);
  assert.equal(first.body.usage.used, 1);
  assert.equal(first.body.usage.duplicate, false);

  const retry = await hostedCall('/v1/audit', KEY, auditBody);
  assert.equal(retry.status, 200);
  assert.equal(retry.body.usage.duplicate, true);
  assert.equal(retry.body.usage.used, 1);

  const second = await hostedCall('/v1/audit', KEY, { requestId: 'scan-2', spec: spec() });
  assert.equal(second.status, 200);
  assert.equal(second.body.usage.used, 2);

  const over = await hostedCall('/v1/audit', KEY, { requestId: 'scan-3', spec: spec() });
  assert.equal(over.status, 429);
  assert.equal(over.body.error, 'quota_exceeded');

  assert.equal((await hostedCall('/v1/audit', 'bad-key', auditBody)).status, 401);

  const compare = await hostedCall('/v1/compare', KEY, {
    requestId: 'scan-compare',
    before: spec(),
    after: { ...spec(), paths: {} },
  });
  assert.equal(compare.status, 429);

  for (const payload of consumeCalls) {
    assert.deepEqual(Object.keys(payload).sort(), ['product', 'requestId', 'units']);
    assert.equal(payload.product, 'api-guardian');
    assert.equal('spec' in payload, false);
  }
  for (const event of events) {
    assert.deepEqual(Object.keys(event).sort(), ['product', 'requestId', 'units']);
    assert.equal('spec' in event, false);
  }
});

test('control-plane client rejects non-http URLs', async () => {
  const result = await consume({
    baseUrl: 'ftp://evil',
    apiKey: 'mcp_x',
    requestId: 'r1',
  }).catch(error => error);
  assert.ok(result instanceof Error);
  assert.match(result.message, /CONTROL_PLANE_URL/);
});
