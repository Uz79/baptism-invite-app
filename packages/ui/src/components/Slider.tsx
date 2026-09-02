import type { InputHTMLAttributes } from "react";

interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  className?: string;
}

/** Range input styled with --slider-* tokens (.ds-slider). */
export function Slider({ className = "", ...rest }: SliderProps) {
  return (
    <input
      type="range"
      className={`ds-slider${className ? ` ${className}` : ""}`}
      {...rest}
    />
  );
}
