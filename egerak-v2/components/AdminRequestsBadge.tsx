"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { countPendingBookingRequests } from "@/lib/actions/rooms";

/**
 * Lencana merah bilangan permohonan tempahan menunggu kelulusan.
 * Dipaparkan pada menu "Admin" supaya pentadbir nampak sebaik log masuk.
 */
export default function AdminRequestsBadge() {
  const path = usePathname();
  const [count, setCount] = useState(0);

  useEffect(() => {
    let active = true;
    countPendingBookingRequests()
      .then((n) => {
        if (active) setCount(n);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [path]);

  if (count <= 0) return null;
  return (
    <span
      className="absolute -right-1 -top-1 inline-flex min-w-[1.05rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-4 text-white ring-2 ring-brand-700"
      aria-label={`${count} permohonan menunggu`}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}
