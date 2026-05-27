/**
 * @file resources/weather-current.ts
 * MCP resource: `weather://current/{city}`
 * Returns live current weather for a city as application/json.
 * Always fetches fresh data — no cache.
 */
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { config } from "../config.js";
import { apiRequest, mapError } from "../client/http-client.js";
import { mockGetCurrentWeather } from "../client/mock-client.js";
import type { CurrentWeather } from "../types/api.js";

/**
 * Registers the `weather://current/{city}` resource on the given MCP server.
 *
 * @param server - The McpServer instance to register the resource on
 */
export function registerWeatherCurrentResource(server: McpServer): void {
  server.resource(
    "weather-current",
    new ResourceTemplate("weather://current/{city}", { list: undefined }),
    async (uri, { city }) => {
      const cityName = Array.isArray(city) ? city[0] : city;

      try {
        let weather: CurrentWeather;

        if (config.mockMode) {
          weather = mockGetCurrentWeather();
        } else {
          weather = await apiRequest<CurrentWeather>("GET", "/weather/current", {
            params: { city: cityName, units: "metric" },
          });
        }

        return {
          contents: [
            {
              uri: uri.href,
              mimeType: "application/json",
              text: JSON.stringify(weather, null, 2),
            },
          ],
        };
      } catch (error) {
        // Resources cannot return isError; surface as thrown error
        const mapped = mapError(error, { city: cityName });
        throw new Error(mapped.content[0].text);
      }
    }
  );
}
