# Card D — MCP Server Builder: Design Spec

## Summary

Card D is a multi-agent scenario for the Specialist Swarm workshop. Given an OpenAPI/Swagger spec and a feature requirements document, a coordinator ("Lead Platform Architect") orchestrates 5 specialists to produce a complete, runnable TypeScript MCP server repository with full documentation and a Group IT `.docx`.

This card targets the most technical / platform-builder audience in the workshop.

---

## Inputs

Two synthetic data inputs, chosen by the team:

### 1. OpenAPI Spec (3 tiers of complexity)

Teams pick one spec from `synthetic-data/api-specs/`:

| Tier | API | ~Endpoints | MCP Challenge |
|------|-----|-----------|---------------|
| **Simple** | Weather & Notifications API | ~5 | Clean 1:1 mapping — one endpoint = one MCP tool |
| **Medium** | Project Management API (Jira-lite) | ~15 | Composition — "create sprint with tasks" requires multiple API calls orchestrated into one tool |
| **Complex** | E-Commerce & Inventory API | ~30 | Auth flows, pagination, webhooks, resource subscriptions, complex state |

Each spec is a valid OpenAPI 3.0 YAML file with realistic schemas, auth definitions, and example responses.

### 2. Feature Requirements Document

`synthetic-data/feature-requirements.md` — a markdown doc describing:
- Which MCP tools to expose (name, purpose, expected behaviour)
- Which MCP resources to expose (URI patterns, what data they surface)
- Which MCP prompts to include (reusable prompt templates)
- Non-functional requirements (auth forwarding, error handling, logging)

A pre-filled version is provided for each API tier. Teams can customise or write their own.

---

## Multi-Agent Architecture

### Recommended: Approach 1 — Two-Phase Fan-Out

```
                    ┌─────────────────────┐
                    │  Lead Platform       │
                    │  Architect           │
                    │  (Coordinator)       │
                    └──────────┬──────────┘
                               │
              ┌────────────────┴────────────────┐
              │         PHASE 1 (parallel)       │
              │                                  │
        ┌─────┴─────┐                  ┌─────────┴────────┐
        │ API        │                  │ MCP              │
        │ Analyst    │                  │ Architect        │
        └─────┬─────┘                  └─────────┬────────┘
              │  API capability map               │  MCP design doc
              └────────────────┬─────────────────┘
                               │
              ┌────────────────┴────────────────┐
              │      PHASE 2 (sequential)        │
              │                                  │
              │        ┌──────────────┐          │
              │        │ Code         │          │
              │        │ Generator    │          │
              │        └──────┬───────┘          │
              │               │  full repo src   │
              └───────────────┼──────────────────┘
                              │
              ┌───────────────┴──────────────────┐
              │        PHASE 3 (parallel)         │
              │                                   │
        ┌─────┴──────┐                  ┌─────────┴───────┐
        │ Documentation│                │ QA              │
        │ Writer       │                │ Validator       │
        └─────┬──────┘                  └─────────┬───────┘
              │  README + .docx                   │  validation report
              └───────────────┬───────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │  Coordinator       │
                    │  assembles final   │
                    │  repo + deliverable│
                    └───────────────────┘
```

**Why this approach:**
- Natural dependency flow — analysis feeds code generation, code generation feeds docs and QA
- Shows parallelism in two places (phases 1 and 3)
- Mirrors how a real platform team would work
- The Code Generator bottleneck in phase 2 is realistic and makes for a dramatic moment in the event stream

### Alternative: Approach 2 — Vertical Domain Split

All 5 specialists run in parallel, each owning a layer of the stack:

| Specialist | Owns |
|-----------|------|
| Transport Specialist | HTTP client layer, auth handling, mock/stub server |
| Schema Specialist | MCP tool definitions, resource URIs, input/output Zod schemas |
| Handler Specialist | Tool handler implementations bridging MCP calls to HTTP |
| Documentation Specialist | README, architecture docs, Group IT `.docx` |
| Config & Test Specialist | `package.json`, tsconfig, tests, CI config, example configs |

The coordinator assembles all outputs into one coherent repo.

**Pros:** Maximum parallelism (all 5 simultaneous, like Card A). Great event-stream demo.
**Cons:** Risk of interface mismatches between layers. Coordinator has heavier assembly burden.

### Alternative: Approach 3 — Review Loop

Sequential with iterative quality gates:

1. API Analyst + MCP Architect (parallel)
2. Code Generator produces initial code
3. QA Validator reviews, sends back issues
4. Code Generator fixes
5. Doc Writer produces docs from final code

**Pros:** Highest quality output through iterative refinement.
**Cons:** Most sequential, slowest wall-clock time. Review loop is harder to implement with the managed agents API. Less interesting as a workshop demo.

---

## Coordinator

**Name:** "Lead Platform Architect"
**Model:** `claude-opus-4-7`

**System prompt responsibilities:**
- Read the OpenAPI spec and feature requirements
- Phase 1: Delegate to API Analyst and MCP Architect in parallel
- Collect their outputs (API capability map + MCP design doc)
- Phase 2: Delegate to Code Generator with both outputs as context
- Collect the generated codebase
- Phase 3: Delegate to Documentation Writer and QA Validator in parallel
- Collect docs and validation report
- Assemble the final repo: merge code + docs, apply any QA fixes
- Produce the Group IT `.docx` as a separate deliverable

**Key instruction:** Accept specialist outputs as authoritative. Don't rewrite code — only fix integration issues flagged by QA.

---

## Specialists

### 1. API Analyst

**Model:** `claude-sonnet-4-6`
**Skill:** `api-analysis-playbook`
**Phase:** 1 (parallel with MCP Architect)

**System prompt:** You are an API integration specialist. Parse the provided OpenAPI spec and produce a structured API capability map.

**Skill content (`api-analysis-playbook/SKILL.md`):**
- How to read OpenAPI 3.0 specs systematically (paths, operations, components/schemas, securitySchemes)
- Extraction checklist:
  - Base URL and server variables
  - Authentication method (API key, OAuth2, Bearer)
  - All operations grouped by resource (CRUD patterns)
  - Request/response schemas with required fields
  - Pagination patterns (offset, cursor, link-header)
  - Rate limit headers and policies
  - Error response schemas and status codes
  - Webhook definitions (if any)
- Output template: structured markdown API capability map

**Output:** A markdown document — the API capability map.

### 2. MCP Architect

**Model:** `claude-sonnet-4-6`
**Skill:** `mcp-design-patterns`
**Phase:** 1 (parallel with API Analyst)

**System prompt:** You are an MCP protocol designer. Read the feature requirements and design the MCP server's tool, resource, and prompt schemas.

**Skill content (`mcp-design-patterns/SKILL.md`):**
- MCP protocol concepts:
  - **Tools:** Actions the LLM can invoke (create, update, delete, trigger)
  - **Resources:** Read-only data the LLM can access (project://status, user://profile)
  - **Prompts:** Reusable prompt templates with arguments
- Design patterns:
  - 1:1 mapping: one API endpoint = one MCP tool (simple tier)
  - Multi-call orchestration: one MCP tool = multiple API calls (medium tier)
  - CRUD grouping: related endpoints grouped under one tool with an `action` parameter
  - Resource subscriptions: polling or webhook-backed resources
- Naming conventions: `verb_noun` for tools, `domain://path` for resources
- Input schema best practices: Zod schemas, required vs optional, descriptions
- Output template: MCP design document with full tool/resource/prompt definitions

**Output:** A markdown MCP design document.

### 3. Code Generator

**Model:** `claude-sonnet-4-6`
**Skill:** `typescript-mcp-scaffold`
**Phase:** 2 (sequential — receives outputs from phase 1)

**System prompt:** You are a senior TypeScript developer specialising in MCP servers. Using the API capability map and MCP design document, produce a complete, runnable MCP server project.

**Skill content (`typescript-mcp-scaffold/SKILL.md`):**
- Project structure template:
  ```
  mcp-server/
  ├── package.json
  ├── tsconfig.json
  ├── .env.example
  ├── README.md              (placeholder — Doc Writer fills this)
  ├── src/
  │   ├── index.ts            (server entry point, MCP setup)
  │   ├── config.ts           (env vars, base URL, auth config)
  │   ├── types/
  │   │   ├── api.ts          (types generated from OpenAPI schemas)
  │   │   └── mcp.ts          (tool input/output types)
  │   ├── client/
  │   │   ├── http-client.ts  (axios/fetch wrapper, auth, retries)
  │   │   └── mock-client.ts  (stub responses for dev mode)
  │   ├── tools/
  │   │   └── [tool-name].ts  (one file per tool handler)
  │   ├── resources/
  │   │   └── [resource].ts   (one file per resource handler)
  │   └── prompts/
  │       └── [prompt].ts     (one file per prompt template)
  ├── mock-server/
  │   ├── server.ts           (express mock of the third-party API)
  │   └── fixtures/           (JSON response fixtures)
  └── tests/
      └── tools/
          └── [tool-name].test.ts
  ```
- MCP SDK usage patterns (`@modelcontextprotocol/sdk`)
- HTTP client patterns (auth injection, error mapping, pagination helpers)
- Mock server patterns (express-based, loads fixtures, matches routes)
- Code style: strict TypeScript (`strict: true`), JSDoc on every exported function/type/const, explicit error handling with typed errors
- `package.json` scripts: `dev` (start with mock), `start` (production), `build`, `test`, `lint`

**Output:** The complete source tree as files.

### 4. Documentation Writer

**Model:** `claude-sonnet-4-6`
**Skill:** `documentation-standards`
**Phase:** 3 (parallel with QA Validator)

**System prompt:** You are a technical writer. Produce project documentation and a Group IT handover document.

**Skill content (`documentation-standards/SKILL.md`):**
- README template:
  - Project name and one-line description
  - Quick start (install, configure, run)
  - Configuration reference (all env vars, what they do)
  - Available MCP tools (name, description, parameters, example)
  - Available MCP resources (URI pattern, description)
  - Available MCP prompts (name, arguments, description)
  - Architecture overview (component diagram in mermaid)
  - Development guide (mock mode, adding new tools, testing)
  - Claude Desktop integration (example `claude_desktop_config.json`)
- Group IT `.docx` structure:
  - Executive summary (what this server does, why it exists)
  - Security posture (auth model, data flow, no data storage, secrets management)
  - Deployment requirements (Node.js version, env vars, network access)
  - Integration architecture (mermaid diagram: Claude Desktop <-> MCP Server <-> Third-Party API)
  - Support and ownership (team, escalation path, monitoring)
  - Risk assessment (dependencies, API availability, fallback behaviour)
- Architecture overview template:
  - Component diagram (MCP client, server, HTTP client, third-party API)
  - Data flow (request lifecycle from LLM tool call to API response)
  - Error handling flow (what happens when the API is down)

**Output:** README.md content + Group IT `.docx`.

### 5. QA Validator

**Model:** `claude-sonnet-4-6`
**Skill:** `mcp-validation-checklist`
**Phase:** 3 (parallel with Documentation Writer)

**System prompt:** You are a QA engineer specialising in MCP servers. Review the generated code for correctness, protocol compliance, and runnability.

**Skill content (`mcp-validation-checklist/SKILL.md`):**
- Compilation checks:
  - Does `tsc --noEmit` pass?
  - Are all imports resolved?
  - Are there any `any` types that should be specific?
- Runnability checks:
  - Does `npm install && npm run build` succeed?
  - Does `npm run dev` start the MCP server on stdio?
  - Does the mock server start and respond to requests?
- MCP protocol compliance:
  - All tools have `name`, `description`, and `inputSchema`
  - All resources have `uri`, `name`, and `description`
  - JSON-RPC responses follow the MCP spec
  - Error responses use proper MCP error codes
- Design conformance:
  - Every tool in the MCP design doc is implemented
  - Tool input schemas match the design
  - Resource URIs match the design
- Security review:
  - No hardcoded API keys or secrets
  - Auth credentials read from environment variables
  - Input validation on all tool parameters
  - No command injection vectors in dynamic operations
- Output template: structured validation report (pass/fail per check, issues list with severity)

**Output:** A validation report with pass/fail and issues.

---

## Model Assignment

| Role | Model | Rationale |
|------|-------|-----------|
| Coordinator | `claude-opus-4-7` | Complex orchestration, multi-phase coordination, final assembly |
| API Analyst | `claude-sonnet-4-6` | Structured analysis, pattern recognition |
| MCP Architect | `claude-sonnet-4-6` | Design work, protocol knowledge |
| Code Generator | `claude-sonnet-4-6` | Heavy code generation, needs quality |
| Documentation Writer | `claude-sonnet-4-6` | Writing, formatting, docx generation |
| QA Validator | `claude-sonnet-4-6` | Code review, checklist verification |

All specialists use `claude-sonnet-4-6` — the code generation and design work justifies the capability level. Unlike Card A's competitive intel (which uses Haiku), none of Card D's specialists are commodity tasks.

---

## Synthetic Data Details

### Simple Tier: Weather & Notifications API

`synthetic-data/api-specs/weather-notifications-api.yaml`

A weather data and alert notifications service:
- **Endpoints (~5):** `GET /weather/current`, `GET /weather/forecast`, `POST /alerts/subscribe`, `DELETE /alerts/{id}`, `GET /alerts`
- **Auth:** API key via header
- **Features:** Simple request/response, no pagination, webhook subscriptions for alerts
- **MCP mapping:** Each endpoint maps 1:1 to an MCP tool. Alerts subscription maps to a resource.

`synthetic-data/feature-requirements-simple.md`:
- Tools: `get_current_weather`, `get_forecast`, `subscribe_alert`, `unsubscribe_alert`, `list_alerts`
- Resources: `weather://current/{city}`, `alerts://active`
- Prompts: `weather_briefing` (summarise weather for a location)

### Medium Tier: Project Management API

`synthetic-data/api-specs/project-management-api.yaml`

A Jira-lite project management service:
- **Endpoints (~15):** Projects CRUD, Sprints CRUD, Tasks CRUD, Comments, Assignments, Status transitions
- **Auth:** OAuth2 bearer token
- **Features:** Pagination (cursor-based), filtering, nested resources, status state machine
- **MCP mapping:** Some 1:1, some composed (e.g., `create_sprint_with_tasks` = create sprint + create N tasks + assign)

`synthetic-data/feature-requirements-medium.md`:
- Tools: `create_project`, `create_sprint`, `create_task`, `assign_task`, `transition_task`, `create_sprint_with_tasks` (composed), `get_sprint_burndown` (composed: fetch tasks + calculate)
- Resources: `project://{id}/status`, `sprint://{id}/burndown`, `task://{id}/details`
- Prompts: `sprint_planning` (suggest task breakdown for a user story), `standup_summary` (summarise recent activity)

### Complex Tier: E-Commerce & Inventory API

`synthetic-data/api-specs/ecommerce-inventory-api.yaml`

A full e-commerce platform with inventory management:
- **Endpoints (~30):** Products CRUD, Inventory management, Orders lifecycle, Customers, Payments, Shipping, Webhooks, Reports
- **Auth:** OAuth2 with refresh tokens
- **Features:** Pagination (offset + cursor), complex filtering, nested resources, webhook management, idempotency keys, rate limiting (429 with Retry-After)
- **MCP mapping:** Heavy composition, resource subscriptions, complex error handling

`synthetic-data/feature-requirements-complex.md`:
- Tools: `search_products`, `manage_inventory` (check/reserve/release), `create_order` (composed: validate stock + create + reserve + initiate payment), `process_refund`, `get_shipping_rates`, `create_shipment`, `register_webhook`, `generate_sales_report` (composed: aggregate across endpoints)
- Resources: `product://{id}/details`, `inventory://{sku}/status`, `order://{id}/tracking`, `store://dashboard` (composed aggregate)
- Prompts: `order_investigation` (diagnose order issues), `inventory_restock` (analyse low stock and suggest orders), `daily_operations` (morning ops briefing)

---

## Deliverables

### Primary: MCP Server Repository

`outputs/mcp-server/` — a complete, runnable TypeScript project:

```
outputs/mcp-server/
├── package.json
├── tsconfig.json
├── .env.example
├── README.md
├── src/
│   ├── index.ts
│   ├── config.ts
│   ├── types/
│   ├── client/
│   ├── tools/
│   ├── resources/
│   └── prompts/
├── mock-server/
│   ├── server.ts
│   └── fixtures/
└── tests/
```

Running `npm install && npm run dev` starts the MCP server with mock mode. Running with `API_BASE_URL` and auth env vars connects to the real API.

### Secondary: Group IT Documentation

`outputs/mcp-server-documentation.docx` — a branded Word document for Group IT covering:
- Executive summary
- Security posture
- Deployment requirements
- Integration architecture
- Support and ownership
- Risk assessment

---

## Execution Flow (for workshop)

Mirroring the existing workshop pattern:

1. `python setup_environment.py` — creates cloud environment
2. `python create_specialists.py` — creates 5 specialist agents (reads Card D config)
3. `python create_coordinator.py` — creates coordinator with phase-aware system prompt
4. `python upload_skills.py` — uploads 5 skills, attaches to specialists
5. `python run_mcp_builder.py` — team selects API tier, streams events, saves outputs
6. `python download_deliverable.py` — downloads repo + docx from session container

---

## Skills Summary

| Skill | Attached To | Purpose |
|-------|------------|---------|
| `api-analysis-playbook` | API Analyst | Systematic OpenAPI spec parsing and capability mapping |
| `mcp-design-patterns` | MCP Architect | MCP protocol design patterns, naming, schema best practices |
| `typescript-mcp-scaffold` | Code Generator | Project structure, SDK patterns, mock server patterns, code style |
| `documentation-standards` | Documentation Writer | README template, Group IT docx structure, architecture diagrams |
| `mcp-validation-checklist` | QA Validator | Compilation, runnability, protocol compliance, security checks |
