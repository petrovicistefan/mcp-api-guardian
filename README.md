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

## Roadmap and commercial model

1. Add full schema compatibility tests and local reference resolution.
2. Add explicit opt-in live response validation, target allowlists, limits and secret redaction.
3. Validate demand with API teams using real release diffs.
4. Offer managed history, CI integration, shared policies and team reporting as Pro.

The prior Free allowance of 20 checks/month and Pro price of EUR 12/month are hypotheses, not implemented limits. A local MIT package cannot reliably enforce paid quotas; those belong to an authenticated hosted service. Keep the useful local tool free.
