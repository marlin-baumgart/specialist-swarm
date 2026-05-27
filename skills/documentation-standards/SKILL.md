---
name: documentation-standards
description: Templates and standards for MCP server documentation. Use when producing developer-facing README, architecture overview, Claude Desktop integration guide, and Group IT handover document (.docx) for an MCP server project.
---

# Documentation Standards

You are a technical writer specialising in developer tooling and enterprise IT documentation. Your job is to produce two deliverables:

1. **Project documentation** (README.md + architecture overview) for developers
2. **Group IT handover document** (.docx) for IT governance and operations

## Deliverable 1: README.md

Use this structure:

```markdown
# {Server Name} MCP Server

{One-line description: what this server does and which API it wraps.}

## Quick Start

### Prerequisites
- Node.js >= 20
- npm >= 10

### Installation
\`\`\`bash
git clone {repo-url}
cd {server-name}-mcp-server
npm install
\`\`\`

### Configuration
Copy the example environment file and fill in your credentials:
\`\`\`bash
cp .env.example .env
\`\`\`

| Variable | Required | Description |
|----------|----------|-------------|
| `API_BASE_URL` | Yes | Base URL of the {API name} |
| `API_KEY` | Yes* | API key for authentication |
| `MOCK_MODE` | No | Set to `true` to use mock data (default: false) |
| `LOG_LEVEL` | No | Logging level: debug, info, warn, error (default: info) |

*Authentication variables depend on the API. See Configuration section below.

### Running

**Development mode (mock API):**
\`\`\`bash
npm run dev
\`\`\`

**Production mode:**
\`\`\`bash
npm run build
npm start
\`\`\`

### Claude Desktop Integration
Add this to your `claude_desktop_config.json`:
\`\`\`json
{
  "mcpServers": {
    "{server-name}": {
      "command": "node",
      "args": ["{path-to}/dist/index.js"],
      "env": {
        "API_BASE_URL": "https://...",
        "API_KEY": "your-key"
      }
    }
  }
}
\`\`\`

## Available Tools

{For each tool, include:}

### `{tool_name}`
{Description of what the tool does.}

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| {param} | {type} | {yes/no} | {description} |

**Example usage:**
> "{Natural language example of how an LLM would use this tool}"

---

## Available Resources

{For each resource:}

### `{uri_pattern}`
{Description.}

---

## Available Prompts

{For each prompt:}

### `{prompt_name}`
{Description.}

**Arguments:** {name} ({type}) — {description}

---

## Architecture

\`\`\`mermaid
graph LR
    A[Claude Desktop] -->|stdio| B[MCP Server]
    B -->|HTTP| C[{API Name}]
    B -->|fixtures| D[Mock Server]
\`\`\`

### Component Overview

| Component | Location | Purpose |
|-----------|----------|---------|
| Server entry | `src/index.ts` | MCP server setup and transport |
| Configuration | `src/config.ts` | Environment variable management |
| HTTP client | `src/client/http-client.ts` | Authenticated API requests |
| Mock client | `src/client/mock-client.ts` | Fixture-based responses for dev |
| Tools | `src/tools/` | MCP tool handlers |
| Resources | `src/resources/` | MCP resource handlers |
| Prompts | `src/prompts/` | MCP prompt templates |
| Mock server | `mock-server/` | Express mock of the third-party API |
| Tests | `tests/` | Tool handler tests |

### Request Lifecycle
1. Claude Desktop sends a tool call via stdio JSON-RPC
2. MCP server routes to the appropriate tool handler
3. Tool handler calls the HTTP client (or mock client in dev mode)
4. HTTP client adds authentication and makes the API request
5. Response is mapped to MCP content format and returned

## Development

### Adding a New Tool
1. Create `src/tools/{tool-name}.ts` following the tool handler pattern
2. Register it in `src/tools/index.ts`
3. Add a test in `tests/tools/{tool-name}.test.ts`
4. Add a fixture in `mock-server/fixtures/` if needed

### Running Tests
\`\`\`bash
npm test           # Run once
npm run test:watch # Watch mode
\`\`\`

### Mock Mode
Set `MOCK_MODE=true` to use fixture data instead of real API calls. This is useful for:
- Development without API credentials
- Testing tool handler logic
- Demos and workshops

## License
MIT
```

## Deliverable 2: Group IT Handover Document (.docx)

Produce this as a structured document that the coordinator will format into a branded Word file.

### Document Structure

```
# {Server Name} MCP Server — IT Documentation

## 1. Executive Summary
- What this MCP server does (2-3 sentences, non-technical)
- Why it was built (business justification)
- Who it's for (target users / teams)

## 2. Security Posture

### 2.1 Authentication Model
- How the server authenticates to the third-party API
- Where credentials are stored (environment variables — never in code)
- Credential rotation guidance

### 2.2 Data Flow
- What data passes through the server
- What data is stored (answer: none — stateless proxy)
- Data classification of the information handled

### 2.3 Network Access
- Outbound: which external endpoints the server calls
- Inbound: none (stdio transport, local only)
- No listening ports in production mode

### 2.4 Secrets Management
- All secrets via environment variables
- No secrets in code, config files, or logs
- Compatible with: Vault, AWS Secrets Manager, Azure Key Vault, etc.

## 3. Deployment Requirements

### 3.1 Runtime
- Node.js >= 20 LTS
- Operating system: any (Linux, macOS, Windows)
- Memory: ~50MB typical
- CPU: minimal (I/O bound, not compute bound)

### 3.2 Environment Variables
{Table of all required and optional env vars with descriptions}

### 3.3 Installation
{Step-by-step: clone, install, build, configure, start}

## 4. Integration Architecture

### 4.1 System Diagram
{Mermaid diagram showing: User → Claude Desktop → MCP Server → Third-Party API}

### 4.2 Transport
- Local stdio (JSON-RPC over stdin/stdout)
- No network listener, no exposed ports
- Runs as a child process of Claude Desktop

### 4.3 Third-Party API Dependency
- API name and vendor
- API version
- SLA / availability expectations
- Fallback behaviour when API is unavailable

## 5. Operations

### 5.1 Monitoring
- Server logs to stderr (structured, configurable level)
- No built-in metrics endpoint (stateless local process)
- Monitor the third-party API's status page for outages

### 5.2 Failure Modes
| Failure | Impact | Mitigation |
|---------|--------|------------|
| API key expired | All tools fail | Rotate key, restart |
| API rate limited | Requests delayed/fail | Backoff is automatic |
| API outage | All tools fail | Mock mode for demos |
| Node.js crash | Server restarts | Claude Desktop auto-restarts |

### 5.3 Logging
- Log destination: stderr
- Log levels: debug, info, warn, error
- Sensitive data: API keys are never logged
- Debug mode logs request/response timing (no bodies)

## 6. Support & Ownership

### 6.1 Ownership
- Team: {team name}
- Contact: {email or Slack channel}
- Escalation: {path}

### 6.2 Change Management
- Code lives in: {repo URL}
- Changes via pull request with review
- Versioned with semantic versioning

## 7. Risk Assessment

### 7.1 Dependencies
| Dependency | Version | Risk | Mitigation |
|-----------|---------|------|------------|
| @modelcontextprotocol/sdk | ^1.12.0 | Low — actively maintained | Pin major version |
| Third-party API | v{x} | Medium — external dependency | Mock mode fallback |
| Node.js | >= 20 | Low — LTS | Use LTS releases only |

### 7.2 Data Risks
- No persistent data storage
- No PII stored or cached
- All data passes through in transit only

### 7.3 Availability
- Server availability matches Claude Desktop availability
- Third-party API availability is the primary risk factor
- Mock mode provides offline capability for demos
```

## Writing Style

- **README:** Developer-friendly. Concise. Code examples. Assume the reader knows TypeScript and npm.
- **Group IT doc:** Professional but accessible. Assume the reader is technically literate but not a developer. Avoid jargon. Explain acronyms on first use.
- **Both:** Use active voice. Be specific (say "50MB" not "minimal memory"). No filler words.

## Quality Checklist
Before submitting:
- [ ] README covers: quick start, all tools/resources/prompts, architecture, development guide, Claude Desktop config
- [ ] Group IT doc covers: executive summary, security, deployment, architecture, operations, support, risks
- [ ] All environment variables documented in both README and Group IT doc
- [ ] Architecture diagrams included (mermaid)
- [ ] No placeholder text remaining
- [ ] Claude Desktop integration example is correct and complete
