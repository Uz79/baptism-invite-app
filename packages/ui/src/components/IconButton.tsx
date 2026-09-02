import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Button } from "./Button";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual weight — maps to Button variants */
  variant?: "secondary" | "tonal" | "primary";
  size?: "sm" | "md";
  "aria-label": string;
  children: ReactNode;
}

/** Square icon-only control using design-system button tokens. */
export function IconButton({
  variant = "secondary",
  size = "sm",
  children,
  className = "",
  ...rest
}: IconButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      iconOnly
      className={className}
      {...rest}
    >
      {children}
    </Button>
  );
}
