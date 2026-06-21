"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Pratonton skrin sahaja: kecilkan keseluruhan helaian A4 (lebar tetap 210mm)
 * supaya muat lebar skrin telefon mengikut nisbah sebenar — tanpa menjejaskan
 * cetakan (transform dimatikan dalam @media print melalui globals.css).
 */
export default function OprPrintScaler({ children }: { children: React.ReactNode }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [outerHeight, setOuterHeight] = useState<number | undefined>(undefined);

  const recompute = useCallback(() => {
    const outer = outerRef.current;
    const sheet = sheetRef.current;
    if (!outer || !sheet) return;
    const avail = outer.clientWidth;
    const natural = sheet.offsetWidth || 1; // pra-transform (210mm dalam px)
    const next = Math.min(1, avail / natural);
    setScale(next);
    setOuterHeight(next < 1 ? sheet.offsetHeight * next : undefined);
  }, []);

  useEffect(() => {
    recompute();
    const ro = new ResizeObserver(recompute);
    if (outerRef.current) ro.observe(outerRef.current);
    if (sheetRef.current) ro.observe(sheetRef.current);
    window.addEventListener("resize", recompute);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", recompute);
    };
  }, [recompute]);

  return (
    <div
      ref={outerRef}
      className="opr-scaler-outer"
      style={outerHeight ? { height: outerHeight } : undefined}
    >
      <div
        ref={sheetRef}
        className="opr-scaler-sheet"
        style={{
          width: "210mm",
          margin: scale < 1 ? 0 : "0 auto",
          transform: scale < 1 ? `scale(${scale})` : undefined,
          transformOrigin: "top left",
        }}
      >
        {children}
      </div>
    </div>
  );
}
