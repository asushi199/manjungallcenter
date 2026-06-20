import { formatInTimeZone } from "date-fns-tz";
import { listAllowedTakwimCreateSektorIds, listTakwimForMonth } from "@/lib/actions/takwim";
import { listAllSektors } from "@/lib/actions/users";
import { requireUser } from "@/lib/rbac";
import { TZ } from "@/lib/dates";
import { canAddTakwim, normalizeTakwimMonth, parseTakwimSektorParam } from "@/lib/takwim-utils";
import TakwimClient from "./TakwimClient";

export const dynamic = "force-dynamic";

type SearchParams = {
  month?: string;
  sektor?: string;
  lain?: string;
};

export default async function TakwimPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const user = await requireUser();
  const sektors = await listAllSektors();
  const fallbackMonth = formatInTimeZone(new Date(), TZ, "yyyy-MM");
  const month = normalizeTakwimMonth(sp.month, fallbackMonth);
  const ownSektorId =
    user.sektorId != null && Number.isFinite(Number(user.sektorId)) ? Number(user.sektorId) : null;
  const sektorSelection = parseTakwimSektorParam(sp.sektor, ownSektorId);
  const showOther = sp.lain === "1";
  const canCreateTakwim = canAddTakwim(user.peranan);
  const allowedAddSektorIds = canCreateTakwim ? await listAllowedTakwimCreateSektorIds() : [];
  const items = await listTakwimForMonth({
    month,
    sektorIds: sektorSelection,
  });

  return (
    <TakwimClient
      month={month}
      sektors={sektors.map((s) => ({ id: s.id, code: s.code, name: s.name }))}
      selectedSektorIds={sektorSelection === "all" ? [] : sektorSelection}
      isAllSectors={sektorSelection === "all"}
      hasOwnSektor={ownSektorId != null}
      showOther={showOther}
      canCreateTakwim={canCreateTakwim}
      addSektors={sektors
        .filter((s) => allowedAddSektorIds == null || allowedAddSektorIds.includes(s.id))
        .map((s) => ({ id: s.id, code: s.code, name: s.name }))}
      items={items.map((it) => ({
        ...it,
        tarikhPergi: it.tarikhPergi.toISOString(),
        tarikhKembali: it.tarikhKembali.toISOString(),
      }))}
    />
  );
}
