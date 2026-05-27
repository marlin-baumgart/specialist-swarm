/**
 * @file tests/tools/weather-briefing-prompt.test.ts
 * Unit tests for the weather_briefing prompt.
 */
import { describe, it, expect } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerWeatherBriefingPrompt } from "../../src/prompts/weather-briefing.js";

/** Invoke the weather_briefing prompt callback */
async function callPrompt(args: Record<string, string | undefined>): Promise<{
  messages: { role: string; content: { type: string; text: string } }[];
}> {
  const server = new McpServer({ name: "test", version: "0.0.1" });
  registerWeatherBriefingPrompt(server);

  const result = await (server as unknown as {
    _registeredPrompts: Map<string, { callback: (a: unknown) => Promise<unknown> }>;
  })._registeredPrompts
    .get("weather_briefing")!
    .callback(args);

  return result as { messages: { role: string; content: { type: string; text: string } }[] };
}

describe("weather_briefing prompt", () => {
  it("includes city name in the prompt text", async () => {
    const result = await callPrompt({ city: "Tokyo" });
    expect(result.messages[0].content.text).toContain("Tokyo");
  });

  it("includes forecast clause when include_forecast is not 'false'", async () => {
    const result = await callPrompt({ city: "Paris" });
    expect(result.messages[0].content.text).toContain("5-day forecast");
  });

  it("includes forecast clause when include_forecast='true'", async () => {
    const result = await callPrompt({ city: "Paris", include_forecast: "true" });
    expect(result.messages[0].content.text).toContain("5-day forecast");
  });

  it("omits forecast clause when include_forecast='false'", async () => {
    const result = await callPrompt({ city: "Paris", include_forecast: "false" });
    expect(result.messages[0].content.text).not.toContain("5-day forecast");
    expect(result.messages[0].content.text).toContain("Paris");
  });

  it("returns a user-role message", async () => {
    const result = await callPrompt({ city: "Berlin" });
    expect(result.messages[0].role).toBe("user");
  });

  it("includes practical advice guidance in the prompt", async () => {
    const result = await callPrompt({ city: "London" });
    expect(result.messages[0].content.text).toMatch(/umbrella|outdoor|travel/i);
  });
});
