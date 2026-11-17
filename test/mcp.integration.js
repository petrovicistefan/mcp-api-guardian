import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const spec = { openapi: '3.1.0', info: { title: 'Demo', version: '1' }, paths: { '/ping': { get: { operationId: 'ping', responses: { 200: { description: 'ok' } } } } } };
const client = new Client({ name: 'api-guardian-smoke', version: '1.0.0' });
try {
  await client.connect(new StdioClientTransport({ command: process.execPath, args: ['src/server.js'] }));
  assert.equal(client.getServerVersion()?.name, 'mcp-api-guardian');
  assert.equal(client.getServerVersion()?.version, pkg.version);
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map(t => t.name).sort(), ['audit_openapi', 'compare_openapi']);
  const audit = await client.callTool({ name: 'audit_openapi', arguments: { spec } });
  assert.notEqual(audit.isError, true);
  assert.ok(JSON.parse(audit.content[0].text));
  const removed = await client.callTool({ name: 'compare_openapi', arguments: { before: spec, after: { ...spec, paths: {} } } });
  assert.notEqual(removed.isError, true);
  assert.match(removed.content[0].text, /operation|removed/i);
  const invalid = await client.callTool({ name: 'audit_openapi', arguments: {} });
  assert.equal(invalid.isError, true);
  console.log('MCP stdio integration passed');
} finally { await client.close(); }
