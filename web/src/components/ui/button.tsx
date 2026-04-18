import * as React from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive" | "apple";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Show a spinner and disable the button */
  loading?: boolean;
  /** Render as a different element (e.g. an anchor tag) */
  asChild?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:     "bg-[var(--color-primary)] text-[var(--color-text-inverse)] border-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] hover:border-[var(--color-primary-hover)]",
  secondary:   "bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] border-[var(--color-border)] hover:bg-[var(--color-bg-surface-hover)] hover:border-[var(--color-border-strong)]",
  ghost:       "bg-transparent text-[var(--color-text-secondary)] border-transparent hover:bg-[var(--color-bg-surface)] hover:text-[var(--color-text-primary)]",
  destructive: "bg-[var(--color-error-subtle)] text-[var(--color-error)] border-[var(--color-error-border-strong)] hover:bg-[var(--color-error-subtle)]",
  apple:       "bg-[var(--color-accent-apple)] text-[var(--color-on-accent)] border-[var(--color-accent-apple)] hover:bg-[var(--color-accent-apple-hover)] hover:border-[var(--color-accent-apple-hover)]",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs gap-1.5 rounded-[var(--radius-md)]",
  md: "px-4 py-2 text-sm gap-2 rounded-[var(--radius-md)]",
  lg: "px-6 py-3 text-base gap-2.5 rounded-[var(--radius-lg)]",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "secondary", size = "md", loading = false, className = "", disabled, children, ...rest }, ref) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={[
          "inline-flex items-center justify-center font-medium transition-colors duration-150",
          "border whitespace-nowrap outline-none",
          "focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--color-bg-canvas)]",
          "disabled:cursor-not-allowed disabled:bg-[var(--color-disabled-bg)] disabled:border-[var(--color-disabled-border)] disabled:text-[var(--color-disabled-text)] disabled:shadow-none disabled:opacity-100",
          variantClasses[variant],
          sizeClasses[size],
          className,
        ].join(" ")}
        {...rest}
      >
        {loading && (
          <span
            className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin"
            aria-hidden="true"
          />
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
