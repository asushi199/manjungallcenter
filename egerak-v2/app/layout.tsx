import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";
import {
  APP_DESCRIPTION,
  APP_DISPLAY_NAME,
  APP_SHORT_NAME,
  BRAND_THEME_COLOR,
} from "@/lib/branding";

export const metadata: Metadata = {
  applicationName: APP_DISPLAY_NAME,
  title: APP_DISPLAY_NAME,
  description: APP_DESCRIPTION,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_SHORT_NAME,
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: BRAND_THEME_COLOR,
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
