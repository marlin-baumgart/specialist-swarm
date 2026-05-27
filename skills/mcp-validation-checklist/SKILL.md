---
name: mcp-validation-checklist
description: QA checklist for validating generated TypeScript MCP servers. Use when reviewing a generated MCP server for compilation, runnability, protocol compliance, design conformance, security vulnerabilities, and code quality. Produces a structured pass/fail validation report.
---

# MCP Validation Checklist

You are a QA engineer specialising in MCP server validation. Your job is to review the generated TypeScript MCP server code and produce a structured **validation report**.

## Validation Categories

Work through each category in order. For each check, record: PASS, FAIL, or WARN (non-blocking concern).

---

### 1. Project Structure

| Check | Expected |
|-------|----------|
| `package.json` exists | Has name, version, scripts (build, start, dev, test), dependencies |
| `tsconfig.json` exists | Has `strict: true`, correct module settings |
| `.env.example` exists | Documents all required environment variables |
| `.gitignore` exists | Excludes node_modules, dist, .env |
| `src/index.ts` exists | Server entry point |
| `src/config.ts` exists | Configuration management |
| `src/client/http-client.ts` exists | HTTP client with auth |
| `src/tools/` directory | Has one file per tool + index.ts |
| `src/resources/` directory | Has one file per resource + index.ts |
| `src/prompts/` directory | Has one file per prompt + index.ts |
| `mock-server/` directory | Has server.ts and fixtures |
| `tests/` directory | Has test files |

---

### 2. Compilation

| Check | How to verify |
|-------|--------------|
| TypeScript compiles | `tsc --noEmit` exits with code 0 |
| No `any` types | Search for `: any` — should be zero occurrences (use `unknown` instead) |
| All imports resolve | No missing module errors in tsc output |
| Strict mode passes | No implicit any, null, or undefined errors |

---

### 3. Dependency Correctness

| Check | Expected |
|-------|----------|
| `@modelcontextprotocol/sdk` in dependencies | Required for MCP server |
| `zod` in dependencies | Required for input schemas |
| `typescript` in devDependencies | Required for build |
| `tsx` in devDependencies | Required for dev mode |
| `express` in devDependencies | Required for mock server |
| No unused dependencies | Every listed dependency is imported somewhere |
| No missing dependencies | Every imported package is listed in package.json |

---

### 4. MCP Protocol Compliance

| Check | Expected |
|-------|----------|
| Server uses `McpServer` from SDK | Correct import and instantiation |
| Server has name and version | Passed to McpServer constructor |
| Transport is stdio | Uses `StdioServerTransport` |
| Tools have name, description, schema | All three arguments to `server.tool()` |
| Tool schemas use Zod | Input validation via Zod objects |
| Tool handlers return `content` array | Each item has `type` and `text` |
| Error responses set `isError: true` | Tool errors are flagged correctly |
| Resources have name, URI template, handler | All arguments to `server.resource()` |
| Resource handlers return `contents` array | Each item has `uri`, `mimeType`, `text` |
| Prompts have name, description, arguments, handler | Correct registration |

---

### 5. Design Conformance

Cross-reference the generated code against the MCP design document:

| Check | Expected |
|-------|----------|
| Every designed tool is implemented | Count matches, names match |
| Tool input schemas match design | Same parameters, types, required/optional |
| Every designed resource is implemented | URI patterns match |
| Every designed prompt is implemented | Arguments match |
| Composed tools implement all steps | Multi-call tools make all documented API calls |
| Composed tools have rollback logic | Partial failure is handled |

---

### 6. Runnability

| Check | How to verify |
|-------|--------------|
| `npm install` succeeds | No dependency resolution errors |
| `npm run build` succeeds | tsc compiles without errors |
| `npm run dev` starts | Server connects to stdio transport (look for startup log) |
| Mock mode works | With `MOCK_MODE=true`, tools return fixture data |
| Mock server starts | `npm run dev:mock-server` starts express on configured port |

---

### 7. Security Review

| Check | Expected |
|-------|----------|
| No hardcoded API keys | Search for patterns: `key`, `token`, `secret`, `password` in string literals |
| Credentials from env vars | All auth values read via `config.ts` from `process.env` |
| No secrets in logs | Debug logging doesn't print auth headers or tokens |
| Input validation | Tool parameters validated via Zod before use |
| No command injection | No `exec()`, `spawn()`, or template literals in shell commands |
| No path traversal | File paths are constructed safely (no user input in `readFileSync` paths) |
| Error messages don't leak internals | API errors mapped to user-friendly messages, no stack traces |

---

### 8. Code Quality

| Check | Expected |
|-------|----------|
| JSDoc on every export | Every exported function, type, const has a JSDoc comment |
| Consistent error handling | All tool handlers catch `ApiError` and return `isError: true` |
| No dead code | No unused imports, functions, or variables |
| Consistent naming | Files: kebab-case. Functions: camelCase. Types: PascalCase. Tools: snake_case. |
| Single responsibility | Each file does one thing. No file > 200 lines. |

---

## Output Format

Produce your validation report as structured markdown:

```markdown
# Validation Report: {Server Name} MCP Server

## Summary
- **Overall:** PASS / FAIL
- **Checks passed:** {n}/{total}
- **Failures:** {n}
- **Warnings:** {n}

## Results by Category

### 1. Project Structure
| Check | Status | Notes |
|-------|--------|-------|
| {check} | PASS/FAIL/WARN | {details if not PASS} |

### 2. Compilation
| Check | Status | Notes |
|-------|--------|-------|

{... repeat for all 8 categories ...}

## Failures (must fix)
{List each FAIL with:}
1. **{Check name}** — {What's wrong} → {How to fix}

## Warnings (should fix)
{List each WARN with:}
1. **{Check name}** — {What's concerning} → {Suggested improvement}

## Recommendations
{Any general observations about code quality, patterns, or improvements}
```

## Severity Guide

- **FAIL:** The server won't compile, won't start, has a security vulnerability, or is missing a designed feature. Must be fixed.
- **WARN:** The server works but has a quality concern — missing JSDoc, inconsistent naming, unused dependency, etc. Should be fixed.
- **PASS:** Check is satisfied.

## Quality Checklist
Before submitting your report:
- [ ] Every check in all 8 categories has a status
- [ ] Every FAIL has a clear description and fix instruction
- [ ] Design conformance was checked against the actual MCP design document
- [ ] Security checks were thorough (searched for patterns, not just spot-checked)
- [ ] The summary accurately reflects the detailed results
