import type { ReactNode } from "react";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";

type AdminLayoutProps = {
  children: ReactNode;
};

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-[#f4f7f9] lg:flex">
      <Sidebar />

      <div className="min-w-0 flex-1">
        <Navbar />

        <main className="min-h-[calc(100vh-64px)] p-4 sm:p-5 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}