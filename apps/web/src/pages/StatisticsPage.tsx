import { useEffect, useMemo, useState } from "react";
import { fetchPalettes } from "../lib/palettesApi";
import { getStoredAdminToken } from "../lib/access";
import {
  EMPTY_STATS,
  fetchStats,
  type Stats,
  type StatsResult,
  type StatsSource,
} from "../lib/statsApi";
import {
  pairFromSettings,
  settingsFromPair,
  type SavedTheme,
  type ThemeMode,
} from "../lib/themeColors";

const NAV_LABELS: Record<string, string> = {
  church: "Church",
  restaurant: "Restaurant",
};

type Row = { id: string; name: string; kind: string; count: number; swatches: string[] };

function StatCard({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <div className="tile">
      <p className="tile__label">{label}</p>
      <p className="tile__value">{value}</p>
      <p className="tile__note">{note}</p>
    </div>
  );
}

function SplitCard({
  title,
  note,
  parts,
}: {
  title: string;
  note: string;
  parts: { label: string; value: number; color: string }[];
}) {
  const total = parts.reduce((s, p) => s + p.value, 0);
  return (
    <section className="panel">
      <h2 className="panel__title">{title}</h2>
      <p className="panel__note">{note}</p>
      <div className="split" role="img" aria-label={parts.map((p) => `${p.label}: ${p.value}`).join(", ")}>
        {parts.map((p) => (
          <span
            key={p.label}
            className="split__seg"
            style={{
              width: total ? `${(p.value / total) * 100}%` : "50%",
              background: p.color,
            }}
          />
        ))}
      </div>
      <ul className="legend">
        {parts.map((p) => (
          <li className="legend__row" key={p.label}>
            <span className="legend__dot" style={{ background: p.color }} aria-hidden />
            <span className="legend__label">{p.label}</span>
            <span className="legend__value">{p.value}</span>
            <span className="legend__pct">{total ? Math.round((p.value / total) * 100) : 0}%</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function StatisticsPage() {
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [palettes, setPalettes] = useState<SavedTheme[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<StatsSource>("counters");
  const [warning, setWarning] = useState<string | null>(null);
  const [days, setDays] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const token = getStoredAdminToken();
    const statsPromise: Promise<StatsResult> = token
      ? fetchStats(token)
      : Promise.resolve({ stats: EMPTY_STATS, source: "counters" });
    Promise.all([fetchPalettes(), statsPromise])
      .then(([p, s]) => {
        if (cancelled) return;
        setPalettes(p);
        setStats(s.stats);
        setSource(s.source);
        setWarning(s.warning ?? null);
        setDays(s.days ?? null);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load statistics.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /* Join counts (keyed by id) onto the current palettes, so a renamed or
     re-ordered palette still reports against the right history. */
  const rows: Row[] = useMemo(() => {
    const shell: ThemeMode = "light";
    return palettes
      .map((p) => {
        const s = settingsFromPair(p, shell);
        const pair = pairFromSettings(s, shell);
        const swatches =
          s.kind === "multicolor"
            ? [pair.neutral ?? pair.fg, pair.bg, pair.fg]
            : [pair.neutral ?? pair.fg, pair.bg];
        return {
          id: p.id,
          name: p.name,
          kind: s.kind,
          count: stats.palettePicks[p.id] ?? 0,
          swatches,
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [palettes, stats]);

  const totalPicks = rows.reduce((s, r) => s + r.count, 0);
  const maxPick = Math.max(1, ...rows.map((r) => r.count));
  const navEntries = Object.entries(stats.nav).sort((a, b) => b[1] - a[1]);
  const navTotal = navEntries.reduce((s, [, v]) => s + v, 0);
  const maxNav = Math.max(1, ...navEntries.map(([, v]) => v));
  const monoCount = rows.filter((r) => r.kind === "monochrome").reduce((s, r) => s + r.count, 0);
  const multiCount = totalPicks - monoCount;

  if (loading) return <p className="main-box__state">Loading statistics…</p>;
  if (error) return <p className="main-box__state main-box__state--error" role="alert">{error}</p>;

  return (
    <div className="main-box">
      <header className="main-box__header">
        <h1 className="main-box__title">Statistics</h1>
        <p className="main-box__note">
          {source === "posthog"
            ? `PostHog · last ${days ?? 30} days`
            : "Local counters"}
        </p>
        {warning ? (
          <p className="main-box__warning" role="status">
            PostHog unavailable, showing counters — {warning}
          </p>
        ) : null}
      </header>

      <div className="stack-stats">
        <StatCard label="Invites open" value={stats.opens} note="Individual openings" />
        <StatCard label="Chosen palettes" value={totalPicks} note="Guest Potwierdź only" />
        <StatCard label="Clicked navigation" value={navTotal} note="Church and restaurant" />
        <StatCard
          label="Guests without changes"
          value={Math.max(0, stats.opens - totalPicks)}
          note="Stayed with default"
        />
      </div>

      <div className="main-content">
        <section className="panel main-panel">
          <h2 className="panel__title">Palette choices</h2>
          <p className="panel__note">{totalPicks} confirmed palette choices</p>

          {rows.length === 0 ? (
            <p className="panel__empty">No palettes yet.</p>
          ) : (
            <ul className="choices">
              {rows.map((r) => (
                <li className="choices__row" key={r.id}>
                  <span className="choices__swatches" aria-hidden>
                    {r.swatches.map((c, i) => (
                      <span key={i} className="choices__swatch" style={{ background: c }} />
                    ))}
                  </span>
                  <span className="choices__name">{r.name}</span>
                  <span className="choices__track">
                    <span className="choices__bar" style={{ width: `${(r.count / maxPick) * 100}%` }} />
                  </span>
                  <span className="choices__count">{r.count}</span>
                  <span className="choices__pct">
                    {totalPicks ? Math.round((r.count / totalPicks) * 100) : 0}%
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="side-panels">
          <SplitCard
            title="Monochrome vs. multi-color"
            note={`from ${totalPicks} choices`}
            parts={[
              { label: "monochrome", value: monoCount, color: "var(--chart-ink)" },
              { label: "multi-color", value: multiCount, color: "var(--chart-multi)" },
            ]}
          />
          <SplitCard
            title="Light vs. dark theme"
            note="set after confirmation"
            parts={[
              { label: "light", value: stats.shell.light, color: "var(--chart-light)" },
              { label: "dark", value: stats.shell.dark, color: "var(--chart-dark)" },
            ]}
          />
          <section className="panel">
            <h2 className="panel__title">Used navigation</h2>
            <p className="panel__note">{navTotal} clicks</p>
            {navEntries.length === 0 ? (
              <p className="panel__empty">No clicks yet.</p>
            ) : (
              <ul className="navstats">
                {navEntries.map(([stop, value]) => (
                  <li className="navstats__row" key={stop}>
                    <span className="navstats__label">{NAV_LABELS[stop] ?? stop}</span>
                    <span className="navstats__track">
                      <span className="navstats__bar" style={{ width: `${(value / maxNav) * 100}%` }} />
                    </span>
                    <span className="navstats__value">{value}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
