# MCP API Guardian: product facts

Sources: `README.md`, `package.json`, `server.json`, `src/`. Update this file when those change.

## What it is

A local MCP server that lints OpenAPI 3.0/3.1 documents and detects selected breaking changes between two versions, so AI coding agents can check their own spec edits. Package `mcp-api-guardian`, MCP name `io.github.petrovicistefan/mcp-api-guardian`, stdio transport, MIT licensed.

## What it is NOT

- Not a complete OpenAPI validator: it is a targeted linter.
- Not an exhaustive compatibility checker: schema variance, `oneOf`/`anyOf`/`allOf` and property-level breaking changes are not analyzed.
- Not an HTTP prober: it does not call endpoints or validate runtime behavior.
- Not a file reader: specs are passed as parsed JSON objects, with no file paths and no YAML support.
- Not a vulnerability verdict: public operations may be intentional, and warnings are not proof of a problem.

## Users

AI coding agents and developers (Cursor, Claude Code, Claude Desktop, VS Code and other stdio MCP clients) who change OpenAPI specs and want to catch contract errors and breaking changes before they ship. The README also lists CI/PR checks and teams as use cases.

## Tools

| Tool | Input | What it does |
|------|-------|--------------|
| `audit_openapi` | `spec` (object) | Static lint: unresolved `$ref`, missing `info.title`/`info.version`, missing or duplicate `operationId`, missing responses, undeclared path parameters, public operations, basic auth over HTTP, API keys in query strings, unchecked external `$ref` URLs (flagged, not fetched) |
| `compare_openapi` | `before`, `after` (objects) | Selected breaking changes: removed operations, changed `operationId`, new required inline parameters, optional body becoming required, removed response codes, security requirement changes (warning level) |

Reports carry severity (`error` or `warning`), location and an explicit statement of coverage limits.

## Runtime modes

- **Local stdio MCP server** (`src/server.js`, the `mcp-api-guardian` bin): a dependency-free stdio implementation of the MCP protocol (revisions up to 2025-11-25). No telemetry, no API keys, no network calls.
- **Hosted HTTP path** (`npm run start:hosted`, `src/hosted.js`, default `127.0.0.1:3100`): opt-in reference integration. `GET /health`, `POST /v1/audit`, `POST /v1/compare`, with `Authorization: Bearer mcp_...`. It reserves quota against a control plane (`CONTROL_PLANE_URL`); only product, request id and units are sent, never specs or reports. Over quota returns `429 quota_exceeded`.

## Pricing

The local server is free and MIT licensed. The README states the hosted path is a reference integration for future commercial offerings, not a published multi-tenant deployment, and that prices remain hypotheses until billing is live.

## Known limitations

- JSON only; no YAML.
- External `$ref` URLs are flagged but not resolved.
- Referenced (`$ref`) parameters are not compared; only inline parameters are.
- No schema compatibility analysis.

## Requirements

Node.js >= 22. No runtime dependencies. `@modelcontextprotocol/sdk` is a dev dependency used only by `npm run test:integration`.
