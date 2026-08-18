"use client";

import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  ClipboardPlus,
  Loader2,
  RefreshCcw,
} from "lucide-react";

import {
  usePathname,
  useRouter,
} from "next/navigation";

/* =========================================================
   TYPES
========================================================= */

type AlertStatus =
  | "OUT_OF_STOCK"
  | "LOW_STOCK";

type ReorderMode =
  | "MANUAL"
  | "AUTO";

type LowStockItem = {
  id: string;

  databaseId: number;

  medicineName: string;

  category: string;

  availableQty: number;

  minimumRequired: number;

  manualReorderLevel: number;

  autoReorderLevel: number;

  baseUnit: string;

  supplier: string;

  leadTimeDays: number;

  reorderMode: ReorderMode;

  averageDailySales: number;

  lastCalculatedAt:
    | string
    | null;

  shortageQty: number;

  status: AlertStatus;
};

type LowStockSummary = {
  outOfStock: number;

  lowStock: number;

  totalAffected: number;
};

type LowStockResponse = {
  success: boolean;

  message?: string;

  data?: {
    summary: LowStockSummary;

    items: LowStockItem[];
  };
};

type RecalculateResponse = {
  success: boolean;

  message?: string;

  data?: {
    totalAutoMedicines: number;

    calculatedCount: number;

    fallbackCount: number;
  };
};

/* =========================================================
   HELPERS
========================================================= */

function formatQuantity(
  value: number,
) {
  const parsed =
    Number(value);

  if (
    !Number.isFinite(parsed)
  ) {
    return "0";
  }

  return parsed.toLocaleString(
    "en-US",
    {
      minimumFractionDigits: 0,

      maximumFractionDigits: 3,
    },
  );
}

/* =========================================================
   API
========================================================= */

async function fetchLowStockData() {
  const response =
    await fetch(
      "/api/low-stock",
      {
        method: "GET",

        cache: "no-store",
      },
    );

  const result =
    (await response.json()) as
      LowStockResponse;

  if (
    !response.ok ||
    !result.success ||
    !result.data
  ) {
    throw new Error(
      result.message ||
        "Failed to load low stock alerts.",
    );
  }

  return result.data;
}

async function recalculateReorderLevels() {
  const response =
    await fetch(
      "/api/reorder/recalculate",
      {
        method: "POST",
      },
    );

  const result =
    (await response.json()) as
      RecalculateResponse;

  if (
    !response.ok ||
    !result.success
  ) {
    throw new Error(
      result.message ||
        "Auto reorder calculation failed.",
    );
  }

  return result;
}

/* =========================================================
   PAGE
========================================================= */

export default function LowStockAlertsPage() {
  const router =
    useRouter();

  const pathname =
    usePathname();

  /* =======================================================
     ROLE CONTEXT FROM CURRENT PANEL

     Authentication/authorization will be added later.

     For now:
     - Admin route = purchase actions allowed
     - Pharmacist route = read-only alerts
  ======================================================= */

  const isPharmacistPanel =
    pathname.startsWith(
      "/pharmacist",
    );

  const canManagePurchase =
    !isPharmacistPanel;

  /* =======================================================
     DATA
  ======================================================= */

  const [
    items,
    setItems,
  ] =
    useState<
      LowStockItem[]
    >([]);

  const [
    summary,
    setSummary,
  ] =
    useState<LowStockSummary>({
      outOfStock: 0,

      lowStock: 0,

      totalAffected: 0,
    });

  /* =======================================================
     UI STATE
  ======================================================= */

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState("");

  const [
    warningMessage,
    setWarningMessage,
  ] =
    useState("");

  /* =======================================================
     APPLY DATA
  ======================================================= */

  const applyLowStockData =
    useCallback(
      (
        data: {
          summary:
            LowStockSummary;

          items:
            LowStockItem[];
        },
      ) => {
        setSummary(
          data.summary,
        );

        setItems(
          data.items,
        );
      },
      [],
    );

  /* =======================================================
     INITIAL LOAD

     ADMIN:
     1. Recalculate AUTO reorder levels.
     2. Load current alerts.

     PHARMACIST:
     1. Read existing low-stock data only.
     2. Does NOT trigger reorder-level mutation.
  ======================================================= */

  useEffect(() => {
    let cancelled =
      false;

    async function initialLoad() {
      let autoWarning =
        "";

      /* ===============================================
         ADMIN-ONLY AUTO RECALCULATION
      =============================================== */

      if (
        canManagePurchase
      ) {
        try {
          await recalculateReorderLevels();
        } catch (
          calculationError
        ) {
          console.error(
            "Initial auto reorder calculation error:",
            calculationError,
          );

          autoWarning =
            calculationError instanceof
              Error
              ? `${calculationError.message} Existing reorder levels are being shown.`
              : "Auto reorder calculation could not be refreshed. Existing reorder levels are being shown.";
        }
      }

      /* ===============================================
         LOAD ALERT DATA
      =============================================== */

      try {
        const data =
          await fetchLowStockData();

        if (cancelled) {
          return;
        }

        applyLowStockData(
          data,
        );

        setWarningMessage(
          autoWarning,
        );

        setErrorMessage(
          "",
        );
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error(
          "Initial low stock load error:",
          error,
        );

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Failed to load low stock alerts.",
        );

        setWarningMessage(
          autoWarning,
        );
      } finally {
        if (!cancelled) {
          setIsLoading(
            false,
          );
        }
      }
    }

    void initialLoad();

    return () => {
      cancelled =
        true;
    };
  }, [
    applyLowStockData,
    canManagePurchase,
  ]);

  /* =======================================================
     MANUAL REFRESH

     ADMIN:
     recalculates AUTO reorder levels + reloads.

     PHARMACIST:
     only reloads existing alert data.
  ======================================================= */

  const refreshAlerts =
    useCallback(
      async () => {
        try {
          setIsLoading(
            true,
          );

          setErrorMessage(
            "",
          );

          setWarningMessage(
            "",
          );

          let autoWarning =
            "";

          /* =============================================
             ADMIN-ONLY RECALCULATION
          ============================================= */

          if (
            canManagePurchase
          ) {
            try {
              await recalculateReorderLevels();
            } catch (
              calculationError
            ) {
              console.error(
                "Auto reorder calculation error:",
                calculationError,
              );

              autoWarning =
                calculationError instanceof
                  Error
                  ? `${calculationError.message} Existing reorder levels are being shown.`
                  : "Auto reorder calculation could not be refreshed. Existing reorder levels are being shown.";
            }
          }

          /* =============================================
             LOAD UPDATED ALERT DATA
          ============================================= */

          const data =
            await fetchLowStockData();

          applyLowStockData(
            data,
          );

          setWarningMessage(
            autoWarning,
          );
        } catch (error) {
          console.error(
            "Low stock refresh error:",
            error,
          );

          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Failed to load low stock alerts.",
          );
        } finally {
          setIsLoading(
            false,
          );
        }
      },
      [
        applyLowStockData,
        canManagePurchase,
      ],
    );

  /* =======================================================
     ADMIN PURCHASE

     Pharmacist never receives this action in UI.
  ======================================================= */

  function goToPurchase() {
    if (
      !canManagePurchase
    ) {
      return;
    }

    router.push(
      "/admin/purchase",
    );
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <div className="space-y-4">
      {/* ===================================================
          SUMMARY
      =================================================== */}

      <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <SummaryCard
          label="Out of Stock"
          value={
            summary.outOfStock
          }
          className="border-rose-200 bg-rose-50/70"
          valueClassName="text-rose-600"
        />

        <SummaryCard
          label="Low Stock"
          value={
            summary.lowStock
          }
          className="border-amber-200 bg-amber-50/70"
          valueClassName="text-amber-600"
        />

        <SummaryCard
          label="Total Affected"
          value={
            summary.totalAffected
          }
          className="border-sky-200 bg-sky-50/70"
          valueClassName="text-sky-700"
        />
      </section>

      {/* ===================================================
          ADMIN-ONLY PURCHASE ACTION
      =================================================== */}

      {canManagePurchase ? (
        <section className="flex justify-end">
          <button
            type="button"
            onClick={
              goToPurchase
            }
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-sky-600 px-5 text-[11px] font-semibold text-white shadow-sm transition hover:bg-sky-700"
          >
            <ClipboardPlus className="h-4 w-4" />

            Create Purchase Order
          </button>
        </section>
      ) : null}

      {/* ===================================================
          PHARMACIST INFO
      =================================================== */}

      {isPharmacistPanel ? (
        <section className="rounded-xl border border-sky-100 bg-sky-50/60 px-4 py-3">
          <p className="text-[9px] leading-5 text-sky-700">
            Low-stock alerts are provided for monitoring purposes.
            Purchase orders and inventory replenishment are managed
            by the administrator.
          </p>
        </section>
      ) : null}

      {/* ===================================================
          WARNING
      =================================================== */}

      {warningMessage ? (
        <section className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-[10px] leading-5 text-amber-700">
            {
              warningMessage
            }
          </p>
        </section>
      ) : null}

      {/* ===================================================
          ERROR
      =================================================== */}

      {errorMessage ? (
        <section className="flex items-center justify-between gap-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
          <p className="text-[10px] leading-5 text-rose-700">
            {
              errorMessage
            }
          </p>

          <button
            type="button"
            onClick={() =>
              void refreshAlerts()
            }
            className="shrink-0 text-[9px] font-semibold text-rose-700 underline"
          >
            Retry
          </button>
        </section>
      ) : null}

      {/* ===================================================
          TABLE
      =================================================== */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* =================================================
            HEADER
        ================================================= */}

        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-[12px] font-semibold text-slate-900">
              Low Stock Alert List
            </h2>

            <p className="mt-1 text-[9px] text-slate-400">
              Available stock is checked against each medicine&apos;s effective reorder level.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              void refreshAlerts()
            }
            disabled={
              isLoading
            }
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-[9px] font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCcw
              className={`h-3.5 w-3.5 ${
                isLoading
                  ? "animate-spin"
                  : ""
              }`}
            />

            Refresh
          </button>
        </div>

        {/* =================================================
            LOADING
        ================================================= */}

        {isLoading ? (
          <div className="flex min-h-[280px] items-center justify-center">
            <div className="text-center">
              <Loader2 className="mx-auto h-7 w-7 animate-spin text-sky-600" />

              <p className="mt-3 text-[10px] text-slate-500">
                Checking inventory and reorder levels...
              </p>
            </div>
          </div>
        ) : items.length ===
          0 ? (
          /* ===============================================
             EMPTY
          =============================================== */

          <div className="flex min-h-[280px] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
                <RefreshCcw className="h-5 w-5 text-emerald-600" />
              </div>

              <p className="mt-3 text-[12px] font-semibold text-emerald-700">
                Stock levels are healthy
              </p>

              <p className="mt-1 text-[9px] text-slate-400">
                No low-stock or out-of-stock medicine found.
              </p>
            </div>
          </div>
        ) : (
          /* ===============================================
             TABLE
          =============================================== */

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] border-collapse">
              {/* =============================================
                  HEAD
              ============================================= */}

              <thead className="bg-slate-50">
                <tr>
                  <TableHead>
                    Medicine Name
                  </TableHead>

                  <TableHead>
                    Category
                  </TableHead>

                  <TableHead>
                    Available Qty
                  </TableHead>

                  <TableHead>
                    Min. Required
                  </TableHead>

                  <TableHead>
                    Unit Type
                  </TableHead>

                  <TableHead>
                    Supplier
                  </TableHead>

                  <TableHead>
                    Status
                  </TableHead>

                  {canManagePurchase ? (
                    <TableHead>
                      Action
                    </TableHead>
                  ) : null}
                </tr>
              </thead>

              {/* =============================================
                  BODY
              ============================================= */}

              <tbody>
                {items.map(
                  (item) => (
                    <tr
                      key={
                        item.databaseId
                      }
                      className="border-t border-slate-100 transition hover:bg-slate-50/70"
                    >
                      {/* =====================================
                          MEDICINE
                      ===================================== */}

                      <td className="px-4 py-4">
                        <p className="text-[11px] font-semibold text-slate-900">
                          {
                            item.medicineName
                          }
                        </p>

                        <p className="mt-1 font-mono text-[7px] text-slate-400">
                          {
                            item.id
                          }
                        </p>
                      </td>

                      {/* =====================================
                          CATEGORY
                      ===================================== */}

                      <td className="px-4 py-4">
                        <span className="inline-flex rounded-full border border-sky-100 bg-sky-50 px-2.5 py-1 text-[8px] font-medium text-sky-700">
                          {
                            item.category
                          }
                        </span>
                      </td>

                      {/* =====================================
                          AVAILABLE
                      ===================================== */}

                      <td className="px-4 py-4">
                        <p
                          className={`text-[11px] font-semibold ${
                            item.status ===
                            "OUT_OF_STOCK"
                              ? "text-rose-600"
                              : "text-amber-600"
                          }`}
                        >
                          {
                            formatQuantity(
                              item.availableQty,
                            )
                          }
                        </p>

                        <p className="mt-1 text-[7px] text-slate-400">
                          {
                            item.baseUnit
                          }
                        </p>
                      </td>

                      {/* =====================================
                          MINIMUM REQUIRED
                      ===================================== */}

                      <td className="px-4 py-4">
                        <p className="text-[11px] font-medium text-slate-700">
                          {
                            formatQuantity(
                              item.minimumRequired,
                            )
                          }
                        </p>

                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[7px] font-semibold ${
                              item.reorderMode ===
                              "AUTO"
                                ? "bg-violet-50 text-violet-700"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {
                              item.reorderMode
                            }
                          </span>

                          {item.reorderMode ===
                          "AUTO" ? (
                            <span className="text-[7px] text-slate-400">
                              Avg.{" "}
                              {
                                formatQuantity(
                                  item.averageDailySales,
                                )
                              }
                              /day
                            </span>
                          ) : null}
                        </div>
                      </td>

                      {/* =====================================
                          UNIT
                      ===================================== */}

                      <td className="px-4 py-4 text-[10px] text-slate-600">
                        {
                          item.baseUnit
                        }
                      </td>

                      {/* =====================================
                          SUPPLIER
                      ===================================== */}

                      <td className="px-4 py-4">
                        <p
                          className={`text-[9px] ${
                            item.supplier ===
                            "Not Assigned"
                              ? "text-slate-400"
                              : "text-slate-600"
                          }`}
                        >
                          {
                            item.supplier
                          }
                        </p>

                        {item.reorderMode ===
                        "AUTO" ? (
                          <p className="mt-1 text-[7px] text-slate-400">
                            Lead time:{" "}
                            {
                              item.leadTimeDays
                            }{" "}
                            day
                            {
                              item.leadTimeDays ===
                              1
                                ? ""
                                : "s"
                            }
                          </p>
                        ) : null}
                      </td>

                      {/* =====================================
                          STATUS
                      ===================================== */}

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[8px] font-semibold ${
                            item.status ===
                            "OUT_OF_STOCK"
                              ? "bg-rose-100 text-rose-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {item.status ===
                          "OUT_OF_STOCK"
                            ? "Out of Stock"
                            : "Low Stock"}
                        </span>

                        {item.shortageQty >
                        0 ? (
                          <p className="mt-1 text-[7px] text-slate-400">
                            Short by{" "}
                            {
                              formatQuantity(
                                item.shortageQty,
                              )
                            }{" "}
                            {
                              item.baseUnit
                            }
                          </p>
                        ) : null}
                      </td>

                      {/* =====================================
                          ADMIN-ONLY ACTION
                      ===================================== */}

                      {canManagePurchase ? (
                        <td className="px-4 py-4">
                          <button
                            type="button"
                            onClick={
                              goToPurchase
                            }
                            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-3 text-[8px] font-semibold text-teal-700 transition hover:bg-teal-100"
                          >
                            <RefreshCcw className="h-3 w-3" />

                            Restock
                          </button>
                        </td>
                      ) : null}
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ===================================================
          INFORMATION
      =================================================== */}

      <section className="rounded-xl border border-slate-200 bg-white px-4 py-3">
        <p className="text-[9px] leading-5 text-slate-500">
          Manual mode uses the configured reorder level.{" "}
          Auto mode uses recent completed sales, supplier lead
          time and safety stock. If there is not enough sales
          history, the manual reorder level is used as the
          fallback.
        </p>
      </section>
    </div>
  );
}

/* =========================================================
   SUMMARY CARD
========================================================= */

function SummaryCard({
  label,
  value,
  className,
  valueClassName,
}: {
  label: string;

  value: number;

  className: string;

  valueClassName: string;
}) {
  return (
    <article
      className={`min-h-[88px] rounded-2xl border p-4 ${className}`}
    >
      <p className="text-[9px] font-medium text-slate-500">
        {label}
      </p>

      <p
        className={`mt-2 text-[22px] font-semibold ${valueClassName}`}
      >
        {value}
      </p>
    </article>
  );
}

/* =========================================================
   TABLE HEAD
========================================================= */

function TableHead({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <th className="px-4 py-3 text-left text-[9px] font-medium text-slate-500">
      {children}
    </th>
  );
}