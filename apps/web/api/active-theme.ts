import type { VercelRequest, VercelResponse } from "@vercel/node";
import { isAuthorized } from "../server/paletteStore.js";
import { loadActiveTheme, saveActiveTheme } from "../server/activeThemeStore.js";

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
      const activeTheme = await loadActiveTheme();
      sendJson(res, 200, { activeTheme });
      return;
    }

    if (req.method === "POST") {
      if (!isAuthorized(req.headers.authorization)) {
        sendJson(res, 401, { error: "Unauthorized" });
        return;
      }
      const body = (await readBody(req)) as {
        paletteId?: string;
        shell?: string;
      } | null;
      const paletteId = typeof body?.paletteId === "string" ? body.paletteId.trim() : "";
      const shell = body?.shell === "dark" ? "dark" : body?.shell === "light" ? "light" : null;
      if (!paletteId || !shell) {
        sendJson(res, 400, { error: "Invalid active theme" });
        return;
      }
      const activeTheme = { paletteId, shell, updatedAt: Date.now() };
      const result = await saveActiveTheme(activeTheme);
      if (!result.ok) {
        sendJson(res, 503, { error: result.error });
        return;
      }
      sendJson(res, 200, { activeTheme });
      return;
    }

    sendJson(res, 405, { error: "Method not allowed" });
  } catch (err) {
    sendJson(res, 500, {
      error: err instanceof Error ? err.message : "Server error",
    });
  }
}
