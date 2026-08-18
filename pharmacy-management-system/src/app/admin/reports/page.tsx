"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  AlertTriangle,
  Clock,
  DollarSign,
  Download,
  Loader2,
  RefreshCw,
  ShoppingCart,
} from "lucide-react";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/* =========================================================
   TYPES
========================================================= */

type ReportTab =
  | "sales"
  | "stock"
  | "expiry"
  | "purchases";

type StockStatus =
  | "IN_STOCK"
  | "LOW_STOCK"
  | "OUT_OF_STOCK";

type ExpiryStatus =
  | "EXPIRED"
  | "CRITICAL"
  | "NEAR_EXPIRY";

type PurchaseStatus =
  | "PENDING"
  | "RECEIVED"
  | "CANCELLED";

type ReorderMode =
  | "MANUAL"
  | "AUTO";

/* =========================================================
   API TYPES
========================================================= */

type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

/* =========================================================
   SUMMARY
========================================================= */

type SummaryData = {
  currentMonth: {
    label: string;
    revenue: number;
    orders: number;
  };

  previousMonth: {
    label: string;
    revenue: number;
    orders: number;
  };

  comparison: {
    revenueChangePercent:
      | number
      | null;

    orderChangePercent:
      | number
      | null;
  };

  expiringSoon: number;

  reorderNeeded: number;
};

/* =========================================================
   SALES
========================================================= */

type SalesMonth = {
  monthNumber: number;
  month: string;
  monthLong: string;
  label: string;
  orders: number;
  revenue: number;
  averageOrder: number;
  changePercent:
    | number
    | null;
};

type SalesData = {
  year: number;
  periodLabel: string;
  currencyCode: string;
  totalRevenue: number;
  totalOrders: number;
  overallAverageOrder: number;
  months: SalesMonth[];
};

/* =========================================================
   STOCK
========================================================= */

type StockMedicine = {
  id: string;
  databaseId: number;
  medicineName: string;
  category: string;
  stock: number;
  minimum: number;
  baseUnit: string;
  reorderMode: ReorderMode;
  status: StockStatus;
};

type CategoryStock = {
  category: string;
  totalStock: number;
};

type StockData = {
  summary: {
    totalMedicines: number;
    inStock: number;
    lowStock: number;
    outOfStock: number;
    totalAvailableStock: number;
  };

  categoryStock: CategoryStock[];

  medicines: StockMedicine[];
};

/* =========================================================
   EXPIRY
========================================================= */

type ExpiryItem = {
  id: number;
  medicineId: number;
  medicineCode: string;
  medicineName: string;
  companyName: string;
  batchNo: string;
  stock: number;
  baseUnit: string;
  expiryDate: string;
  daysLeft: number;
  status: ExpiryStatus;
  batchStatus: string;
};

type ExpiryData = {
  summary: {
    expired: number;
    critical: number;
    nearExpiry: number;
    totalAffected: number;
    totalAffectedStock: number;
  };

  items: ExpiryItem[];
};

/* =========================================================
   PURCHASES
========================================================= */

type PurchaseItem = {
  purchaseId: number;
  purchaseNo: string;
  supplier: string;
  supplierInvoiceNo: string;
  medicineCode: string;
  medicineName: string;
  quantity: number;
  unit: string;
  unitCost: number;
  total: number;
  batchNo: string;
  expiryDate: string;
  purchaseDate: string;
  status: PurchaseStatus;
};

type PurchaseData = {
  filters: {
    year:
      | number
      | null;

    status: string;
  };

  currencyCode: string;

  summary: {
    totalPurchases: number;
    totalPurchaseAmount: number;
    pending: number;
    received: number;
    cancelled: number;
  };

  items: PurchaseItem[];
};

/* =========================================================
   ALL REPORT DATA
========================================================= */

type ReportsData = {
  summary: SummaryData;
  sales: SalesData;
  stock: StockData;
  expiry: ExpiryData;
  purchases: PurchaseData;
};

/* =========================================================
   FETCH HELPERS
========================================================= */

async function fetchApi<T>(
  url: string,
  signal?: AbortSignal,
): Promise<T> {
  const response =
    await fetch(
      url,
      {
        cache: "no-store",
        signal,
      },
    );

  const result =
    (await response.json()) as
      ApiResponse<T>;

  if (
    !response.ok ||
    !result.success ||
    result.data === undefined
  ) {
    throw new Error(
      result.message ??
        "Failed to load report data.",
    );
  }

  return result.data;
}

async function fetchReports(
  signal?: AbortSignal,
): Promise<ReportsData> {
  const [
    summary,
    sales,
    stock,
    expiry,
    purchases,
  ] =
    await Promise.all([
      fetchApi<SummaryData>(
        "/api/reports/summary",
        signal,
      ),

      fetchApi<SalesData>(
        "/api/reports/sales",
        signal,
      ),

      fetchApi<StockData>(
        "/api/reports/stock",
        signal,
      ),

      fetchApi<ExpiryData>(
        "/api/reports/expiry",
        signal,
      ),

      fetchApi<PurchaseData>(
        "/api/reports/purchases",
        signal,
      ),
    ]);

  return {
    summary,
    sales,
    stock,
    expiry,
    purchases,
  };
}

/* =========================================================
   FORMATTING HELPERS
========================================================= */

function safeNumber(
  value: unknown,
) {
  const parsed =
    Number(value);

  return Number.isFinite(
    parsed,
  )
    ? parsed
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
  const number =
    safeNumber(value);

  if (
    number >=
    1_000_000
  ) {
    return `৳${formatNumber(
      number /
        1_000_000,
    )}m`;
  }

  if (
    number >= 1000
  ) {
    return `৳${formatNumber(
      number / 1000,
    )}k`;
  }

  return `৳${formatNumber(
    number,
  )}`;
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
   REUSABLE UI
========================================================= */

function ExportButton({
  onClick,
}: {
  onClick: () =>
    | void
    | Promise<void>;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        void onClick();
      }}
      className="
        inline-flex
        items-center
        gap-2
        rounded-xl
        border
        border-slate-200
        bg-white
        px-4
        py-2
        text-sm
        font-medium
        text-slate-700
        transition
        hover:bg-slate-50
      "
    >
      <Download
        size={15}
      />

      Export Excel
    </button>
  );
}

function EmptyRow({
  colSpan,
  message,
}: {
  colSpan: number;
  message: string;
}) {
  return (
    <tr>
      <td
        colSpan={
          colSpan
        }
        className="
          px-4
          py-10
          text-center
          text-sm
          text-slate-400
        "
      >
        {message}
      </td>
    </tr>
  );
}

/* =========================================================
   PAGE
========================================================= */

export default function ReportsPage() {
  const [
    activeTab,
    setActiveTab,
  ] =
    useState<ReportTab>(
      "sales",
    );

  const [
    reports,
    setReports,
  ] =
    useState<ReportsData | null>(
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

    fetchReports(
      controller.signal,
    )
      .then(
        (data) => {
          if (
            controller.signal
              .aborted
          ) {
            return;
          }

          setReports(
            data,
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
            "Reports load error:",
            error,
          );

          setErrorMessage(
            error instanceof
              Error
              ? error.message
              : "Failed to load reports.",
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
     RETRY
  ======================================================= */

  async function retryLoad() {
    try {
      setIsLoading(
        true,
      );

      setErrorMessage(
        "",
      );

      const data =
        await fetchReports();

      setReports(
        data,
      );
    } catch (error) {
      console.error(
        "Reports retry error:",
        error,
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to load reports.",
      );
    } finally {
      setIsLoading(
        false,
      );
    }
  }

  /* =======================================================
     EXCEL EXPORT
  ======================================================= */

  async function exportReport(
    report:
      ReportTab,
  ) {
    if (
      !reports
    ) {
      return;
    }

    try {
      const XLSX =
        await import(
          "xlsx"
        );

      const workbook =
        XLSX.utils.book_new();

      const appendSheet =
        (
          name: string,
          rows: Array<
            Record<
              string,
              string | number
            >
          >,
        ) => {
          const worksheet =
            XLSX.utils.json_to_sheet(
              rows,
            );

          if (
            rows.length >
            0
          ) {
            const headers =
              Object.keys(
                rows[0],
              );

            worksheet[
              "!cols"
            ] =
              headers.map(
                (
                  header,
                ) => ({
                  wch:
                    Math.max(
                      14,
                      Math.min(
                        28,
                        header.length +
                          5,
                      ),
                    ),
                }),
              );

            if (
              worksheet[
                "!ref"
              ]
            ) {
              worksheet[
                "!autofilter"
              ] = {
                ref:
                  worksheet[
                    "!ref"
                  ] as string,
              };
            }
          }

          XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            name.slice(
              0,
              31,
            ),
          );
        };

      const dateStamp =
        new Date()
          .toISOString()
          .slice(
            0,
            10,
          );

      /* ===============================================
         SALES EXCEL
      =============================================== */

      if (
        report ===
        "sales"
      ) {
        appendSheet(
          "Summary",
          [
            {
              "Report Period":
                reports.sales
                  .periodLabel,

              "Total Orders":
                reports.sales
                  .totalOrders,

              [`Total Revenue (${reports.sales.currencyCode})`]:
                reports.sales
                  .totalRevenue,

              [`Average Order (${reports.sales.currencyCode})`]:
                reports.sales
                  .overallAverageOrder,
            },
          ],
        );

        appendSheet(
          "Monthly Sales",
          reports.sales.months.map(
            (
              month,
            ) => ({
              Month:
                month.label,

              Orders:
                month.orders,

              [`Revenue (${reports.sales.currencyCode})`]:
                month.revenue,

              [`Average Order (${reports.sales.currencyCode})`]:
                month.averageOrder,

              "vs Prior (%)":
                month.changePercent ??
                "",
            }),
          ),
        );

        XLSX.writeFile(
          workbook,
          `sales-report-${dateStamp}.xlsx`,
          {
            compression:
              true,
          },
        );

        return;
      }

      /* ===============================================
         STOCK EXCEL
      =============================================== */

      if (
        report ===
        "stock"
      ) {
        appendSheet(
          "Stock by Category",
          reports.stock.categoryStock.map(
            (
              category,
            ) => ({
              Category:
                category.category,

              "Total Stock":
                category.totalStock,
            }),
          ),
        );

        appendSheet(
          "Stock Status",
          reports.stock.medicines.map(
            (
              medicine,
            ) => ({
              Code:
                medicine.id,

              Medicine:
                medicine.medicineName,

              Category:
                medicine.category,

              Stock:
                medicine.stock,

              Unit:
                medicine.baseUnit,

              "Reorder Level":
                medicine.minimum,

              "Reorder Mode":
                medicine.reorderMode,

              Status:
                getStockStatusLabel(
                  medicine.status,
                ),
            }),
          ),
        );

        XLSX.writeFile(
          workbook,
          `stock-report-${dateStamp}.xlsx`,
          {
            compression:
              true,
          },
        );

        return;
      }

      /* ===============================================
         EXPIRY EXCEL
      =============================================== */

      if (
        report ===
        "expiry"
      ) {
        appendSheet(
          "Expiry Report",
          reports.expiry.items.map(
            (
              item,
            ) => ({
              "Medicine Code":
                item.medicineCode,

              Medicine:
                item.medicineName,

              "Batch No.":
                item.batchNo,

              Company:
                item.companyName,

              Stock:
                item.stock,

              Unit:
                item.baseUnit,

              "Expiry Date":
                formatDate(
                  item.expiryDate,
                ),

              "Days Left":
                item.daysLeft,

              Status:
                getExpiryStatusLabel(
                  item.status,
                ),
            }),
          ),
        );

        XLSX.writeFile(
          workbook,
          `expiry-report-${dateStamp}.xlsx`,
          {
            compression:
              true,
          },
        );

        return;
      }

      /* ===============================================
         PURCHASE EXCEL
      =============================================== */

      appendSheet(
        "Purchase Report",
        reports.purchases.items.map(
          (
            item,
          ) => ({
            "Purchase ID":
              item.purchaseNo,

            Supplier:
              item.supplier,

            Medicine:
              item.medicineName,

            Quantity:
              item.quantity,

            Unit:
              item.unit,

            [`Unit Cost (${reports.purchases.currencyCode})`]:
              item.unitCost,

            [`Total (${reports.purchases.currencyCode})`]:
              item.total,

            "Purchase Date":
              formatDate(
                item.purchaseDate,
              ),

            "Batch No.":
              item.batchNo,

            Status:
              getPurchaseStatusLabel(
                item.status,
              ),
          }),
        ),
      );

      XLSX.writeFile(
        workbook,
        `purchase-report-${dateStamp}.xlsx`,
        {
          compression:
            true,
        },
      );
    } catch (error) {
      console.error(
        "Excel export error:",
        error,
      );

      window.alert(
        "Failed to export Excel report.",
      );
    }
  }

  /* =======================================================
     LOADING
  ======================================================= */

  if (
    isLoading &&
    !reports
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
            className="
              animate-spin
            "
            size={22}
          />

          Loading reports...
        </div>
      </div>
    );
  }

  /* =======================================================
     ERROR
  ======================================================= */

  if (
    !reports
  ) {
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
            w-full
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
            size={32}
            className="
              mx-auto
              mb-3
              text-red-500
            "
          />

          <p
            className="
              font-semibold
              text-red-700
            "
          >
            Could not load
            reports
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
              void retryLoad();
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
    sales,
    stock,
    expiry,
    purchases,
  } = reports;

  const currencyCode =
    sales.currencyCode ??
    "BDT";

  const currentMonthShort =
    summary.currentMonth.label
      .split(" ")[0] ??
    "Monthly";

  const previousMonthShort =
    summary.previousMonth.label
      .split(" ")[0] ??
    "previous month";

  /* =======================================================
     PAGE
  ======================================================= */

  return (
    <div
      className="
        min-h-full
        bg-[#f6f9fb]
        p-4
        md:p-5
      "
    >
      <div
        className="
          space-y-4
        "
      >
        {/* =================================================
            SUMMARY CARDS
        ================================================= */}

        <div
          className="
            grid
            grid-cols-1
            gap-3
            md:grid-cols-2
            xl:grid-cols-4
          "
        >
          {/* Revenue */}

          <div
            className="
              rounded-2xl
              border
              border-sky-200
              bg-white
              p-4
              shadow-sm
            "
          >
            <div
              className="
                flex
                items-start
                justify-between
                gap-3
              "
            >
              <div>
                <p
                  className="
                    text-xs
                    text-slate-500
                  "
                >
                  {currentMonthShort}{" "}
                  Revenue
                </p>

                <p
                  className="
                    mt-1
                    text-2xl
                    font-bold
                    text-slate-950
                  "
                >
                  {formatMoney(
                    summary.currentMonth
                      .revenue,
                    currencyCode,
                  )}
                </p>

                <p
                  className="
                    mt-1
                    text-xs
                    text-slate-500
                  "
                >
                  {formatNumber(
                    summary.currentMonth
                      .orders,
                  )}{" "}
                  orders
                </p>
              </div>

              <div
                className="
                  flex
                  h-11
                  w-11
                  items-center
                  justify-center
                  rounded-full
                  bg-sky-50
                  text-sky-600
                "
              >
                <DollarSign
                  size={21}
                />
              </div>
            </div>
          </div>

          {/* Orders */}

          <div
            className="
              rounded-2xl
              border
              border-emerald-200
              bg-white
              p-4
              shadow-sm
            "
          >
            <div
              className="
                flex
                items-start
                justify-between
                gap-3
              "
            >
              <div>
                <p
                  className="
                    text-xs
                    text-slate-500
                  "
                >
                  Monthly Orders
                </p>

                <p
                  className="
                    mt-1
                    text-2xl
                    font-bold
                    text-slate-950
                  "
                >
                  {formatNumber(
                    summary.currentMonth
                      .orders,
                  )}
                </p>

                <p
                  className={`
                    mt-1
                    text-xs
                    ${
                      summary.comparison
                        .orderChangePercent !==
                        null &&
                      summary.comparison
                        .orderChangePercent <
                        0
                        ? "text-red-500"
                        : "text-slate-500"
                    }
                  `}
                >
                  {summary.comparison
                    .orderChangePercent ===
                  null
                    ? "No prior month data"
                    : `${formatPercent(
                        summary.comparison
                          .orderChangePercent,
                      )} vs ${previousMonthShort}`}
                </p>
              </div>

              <div
                className="
                  flex
                  h-11
                  w-11
                  items-center
                  justify-center
                  rounded-full
                  bg-emerald-50
                  text-emerald-600
                "
              >
                <ShoppingCart
                  size={21}
                />
              </div>
            </div>
          </div>

          {/* Expiring */}

          <div
            className="
              rounded-2xl
              border
              border-amber-200
              bg-white
              p-4
              shadow-sm
            "
          >
            <div
              className="
                flex
                items-start
                justify-between
                gap-3
              "
            >
              <div>
                <p
                  className="
                    text-xs
                    text-slate-500
                  "
                >
                  Expiring Soon
                </p>

                <p
                  className="
                    mt-1
                    text-2xl
                    font-bold
                    text-slate-950
                  "
                >
                  {formatNumber(
                    summary.expiringSoon,
                  )}
                </p>

                <p
                  className="
                    mt-1
                    text-xs
                    text-slate-500
                  "
                >
                  Within 30 days
                </p>
              </div>

              <div
                className="
                  flex
                  h-11
                  w-11
                  items-center
                  justify-center
                  rounded-full
                  bg-amber-50
                  text-amber-600
                "
              >
                <Clock
                  size={21}
                />
              </div>
            </div>
          </div>

          {/* Reorder */}

          <div
            className="
              rounded-2xl
              border
              border-rose-200
              bg-white
              p-4
              shadow-sm
            "
          >
            <div
              className="
                flex
                items-start
                justify-between
                gap-3
              "
            >
              <div>
                <p
                  className="
                    text-xs
                    text-slate-500
                  "
                >
                  Reorder Needed
                </p>

                <p
                  className="
                    mt-1
                    text-2xl
                    font-bold
                    text-slate-950
                  "
                >
                  {formatNumber(
                    summary.reorderNeeded,
                  )}
                </p>

                <p
                  className="
                    mt-1
                    text-xs
                    text-slate-500
                  "
                >
                  Low/out of stock
                </p>
              </div>

              <div
                className="
                  flex
                  h-11
                  w-11
                  items-center
                  justify-center
                  rounded-full
                  bg-rose-50
                  text-rose-600
                "
              >
                <AlertTriangle
                  size={21}
                />
              </div>
            </div>
          </div>
        </div>

        {/* =================================================
            TABS
        ================================================= */}

        <div
          className="
            inline-flex
            max-w-full
            overflow-x-auto
            rounded-2xl
            border
            border-slate-200
            bg-white
            p-1
            shadow-sm
          "
        >
          <ReportTabButton
            active={
              activeTab ===
              "sales"
            }
            onClick={() =>
              setActiveTab(
                "sales",
              )
            }
          >
            Sales Report
          </ReportTabButton>

          <ReportTabButton
            active={
              activeTab ===
              "stock"
            }
            onClick={() =>
              setActiveTab(
                "stock",
              )
            }
          >
            Stock Report
          </ReportTabButton>

          <ReportTabButton
            active={
              activeTab ===
              "expiry"
            }
            onClick={() =>
              setActiveTab(
                "expiry",
              )
            }
          >
            Expiry Report
          </ReportTabButton>

          <ReportTabButton
            active={
              activeTab ===
              "purchases"
            }
            onClick={() =>
              setActiveTab(
                "purchases",
              )
            }
          >
            Purchase Report
          </ReportTabButton>
        </div>

        {/* =================================================
            SALES REPORT
        ================================================= */}

        {activeTab ===
          "sales" && (
          <div
            className="
              space-y-4
            "
          >
            {/* Sales Chart */}

            <section
              className="
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
                  flex-col
                  gap-3
                  px-4
                  py-4
                  sm:flex-row
                  sm:items-center
                  sm:justify-between
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
                    Monthly Sales
                    Revenue
                  </h2>

                  <p
                    className="
                      mt-1
                      text-xs
                      text-slate-500
                    "
                  >
                    {
                      sales.periodLabel
                    }{" "}
                    · Bangladeshi
                    Taka (৳)
                  </p>
                </div>

                <ExportButton
                  onClick={() =>
                    exportReport(
                      "sales",
                    )
                  }
                />
              </div>

              <div
                className="
                  h-[360px]
                  px-3
                  pb-4
                  md:h-[400px]
                  md:px-5
                "
              >
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <BarChart
                    data={
                      sales.months
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
                        fontSize:
                          12,
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
                      tick={{
                        fill: "#94a3b8",
                        fontSize:
                          12,
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
                      width={65}
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
                          "0 8px 24px rgba(15, 23, 42, 0.10)",
                      }}
                      labelStyle={{
                        color:
                          "#0f172a",
                        fontWeight:
                          600,
                      }}
                      labelFormatter={(
                        label,
                      ) =>
                        String(
                          label ??
                            "",
                        )
                      }
                      formatter={(
                        value,
                      ) => [
                        formatMoney(
                          Number(
                            value ??
                              0,
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
                        8, 8, 0, 0,
                      ]}
                      maxBarSize={
                        42
                      }
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Sales Breakdown */}

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
                  gap-3
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
                  Monthly Sales
                  Breakdown
                </h2>

                <ExportButton
                  onClick={() =>
                    exportReport(
                      "sales",
                    )
                  }
                />
              </div>

              <div
                className="
                  overflow-x-auto
                "
              >
                <table
                  className="
                    w-full
                    min-w-[760px]
                    border-collapse
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
                        Month
                      </th>

                      <th className="px-4 py-3 font-medium">
                        Orders
                      </th>

                      <th className="px-4 py-3 font-medium">
                        Revenue (৳)
                      </th>

                      <th className="px-4 py-3 font-medium">
                        Avg. Order (৳)
                      </th>

                      <th className="px-4 py-3 font-medium">
                        vs Prior
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {sales.months
                      .length ===
                    0 ? (
                      <EmptyRow
                        colSpan={
                          5
                        }
                        message="No sales data found."
                      />
                    ) : (
                      sales.months.map(
                        (
                          month,
                        ) => (
                          <tr
                            key={
                              month.monthNumber
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
                                font-semibold
                                text-slate-900
                              "
                            >
                              {
                                month.label
                              }
                            </td>

                            <td
                              className="
                                px-4
                                py-3
                                text-slate-700
                              "
                            >
                              {formatNumber(
                                month.orders,
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
                                month.revenue,
                                currencyCode,
                              )}
                            </td>

                            <td
                              className="
                                px-4
                                py-3
                                text-slate-500
                              "
                            >
                              {formatMoney(
                                month.averageOrder,
                                currencyCode,
                              )}
                            </td>

                            <td
                              className={`
                                px-4
                                py-3
                                font-medium
                                ${
                                  month.changePercent ===
                                  null
                                    ? "text-slate-400"
                                    : month.changePercent >=
                                        0
                                      ? "text-emerald-600"
                                      : "text-red-500"
                                }
                              `}
                            >
                              {formatPercent(
                                month.changePercent,
                              )}
                            </td>
                          </tr>
                        ),
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {/* =================================================
            STOCK REPORT
        ================================================= */}

        {activeTab ===
          "stock" && (
          <div
            className="
              grid
              grid-cols-1
              gap-4
              xl:grid-cols-2
            "
          >
            {/* Stock by Category */}

            <section
              className="
                rounded-2xl
                border
                border-slate-200
                bg-white
                p-4
                shadow-sm
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
                  Stock by
                  Category
                </h2>

                <p
                  className="
                    mt-1
                    text-xs
                    text-slate-500
                  "
                >
                  Available base
                  stock by category
                </p>
              </div>

              {stock
                .categoryStock
                .length ===
              0 ? (
                <div
                  className="
                    flex
                    h-[350px]
                    items-center
                    justify-center
                    text-sm
                    text-slate-400
                  "
                >
                  No stock data
                  found.
                </div>
              ) : (
                <div
                  style={{
                    height:
                      Math.max(
                        340,
                        stock
                          .categoryStock
                          .length *
                          52,
                      ),
                  }}
                  className="
                    mt-3
                    w-full
                  "
                >
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >
                    <BarChart
                      data={
                        stock.categoryStock
                      }
                      layout="vertical"
                      margin={{
                        top: 10,
                        right: 20,
                        left: 35,
                        bottom: 10,
                      }}
                    >
                      <CartesianGrid
                        stroke="#e9eef3"
                        strokeDasharray="3 3"
                        horizontal={
                          false
                        }
                      />

                      <XAxis
                        type="number"
                        axisLine={
                          false
                        }
                        tickLine={
                          false
                        }
                        tick={{
                          fill: "#94a3b8",
                          fontSize:
                            11,
                        }}
                      />

                      <YAxis
                        type="category"
                        dataKey="category"
                        axisLine={
                          false
                        }
                        tickLine={
                          false
                        }
                        width={115}
                        tick={{
                          fill: "#64748b",
                          fontSize:
                            11,
                        }}
                      />

                      <Tooltip
                        cursor={{
                          fill: "#f8fafc",
                        }}
                        contentStyle={{
                          borderRadius:
                            "12px",
                          border:
                            "1px solid #e2e8f0",
                        }}
                        formatter={(
                          value,
                        ) => [
                          formatQuantity(
                            Number(
                              value ??
                                0,
                            ),
                          ),
                          "Stock",
                        ]}
                      />

                      <Bar
                        dataKey="totalStock"
                        fill="#129b90"
                        radius={[
                          0, 8, 8, 0,
                        ]}
                        maxBarSize={
                          18
                        }
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>

            {/* Stock Table */}

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
                  gap-3
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
                  Stock Status
                  Summary
                </h2>

                <ExportButton
                  onClick={() =>
                    exportReport(
                      "stock",
                    )
                  }
                />
              </div>

              <div
                className="
                  overflow-x-auto
                "
              >
                <table
                  className="
                    w-full
                    min-w-[650px]
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
                        Medicine
                      </th>

                      <th className="px-4 py-3 font-medium">
                        Category
                      </th>

                      <th className="px-4 py-3 font-medium">
                        Stock
                      </th>

                      <th className="px-4 py-3 font-medium">
                        Min
                      </th>

                      <th className="px-4 py-3 font-medium">
                        Status
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {stock.medicines
                      .length ===
                    0 ? (
                      <EmptyRow
                        colSpan={
                          5
                        }
                        message="No medicines found."
                      />
                    ) : (
                      stock.medicines.map(
                        (
                          medicine,
                        ) => (
                          <tr
                            key={
                              medicine.databaseId
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
                                font-semibold
                                text-slate-900
                              "
                            >
                              {
                                medicine.medicineName
                              }
                            </td>

                            <td
                              className="
                                px-4
                                py-3
                                text-slate-500
                              "
                            >
                              {
                                medicine.category
                              }
                            </td>

                            <td
                              className="
                                px-4
                                py-3
                                font-semibold
                                text-slate-900
                              "
                            >
                              {formatQuantity(
                                medicine.stock,
                              )}{" "}
                              <span
                                className="
                                  text-xs
                                  font-normal
                                  text-slate-400
                                "
                              >
                                {
                                  medicine.baseUnit
                                }
                              </span>
                            </td>

                            <td
                              className="
                                px-4
                                py-3
                                text-slate-500
                              "
                            >
                              {formatQuantity(
                                medicine.minimum,
                              )}
                            </td>

                            <td
                              className="
                                px-4
                                py-3
                              "
                            >
                              <StockStatusBadge
                                status={
                                  medicine.status
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
          </div>
        )}

        {/* =================================================
            EXPIRY REPORT
        ================================================= */}

        {activeTab ===
          "expiry" && (
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
                gap-3
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
                  Expiry Report
                </h2>

                <p
                  className="
                    mt-1
                    text-xs
                    text-slate-500
                  "
                >
                  Expired and
                  next 30-day
                  batch alerts
                </p>
              </div>

              <ExportButton
                onClick={() =>
                  exportReport(
                    "expiry",
                  )
                }
              />
            </div>

            <div
              className="
                overflow-x-auto
              "
            >
              <table
                className="
                  w-full
                  min-w-[900px]
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
                      Medicine
                    </th>

                    <th className="px-4 py-3 font-medium">
                      Batch No.
                    </th>

                    <th className="px-4 py-3 font-medium">
                      Company
                    </th>

                    <th className="px-4 py-3 font-medium">
                      Stock
                    </th>

                    <th className="px-4 py-3 font-medium">
                      Expiry Date
                    </th>

                    <th className="px-4 py-3 font-medium">
                      Days Left
                    </th>

                    <th className="px-4 py-3 font-medium">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {expiry.items
                    .length ===
                  0 ? (
                    <EmptyRow
                      colSpan={
                        7
                      }
                      message="No expiry alerts found."
                    />
                  ) : (
                    expiry.items.map(
                      (
                        item,
                      ) => (
                        <tr
                          key={
                            item.id
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
                              font-semibold
                              text-slate-900
                            "
                          >
                            {
                              item.medicineName
                            }

                            <div
                              className="
                                mt-0.5
                                text-[10px]
                                font-normal
                                text-slate-400
                              "
                            >
                              {
                                item.medicineCode
                              }
                            </div>
                          </td>

                          <td
                            className="
                              px-4
                              py-3
                              text-slate-700
                            "
                          >
                            {
                              item.batchNo
                            }
                          </td>

                          <td
                            className="
                              px-4
                              py-3
                              text-slate-500
                            "
                          >
                            {
                              item.companyName
                            }
                          </td>

                          <td
                            className="
                              px-4
                              py-3
                              font-semibold
                              text-slate-900
                            "
                          >
                            {formatQuantity(
                              item.stock,
                            )}{" "}
                            <span
                              className="
                                text-xs
                                font-normal
                                text-slate-400
                              "
                            >
                              {
                                item.baseUnit
                              }
                            </span>
                          </td>

                          <td
                            className="
                              px-4
                              py-3
                              text-slate-500
                            "
                          >
                            {formatDate(
                              item.expiryDate,
                            )}
                          </td>

                          <td
                            className="
                              px-4
                              py-3
                            "
                          >
                            <DaysBadge
                              daysLeft={
                                item.daysLeft
                              }
                            />
                          </td>

                          <td
                            className="
                              px-4
                              py-3
                            "
                          >
                            <ExpiryStatusBadge
                              status={
                                item.status
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
        )}

        {/* =================================================
            PURCHASE REPORT
        ================================================= */}

        {activeTab ===
          "purchases" && (
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
                gap-3
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
                  Purchase Report
                </h2>

                <p
                  className="
                    mt-1
                    text-xs
                    text-slate-500
                  "
                >
                  Purchase item
                  history and
                  status
                </p>
              </div>

              <ExportButton
                onClick={() =>
                  exportReport(
                    "purchases",
                  )
                }
              />
            </div>

            <div
              className="
                overflow-x-auto
              "
            >
              <table
                className="
                  w-full
                  min-w-[1050px]
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
                      Purchase ID
                    </th>

                    <th className="px-4 py-3 font-medium">
                      Supplier
                    </th>

                    <th className="px-4 py-3 font-medium">
                      Medicine
                    </th>

                    <th className="px-4 py-3 font-medium">
                      Qty
                    </th>

                    <th className="px-4 py-3 font-medium">
                      Unit Cost
                    </th>

                    <th className="px-4 py-3 font-medium">
                      Total
                    </th>

                    <th className="px-4 py-3 font-medium">
                      Date
                    </th>

                    <th className="px-4 py-3 font-medium">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {purchases.items
                    .length ===
                  0 ? (
                    <EmptyRow
                      colSpan={
                        8
                      }
                      message="No purchase records found."
                    />
                  ) : (
                    purchases.items.map(
                      (
                        item,
                        index,
                      ) => (
                        <tr
                          key={`${item.purchaseId}-${item.medicineCode}-${index}`}
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
                              font-semibold
                              text-sky-600
                            "
                          >
                            {
                              item.purchaseNo
                            }
                          </td>

                          <td
                            className="
                              px-4
                              py-3
                              text-slate-500
                            "
                          >
                            {
                              item.supplier
                            }
                          </td>

                          <td
                            className="
                              px-4
                              py-3
                              font-semibold
                              text-slate-900
                            "
                          >
                            {
                              item.medicineName
                            }
                          </td>

                          <td
                            className="
                              px-4
                              py-3
                              text-slate-700
                            "
                          >
                            {formatQuantity(
                              item.quantity,
                            )}{" "}
                            {
                              item.unit
                            }
                          </td>

                          <td
                            className="
                              px-4
                              py-3
                              text-slate-700
                            "
                          >
                            {formatMoney(
                              item.unitCost,
                              purchases.currencyCode,
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
                              item.total,
                              purchases.currencyCode,
                            )}
                          </td>

                          <td
                            className="
                              px-4
                              py-3
                              text-slate-500
                            "
                          >
                            {formatDate(
                              item.purchaseDate,
                            )}
                          </td>

                          <td
                            className="
                              px-4
                              py-3
                            "
                          >
                            <PurchaseStatusBadge
                              status={
                                item.status
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
        )}
      </div>
    </div>
  );
}

/* =========================================================
   TAB BUTTON
========================================================= */

function ReportTabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children:
    React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      aria-pressed={
        active
      }
      className={`
        whitespace-nowrap
        rounded-xl
        px-4
        py-2
        text-sm
        font-medium
        transition
        ${
          active
            ? "bg-sky-600 text-white shadow-sm"
            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
        }
      `}
    >
      {children}
    </button>
  );
}

/* =========================================================
   STOCK STATUS
========================================================= */

function getStockStatusLabel(
  status: StockStatus,
) {
  switch (
    status
  ) {
    case "LOW_STOCK":
      return "Low Stock";

    case "OUT_OF_STOCK":
      return "Out of Stock";

    default:
      return "In Stock";
  }
}

function StockStatusBadge({
  status,
}: {
  status: StockStatus;
}) {
  const className =
    status ===
    "IN_STOCK"
      ? "bg-emerald-100 text-emerald-700"
      : status ===
          "LOW_STOCK"
        ? "bg-amber-100 text-amber-700"
        : "bg-red-100 text-red-600";

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
      {getStockStatusLabel(
        status,
      )}
    </span>
  );
}

/* =========================================================
   EXPIRY STATUS
========================================================= */

function getExpiryStatusLabel(
  status: ExpiryStatus,
) {
  switch (
    status
  ) {
    case "EXPIRED":
      return "Expired";

    case "CRITICAL":
      return "Critical";

    default:
      return "Near Expiry";
  }
}

function ExpiryStatusBadge({
  status,
}: {
  status: ExpiryStatus;
}) {
  const className =
    status ===
    "EXPIRED"
      ? "bg-red-100 text-red-600"
      : status ===
          "CRITICAL"
        ? "bg-orange-100 text-orange-700"
        : "bg-amber-100 text-amber-700";

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
      {getExpiryStatusLabel(
        status,
      )}
    </span>
  );
}

/* =========================================================
   DAYS BADGE
========================================================= */

function DaysBadge({
  daysLeft,
}: {
  daysLeft: number;
}) {
  const className =
    daysLeft < 0
      ? "bg-red-100 text-red-600"
      : daysLeft <= 15
        ? "bg-orange-100 text-orange-700"
        : "bg-amber-100 text-amber-700";

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
      {getDaysText(
        daysLeft,
      )}
    </span>
  );
}

/* =========================================================
   PURCHASE STATUS
========================================================= */

function getPurchaseStatusLabel(
  status: PurchaseStatus,
) {
  switch (
    status
  ) {
    case "PENDING":
      return "Pending";

    case "CANCELLED":
      return "Cancelled";

    default:
      return "Received";
  }
}

function PurchaseStatusBadge({
  status,
}: {
  status: PurchaseStatus;
}) {
  const className =
    status ===
    "RECEIVED"
      ? "bg-emerald-100 text-emerald-700"
      : status ===
          "PENDING"
        ? "bg-amber-100 text-amber-700"
        : "bg-red-100 text-red-600";

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
      {getPurchaseStatusLabel(
        status,
      )}
    </span>
  );
}