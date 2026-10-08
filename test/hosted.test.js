import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createHostedServer } from '../src/hosted.js';
import { consume } from '../src/control-plane-client.js';

const controlPlaneRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'mcp-control-plane');
const { Store } = await import(join(controlPlaneRoot, 'src', 'store.js'));
const { createServer } = await import(join(controlPlaneRoot, 'src', 'server.js'));

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

test('hosted audit consumes quota, retries, rejects over-quota and bad keys; specs never reach control plane', async t => {
  const store = new Store();
  const admin = 'a'.repeat(32);
  const controlPlane = createServer({ store, adminToken: admin, limits: { free: 2, paid: 10 } });
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
    store.close();
  });

  const adminCall = async (path, body, method = 'POST') => {
    const response = await fetch(`${controlPlaneUrl}${path}`, {
      method,
      headers: { Authorization: `Bearer ${admin}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() };
  };
  const hostedCall = async (path, token, body) => {
    const response = await fetch(`${hostedUrl}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() };
  };

  assert.equal((await fetch(`${hostedUrl}/health`)).status, 200);
  assert.equal((await adminCall('/v1/admin/accounts', { accountId: 'team-1' })).status, 201);
  const { key } = (await adminCall('/v1/admin/keys', { accountId: 'team-1' })).body;

  const auditBody = { requestId: 'scan-1', spec: spec() };
  const first = await hostedCall('/v1/audit', key, auditBody);
  assert.equal(first.status, 200);
  assert.equal(first.body.report.summary.errors, 0);
  assert.equal(first.body.usage.used, 1);
  assert.equal(first.body.usage.duplicate, false);

  const retry = await hostedCall('/v1/audit', key, auditBody);
  assert.equal(retry.status, 200);
  assert.equal(retry.body.usage.duplicate, true);
  assert.equal(retry.body.usage.used, 1);

  const second = await hostedCall('/v1/audit', key, { requestId: 'scan-2', spec: spec() });
  assert.equal(second.status, 200);
  assert.equal(second.body.usage.used, 2);

  const over = await hostedCall('/v1/audit', key, { requestId: 'scan-3', spec: spec() });
  assert.equal(over.status, 429);
  assert.equal(over.body.error, 'quota_exceeded');

  assert.equal((await hostedCall('/v1/audit', 'bad-key', auditBody)).status, 401);

  const compare = await hostedCall('/v1/compare', key, {
    requestId: 'scan-compare',
    before: spec(),
    after: { ...spec(), paths: {} },
  });
  // free limit 2 already exhausted — compare must not run analysis
  assert.equal(compare.status, 429);

  for (const payload of consumeCalls) {
    assert.deepEqual(Object.keys(payload).sort(), ['product', 'requestId', 'units']);
    assert.equal(payload.product, 'api-guardian');
    assert.equal('spec' in payload, false);
    assert.equal('before' in payload, false);
    assert.equal('after' in payload, false);
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
