# MCP API Guardian

Local OpenAPI contract checks for AI coding agents. MVP 0.1.0, no runtime dependencies, Node.js 22+.

Transport: newline-delimited JSON-RPC over stdio, with the initialize-based MCP protocol family through 2025-11-25. The newer 2026-07-28 stateless protocol is not implemented. Test with your target client before deployment. Protocol reference: https://modelcontextprotocol.io/specification/2025-11-25/basic/transports

## Run from source

```sh
npm test
npm start
```

Add to an MCP client's configuration, replacing the absolute path:

```json
{"mcpServers":{"api-guardian":{"command":"node","args":["/absolute/path/mcp-api-guardian/src/server.js"]}}}
```

## Tools

* `audit_openapi({spec})`: checks selected contract errors, references, operation IDs, required path parameters, public operations and risky authentication declarations.
* `compare_openapi({before, after})`: detects removed operations, changed operation IDs, added inline required parameters, newly required request bodies, removed response codes and changed authentication requirements.

Pass parsed JSON OpenAPI 3.0.x or 3.1.x documents as objects. YAML parsing, filesystem access, external reference fetching and live HTTP probes are not implemented. No credentials or source documents leave the process.

This is a targeted linter, not a complete OpenAPI validator. Schema compatibility (including request versus response variance), composed schemas and referenced parameter comparisons require a later release. Public endpoints may be intentional; warnings are not proof of a vulnerability. Reports explicitly state coverage.

## Packaging

```sh
npm run check
npm test
npm pack
```

The package has not been published to npm. After publication, clients can use `npx -y mcp-api-guardian`. Availability of the npm name has not been confirmed.

## Hosted path (quotas via control plane)

The local stdio MCP server above stays fully useful without an account or network. Quotas are enforced only by a separate hosted HTTP process that reserves units on [mcp-control-plane](../mcp-control-plane) before running the same analysis core.

```sh
# Terminal 1 — control plane (see its README for ADMIN_TOKEN)
node --env-file=.env src/server.js   # in mcp-control-plane

# Terminal 2 — hosted api-guardian
cp .env.example .env                 # set CONTROL_PLANE_URL
npm run start:hosted
```

Bootstrap a customer key with the control-plane admin API (`POST /v1/admin/accounts`, `POST /v1/admin/keys`). Then:

| Method | Path | Body |
| --- | --- | --- |
| GET | `/health` | Liveness |
| POST | `/v1/audit` | `{ "requestId": "scan-1", "units": 1, "spec": { … } }` |
| POST | `/v1/compare` | `{ "requestId": "diff-1", "before": { … }, "after": { … } }` |

Customer routes require `Authorization: Bearer mcp_…`. On success the response includes `report` and `usage`. Over quota returns `429` with `{ "error": "quota_exceeded" }` and does not run analysis. Default bind: `127.0.0.1:3100`. Production needs an HTTPS reverse proxy.

**Privacy:** OpenAPI documents are processed on the hosted host only. Control-plane requests carry solely `product` (`api-guardian`), `requestId`, and `units` — never specs, reports, or credentials. Successful consume has no refund in the control-plane MVP.

This hosted path is a reference integration, not a published multi-tenant deploy. README prices remain hypotheses until billing is live.

## Roadmap and commercial model

1. Add full schema compatibility tests and local reference resolution.
2. Add explicit opt-in live response validation, target allowlists, limits and secret redaction.
3. Validate demand with API teams using real release diffs.
4. Offer managed history, CI integration, shared policies and team reporting as Pro (hosted path above is the quota hook).

The prior Free allowance of 20 checks/month and Pro price of EUR 12/month are hypotheses, not implemented limits. A local MIT package cannot reliably enforce paid quotas; those belong to an authenticated hosted service. Keep the useful local tool free.
