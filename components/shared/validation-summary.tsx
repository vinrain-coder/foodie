import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ValidationSummaryProps {
  errors?: Record<string, { message: string } | { message: string }[]>;
  className?: string;
}

export function ValidationSummary({ errors, className }: ValidationSummaryProps) {
  if (!errors || Object.keys(errors).length === 0) return null;

  return (
    <div
      className={cn(
        "bg-destructive/15 p-3 rounded-md text-sm text-destructive space-y-1",
        className
      )}
    >
      <div className="flex items-center gap-x-2 font-medium mb-1">
        <AlertCircle className="h-4 w-4" />
        <p>There were some errors with your submission:</p>
      </div>
      <ul className="list-disc list-inside pl-6 space-y-1">
        {Object.entries(errors).map(([field, value]) => {
          // Handle both single error object and array of error objects
          const messages = Array.isArray(value)
            ? value.map((v: any) => v.message)
            : [value.message];
          
          return (
            <li key={field}>
              <span className="font-semibold capitalize">{field.replace(/([A-Z])/g, ' $1')}:</span>{" "}
              {messages.join(", ")}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
