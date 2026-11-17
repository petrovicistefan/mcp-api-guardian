## Unreleased

## 0.1.3

- `serverInfo.version` now comes from `package.json` through `src/version.js` instead of a string literal.
- Added `scripts/check-rules.mjs` (`npm run check:rules`): fails on `package.json`/`server.json` version drift, hardcoded version literals, network use outside the hosted path, telemetry references, and logging of possibly sensitive data.
- Added `test/version.test.js` (package.json == server.json == runtime version, including the version reported over stdio).
- Added `npm run test:integration` (`test/mcp.integration.js`): official MCP SDK client runs `initialize`, `tools/list`, tool calls and asserts the server version. `@modelcontextprotocol/sdk` is a dev dependency only; the published server still has no runtime dependencies.
- Added `package-lock.json`.
- `npm test` now runs `test/*.test.js` so the integration script is not picked up as a unit test.
- `prepublishOnly` now runs `check`, `check:rules`, `test` and `test:integration`.
- Added `AGENTS.md` and `docs/PRODUCT.md`.

## 0.1.2 (2026-10-19)

- Documentation-only patch release: README rewritten to optimize for GitHub discoverability and conversions. Hook changed to "Stop your AI agent from breaking your API", emphasizing the concrete problem solved. Comparison table with oasdiff, openapi-changes, and optic (archived) added. YAML limitation explicitly documented. Use cases, badges, table of contents, and sibling repo links added. No code changes.

## 0.1.1 (2026-10-08)

- Re-release with the version reported by the server aligned to the package version. No functional changes compared to 0.1.0.

## 0.1.0 (2026-10-08)

- First public release (MVP): published on npm, the official MCP Registry and the petrovicistefan MCP marketplace.
