import * as React from "react";
import { ChevronDown } from "lucide-react";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

/**
 * P1-FE-2: native `<select>` styled with design tokens (`input-base`).
 */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, id, className = "", children, ...rest }, ref) => {
    const selectId = id ?? (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={selectId} className="text-xs font-semibold text-[var(--color-text-secondary)]">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={[
              "input-base appearance-none cursor-pointer pr-9",
              error ? "border-[var(--color-error)]" : "",
              className,
            ].join(" ")}
            {...rest}
          >
            {children}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-tertiary)]"
            aria-hidden
          />
        </div>
        {error && <p className="text-xs text-[var(--color-error)] m-0">{error}</p>}
      </div>
    );
  }
);
Select.displayName = "Select";
