/**
 * @file tests/tools/get-current-weather.test.ts
 * Unit tests for the get_current_weather tool.
 * Runs in MOCK_MODE=true (set by tests/setup.ts).
 */
import { describe, it, expect, beforeAll } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerGetCurrentWeatherTool } from "../../src/tools/get-current-weather.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Creates a fresh McpServer, registers the tool, and invokes it directly
 * by calling the registered callback via the server's internal tool map.
 */
async function callTool(
  args: Record<string, unknown>
): Promise<{ content: { type: string; text: string }[]; isError?: boolean }> {
  const server = new McpServer({ name: "test", version: "0.0.1" });
  registerGetCurrentWeatherTool(server);

  // Access internal tool handlers via the server's request handler
  // We simulate a CallToolRequest to the server
  const result = await (server as unknown as {
    _registeredTools: Map<string, { inputSchema: unknown; callback: (args: unknown) => Promise<unknown> }>;
  })._registeredTools
    .get("get_current_weather")!
    .callback(args);

  return result as { content: { type: string; text: string }[]; isError?: boolean };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("get_current_weather", () => {
  it("returns weather data when city is provided", async () => {
    const result = await callTool({ city: "London", units: "metric" });
    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain("London");
    expect(result.content[0].text).toContain("temperature");
  });

  it("returns weather data when lat+lon are provided", async () => {
    const result = await callTool({ lat: 51.5, lon: -0.12, units: "metric" });
    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain("London"); // fixture always returns London
  });

  it("returns an error when neither city nor lat+lon are provided", async () => {
    const result = await callTool({ units: "metric" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/city.*lat.*lon/i);
  });

  it("returns an error when only lat is provided (missing lon)", async () => {
    const result = await callTool({ lat: 51.5, units: "metric" });
    expect(result.isError).toBe(true);
  });

  it("returns an error when only lon is provided (missing lat)", async () => {
    const result = await callTool({ lon: -0.12, units: "metric" });
    expect(result.isError).toBe(true);
  });

  it("includes imperial unit label when units=imperial", async () => {
    const result = await callTool({ city: "London", units: "imperial" });
    expect(result.content[0].text).toContain("°F");
  });
});
