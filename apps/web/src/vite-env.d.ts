/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** PostHog project token. Absent = analytics disabled, app runs untouched. */
  readonly VITE_POSTHOG_KEY?: string;
  /** PostHog ingestion host. Defaults to EU cloud. */
  readonly VITE_POSTHOG_HOST?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
