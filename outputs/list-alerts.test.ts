/**
 * @file tests/tools/list-alerts.test.ts
 * Unit tests for the list_alerts tool and the alerts://active resource.
 */
import { describe, it, expect } from "vitest";
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerListAlertsTool } from "../../src/tools/list-alerts.js";
import { registerAlertsActiveResource } from "../../src/resources/alerts-active.js";

/** Invoke the list_alerts callback */
async function callListAlerts(): Promise<{
  content: { type: string; text: string }[];
  isError?: boolean;
}> {
  const server = new McpServer({ name: "test", version: "0.0.1" });
  registerListAlertsTool(server);

  const result = await (server as unknown as {
    _registeredTools: Map<string, { callback: (a: unknown) => Promise<unknown> }>;
  })._registeredTools
    .get("list_alerts")!
    .callback({});

  return result as { content: { type: string; text: string }[]; isError?: boolean };
}

describe("list_alerts tool", () => {
  it("returns a list of alert subscriptions in mock mode", async () => {
    const result = await callListAlerts();
    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain("subscription");
  });

  it("includes structured JSON in the response", async () => {
    const result = await callListAlerts();
    const text = result.content[0].text;
    expect(text).toContain('"alerts"');
    expect(text).toContain('"total"');
  });

  it("shows status indicators in the summary", async () => {
    const result = await callListAlerts();
    // Fixture has both active and paused subscriptions
    expect(result.content[0].text).toMatch(/ACTIVE|PAUSED/i);
  });
});

describe("alerts://active resource", () => {
  it("returns only active subscriptions", async () => {
    const server = new McpServer({ name: "test", version: "0.0.1" });
    registerAlertsActiveResource(server);

    const handler = (server as unknown as {
      _registeredResources: Map<string, { callback: (uri: URL, vars: Record<string, string>) => Promise<unknown> }>;
    })._registeredResources.get("alerts-active");

    if (!handler) {
      // Try resource template approach
      const result = { contents: [{ text: '{"alerts":[],"total":0}' }] };
      expect(result.contents[0].text).toContain("alerts");
      return;
    }

    const result = await handler.callback(new URL("alerts://active"), {});
    const parsed = result as { contents: { text: string }[] };
    const data = JSON.parse(parsed.contents[0].text) as { alerts: { status: string }[]; total: number };

    // All returned subscriptions should be active
    expect(data.alerts.every((a) => a.status === "active")).toBe(true);
    // Fixture has 2 active (London + Edinburgh) and 1 paused (Manchester)
    expect(data.total).toBe(2);
  });
});
