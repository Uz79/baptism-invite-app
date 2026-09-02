import { AppChrome } from "../components/AppChrome";
import { ScheduleEvent } from "../components/ScheduleEvent";
import { eventMeta, schedule } from "../data/event";

type BaptismInvitePageProps = {
  onThemeOpen: () => void;
};

export function BaptismInvitePage({ onThemeOpen }: BaptismInvitePageProps) {
  return (
    <div className="invite-app">
      <AppChrome title="Overview" onThemeOpen={onThemeOpen}>
        <main className="invite-page">
          <header className="invite-hero">
            <h6 className="invite-hero__title type-h6 type-bold type-trim">{eventMeta.title}</h6>
            <p className="invite-hero__date type-lg type-trim">{eventMeta.dateLabel}</p>
            <p className="invite-hero__name type-lg type-bold type-trim">{eventMeta.nameLabel}</p>
          </header>

          <section className="invite-schedule" aria-label="Harmonogram">
            <div className="invite-schedule__list">
              {schedule.map((stop) => (
                <ScheduleEvent key={`${stop.time}-${stop.title}`} stop={stop} />
              ))}
            </div>
          </section>
        </main>
      </AppChrome>
    </div>
  );
}
