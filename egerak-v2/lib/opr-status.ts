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

/**
 * Penunjuk status OPR ringkas (titik warna + label) untuk baris meta kad.
 * Berbeza dengan `oprStatusBadge`: turut memaparkan keadaan "Perlu OPR"
 * (belum ada rekod) supaya semua kategori penapis terwakil pada kad.
 */
export function oprStatusIndicator(
  jenis: "Pergerakan" | "Bercuti",
  status: OprStatus | null | undefined,
): { label: string; dotClass: string } | null {
  if (jenis !== "Pergerakan") return null;
  if (status === "SIAP") return { label: "OPR Siap", dotClass: "bg-emerald-500" };
  if (status === "DRAFT") return { label: "OPR Draf", dotClass: "bg-amber-500" };
  if (status === "TIADA") return { label: "Tiada OPR", dotClass: "bg-slate-400" };
  return { label: "Perlu OPR", dotClass: "bg-red-500" };
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
