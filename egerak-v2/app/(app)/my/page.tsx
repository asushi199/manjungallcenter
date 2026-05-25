import { listMine } from "@/lib/actions/pergerakan";
import MyClient from "./MyClient";

export const dynamic = "force-dynamic";

export default async function MyPage() {
  const items = await listMine();
  return (
    <div className="mx-auto max-w-5xl p-4">
      <div className="mb-4">
        <h1 className="text-xl font-semibold">Pergerakan Saya</h1>
        <p className="text-sm text-slate-500 mt-1">
          {items.length} rekod · warna mengikut sektor (sama seperti kalendar Utama)
        </p>
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
