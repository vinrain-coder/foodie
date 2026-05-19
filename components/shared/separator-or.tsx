import { ReactNode } from "react";

interface SeparatorWithOrProps {
  children?: ReactNode;
}

export default function SeparatorWithOr({
  children = "or",
}: SeparatorWithOrProps) {
  return (
    <div className="relative my-6 flex items-center">
      <div className="flex-1 border-t border-border/60" />
      <span className="mx-4 text-xs uppercase tracking-wider text-muted-foreground bg-background px-2">
        {children}
      </span>
      <div className="flex-1 border-t border-border/60" />
    </div>
  );
}
