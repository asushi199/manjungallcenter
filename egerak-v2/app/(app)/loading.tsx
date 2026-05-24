export default function AppLoading() {
  return (
    <div className="mx-auto max-w-7xl p-4 space-y-4 animate-pulse" aria-live="polite" aria-busy="true">
      <p className="text-sm text-brand-700 font-medium">Memuatkan…</p>
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <div className="space-y-4">
          <div className="card h-24 bg-slate-100" />
          <div className="card h-32 bg-slate-100" />
          <div className="card h-48 bg-slate-100" />
        </div>
        <div className="card h-[420px] bg-slate-100" />
      </div>
    </div>
  );
}
