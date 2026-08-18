"use client";

import Link from "next/link";

import {
  useEffect,
  useState,
} from "react";

import type {
  ReactNode,
} from "react";

import {
  AlertTriangle,
  Boxes,
  Clock3,
  Loader2,
  Pill,
  ReceiptText,
  RefreshCw,
  Users,
} from "lucide-react";

/* =========================================================
   TYPES
========================================================= */

type PaymentStatus =
  | "PAID"
  | "PARTIAL"
  | "DUE";

type LowStockStatus =
  | "LOW_STOCK"
  | "OUT_OF_STOCK";

type DashboardSummary = {
  currencyCode: string;

  totalMedicines: number;

  medicinesAddedThisMonth: number;

  todaySales: number;

  todayOrders: number;

  todayChangePercent:
    | number
    | null;

  monthlySales: number;

  monthlyLabel: string;

  stockedMedicines: number;

  totalCustomers: number;

  totalEmployees: number;

  activeEmployees: number;

  lowStockAlerts: number;

  lowStockCount: number;

  outOfStockCount: number;

  expiryAlerts: number;

  expiredBatches: number;

  expiringNext30: number;
};

type RecentSale = {
  id: number;

  invoice: string;

  customer: string;

  date: string;

  items: number;

  amount: number;

  method: string;

  paymentStatus:
    PaymentStatus;
};

type LowStockItem = {
  medicineId: number;

  medicineCode: string;

  medicineName: string;

  stock: number;

  reorderLevel: number;

  baseUnit: string;

  status:
    LowStockStatus;
};

type TopMedicine = {
  rank: number;

  medicineId: number;

  medicineCode: string;

  medicineName: string;

  category: string;

  soldQuantity: number;

  baseUnit: string;

  revenue: number;

  percent: number;
};

type TopCategory = {
  categoryId: number;

  category: string;

  soldQuantity: number;

  revenue: number;

  percent: number;
};

type DashboardData = {
  summary:
    DashboardSummary;

  recentSales:
    RecentSale[];

  lowStockItems:
    LowStockItem[];

  topMedicines:
    TopMedicine[];

  topCategories:
    TopCategory[];
};

type DashboardApiResponse = {
  success: boolean;

  message?: string;

  data?: DashboardData;
};

/* =========================================================
   API
========================================================= */

async function fetchDashboard(
  signal?: AbortSignal,
) {
  const response =
    await fetch(
      "/api/dashboard",
      {
        method: "GET",

        cache: "no-store",

        signal,
      },
    );

  const result =
    (await response.json()) as
      DashboardApiResponse;

  if (
    !response.ok ||
    !result.success ||
    !result.data
  ) {
    throw new Error(
      result.message ??
        "Failed to load dashboard.",
    );
  }

  return result.data;
}

/* =========================================================
   HELPERS
========================================================= */

function safeNumber(
  value: unknown,
) {
  const number =
    Number(value);

  return Number.isFinite(
    number,
  )
    ? number
    : 0;
}

function formatNumber(
  value: number,
) {
  return new Intl.NumberFormat(
    "en-BD",
    {
      maximumFractionDigits:
        2,
    },
  ).format(
    safeNumber(value),
  );
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

function getCurrencySymbol(
  currencyCode: string,
) {
  if (
    currencyCode === "BDT"
  ) {
    return "৳";
  }

  return `${currencyCode} `;
}

function formatMoney(
  value: number,
  currencyCode = "BDT",
) {
  return `${getCurrencySymbol(
    currencyCode,
  )}${formatNumber(
    value,
  )}`;
}

function formatDate(
  value: string,
) {
  if (!value) {
    return "—";
  }

  const parts =
    value.split("-");

  if (
    parts.length !== 3
  ) {
    return value;
  }

  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

function paymentStatusClass(
  status: PaymentStatus,
) {
  switch (status) {
    case "PAID":
      return "bg-emerald-100 text-emerald-700";

    case "PARTIAL":
      return "bg-amber-100 text-amber-700";

    case "DUE":
      return "bg-rose-100 text-rose-700";

    default:
      return "bg-slate-100 text-slate-600";
  }
}

function paymentStatusLabel(
  status: PaymentStatus,
) {
  switch (status) {
    case "PAID":
      return "Paid";

    case "PARTIAL":
      return "Partial";

    case "DUE":
      return "Due";
  }
}

/* =========================================================
   PAGE
========================================================= */

export default function PharmacistDashboardPage() {
  const [
    data,
    setData,
  ] =
    useState<DashboardData | null>(
      null,
    );

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
  ======================================================= */

  useEffect(() => {
    const controller =
      new AbortController();

    fetchDashboard(
      controller.signal,
    )
      .then(
        (
          dashboardData,
        ) => {
          if (
            controller.signal
              .aborted
          ) {
            return;
          }

          setData(
            dashboardData,
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
        (error) => {
          if (
            controller.signal
              .aborted
          ) {
            return;
          }

          console.error(
            "Pharmacist dashboard error:",
            error,
          );

          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Failed to load dashboard.",
          );

          setIsLoading(
            false,
          );
        },
      );

    return () => {
      controller.abort();
    };
  }, []);

  /* =======================================================
     REFRESH
  ======================================================= */

  async function refreshDashboard() {
    try {
      setIsLoading(true);

      setErrorMessage("");

      const dashboardData =
        await fetchDashboard();

      setData(
        dashboardData,
      );
    } catch (error) {
      console.error(
        "Pharmacist dashboard refresh error:",
        error,
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to refresh dashboard.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  /* =======================================================
     LOADING
  ======================================================= */

  if (
    isLoading &&
    !data
  ) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">

        <div className="flex items-center gap-3 text-sm text-slate-500">

          <Loader2 className="h-5 w-5 animate-spin" />

          Loading pharmacist dashboard...

        </div>

      </div>
    );
  }

  /* =======================================================
     ERROR
  ======================================================= */

  if (!data) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">

        <div className="w-full max-w-md rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">

          <AlertTriangle className="mx-auto h-8 w-8 text-rose-500" />

          <p className="mt-3 font-semibold text-rose-700">
            Could not load dashboard
          </p>

          <p className="mt-2 text-sm text-rose-600">
            {errorMessage}
          </p>

          <button
            type="button"
            onClick={() => {
              void refreshDashboard();
            }}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
          >
            <RefreshCw className="h-4 w-4" />

            Retry
          </button>

        </div>

      </div>
    );
  }

  const {
    summary,
    recentSales,
    lowStockItems,
    topMedicines,
    topCategories,
  } = data;

  const currencyCode =
    summary.currencyCode ??
    "BDT";

  /* =======================================================
     UI
  ======================================================= */

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-4">

      {/* ===================================================
          TOP 4 CARDS
      =================================================== */}

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">

        <SummaryCard
          href="/pharmacist/search-medicine"
          title="Total Medicines"
          value={formatNumber(
            summary.totalMedicines,
          )}
          subtitle="Active medicines"
          borderClass="border-sky-200"
          iconClass="bg-sky-50 text-sky-600"
          icon={
            <Pill className="h-5 w-5" />
          }
        />

        <SummaryCard
          href="/pharmacist/stock"
          title="Stocked Medicines"
          value={formatNumber(
            summary.stockedMedicines,
          )}
          subtitle="Medicines with batch records"
          borderClass="border-teal-200"
          iconClass="bg-teal-50 text-teal-600"
          icon={
            <Boxes className="h-5 w-5" />
          }
        />

        <SummaryCard
          href="/pharmacist/low-stock-alerts"
          title="Low Stock Alerts"
          value={formatNumber(
            summary.lowStockAlerts,
          )}
          subtitle={`${formatNumber(
            summary.outOfStockCount,
          )} out of stock`}
          borderClass="border-amber-200"
          iconClass="bg-amber-50 text-amber-600"
          icon={
            <AlertTriangle className="h-5 w-5" />
          }
        />

        <SummaryCard
          href="/pharmacist/expiry-alerts"
          title="Expiry Alerts"
          value={formatNumber(
            summary.expiryAlerts,
          )}
          subtitle="Expired + within 30 days"
          borderClass="border-rose-200"
          iconClass="bg-rose-50 text-rose-600"
          icon={
            <Clock3 className="h-5 w-5" />
          }
        />

      </section>

      {/* ===================================================
          SECOND ROW
      =================================================== */}

      <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">

        <SummaryCard
          href="/pharmacist/sales"
          title="Today's Invoices"
          value={formatNumber(
            summary.todayOrders,
          )}
          subtitle={`${formatMoney(
            summary.todaySales,
            currencyCode,
          )} sales today`}
          borderClass="border-violet-200"
          iconClass="bg-violet-50 text-violet-600"
          icon={
            <ReceiptText className="h-5 w-5" />
          }
        />

        <SummaryCard
          href="/pharmacist/customers"
          title="Registered Customers"
          value={formatNumber(
            summary.totalCustomers,
          )}
          subtitle="Customer records"
          borderClass="border-indigo-200"
          iconClass="bg-indigo-50 text-indigo-600"
          icon={
            <Users className="h-5 w-5" />
          }
        />

      </section>

      {/* ===================================================
          RECENT SALES + LOW STOCK
      =================================================== */}

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">

        {/* RECENT SALES */}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">

            <div>

              <h3 className="text-sm font-semibold text-slate-900">
                Recent Sales
              </h3>

              <p className="mt-0.5 text-[10px] text-slate-400">
                Latest completed pharmacy sales
              </p>

            </div>

            <Link
              href="/pharmacist/sales"
              className="text-[11px] font-medium text-sky-600 hover:text-sky-700"
            >
              View all
            </Link>

          </div>

          <div className="overflow-x-auto">

            <table className="w-full min-w-[700px]">

              <thead>

                <tr className="border-b border-slate-200 bg-slate-50/70">

                  <TableHead>
                    Invoice
                  </TableHead>

                  <TableHead>
                    Customer
                  </TableHead>

                  <TableHead>
                    Date
                  </TableHead>

                  <TableHead>
                    Items
                  </TableHead>

                  <TableHead>
                    Amount
                  </TableHead>

                  <TableHead>
                    Status
                  </TableHead>

                </tr>

              </thead>

              <tbody>

                {recentSales.length >
                0 ? (
                  recentSales.map(
                    (sale) => (
                      <tr
                        key={
                          sale.id
                        }
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60"
                      >

                        <td className="px-4 py-3">

                          <span className="text-[11px] font-medium text-sky-600">
                            {
                              sale.invoice
                            }
                          </span>

                        </td>

                        <td className="px-4 py-3 text-[11px] font-medium text-slate-700">
                          {
                            sale.customer
                          }
                        </td>

                        <td className="px-4 py-3 text-[10px] text-slate-500">
                          {formatDate(
                            sale.date,
                          )}
                        </td>

                        <td className="px-4 py-3 text-[10px] text-slate-600">
                          {
                            sale.items
                          }
                        </td>

                        <td className="px-4 py-3 text-[10px] font-semibold text-slate-700">
                          {formatMoney(
                            sale.amount,
                            currencyCode,
                          )}
                        </td>

                        <td className="px-4 py-3">

                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-[9px] font-medium ${paymentStatusClass(
                              sale.paymentStatus,
                            )}`}
                          >
                            {paymentStatusLabel(
                              sale.paymentStatus,
                            )}
                          </span>

                        </td>

                      </tr>
                    ),
                  )
                ) : (

                  <tr>

                    <td
                      colSpan={6}
                      className="px-5 py-12 text-center text-[11px] text-slate-400"
                    >
                      No completed sales yet.
                    </td>

                  </tr>

                )}

              </tbody>

            </table>

          </div>

        </div>

        {/* LOW STOCK */}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">

            <div>

              <h3 className="text-sm font-semibold text-slate-900">
                Low Stock Alerts
              </h3>

              <p className="mt-0.5 text-[10px] text-slate-400">
                Medicines needing attention
              </p>

            </div>

            <Link
              href="/pharmacist/low-stock-alerts"
              className="text-[11px] font-medium text-sky-600 hover:text-sky-700"
            >
              View all
            </Link>

          </div>

          <div>

            {lowStockItems.length >
            0 ? (
              lowStockItems.map(
                (item) => (
                  <div
                    key={
                      item.medicineId
                    }
                    className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-0"
                  >

                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${
                        item.status ===
                        "OUT_OF_STOCK"
                          ? "bg-rose-500"
                          : "bg-amber-500"
                      }`}
                    />

                    <div className="min-w-0 flex-1">

                      <p className="truncate text-[11px] font-semibold text-slate-800">
                        {
                          item.medicineName
                        }
                      </p>

                      <p className="mt-0.5 text-[9px] text-slate-400">
                        Stock:{" "}
                        {formatQuantity(
                          item.stock,
                        )}{" "}
                        {
                          item.baseUnit
                        }
                        {" · "}
                        Min:{" "}
                        {formatQuantity(
                          item.reorderLevel,
                        )}
                      </p>

                    </div>

                    <span
                      className={`rounded-full px-2 py-1 text-[9px] font-medium ${
                        item.status ===
                        "OUT_OF_STOCK"
                          ? "bg-rose-100 text-rose-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {item.status ===
                      "OUT_OF_STOCK"
                        ? "Out"
                        : "Low"}
                    </span>

                  </div>
                ),
              )
            ) : (

              <div className="px-4 py-12 text-center text-[11px] text-slate-400">
                No low stock alerts.
              </div>

            )}

          </div>

        </div>

      </section>

      {/* ===================================================
          TOP MEDICINES + CATEGORIES
      =================================================== */}

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">

        {/* TOP MEDICINES */}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-200 px-4 py-4">

            <h3 className="text-sm font-semibold text-slate-900">
              Most Sold Medicines
            </h3>

            <p className="mt-0.5 text-[10px] text-slate-400">
              Top 5 by sold base quantity
            </p>

          </div>

          <div className="divide-y divide-slate-100">

            {topMedicines.length >
            0 ? (
              topMedicines.map(
                (medicine) => (
                  <div
                    key={
                      medicine.medicineId
                    }
                    className="flex items-center gap-3 px-4 py-3"
                  >

                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-50 text-[10px] font-bold text-sky-600">
                      {
                        medicine.rank
                      }
                    </div>

                    <div className="min-w-0 flex-1">

                      <div className="flex items-center justify-between gap-3">

                        <p className="truncate text-[11px] font-semibold text-slate-800">
                          {
                            medicine.medicineName
                          }
                        </p>

                        <span className="shrink-0 text-[10px] font-medium text-slate-600">
                          {formatQuantity(
                            medicine.soldQuantity,
                          )}{" "}
                          {
                            medicine.baseUnit
                          }
                        </span>

                      </div>

                      <p className="mt-0.5 text-[9px] text-slate-400">
                        {
                          medicine.category
                        }
                      </p>

                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">

                        <div
                          className="h-full rounded-full bg-sky-500"
                          style={{
                            width: `${Math.max(
                              0,
                              Math.min(
                                100,
                                medicine.percent,
                              ),
                            )}%`,
                          }}
                        />

                      </div>

                    </div>

                  </div>
                ),
              )
            ) : (

              <div className="px-4 py-12 text-center text-[11px] text-slate-400">
                No medicine sales data yet.
              </div>

            )}

          </div>

        </div>

        {/* TOP CATEGORIES */}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-200 px-4 py-4">

            <h3 className="text-sm font-semibold text-slate-900">
              Most Sold Medicine Categories
            </h3>

            <p className="mt-0.5 text-[10px] text-slate-400">
              Category performance by sales revenue
            </p>

          </div>

          <div className="divide-y divide-slate-100">

            {topCategories.length >
            0 ? (
              topCategories.map(
                (
                  category,
                  index,
                ) => (
                  <div
                    key={
                      category.categoryId
                    }
                    className="px-4 py-3"
                  >

                    <div className="flex items-center justify-between gap-3">

                      <div className="flex min-w-0 items-center gap-3">

                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-50 text-[10px] font-bold text-violet-600">
                          {index +
                            1}
                        </div>

                        <div className="min-w-0">

                          <p className="truncate text-[11px] font-semibold text-slate-800">
                            {
                              category.category
                            }
                          </p>

                          <p className="mt-0.5 text-[9px] text-slate-400">
                            {formatQuantity(
                              category.soldQuantity,
                            )}{" "}
                            base units sold
                          </p>

                        </div>

                      </div>

                      <div className="text-right">

                        <p className="text-[10px] font-semibold text-slate-700">
                          {formatMoney(
                            category.revenue,
                            currencyCode,
                          )}
                        </p>

                        <p className="mt-0.5 text-[9px] text-slate-400">
                          {formatNumber(
                            category.percent,
                          )}
                          %
                        </p>

                      </div>

                    </div>

                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">

                      <div
                        className="h-full rounded-full bg-violet-500"
                        style={{
                          width: `${Math.max(
                            0,
                            Math.min(
                              100,
                              category.percent,
                            ),
                          )}%`,
                        }}
                      />

                    </div>

                  </div>
                ),
              )
            ) : (

              <div className="px-4 py-12 text-center text-[11px] text-slate-400">
                No category sales data yet.
              </div>

            )}

          </div>

        </div>

      </section>

      {/* REFRESH ERROR */}

      {errorMessage ? (
        <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">

          <p className="text-[11px] text-amber-700">
            {errorMessage}
          </p>

          <button
            type="button"
            disabled={
              isLoading
            }
            onClick={() => {
              void refreshDashboard();
            }}
            className="inline-flex items-center gap-2 text-[11px] font-medium text-amber-700"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${
                isLoading
                  ? "animate-spin"
                  : ""
              }`}
            />

            Refresh
          </button>

        </div>
      ) : null}

    </div>
  );
}

/* =========================================================
   COMPONENTS
========================================================= */

function SummaryCard({
  href,
  title,
  value,
  subtitle,
  icon,
  borderClass,
  iconClass,
}: {
  href: string;

  title: string;

  value: string;

  subtitle: string;

  icon: ReactNode;

  borderClass: string;

  iconClass: string;
}) {
  return (
    <Link
      href={href}
      className={`group flex min-h-[108px] items-start justify-between rounded-2xl border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${borderClass}`}
    >

      <div>

        <p className="text-[10px] font-medium text-slate-500">
          {title}
        </p>

        <p className="mt-2 text-2xl font-bold text-slate-950">
          {value}
        </p>

        <p className="mt-1 text-[9px] text-slate-400">
          {subtitle}
        </p>

      </div>

      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconClass}`}
      >
        {icon}
      </div>

    </Link>
  );
}

function TableHead({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <th className="whitespace-nowrap px-4 py-3 text-left text-[10px] font-medium text-slate-500">
      {children}
    </th>
  );
}