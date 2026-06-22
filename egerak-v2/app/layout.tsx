import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});
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
    <html lang="ms" className={fontSans.variable}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
