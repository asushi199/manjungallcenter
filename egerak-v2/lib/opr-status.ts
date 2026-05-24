export type OprStatus = "TIADA" | "DRAFT" | "SIAP";

export function oprStatusBadge(status: OprStatus | null | undefined): {
  label: string;
  className: string;
} | null {
  if (status === "SIAP") {
    return { label: "OPR Siap", className: "bg-emerald-100 text-emerald-800" };
  }
  if (status === "DRAFT") {
    return { label: "OPR Draf", className: "bg-amber-100 text-amber-800" };
  }
  return null;
}
