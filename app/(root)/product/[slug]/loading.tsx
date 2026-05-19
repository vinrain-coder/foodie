import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="animate-in fade-in duration-300">
      <div className="my-1">
        <Skeleton className="h-4 w-40" />
      </div>

      <section>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          <div className="space-y-4 md:col-span-2">
            <Skeleton className="w-full h-[350px] rounded-xl" />
            <Skeleton className="h-6 w-1/2 rounded-md" />
          </div>

          <div className="flex w-full flex-col gap-4 md:col-span-2 md:p-5">
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-7 w-24 rounded-full" />
              <Skeleton className="h-7 w-24 rounded-full" />
              <Skeleton className="h-7 w-20 rounded-full" />
            </div>
            <Skeleton className="h-8 w-11/12" />
            <Skeleton className="h-6 w-44" />
            <Skeleton className="h-px w-full" />
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-px w-full" />
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-10 w-full rounded-md" />
            <div className="space-y-2 mt-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-10/12" />
            </div>
          </div>

          <div className="md:sticky md:top-24">
            <div className="rounded-lg border p-4 space-y-4 shadow-sm">
              <Skeleton className="h-8 w-1/3" />
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          </div>
        </div>
      </section>

      <section className="mt-10 max-w-5xl mx-auto">
        <Skeleton className="h-7 w-40 mb-3" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-10/12" />
        </div>
      </section>

      <div className="flex flex-col gap-2 my-5">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-10 w-full max-w-56" />
      </div>

      <section className="mt-8 md:mt-10">
        <Skeleton className="h-7 w-52 mb-4" />
        <div className="space-y-3">
          <Skeleton className="h-20 w-full rounded-md" />
          <Skeleton className="h-20 w-full rounded-md" />
          <Skeleton className="h-20 w-full rounded-md" />
        </div>
      </section>

      <section className="mt-10">
        <Skeleton className="h-6 w-56 mb-4" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-md" />
          ))}
        </div>
      </section>

      <section className="mt-10 space-y-3">
        <Skeleton className="h-6 w-56" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square w-full rounded-xl" />
          ))}
        </div>
      </section>
    </div>
  );
}
