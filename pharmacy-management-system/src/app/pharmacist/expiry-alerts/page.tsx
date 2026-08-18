"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  Eye,
  Loader2,
  RefreshCcw,
} from "lucide-react";

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

function formatQuantity(value: number) {
  return Number(value).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
}

function formatDate(value: string) {
  if (!value) return "-";

  const parts = value.split("-");

  if (parts.length !== 3) {
    return value;
  }

  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

function getDaysText(daysLeft: number) {
  if (daysLeft < 0) {
    return `${Math.abs(daysLeft)}d ago`;
  }

  if (daysLeft === 0) {
    return "Today";
  }

  return `${daysLeft}d left`;
}

function getStatusLabel(status: ExpiryStatus) {
  if (status === "EXPIRED") {
    return "Expired";
  }

  if (status === "CRITICAL") {
    return "Critical";
  }

  return "Near Expiry";
}

function getStatusClasses(status: ExpiryStatus) {
  if (status === "EXPIRED") {
    return "bg-rose-100 text-rose-700";
  }

  if (status === "CRITICAL") {
    return "bg-red-100 text-red-700";
  }

  return "bg-amber-100 text-amber-700";
}

/* =========================================================
   API
========================================================= */

async function loadExpiryAlerts(
  signal?: AbortSignal,
): Promise<ExpiryData> {
  const response = await fetch("/api/expiry-alerts", {
    method: "GET",
    cache: "no-store",
    signal,
  });

  const result: ExpiryApiResponse =
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

export default function PharmacistExpiryAlertsPage() {
  const router = useRouter();

  const [items, setItems] = useState<ExpiryItem[]>([]);

  const [summary, setSummary] =
    useState<ExpirySummary>({
      expired: 0,
      expiring15: 0,
      expiring30: 0,
      totalAffected: 0,
    });

  const [isLoading, setIsLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    const controller = new AbortController();

    loadExpiryAlerts(controller.signal)
      .then((data) => {
        if (controller.signal.aborted) {
          return;
        }

        setSummary(data.summary);
        setItems(data.items);
        setErrorMessage("");
        setIsLoading(false);
      })
      .catch((error) => {
        if (controller.signal.aborted) {
          return;
        }

        console.error(
          "Expiry alerts load error:",
          error,
        );

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Failed to load expiry alerts.",
        );

        setIsLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, []);

  /* =======================================================
     REFRESH
  ======================================================= */

  async function handleRefresh() {
    try {
      setIsLoading(true);
      setErrorMessage("");

      const data = await loadExpiryAlerts();

      setSummary(data.summary);
      setItems(data.items);
    } catch (error) {
      console.error(
        "Expiry alerts refresh error:",
        error,
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to load expiry alerts.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  /* =======================================================
     VIEW STOCK
  ======================================================= */

  function handleViewStock(item: ExpiryItem) {
    router.push(
      `/pharmacist/stock?medicine=${encodeURIComponent(
        item.medicineCode,
      )}`,
    );
  }

  /* =======================================================
     CSV EXPORT
  ======================================================= */

  function handleExport() {
    if (items.length === 0) {
      window.alert(
        "No expiry alert data available to export.",
      );

      return;
    }

    const headers = [
      "Medicine Name",
      "Medicine Code",
      "Batch No",
      "Company",
      "Quantity",
      "Unit",
      "Expiry Date",
      "Days Left",
      "Status",
    ];

    const rows = items.map((item) => [
      item.medicineName,
      item.medicineCode,
      item.batchNo,
      item.companyName,
      item.quantity,
      item.unit,
      item.expiryDate,
      item.daysLeft,
      getStatusLabel(item.status),
    ]);

    const csvContent = [
      headers,
      ...rows,
    ]
      .map((row) =>
        row
          .map(
            (value) =>
              `"${String(value).replace(
                /"/g,
                '""',
              )}"`,
          )
          .join(","),
      )
      .join("\n");

    const blob = new Blob(
      ["\uFEFF", csvContent],
      {
        type: "text/csv;charset=utf-8;",
      },
    );

    const url = URL.createObjectURL(blob);

    const anchor =
      document.createElement("a");

    anchor.href = url;

    anchor.download = `expiry-alerts-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(anchor);

    anchor.click();

    document.body.removeChild(anchor);

    URL.revokeObjectURL(url);
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

        <div className="min-h-[88px] rounded-2xl border border-rose-200 bg-rose-50/70 p-4">
          <p className="text-[9px] font-medium text-slate-500">
            Expired Batches
          </p>

          <p className="mt-2 text-[22px] font-semibold text-rose-600">
            {summary.expired}
          </p>
        </div>

        {/* CRITICAL */}

        <div className="min-h-[88px] rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
          <p className="text-[9px] font-medium text-slate-500">
            Expiring in 15 Days
          </p>

          <p className="mt-2 text-[22px] font-semibold text-amber-600">
            {summary.expiring15}
          </p>
        </div>

        {/* NEAR EXPIRY */}

        <div className="min-h-[88px] rounded-2xl border border-orange-200 bg-orange-50/70 p-4">
          <p className="text-[9px] font-medium text-slate-500">
            Expiring in 16–30 Days
          </p>

          <p className="mt-2 text-[22px] font-semibold text-orange-600">
            {summary.expiring30}
          </p>
        </div>
      </section>

      {/* ===================================================
          MAIN TABLE CARD
      =================================================== */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* HEADER */}

        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-[12px] font-semibold text-slate-900">
              Expiry Alerts
            </h2>

            <p className="mt-1 text-[9px] text-slate-400">
              Batch-level alerts for expired medicines
              and batches expiring within the next 30 days.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* REFRESH */}

            <button
              type="button"
              onClick={() => void handleRefresh()}
              disabled={isLoading}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-[9px] font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCcw
                className={`h-3 w-3 ${
                  isLoading
                    ? "animate-spin"
                    : ""
                }`}
              />

              Refresh
            </button>

            {/* EXPORT */}

            <button
              type="button"
              onClick={handleExport}
              disabled={
                isLoading || items.length === 0
              }
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-[9px] font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Download className="h-3.5 w-3.5" />

              Export
            </button>
          </div>
        </div>

        {/* ERROR */}

        {errorMessage ? (
          <div className="flex items-center justify-between gap-3 border-b border-rose-200 bg-rose-50 px-5 py-3">
            <p className="text-[9px] text-rose-700">
              {errorMessage}
            </p>

            <button
              type="button"
              onClick={() => void handleRefresh()}
              className="text-[9px] font-semibold text-rose-700 underline"
            >
              Retry
            </button>
          </div>
        ) : null}

        {/* LOADING */}

        {isLoading ? (
          <div className="flex min-h-[280px] items-center justify-center">
            <div className="text-center">
              <Loader2 className="mx-auto h-7 w-7 animate-spin text-sky-600" />

              <p className="mt-3 text-[10px] text-slate-500">
                Checking medicine batch expiry dates...
              </p>
            </div>
          </div>
        ) : items.length === 0 ? (
          /* EMPTY */

          <div className="flex min-h-[280px] items-center justify-center">
            <div className="text-center">
              <p className="text-[12px] font-semibold text-emerald-700">
                No expiry alerts
              </p>

              <p className="mt-1 text-[9px] text-slate-400">
                No stocked batch is expired or
                expiring within 30 days.
              </p>
            </div>
          </div>
        ) : (
          /* TABLE */

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1150px] border-collapse">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-[9px] font-medium text-slate-500">
                    Medicine Name
                  </th>

                  <th className="px-4 py-3 text-left text-[9px] font-medium text-slate-500">
                    Batch No.
                  </th>

                  <th className="px-4 py-3 text-left text-[9px] font-medium text-slate-500">
                    Company
                  </th>

                  <th className="px-4 py-3 text-left text-[9px] font-medium text-slate-500">
                    Quantity
                  </th>

                  <th className="px-4 py-3 text-left text-[9px] font-medium text-slate-500">
                    Unit
                  </th>

                  <th className="px-4 py-3 text-left text-[9px] font-medium text-slate-500">
                    Expiry Date
                  </th>

                  <th className="px-4 py-3 text-left text-[9px] font-medium text-slate-500">
                    Days Left
                  </th>

                  <th className="px-4 py-3 text-left text-[9px] font-medium text-slate-500">
                    Status
                  </th>

                  <th className="px-4 py-3 text-left text-[9px] font-medium text-slate-500">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-t border-slate-100 transition hover:bg-slate-50/70"
                  >
                    {/* MEDICINE */}

                    <td className="px-4 py-4">
                      <p className="text-[11px] font-semibold text-slate-900">
                        {item.medicineName}
                      </p>

                      <p className="mt-1 font-mono text-[7px] text-slate-400">
                        {item.medicineCode}
                      </p>
                    </td>

                    {/* BATCH */}

                    <td className="px-4 py-4">
                      <span className="font-mono text-[9px] font-medium text-slate-700">
                        {item.batchNo}
                      </span>
                    </td>

                    {/* COMPANY */}

                    <td className="px-4 py-4 text-[9px] text-slate-500">
                      {item.companyName || "-"}
                    </td>

                    {/* QUANTITY */}

                    <td className="px-4 py-4 text-[10px] font-medium text-slate-700">
                      {formatQuantity(item.quantity)}
                    </td>

                    {/* UNIT */}

                    <td className="px-4 py-4 text-[9px] text-slate-600">
                      {item.unit || "Unit"}
                    </td>

                    {/* EXPIRY */}

                    <td className="px-4 py-4 text-[9px] text-slate-500">
                      {formatDate(item.expiryDate)}
                    </td>

                    {/* DAYS LEFT */}

                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[8px] font-semibold ${getStatusClasses(
                          item.status,
                        )}`}
                      >
                        {getDaysText(item.daysLeft)}
                      </span>
                    </td>

                    {/* STATUS */}

                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[8px] font-semibold ${getStatusClasses(
                          item.status,
                        )}`}
                      >
                        {getStatusLabel(item.status)}
                      </span>
                    </td>

                    {/* ACTION */}

                    <td className="px-4 py-4">
                      <button
                        type="button"
                        title="View in Stock"
                        onClick={() =>
                          handleViewStock(item)
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-sky-600 transition hover:bg-sky-50"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}