interface ChipProps {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}

export function Chip({ active, onClick, children, className = "" }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`chip${active ? " chip--active" : ""} ${className}`.trim()}
    >
      {children}
    </button>
  );
}
