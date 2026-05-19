"use client";

import { CheckIcon, XIcon, ShieldCheckIcon } from "lucide-react";

interface PasswordRequirementsProps {
  password: string;
}

const checks = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "One number", test: (p: string) => /[0-9]/.test(p) },
];

export function PasswordRequirements({ password }: PasswordRequirementsProps) {
  const passedCount = checks.filter((c) => c.test(password)).length;
  const strength = Math.round((passedCount / checks.length) * 100);

  return (
    <div className="space-y-3">
      {/* ── Strength Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheckIcon className="h-3.5 w-3.5" />
          <span>Password strength</span>
        </div>

        <span
          className={`text-xs font-medium transition-colors ${
            strength === 100
              ? "text-green-600"
              : strength >= 50
                ? "text-amber-500"
                : "text-muted-foreground"
          }`}
        >
          {strength}%
        </span>
      </div>

      {/* ── Progress Bar ── */}
      <div className="h-1.5 w-full rounded-full bg-muted/40 overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${
            strength === 100
              ? "bg-green-500"
              : strength >= 50
                ? "bg-amber-500"
                : "bg-red-400"
          }`}
          style={{ width: `${strength}%` }}
        />
      </div>

      {/* ── Checklist ── */}
      <ul className="space-y-1.5 pt-1">
        {checks.map(({ label, test }) => {
          const passed = test(password);

          return (
            <li
              key={label}
              className={`flex items-center gap-2 text-[11.5px] transition-all ${
                passed
                  ? "text-muted-foreground/80"
                  : password.length > 0
                    ? "text-muted-foreground/60"
                    : "text-muted-foreground"
              }`}
            >
              <div
                className={`flex h-4 w-4 items-center justify-center rounded-full border transition-all ${
                  passed
                    ? "border-green-500 bg-green-500/10"
                    : "border-muted-foreground/30"
                }`}
              >
                {passed ? (
                  <CheckIcon className="h-3 w-3 text-green-600" />
                ) : (
                  <XIcon className="h-3 w-3 text-muted-foreground/40" />
                )}
              </div>

              <span className="leading-none">{label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
