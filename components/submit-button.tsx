"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  pendingLabel = "Working…",
  variant = "primary",
  disabled = false,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: "primary" | "ghost" | "danger";
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button className={`btn btn--${variant}`} type="submit" disabled={pending || disabled}>
      {pending ? pendingLabel : children}
    </button>
  );
}
