"use client";

import {
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import {
  usePathname,
  useRouter,
} from "next/navigation";

import type {
  LucideIcon,
} from "lucide-react";

import {
  Boxes,
  CircleAlert,
  LayoutDashboard,
  Loader2,
  LogOut,
  Package,
  Pill,
  Search,
  ShoppingCart,
  UserRound,
  Users,
} from "lucide-react";

/* =========================================================
   TYPES
========================================================= */

type MenuItem = {
  label: string;
  href: string;
  icon: LucideIcon;

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

type AuthRole =
  | "ADMIN"
  | "PHARMACIST";

type AuthUser = {
  id: number;

  fullName: string;

  email: string;

  role: AuthRole;

  lastLoginAt:
    | string
    | null;
};

type AuthMeResponse = {
  success: boolean;

  authenticated?: boolean;

  message?: string;

  data?: {
    user: AuthUser;

    home: string;
  };
};

type LogoutResponse = {
  success: boolean;

  message?: string;

  redirectTo?: string;
};

/* =========================================================
   MENU
========================================================= */

const menuItems:
  MenuItem[] = [
    {
      label:
        "Dashboard",

      href:
        "/pharmacist/dashboard",

      icon:
        LayoutDashboard,
    },

    {
      label:
        "Search Medicine",

      href:
        "/pharmacist/search-medicine",

      icon:
        Search,
    },

    {
      label:
        "Stock View",

      href:
        "/pharmacist/stock",

      icon:
        Boxes,
    },

    {
      label:
        "Sales & Billing",

      href:
        "/pharmacist/sales",

      icon:
        ShoppingCart,
    },

    {
      label:
        "Customers",

      href:
        "/pharmacist/customers",

      icon:
        Users,
    },

    {
      label:
        "Expiry Alerts",

      href:
        "/pharmacist/expiry-alerts",

      icon:
        CircleAlert,

      dynamicExpiryBadge:
        true,
    },

    {
      label:
        "Low Stock Alerts",

      href:
        "/pharmacist/low-stock-alerts",

      icon:
        Package,

      dynamicLowStockBadge:
        true,
    },

    {
      label:
        "My Profile",

      href:
        "/pharmacist/profile",

      icon:
        UserRound,
    },
  ];

/* =========================================================
   HELPERS
========================================================= */

function getInitial(
  name: string,
) {
  const cleanName =
    name.trim();

  if (!cleanName) {
    return "P";
  }

  return cleanName
    .charAt(0)
    .toUpperCase();
}

/* =========================================================
   COMPONENT
========================================================= */

export default function PharmacistSidebar() {
  const pathname =
    usePathname();

  const router =
    useRouter();

  /* =======================================================
     AUTH USER
  ======================================================= */

  const [
    currentUser,
    setCurrentUser,
  ] =
    useState<AuthUser | null>(
      null,
    );

  const [
    isUserLoading,
    setIsUserLoading,
  ] =
    useState(true);

  /* =======================================================
     LOGOUT
  ======================================================= */

  const [
    isSigningOut,
    setIsSigningOut,
  ] =
    useState(false);

  /* =======================================================
     ALERT COUNTS
  ======================================================= */

  const [
    lowStockCount,
    setLowStockCount,
  ] =
    useState(0);

  const [
    expiryCount,
    setExpiryCount,
  ] =
    useState(0);

  /* =======================================================
     LOAD LOGGED-IN USER
  ======================================================= */

  useEffect(() => {
    const controller =
      new AbortController();

    async function loadCurrentUser() {
      try {
        const response =
          await fetch(
            "/api/auth/me",
            {
              method:
                "GET",

              cache:
                "no-store",

              signal:
                controller.signal,
            },
          );

        const result =
          (await response.json()) as
            AuthMeResponse;

        if (
          controller.signal
            .aborted
        ) {
          return;
        }

        /* ===============================================
           NOT AUTHENTICATED
        =============================================== */

        if (
          !response.ok ||
          !result.success ||
          !result.authenticated ||
          !result.data
        ) {
          setCurrentUser(
            null,
          );

          setIsUserLoading(
            false,
          );

          router.replace(
            "/login",
          );

          return;
        }

        /* ===============================================
           WRONG ROLE
        =============================================== */

        if (
          result.data.user.role !==
          "PHARMACIST"
        ) {
          setCurrentUser(
            null,
          );

          setIsUserLoading(
            false,
          );

          router.replace(
            result.data.home ||
              "/admin/dashboard",
          );

          return;
        }

        /* ===============================================
           VALID PHARMACIST
        =============================================== */

        setCurrentUser(
          result.data.user,
        );

        setIsUserLoading(
          false,
        );
      } catch (error) {
        if (
          controller.signal
            .aborted
        ) {
          return;
        }

        console.error(
          "Pharmacist sidebar auth error:",
          error,
        );

        setCurrentUser(
          null,
        );

        setIsUserLoading(
          false,
        );
      }
    }

    void loadCurrentUser();

    return () => {
      controller.abort();
    };
  }, [
    router,
  ]);

  /* =======================================================
     LOAD ALERT COUNTS
  ======================================================= */

  useEffect(() => {
    let cancelled =
      false;

    async function loadCounts() {
      /* ===================================================
         LOW STOCK
      =================================================== */

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

        const result =
          (await response.json()) as
            LowStockApiResponse;

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
          "Pharmacist sidebar low stock error:",
          error,
        );
      }

      /* ===================================================
         EXPIRY
      =================================================== */

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

        const result =
          (await response.json()) as
            ExpiryApiResponse;

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

          setExpiryCount(
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
          "Pharmacist sidebar expiry error:",
          error,
        );
      }
    }

    void loadCounts();

    return () => {
      cancelled =
        true;
    };
  }, [
    pathname,
  ]);

  /* =======================================================
     REAL LOGOUT

     IMPORTANT:

     Old:
     <Link href="/login" />

     That did NOT remove the session cookie.

     New:
     POST /api/auth/logout
       ↓
     Cookie deleted
       ↓
     /login
  ======================================================= */

  async function handleSignOut() {
    if (
      isSigningOut
    ) {
      return;
    }

    try {
      setIsSigningOut(
        true,
      );

      const response =
        await fetch(
          "/api/auth/logout",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            cache:
              "no-store",
          },
        );

      let result:
        LogoutResponse;

      try {
        result =
          (await response.json()) as
            LogoutResponse;
      } catch {
        throw new Error(
          "Invalid logout response.",
        );
      }

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Unable to sign out.",
        );
      }

      /* ===================================================
         CLEAR LOCAL USER
      =================================================== */

      setCurrentUser(
        null,
      );

      /* ===================================================
         SESSION COOKIE WAS REMOVED BY SERVER

         Now /login will NOT be intercepted
         and redirected back to dashboard.
      =================================================== */

      router.replace(
        result.redirectTo ||
          "/login",
      );

      router.refresh();
    } catch (error) {
      console.error(
        "Pharmacist sign out error:",
        error,
      );

      /*
       * Do NOT pretend logout succeeded
       * if the API failed.
       */

      window.alert(
        error instanceof Error
          ? error.message
          : "Unable to sign out.",
      );
    } finally {
      setIsSigningOut(
        false,
      );
    }
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <aside className="hidden h-screen w-[240px] shrink-0 flex-col bg-[#173f61] text-white lg:sticky lg:top-0 lg:flex">
      {/* ===================================================
          BRAND
      =================================================== */}

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

      {/* ===================================================
          MENU
      =================================================== */}

      <div className="flex min-h-0 flex-1 flex-col">
        <p className="px-5 pb-2 pt-4 text-[10px] font-semibold uppercase tracking-wider text-[#6fa5c9]">
          Pharmacist Panel
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
                      "/pharmacist/dashboard" &&
                    pathname.startsWith(
                      `${item.href}/`,
                    )
                  );

                let badgeValue =
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
                    expiryCount;
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

      {/* ===================================================
          USER + LOGOUT
      =================================================== */}

      <div className="border-t border-white/10">
        {/* =================================================
            ACTUAL LOGGED-IN USER
        ================================================= */}

        <Link
          href="/pharmacist/profile"
          className="flex items-center gap-3 px-5 py-4 transition hover:bg-white/[0.03]"
        >
          {/* AVATAR */}

          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0797d5] text-sm font-semibold">
            {isUserLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              getInitial(
                currentUser
                  ?.fullName ||
                  "Pharmacist",
              )
            )}
          </div>

          {/* USER INFO */}

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">
              {isUserLoading
                ? "Loading..."
                : currentUser
                    ?.fullName ||
                  "Pharmacist"}
            </p>

            <p className="truncate text-[10px] text-[#81b5d5]">
              {isUserLoading
                ? "Checking session..."
                : currentUser
                    ?.email ||
                  ""}
            </p>
          </div>
        </Link>

        {/* =================================================
            REAL SIGN OUT BUTTON
        ================================================= */}

        <button
          type="button"
          onClick={() =>
            void handleSignOut()
          }
          disabled={
            isSigningOut
          }
          className="flex w-full items-center gap-3 px-5 pb-5 text-left text-[13px] text-[#9fc8df] transition hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSigningOut ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="h-4 w-4" />
          )}

          {isSigningOut
            ? "Signing Out..."
            : "Sign Out"}
        </button>
      </div>
    </aside>
  );
}