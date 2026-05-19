import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="min-h-screen">
      <article className="max-w-3xl mx-auto">
        <header className="mb-8">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-6 h-10 w-11/12" />
          <Skeleton className="mt-4 h-6 w-full max-w-2xl" />
          <div className="mt-6 border-b pb-6">
            <Skeleton className="h-4 w-56" />
          </div>
        </header>

        <section className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-10/12" />
          <Skeleton className="h-6 w-1/3 mt-6" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-9/12" />
          <Skeleton className="h-4 w-full" />
        </section>

        <footer className="mt-16 pt-8 border-t">
          <Skeleton className="h-4 w-full max-w-xl" />
        </footer>
      </article>
    </main>
  );
}
