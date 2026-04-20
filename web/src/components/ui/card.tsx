import * as React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Remove hover state (useful for static content blocks) */
  noHover?: boolean;
  /** Elevated surface (bg-elevated instead of bg-surface) */
  elevated?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ noHover = false, elevated = false, className = "", children, ...rest }, ref) => (
    <div
      ref={ref}
      className={[
        "rounded-[var(--radius-lg)] border transition-all",
        elevated
          ? "bg-[var(--color-bg-elevated)] shadow-[var(--shadow-elevated)] border-[var(--color-border)]"
          : "bg-[var(--color-bg-surface)] shadow-[var(--shadow-card)] border-[var(--color-border)]",
        !noHover && [
          "hover:border-[var(--color-border-strong)]",
          "hover:bg-[var(--color-bg-surface-hover)]",
          "hover:shadow-[var(--shadow-card-hover)]",
          "hover:-translate-y-[1px]",
        ].join(" "),
        "duration-200 ease-[cubic-bezier(0,0,0.2,1)]",
        className,
      ].join(" ")}
      {...rest}
    >
      {children}
    </div>
  )
);
Card.displayName = "Card";

export function CardHeader({ className = "", ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={["px-5 pt-5 pb-4 border-b border-[var(--color-border)]", className].join(" ")}
      {...rest}
    />
  );
}

export function CardBody({ className = "", ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={["p-5", className].join(" ")} {...rest} />;
}

export function CardFooter({ className = "", ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={["px-5 pb-5 pt-4 border-t border-[var(--color-border)]", className].join(" ")}
      {...rest}
    />
  );
}
