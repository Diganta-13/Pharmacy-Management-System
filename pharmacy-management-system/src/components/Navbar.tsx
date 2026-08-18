"use client";

import Link from "next/link";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  AlertTriangle,
  Bell,
  CheckCircle2,
} from "lucide-react";

import {
  usePathname,
} from "next/navigation";

/* =========================================================
   PAGE TITLES
========================================================= */

const pageTitles: Record<
  string,
  string
> = {
  "/admin/dashboard":
    "Dashboard",

  "/admin/medicines":
    "Medicines",

  "/admin/categories":
    "Category Management",

  "/admin/stock":
    "Stock",

  "/admin/purchase":
    "Purchase",

  "/admin/sales":
    "Sales & Billing",

  "/admin/suppliers":
    "Suppliers",

  "/admin/customers":
    "Customers",

  "/admin/employees":
    "Employee Management",

  "/admin/reports":
    "Reports",

  "/admin/expiry-alerts":
    "Expiry Alerts",

  "/admin/low-stock-alerts":
    "Low Stock Alerts",

  "/admin/settings":
    "Settings",
};

/* =========================================================
   TYPES
========================================================= */

type LowStockStatus =
  | "LOW_STOCK"
  | "OUT_OF_STOCK";

type ExpiryStatus =
  | "EXPIRED"
  | "CRITICAL"
  | "NEAR_EXPIRY";

type AlertKind =
  | LowStockStatus
  | ExpiryStatus;

type LowStockItem = {
  databaseId: number;

  medicineName: string;

  availableQty: number;

  minimumRequired: number;

  baseUnit: string;

  status:
    LowStockStatus;
};

type LowStockApiResponse = {
  success: boolean;

  message?: string;

  data?: {
    summary: {
      outOfStock: number;

      lowStock: number;

      totalAffected: number;
    };

    items:
      LowStockItem[];
  };
};

type ExpiryItem = {
  id: number;

  medicineId: number;

  medicineCode: string;

  medicineName: string;

  batchNo: string;

  daysLeft: number;

  status:
    ExpiryStatus;
};

type ExpiryApiResponse = {
  success: boolean;

  message?: string;

  data?: {
    summary: {
      expired: number;

      expiring15: number;

      expiring30: number;

      totalAffected: number;
    };

    items:
      ExpiryItem[];
  };
};

type NavbarAlert = {
  key: string;

  kind:
    AlertKind;

  title: string;

  message: string;

  href: string;
};

/* =========================================================
   LOCAL STORAGE
========================================================= */

const SEEN_ALERTS_KEY =
  "green-life-pharmacy-seen-alerts";

/* =========================================================
   HELPERS
========================================================= */

function safeNumber(
  value: unknown,
) {
  const parsed =
    Number(value);

  if (
    !Number.isFinite(
      parsed,
    )
  ) {
    return 0;
  }

  return parsed;
}

function formatQuantity(
  value: number,
) {
  return new Intl.NumberFormat(
    "en-BD",
    {
      maximumFractionDigits:
        3,
    },
  ).format(
    safeNumber(value),
  );
}

function pluralDay(
  value: number,
) {
  return Math.abs(value) ===
    1
    ? "day"
    : "days";
}

function getExpiryMessage(
  item: ExpiryItem,
) {
  const daysLeft =
    safeNumber(
      item.daysLeft,
    );

  if (
    daysLeft < 0
  ) {
    const expiredDays =
      Math.abs(
        daysLeft,
      );

    return `Batch ${item.batchNo} expired ${expiredDays} ${pluralDay(
      expiredDays,
    )} ago`;
  }

  if (
    daysLeft === 0
  ) {
    return `Batch ${item.batchNo} expires today`;
  }

  return `Batch ${item.batchNo} expires in ${daysLeft} ${pluralDay(
    daysLeft,
  )}`;
}

function getStatusLabel(
  kind: AlertKind,
) {
  switch (kind) {
    case "OUT_OF_STOCK":
      return "Out of Stock";

    case "LOW_STOCK":
      return "Low Stock";

    case "EXPIRED":
      return "Expired";

    case "CRITICAL":
      return "Critical Expiry";

    default:
      return "Near Expiry";
  }
}

function getStatusDotClass(
  kind: AlertKind,
) {
  switch (kind) {
    case "OUT_OF_STOCK":
    case "EXPIRED":
      return "bg-rose-500";

    case "CRITICAL":
      return "bg-orange-500";

    case "LOW_STOCK":
    case "NEAR_EXPIRY":
      return "bg-amber-500";

    default:
      return "bg-slate-400";
  }
}

function getStatusBadgeClass(
  kind: AlertKind,
) {
  switch (kind) {
    case "OUT_OF_STOCK":
    case "EXPIRED":
      return "bg-rose-50 text-rose-600";

    case "CRITICAL":
      return "bg-orange-50 text-orange-700";

    case "LOW_STOCK":
    case "NEAR_EXPIRY":
      return "bg-amber-50 text-amber-700";

    default:
      return "bg-slate-100 text-slate-600";
  }
}

function getSeverityPriority(
  kind: AlertKind,
) {
  switch (kind) {
    case "OUT_OF_STOCK":
      return 1;

    case "EXPIRED":
      return 2;

    case "CRITICAL":
      return 3;

    case "LOW_STOCK":
      return 4;

    case "NEAR_EXPIRY":
      return 5;

    default:
      return 99;
  }
}

/* =========================================================
   LOCAL STORAGE HELPERS
========================================================= */

function readSeenAlertKeys() {
  if (
    typeof window ===
    "undefined"
  ) {
    return [] as string[];
  }

  try {
    const raw =
      window.localStorage.getItem(
        SEEN_ALERTS_KEY,
      );

    if (!raw) {
      return [];
    }

    const parsed =
      JSON.parse(raw);

    if (
      !Array.isArray(
        parsed,
      )
    ) {
      return [];
    }

    return parsed.filter(
      (
        value,
      ): value is string =>
        typeof value ===
        "string",
    );
  } catch {
    return [];
  }
}

function saveSeenAlertKeys(
  keys: string[],
) {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  try {
    window.localStorage.setItem(
      SEEN_ALERTS_KEY,

      JSON.stringify(
        keys,
      ),
    );
  } catch {
    // localStorage unavailable:
    // notification still works
    // for current page session.
  }
}

/* =========================================================
   FETCH ACTIVE ALERTS
========================================================= */

async function fetchNavbarAlerts(
  signal?: AbortSignal,
): Promise<NavbarAlert[]> {
  const [
    lowStockResponse,
    expiryResponse,
  ] =
    await Promise.all([
      fetch(
        "/api/low-stock",
        {
          cache:
            "no-store",

          signal,
        },
      ),

      fetch(
        "/api/expiry-alerts",
        {
          cache:
            "no-store",

          signal,
        },
      ),
    ]);

  const lowStockResult =
    (await lowStockResponse.json()) as
      LowStockApiResponse;

  const expiryResult =
    (await expiryResponse.json()) as
      ExpiryApiResponse;

  if (
    !lowStockResponse.ok ||
    !lowStockResult.success
  ) {
    throw new Error(
      lowStockResult.message ??
        "Failed to load low stock alerts.",
    );
  }

  if (
    !expiryResponse.ok ||
    !expiryResult.success
  ) {
    throw new Error(
      expiryResult.message ??
        "Failed to load expiry alerts.",
    );
  }

  const alerts:
    NavbarAlert[] = [];

  /* =======================================================
     LOW STOCK / OUT OF STOCK
  ======================================================= */

  for (
    const item of
    lowStockResult.data
      ?.items ?? []
  ) {
    const stock =
      safeNumber(
        item.availableQty,
      );

    const minimum =
      safeNumber(
        item.minimumRequired,
      );

    const baseUnit =
      item.baseUnit ??
      "Unit";

    alerts.push({
      /*
       * Status is part of key.
       *
       * Example:
       * LOW_STOCK -> OUT_OF_STOCK
       * becomes a fresh notification.
       */
      key:
        `stock:${item.databaseId}:${item.status}`,

      kind:
        item.status,

      title:
        item.medicineName,

      message:
        item.status ===
        "OUT_OF_STOCK"
          ? `No sellable stock · reorder level ${formatQuantity(
              minimum,
            )} ${baseUnit}`
          : `${formatQuantity(
              stock,
            )} ${baseUnit} available · reorder at ${formatQuantity(
              minimum,
            )}`,

      href:
        "/admin/low-stock-alerts",
    });
  }

  /* =======================================================
     EXPIRY
  ======================================================= */

  for (
    const item of
    expiryResult.data
      ?.items ?? []
  ) {
    alerts.push({
      key:
        `expiry:${item.id}:${item.status}`,

      kind:
        item.status,

      title:
        item.medicineName,

      message:
        getExpiryMessage(
          item,
        ),

      href:
        "/admin/expiry-alerts",
    });
  }

  /* =======================================================
     IMPORTANT ALERTS FIRST
  ======================================================= */

  alerts.sort(
    (
      first,
      second,
    ) => {
      const priority =
        getSeverityPriority(
          first.kind,
        ) -
        getSeverityPriority(
          second.kind,
        );

      if (
        priority !== 0
      ) {
        return priority;
      }

      return first.title.localeCompare(
        second.title,
      );
    },
  );

  return alerts;
}

/* =========================================================
   NAVBAR
========================================================= */

export default function Navbar() {
  const pathname =
    usePathname();

  const title =
    pageTitles[pathname] ??
    "Admin Panel";

  const [
    alerts,
    setAlerts,
  ] =
    useState<
      NavbarAlert[]
    >([]);

  const [
    seenKeys,
    setSeenKeys,
  ] =
    useState<string[]>(
      [],
    );

  const [
    alertsOpen,
    setAlertsOpen,
  ] =
    useState(false);

  const [
    notificationsOpen,
    setNotificationsOpen,
  ] =
    useState(false);

  const [
    alertError,
    setAlertError,
  ] =
    useState("");

  const menuRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  /* =======================================================
     LOAD ALERTS

     Reload when route changes so Navbar stays fresh after:
     - receiving purchase
     - sale
     - stock adjustment
     - expiry changes
  ======================================================= */

  useEffect(() => {
    const controller =
      new AbortController();

    fetchNavbarAlerts(
      controller.signal,
    )
      .then(
        (
          freshAlerts,
        ) => {
          if (
            controller.signal
              .aborted
          ) {
            return;
          }

          setAlerts(
            freshAlerts,
          );

          setAlertError(
            "",
          );

          /*
           * Remove old "seen" keys when an alert
           * has actually been resolved.
           *
           * This means:
           * if the same problem disappears and
           * later returns, it becomes unread again.
           */

          const activeKeys =
            new Set(
              freshAlerts.map(
                (
                  alert,
                ) =>
                  alert.key,
              ),
            );

          const previousSeen =
            readSeenAlertKeys();

          const cleanedSeen =
            previousSeen.filter(
              (
                key,
              ) =>
                activeKeys.has(
                  key,
                ),
            );

          setSeenKeys(
            cleanedSeen,
          );

          saveSeenAlertKeys(
            cleanedSeen,
          );
        },
      )
      .catch(
        (error) => {
          if (
            controller.signal
              .aborted
          ) {
            return;
          }

          console.error(
            "Navbar alert load error:",
            error,
          );

          setAlertError(
            error instanceof Error
              ? error.message
              : "Could not load alerts.",
          );
        },
      );

    return () => {
      controller.abort();
    };
  }, [pathname]);

  /* =======================================================
     CLICK OUTSIDE DROPDOWN
  ======================================================= */

  useEffect(() => {
    function handleClickOutside(
      event: MouseEvent,
    ) {
      if (
        !menuRef.current
      ) {
        return;
      }

      if (
        event.target instanceof
          Node &&
        !menuRef.current.contains(
          event.target,
        )
      ) {
        setAlertsOpen(
          false,
        );

        setNotificationsOpen(
          false,
        );
      }
    }

    document.addEventListener(
      "mousedown",
      handleClickOutside,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside,
      );
    };
  }, []);

  /* =======================================================
     UNREAD
  ======================================================= */

  const unreadAlerts =
    useMemo(
      () =>
        alerts.filter(
          (
            alert,
          ) =>
            !seenKeys.includes(
              alert.key,
            ),
        ),

      [
        alerts,
        seenKeys,
      ],
    );

  const unreadCount =
    unreadAlerts.length;

  const activeAlertCount =
    alerts.length;

  /* =======================================================
     MARK CURRENT NOTIFICATIONS AS READ
  ======================================================= */

  function markCurrentAlertsAsRead() {
    const currentKeys =
      alerts.map(
        (
          alert,
        ) =>
          alert.key,
      );

    setSeenKeys(
      currentKeys,
    );

    saveSeenAlertKeys(
      currentKeys,
    );
  }

  /* =======================================================
     ALERT BUTTON
  ======================================================= */

  function handleAlertsClick() {
    setNotificationsOpen(
      false,
    );

    setAlertsOpen(
      (
        current,
      ) =>
        !current,
    );
  }

  /* =======================================================
     BELL BUTTON

     Opening Bell = user has viewed current notifications.
  ======================================================= */

  function handleBellClick() {
    const shouldOpen =
      !notificationsOpen;

    setAlertsOpen(
      false,
    );

    setNotificationsOpen(
      shouldOpen,
    );

    if (
      shouldOpen
    ) {
      markCurrentAlertsAsRead();
    }
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <header
      className="
        sticky
        top-0
        z-30
        flex
        h-[64px]
        items-center
        justify-between
        border-b
        border-slate-200
        bg-white
        px-4
        sm:px-6
      "
    >
      <h2
        className="
          text-[16px]
          font-semibold
          text-slate-900
        "
      >
        {title}
      </h2>

      <div
        ref={
          menuRef
        }
        className="
          relative
          flex
          items-center
          gap-2
          sm:gap-3
        "
      >
        {/* ===============================================
            ROLE
        =============================================== */}

        <button
          type="button"
          className="
            hidden
            rounded-full
            border
            border-sky-200
            bg-sky-50
            px-4
            py-2
            text-xs
            font-medium
            text-sky-700
            sm:block
          "
        >
          Administrator
        </button>

        {/* ===============================================
            ACTIVE ALERTS
        =============================================== */}

        <button
          type="button"
          onClick={
            handleAlertsClick
          }
          aria-expanded={
            alertsOpen
          }
          aria-label="Active alerts"
          className={`
            hidden
            items-center
            gap-2
            rounded-full
            border
            px-4
            py-2
            text-xs
            font-medium
            transition
            sm:flex

            ${
              activeAlertCount >
              0
                ? "border-orange-200 bg-orange-50 text-orange-600 hover:bg-orange-100"
                : "border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
            }
          `}
        >
          {activeAlertCount >
          0 ? (
            <AlertTriangle
              className="
                h-4
                w-4
              "
            />
          ) : (
            <CheckCircle2
              className="
                h-4
                w-4
              "
            />
          )}

          {activeAlertCount}{" "}
          {activeAlertCount ===
          1
            ? "alert"
            : "alerts"}
        </button>

        {/* ===============================================
            BELL
        =============================================== */}

        <button
          type="button"
          onClick={
            handleBellClick
          }
          aria-label="Notifications"
          aria-expanded={
            notificationsOpen
          }
          className="
            relative
            flex
            h-9
            w-9
            items-center
            justify-center
            rounded-full
            text-slate-500
            transition
            hover:bg-slate-100
          "
        >
          <Bell
            className="
              h-5
              w-5
            "
          />

          {unreadCount >
            0 && (
            <span
              className="
                absolute
                right-0
                top-0
                flex
                h-4
                min-w-4
                items-center
                justify-center
                rounded-full
                bg-rose-500
                px-1
                text-[9px]
                font-semibold
                text-white
              "
            >
              {unreadCount >
              99
                ? "99+"
                : unreadCount}
            </span>
          )}
        </button>

        {/* ===============================================
            PROFILE
        =============================================== */}

        <button
          type="button"
          aria-label="Admin profile"
          className="
            flex
            h-9
            w-9
            items-center
            justify-center
            rounded-full
            bg-[#078cc6]
            text-sm
            font-semibold
            text-white
          "
        >
          A
        </button>

        {/* ===============================================
            ACTIVE ALERT DROPDOWN
        =============================================== */}

        {alertsOpen && (
          <div
            className="
              absolute
              right-10
              top-[48px]
              z-50
              w-[360px]
              max-w-[calc(100vw-24px)]
              overflow-hidden
              rounded-2xl
              border
              border-slate-200
              bg-white
              shadow-xl
              sm:right-12
            "
          >
            <div
              className="
                flex
                items-center
                justify-between
                border-b
                border-slate-100
                px-4
                py-3
              "
            >
              <div>
                <p
                  className="
                    text-sm
                    font-semibold
                    text-slate-900
                  "
                >
                  Active Alerts
                </p>

                <p
                  className="
                    mt-0.5
                    text-[11px]
                    text-slate-500
                  "
                >
                  Problems that still
                  need attention
                </p>
              </div>

              <span
                className="
                  rounded-full
                  bg-orange-50
                  px-2.5
                  py-1
                  text-xs
                  font-semibold
                  text-orange-600
                "
              >
                {
                  activeAlertCount
                }
              </span>
            </div>

            <div
              className="
                max-h-[380px]
                overflow-y-auto
              "
            >
              {alertError ? (
                <div
                  className="
                    p-4
                    text-sm
                    text-rose-600
                  "
                >
                  {alertError}
                </div>
              ) : alerts.length ===
                0 ? (
                <div
                  className="
                    px-4
                    py-8
                    text-center
                  "
                >
                  <CheckCircle2
                    className="
                      mx-auto
                      h-8
                      w-8
                      text-emerald-500
                    "
                  />

                  <p
                    className="
                      mt-2
                      text-sm
                      font-medium
                      text-slate-800
                    "
                  >
                    No active alerts
                  </p>

                  <p
                    className="
                      mt-1
                      text-xs
                      text-slate-500
                    "
                  >
                    Stock and expiry
                    status are currently
                    clear.
                  </p>
                </div>
              ) : (
                alerts.map(
                  (
                    alert,
                  ) => (
                    <Link
                      key={
                        alert.key
                      }
                      href={
                        alert.href
                      }
                      onClick={() => {
                        setAlertsOpen(
                          false,
                        );
                      }}
                      className="
                        block
                        border-b
                        border-slate-100
                        px-4
                        py-3
                        transition
                        last:border-b-0
                        hover:bg-slate-50
                      "
                    >
                      <div
                        className="
                          flex
                          items-start
                          gap-3
                        "
                      >
                        <span
                          className={`
                            mt-1.5
                            h-2.5
                            w-2.5
                            shrink-0
                            rounded-full
                            ${getStatusDotClass(
                              alert.kind,
                            )}
                          `}
                        />

                        <div
                          className="
                            min-w-0
                            flex-1
                          "
                        >
                          <div
                            className="
                              flex
                              flex-wrap
                              items-center
                              justify-between
                              gap-2
                            "
                          >
                            <p
                              className="
                                truncate
                                text-sm
                                font-medium
                                text-slate-900
                              "
                            >
                              {
                                alert.title
                              }
                            </p>

                            <span
                              className={`
                                shrink-0
                                rounded-full
                                px-2
                                py-0.5
                                text-[10px]
                                font-medium
                                ${getStatusBadgeClass(
                                  alert.kind,
                                )}
                              `}
                            >
                              {getStatusLabel(
                                alert.kind,
                              )}
                            </span>
                          </div>

                          <p
                            className="
                              mt-1
                              text-xs
                              leading-5
                              text-slate-500
                            "
                          >
                            {
                              alert.message
                            }
                          </p>
                        </div>
                      </div>
                    </Link>
                  ),
                )
              )}
            </div>

            {alerts.length >
              0 && (
              <div
                className="
                  grid
                  grid-cols-2
                  border-t
                  border-slate-100
                "
              >
                <Link
                  href="/admin/low-stock-alerts"
                  onClick={() => {
                    setAlertsOpen(
                      false,
                    );
                  }}
                  className="
                    border-r
                    border-slate-100
                    px-3
                    py-3
                    text-center
                    text-xs
                    font-medium
                    text-sky-600
                    hover:bg-slate-50
                  "
                >
                  Stock Alerts
                </Link>

                <Link
                  href="/admin/expiry-alerts"
                  onClick={() => {
                    setAlertsOpen(
                      false,
                    );
                  }}
                  className="
                    px-3
                    py-3
                    text-center
                    text-xs
                    font-medium
                    text-sky-600
                    hover:bg-slate-50
                  "
                >
                  Expiry Alerts
                </Link>
              </div>
            )}
          </div>
        )}

        {/* ===============================================
            NOTIFICATION DROPDOWN
        =============================================== */}

        {notificationsOpen && (
          <div
            className="
              absolute
              right-10
              top-[48px]
              z-50
              w-[360px]
              max-w-[calc(100vw-24px)]
              overflow-hidden
              rounded-2xl
              border
              border-slate-200
              bg-white
              shadow-xl
              sm:right-12
            "
          >
            <div
              className="
                border-b
                border-slate-100
                px-4
                py-3
              "
            >
              <p
                className="
                  text-sm
                  font-semibold
                  text-slate-900
                "
              >
                Notifications
              </p>

              <p
                className="
                  mt-0.5
                  text-[11px]
                  text-slate-500
                "
              >
                Current alert
                notifications
              </p>
            </div>

            <div
              className="
                max-h-[380px]
                overflow-y-auto
              "
            >
              {alertError ? (
                <div
                  className="
                    p-4
                    text-sm
                    text-rose-600
                  "
                >
                  {alertError}
                </div>
              ) : alerts.length ===
                0 ? (
                <div
                  className="
                    px-4
                    py-8
                    text-center
                  "
                >
                  <Bell
                    className="
                      mx-auto
                      h-8
                      w-8
                      text-slate-300
                    "
                  />

                  <p
                    className="
                      mt-2
                      text-sm
                      font-medium
                      text-slate-800
                    "
                  >
                    No notifications
                  </p>

                  <p
                    className="
                      mt-1
                      text-xs
                      text-slate-500
                    "
                  >
                    New stock or expiry
                    problems will appear
                    here.
                  </p>
                </div>
              ) : (
                alerts.map(
                  (
                    alert,
                  ) => (
                    <Link
                      key={
                        alert.key
                      }
                      href={
                        alert.href
                      }
                      onClick={() => {
                        setNotificationsOpen(
                          false,
                        );
                      }}
                      className="
                        block
                        border-b
                        border-slate-100
                        px-4
                        py-3
                        transition
                        last:border-b-0
                        hover:bg-slate-50
                      "
                    >
                      <div
                        className="
                          flex
                          items-start
                          gap-3
                        "
                      >
                        <span
                          className={`
                            mt-1.5
                            h-2.5
                            w-2.5
                            shrink-0
                            rounded-full
                            ${getStatusDotClass(
                              alert.kind,
                            )}
                          `}
                        />

                        <div
                          className="
                            min-w-0
                            flex-1
                          "
                        >
                          <p
                            className="
                              truncate
                              text-sm
                              font-medium
                              text-slate-900
                            "
                          >
                            {
                              alert.title
                            }
                          </p>

                          <p
                            className="
                              mt-1
                              text-xs
                              leading-5
                              text-slate-500
                            "
                          >
                            {
                              alert.message
                            }
                          </p>
                        </div>
                      </div>
                    </Link>
                  ),
                )
              )}
            </div>

            {alerts.length >
              0 && (
              <div
                className="
                  border-t
                  border-slate-100
                  bg-slate-50
                  px-4
                  py-2.5
                  text-center
                  text-[11px]
                  text-slate-500
                "
              >
                All current
                notifications viewed
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}