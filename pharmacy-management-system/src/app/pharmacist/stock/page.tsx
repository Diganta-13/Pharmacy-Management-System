"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertTriangle,
  Boxes,
  Clock3,
  Loader2,
  PackageX,
  Search,
} from "lucide-react";

/* =========================================================
   TYPES
========================================================= */

type InventoryStatus =
  | "IN_STOCK"
  | "LOW_STOCK"
  | "OUT_OF_STOCK"
  | "EXPIRED"
  | "BLOCKED";

type Medicine = {
  serial: number;

  databaseId: number;

  id: string;

  name: string;

  genericName: string;

  category: string;

  companyName: string;

  dosageForm: string;

  strength: string;

  unit: string;

  purchasePrice:
    | number
    | null;

  mrp:
    | number
    | null;

  sellingPrice:
    | number
    | null;

  stock: number;

  physicalStock: number;

  reorderLevel: number;

  batchId:
    | number
    | null;

  batchNo: string;

  expiryDate:
    | string
    | null;

  supplier: string;

  status: InventoryStatus;

  statusLabel: string;
};

type MedicineApiResponse = {
  success: boolean;

  message?: string;

  data?: Medicine[];
};

type DashboardSummary = {
  stockedMedicines: number;

  lowStockCount: number;

  outOfStockCount: number;

  expiringNext30: number;
};

type DashboardApiResponse = {
  success: boolean;

  message?: string;

  data?: {
    summary: DashboardSummary;
  };
};

/* =========================================================
   HELPERS
========================================================= */

function formatQuantity(
  value: number,
) {
  return Number(
    value,
  ).toLocaleString(
    "en-BD",
    {
      maximumFractionDigits: 3,
    },
  );
}

function formatDate(
  value: string | null,
) {
  if (!value) {
    return "—";
  }

  const date =
    value.slice(0, 10);

  const [
    year,
    month,
    day,
  ] = date.split("-");

  if (
    !year ||
    !month ||
    !day
  ) {
    return value;
  }

  return `${day}-${month}-${year}`;
}

function statusClass(
  status: InventoryStatus,
) {
  switch (status) {
    case "IN_STOCK":
      return "bg-emerald-100 text-emerald-700";

    case "LOW_STOCK":
      return "bg-amber-100 text-amber-700";

    case "OUT_OF_STOCK":
      return "bg-rose-100 text-rose-700";

    case "EXPIRED":
      return "bg-red-100 text-red-700";

    case "BLOCKED":
      return "bg-slate-200 text-slate-700";
  }
}

/* =========================================================
   PAGE
========================================================= */

export default function PharmacistStockPage() {
  const [
    medicines,
    setMedicines,
  ] =
    useState<Medicine[]>([]);

  const [
    summary,
    setSummary,
  ] =
    useState<DashboardSummary>({
      stockedMedicines: 0,

      lowStockCount: 0,

      outOfStockCount: 0,

      expiringNext30: 0,
    });

  const [
    searchTerm,
    setSearchTerm,
  ] =
    useState("");

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
     LOAD DATA
  ======================================================= */

  useEffect(() => {
    const controller =
      new AbortController();

    async function load() {
      try {
        setIsLoading(true);

        setErrorMessage("");

        const [
          medicineResponse,
          dashboardResponse,
        ] =
          await Promise.all([
            fetch(
              "/api/pharmacist/medicines",
              {
                method: "GET",

                cache: "no-store",

                signal:
                  controller.signal,
              },
            ),

            fetch(
              "/api/dashboard",
              {
                method: "GET",

                cache: "no-store",

                signal:
                  controller.signal,
              },
            ),
          ]);

        const medicineResult =
          (await medicineResponse.json()) as
            MedicineApiResponse;

        const dashboardResult =
          (await dashboardResponse.json()) as
            DashboardApiResponse;

        if (
          !medicineResponse.ok ||
          !medicineResult.success
        ) {
          throw new Error(
            medicineResult.message ??
              "Failed to load stock.",
          );
        }

        if (
          !dashboardResponse.ok ||
          !dashboardResult.success ||
          !dashboardResult.data
        ) {
          throw new Error(
            dashboardResult.message ??
              "Failed to load stock summary.",
          );
        }

        if (
          controller.signal.aborted
        ) {
          return;
        }

        setMedicines(
          medicineResult.data ??
            [],
        );

        setSummary({
          stockedMedicines:
            Number(
              dashboardResult.data
                .summary
                .stockedMedicines ??
                0,
            ),

          lowStockCount:
            Number(
              dashboardResult.data
                .summary
                .lowStockCount ??
                0,
            ),

          outOfStockCount:
            Number(
              dashboardResult.data
                .summary
                .outOfStockCount ??
                0,
            ),

          expiringNext30:
            Number(
              dashboardResult.data
                .summary
                .expiringNext30 ??
                0,
            ),
        });
      } catch (error) {
        if (
          error instanceof Error &&
          error.name ===
            "AbortError"
        ) {
          return;
        }

        console.error(
          "Pharmacist stock error:",
          error,
        );

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Failed to load stock.",
        );
      } finally {
        if (
          !controller.signal
            .aborted
        ) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      controller.abort();
    };
  }, []);

  /* =======================================================
     SEARCH
  ======================================================= */

  const filteredMedicines =
    useMemo(() => {
      const search =
        searchTerm
          .trim()
          .toLowerCase();

      if (!search) {
        return medicines;
      }

      return medicines.filter(
        (medicine) => {
          const values = [
            medicine.id,
            medicine.name,
            medicine.genericName,
            medicine.category,
            medicine.companyName,
            medicine.batchNo,
            medicine.unit,
            medicine.statusLabel,
          ];

          return values.some(
            (value) =>
              value
                .toLowerCase()
                .includes(search),
          );
        },
      );
    }, [
      medicines,
      searchTerm,
    ]);

  /* =======================================================
     UI
  ======================================================= */

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-4">

      {/* ===================================================
          SUMMARY CARDS
      =================================================== */}

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">

        <SummaryCard
          label="Stocked Medicines"
          value={
            summary.stockedMedicines
          }
          description="Medicines with batch records"
          className="border-sky-200 bg-sky-50/70"
          valueClassName="text-sky-700"
          iconClassName="bg-sky-100 text-sky-600"
          icon={
            <Boxes className="h-5 w-5" />
          }
        />

        <SummaryCard
          label="Low Stock Medicines"
          value={
            summary.lowStockCount
          }
          description="At or below reorder level"
          className="border-amber-200 bg-amber-50/70"
          valueClassName="text-amber-700"
          iconClassName="bg-amber-100 text-amber-600"
          icon={
            <AlertTriangle className="h-5 w-5" />
          }
        />

        <SummaryCard
          label="Out of Stock"
          value={
            summary.outOfStockCount
          }
          description="No sellable stock"
          className="border-rose-200 bg-rose-50/70"
          valueClassName="text-rose-700"
          iconClassName="bg-rose-100 text-rose-600"
          icon={
            <PackageX className="h-5 w-5" />
          }
        />

        <SummaryCard
          label="Near Expiry"
          value={
            summary.expiringNext30
          }
          description="Within next 30 days"
          className="border-orange-200 bg-orange-50/70"
          valueClassName="text-orange-700"
          iconClassName="bg-orange-100 text-orange-600"
          icon={
            <Clock3 className="h-5 w-5" />
          }
        />

      </section>

      {/* ===================================================
          SEARCH
      =================================================== */}

      <section className="relative">

        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

        <input
          type="text"
          value={
            searchTerm
          }
          onChange={(
            event,
          ) =>
            setSearchTerm(
              event.target.value,
            )
          }
          placeholder="Search medicine, generic, category, company or batch..."
          className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-[12px] text-slate-700 shadow-sm outline-none placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
        />

      </section>

      {/* ===================================================
          ERROR
      =================================================== */}

      {errorMessage ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[11px] text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      {/* ===================================================
          TABLE
      =================================================== */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        <div className="overflow-x-auto">

          <table className="w-full min-w-[1250px]">

            <thead>

              <tr className="border-b border-slate-200 bg-slate-50/80">

                <TableHead>
                  Medicine
                </TableHead>

                <TableHead>
                  Category
                </TableHead>

                <TableHead>
                  Company
                </TableHead>

                <TableHead>
                  Batch No.
                </TableHead>

                <TableHead>
                  Stock
                </TableHead>

                <TableHead>
                  Min Stock
                </TableHead>

                <TableHead>
                  Unit
                </TableHead>

                <TableHead>
                  Expiry
                </TableHead>

                <TableHead>
                  Status
                </TableHead>

              </tr>

            </thead>

            <tbody>

              {isLoading ? (

                <tr>

                  <td
                    colSpan={9}
                    className="px-5 py-16 text-center"
                  >

                    <Loader2 className="mx-auto h-7 w-7 animate-spin text-sky-600" />

                    <p className="mt-3 text-[12px] font-medium text-slate-600">
                      Loading stock...
                    </p>

                  </td>

                </tr>

              ) : filteredMedicines.length >
                0 ? (

                filteredMedicines.map(
                  (medicine) => (

                    <tr
                      key={
                        medicine.databaseId
                      }
                      className="border-b border-slate-100 transition last:border-0 hover:bg-slate-50/60"
                    >

                      {/* MEDICINE */}

                      <td className="px-4 py-3.5">

                        <div>

                          <p className="text-[11px] font-semibold text-slate-900">
                            {
                              medicine.name
                            }
                          </p>

                          <p className="mt-0.5 text-[9px] text-slate-400">
                            {
                              medicine.genericName ||
                              medicine.id
                            }
                          </p>

                        </div>

                      </td>

                      {/* CATEGORY */}

                      <td className="px-4 py-3.5">

                        <span className="inline-flex max-w-[180px] truncate rounded-full border border-sky-100 bg-sky-50 px-2.5 py-1 text-[9px] font-medium text-sky-700">
                          {
                            medicine.category
                          }
                        </span>

                      </td>

                      {/* COMPANY */}

                      <td className="px-4 py-3.5">

                        <p
                          title={
                            medicine.companyName
                          }
                          className="max-w-[180px] truncate text-[10px] text-slate-500"
                        >
                          {
                            medicine.companyName ||
                            "—"
                          }
                        </p>

                      </td>

                      {/* BATCH */}

                      <td className="px-4 py-3.5">

                        <span
                          title="Nearest available / relevant batch"
                          className="font-mono text-[10px] font-medium text-slate-700"
                        >
                          {
                            medicine.batchNo ||
                            "—"
                          }
                        </span>

                      </td>

                      {/* STOCK */}

                      <td className="px-4 py-3.5">

                        <span
                          className={`text-[11px] font-semibold ${
                            medicine.stock ===
                            0
                              ? "text-rose-600"
                              : medicine.status ===
                                "LOW_STOCK"
                              ? "text-amber-600"
                              : "text-slate-900"
                          }`}
                        >
                          {formatQuantity(
                            medicine.stock,
                          )}
                        </span>

                      </td>

                      {/* MIN */}

                      <td className="px-4 py-3.5 text-[10px] text-slate-500">
                        {formatQuantity(
                          medicine.reorderLevel,
                        )}
                      </td>

                      {/* UNIT */}

                      <td className="px-4 py-3.5 text-[10px] text-slate-700">
                        {
                          medicine.unit
                        }
                      </td>

                      {/* EXPIRY */}

                      <td className="px-4 py-3.5 text-[10px] text-slate-500">
                        {formatDate(
                          medicine.expiryDate,
                        )}
                      </td>

                      {/* STATUS */}

                      <td className="px-4 py-3.5">

                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[9px] font-medium ${statusClass(
                            medicine.status,
                          )}`}
                        >
                          {
                            medicine.statusLabel
                          }
                        </span>

                      </td>

                    </tr>

                  ),
                )

              ) : (

                <tr>

                  <td
                    colSpan={9}
                    className="px-5 py-16 text-center"
                  >

                    <p className="text-[12px] font-medium text-slate-700">
                      No stock records found
                    </p>

                    <p className="mt-1 text-[10px] text-slate-400">
                      Try changing your search.
                    </p>

                  </td>

                </tr>

              )}

            </tbody>

          </table>

        </div>

      </section>

      {!isLoading ? (
        <p className="px-1 text-[10px] text-slate-400">
          Showing{" "}
          {
            filteredMedicines.length
          }{" "}
          of{" "}
          {
            medicines.length
          }{" "}
          medicines
        </p>
      ) : null}

    </div>
  );
}

/* =========================================================
   COMPONENTS
========================================================= */

function TableHead({
  children,
}: {
  children:
    React.ReactNode;
}) {
  return (
    <th className="whitespace-nowrap px-4 py-3.5 text-left text-[10px] font-medium text-slate-500">
      {children}
    </th>
  );
}

function SummaryCard({
  label,
  value,
  description,
  icon,
  className,
  valueClassName,
  iconClassName,
}: {
  label: string;

  value: number;

  description: string;

  icon: React.ReactNode;

  className: string;

  valueClassName: string;

  iconClassName: string;
}) {
  return (
    <article
      className={`flex min-h-[105px] items-start justify-between rounded-2xl border p-4 shadow-sm ${className}`}
    >

      <div>

        <p className="text-[10px] font-medium text-slate-500">
          {label}
        </p>

        <p
          className={`mt-2 text-2xl font-semibold ${valueClassName}`}
        >
          {value}
        </p>

        <p className="mt-1 text-[9px] text-slate-400">
          {description}
        </p>

      </div>

      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconClassName}`}
      >
        {icon}
      </div>

    </article>
  );
}