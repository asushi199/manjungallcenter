"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  OPR_PRINT_MARGIN_Y_MM,
  OPR_PRINT_PAGE_HEIGHT_MM,
  OPR_PRINT_PAGE_WIDTH_MM,
  OPR_PRINT_SCREEN_HEIGHT_FACTOR,
  OPR_PRINT_ZOOM_DEADZONE,
  OPR_PRINT_ZOOM_MIN,
} from "@/lib/opr-print-page";

/**
 * Pratonton skrin: kecilkan helaian A4 mengikut lebar skrin (telefon).
 * Cetakan: ukur tinggi kandungan vs kawasan boleh cetak, lalu `zoom` supaya
 * cuba muat satu muka surat (transform CSS tidak mengecilkan jejak pagination).
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

  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;

    const clearPrintZoom = () => {
      const article = sheet.querySelector<HTMLElement>(".opr-print");
      article?.style.removeProperty("zoom");
    };

    const applyPrintZoom = () => {
      const article = sheet.querySelector<HTMLElement>(".opr-print");
      if (!article) return;

      clearPrintZoom();

      // Helaian skrin = mock A4 penuh (padding meniru jidar). Bandingkan
      // tinggi keseluruhan dengan tinggi kertas — lebih stabil daripada
      // (kandungan vs kawasan boleh cetak) yang mudah tersilap bila padding
      // sudah 0 semasa beforeprint.
      const sheetWidthPx = sheet.offsetWidth || 1;
      const pxPerMm = sheetWidthPx / OPR_PRINT_PAGE_WIDTH_MM;
      const pageHeightPx = OPR_PRINT_PAGE_HEIGHT_MM * pxPerMm;

      const cs = getComputedStyle(article);
      const padY = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
      // Jika media print sudah aktif (padding 0), anggap jidar @page masih
      // perlu ruang — tambah balik margin Y supaya nisbah sama seperti mock skrin.
      const marginPadPx =
        padY > 1 ? 0 : 2 * OPR_PRINT_MARGIN_Y_MM * pxPerMm;
      const mockPageHeightPx = article.offsetHeight + marginPadPx;

      const adjustedHeightPx = mockPageHeightPx / OPR_PRINT_SCREEN_HEIGHT_FACTOR;
      let zoom = pageHeightPx / Math.max(1, adjustedHeightPx);

      if (zoom >= OPR_PRINT_ZOOM_DEADZONE) {
        zoom = 1;
      } else {
        zoom = Math.min(1, Math.max(OPR_PRINT_ZOOM_MIN, zoom));
      }

      if (zoom < 0.999) {
        article.style.setProperty("zoom", String(Number(zoom.toFixed(4))));
      }
    };

    window.addEventListener("beforeprint", applyPrintZoom);
    window.addEventListener("afterprint", clearPrintZoom);
    return () => {
      window.removeEventListener("beforeprint", applyPrintZoom);
      window.removeEventListener("afterprint", clearPrintZoom);
      clearPrintZoom();
    };
  }, []);

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
