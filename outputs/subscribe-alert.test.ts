/**
 * @file tests/tools/subscribe-alert.test.ts
 * Unit tests for the subscribe_alert and unsubscribe_alert tools.
 * Also covers input validation (Zod) and error mapping.
 */
import { describe, it, expect } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerSubscribeAlertTool } from "../../src/tools/subscribe-alert.js";
import { registerUnsubscribeAlertTool } from "../../src/tools/unsubscribe-alert.js";
import { ApiError } from "../../src/client/http-client.js";

/** Invoke the subscribe_alert callback */
async function callSubscribe(
  args: Record<string, unknown>
): Promise<{ content: { type: string; text: string }[]; isError?: boolean }> {
  const server = new McpServer({ name: "test", version: "0.0.1" });
  registerSubscribeAlertTool(server);

  const result = await (server as unknown as {
    _registeredTools: Map<string, { callback: (a: unknown) => Promise<unknown> }>;
  })._registeredTools
    .get("subscribe_alert")!
    .callback(args);

  return result as { content: { type: string; text: string }[]; isError?: boolean };
}

/** Invoke the unsubscribe_alert callback */
async function callUnsubscribe(
  args: Record<string, unknown>
): Promise<{ content: { type: string; text: string }[]; isError?: boolean }> {
  const server = new McpServer({ name: "test", version: "0.0.1" });
  registerUnsubscribeAlertTool(server);

  const result = await (server as unknown as {
    _registeredTools: Map<string, { callback: (a: unknown) => Promise<unknown> }>;
  })._registeredTools
    .get("unsubscribe_alert")!
    .callback(args);

  return result as { content: { type: string; text: string }[]; isError?: boolean };
}

describe("subscribe_alert", () => {
  it("creates a subscription in mock mode", async () => {
    const result = await callSubscribe({
      city: "London",
      conditions: [{ temperature_above: 30 }],
      callback_url: "https://hooks.example.com/test",
      name: "Test Alert",
    });
    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain("created");
    expect(result.content[0].text).toContain("ID:");
  });

  it("returns subscription JSON in the response", async () => {
    const result = await callSubscribe({
      city: "London",
      conditions: [{ condition_is: "rain" }],
      callback_url: "https://hooks.example.com/rain",
    });
    expect(result.content[0].text).toContain('"id"');
    expect(result.content[0].text).toContain('"status"');
  });
});

describe("unsubscribe_alert", () => {
  it("confirms deletion of a subscription in mock mode", async () => {
    const result = await callUnsubscribe({
      alert_id: "a1b2c3d4-0001-4abc-8def-111111111111",
    });
    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain("deleted");
  });
});

describe("error mapping", () => {
  it("maps UNAUTHORIZED to helpful message", () => {
    const { mapError } = require("../../src/client/http-client.js") as typeof import("../../src/client/http-client.js");
    const err = new ApiError(401, "UNAUTHORIZED", "Unauthorized");
    const result = mapError(err);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("WEATHER_API_KEY");
  });

  it("maps CITY_NOT_FOUND to city-aware message", () => {
    const { mapError } = require("../../src/client/http-client.js") as typeof import("../../src/client/http-client.js");
    const err = new ApiError(404, "CITY_NOT_FOUND", "Not found");
    const result = mapError(err, { city: "Atlantis" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Atlantis");
  });

  it("maps NOT_FOUND to subscription-aware message", () => {
    const { mapError } = require("../../src/client/http-client.js") as typeof import("../../src/client/http-client.js");
    const err = new ApiError(404, "NOT_FOUND", "Not found");
    const result = mapError(err, { id: "uuid-123" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("uuid-123");
  });

  it("maps 5xx to retry message", () => {
    const { mapError } = require("../../src/client/http-client.js") as typeof import("../../src/client/http-client.js");
    const err = new ApiError(503, "SERVICE_UNAVAILABLE", "Down");
    const result = mapError(err);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("retry");
  });

  it("maps 422 INVALID_CONDITIONS to conditions message", () => {
    const { mapError } = require("../../src/client/http-client.js") as typeof import("../../src/client/http-client.js");
    const err = new ApiError(422, "INVALID_CONDITIONS", "Bad conditions", "must be positive");
    const result = mapError(err);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("conditions");
  });
});
