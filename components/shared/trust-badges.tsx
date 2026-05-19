import { RotateCcw, Truck, Wallet } from "lucide-react";

export default function TrustBadges() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-4 border-t border-b max-w-full overflow-hidden">
      {/* Item */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
          <Truck className="h-5 w-5 text-primary" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-semibold uppercase tracking-tight wrap-break-word">
            Fast Delivery
          </span>
          <span className="text-[10px] text-muted-foreground wrap-break-word">
            Across Kenya
          </span>
        </div>
      </div>

      {/* Item */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
          <RotateCcw className="h-5 w-5 text-primary" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-semibold uppercase tracking-tight wrap-break-word">
            Easy Returns
          </span>
          <span className="text-[10px] text-muted-foreground wrap-break-word">
            7-day policy
          </span>
        </div>
      </div>

      {/* Item */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
          <Wallet className="h-5 w-5 text-primary" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-semibold uppercase tracking-tight wrap-break-word">
            Secure Payment
          </span>
          <span className="text-[10px] text-muted-foreground wrap-break-word">
            Safe & Encrypted
          </span>
        </div>
      </div>
    </div>
  );
}
