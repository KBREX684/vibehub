"use client";

import * as React from "react";

export interface FormFieldProps {
  /** Form label (string or node). Required for a11y. */
  label: React.ReactNode;
  /** Helper copy rendered below the control (muted). */
  hint?: React.ReactNode;
  /** Inline error message. If provided, the field is marked invalid. */
  error?: React.ReactNode;
  /** Optional trailing chip shown next to the label (e.g. "optional"). */
  badge?: React.ReactNode;
  /** HTML id of the inner control. Auto-generated when omitted. */
  htmlFor?: string;
  /** Visually hides the label (screen-reader only). */
  srLabel?: boolean;
  required?: boolean;
  className?: string;
  children: React.ReactElement<Record<string, unknown>>;
}

/**
 * Unified label + control + hint + error wrapper. Enforces consistent
 * spacing, a11y and error semantics across every form on the site.
 */
export function FormField({
  label,
  hint,
  error,
  badge,
  htmlFor,
  srLabel = false,
  required = false,
  className = "",
  children,
}: FormFieldProps) {
  const reactId = React.useId();
  const existingId =
    typeof children.props.id === "string" ? children.props.id : undefined;
  const controlId = htmlFor ?? existingId ?? `field-${reactId}`;
  const errorId = error ? `${controlId}-error` : undefined;
  const hintId = hint ? `${controlId}-hint` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  const child = React.cloneElement(children, {
    id: controlId,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
  });

  return (
    <div className={["flex flex-col gap-1.5", className].join(" ")}>
      <div
        className={[
          "flex items-center justify-between gap-2",
          srLabel ? "sr-only" : "",
        ].join(" ")}
      >
        <label
          htmlFor={controlId}
          className="text-xs font-medium text-[var(--color-text-secondary)]"
        >
          {label}
          {required ? (
            <span className="ml-1 text-[var(--color-error)]" aria-hidden="true">
              *
            </span>
          ) : null}
        </label>
        {badge ? (
          <span className="text-[0.65rem] font-mono uppercase tracking-wider text-[var(--color-text-tertiary)]">
            {badge}
          </span>
        ) : null}
      </div>
      {child}
      {hint && !error ? (
        <p id={hintId} className="text-xs text-[var(--color-text-tertiary)] leading-relaxed m-0">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-xs text-[var(--color-error)] leading-relaxed m-0" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
