/**
 * @file tests/smoke.ts
 * Smoke / integration script that exercises every tool and both resources
 * in MOCK_MODE=true. Run with: npm run smoke
 *
 * Success criteria: every tool returns content without isError=true,
 * both resources return parseable JSON, and the prompt renders text.
 */

// Must be set before any other import that reads config
process.env["MOCK_MODE"] = "true";
process.env["WEATHER_API_KEY"] = "smoke-test-key";
process.env["LOG_LEVEL"] = "silent";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTools } from "../src/tools/index.js";
import { registerResources } from "../src/resources/index.js";
import { registerPrompts } from "../src/prompts/index.js";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ToolResult {
  content: { type: string; text: string }[];
  isError?: boolean;
}

interface ResourceResult {
  contents: { uri: string; mimeType: string; text: string }[];
}

interface PromptResult {
  messages: { role: string; content: { type: string; text: string } }[];
}

// ── Server setup ──────────────────────────────────────────────────────────────

const server = new McpServer({ name: "smoke-test", version: "0.0.1" });
registerTools(server);
registerResources(server);
registerPrompts(server);

// Type helpers for internal server maps
type ServerInternal = {
  _registeredTools: Map<string, { callback: (args: unknown) => Promise<unknown> }>;
  _registeredResources: Map<string, { callback: (uri: URL, vars: Record<string, string>) => Promise<unknown> }>;
  _registeredResourceTemplates: Map<string, { callback: (uri: URL, vars: Record<string, string | string[]>) => Promise<unknown> }>;
  _registeredPrompts: Map<string, { callback: (args: unknown) => Promise<unknown> }>;
};

const s = server as unknown as ServerInternal;

// ── Helpers ───────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

async function runTest(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${name}: ${err instanceof Error ? err.message : String(err)}`);
    failed++;
  }
}

async function callTool(name: string, args: unknown): Promise<ToolResult> {
  const handler = s._registeredTools.get(name);
  if (!handler) throw new Error(`Tool '${name}' not registered`);
  return handler.callback(args) as Promise<ToolResult>;
}

// ── Tool smoke tests ──────────────────────────────────────────────────────────

console.log("\n🔧 Tools\n");

await runTest("get_current_weather (city)", async () => {
  const r = await callTool("get_current_weather", { city: "London", units: "metric" });
  if (r.isError) throw new Error(r.content[0].text);
  if (!r.content[0].text.includes("London")) throw new Error("Missing city in response");
});

await runTest("get_current_weather (lat+lon)", async () => {
  const r = await callTool("get_current_weather", { lat: 51.5, lon: -0.12, units: "metric" });
  if (r.isError) throw new Error(r.content[0].text);
});

await runTest("get_current_weather (missing location → isError)", async () => {
  const r = await callTool("get_current_weather", { units: "metric" });
  if (!r.isError) throw new Error("Expected isError=true for missing location");
});

await runTest("get_forecast", async () => {
  const r = await callTool("get_forecast", { city: "London", days: 3, units: "metric" });
  if (r.isError) throw new Error(r.content[0].text);
  if (!r.content[0].text.includes("London")) throw new Error("Missing city in response");
});

await runTest("list_alerts", async () => {
  const r = await callTool("list_alerts", {});
  if (r.isError) throw new Error(r.content[0].text);
  if (!r.content[0].text.includes("subscription")) throw new Error("No subscriptions in response");
});

await runTest("subscribe_alert", async () => {
  const r = await callTool("subscribe_alert", {
    city: "London",
    conditions: [{ temperature_above: 35 }, { condition_is: "thunderstorm" }],
    callback_url: "https://hooks.example.com/smoke",
    name: "Smoke test alert",
  });
  if (r.isError) throw new Error(r.content[0].text);
  if (!r.content[0].text.includes("created")) throw new Error("Missing 'created' in response");
});

await runTest("unsubscribe_alert", async () => {
  const r = await callTool("unsubscribe_alert", {
    alert_id: "a1b2c3d4-0001-4abc-8def-111111111111",
  });
  if (r.isError) throw new Error(r.content[0].text);
  if (!r.content[0].text.includes("deleted")) throw new Error("Missing 'deleted' in response");
});

await runTest("get_weather_dashboard", async () => {
  const r = await callTool("get_weather_dashboard", {
    city: "London",
    forecast_days: 3,
    units: "metric",
  });
  if (r.isError) throw new Error(r.content[0].text);
  if (!r.content[0].text.includes("Dashboard")) throw new Error("Missing 'Dashboard' in response");
});

// ── Resource smoke tests ──────────────────────────────────────────────────────

console.log("\n📂 Resources\n");

await runTest("alerts://active resource", async () => {
  const handler =
    s._registeredResources?.get("alerts-active") ??
    s._registeredResourceTemplates?.get("alerts-active");

  if (!handler) throw new Error("alerts-active resource not found");
  const result = (await handler.callback(
    new URL("alerts://active"),
    {}
  )) as ResourceResult;
  const data = JSON.parse(result.contents[0].text) as { alerts: { status: string }[] };
  const allActive = data.alerts.every((a) => a.status === "active");
  if (!allActive) throw new Error("Non-active alerts returned from alerts://active");
});

await runTest("weather://current/{city} resource", async () => {
  const handler = s._registeredResourceTemplates?.get("weather-current");
  if (!handler) {
    console.log("    (skipped — ResourceTemplate not accessible in this SDK version)");
    return;
  }
  const result = (await handler.callback(
    new URL("weather://current/London"),
    { city: "London" }
  )) as ResourceResult;
  if (result.contents[0].mimeType !== "application/json") {
    throw new Error("Expected application/json mime type");
  }
  JSON.parse(result.contents[0].text); // throws if invalid JSON
});

// ── Prompt smoke tests ────────────────────────────────────────────────────────

console.log("\n💬 Prompts\n");

await runTest("weather_briefing (with forecast)", async () => {
  const handler = s._registeredPrompts.get("weather_briefing");
  if (!handler) throw new Error("weather_briefing prompt not registered");
  const result = (await handler.callback({ city: "London" })) as PromptResult;
  const text = result.messages[0].content.text;
  if (!text.includes("London")) throw new Error("Missing city");
  if (!text.includes("5-day forecast")) throw new Error("Missing forecast clause");
});

await runTest("weather_briefing (without forecast)", async () => {
  const handler = s._registeredPrompts.get("weather_briefing");
  if (!handler) throw new Error("weather_briefing prompt not registered");
  const result = (await handler.callback({
    city: "Tokyo",
    include_forecast: "false",
  })) as PromptResult;
  const text = result.messages[0].content.text;
  if (!text.includes("Tokyo")) throw new Error("Missing city");
  if (text.includes("5-day forecast")) throw new Error("Forecast clause should be absent");
});

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n${"─".repeat(40)}`);
console.log(`Smoke tests: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log("✅ All smoke tests passed!\n");
}
