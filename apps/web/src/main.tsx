import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import posthog from "posthog-js";
import { PostHogProvider } from "@posthog/react";
import App from "./App";
import "@cartography-lab/tokens";
import "@cartography-lab/ui/styles.css";
import "./styles/app.css";
import "./styles/theme-flow.css";
import "./styles/admin.css";

/**
 * Analytics is optional. Without VITE_POSTHOG_KEY nothing is initialised, the
 * provider is skipped, and every usePostHog() call resolves to undefined — so
 * the capture calls in components no-op safely.
 *
 * persistence:"memory" + person_profiles:"never" means no cookies, no
 * localStorage and no stored identifiers, so guests need no consent banner.
 */
const posthogKey = import.meta.env.VITE_POSTHOG_KEY;

if (posthogKey) {
  posthog.init(posthogKey, {
    /* Same-origin proxy (see rewrites in vercel.json). Requests go to
       /ingest on our own domain instead of eu.i.posthog.com, so tracker
       blocklists and DNS-level filtering do not drop them. */
    api_host: import.meta.env.VITE_POSTHOG_HOST ?? "/ingest",
    ui_host: "https://eu.posthog.com",
    defaults: "2026-05-30",
    /* Memory-only persistence: no cookies, no localStorage, so still no
       consent banner. NOT cookieless_mode — that needs "Cookieless server
       hash mode" enabled on the PostHog project, and without it the SDK
       silently declines to send anything at all. */
    persistence: "memory",
    person_profiles: "never",
  });
}

const tree = (
  <StrictMode>
    <App />
  </StrictMode>
);

createRoot(document.getElementById("root")!).render(
  posthogKey ? <PostHogProvider client={posthog}>{tree}</PostHogProvider> : tree
);
