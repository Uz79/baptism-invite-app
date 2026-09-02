interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  /** Figma: sm = 36dp track, regular = 44dp track */
  size?: "sm" | "regular";
  /** Full-width track — `.segmented--theme` */
  block?: boolean;
  className?: string;
  "aria-label"?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = "sm",
  block = false,
  className = "",
  "aria-label": ariaLabel,
}: SegmentedControlProps<T>) {
  const sizeClass = size === "sm" ? "segmented--sm" : "segmented--regular";
  const classes = ["segmented", sizeClass, block ? "segmented--theme" : "", className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} role="group" aria-label={ariaLabel}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            className={`segmented__option${active ? " segmented__option--active" : ""}`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
