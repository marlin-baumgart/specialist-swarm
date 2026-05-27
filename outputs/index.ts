/**
 * @file tools/index.ts
 * Aggregates all tool registrations into a single `registerTools` call.
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerGetCurrentWeatherTool } from "./get-current-weather.js";
import { registerGetForecastTool } from "./get-forecast.js";
import { registerSubscribeAlertTool } from "./subscribe-alert.js";
import { registerUnsubscribeAlertTool } from "./unsubscribe-alert.js";
import { registerListAlertsTool } from "./list-alerts.js";
import { registerGetWeatherDashboardTool } from "./get-weather-dashboard.js";

/**
 * Registers all Weather & Notifications MCP tools on the server.
 *
 * @param server - The McpServer instance to register tools on
 */
export function registerTools(server: McpServer): void {
  registerGetCurrentWeatherTool(server);
  registerGetForecastTool(server);
  registerSubscribeAlertTool(server);
  registerUnsubscribeAlertTool(server);
  registerListAlertsTool(server);
  registerGetWeatherDashboardTool(server);
}
