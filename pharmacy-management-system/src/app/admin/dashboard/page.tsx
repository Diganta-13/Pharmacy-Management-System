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
  RefreshCw,
  TrendingUp,
  UserCog,
  Users,
  WalletCards,
} from "lucide-react";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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

/* =========================================================
   API RESPONSE TYPES
========================================================= */

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

type MonthlySalesItem = {
  monthNumber: number;

  month: string;

  revenue: number;
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

  chart: {
    year: number;

    changePercent:
      | number
      | null;

    months:
      MonthlySalesItem[];
  };

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
   FETCH
========================================================= */

async function fetchDashboard(
  signal?: AbortSignal,
): Promise<DashboardData> {
  const response =
    await fetch(
      "/api/dashboard",
      {
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
   FORMAT HELPERS
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
  )}${formatNumber(value)}`;
}

function formatDate(
  value: string,
) {
  if (!value) {
    return "-";
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

function formatPercent(
  value:
    | number
    | null,
) {
  if (
    value === null
  ) {
    return "—";
  }

  if (
    value > 0
  ) {
    return `+${formatNumber(
      value,
    )}%`;
  }

  return `${formatNumber(
    value,
  )}%`;
}

function formatAxisMoney(
  value: number,
) {
  const amount =
    safeNumber(value);

  if (
    amount >=
    1_000_000
  ) {
    return `৳${formatNumber(
      amount /
        1_000_000,
    )}m`;
  }

  if (
    amount >=
    1000
  ) {
    return `৳${formatNumber(
      amount /
        1000,
    )}k`;
  }

  return `৳${formatNumber(
    amount,
  )}`;
}

/* =========================================================
   COLORS
========================================================= */

const categoryColors = [
  "#078bcb",
  "#159c92",
  "#7347f2",
  "#f59e0b",
  "#10b981",
];

/* =========================================================
   PAGE
========================================================= */

export default function DashboardPage() {
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
            "Dashboard load error:",
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
      setIsLoading(
        true,
      );

      setErrorMessage(
        "",
      );

      const dashboardData =
        await fetchDashboard();

      setData(
        dashboardData,
      );
    } catch (error) {
      console.error(
        "Dashboard refresh error:",
        error,
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to load dashboard.",
      );
    } finally {
      setIsLoading(
        false,
      );
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
      <div
        className="
          flex
          min-h-[500px]
          items-center
          justify-center
        "
      >
        <div
          className="
            flex
            items-center
            gap-3
            text-slate-500
          "
        >
          <Loader2
            size={22}
            className="
              animate-spin
            "
          />

          Loading dashboard...
        </div>
      </div>
    );
  }

  /* =======================================================
     ERROR
  ======================================================= */

  if (!data) {
    return (
      <div
        className="
          flex
          min-h-[500px]
          items-center
          justify-center
          p-5
        "
      >
        <div
          className="
            max-w-md
            rounded-2xl
            border
            border-red-200
            bg-red-50
            p-6
            text-center
          "
        >
          <AlertTriangle
            className="
              mx-auto
              mb-3
              text-red-500
            "
            size={32}
          />

          <p
            className="
              font-semibold
              text-red-700
            "
          >
            Could not load dashboard
          </p>

          <p
            className="
              mt-2
              text-sm
              text-red-600
            "
          >
            {errorMessage}
          </p>

          <button
            type="button"
            onClick={() => {
              void refreshDashboard();
            }}
            className="
              mt-4
              inline-flex
              items-center
              gap-2
              rounded-xl
              bg-red-600
              px-4
              py-2
              text-sm
              font-medium
              text-white
              hover:bg-red-700
            "
          >
            <RefreshCw
              size={15}
            />

            Retry
          </button>
        </div>
      </div>
    );
  }

  const {
    summary,
    chart,
    recentSales,
    lowStockItems,
    topMedicines,
    topCategories,
  } = data;

  const currencyCode =
    summary.currencyCode ??
    "BDT";

  return (
    <div
      className="
        min-h-full
        bg-[#f5f8fa]
        p-4
        md:p-5
      "
    >
      <div className="space-y-4">
        {/* =================================================
            SUMMARY CARDS
        ================================================= */}

        <div
          className="
            grid
            grid-cols-1
            gap-3
            sm:grid-cols-2
            xl:grid-cols-4
          "
        >
          <DashboardCard
            href="/admin/medicines"
            title="Total Medicines"
            value={formatNumber(
              summary.totalMedicines,
            )}
            subtitle="Active medicines"
            borderClass="border-sky-200"
            iconClass="bg-sky-50 text-sky-600"
            icon={
              <Pill
                size={21}
              />
            }
          />

          <DashboardCard
            href="/admin/sales"
            title="Today's Sales"
            value={formatMoney(
              summary.todaySales,
              currencyCode,
            )}
            subtitle={
              summary.todayChangePercent ===
              null
                ? `${formatNumber(
                    summary.todayOrders,
                  )} order${
                    summary.todayOrders ===
                    1
                      ? ""
                      : "s"
                  } today`
                : `${formatPercent(
                    summary.todayChangePercent,
                  )} from yesterday`
            }
            borderClass="border-emerald-200"
            iconClass="bg-emerald-50 text-emerald-600"
            icon={
              <WalletCards
                size={21}
              />
            }
          />

          <DashboardCard
            href="/admin/low-stock-alerts"
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
              <AlertTriangle
                size={21}
              />
            }
          />

          <DashboardCard
            href="/admin/expiry-alerts"
            title="Expiry Alerts"
            value={formatNumber(
              summary.expiryAlerts,
            )}
            subtitle="Expired + within 30 days"
            borderClass="border-rose-200"
            iconClass="bg-rose-50 text-rose-500"
            icon={
              <Clock3
                size={21}
              />
            }
          />

          <DashboardCard
            href="/admin/reports"
            title="Monthly Sales"
            value={formatMoney(
              summary.monthlySales,
              currencyCode,
            )}
            subtitle={
              summary.monthlyLabel
            }
            borderClass="border-violet-200"
            iconClass="bg-violet-50 text-violet-600"
            icon={
              <TrendingUp
                size={21}
              />
            }
          />

          <DashboardCard
            href="/admin/stock"
            title="Stocked Medicines"
            value={formatNumber(
              summary.stockedMedicines,
            )}
            subtitle="Medicines with stock records"
            borderClass="border-sky-200"
            iconClass="bg-sky-50 text-sky-600"
            icon={
              <Boxes
                size={21}
              />
            }
          />

          <DashboardCard
            href="/admin/customers"
            title="Total Customers"
            value={formatNumber(
              summary.totalCustomers,
            )}
            subtitle="Registered customers"
            borderClass="border-teal-200"
            iconClass="bg-teal-50 text-teal-600"
            icon={
              <Users
                size={21}
              />
            }
          />

          <DashboardCard
            href="/admin/employees"
            title="Total Employees"
            value={formatNumber(
              summary.totalEmployees,
            )}
            subtitle={`${formatNumber(
              summary.activeEmployees,
            )} active`}
            borderClass="border-indigo-200"
            iconClass="bg-indigo-50 text-indigo-600"
            icon={
              <UserCog
                size={21}
              />
            }
          />
        </div>

        {/* =================================================
            SALES CHART + DONUT
        ================================================= */}

        <div
          className="
            grid
            grid-cols-1
            gap-4
            xl:grid-cols-12
          "
        >
          <section
            className="
              rounded-2xl
              border
              border-slate-200
              bg-white
              p-4
              shadow-sm
              xl:col-span-8
            "
          >
            <div
              className="
                flex
                items-start
                justify-between
                gap-4
              "
            >
              <div>
                <h2
                  className="
                    text-sm
                    font-semibold
                    text-slate-950
                  "
                >
                  Monthly Sales Chart
                </h2>

                <p
                  className="
                    mt-1
                    text-xs
                    text-slate-500
                  "
                >
                  Jan -{" "}
                  {chart.months[
                    chart.months.length -
                      1
                  ]?.month ??
                    "Current"}{" "}
                  {chart.year} ·
                  Bangladeshi Taka (৳)
                </p>
              </div>

              <span
                className={`
                  rounded-full
                  border
                  px-3
                  py-1
                  text-xs
                  font-medium
                  ${
                    chart.changePercent ===
                    null
                      ? "border-slate-200 bg-slate-50 text-slate-500"
                      : chart.changePercent >=
                          0
                        ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                        : "border-red-200 bg-red-50 text-red-500"
                  }
                `}
              >
                {chart.changePercent ===
                null
                  ? "No prior data"
                  : formatPercent(
                      chart.changePercent,
                    )}
              </span>
            </div>

            <div
              className="
                mt-3
                h-[330px]
                w-full
              "
            >
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <BarChart
                  data={
                    chart.months
                  }
                  margin={{
                    top: 15,
                    right: 15,
                    left: 10,
                    bottom: 0,
                  }}
                >
                  <CartesianGrid
                    stroke="#e9eef3"
                    strokeDasharray="3 3"
                    vertical={
                      false
                    }
                  />

                  <XAxis
                    dataKey="month"
                    axisLine={
                      false
                    }
                    tickLine={
                      false
                    }
                    tick={{
                      fill: "#94a3b8",
                      fontSize: 12,
                    }}
                    dy={8}
                  />

                  <YAxis
                    axisLine={
                      false
                    }
                    tickLine={
                      false
                    }
                    width={65}
                    tick={{
                      fill: "#94a3b8",
                      fontSize: 12,
                    }}
                    tickFormatter={(
                      value,
                    ) =>
                      formatAxisMoney(
                        Number(
                          value,
                        ),
                      )
                    }
                  />

                  <Tooltip
                    cursor={{
                      fill: "#eef2f7",
                    }}
                    contentStyle={{
                      borderRadius:
                        "12px",
                      border:
                        "1px solid #e2e8f0",
                      boxShadow:
                        "0 8px 24px rgba(15,23,42,.10)",
                    }}
                    labelStyle={{
                      fontWeight: 600,
                      color: "#0f172a",
                    }}
                    formatter={(
                      value,
                    ) => [
                      formatMoney(
                        Number(
                          value ?? 0,
                        ),
                        currencyCode,
                      ),
                      "Revenue",
                    ]}
                  />

                  <Bar
                    dataKey="revenue"
                    fill="#0d8dcc"
                    radius={[
                      7,
                      7,
                      0,
                      0,
                    ]}
                    maxBarSize={38}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* =================================================
              DONUT
          ================================================= */}

          <section
            className="
              rounded-2xl
              border
              border-slate-200
              bg-white
              p-4
              shadow-sm
              xl:col-span-4
            "
          >
            <h2
              className="
                text-sm
                font-semibold
                text-slate-950
              "
            >
              Most Sold Medicine Type
            </h2>

            <p
              className="
                mt-1
                text-xs
                text-slate-500
              "
            >
              By revenue · Admin view
            </p>

            {topCategories.length ===
            0 ? (
              <div
                className="
                  flex
                  h-[360px]
                  items-center
                  justify-center
                  text-sm
                  text-slate-400
                "
              >
                No sales data available.
              </div>
            ) : (
              <>
                <div className="h-[210px]">
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >
                    <PieChart>
                      <Pie
                        data={
                          topCategories
                        }
                        dataKey="revenue"
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        innerRadius={48}
                        outerRadius={78}
                        paddingAngle={2}
                        stroke="#ffffff"
                        strokeWidth={3}
                      >
                        {topCategories.map(
                          (
                            category,
                            index,
                          ) => (
                            <Cell
                              key={
                                category.categoryId
                              }
                              fill={
                                categoryColors[
                                  index %
                                    categoryColors.length
                                ]
                              }
                            />
                          ),
                        )}
                      </Pie>

                      <Tooltip
                        contentStyle={{
                          borderRadius:
                            "12px",
                          border:
                            "1px solid #e2e8f0",
                        }}
                        formatter={(
                          value,
                        ) => [
                          formatMoney(
                            Number(
                              value ?? 0,
                            ),
                            currencyCode,
                          ),
                          "Revenue",
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-2.5">
                  {topCategories.map(
                    (
                      category,
                      index,
                    ) => (
                      <div
                        key={
                          category.categoryId
                        }
                        className="
                          grid
                          grid-cols-[1fr_auto_auto]
                          items-center
                          gap-3
                          text-xs
                        "
                      >
                        <div
                          className="
                            flex
                            min-w-0
                            items-center
                            gap-2
                            text-slate-600
                          "
                        >
                          <span
                            className="
                              h-2.5
                              w-2.5
                              shrink-0
                              rounded-full
                            "
                            style={{
                              backgroundColor:
                                categoryColors[
                                  index %
                                    categoryColors.length
                                ],
                            }}
                          />

                          <span className="truncate">
                            {
                              category.category
                            }
                          </span>
                        </div>

                        <span
                          className="
                            font-semibold
                            text-slate-900
                          "
                        >
                          {formatNumber(
                            category.percent,
                          )}
                          %
                        </span>

                        <span
                          className="
                            min-w-[80px]
                            text-right
                            font-medium
                            text-emerald-600
                          "
                        >
                          {formatMoney(
                            category.revenue,
                            currencyCode,
                          )}
                        </span>
                      </div>
                    ),
                  )}
                </div>
              </>
            )}
          </section>
        </div>

        {/* =================================================
            RECENT SALES + LOW STOCK
        ================================================= */}

        <div
          className="
            grid
            grid-cols-1
            gap-4
            xl:grid-cols-12
          "
        >
          <section
            className="
              overflow-hidden
              rounded-2xl
              border
              border-slate-200
              bg-white
              shadow-sm
              xl:col-span-8
            "
          >
            <div
              className="
                flex
                items-center
                justify-between
                border-b
                border-slate-200
                px-4
                py-4
              "
            >
              <div>
                <h2
                  className="
                    text-sm
                    font-semibold
                    text-slate-950
                  "
                >
                  Recent Sales
                </h2>

                <p
                  className="
                    mt-1
                    text-xs
                    text-slate-500
                  "
                >
                  Invoice, amount & payment method
                </p>
              </div>

              <Link
                href="/admin/sales"
                className="
                  text-xs
                  font-medium
                  text-sky-600
                  hover:text-sky-700
                "
              >
                View all
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table
                className="
                  w-full
                  min-w-[820px]
                "
              >
                <thead>
                  <tr
                    className="
                      bg-slate-50
                      text-left
                      text-xs
                      text-slate-500
                    "
                  >
                    <th className="px-4 py-3 font-medium">
                      Invoice
                    </th>

                    <th className="px-4 py-3 font-medium">
                      Customer
                    </th>

                    <th className="px-4 py-3 font-medium">
                      Date
                    </th>

                    <th className="px-4 py-3 font-medium">
                      Items
                    </th>

                    <th className="px-4 py-3 font-medium">
                      Amount (৳)
                    </th>

                    <th className="px-4 py-3 font-medium">
                      Method
                    </th>

                    <th className="px-4 py-3 font-medium">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {recentSales.length ===
                  0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="
                          px-4
                          py-10
                          text-center
                          text-sm
                          text-slate-400
                        "
                      >
                        No completed sales found.
                      </td>
                    </tr>
                  ) : (
                    recentSales.map(
                      (sale) => (
                        <tr
                          key={
                            sale.id
                          }
                          className="
                            border-t
                            border-slate-100
                            text-sm
                          "
                        >
                          <td
                            className="
                              px-4
                              py-3
                              font-medium
                              text-sky-600
                            "
                          >
                            {
                              sale.invoice
                            }
                          </td>

                          <td
                            className="
                              px-4
                              py-3
                              font-medium
                              text-slate-900
                            "
                          >
                            {
                              sale.customer
                            }
                          </td>

                          <td
                            className="
                              px-4
                              py-3
                              text-slate-500
                            "
                          >
                            {formatDate(
                              sale.date,
                            )}
                          </td>

                          <td
                            className="
                              px-4
                              py-3
                              text-slate-700
                            "
                          >
                            {formatNumber(
                              sale.items,
                            )}
                          </td>

                          <td
                            className="
                              px-4
                              py-3
                              font-semibold
                              text-emerald-600
                            "
                          >
                            {formatMoney(
                              sale.amount,
                              currencyCode,
                            )}
                          </td>

                          <td className="px-4 py-3">
                            <span
                              className="
                                rounded-full
                                border
                                border-sky-100
                                bg-sky-50
                                px-2.5
                                py-1
                                text-xs
                                font-medium
                                text-sky-700
                              "
                            >
                              {
                                sale.method
                              }
                            </span>
                          </td>

                          <td className="px-4 py-3">
                            <PaymentBadge
                              status={
                                sale.paymentStatus
                              }
                            />
                          </td>
                        </tr>
                      ),
                    )
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* =================================================
              LOW STOCK PANEL
          ================================================= */}

          <section
            className="
              overflow-hidden
              rounded-2xl
              border
              border-slate-200
              bg-white
              shadow-sm
              xl:col-span-4
            "
          >
            <div
              className="
                flex
                items-center
                justify-between
                border-b
                border-slate-200
                px-4
                py-4
              "
            >
              <h2
                className="
                  text-sm
                  font-semibold
                  text-slate-950
                "
              >
                Low Stock Alerts
              </h2>

              <Link
                href="/admin/low-stock-alerts"
                className="
                  text-xs
                  font-medium
                  text-sky-600
                  hover:text-sky-700
                "
              >
                Manage
              </Link>
            </div>

            {lowStockItems.length ===
            0 ? (
              <div
                className="
                  flex
                  min-h-[260px]
                  items-center
                  justify-center
                  px-4
                  text-sm
                  text-slate-400
                "
              >
                No low stock alerts.
              </div>
            ) : (
              <div>
                {lowStockItems.map(
                  (item) => (
                    <div
                      key={
                        item.medicineId
                      }
                      className="
                        flex
                        items-center
                        justify-between
                        gap-3
                        border-b
                        border-slate-100
                        px-4
                        py-4
                        last:border-b-0
                      "
                    >
                      <div
                        className="
                          flex
                          min-w-0
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
                            ${
                              item.status ===
                              "OUT_OF_STOCK"
                                ? "bg-rose-500"
                                : "bg-amber-500"
                            }
                          `}
                        />

                        <div className="min-w-0">
                          <p
                            className="
                              truncate
                              text-sm
                              font-medium
                              text-slate-900
                            "
                          >
                            {
                              item.medicineName
                            }
                          </p>

                          <p
                            className="
                              mt-1
                              text-xs
                              text-slate-500
                            "
                          >
                            {formatQuantity(
                              item.stock,
                            )}{" "}
                            {
                              item.baseUnit
                            }{" "}
                            · min{" "}
                            {formatQuantity(
                              item.reorderLevel,
                            )}
                          </p>
                        </div>
                      </div>

                      <LowStockBadge
                        status={
                          item.status
                        }
                      />
                    </div>
                  ),
                )}
              </div>
            )}
          </section>
        </div>

        {/* =================================================
            MOST SOLD MEDICINES + CATEGORIES
        ================================================= */}

        <div
          className="
            grid
            grid-cols-1
            gap-4
            xl:grid-cols-2
          "
        >
          <section
            className="
              overflow-hidden
              rounded-2xl
              border
              border-slate-200
              bg-white
              shadow-sm
            "
          >
            <div
              className="
                flex
                items-center
                justify-between
                border-b
                border-slate-200
                px-4
                py-4
              "
            >
              <div>
                <h2
                  className="
                    text-sm
                    font-semibold
                    text-slate-950
                  "
                >
                  Most Sold Medicines
                </h2>

                <p
                  className="
                    mt-1
                    text-xs
                    text-slate-500
                  "
                >
                  Top 5 by base quantity sold
                </p>
              </div>

              <span
                className="
                  text-xs
                  font-semibold
                  text-sky-600
                "
              >
                TOP 5
              </span>
            </div>

            {topMedicines.length ===
            0 ? (
              <div
                className="
                  flex
                  min-h-[300px]
                  items-center
                  justify-center
                  text-sm
                  text-slate-400
                "
              >
                No medicine sales data.
              </div>
            ) : (
              <div>
                {topMedicines.map(
                  (medicine) => (
                    <div
                      key={
                        medicine.medicineId
                      }
                      className="
                        border-b
                        border-slate-100
                        px-4
                        py-4
                        last:border-b-0
                      "
                    >
                      <div className="flex gap-3">
                        <div
                          className={`
                            flex
                            h-7
                            w-7
                            shrink-0
                            items-center
                            justify-center
                            rounded-full
                            text-xs
                            font-semibold
                            ${
                              medicine.rank ===
                              1
                                ? "bg-amber-100 text-amber-700"
                                : "bg-slate-100 text-slate-500"
                            }
                          `}
                        >
                          {
                            medicine.rank
                          }
                        </div>

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
                              items-start
                              justify-between
                              gap-3
                            "
                          >
                            <p
                              className="
                                font-semibold
                                text-slate-900
                              "
                            >
                              {
                                medicine.medicineName
                              }
                            </p>

                            <div className="text-right text-xs">
                              <span className="text-slate-500">
                                {formatQuantity(
                                  medicine.soldQuantity,
                                )}{" "}
                                {
                                  medicine.baseUnit
                                }
                              </span>

                              <span
                                className="
                                  ml-3
                                  rounded-full
                                  bg-emerald-50
                                  px-2
                                  py-1
                                  font-semibold
                                  text-emerald-700
                                "
                              >
                                {formatMoney(
                                  medicine.revenue,
                                  currencyCode,
                                )}
                              </span>
                            </div>
                          </div>

                          <div
                            className="
                              mt-3
                              flex
                              items-center
                              gap-3
                            "
                          >
                            <div
                              className="
                                h-1.5
                                flex-1
                                overflow-hidden
                                rounded-full
                                bg-slate-100
                              "
                            >
                              <div
                                className="
                                  h-full
                                  rounded-full
                                  bg-sky-500
                                "
                                style={{
                                  width: `${Math.min(
                                    100,
                                    Math.max(
                                      0,
                                      medicine.percent,
                                    ),
                                  )}%`,
                                }}
                              />
                            </div>

                            <span
                              className="
                                w-10
                                text-right
                                text-[11px]
                                text-slate-500
                              "
                            >
                              {
                                medicine.percent
                              }
                              %
                            </span>

                            <span
                              className="
                                rounded-full
                                border
                                border-sky-100
                                bg-sky-50
                                px-2
                                py-1
                                text-[10px]
                                text-sky-700
                              "
                            >
                              {
                                medicine.category
                              }
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ),
                )}
              </div>
            )}
          </section>

          {/* =================================================
              CATEGORY LIST
          ================================================= */}

          <section
            className="
              overflow-hidden
              rounded-2xl
              border
              border-slate-200
              bg-white
              shadow-sm
            "
          >
            <div
              className="
                border-b
                border-slate-200
                px-4
                py-4
              "
            >
              <h2
                className="
                  text-sm
                  font-semibold
                  text-slate-950
                "
              >
                Most Sold Medicine Category
              </h2>

              <p
                className="
                  mt-1
                  text-xs
                  text-slate-500
                "
              >
                By quantity & revenue
              </p>
            </div>

            {topCategories.length ===
            0 ? (
              <div
                className="
                  flex
                  min-h-[300px]
                  items-center
                  justify-center
                  text-sm
                  text-slate-400
                "
              >
                No category sales data.
              </div>
            ) : (
              <div className="space-y-6 p-5">
                {topCategories.map(
                  (
                    category,
                    index,
                  ) => (
                    <div
                      key={
                        category.categoryId
                      }
                    >
                      <div
                        className="
                          flex
                          items-start
                          gap-3
                        "
                      >
                        <span
                          className="
                            mt-1
                            h-3
                            w-3
                            shrink-0
                            rounded-full
                          "
                          style={{
                            backgroundColor:
                              categoryColors[
                                index %
                                  categoryColors.length
                              ],
                          }}
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
                                text-sm
                                font-medium
                                text-slate-900
                              "
                            >
                              {
                                category.category
                              }
                            </p>

                            <div className="text-xs">
                              <span className="text-slate-500">
                                {formatQuantity(
                                  category.soldQuantity,
                                )}{" "}
                                units
                              </span>

                              <span
                                className="
                                  ml-2
                                  font-semibold
                                  text-emerald-600
                                "
                              >
                                {formatMoney(
                                  category.revenue,
                                  currencyCode,
                                )}
                              </span>
                            </div>
                          </div>

                          <div
                            className="
                              mt-3
                              flex
                              items-center
                              gap-3
                            "
                          >
                            <div
                              className="
                                h-1.5
                                flex-1
                                overflow-hidden
                                rounded-full
                                bg-slate-100
                              "
                            >
                              <div
                                className="
                                  h-full
                                  rounded-full
                                "
                                style={{
                                  width: `${Math.min(
                                    100,
                                    Math.max(
                                      0,
                                      category.percent,
                                    ),
                                  )}%`,

                                  backgroundColor:
                                    categoryColors[
                                      index %
                                        categoryColors.length
                                    ],
                                }}
                              />
                            </div>

                            <span
                              className="
                                w-11
                                text-right
                                text-xs
                                text-slate-500
                              "
                            >
                              {formatNumber(
                                category.percent,
                              )}
                              %
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ),
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   DASHBOARD CARD
========================================================= */

function DashboardCard({
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
      className={`
        group
        block
        rounded-2xl
        border
        bg-white
        p-4
        shadow-sm
        transition
        duration-200
        hover:-translate-y-0.5
        hover:shadow-md
        focus:outline-none
        focus:ring-2
        focus:ring-sky-300
        ${borderClass}
      `}
    >
      <div
        className="
          flex
          items-start
          justify-between
          gap-3
        "
      >
        <div className="min-w-0">
          <p
            className="
              text-xs
              text-slate-500
            "
          >
            {title}
          </p>

          <p
            className="
              mt-1
              truncate
              text-2xl
              font-bold
              text-slate-950
            "
          >
            {value}
          </p>

          <p
            className="
              mt-1
              text-xs
              text-slate-500
            "
          >
            {subtitle}
          </p>
        </div>

        <div
          className={`
            flex
            h-11
            w-11
            shrink-0
            items-center
            justify-center
            rounded-full
            transition
            group-hover:scale-105
            ${iconClass}
          `}
        >
          {icon}
        </div>
      </div>
    </Link>
  );
}

/* =========================================================
   PAYMENT BADGE
========================================================= */

function PaymentBadge({
  status,
}: {
  status: PaymentStatus;
}) {
  const label =
    status === "PAID"
      ? "Paid"
      : status ===
          "PARTIAL"
        ? "Partial"
        : "Due";

  const className =
    status === "PAID"
      ? "bg-emerald-100 text-emerald-700"
      : status ===
          "PARTIAL"
        ? "bg-amber-100 text-amber-700"
        : "bg-rose-100 text-rose-600";

  return (
    <span
      className={`
        inline-flex
        rounded-full
        px-2.5
        py-1
        text-xs
        font-medium
        ${className}
      `}
    >
      {label}
    </span>
  );
}

/* =========================================================
   LOW STOCK BADGE
========================================================= */

function LowStockBadge({
  status,
}: {
  status:
    LowStockStatus;
}) {
  const outOfStock =
    status ===
    "OUT_OF_STOCK";

  return (
    <span
      className={`
        shrink-0
        rounded-full
        px-2.5
        py-1
        text-xs
        font-medium
        ${
          outOfStock
            ? "bg-rose-100 text-rose-600"
            : "bg-amber-100 text-amber-700"
        }
      `}
    >
      {outOfStock
        ? "Out"
        : "Low"}
    </span>
  );
}