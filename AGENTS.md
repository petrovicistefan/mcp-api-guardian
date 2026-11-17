# AGENTS.md

Hard rules for anyone (human or AI agent) changing this repo. Each rule is enforced by `npm run check:rules` (`scripts/check-rules.mjs`), which is part of `prepublishOnly`. Do not weaken a check to make a change pass.

## Rules

1. **Version sync.** `package.json` `version` must equal `server.json` `version` and every `server.json` `packages[].version`. Bump all of them together.
2. **One version source.** `serverInfo.version` comes from `package.json` through `src/version.js` (`VERSION`). Never write the version as a string literal in `src`.
3. **Local-first.** The stdio MCP server runs fully offline and never calls the endpoints it analyzes. Only the opt-in hosted path (`src/hosted.js`, `src/control-plane-client.js`) may use the network. No other file may use `fetch`, `http`/`https`, `net`, WebSocket or similar.
4. **No telemetry.** No analytics, tracking or crash-reporting dependencies or endpoints, and nothing is sent anywhere by default.
5. **No secrets or user data in logs.** OpenAPI documents, reports, request bodies, headers and API keys must never be logged. `src/server.js` writes only protocol messages to stdout and must not use `console.*`. `console.log` elsewhere may only print a constant string.
6. **Docs stay in step.** `AGENTS.md`, `docs/PRODUCT.md` and `CHANGELOG.md` must exist, and `CHANGELOG.md` needs an `Unreleased` or current-version heading.
7. **Release scripts exist.** `package.json` keeps `check`, `check:rules`, `test`, `test:integration` and a `prepublishOnly` that runs them.

## Commands

```bash
npm install               # only needed for test:integration (MCP SDK dev dependency)
npm run check             # node --check on the sources
npm run check:rules       # the AGENTS.md rules above
npm test                  # unit tests (includes the version test)
npm run test:integration  # stdio initialize + tools/list + version + tool calls via the MCP SDK client
```

## Do not

- Publish to npm or the MCP Registry from a working branch; releases go through a `v*.*.*` tag and `.github/workflows/release.yml`.
- Add runtime dependencies without a strong reason; the server currently has none.
