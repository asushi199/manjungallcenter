import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "eGerak PPD Manjung",
  description: "Sistem pergerakan pegawai PPD Manjung",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ms">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
