import type { ScheduleStop } from "../data/event";
import { MapLinkButton } from "./MapLinkButton";

type ScheduleEventProps = {
  stop: ScheduleStop;
};

export function ScheduleEvent({ stop }: ScheduleEventProps) {
  return (
    <article className="schedule-event">
      <p className="schedule-event__time type-lg type-bold type-trim">{stop.time}</p>
      <div className="schedule-event__body">
        <h2 className="schedule-event__title type-lg type-trim">{stop.title}</h2>
        {stop.subtitle ? (
          <p className="schedule-event__subtitle type-md type-trim">{stop.subtitle}</p>
        ) : null}
        {stop.notes ? (
          <ul className="schedule-event__notes type-md">
            {stop.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        ) : null}
      </div>
      <div className="schedule-event__action">
        <MapLinkButton href={stop.mapsUrl} stop={stop.title} />
      </div>
    </article>
  );
}
