"use client";

import { useEffect, useRef } from "react";

/** Selepas pilih hari pada kalendar, scroll ke senarai kad (tanpa reload ke atas). */
export default function DashboardScrollSync({ date }: { date: string }) {
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const el = document.getElementById("senarai-pergerakan");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [date]);
  return null;
}
