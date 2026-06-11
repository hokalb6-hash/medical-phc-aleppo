export function DashboardCountsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="surface-card animate-pulse p-4">
          <div className="h-4 w-24 rounded-md bg-slate-200" />
          <div className="mt-3 h-9 w-16 rounded-md bg-slate-200" />
        </div>
      ))}
    </div>
  );
}

export function PageContentSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-7 w-48 rounded-md bg-slate-200" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="surface-card h-20 rounded-xl bg-slate-100/80" />
      ))}
    </div>
  );
}

export function ReportsPageSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-7 w-56 rounded-md bg-slate-200" />
      <div className="surface-card grid gap-3 p-4 md:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-10 rounded-lg bg-slate-200" />
        ))}
      </div>
      <div className="surface-card h-64 rounded-xl bg-slate-100/80" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="surface-card h-72 rounded-xl bg-slate-100/80" />
        <div className="surface-card h-72 rounded-xl bg-slate-100/80" />
      </div>
    </div>
  );
}

export function DailyEntryMonitorSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-6 w-40 rounded-md bg-slate-200" />
      <div className="surface-card h-48 rounded-xl bg-slate-100/80" />
    </div>
  );
}
