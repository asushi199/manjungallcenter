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
  if (status === "TIADA") {
    return { label: "Tiada OPR", className: "bg-slate-200 text-slate-700" };
  }
  return null;
}

/** Belum ada rekod OPR atau draf — perlu tindakan. */
export function needsOprAction(
  jenis: "Pergerakan" | "Bercuti",
  oprStatus: OprStatus | null | undefined,
): boolean {
  if (jenis !== "Pergerakan") return false;
  if (oprStatus === "SIAP" || oprStatus === "TIADA") return false;
  return true;
}
