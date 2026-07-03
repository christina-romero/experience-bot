"use client";

import React from "react";

export function Button({
  children,
  variant = "primary",
  className = "",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "success" }) {
  const styles = {
    primary: "bg-brand text-white hover:bg-brand-light disabled:opacity-40",
    secondary: "bg-white text-brand border border-brand hover:bg-blue-50 disabled:opacity-40",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100 disabled:opacity-40",
    success: "bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40",
  }[variant];
  return (
    <button
      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed ${styles} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  value,
  onChange,
  rows = 2,
  readOnly = false,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  rows?: number;
  readOnly?: boolean;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <textarea
        className="editable"
        rows={rows}
        value={value ?? ""}
        readOnly={readOnly}
        onChange={(e) => onChange?.(e.target.value)}
      />
    </label>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>{children}</div>;
}

export function Banner({ tone = "info", children }: { tone?: "info" | "error" | "success"; children: React.ReactNode }) {
  const styles = {
    info: "bg-blue-50 text-blue-800 border-blue-200",
    error: "bg-red-50 text-red-800 border-red-200",
    success: "bg-emerald-50 text-emerald-800 border-emerald-200",
  }[tone];
  return <div className={`rounded-md border px-3 py-2 text-sm ${styles}`}>{children}</div>;
}

export function Spinner({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-slate-600">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-brand" />
      {label}
    </span>
  );
}