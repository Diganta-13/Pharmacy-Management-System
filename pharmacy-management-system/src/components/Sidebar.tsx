"use client";

import {
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import {
  usePathname,
} from "next/navigation";

import type {
  LucideIcon,
} from "lucide-react";

import {
  Boxes,
  ChartNoAxesColumnIncreasing,
  CircleAlert,
  ClipboardPlus,
  LayoutDashboard,
  LogOut,
  Package,
  Pill,
  Settings,
  ShoppingCart,
  Tags,
  Truck,
  UserRoundCog,
  Users,
} from "lucide-react";

/* =========================================================
   TYPES
========================================================= */

type MenuItem = {
  label: string;

  href: string;

  icon: LucideIcon;

  badge?: number;

  dynamicLowStockBadge?: boolean;

  dynamicExpiryBadge?: boolean;
};

type LowStockApiResponse = {
  success: boolean;

  data?: {
    summary?: {
      totalAffected?: number;
    };
  };
};

type ExpiryApiResponse = {
  success: boolean;

  data?: {
    summary?: {
      totalAffected?: number;
    };
  };
};

/* =========================================================
   MENU ITEMS
========================================================= */

const menuItems:
  MenuItem[] = [
    {
      label:
        "Dashboard",

      href:
        "/admin/dashboard",

      icon:
        LayoutDashboard,
    },

    {
      label:
        "Medicines",

      href:
        "/admin/medicines",

      icon:
        Pill,
    },

    {
      label:
        "Categories",

      href:
        "/admin/categories",

      icon:
        Tags,
    },

    {
      label:
        "Stock",

      href:
        "/admin/stock",

      icon:
        Boxes,
    },

    {
      label:
        "Purchase",

      href:
        "/admin/purchase",

      icon:
        ClipboardPlus,
    },

    {
      label:
        "Sales & Billing",

      href:
        "/admin/sales",

      icon:
        ShoppingCart,
    },

    {
      label:
        "Suppliers",

      href:
        "/admin/suppliers",

      icon:
        Truck,
    },

    {
      label:
        "Customers",

      href:
        "/admin/customers",

      icon:
        Users,
    },

    {
      label:
        "Employee Mgmt.",

      href:
        "/admin/employees",

      icon:
        UserRoundCog,
    },

    {
      label:
        "Reports",

      href:
        "/admin/reports",

      icon:
        ChartNoAxesColumnIncreasing,
    },

    {
      label:
        "Expiry Alerts",

      href:
        "/admin/expiry-alerts",

      icon:
        CircleAlert,

      dynamicExpiryBadge:
        true,
    },

    {
      label:
        "Low Stock Alerts",

      href:
        "/admin/low-stock-alerts",

      icon:
        Package,

      dynamicLowStockBadge:
        true,
    },

    {
      label:
        "Settings",

      href:
        "/admin/settings",

      icon:
        Settings,
    },
  ];

/* =========================================================
   SIDEBAR
========================================================= */

export default function Sidebar() {
  const pathname =
    usePathname();

  const [
    lowStockCount,
    setLowStockCount,
  ] =
    useState(0);

  const [
    expiryAlertCount,
    setExpiryAlertCount,
  ] =
    useState(0);

  /* =======================================================
     LOAD DYNAMIC ALERT COUNTS
  ======================================================= */

  useEffect(
    () => {
      let cancelled =
        false;

      async function loadAlertCounts() {
        /* ===============================================
           LOW STOCK
        =============================================== */

        try {
          const response =
            await fetch(
              "/api/low-stock",
              {
                method:
                  "GET",

                cache:
                  "no-store",
              },
            );

          const result:
            LowStockApiResponse =
            await response.json();

          if (
            !cancelled &&
            response.ok &&
            result.success
          ) {
            const count =
              Number(
                result.data
                  ?.summary
                  ?.totalAffected ??
                  0,
              );

            setLowStockCount(
              Number.isFinite(
                count,
              )
                ? Math.max(
                    0,
                    count,
                  )
                : 0,
            );
          }
        } catch (error) {
          console.error(
            "Sidebar low stock count error:",
            error,
          );
        }

        /* ===============================================
           EXPIRY
        =============================================== */

        try {
          const response =
            await fetch(
              "/api/expiry-alerts",
              {
                method:
                  "GET",

                cache:
                  "no-store",
              },
            );

          const result:
            ExpiryApiResponse =
            await response.json();

          if (
            !cancelled &&
            response.ok &&
            result.success
          ) {
            const count =
              Number(
                result.data
                  ?.summary
                  ?.totalAffected ??
                  0,
              );

            setExpiryAlertCount(
              Number.isFinite(
                count,
              )
                ? Math.max(
                    0,
                    count,
                  )
                : 0,
            );
          }
        } catch (error) {
          console.error(
            "Sidebar expiry count error:",
            error,
          );
        }
      }

      void loadAlertCounts();

      return () => {
        cancelled =
          true;
      };
    },
    [
      pathname,
    ],
  );

  /* =======================================================
     UI
  ======================================================= */

  return (
    <aside className="hidden h-screen w-[240px] shrink-0 flex-col bg-[#173f61] text-white lg:sticky lg:top-0 lg:flex">

      {/* BRAND */}

      <div className="flex h-[86px] items-center gap-3 border-b border-white/10 px-5">

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0e6797]">

          <Pill className="h-5 w-5 text-[#75d1ff]" />

        </div>

        <div className="min-w-0">

          <h1 className="truncate text-sm font-semibold">
            Green Life Pharmacy
          </h1>

          <p className="text-[10px] text-[#72b6df]">
            Management System
          </p>

        </div>

      </div>

      {/* NAVIGATION */}

      <div className="flex min-h-0 flex-1 flex-col">

        <p className="px-5 pb-2 pt-4 text-[10px] font-semibold uppercase tracking-wider text-[#6fa5c9]">
          Admin Panel
        </p>

        <nav className="flex-1 overflow-y-auto px-2 pb-4">

          <div className="space-y-1">

            {menuItems.map(
              (
                item,
              ) => {
                const Icon =
                  item.icon;

                const isActive =
                  pathname ===
                    item.href ||

                  (
                    item.href !==
                      "/admin/dashboard" &&

                    pathname.startsWith(
                      `${item.href}/`,
                    )
                  );

                let badgeValue =
                  item.badge ??
                  0;

                if (
                  item.dynamicLowStockBadge
                ) {
                  badgeValue =
                    lowStockCount;
                }

                if (
                  item.dynamicExpiryBadge
                ) {
                  badgeValue =
                    expiryAlertCount;
                }

                return (
                  <Link
                    key={
                      item.href
                    }
                    href={
                      item.href
                    }
                    className={`flex h-[38px] items-center gap-3 rounded-xl px-3 text-[13px] transition ${
                      isActive
                        ? "border border-[#248bc0] bg-[#135d88] text-[#7fd5ff]"
                        : "text-[#a8d1ea] hover:bg-white/5 hover:text-white"
                    }`}
                  >

                    <Icon className="h-[17px] w-[17px] shrink-0" />

                    <span className="flex-1 truncate">
                      {
                        item.label
                      }
                    </span>

                    {badgeValue >
                    0 ? (

                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1.5 text-[10px] font-semibold text-white">

                        {
                          badgeValue
                        }

                      </span>

                    ) : null}

                  </Link>
                );
              },
            )}

          </div>

        </nav>

      </div>

      {/* USER */}

      <div className="border-t border-white/10">

        <div className="flex items-center gap-3 px-5 py-4">

          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0797d5] text-sm font-semibold">
            A
          </div>

          <div className="min-w-0">

            <p className="truncate text-sm font-semibold">
              Admin User
            </p>

            <p className="truncate text-[10px] text-[#81b5d5]">
              admin@greenlifepharmacy.com
            </p>

          </div>

        </div>

        <Link
          href="/login"
          className="flex items-center gap-3 px-5 pb-5 text-[13px] text-[#9fc8df] transition hover:text-white"
        >

          <LogOut className="h-4 w-4" />

          Sign Out

        </Link>

      </div>

    </aside>
  );
}