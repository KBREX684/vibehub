import * as React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Shown below the input in red */
  error?: string;
  /** Label rendered above the input */
  label?: string;
  /** Required asterisk next to the label */
  required?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ error, label, required, id, className = "", ...rest }, ref) => {
    const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-semibold text-[var(--color-text-secondary)]"
          >
            {label}
            {required && <span className="text-[var(--color-error)] ml-0.5">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={[
            "input-base",
            error
              ? "border-[var(--color-error)] focus:border-[var(--color-error)]"
              : "",
            className,
          ].join(" ")}
          {...rest}
        />
        {error && (
          <p className="text-xs text-[var(--color-error)] m-0">{error}</p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
  label?: string;
  required?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ error, label, required, id, className = "", ...rest }, ref) => {
    const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-semibold text-[var(--color-text-secondary)]"
          >
            {label}
            {required && <span className="text-[var(--color-error)] ml-0.5">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={[
            "input-base resize-y min-h-[100px]",
            error
              ? "border-[var(--color-error)] focus:border-[var(--color-error)]"
              : "",
            className,
          ].join(" ")}
          {...rest}
        />
        {error && (
          <p className="text-xs text-[var(--color-error)] m-0">{error}</p>
        )}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";
