import type {
  ReactNode,
} from "react";

import PharmacistNavbar from "@/components/PharmacistNavbar";
import PharmacistSidebar from "@/components/PharmacistSidebar";

type PharmacistLayoutProps = {
  children: ReactNode;
};

export default function PharmacistLayout({
  children,
}: PharmacistLayoutProps) {
  return (
    <div className="min-h-screen bg-[#f4f7f9] lg:flex">
      {/* ONLY ONE SIDEBAR */}
      <PharmacistSidebar />

      {/* MAIN AREA */}
      <div className="min-w-0 flex-1">
        {/* ONLY ONE NAVBAR */}
        <PharmacistNavbar />

        <main className="min-h-[calc(100vh-64px)] p-4 sm:p-5 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}