/**
 * @file mock-server/server.ts
 * Standalone Express HTTP server that mocks the Weather & Notifications API.
 * Start with: npm run mock
 *
 * Endpoints exposed:
 *   GET  /v1/weather/current
 *   GET  /v1/weather/forecast
 *   GET  /v1/alerts
 *   POST /v1/alerts/subscribe
 *   DELETE /v1/alerts/:alertId
 *
 * Auth: the server accepts any value in the X-API-Key header (or none),
 * so developers can run the MCP server against it without a real key.
 * Set API_BASE_URL=http://localhost:3456/v1 in .env to point the MCP server here.
 */
import express from "express";
import { weatherRouter } from "./routes/weather.js";
import { alertsRouter } from "./routes/alerts.js";

const app = express();
app.use(express.json());

// ── Request logger ────────────────────────────────────────────────────────────

app.use((req, _res, next) => {
  const redacted = req.headers["x-api-key"] ? "[REDACTED]" : "(none)";
  console.log(`[mock] ${req.method} ${req.path}  X-API-Key: ${redacted}`);
  next();
});

// ── Routes ────────────────────────────────────────────────────────────────────

app.use("/v1/weather", weatherRouter);
app.use("/v1/alerts", alertsRouter);

// ── Health check ──────────────────────────────────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "weather-mock-server" });
});

// ── 404 catch-all ─────────────────────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({ code: "NOT_FOUND", message: `Route not found: ${req.path}` });
});

// ── Start ─────────────────────────────────────────────────────────────────────

const PORT = parseInt(process.env["MOCK_PORT"] ?? "3456", 10);
app.listen(PORT, () => {
  console.log(`✅ Weather mock API server listening on http://localhost:${PORT}/v1`);
  console.log(
    `   Point MCP server at it: API_BASE_URL=http://localhost:${PORT}/v1 npm run dev`
  );
});
