import {
  useRef,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
} from "react";

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  /** Compact control for dense HUD chrome / theme hex fields */
  size?: "default" | "small";
  suffix?: string;
  /** Show clear (X) while focused and value length > 1 */
  clearable?: boolean;
  /** Skip reserved helper/error footer (zoom HUD). Default keeps 16dp footer. */
  noFooter?: boolean;
  /** Extra class on the outer `.form-field` */
  className?: string;
}

function ClearIcon() {
  return (
    <svg className="form-field__clear-icon" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M9 9l6 6M15 9l-6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Text input — `.form-field__text-wrap`. */
export function TextField({
  label,
  size = "default",
  suffix,
  clearable = false,
  noFooter = false,
  id,
  className = "",
  value,
  defaultValue,
  onChange,
  onFocus,
  onBlur,
  ...rest
}: TextFieldProps) {
  const fieldId = id ?? (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
  const sizeClass = size === "small" ? " form-field--small" : "";
  const footerClass = noFooter ? "form-field--no-footer" : "";
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);

  const currentValue =
    value !== undefined
      ? String(value)
      : inputRef.current
        ? inputRef.current.value
        : String(defaultValue ?? "");

  const showClear = clearable && focused && currentValue.length > 1;

  const emitChange = (next: string) => {
    if (!onChange) return;
    const el = inputRef.current;
    const event = {
      target: el ?? ({ value: next } as HTMLInputElement),
      currentTarget: el ?? ({ value: next } as HTMLInputElement),
    } as ChangeEvent<HTMLInputElement>;
    if (el && value === undefined) {
      el.value = next;
    }
    // For controlled inputs, parent reads e.target.value — patch descriptor
    Object.defineProperty(event, "target", {
      writable: false,
      value: { ...(el ?? {}), value: next },
    });
    onChange(event);
  };

  return (
    <label
      className={`form-field ${sizeClass} ${footerClass} ${className}`.trim()}
      htmlFor={fieldId}
    >
      {label && <span className="form-field__label">{label}</span>}
      <div className="form-field__text-wrap">
        <input
          ref={inputRef}
          id={fieldId}
          className="form-field__input"
          value={value}
          defaultValue={defaultValue}
          onChange={onChange}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            window.setTimeout(() => setFocused(false), 0);
            onBlur?.(e);
          }}
          {...rest}
        />
        {suffix && <span className="form-field__suffix">{suffix}</span>}
        {clearable && (
          <button
            type="button"
            className={`form-field__clear${showClear ? "" : " form-field__clear--hidden"}`}
            aria-label={label ? `Clear ${label}` : "Clear"}
            tabIndex={-1}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              emitChange("#");
              requestAnimationFrame(() => {
                const el = inputRef.current;
                el?.focus();
                el?.setSelectionRange(1, 1);
                setFocused(true);
              });
            }}
          >
            <ClearIcon />
          </button>
        )}
      </div>
    </label>
  );
}
