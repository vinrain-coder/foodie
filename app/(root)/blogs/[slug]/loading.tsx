import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-4">
      <Skeleton className="h-4 w-40" />

      <div className="mt-2 rounded-2xl border border-border/60 bg-background p-2 sm:p-4 space-y-4">
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-7 w-24 rounded-full" />
          <Skeleton className="h-7 w-20 rounded-full" />
          <Skeleton className="h-7 w-16 rounded-full" />
        </div>
        <Skeleton className="h-10 w-11/12" />
        <Skeleton className="h-5 w-full max-w-2xl" />
        <div className="flex flex-wrap items-center gap-4">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-background p-2 sm:p-4 space-y-5">
        <div className="relative h-56 w-full overflow-hidden rounded-xl sm:h-72">
          <Skeleton className="w-full h-full" />
        </div>

        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-10/12" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-9/12" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-10/12" />
        </div>

        <div className="mt-8 flex flex-wrap justify-between gap-4">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-px w-full" />
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-10 w-full max-w-40 rounded-md" />
      </div>
    </div>
  );
}
