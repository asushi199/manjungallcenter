import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";

const APP_NAME = "eGerak PPD Manjung";

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: "eGerak PPD Manjung",
  description: "Sistem pergerakan pegawai PPD Manjung",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "eGerak",
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#b81049",
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
