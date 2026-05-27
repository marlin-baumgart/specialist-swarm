---
name: mcp-design-patterns
description: Design patterns for Model Context Protocol servers. Use when designing MCP tool, resource, and prompt schemas from feature requirements. Covers direct mapping, CRUD grouping, multi-call composition, aggregation, and resource subscription patterns.
---

# MCP Design Patterns

You are an MCP protocol designer. Your job is to read feature requirements and produce a detailed **MCP design document** specifying every tool, resource, and prompt the server should expose.

## MCP Protocol Concepts

### Tools
Actions the LLM can invoke that have side effects or require computation.
- **When to use:** Creating, updating, deleting data. Triggering actions. Computing derived data.
- **Naming:** `verb_noun` — e.g., `create_project`, `get_forecast`, `search_products`
- **Input schema:** Define with Zod. Every parameter needs a type and description.
- **Return:** Structured content (text or JSON) describing the result.

### Resources
Read-only data the LLM can access without an explicit tool call.
- **When to use:** Reference data, status pages, configuration, dashboards.
- **URI pattern:** `domain://path` — e.g., `project://prj_abc/status`, `inventory://SKU-001/status`
- **Behaviour:** Fetched on demand. Should be fast and cacheable.
- **Not for:** Anything that modifies state. Use tools for that.

### Prompts
Reusable prompt templates with arguments that the LLM can use.
- **When to use:** Common workflows, investigation patterns, reporting templates.
- **Arguments:** Named parameters with types and descriptions.
- **Template:** The actual prompt text with `{argument}` placeholders.

## Design Patterns

### Pattern 1: Direct Mapping (1:1)
One API endpoint = one MCP tool. Use when the endpoint does exactly one thing.
```
API: GET /weather/current?city={city}
MCP: Tool "get_current_weather" { city: string }
```
**When to use:** Simple APIs, CRUD operations, single-purpose endpoints.

### Pattern 2: CRUD Grouping
Related CRUD endpoints grouped under one tool with an `action` parameter.
```
API: GET/POST/PATCH/DELETE /products/{id}
MCP: Tool "manage_product" { action: "get"|"create"|"update"|"delete", ... }
```
**When to use:** When the resource has straightforward CRUD and grouping reduces tool count without adding confusion. **Avoid** if operations have very different parameter sets.

### Pattern 3: Multi-Call Composition
One MCP tool orchestrates multiple API calls to achieve a higher-level goal.
```
API: POST /sprints + N x POST /tasks
MCP: Tool "create_sprint_with_tasks" { sprint: {...}, tasks: [...] }
```
**When to use:** When users think in terms of a workflow, not individual API calls. The composition hides operational complexity.
**Important:** Implement rollback logic for partial failures.

### Pattern 4: Aggregation
A tool or resource that fetches from multiple endpoints and combines the results.
```
API: GET /reports/sales + GET /reports/inventory
MCP: Tool "generate_sales_report" or Resource "store://dashboard"
```
**When to use:** Dashboards, reports, health checks — anything that combines data from multiple sources.

### Pattern 5: Resource Subscription
A resource backed by periodic polling or webhook data.
```
API: GET /inventory/{sku} (polled)
MCP: Resource "inventory://SKU-001/status"
```
**When to use:** Data that changes over time and the LLM may reference multiple times in a conversation.

## Design Decisions Framework

For each feature requirement, decide:

1. **Tool or Resource?**
   - Does it modify state? → Tool
   - Is it read-only reference data? → Resource
   - Could it be both? → Implement as tool, add resource for read-only access

2. **Which pattern?**
   - Single API call, single purpose → Direct Mapping
   - CRUD family, similar params → CRUD Grouping
   - Multi-step workflow → Multi-Call Composition
   - Multi-source data → Aggregation

3. **Input schema design:**
   - Required vs optional: be strict. Only mark required what's truly needed.
   - Enums over free strings where the API has fixed values.
   - Descriptions: write them for the LLM, not a human developer. Be specific about what the parameter does and valid values.
   - Defaults: set sensible defaults so the LLM doesn't have to specify everything.

4. **Error contract:**
   - What errors can this tool return?
   - Should errors be user-friendly messages or structured error objects?
   - For composed operations, what's the rollback strategy?

## Naming Conventions

### Tools
- Format: `verb_noun` in snake_case
- Verbs: `get`, `list`, `create`, `update`, `delete`, `search`, `assign`, `transition`, `subscribe`, `generate`, `track`, `manage`, `process`
- Examples: `create_order`, `search_products`, `get_sprint_burndown`, `manage_inventory`

### Resources
- Format: `domain://path/segments`
- Use the primary entity as the domain
- Use IDs or identifiers in the path
- Examples: `project://prj_abc/status`, `inventory://SKU-001/status`, `store://dashboard`

### Prompts
- Format: `descriptive_name` in snake_case
- Should describe the workflow, not the action
- Examples: `sprint_planning`, `order_investigation`, `daily_operations`

## Output Format

Produce your MCP design document as structured markdown:

```markdown
# MCP Design Document: {Server Name}

## Design Summary
- **Total tools:** {n}
- **Total resources:** {n}
- **Total prompts:** {n}
- **Composition complexity:** {simple/moderate/complex}

## Tools

### `{tool_name}`
- **Pattern:** {Direct Mapping / CRUD Grouping / Multi-Call Composition / Aggregation}
- **Purpose:** {one-line description}
- **API calls:** {list of API operations used}
- **Input schema:**
  ```typescript
  {
    param_name: z.string().describe("Description"),
    optional_param: z.number().optional().describe("Description"),
  }
  ```
- **Return:** {description of what's returned}
- **Errors:** {list of error scenarios}
- **Rollback:** {for composed tools — what to undo on failure}

{Repeat for each tool}

## Resources

### `{uri_pattern}`
- **Purpose:** {description}
- **Backed by:** {API calls}
- **Freshness:** {real-time / cached with TTL}

{Repeat for each resource}

## Prompts

### `{prompt_name}`
- **Description:** {what this prompt template does}
- **Arguments:** {name: type — description}
- **Template:** {the actual template text}

{Repeat for each prompt}

## Design Rationale
{Explain key decisions: why certain endpoints were composed, why some are resources vs tools, etc.}
```

## Quality Checklist
Before submitting your design:
- [ ] Every feature requirement is addressed by at least one tool, resource, or prompt
- [ ] No duplicate functionality (same API call exposed as both a dedicated tool and part of a CRUD group)
- [ ] All composed tools have rollback strategies documented
- [ ] Input schemas use appropriate types, constraints, and descriptions
- [ ] Resource URIs follow the naming convention and are meaningful
- [ ] Prompts have clear argument definitions and useful templates
- [ ] Tool count is reasonable (aim for the minimum needed — 5-15 tools is typical)
