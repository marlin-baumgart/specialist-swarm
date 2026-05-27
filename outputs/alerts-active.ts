/**
 * @file resources/alerts-active.ts
 * MCP resource: `alerts://active`
 * Returns all subscriptions whose status is "active" as application/json.
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { config } from "../config.js";
import { apiRequest, mapError } from "../client/http-client.js";
import { mockListAlerts } from "../client/mock-client.js";
import type { AlertsListResponse, AlertSubscription } from "../types/api.js";

/**
 * Registers the `alerts://active` static resource on the given MCP server.
 *
 * @param server - The McpServer instance to register the resource on
 */
export function registerAlertsActiveResource(server: McpServer): void {
  server.resource(
    "alerts-active",
    "alerts://active",
    async (uri) => {
      try {
        let allAlerts: AlertsListResponse;

        if (config.mockMode) {
          allAlerts = mockListAlerts();
        } else {
          allAlerts = await apiRequest<AlertsListResponse>("GET", "/alerts");
        }

        const active: AlertSubscription[] = allAlerts.alerts.filter(
          (a) => a.status === "active"
        );
        const result: AlertsListResponse = { alerts: active, total: active.length };

        return {
          contents: [
            {
              uri: uri.href,
              mimeType: "application/json",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        const mapped = mapError(error);
        throw new Error(mapped.content[0].text);
      }
    }
  );
}
