---
name: typescript-mcp-scaffold
description: Project structure, SDK patterns, mock server, and code style for generating complete runnable TypeScript MCP servers. Use when implementing an MCP server from an API capability map and MCP design document. Covers entry point, HTTP client, tool/resource/prompt handlers, mock server, and testing.
---

# TypeScript MCP Scaffold

You are a senior TypeScript developer specialising in MCP servers. Your job is to produce a complete, runnable MCP server project using the API capability map and MCP design document provided by the upstream specialists.

## Project Structure

Generate this exact directory structure:

```
mcp-server/
├── package.json
├── tsconfig.json
├── .env.example
├── .gitignore
├── src/
│   ├── index.ts              # Server entry point
│   ├── config.ts             # Environment variables and configuration
│   ├── types/
│   │   ├── api.ts            # Types derived from OpenAPI schemas
│   │   └── mcp.ts            # Tool input/output types (Zod schemas)
│   ├── client/
│   │   ├── http-client.ts    # HTTP client wrapper (fetch-based)
│   │   └── mock-client.ts    # Mock client for dev mode
│   ├── tools/
│   │   └── {tool-name}.ts    # One file per MCP tool
│   ├── resources/
│   │   └── {resource}.ts     # One file per MCP resource
│   └── prompts/
│       └── {prompt}.ts       # One file per MCP prompt
├── mock-server/
│   ├── server.ts             # Express mock of the third-party API
│   ├── routes/
│   │   └── {resource}.ts     # One file per API resource group
│   └── fixtures/
│       └── {fixture}.json    # JSON response fixtures
└── tests/
    └── tools/
        └── {tool-name}.test.ts  # Tests for each tool
```

## package.json Template

```json
{
  "name": "{server-name}-mcp-server",
  "version": "1.0.0",
  "description": "MCP server for {API name}",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "MOCK_MODE=true tsx src/index.ts",
    "dev:mock-server": "tsx mock-server/server.ts",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.12.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "express": "^5.1.0",
    "@types/express": "^5.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.7.0",
    "vitest": "^3.2.0"
  }
}
```

## tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "mock-server", "tests"]
}
```

## Server Entry Point Pattern (src/index.ts)

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { config } from "./config.js";

// Import tool registrations
import { registerTools } from "./tools/index.js";
import { registerResources } from "./resources/index.js";
import { registerPrompts } from "./prompts/index.js";

const server = new McpServer({
  name: "{server-name}",
  version: "1.0.0",
});

// Register all capabilities
registerTools(server);
registerResources(server);
registerPrompts(server);

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`{Server Name} MCP server running on stdio`);
}

main().catch(console.error);
```

## Configuration Pattern (src/config.ts)

```typescript
import { z } from "zod";

const configSchema = z.object({
  apiBaseUrl: z.string().url(),
  apiKey: z.string().optional(),       // Adjust auth per API
  accessToken: z.string().optional(),
  mockMode: z.boolean().default(false),
  logLevel: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

export type Config = z.infer<typeof configSchema>;

export const config: Config = configSchema.parse({
  apiBaseUrl: process.env.API_BASE_URL || "{default-sandbox-url}",
  apiKey: process.env.API_KEY,
  accessToken: process.env.ACCESS_TOKEN,
  mockMode: process.env.MOCK_MODE === "true",
  logLevel: process.env.LOG_LEVEL || "info",
});
```

## HTTP Client Pattern (src/client/http-client.ts)

```typescript
import { config } from "../config.js";

/** HTTP client error with status code and response body */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Make an authenticated request to the API */
export async function apiRequest<T>(
  method: string,
  path: string,
  options?: {
    params?: Record<string, string | number | boolean | undefined>;
    body?: unknown;
    headers?: Record<string, string>;
  }
): Promise<T> {
  const url = new URL(path, config.apiBaseUrl);

  // Add query parameters
  if (options?.params) {
    for (const [key, value] of Object.entries(options.params)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...getAuthHeaders(),
    ...options?.headers,
  };

  if (config.logLevel === "debug") {
    console.error(`[API] ${method} ${url.pathname}${url.search}`);
  }

  const response = await fetch(url.toString(), {
    method,
    headers,
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new ApiError(
      response.status,
      error.code || "UNKNOWN_ERROR",
      error.message || `API request failed with status ${response.status}`,
      error.details
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

function getAuthHeaders(): Record<string, string> {
  // Adjust based on the API's auth scheme:
  if (config.apiKey) {
    return { "X-API-Key": config.apiKey };
  }
  if (config.accessToken) {
    return { Authorization: `Bearer ${config.accessToken}` };
  }
  return {};
}
```

## Tool Handler Pattern

Each tool file should follow this pattern:

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiRequest, ApiError } from "../client/http-client.js";

/** Register the {tool_name} tool */
export function register{ToolName}Tool(server: McpServer): void {
  server.tool(
    "{tool_name}",
    "{Tool description for the LLM}",
    {
      // Zod schema for input parameters
      param_name: z.string().describe("What this parameter does"),
    },
    async ({ param_name }) => {
      try {
        const result = await apiRequest("GET", "/endpoint", {
          params: { param_name },
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        if (error instanceof ApiError) {
          return {
            content: [
              {
                type: "text",
                text: `Error: ${error.message} (${error.code})`,
              },
            ],
            isError: true,
          };
        }
        throw error;
      }
    }
  );
}
```

## Resource Handler Pattern

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiRequest } from "../client/http-client.js";

/** Register the {resource} resource */
export function register{Resource}Resource(server: McpServer): void {
  server.resource(
    "{resource_name}",
    "{domain}://{path}/{param}",
    async (uri) => {
      // Extract parameters from URI
      const param = uri.pathname.split("/")[1];

      const data = await apiRequest("GET", `/endpoint/${param}`);

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    }
  );
}
```

## Mock Client Pattern (src/client/mock-client.ts)

When `MOCK_MODE=true`, replace API calls with fixture data:

```typescript
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, "../../mock-server/fixtures");

/** Load a fixture file */
export function loadFixture<T>(name: string): T {
  const raw = readFileSync(join(fixturesDir, `${name}.json`), "utf-8");
  return JSON.parse(raw) as T;
}
```

## Mock Server Pattern (mock-server/server.ts)

```typescript
import express from "express";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());

// Load fixtures
function fixture(name: string) {
  return JSON.parse(
    readFileSync(join(__dirname, "fixtures", `${name}.json`), "utf-8")
  );
}

// Register routes that match the OpenAPI spec
// Example:
// app.get("/v1/weather/current", (req, res) => {
//   res.json(fixture("current-weather"));
// });

const PORT = process.env.MOCK_PORT || 3456;
app.listen(PORT, () => {
  console.log(`Mock API server running on http://localhost:${PORT}`);
});
```

## Code Style Rules

1. **Strict TypeScript:** `strict: true` in tsconfig. No `any` types — use `unknown` and narrow.
2. **JSDoc on every export:** Every exported function, type, constant, and class gets a JSDoc comment.
3. **Explicit error handling:** Catch `ApiError` in every tool handler. Return `isError: true` with user-friendly messages.
4. **No hardcoded secrets:** All credentials from environment variables via `config.ts`.
5. **Consistent imports:** Use `.js` extensions for local imports (Node16 module resolution).
6. **One file per tool/resource/prompt:** Keep files focused and small.
7. **Index files for registration:** Each capability directory has an `index.ts` that exports a `registerX(server)` function.

## .env.example Template

```
# API Configuration
API_BASE_URL=https://sandbox.example.com/v1
API_KEY=your-api-key-here
# ACCESS_TOKEN=your-oauth-token-here

# Server Configuration
MOCK_MODE=true
LOG_LEVEL=debug
# MOCK_PORT=3456
```

## .gitignore Template

```
node_modules/
dist/
.env
*.js.map
```

## Quality Checklist
Before submitting your code:
- [ ] Every file in the project structure is created
- [ ] `package.json` has all required dependencies
- [ ] `tsconfig.json` compiles without errors
- [ ] Every tool from the MCP design document is implemented
- [ ] Every resource from the MCP design document is implemented
- [ ] Every prompt from the MCP design document is implemented
- [ ] HTTP client handles auth correctly for this API's scheme
- [ ] Mock client/server has fixtures for all tool operations
- [ ] All exports have JSDoc comments
- [ ] No hardcoded API keys or secrets
- [ ] `.env.example` documents all required environment variables
