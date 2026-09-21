export default function BackupPgDumpSection({ atText }: { atText: string | null }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Sandaran SQL penuh (pg_dump)
      </h2>
      <p className="mt-3 text-sm text-slate-600">
        {atText ? (
          <>
            Terakhir berjaya: <span className="font-medium text-slate-900">{atText}</span>
          </>
        ) : (
          <span className="text-slate-500">Belum ada sandaran bulanan direkodkan.</span>
        )}
      </p>
    </section>
  );
}
