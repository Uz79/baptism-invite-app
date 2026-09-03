import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  getAdminToken,
  isAuthorized,
  loadPalettes,
  savePalettes,
  type StoredPalette,
} from "../server/paletteStore";

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
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  try {
    if (req.method === "GET") {
      const palettes = await loadPalettes();
      sendJson(res, 200, { palettes });
      return;
    }

    if (req.method === "POST") {
      if (!isAuthorized(req.headers.authorization)) {
        sendJson(res, 401, { error: "Unauthorized" });
        return;
      }
      const body = (await readBody(req)) as { palette?: StoredPalette } | null;
      const palette = body?.palette;
      if (!palette?.id || !palette?.name || !palette?.bg || !palette?.fg) {
        sendJson(res, 400, { error: "Invalid palette" });
        return;
      }
      const list = await loadPalettes();
      const next = [palette, ...list.filter((p) => p.id !== palette.id)];
      const result = await savePalettes(next);
      if (!result.ok) {
        sendJson(res, 503, { error: result.error });
        return;
      }
      sendJson(res, 200, { palettes: next });
      return;
    }

    if (req.method === "DELETE") {
      if (!isAuthorized(req.headers.authorization)) {
        sendJson(res, 401, { error: "Unauthorized" });
        return;
      }
      const id = typeof req.query.id === "string" ? req.query.id : "";
      if (!id) {
        sendJson(res, 400, { error: "Missing id" });
        return;
      }
      const list = await loadPalettes();
      const next = list.filter((p) => p.id !== id);
      const result = await savePalettes(next);
      if (!result.ok) {
        sendJson(res, 503, { error: result.error });
        return;
      }
      sendJson(res, 200, { palettes: next });
      return;
    }

    sendJson(res, 405, { error: "Method not allowed" });
  } catch (err) {
    sendJson(res, 500, {
      error: err instanceof Error ? err.message : "Server error",
    });
  }
}
