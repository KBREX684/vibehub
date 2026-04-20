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
  primary:     "bg-[var(--color-primary)] text-[var(--color-on-accent)] border-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] hover:border-[var(--color-primary-hover)] hover:shadow-[var(--shadow-card-hover)] active:scale-[0.98]",
  secondary:   "bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] border-[var(--color-border)] hover:bg-[var(--color-bg-surface-hover)] hover:border-[var(--color-border-strong)] hover:-translate-y-[1px]",
  ghost:       "bg-transparent text-[var(--color-text-secondary)] border-transparent hover:bg-[var(--color-surface-overlay)] hover:text-[var(--color-text-primary)]",
  destructive: "bg-[var(--color-error)] text-[var(--color-on-accent)] border-[var(--color-error)] hover:bg-[var(--color-error-subtle)] hover:text-[var(--color-error)] hover:border-[var(--color-error-border)]",
  apple:       "bg-[var(--color-accent-apple)] text-[var(--color-on-accent)] border-[var(--color-accent-apple)] hover:bg-[var(--color-accent-apple-hover)] hover:border-[var(--color-accent-apple-hover)] hover:shadow-[var(--shadow-card-hover)] active:scale-[0.98]",
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
          "inline-flex items-center justify-center font-medium",
          "border whitespace-nowrap outline-none",
          "transition-[background-color,border-color,color,box-shadow,transform]",
          "duration-[120ms,120ms,120ms,200ms,280ms]",
          "ease-[cubic-bezier(0.32,0.72,0,1)]",
          "focus-visible:shadow-[var(--shadow-focus-ring)]",
          "disabled:cursor-not-allowed disabled:bg-[var(--color-disabled-bg)] disabled:border-[var(--color-disabled-border)] disabled:text-[var(--color-disabled-text)] disabled:shadow-none disabled:opacity-100 disabled:hover:translate-y-0",
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
