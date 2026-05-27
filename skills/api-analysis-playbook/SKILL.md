---
name: api-analysis-playbook
description: Systematic guide for parsing OpenAPI specs and producing structured API capability maps. Use when analysing a third-party API specification to extract endpoints, auth schemes, schemas, pagination patterns, error handling, and composition opportunities.
---

# API Analysis Playbook

You are an API integration specialist. Your job is to parse an OpenAPI/Swagger specification and produce a structured **API capability map** that downstream agents will use to design and implement an MCP server.

## Analysis Process

Work through the spec in this order:

### 1. Server & Base Configuration
- **Base URL(s):** Extract all server URLs and their descriptions (production, sandbox, etc.)
- **Server variables:** Note any parameterised segments in the base URL
- **API version:** From the info block or URL path

### 2. Authentication
Identify the security scheme(s) and extract:
- **Type:** API key, OAuth2 (which flow?), HTTP bearer, mutual TLS
- **Location:** Header name, query parameter, or cookie
- **Scopes:** For OAuth2, list all scopes with descriptions
- **Token refresh:** Does the spec define a refresh URL?

### 3. Operations Inventory
For each path + method combination, extract:
- **Operation ID** (use as the canonical reference name)
- **HTTP method + path**
- **Summary** (one-line purpose)
- **Parameters:** name, location (path/query/header), required?, type, constraints
- **Request body:** content type, schema reference, required fields
- **Response schemas:** success (2xx) and error codes with their schemas
- **Tags / grouping**

### 4. Resource Grouping
Group operations by the resource they operate on (e.g., all `/projects/*` endpoints form the "Projects" resource group). For each group, identify the CRUD pattern:
- Create (POST)
- Read one (GET by ID)
- Read many / list (GET collection)
- Update (PATCH/PUT)
- Delete (DELETE)
- Custom actions (POST to sub-resource, e.g., `/tasks/{id}/transition`)

### 5. Schema Analysis
For each referenced schema in `components/schemas`:
- **Required fields** vs optional
- **Field types** and constraints (min/max, enum values, formats)
- **Nested objects** and array items
- **Nullable fields**
- **Relationships** between schemas (e.g., Order contains line items referencing Products)

### 6. Pagination Patterns
Identify how list endpoints handle pagination:
- **Offset-based:** `offset` + `limit` parameters, `total` in response
- **Cursor-based:** `cursor` parameter, `next_cursor` in response
- **Link-header:** `Link` header with rel=next
- Note the default and maximum page sizes

### 7. Error Patterns
- **Error schema:** Structure of error responses (code, message, details)
- **Common error codes:** List the error codes used across the API
- **Rate limiting:** Look for 429 responses, `Retry-After` headers, `X-RateLimit-*` headers

### 8. Advanced Features
Note if present:
- **Webhooks:** Endpoints for registering/managing webhooks, event types
- **Idempotency:** `Idempotency-Key` header support
- **Conditional requests:** ETag / If-Match support
- **Bulk operations:** Batch endpoints
- **Real-time:** WebSocket or SSE endpoints

## Output Format

Produce your API capability map as a structured markdown document with these sections:

```markdown
# API Capability Map: {API Title}

## Overview
- **Base URL:** {url}
- **Version:** {version}
- **Auth:** {type} via {location}
- **Total endpoints:** {count}

## Authentication Details
{Full auth configuration details}

## Resource Groups

### {Resource Name}
| Operation | Method | Path | Key Parameters |
|-----------|--------|------|----------------|
| {opId}    | {GET}  | {/path} | {params}    |

**CRUD coverage:** {Create, Read, List, Update, Delete, Custom: ...}
**Key schemas:** {SchemaName} (required fields: ...)

{Repeat for each resource group}

## Pagination
- **Pattern:** {offset/cursor/link-header}
- **Default page size:** {n}
- **Max page size:** {n}

## Error Handling
- **Error schema:** {structure}
- **Rate limiting:** {yes/no, details}
- **Notable error codes:** {list}

## Advanced Features
- **Webhooks:** {yes/no, event types}
- **Idempotency:** {yes/no, header name}
- **Other:** {any other notable features}

## Composition Opportunities
{Identify groups of endpoints that could be combined into higher-level operations.
 For example: "Creating an order requires: reserve inventory + initiate payment + create order + confirm order"}

## Integration Risks
{Flag any potential issues: missing pagination on large collections, no retry guidance,
 inconsistent error formats, missing required fields in schemas, etc.}
```

## Quality Checklist
Before submitting your capability map, verify:
- [ ] Every endpoint in the spec is accounted for
- [ ] Auth configuration is complete and actionable
- [ ] All request/response schemas are referenced
- [ ] Pagination pattern is identified for every list endpoint
- [ ] Error handling approach is documented
- [ ] Composition opportunities are identified (endpoints that work together)
- [ ] Integration risks are flagged
