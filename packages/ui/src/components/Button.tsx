import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "tonal";
  size?: "sm" | "md";
  /** Icon-only square control — `.uz-btn--icon-only-*` */
  iconOnly?: boolean;
  children?: ReactNode;
}

/** Button — `.uz-btn` variants (primary / secondary / tonal). */
export function Button({
  variant = "tonal",
  size = "sm",
  iconOnly = false,
  className = "",
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  const classes = [
    "uz-btn",
    `uz-btn--${size}`,
    `uz-btn--${variant}`,
    iconOnly ? "uz-btn--icon-only" : "",
    iconOnly && variant === "secondary" ? "uz-btn--icon-only-secondary" : "",
    iconOnly && variant === "tonal" ? "uz-btn--icon-only-filledtonal" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button type={type} className={classes} {...rest}>
      {children}
    </button>
  );
}
