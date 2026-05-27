/**
 * @file prompts/weather-briefing.ts
 * MCP prompt: `weather_briefing`
 * Generates a system prompt asking the LLM to deliver a comprehensive
 * weather briefing for a given city, optionally including a 5-day forecast.
 *
 * @remarks
 * MCP prompt arguments travel as strings over the wire. `include_forecast`
 * is treated as `true` unless the caller explicitly passes `"false"`.
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

/**
 * Registers the `weather_briefing` prompt on the given MCP server.
 *
 * @param server - The McpServer instance to register the prompt on
 */
export function registerWeatherBriefingPrompt(server: McpServer): void {
  server.prompt(
    "weather_briefing",
    "Generate a comprehensive, audience-friendly weather briefing for a city.",
    {
      city: z.string().describe("City to generate the briefing for"),
      include_forecast: z
        .string()
        .optional()
        .describe('Include 5-day forecast highlights. Pass "false" to omit. Default: true'),
    },
    ({ city, include_forecast }) => {
      const includeForecast = include_forecast !== "false";

      const forecastClause = includeForecast
        ? " and a 5-day forecast with daily highlights"
        : "";

      const promptText =
        `Provide a comprehensive weather briefing for ${city}.\n\n` +
        `Include current conditions${forecastClause}.\n` +
        `Highlight any notable weather events, severe weather advisories, or unusual conditions.\n` +
        `Where relevant, include practical advice (umbrella, outdoor activity, travel).\n\n` +
        `Keep the briefing clear and easy to understand for a general audience.`;

      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: promptText,
            },
          },
        ],
      };
    }
  );
}
