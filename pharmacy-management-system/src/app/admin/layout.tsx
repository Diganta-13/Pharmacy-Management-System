import type { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-6 py-5 shadow-sm">
        <div className="max-w-8xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Admin Dashboard</p>
            <h1 className="text-2xl font-semibold text-slate-900">Pharmacy Administration</h1>
          </div>
        </div>
      </header>

      <main className="px-6 py-8">{children}</main>
    </div>
  );
}
