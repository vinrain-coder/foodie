import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="bg-background">
      <Skeleton className="aspect-16/8 md:aspect-16/5 w-full rounded-none" />

      <div className="max-w-7xl mx-auto py-6 md:py-12 space-y-8 md:space-y-12 px-2 md:px-4">
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-2xl" />
          ))}
        </section>

        <section>
          <Skeleton className="h-72 w-full rounded-2xl" />
        </section>

        <section>
          <Skeleton className="h-72 w-full rounded-2xl" />
        </section>

        <section>
          <Skeleton className="h-36 w-full rounded-2xl" />
        </section>

        <section>
          <Skeleton className="h-36 w-full rounded-2xl" />
        </section>

        <section>
          <Skeleton className="h-64 w-full rounded-2xl" />
        </section>

        <section className="flex justify-center">
          <Skeleton className="h-64 w-full rounded-2xl" />
        </section>

        <section className="bg-muted/30 rounded-3xl p-4 md:p-8 space-y-4">
          <Skeleton className="h-6 w-44" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square w-full rounded-xl" />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
