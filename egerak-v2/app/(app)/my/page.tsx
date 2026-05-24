import { listMine } from "@/lib/actions/pergerakan";
import MyClient from "./MyClient";

export const dynamic = "force-dynamic";

export default async function MyPage() {
  const items = await listMine();
  return (
    <div className="mx-auto max-w-5xl p-4">
      <h1 className="text-xl font-semibold mb-3">Pergerakan Saya ({items.length})</h1>
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
