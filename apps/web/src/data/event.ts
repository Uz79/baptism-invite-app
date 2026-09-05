export type ScheduleStop = {
  /** Stable analytics key — short and independent of the display title. */
  key: string;
  time: string;
  title: string;
  subtitle?: string;
  notes?: string[];
  mapsUrl: string;
};

export const eventMeta = {
  title: "Święty Chrzest",
  dateLabel: "06.09.2026",
  nameLabel: "Maja Freya Szatanik",
};

export const schedule: ScheduleStop[] = [
  {
    key: "church",
    time: "12:00",
    title: "Msza w kościele ‘Przenajświętszej Trójcy’",
    notes: ["chrzest podczas mszy"],
    mapsUrl: "https://maps.app.goo.gl/pWeiZGFvzpuqzgk9A",
  },
  {
    key: "restaurant",
    time: "13:30",
    title: "Obiad w restauracji ‘Chopin 5’",
    notes: [
      "parkingi i przy kościele i przy restauracji",
      "można w 13 min przejść pieszo z kościoła do restauracji",
    ],
    mapsUrl: "https://maps.app.goo.gl/C6s4recwPqzMkVim9",
  },
];
