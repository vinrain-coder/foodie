export default function RestaurantsLoading() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-64 animate-pulse rounded bg-muted" />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-24 animate-pulse rounded border bg-muted/40" />
        ))}
      </div>
      <div className="h-96 animate-pulse rounded border bg-muted/30" />
    </div>
  );
}
