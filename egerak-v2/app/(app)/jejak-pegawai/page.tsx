import { listPegawaiForJejak, getPegawaiJejak } from "@/lib/actions/jejak-pegawai";
import { requireJejakPegawaiAccess } from "@/lib/rbac";
import { canTrackAllPegawai } from "@/lib/roles";
import { listAllSektors } from "@/lib/actions/users";
import JejakPegawaiClient from "./JejakPegawaiClient";

export const dynamic = "force-dynamic";

type SP = { pegawai?: string; year?: string };

export default async function JejakPegawaiPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const user = await requireJejakPegawaiAccess();
  const currentYear = new Date().getFullYear();
  const year = sp.year === "all" ? undefined : Number(sp.year || currentYear);
  const pegawaiId = sp.pegawai ? Number(sp.pegawai) : null;
  const canViewAll = canTrackAllPegawai(user.peranan);

  const pegawaiList = await listPegawaiForJejak();
  const selected =
    pegawaiId && Number.isFinite(pegawaiId)
      ? await getPegawaiJejak(pegawaiId, year)
      : null;

  const lockedSektorName =
    !canViewAll && user.sektorId != null
      ? ((await listAllSektors()).find((s) => s.id === Number(user.sektorId))?.name ?? null)
      : null;

  return (
    <JejakPegawaiClient
      pegawaiList={pegawaiList}
      selected={
        selected
          ? {
              pegawai: selected.pegawai,
              summary: selected.summary,
              items: selected.items.map((it) => ({
                ...it,
                tarikhPergi: it.tarikhPergi.toISOString(),
                tarikhKembali: it.tarikhKembali.toISOString(),
              })),
            }
          : null
      }
      selectedId={pegawaiId}
      notFound={pegawaiId != null && selected == null}
      year={year ?? "all"}
      currentYear={currentYear}
      canViewAll={canViewAll}
      lockedSektorName={lockedSektorName}
    />
  );
}
