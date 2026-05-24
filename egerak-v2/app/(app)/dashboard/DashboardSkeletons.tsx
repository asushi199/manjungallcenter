export function TodayStatsSkeleton() {
  return (
    <div className="card p-4 animate-pulse" aria-hidden>
      <div className="h-4 w-32 bg-slate-200 rounded mb-3" />
      <div className="h-10 w-16 bg-slate-200 rounded mb-3" />
      <div className="grid grid-cols-2 gap-2">
        <div className="h-14 bg-slate-100 rounded" />
        <div className="h-14 bg-slate-100 rounded" />
      </div>
    </div>
  );
}

export function FiltersSkeleton() {
  return (
    <div className="card p-4 animate-pulse space-y-3" aria-hidden>
      <div className="h-4 w-24 bg-slate-200 rounded" />
      <div className="h-10 bg-slate-100 rounded" />
      <div className="h-4 w-28 bg-slate-200 rounded" />
      <div className="h-10 bg-slate-100 rounded" />
    </div>
  );
}

export function MainSectionSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" aria-hidden>
      <div className="h-6 w-48 bg-slate-200 rounded" />
      <div className="card h-[380px] bg-slate-100" />
      <div className="card h-32 bg-slate-100" />
    </div>
  );
}
