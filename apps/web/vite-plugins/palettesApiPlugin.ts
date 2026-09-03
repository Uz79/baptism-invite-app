import type { Connect, Plugin } from "vite";
import {
  getAdminToken,
  isAuthorized,
  loadPalettes,
  savePalettes,
  type StoredPalette,
} from "../server/paletteStore";

function send(res: Connect.ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

function readJson(req: Connect.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
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

export function palettesApiPlugin(): Plugin {
  return {
    name: "baptism-palettes-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || "";
        const pathOnly = url.split("?")[0];

        if (pathOnly === "/api/admin/check") {
          if (req.method === "OPTIONS") {
            res.statusCode = 204;
            res.end();
            return;
          }
          if (req.method !== "POST") {
            send(res, 405, { error: "Method not allowed" });
            return;
          }
          const configured = Boolean(getAdminToken());
          const ok = isAuthorized(req.headers.authorization);
          send(res, ok ? 200 : 401, {
            ok,
            configured,
            ...(ok
              ? {}
              : {
                  error: configured
                    ? "Invalid token"
                    : "ADMIN_TOKEN is not set (add apps/web/.env.local)",
                }),
          });
          return;
        }

        if (pathOnly !== "/api/palettes") {
          next();
          return;
        }

        try {
          if (req.method === "GET") {
            send(res, 200, { palettes: await loadPalettes() });
            return;
          }

          if (req.method === "POST") {
            if (!isAuthorized(req.headers.authorization)) {
              send(res, 401, { error: "Unauthorized" });
              return;
            }
            const body = (await readJson(req)) as { palette?: StoredPalette } | null;
            const palette = body?.palette;
            if (!palette?.id || !palette?.name || !palette?.bg || !palette?.fg) {
              send(res, 400, { error: "Invalid palette" });
              return;
            }
            const list = await loadPalettes();
            const next = [palette, ...list.filter((p) => p.id !== palette.id)];
            const result = await savePalettes(next);
            if (!result.ok) {
              send(res, 503, { error: result.error });
              return;
            }
            send(res, 200, { palettes: next });
            return;
          }

          if (req.method === "DELETE") {
            if (!isAuthorized(req.headers.authorization)) {
              send(res, 401, { error: "Unauthorized" });
              return;
            }
            const id = new URL(url, "http://localhost").searchParams.get("id") || "";
            if (!id) {
              send(res, 400, { error: "Missing id" });
              return;
            }
            const list = await loadPalettes();
            const next = list.filter((p) => p.id !== id);
            const result = await savePalettes(next);
            if (!result.ok) {
              send(res, 503, { error: result.error });
              return;
            }
            send(res, 200, { palettes: next });
            return;
          }

          send(res, 405, { error: "Method not allowed" });
        } catch (err) {
          send(res, 500, {
            error: err instanceof Error ? err.message : "Server error",
          });
        }
      });
    },
  };
}
