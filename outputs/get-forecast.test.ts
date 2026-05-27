/**
 * @file tests/tools/get-forecast.test.ts
 * Unit tests for the get_forecast tool.
 */
import { describe, it, expect } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerGetForecastTool } from "../../src/tools/get-forecast.js";

/** Invoke the tool callback directly via server internals */
async function callTool(
  args: Record<string, unknown>
): Promise<{ content: { type: string; text: string }[]; isError?: boolean }> {
  const server = new McpServer({ name: "test", version: "0.0.1" });
  registerGetForecastTool(server);

  const result = await (server as unknown as {
    _registeredTools: Map<string, { callback: (a: unknown) => Promise<unknown> }>;
  })._registeredTools
    .get("get_forecast")!
    .callback(args);

  return result as { content: { type: string; text: string }[]; isError?: boolean };
}

describe("get_forecast", () => {
  it("returns forecast data for a city", async () => {
    const result = await callTool({ city: "London", days: 5, units: "metric" });
    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain("London");
    expect(result.content[0].text).toContain("forecast");
  });

  it("uses default of 5 days when days is omitted", async () => {
    const result = await callTool({ city: "London", units: "metric" });
    expect(result.isError).toBeFalsy();
    // Fixture has 5 days; summary should show 5-day
    expect(result.content[0].text).toMatch(/5-day/i);
  });

  it("includes temperature values in the response", async () => {
    const result = await callTool({ city: "London", days: 3, units: "metric" });
    expect(result.content[0].text).toContain("°C");
  });

  it("uses °F when units=imperial", async () => {
    const result = await callTool({ city: "London", days: 3, units: "imperial" });
    expect(result.content[0].text).toContain("°F");
  });
});
