import type { ButtonHTMLAttributes } from "react";

interface ToggleSwitchProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** Accessible name — required for icon-only switch */
  "aria-label": string;
}

/** Toggle switch — uses `--toggle-switch-*` tokens (active = primary fill). */
export function ToggleSwitch({
  checked,
  onCheckedChange,
  className = "",
  disabled,
  ...rest
}: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      className={`toggle${checked ? " toggle--active" : ""}${className ? ` ${className}` : ""}`}
      onClick={() => onCheckedChange(!checked)}
      {...rest}
    >
      <span className={`toggle__thumb${checked ? " toggle__thumb--active" : ""}`} aria-hidden />
    </button>
  );
}
