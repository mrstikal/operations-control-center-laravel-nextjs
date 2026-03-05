import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "OCC Frontend",
  description: "Operations Control Center",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="cs">
      <body>{children}</body>
    </html>
  );
}

