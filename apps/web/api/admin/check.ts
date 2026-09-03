import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminToken, isAuthorized } from "../../server/paletteStore";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  const configured = Boolean(getAdminToken());
  const ok = isAuthorized(req.headers.authorization);

  res.statusCode = ok ? 200 : 401;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.end(
    JSON.stringify({
      ok,
      configured,
      ...(ok ? {} : { error: configured ? "Invalid token" : "ADMIN_TOKEN is not set on the server" }),
    })
  );
}
