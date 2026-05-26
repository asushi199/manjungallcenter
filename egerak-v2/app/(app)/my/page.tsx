import { listMine } from "@/lib/actions/pergerakan";
import MyClient from "./MyClient";

export const dynamic = "force-dynamic";

export default async function MyPage() {
  const items = await listMine();
  return (
    <div className="mx-auto max-w-5xl p-4">
      <div className="mb-4 space-y-3">
        <div>
          <h1 className="text-xl font-semibold">Pergerakan Saya</h1>
          <p className="text-sm text-slate-500 mt-1">
            {items.length} rekod · warna mengikut sektor (sama seperti kalendar Utama)
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
          <p>
            <strong className="text-slate-900">Tidak perlu OPR?</strong> Pada setiap kad
            pergerakan, gunakan butang <strong>Tidak perlu OPR</strong> di sebelah{" "}
            <strong>Isi OPR</strong> — tanpa perlu membuka halaman OPR. Sesuai jika anda menyertai
            program dan laporan ditulis oleh penganjur atau rakan sektor.
          </p>
        </div>
      </div>
      <MyClient
        items={items.map((it) => ({
          ...it,
          tarikhPergi: it.tarikhPergi.toISOString(),
          tarikhKembali: it.tarikhKembali.toISOString(),
        }))}
      />
    </div>
  );
}
