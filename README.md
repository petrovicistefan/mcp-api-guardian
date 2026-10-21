# MCP API Guardian

**Stop your AI agent from breaking your API: OpenAPI contract checks and breaking-change diffs over MCP, fully local.**

[![npm version](https://img.shields.io/npm/v/mcp-api-guardian.svg)](https://www.npmjs.com/package/mcp-api-guardian)
[![npm downloads](https://img.shields.io/npm/dm/mcp-api-guardian.svg)](https://www.npmjs.com/package/mcp-api-guardian)
[![Glama](https://glama.ai/mcp/servers/petrovicistefan/mcp-api-guardian/badges/score.svg)](https://glama.ai/mcp/servers/petrovicistefan/mcp-api-guardian)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Local-first guardrails for AI coding agents working with OpenAPI specs: **catch contract errors** (missing operation IDs, unresolved references, public auth), **detect breaking changes** (removed operations, new required parameters, changed authentication), and **keep API consumers working** before you ship.

Zero configuration. No API keys. No network. Runs entirely on your machine via the [Model Context Protocol](https://modelcontextprotocol.io).

---

## Table of Contents

- [Quick Install](#quick-install)
- [Why API Guardian](#why-api-guardian)
- [Tools](#tools)
- [Use Cases](#use-cases)
- [Comparison with Alternatives](#comparison-with-alternatives)
- [Limitations](#limitations)
- [Run from Source](#run-from-source)
- [Roadmap](#roadmap)
- [Hosted Path (Control Plane)](#hosted-path-control-plane)
- [Contributing](#contributing)
- [License](#license)
- [More MCP Servers by the Author](#more-mcp-servers-by-the-author)

---

## Quick Install

### One-Click Install

**Cursor:**

[![Add to Cursor](https://cursor.com/deeplink/mcp-install-dark.svg)](https://cursor.com/en/install-mcp?name=api-guardian&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyIteSIsIm1jcC1hcGktZ3VhcmRpYW4iXX0=)

Or use the direct protocol link: `cursor://anysphere.cursor-deeplink/mcp/install?name=api-guardian&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyIteSIsIm1jcC1hcGktZ3VhcmRpYW4iXX0=`

**Claude Code:**

```bash
claude mcp add api-guardian -- npx -y mcp-api-guardian
```

Or if installed in the [petrovicistefan/mcp-marketplace](https://github.com/petrovicistefan/mcp-marketplace):

```bash
/plugin marketplace add petrovicistefan/mcp-marketplace
```

### Manual Install

**Claude Desktop:**

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "api-guardian": {
      "command": "npx",
      "args": ["-y", "mcp-api-guardian"]
    }
  }
}
```

**Cursor:**

Add to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "api-guardian": {
      "command": "npx",
      "args": ["-y", "mcp-api-guardian"]
    }
  }
}
```

**VS Code / GitHub Copilot:**

Create or edit `.vscode/mcp.json`:

```json
{
  "servers": {
    "api-guardian": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "mcp-api-guardian"]
    }
  }
}
```

**Windsurf:**

Add to `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "api-guardian": {
      "command": "npx",
      "args": ["-y", "mcp-api-guardian"]
    }
  }
}
```

**Zed:**

Add to your Zed `settings.json`:

```json
{
  "context_servers": {
    "api-guardian": {
      "command": "npx",
      "args": ["-y", "mcp-api-guardian"]
    }
  }
}
```

**Direct npx (one-line test):**

```bash
npx -y mcp-api-guardian
```

---

## ⭐ Star This Repo If It Helps

**Found this MCP useful? [Star this repository](https://github.com/petrovicistefan/mcp-api-guardian)!**

A GitHub star helps other developers discover the project and lets you save it for later. Thanks for supporting open source!

---

## Why API Guardian

AI coding agents increasingly **modify OpenAPI specs** as they work on API features, documentation, and integrations. A single agent iteration can:

- Remove an operation a client depends on
- Add a required request parameter without a default
- Change an `operationId` that generated SDKs rely on
- Accidentally publish a public endpoint with no authentication
- Break external references or introduce duplicate IDs

**API Guardian catches these before they break production.** It provides two MCP tools your AI agent can call:

1. **`audit_openapi`** — lints a single OpenAPI spec for contract errors, missing metadata, auth risks
2. **`compare_openapi`** — diffs two spec versions and detects breaking changes

Fully local, read-only, zero dependencies. No telemetry, no API keys, no network calls.

---

## Tools

API Guardian provides **2 MCP tools** for validating OpenAPI 3.0.x and 3.1.x documents:

| Tool | Description | Inputs |
|------|-------------|--------|
| **`audit_openapi`** | Static OpenAPI 3.0/3.1 lint and authentication declaration review. Does not call endpoints. | `spec` (object): OpenAPI document as JSON |
| **`compare_openapi`** | Find selected breaking changes between two OpenAPI documents; not exhaustive schema compatibility. | `before` (object): Original OpenAPI document<br>`after` (object): Updated OpenAPI document |

### `audit_openapi({spec})`

Static contract checks on a single OpenAPI spec:

- **Contract errors**: Unresolved `$ref` references, missing `info.title`/`info.version`, invalid paths
- **Operation metadata**: Missing or duplicate `operationId`, missing response definitions
- **Path parameters**: All `{param}` placeholders must be declared as required path parameters
- **Security warnings**: Public operations (no auth required), basic auth over HTTP, API keys in query strings
- **External references**: Flags unchecked external `$ref` URLs (not fetched)

Reports errors and warnings with severity, location, and actionable messages. Explicitly states coverage limits.

### `compare_openapi({before, after})`

Breaking-change detection between two OpenAPI spec versions:

- **Removed operations**: Previously available endpoints deleted
- **Changed operation IDs**: Generated clients and agents may depend on stable IDs
- **New required parameters**: Added inline required parameters (clients can't provide them)
- **Request body requirement**: Optional body became required
- **Removed response codes**: Status codes clients may handle are gone
- **Security changes**: Authentication requirements modified (warning-level)

Reports definite breaks (`error`) and potential compatibility issues (`warning`). Schema variance and composed schemas are **not yet analyzed** (see [Limitations](#limitations)).

---

## Use Cases

### For Individual Developers

**Prompt:** "Audit the OpenAPI spec at `api/openapi.json` before I commit"

Your AI agent calls `audit_openapi`, catches a missing operation ID, and suggests a fix — **before the PR**.

---

### For CI / PR Checks

**Prompt:** "Compare the OpenAPI spec on this branch to `main` and fail if there are breaking changes"

Your agent runs `compare_openapi`, detects a removed endpoint, and blocks the merge with an actionable report.

---

### For Teams and Enterprises

**Prompt:** "Check all OpenAPI specs in `api/` for public endpoints without authentication"

Your agent audits each spec, flags public operations, and generates a security review checklist.

---

## Comparison with Alternatives

| Feature | **MCP API Guardian** | [oasdiff](https://github.com/oasdiff/oasdiff) | [pb33f/openapi-changes](https://github.com/pb33f/openapi-changes) | [optic](https://github.com/opticdev/optic) (archived) |
|---------|---------------------|----------------|---------------------|----------------------|
| **MCP integration** | ✅ Native MCP server | ❌ CLI only | ❌ CLI only | ❌ CLI only |
| **AI agent friendly** | ✅ JSON-RPC stdio, designed for agents | ⚠️ CLI output parsing | ⚠️ CLI output parsing | ⚠️ Archived |
| **Fully local (no network)** | ✅ Zero network calls | ✅ Offline | ✅ Offline | ⚠️ Cloud offering existed |
| **Breaking-change detection** | ✅ Core feature | ✅ Comprehensive (773 checks) | ✅ Comprehensive | ✅ (legacy) |
| **Static contract linting** | ✅ Core feature | ⚠️ Validation only | ⚠️ Change-focused | ⚠️ Traffic-focused |
| **Git revision comparison** | ❌ Planned | ✅ Built-in | ✅ Built-in | ✅ (legacy) |
| **Schema compatibility** | ❌ Planned | ✅ Full | ✅ Full | ✅ (legacy) |
| **HTML/Markdown reports** | ❌ JSON only | ✅ Multiple formats | ✅ Multiple formats | ✅ (legacy) |
| **License** | MIT | Apache 2.0 | GPL-3.0 / Commercial | MIT (archived) |

**When to use API Guardian:**

- ✅ You want your AI agent (Claude, Cursor, etc.) to **natively check OpenAPI contracts** without CLI wrappers
- ✅ You need **local-first, zero-network** validation (no external dependencies)
- ✅ You want **targeted linting + breaking-change detection** in one MCP server

**When to use alternatives:**

- Use **oasdiff** if you need the most comprehensive breaking-change ruleset (773 checks) and CI-native workflows
- Use **pb33f/openapi-changes** if you need beautiful HTML/Markdown diff reports for human review
- Both **oasdiff** and **openapi-changes** support full schema compatibility checks and git-native comparison, which API Guardian will add in future releases

---

## Limitations

API Guardian is a **targeted linter**, not a complete OpenAPI validator. Current limitations:

- ❌ **YAML specs not supported**: Only JSON OpenAPI documents are accepted. Pass parsed JSON objects to the MCP tools. YAML support is on the roadmap (see below).
- ❌ **External `$ref` not fetched**: External HTTP/HTTPS references are flagged as warnings but not resolved or validated
- ❌ **Schema compatibility not checked**: Request vs response variance, `oneOf`/`anyOf`/`allOf` composed schemas, and property-level breaking changes require a later release
- ❌ **Referenced parameters not compared**: Only inline parameters are checked in `compare_openapi`
- ❌ **No live HTTP probes**: Does not test actual API behavior or validate runtime responses
- ❌ **No filesystem access**: You must pass the spec as a parsed JSON object (no file paths)

Public endpoints may be **intentional**; warnings are **not proof** of a vulnerability. Reports explicitly state coverage limits.

---

## Run from Source

```bash
git clone https://github.com/petrovicistefan/mcp-api-guardian.git
cd mcp-api-guardian
npm test
npm start
```

Add to an MCP client's configuration, replacing the absolute path:

```json
{
  "mcpServers": {
    "api-guardian": {
      "command": "node",
      "args": ["/absolute/path/mcp-api-guardian/src/server.js"]
    }
  }
}
```

**Requirements:** Node.js 22+

---

## Roadmap

Future releases will add:

1. **YAML support**: Parse and validate YAML OpenAPI specs (currently JSON only)
2. **Full schema compatibility**: Detect property-level breaking changes, composed schemas (`oneOf`/`anyOf`/`allOf`), request vs response variance
3. **Local reference resolution**: Fetch and validate external `$ref` references with configurable allowlists
4. **Git-native comparison**: Compare specs across branches/commits without manual file extraction
5. **Live response validation**: Opt-in HTTP probes with target allowlists, size limits, and secret redaction

---

## Hosted Path (Control Plane)

The local stdio MCP server above stays fully useful without an account or network. Quotas are enforced only by a separate hosted HTTP process that reserves units on `mcp-control-plane` before running the same analysis core.

```bash
# Terminal 1 — control plane (see its README for ADMIN_TOKEN)
node --env-file=.env src/server.js   # in mcp-control-plane

# Terminal 2 — hosted api-guardian
cp .env.example .env                 # set CONTROL_PLANE_URL
npm run start:hosted
```

Bootstrap a customer key with the control-plane admin API (`POST /v1/admin/accounts`, `POST /v1/admin/keys`). Then:

| Method | Path | Body |
|--------|------|------|
| GET | `/health` | Liveness |
| POST | `/v1/audit` | `{ "requestId": "scan-1", "units": 1, "spec": { … } }` |
| POST | `/v1/compare` | `{ "requestId": "diff-1", "before": { … }, "after": { … } }` |

Customer routes require `Authorization: Bearer mcp_…`. On success the response includes `report` and `usage`. Over quota returns `429` with `{ "error": "quota_exceeded" }` and does not run analysis. Default bind: `127.0.0.1:3100`. Production needs an HTTPS reverse proxy.

**Privacy:** OpenAPI documents are processed on the hosted host only. Control-plane requests carry solely `product` (`api-guardian`), `requestId`, and `units` — never specs, reports, or credentials. Successful consume has no refund in the control-plane MVP.

This hosted path is a reference integration for future commercial offerings, not a published multi-tenant deploy. README prices remain hypotheses until billing is live. A local MIT package cannot reliably enforce paid quotas; those belong to an authenticated hosted service.

---

## Contributing

Contributions are welcome! Please:

1. Open an issue to discuss the change before starting work
2. Follow the existing code style (ESM, `node:test`, zero dependencies)
3. Add tests for new features
4. Keep commits focused and descriptive

See [CONTRIBUTING.md](CONTRIBUTING.md) if it exists, or open an issue if you'd like to contribute.

---

## License

**MIT** — Free for personal and commercial use. See [LICENSE](LICENSE) for full terms.

---

## More MCP Servers by the Author

**Part of the [petrovicistefan MCP suite](https://github.com/petrovicistefan/mcp-marketplace)** — local-first guardrails for AI coding agents.

| Server | Description |
|--------|-------------|
| [mcp-security-guard](https://github.com/petrovicistefan/mcp-security-guard) | Audit MCP servers for tool poisoning, rug pulls, shadowing, and leaked secrets. OWASP MCP Top 10. |
| [mcp-dependency-doctor](https://github.com/petrovicistefan/mcp-dependency-doctor) | Detect dependency vulnerabilities, license risks, and supply-chain issues in your project. |
| [mcp-database-doctor](https://github.com/petrovicistefan/mcp-database-doctor) | SQL schema linting, migration safety checks, and query performance analysis. |
| [mcp-cost-optimizer](https://github.com/petrovicistefan/mcp-cost-optimizer) | Find cloud cost optimization opportunities in your infrastructure configs. |
| [mcp-seo-auditor](https://github.com/petrovicistefan/mcp-seo-auditor) | Technical SEO audits for web projects: meta tags, schema.org, Core Web Vitals, accessibility. |
| [mcp-dealfinder](https://github.com/petrovicistefan/mcp-dealfinder) | Price comparison and deal discovery for e-commerce and SaaS. |
| [mcp-marketplace](https://github.com/petrovicistefan/mcp-marketplace) | Directory of all available MCP servers and plugins. |

**All servers are MIT-licensed, fully local, and require no API keys.**

---

**⭐ If this project helps you, [star it on GitHub](https://github.com/petrovicistefan/mcp-api-guardian) to help others discover it!**
