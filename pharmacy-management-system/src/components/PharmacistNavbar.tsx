"use client";

import {
  AlertTriangle,
  Bell,
} from "lucide-react";

import {
  usePathname,
} from "next/navigation";

/* =========================================================
   PAGE TITLES
========================================================= */

const pageTitles:
  Record<string, string> = {
    "/pharmacist/dashboard":
      "Dashboard",

    "/pharmacist/search-medicine":
      "Search Medicine",

   "/pharmacist/stock":
  "Stock Management",
  
    "/pharmacist/sales":
      "Sales & Billing",

    "/pharmacist/customers":
      "Customers",

    "/pharmacist/expiry-alerts":
      "Expiry Alerts",

    "/pharmacist/low-stock-alerts":
      "Low Stock Alerts",

    "/pharmacist/profile":
      "My Profile",
  };

/* =========================================================
   COMPONENT
========================================================= */

export default function PharmacistNavbar() {
  const pathname =
    usePathname();

  const title =
    pageTitles[pathname] ??
    "Pharmacist Panel";

  return (
    <header className="sticky top-0 z-30 flex h-[64px] items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">

      <h2 className="text-[16px] font-semibold text-slate-900">
        {title}
      </h2>

      <div className="flex items-center gap-2 sm:gap-3">

        {/* ROLE */}

        <div className="hidden rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-medium text-emerald-700 sm:block">
          Pharmacist
        </div>

        {/* ALERTS
            Dynamic version আমরা dashboard step-এ
            current Navbar alert logic reuse করে দেব।
        */}

        <div className="hidden items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-xs font-medium text-orange-600 sm:flex">

          <AlertTriangle className="h-4 w-4" />

          Alerts

        </div>

        {/* BELL */}

        <button
          type="button"
          aria-label="Notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100"
        >
          <Bell className="h-5 w-5" />
        </button>

        {/* PROFILE */}

        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#078cc6] text-sm font-semibold text-white">
          S
        </div>

      </div>

    </header>
  );
}