/**
 * @file mock-server/routes/alerts.ts
 * Express routes that mock the /alerts/* endpoints of the Weather API.
 * In-memory state is seeded from the fixture on startup; changes persist
 * only for the lifetime of the mock server process.
 */
import { Router } from "express";
import type { Request, Response } from "express";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { AlertSubscription, AlertsListResponse } from "../../src/types/api.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function fixture(name: string): unknown {
  const filePath = join(__dirname, "../../src/mocks", `${name}.json`);
  return JSON.parse(readFileSync(filePath, "utf-8"));
}

// ── In-memory state seeded from fixture ───────────────────────────────────────

const seedData = fixture("alerts") as AlertsListResponse;
/** Mutable in-memory list of alert subscriptions */
const subscriptions: AlertSubscription[] = [...seedData.alerts];

/** Next UUID counter (simple mock implementation) */
let idCounter = 1000;

function nextId(): string {
  return `mock-${String(idCounter++).padStart(4, "0")}-4abc-8def-mockmockmc00`;
}

// ── Router ────────────────────────────────────────────────────────────────────

/** Express router for /alerts endpoints */
export const alertsRouter = Router();

/**
 * GET /v1/alerts
 * Returns all stored subscriptions and their total count.
 */
alertsRouter.get("/", (_req: Request, res: Response) => {
  res.json({ alerts: subscriptions, total: subscriptions.length });
});

/**
 * POST /v1/alerts/subscribe
 * Creates a new alert subscription and returns it with a generated ID.
 */
alertsRouter.post("/subscribe", (req: Request, res: Response) => {
  const { city, conditions, callback_url, name } = req.body as {
    city?: string;
    conditions?: unknown[];
    callback_url?: string;
    name?: string;
  };

  if (!city || !conditions || !callback_url) {
    res.status(400).json({
      code: "INVALID_PARAMS",
      message: "'city', 'conditions', and 'callback_url' are required.",
    });
    return;
  }

  if (!Array.isArray(conditions) || conditions.length === 0) {
    res.status(422).json({
      code: "INVALID_CONDITIONS",
      message: "At least one condition is required.",
    });
    return;
  }

  const sub: AlertSubscription = {
    id: nextId(),
    city,
    conditions: conditions as AlertSubscription["conditions"],
    callback_url,
    name,
    created_at: new Date().toISOString(),
    status: "active",
  };
  subscriptions.push(sub);
  res.status(201).json(sub);
});

/**
 * DELETE /v1/alerts/:alertId
 * Removes the subscription with the given ID (returns 204) or 404 if missing.
 */
alertsRouter.delete("/:alertId", (req: Request, res: Response) => {
  const { alertId } = req.params;
  const idx = subscriptions.findIndex((s) => s.id === alertId);

  if (idx === -1) {
    res.status(404).json({ code: "NOT_FOUND", message: `Subscription '${alertId}' not found.` });
    return;
  }

  subscriptions.splice(idx, 1);
  res.status(204).send();
});
