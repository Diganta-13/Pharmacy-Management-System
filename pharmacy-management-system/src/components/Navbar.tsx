"use client";

import { AlertTriangle, Bell } from "lucide-react";
import { usePathname } from "next/navigation";

const pageTitles: Record<string, string> = {
  "/admin/dashboard": "Dashboard",
  "/admin/medicines": "Medicines",
  "/admin/categories": "Category Management",
  "/admin/stock": "Stock",
  "/admin/purchase": "Purchase",
  "/admin/sales": "Sales & Billing",
  "/admin/suppliers": "Suppliers",
  "/admin/customers": "Customers",
  "/admin/employees": "Employee Management",
  "/admin/reports": "Reports",
  "/admin/expiry-alerts": "Expiry Alerts",
  "/admin/low-stock-alerts": "Low Stock Alerts",
  "/admin/settings": "Settings",
};

export default function Navbar() {
  const pathname = usePathname();

  const title = pageTitles[pathname] ?? "Admin Panel";

  return (
    <header className="sticky top-0 z-30 flex h-[64px] items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
      <h2 className="text-[16px] font-semibold text-slate-900">{title}</h2>

      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          className="hidden rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-xs font-medium text-sky-700 sm:block"
        >
          Administrator
        </button>

        <button
          type="button"
          className="hidden items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-xs font-medium text-orange-600 sm:flex"
        >
          <AlertTriangle className="h-4 w-4" />
          4 alerts
        </button>

        <button
          type="button"
          aria-label="Notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100"
        >
          <Bell className="h-5 w-5" />

          <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-semibold text-white">
            4
          </span>
        </button>

        <button
          type="button"
          aria-label="Admin profile"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[#078cc6] text-sm font-semibold text-white"
        >
          A
        </button>
      </div>
    </header>
  );
}