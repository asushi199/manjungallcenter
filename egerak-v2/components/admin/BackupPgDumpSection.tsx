export default function BackupPgDumpSection() {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Sandaran SQL penuh (pg_dump)
      </h2>
      <p className="mt-2 text-sm text-slate-600">
        Untuk pemulihan bencana penuh, jalankan{" "}
        <strong className="font-medium text-slate-900">sekurang-kurangnya sekali sebulan</strong>{" "}
        dari komputer dengan PostgreSQL client. Melengkapkan sandaran logik harian di atas.
      </p>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-600">
        <li>
          Supabase Dashboard → Connect → <strong className="text-slate-900">Direct (5432)</strong> →
          salin URI ke <code className="text-slate-900">PGDUMP_DATABASE_URL</code> (`.env.local` dan
          GitHub Secrets).
        </li>
        <li>
          Tempatan:{" "}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-900">
            npm run db:backup-pgdump
          </code>
        </li>
        <li>
          <strong className="text-slate-900">Automatik bulanan:</strong> GitHub Actions workflow{" "}
          <code className="text-slate-900">Sandaran pg_dump bulanan</code> (hari 1 setiap bulan, ~
          02:00 pagi MYT) — jalankan{" "}
          <code className="text-slate-900">db:backup-pgdump:upload</code> ke folder Drive{" "}
          <code className="text-slate-900">_backup/pgdump/tahun/bulan</code>. Set secrets:{" "}
          <code className="text-slate-900">PGDUMP_DATABASE_URL</code>,{" "}
          <code className="text-slate-900">GAS_WEB_APP_URL</code>,{" "}
          <code className="text-slate-900">GAS_UPLOAD_SECRET</code>. Boleh juga{" "}
          <strong>Run workflow</strong> manual dari tab Actions.
        </li>
      </ol>
      <p className="mt-3 text-sm text-slate-600">
        Fail dimampatkan <code className="text-slate-900">.sql.gz</code> (had muat naik GAS 8 MB).
        Pulihkan: <code className="text-slate-900">gunzip -c fail.sql.gz | psql &lt;uri&gt;</code>
      </p>
    </section>
  );
}
