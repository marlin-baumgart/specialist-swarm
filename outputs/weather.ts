/**
 * @file mock-server/routes/weather.ts
 * Express routes that mock the /weather/* endpoints of the Weather API.
 */
import { Router } from "express";
import type { Request, Response } from "express";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Loads a fixture from the canonical src/mocks directory */
function fixture(name: string): unknown {
  const filePath = join(__dirname, "../../src/mocks", `${name}.json`);
  return JSON.parse(readFileSync(filePath, "utf-8"));
}

/** Express router for /weather endpoints */
export const weatherRouter = Router();

/**
 * GET /v1/weather/current
 * Accepts: ?city=... | ?lat=...&lon=..., ?units=metric|imperial
 * Returns: CurrentWeather fixture
 */
weatherRouter.get("/current", (req: Request, res: Response) => {
  const { city, lat, lon } = req.query;

  if (!city && (!lat || !lon)) {
    res.status(400).json({
      code: "INVALID_PARAMS",
      message: "Provide either 'city' or both 'lat' and 'lon'.",
    });
    return;
  }

  // Simulate city-not-found for an explicit test value
  if (city === "NOTAPLACE") {
    res.status(404).json({ code: "CITY_NOT_FOUND", message: "City not found" });
    return;
  }

  res.json(fixture("current-weather"));
});

/**
 * GET /v1/weather/forecast
 * Accepts: ?city=..., ?days=1-14, ?units=metric|imperial
 * Returns: Forecast fixture (truncated to requested days)
 */
weatherRouter.get("/forecast", (req: Request, res: Response) => {
  const { city } = req.query;

  if (!city) {
    res.status(400).json({ code: "INVALID_PARAMS", message: "'city' is required" });
    return;
  }

  if (city === "NOTAPLACE") {
    res.status(404).json({ code: "CITY_NOT_FOUND", message: "City not found" });
    return;
  }

  const days = Math.min(14, Math.max(1, parseInt(String(req.query["days"] ?? "5"), 10)));
  const data = fixture("forecast") as { days: unknown[] };
  res.json({ ...data, days: data.days.slice(0, days) });
});
