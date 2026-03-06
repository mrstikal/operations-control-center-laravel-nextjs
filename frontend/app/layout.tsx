import "@material-symbols/font-400/outlined.css";
import "./globals.css";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Roboto } from "next/font/google";
import AppChrome from "@/components/AppChrome";
import ConfirmProvider from "@/components/providers/ConfirmProvider";
import CurrentUserProvider from "@/components/providers/CurrentUserProvider";
import ToastProvider from "@/components/providers/ToastProvider";

export const metadata: Metadata = {
  title: "OCC Frontend",
  description: "Operations Control Center",
};

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="cs">
      <body className={`${roboto.className} antialiased`}>
        <ToastProvider>
          <ConfirmProvider>
            <CurrentUserProvider>
              <div className="min-w-7xl overflow-x-auto">
                <AppChrome>{children}</AppChrome>
              </div>
              </CurrentUserProvider>
            </ConfirmProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
