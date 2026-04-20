"use client";

import * as React from "react";
import { motion } from "framer-motion";

export interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export function Tabs({ value, onValueChange, children, className = "" }: TabsProps) {
  return (
    <div className={className}>
      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return child;
        return React.cloneElement(child as React.ReactElement<TabListProps>, {
          activeValue: value,
          onValueChange,
        });
      })}
    </div>
  );
}

export interface TabListProps {
  children: React.ReactNode;
  className?: string;
  activeValue?: string;
  onValueChange?: (value: string) => void;
}

export function TabList({ children, className = "" }: TabListProps) {
  return (
    <div className={["flex items-center gap-1 border-b border-[var(--color-border)]", className].join(" ")}>
      {children}
    </div>
  );
}

export interface TabProps {
  value: string;
  children: React.ReactNode;
  className?: string;
  activeValue?: string;
  onValueChange?: (value: string) => void;
}

export function Tab({ value, children, className = "", activeValue, onValueChange }: TabProps) {
  const isActive = activeValue === value;

  return (
    <button
      onClick={() => onValueChange?.(value)}
      className={[
        "relative px-4 py-3 text-sm font-medium transition-colors duration-120",
        "focus:outline-none focus-visible:shadow-[var(--shadow-focus-ring)]",
        isActive
          ? "text-[var(--color-text-primary)]"
          : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
        className,
      ].join(" ")}
    >
      {children}
      {isActive && (
        <motion.div
          layoutId="activeTab"
          className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--color-primary)]"
          transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
        />
      )}
    </button>
  );
}

export interface TabPanelProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function TabPanel({ value, children, className = "" }: TabPanelProps) {
  return (
    <div className={className}>
      {children}
    </div>
  );
}
