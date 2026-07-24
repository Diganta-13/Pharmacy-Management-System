import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "Pharmacy Management System",
  description: "Admin and pharmacist dashboard for pharmacy operations.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
