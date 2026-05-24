import FilterBar from "@/components/FilterBar";
import { listAllSektors } from "@/lib/actions/users";

export default async function DashboardFilters({
  date,
  month,
  sektorIds,
  includeCuti,
  showSchoolHolidays,
}: {
  date: string;
  month: string;
  sektorIds: number[];
  includeCuti: boolean;
  showSchoolHolidays: boolean;
}) {
  const sektors = await listAllSektors();
  return (
    <FilterBar
      sektors={sektors.map((s) => ({ id: s.id, code: s.code, name: s.name }))}
      current={{ date, month, sektorIds, includeCuti, showSchoolHolidays }}
    />
  );
}
