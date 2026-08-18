"use client";

import {
  useEffect,
  useState,
} from "react";

import type {
  ReactNode,
} from "react";

import {
  Download,
  Eye,
  Loader2,
  RefreshCcw,
} from "lucide-react";

import {
  useRouter,
} from "next/navigation";

/* =========================================================
   TYPES
========================================================= */

type ExpiryStatus =
  | "EXPIRED"
  | "CRITICAL"
  | "NEAR_EXPIRY";

type BatchStatus =
  | "ACTIVE"
  | "DEPLETED"
  | "EXPIRED"
  | "BLOCKED";

type ExpiryItem = {
  id: number;

  medicineId: number;

  medicineCode: string;

  medicineName: string;

  companyName: string;

  batchNo: string;

  quantity: number;

  unit: string;

  expiryDate: string;

  daysLeft: number;

  status: ExpiryStatus;

  batchStatus: BatchStatus;
};

type ExpirySummary = {
  expired: number;

  expiring15: number;

  expiring30: number;

  totalAffected: number;
};

type ExpiryData = {
  summary: ExpirySummary;

  items: ExpiryItem[];
};

type ExpiryApiResponse = {
  success: boolean;

  message?: string;

  data?: ExpiryData;
};

/* =========================================================
   HELPERS
========================================================= */

function formatQuantity(
  value: number,
) {
  return value.toLocaleString(
    "en-US",
    {
      minimumFractionDigits: 0,

      maximumFractionDigits: 3,
    },
  );
}

function formatDate(
  value: string,
) {
  const parts =
    value.split("-");

  if (
    parts.length !== 3
  ) {
    return value;
  }

  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

function getDaysText(
  daysLeft: number,
) {
  if (
    daysLeft < 0
  ) {
    return `${Math.abs(
      daysLeft,
    )}d ago`;
  }

  if (
    daysLeft === 0
  ) {
    return "Today";
  }

  return `${daysLeft}d left`;
}

/* =========================================================
   FETCH EXPIRY DATA

   Important:
   This helper does NOT update React state.
========================================================= */

async function fetchExpiryAlerts(
  signal?: AbortSignal,
): Promise<ExpiryData> {
  const response =
    await fetch(
      "/api/expiry-alerts",
      {
        method: "GET",

        cache: "no-store",

        signal,
      },
    );

  const result:
    ExpiryApiResponse =
    await response.json();

  if (
    !response.ok ||
    !result.success ||
    !result.data
  ) {
    throw new Error(
      result.message ||
        "Failed to load expiry alerts.",
    );
  }

  return result.data;
}

/* =========================================================
   PAGE
========================================================= */

export default function ExpiryAlertsPage() {
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
      ExpiryItem[]
    >([]);

  const [
    summary,
    setSummary,
  ] =
    useState<ExpirySummary>({
      expired: 0,

      expiring15: 0,

      expiring30: 0,

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

  /* =======================================================
     INITIAL LOAD

     No synchronous setState is called from the Effect.
     State updates happen after the async request resolves.
  ======================================================= */

  useEffect(
    () => {
      const controller =
        new AbortController();

      fetchExpiryAlerts(
        controller.signal,
      )
        .then(
          (
            data,
          ) => {
            if (
              controller.signal
                .aborted
            ) {
              return;
            }

            setSummary(
              data.summary,
            );

            setItems(
              data.items,
            );

            setErrorMessage(
              "",
            );

            setIsLoading(
              false,
            );
          },
        )
        .catch(
          (
            error,
          ) => {
            if (
              controller.signal
                .aborted
            ) {
              return;
            }

            console.error(
              "Initial expiry alerts load error:",
              error,
            );

            setErrorMessage(
              error instanceof
                Error
                ? error.message
                : "Failed to load expiry alerts.",
            );

            setIsLoading(
              false,
            );
          },
        );

      return () => {
        controller.abort();
      };
    },
    [],
  );

  /* =======================================================
     MANUAL REFRESH

     This runs from a button click,
     not from useEffect.
  ======================================================= */

  async function refreshExpiryAlerts() {
    try {
      setIsLoading(
        true,
      );

      setErrorMessage(
        "",
      );

      const data =
        await fetchExpiryAlerts();

      setSummary(
        data.summary,
      );

      setItems(
        data.items,
      );
    } catch (error) {
      console.error(
        "Refresh expiry alerts error:",
        error,
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to load expiry alerts.",
      );
    } finally {
      setIsLoading(
        false,
      );
    }
  }

  /* =======================================================
     EXPORT CSV
  ======================================================= */

  function exportCsv() {
    if (
      items.length === 0
    ) {
      window.alert(
        "No expiry alert data to export.",
      );

      return;
    }

    const header = [
      "Medicine Name",

      "Medicine Code",

      "Batch No.",

      "Company",

      "Quantity",

      "Unit",

      "Expiry Date",

      "Days Left",

      "Status",
    ];

    const rows =
      items.map(
        (
          item,
        ) => [
          item.medicineName,

          item.medicineCode,

          item.batchNo,

          item.companyName,

          item.quantity,

          item.unit,

          item.expiryDate,

          item.daysLeft,

          item.status ===
          "EXPIRED"
            ? "Expired"
            : item.status ===
                "CRITICAL"
              ? "Critical"
              : "Near Expiry",
        ],
      );

    const csv =
      [
        header,

        ...rows,
      ]
        .map(
          (
            row,
          ) =>
            row
              .map(
                (
                  cell,
                ) =>
                  `"${String(
                    cell,
                  ).replace(
                    /"/g,
                    '""',
                  )}"`,
              )
              .join(","),
        )
        .join("\n");

    const blob =
      new Blob(
        [
          "\uFEFF",

          csv,
        ],
        {
          type:
            "text/csv;charset=utf-8;",
        },
      );

    const url =
      URL.createObjectURL(
        blob,
      );

    const link =
      document.createElement(
        "a",
      );

    link.href =
      url;

    link.download =
      `expiry-alerts-${new Date()
        .toISOString()
        .slice(
          0,
          10,
        )}.csv`;

    document.body.appendChild(
      link,
    );

    link.click();

    document.body.removeChild(
      link,
    );

    URL.revokeObjectURL(
      url,
    );
  }

  /* =======================================================
     VIEW BATCH
  ======================================================= */

  function viewBatch(
    item: ExpiryItem,
  ) {
    router.push(
      `/admin/stock?medicine=${encodeURIComponent(
        item.medicineCode,
      )}`,
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

        {/* EXPIRED */}

        <SummaryCard
          label="Expired Batches"
          value={
            summary.expired
          }
          className="border-rose-200 bg-rose-50/70"
          valueClassName="text-rose-600"
        />

        {/* 0 - 15 DAYS */}

        <SummaryCard
          label="Expiring in 15 Days"
          value={
            summary.expiring15
          }
          className="border-amber-200 bg-amber-50/70"
          valueClassName="text-amber-600"
        />

        {/* 16 - 30 DAYS */}

        <SummaryCard
          label="Expiring in 16–30 Days"
          value={
            summary.expiring30
          }
          className="border-orange-200 bg-orange-50/70"
          valueClassName="text-orange-600"
        />

      </section>

      {/* ===================================================
          TABLE CARD
      =================================================== */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        {/* =================================================
            TABLE TOP
        ================================================= */}

        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">

          <div>

            <h2 className="text-[12px] font-semibold text-slate-900">
              Expiry Alerts
            </h2>

            <p className="mt-1 text-[9px] text-slate-400">
              Batch-level alerts for expired medicines and batches expiring within the next 30 days.
            </p>

          </div>

          <div className="flex items-center gap-2">

            {/* REFRESH */}

            {!isLoading ? (

              <button
                type="button"
                onClick={() =>
                  void refreshExpiryAlerts()
                }
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-[9px] font-semibold text-slate-600 transition hover:bg-slate-50"
              >

                <RefreshCcw className="h-3 w-3" />

                Refresh

              </button>

            ) : null}

            {/* EXPORT */}

            <button
              type="button"
              onClick={
                exportCsv
              }
              disabled={
                isLoading ||
                items.length ===
                  0
              }
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-[9px] font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >

              <Download className="h-3.5 w-3.5" />

              Export

            </button>

          </div>

        </div>

        {/* =================================================
            ERROR
        ================================================= */}

        {errorMessage ? (

          <div className="flex items-center justify-between gap-3 border-b border-rose-200 bg-rose-50 px-5 py-3">

            <p className="text-[9px] text-rose-700">
              {
                errorMessage
              }
            </p>

            <button
              type="button"
              onClick={() =>
                void refreshExpiryAlerts()
              }
              className="text-[9px] font-semibold text-rose-700 underline"
            >
              Retry
            </button>

          </div>

        ) : null}

        {/* =================================================
            LOADING
        ================================================= */}

        {isLoading ? (

          <div className="flex min-h-[280px] items-center justify-center">

            <div className="text-center">

              <Loader2 className="mx-auto h-7 w-7 animate-spin text-sky-600" />

              <p className="mt-3 text-[10px] text-slate-500">
                Checking medicine batch expiry dates...
              </p>

            </div>

          </div>

        ) : items.length ===
          0 ? (

          /* =================================================
             EMPTY
          ================================================= */

          <div className="flex min-h-[280px] items-center justify-center">

            <div className="text-center">

              <p className="text-[12px] font-semibold text-emerald-700">
                No expiry alerts
              </p>

              <p className="mt-1 text-[9px] text-slate-400">
                No stocked batch is expired or expiring within 30 days.
              </p>

            </div>

          </div>

        ) : (

          /* =================================================
             TABLE
          ================================================= */

          <div className="overflow-x-auto">

            <table className="w-full min-w-[1150px] border-collapse">

              {/* =============================================
                  TABLE HEAD
              ============================================= */}

              <thead className="bg-slate-50">

                <tr>

                  <TableHead>
                    Medicine Name
                  </TableHead>

                  <TableHead>
                    Batch No.
                  </TableHead>

                  <TableHead>
                    Company
                  </TableHead>

                  <TableHead>
                    Quantity
                  </TableHead>

                  <TableHead>
                    Unit
                  </TableHead>

                  <TableHead>
                    Expiry Date
                  </TableHead>

                  <TableHead>
                    Days Left
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

                      {/* MEDICINE */}

                      <td className="px-4 py-4">

                        <p className="text-[11px] font-semibold text-slate-900">
                          {
                            item.medicineName
                          }
                        </p>

                        <p className="mt-1 font-mono text-[7px] text-slate-400">
                          {
                            item.medicineCode
                          }
                        </p>

                      </td>

                      {/* BATCH */}

                      <td className="px-4 py-4">

                        <span className="font-mono text-[9px] font-medium text-slate-700">
                          {
                            item.batchNo
                          }
                        </span>

                      </td>

                      {/* COMPANY */}

                      <td className="px-4 py-4 text-[9px] text-slate-500">
                        {
                          item.companyName
                        }
                      </td>

                      {/* QUANTITY */}

                      <td className="px-4 py-4 text-[10px] font-medium text-slate-700">

                        {
                          formatQuantity(
                            item.quantity,
                          )
                        }

                      </td>

                      {/* UNIT */}

                      <td className="px-4 py-4 text-[9px] text-slate-600">
                        {
                          item.unit
                        }
                      </td>

                      {/* EXPIRY */}

                      <td className="px-4 py-4 text-[9px] text-slate-500">

                        {
                          formatDate(
                            item.expiryDate,
                          )
                        }

                      </td>

                      {/* DAYS LEFT */}

                      <td className="px-4 py-4">

                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[8px] font-semibold ${
                            item.status ===
                            "EXPIRED"
                              ? "bg-rose-100 text-rose-700"
                              : item.status ===
                                  "CRITICAL"
                                ? "bg-red-100 text-red-700"
                                : "bg-amber-100 text-amber-700"
                          }`}
                        >

                          {
                            getDaysText(
                              item.daysLeft,
                            )
                          }

                        </span>

                      </td>

                      {/* STATUS */}

                      <td className="px-4 py-4">

                        <span
                          className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[8px] font-semibold ${
                            item.status ===
                            "EXPIRED"
                              ? "bg-rose-100 text-rose-700"
                              : item.status ===
                                  "CRITICAL"
                                ? "bg-red-100 text-red-700"
                                : "bg-amber-100 text-amber-700"
                          }`}
                        >

                          {
                            item.status ===
                            "EXPIRED"
                              ? "Expired"
                              : item.status ===
                                  "CRITICAL"
                                ? "Critical"
                                : "Near Expiry"
                          }

                        </span>

                      </td>

                      {/* ACTION */}

                      <td className="px-4 py-4">

                        <button
                          type="button"
                          onClick={() =>
                            viewBatch(
                              item,
                            )
                          }
                          title="View in stock"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-sky-600 transition hover:bg-sky-50"
                        >

                          <Eye className="h-3.5 w-3.5" />

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
      {
        children
      }
    </th>
  );
}