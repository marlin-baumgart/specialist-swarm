/**
 * @file tools/get-weather-dashboard.ts
 * MCP tool: `get_weather_dashboard` (optional aggregation)
 *
 * Fans out three calls in parallel:
 *   1. GET /weather/current   → current conditions
 *   2. GET /weather/forecast  → N-day forecast
 *   3. GET /alerts            → filtered to alerts for the requested city
 *
 * Partial-failure policy:
 *   - If current weather fails → isError true, no other data returned.
 *   - If forecast or alerts fail → null in that slot + a _warnings[] entry;
 *     available data is still returned.
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { config } from "../config.js";
import { apiRequest, mapError, ApiError, NetworkError } from "../client/http-client.js";
import {
  mockGetCurrentWeather,
  mockGetForecast,
  mockListAlerts,
} from "../client/mock-client.js";
import type {
  CurrentWeather,
  Forecast,
  AlertsListResponse,
  AlertSubscription,
} from "../types/api.js";

// ── Input schema ──────────────────────────────────────────────────────────────

const inputSchema = {
  city: z.string().describe("City to aggregate data for"),
  forecast_days: z
    .number()
    .int()
    .min(1)
    .max(14)
    .default(3)
    .describe("Number of forecast days to include (1–14, default: 3)"),
  units: z
    .enum(["metric", "imperial"])
    .default("metric")
    .describe("Unit system (default: metric)"),
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns a short error description for _warnings[] */
function errorDescription(err: unknown): string {
  if (err instanceof ApiError) return `API error ${err.status} (${err.code}): ${err.message}`;
  if (err instanceof NetworkError) return `Network error: ${err.message}`;
  return String(err);
}

// ── Registration ──────────────────────────────────────────────────────────────

/**
 * Registers the `get_weather_dashboard` aggregation tool on the given MCP
 * server instance.
 *
 * @param server - The McpServer to register this tool on
 */
export function registerGetWeatherDashboardTool(server: McpServer): void {
  server.tool(
    "get_weather_dashboard",
    "Aggregates current weather, forecast, and active city alerts in a single call. Supports partial failures for forecast and alerts.",
    inputSchema,
    async ({ city, forecast_days, units }) => {
      try {
        // ── Fan-out (parallel) ────────────────────────────────────────────────
        const [currentResult, forecastResult, alertsResult] = await Promise.allSettled([
          config.mockMode
            ? Promise.resolve(mockGetCurrentWeather())
            : apiRequest<CurrentWeather>("GET", "/weather/current", {
                params: { city, units },
              }),
          config.mockMode
            ? Promise.resolve(mockGetForecast())
            : apiRequest<Forecast>("GET", "/weather/forecast", {
                params: { city, days: forecast_days, units },
              }),
          config.mockMode
            ? Promise.resolve(mockListAlerts())
            : apiRequest<AlertsListResponse>("GET", "/alerts"),
        ]);

        // ── Current weather: hard failure ─────────────────────────────────────
        if (currentResult.status === "rejected") {
          return mapError(currentResult.reason, { city });
        }

        const current = currentResult.value;
        const warnings: string[] = [];

        let forecast: Forecast | null = null;
        if (forecastResult.status === "fulfilled") {
          forecast = forecastResult.value;
        } else {
          warnings.push(`Forecast unavailable: ${errorDescription(forecastResult.reason)}`);
        }

        let cityAlerts: AlertSubscription[] = [];
        if (alertsResult.status === "fulfilled") {
          cityAlerts = alertsResult.value.alerts.filter(
            (a) => a.city.toLowerCase() === city.toLowerCase() && a.status === "active"
          );
        } else {
          warnings.push(`Alerts unavailable: ${errorDescription(alertsResult.reason)}`);
        }

        // ── Build dashboard response ──────────────────────────────────────────
        const tempUnit = units === "imperial" ? "°F" : "°C";
        const lines: string[] = [
          `🌍 Weather Dashboard — ${city}`,
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
          `Current: ${current.temperature}${tempUnit}, ${current.condition.replace(/_/g, " ")}`,
        ];

        if (forecast) {
          lines.push(`\n📅 ${forecast_days}-day forecast:`);
          forecast.days.slice(0, forecast_days).forEach((d) => {
            lines.push(`  ${d.date}: ↑${d.temp_high}${tempUnit} ↓${d.temp_low}${tempUnit} — ${d.condition}`);
          });
        } else {
          lines.push(`\n📅 Forecast: unavailable`);
        }

        if (cityAlerts.length > 0) {
          lines.push(`\n🚨 Active alerts for ${city} (${cityAlerts.length}):`);
          cityAlerts.forEach((a) => lines.push(`  • ${a.name ?? a.id}`));
        } else {
          lines.push(`\n🚨 No active alerts for ${city}`);
        }

        if (warnings.length > 0) {
          lines.push(`\n⚠️  Warnings:`);
          warnings.forEach((w) => lines.push(`  - ${w}`));
        }

        const dashboard = {
          city,
          units,
          current,
          forecast,
          alerts: cityAlerts,
          ...(warnings.length > 0 ? { _warnings: warnings } : {}),
        };

        return {
          content: [
            {
              type: "text" as const,
              text: `${lines.join("\n")}\n\n${JSON.stringify(dashboard, null, 2)}`,
            },
          ],
        };
      } catch (error) {
        return mapError(error, { city });
      }
    }
  );
}
