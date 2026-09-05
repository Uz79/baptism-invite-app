import type { VercelRequest, VercelResponse } from "@vercel/node";
import { isAuthorized } from "../server/paletteStore.js";
import { loadStats, recordStats, type StatsEvent } from "../server/statsStore.js";
import { loadStatsFromPostHog, posthogConfigured } from "../server/posthogStats.js";

function sendJson(res: VercelResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

function readBody(req: VercelRequest): Promise<unknown> {
  return new Promise((resolve, reject) => {
    if (req.body !== undefined) {
      resolve(typeof req.body === "string" ? JSON.parse(req.body || "null") : req.body);
      return;
    }
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(Buffer.from(c)));
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw ? JSON.parse(raw) : null);
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

function parseEvent(body: unknown): StatsEvent | null {
  const b = body as Record<string, unknown> | null;
  if (!b || typeof b.type !== "string") return null;
  if (b.type === "invite_opened") return { type: "invite_opened" };
  if (b.type === "palette_selected" && typeof b.paletteId === "string" && b.paletteId) {
    const shell = b.shell === "light" || b.shell === "dark" ? b.shell : undefined;
    return { type: "palette_selected", paletteId: b.paletteId, shell };
  }
  if (b.type === "nav_clicked" && typeof b.stop === "string" && b.stop) {
    return { type: "nav_clicked", stop: b.stop };
  }
  return null;
}

/**
 * GET  — admin only, returns the counters for the statistics dashboard.
 * POST — public, records one event from a guest.
 *
 * Counting is a read-modify-write against a single JSON blob. Two guests acting
 * in the same second can lose a count. At family-invite volume that is an
 * acceptable trade for having no database; revisit if this ever sees real traffic.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  try {
    if (req.method === "GET") {
      if (!isAuthorized(req.headers.authorization)) {
        sendJson(res, 401, { error: "Unauthorized" });
        return;
      }
      /* PostHog is the source of truth when configured; the Blob counters
         stay as a fallback so the dashboard still renders if a query fails. */
      if (posthogConfigured()) {
        try {
          const days = Number(req.query.days) || 30;
          sendJson(res, 200, { stats: await loadStatsFromPostHog(days), source: "posthog", days });
          return;
        } catch (err) {
          sendJson(res, 200, {
            stats: await loadStats(),
            source: "counters",
            warning: err instanceof Error ? err.message : "PostHog query failed",
          });
          return;
        }
      }
      sendJson(res, 200, { stats: await loadStats(), source: "counters" });
      return;
    }

    if (req.method === "POST") {
      const event = parseEvent(await readBody(req));
      if (!event) {
        sendJson(res, 400, { error: "Invalid event" });
        return;
      }
      await recordStats(event);
      // Guests get no data back — this is a beacon, not a query.
      sendJson(res, 202, { ok: true });
      return;
    }

    sendJson(res, 405, { error: "Method not allowed" });
  } catch (err) {
    sendJson(res, 500, { error: err instanceof Error ? err.message : "Server error" });
  }
}
