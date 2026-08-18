"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  ClipboardPlus,
  Loader2,
  RefreshCcw,
} from "lucide-react";

import {
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

type LowStockResponse = {
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

type RecalculateResponse = {
  success: boolean;

  message?: string;

  data?: {
    totalAutoMedicines:
      number;

    calculatedCount:
      number;

    fallbackCount:
      number;
  };
};

/* =========================================================
   FORMAT QUANTITY
========================================================= */

function formatQuantity(
  value: number,
) {
  return value.toLocaleString(
    "en-US",
    {
      minimumFractionDigits:
        0,

      maximumFractionDigits:
        3,
    },
  );
}

/* =========================================================
   PAGE
========================================================= */

export default function LowStockAlertsPage() {
  const router =
    useRouter();

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
    useState({
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
     LOAD LOW STOCK DATA
  ======================================================= */

  const loadLowStock =
    useCallback(
      async () => {
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
          LowStockResponse =
          await response.json();

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

        setSummary(
          result.data.summary,
        );

        setItems(
          result.data.items,
        );
      },
      [],
    );

  /* =======================================================
     RECALCULATE AUTO REORDER LEVELS
  ======================================================= */

  const recalculateAutoLevels =
    useCallback(
      async () => {
        const response =
          await fetch(
            "/api/reorder/recalculate",
            {
              method:
                "POST",
            },
          );

        const result:
          RecalculateResponse =
          await response.json();

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
      },
      [],
    );

  /* =======================================================
     REFRESH ALERTS

     STEP 1:
     recalculate AUTO medicines

     STEP 2:
     reload low stock data
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

          /* ===============================================
             RECALCULATE AUTO LEVEL
          =============================================== */

          try {
            await recalculateAutoLevels();
          } catch (
            calculationError
          ) {
            console.error(
              "Auto reorder calculation error:",
              calculationError,
            );

            setWarningMessage(
              calculationError instanceof
                Error
                ? `${calculationError.message} Existing reorder levels are being shown.`
                : "Auto reorder calculation could not be refreshed. Existing reorder levels are being shown.",
            );
          }

          /* ===============================================
             LOAD ALERT LIST
          =============================================== */

          await loadLowStock();
        } catch (error) {
          console.error(
            "Low stock load error:",
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
        loadLowStock,
        recalculateAutoLevels,
      ],
    );

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(
    () => {
      void refreshAlerts();
    },
    [
      refreshAlerts,
    ],
  );

  /* =======================================================
     GO TO PURCHASE
  ======================================================= */

  function goToPurchase() {
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
          SUMMARY CARDS
      =================================================== */}

      <section className="grid grid-cols-1 gap-3 md:grid-cols-3">

        {/* OUT OF STOCK */}

        <SummaryCard
          label="Out of Stock"
          value={
            summary.outOfStock
          }
          className="border-rose-200 bg-rose-50/70"
          valueClassName="text-rose-600"
        />

        {/* LOW STOCK */}

        <SummaryCard
          label="Low Stock"
          value={
            summary.lowStock
          }
          className="border-amber-200 bg-amber-50/70"
          valueClassName="text-amber-600"
        />

        {/* TOTAL */}

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
          CREATE PURCHASE ORDER BUTTON
      =================================================== */}

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

      {/* ===================================================
          AUTO CALCULATION WARNING
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

        <section className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">

          <p className="text-[10px] text-rose-700">
            {
              errorMessage
            }
          </p>

          <button
            type="button"
            onClick={() =>
              void refreshAlerts()
            }
            className="text-[9px] font-semibold text-rose-700 underline"
          >
            Retry
          </button>

        </section>

      ) : null}

      {/* ===================================================
          LOW STOCK TABLE
      =================================================== */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        {/* =================================================
            TABLE HEADER
        ================================================= */}

        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">

          <div>

            <h2 className="text-[12px] font-semibold text-slate-900">
              Low Stock Alert List
            </h2>

            <p className="mt-1 text-[9px] text-slate-400">
              Available stock is checked against each medicine&apos;s effective reorder level.
            </p>

          </div>

          {!isLoading ? (

            <button
              type="button"
              onClick={() =>
                void refreshAlerts()
              }
              className="inline-flex items-center gap-1.5 text-[9px] font-medium text-slate-500 transition hover:text-sky-600"
            >
              <RefreshCcw className="h-3 w-3" />

              Refresh
            </button>

          ) : null}

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

        ) : items.length === 0 ? (

          /* =================================================
             HEALTHY STOCK
          ================================================= */

          <div className="flex min-h-[280px] items-center justify-center">

            <div className="text-center">

              <p className="text-[12px] font-semibold text-emerald-700">
                Stock levels are healthy
              </p>

              <p className="mt-1 text-[9px] text-slate-400">
                No low-stock or out-of-stock medicine found.
              </p>

            </div>

          </div>

        ) : (

          /* =================================================
             TABLE
          ================================================= */

          <div className="overflow-x-auto">

            <table className="w-full min-w-[1100px] border-collapse">

              {/* =============================================
                  TABLE HEAD
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

                  <TableHead>
                    Action
                  </TableHead>

                </tr>

              </thead>

              {/* =============================================
                  TABLE BODY
              ============================================= */}

              <tbody>

                {items.map(
                  (
                    item,
                  ) => (

                    <tr
                      key={
                        item.id
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
                          AVAILABLE QUANTITY
                      ===================================== */}

                      <td className="px-4 py-4">

                        <p
                          className={`text-[11px] font-semibold ${
                            item.status ===
                            "OUT_OF_STOCK"
                              ? "text-rose-600"
                              : "text-rose-500"
                          }`}
                        >
                          {
                            formatQuantity(
                              item.availableQty,
                            )
                          }
                        </p>

                      </td>

                      {/* =====================================
                          MINIMUM REQUIRED
                      ===================================== */}

                      <td className="px-4 py-4">

                        <p className="text-[11px] font-medium text-slate-600">

                          {
                            formatQuantity(
                              item.minimumRequired,
                            )
                          }

                        </p>

                        {/* REORDER MODE */}

                        <span
                          className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[7px] font-semibold ${
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

                        {/* AVERAGE DAILY SALES */}

                        {item.reorderMode ===
                        "AUTO" ? (

                          <p className="mt-1 text-[7px] text-slate-400">

                            Avg.{" "}
                            {
                              formatQuantity(
                                item.averageDailySales,
                              )
                            }
                            /day

                          </p>

                        ) : null}

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

                        {/* LEAD TIME */}

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
                          className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[8px] font-medium ${
                            item.status ===
                            "OUT_OF_STOCK"
                              ? "bg-rose-100 text-rose-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >

                          {
                            item.status ===
                            "OUT_OF_STOCK"
                              ? "Out of Stock"
                              : "Low Stock"
                          }

                        </span>

                      </td>

                      {/* =====================================
                          ACTION
                      ===================================== */}

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

          Manual mode uses the medicine&apos;s manually configured reorder level.

          {" "}

          Auto mode uses recent completed sales, supplier lead time and safety stock.

          {" "}

          If enough sales history is not available, the manual level is used as the safe fallback.

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
        {
          label
        }
      </p>

      <p
        className={`mt-2 text-[22px] font-semibold ${valueClassName}`}
      >
        {
          value
        }
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