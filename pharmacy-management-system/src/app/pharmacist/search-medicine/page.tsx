"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Eye,
  Loader2,
  Search,
  X,
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

type FilterValue =
  | "ALL"
  | InventoryStatus;

/* =========================================================
   API
========================================================= */

async function fetchMedicines(
  signal?: AbortSignal,
) {
  const response =
    await fetch(
      "/api/pharmacist/medicines",
      {
        method: "GET",

        cache: "no-store",

        signal,
      },
    );

  const result =
    (await response.json()) as
      MedicineApiResponse;

  if (
    !response.ok ||
    !result.success ||
    !result.data
  ) {
    throw new Error(
      result.message ??
        "Failed to load medicines.",
    );
  }

  return result.data;
}

/* =========================================================
   HELPERS
========================================================= */

function formatMoney(
  value: number | null,
) {
  if (value === null) {
    return "—";
  }

  return `৳${Number(
    value,
  ).toLocaleString(
    "en-BD",
    {
      maximumFractionDigits:
        2,
    },
  )}`;
}

function formatQuantity(
  value: number,
) {
  return Number(
    value,
  ).toLocaleString(
    "en-BD",
    {
      maximumFractionDigits:
        3,
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

function categoryClass() {
  return "border border-sky-100 bg-sky-50 text-sky-700";
}

/* =========================================================
   PAGE
========================================================= */

export default function SearchMedicinePage() {
  const [
    medicines,
    setMedicines,
  ] =
    useState<Medicine[]>([]);

  const [
    searchTerm,
    setSearchTerm,
  ] =
    useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState<FilterValue>(
      "ALL",
    );

  const [
    selectedMedicine,
    setSelectedMedicine,
  ] =
    useState<Medicine | null>(
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
     LOAD
  ======================================================= */

  useEffect(() => {
    const controller =
      new AbortController();

    fetchMedicines(
      controller.signal,
    )
      .then((data) => {
        if (
          controller.signal
            .aborted
        ) {
          return;
        }

        setMedicines(data);

        setErrorMessage("");

        setIsLoading(false);
      })
      .catch((error) => {
        if (
          controller.signal
            .aborted
        ) {
          return;
        }

        console.error(
          "Search medicine load error:",
          error,
        );

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Failed to load medicines.",
        );

        setIsLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, []);

  /* =======================================================
     SEARCH + FILTER
  ======================================================= */

  const filteredMedicines =
    useMemo(() => {
      const search =
        searchTerm
          .trim()
          .toLowerCase();

      return medicines.filter(
        (medicine) => {
          const matchesStatus =
            statusFilter ===
              "ALL" ||
            medicine.status ===
              statusFilter;

          if (!matchesStatus) {
            return false;
          }

          if (!search) {
            return true;
          }

          const values = [
            medicine.id,
            medicine.name,
            medicine.genericName,
            medicine.category,
            medicine.companyName,
            medicine.dosageForm,
            medicine.strength,
            medicine.batchNo,
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
      statusFilter,
    ]);

  /* =======================================================
     UI
  ======================================================= */

  return (
    <>
      <div className="mx-auto w-full max-w-[1600px] space-y-4">

        {/* ===============================================
            SEARCH + FILTER
        =============================================== */}

        <section className="flex flex-col gap-3 sm:flex-row">

          <div className="relative flex-1">

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
              placeholder="Search by name, generic, company, category or medicine code..."
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-[12px] text-slate-700 shadow-sm outline-none placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            />

          </div>

          <select
            value={
              statusFilter
            }
            onChange={(
              event,
            ) =>
              setStatusFilter(
                event.target
                  .value as FilterValue,
              )
            }
            className="h-11 min-w-[185px] rounded-2xl border border-slate-200 bg-white px-4 text-[11px] text-slate-700 shadow-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
          >
            <option value="ALL">
              All
            </option>

            <option value="IN_STOCK">
              In Stock
            </option>

            <option value="LOW_STOCK">
              Low Stock
            </option>

            <option value="OUT_OF_STOCK">
              Out of Stock
            </option>

            <option value="EXPIRED">
              Expired
            </option>

            <option value="BLOCKED">
              Blocked
            </option>
          </select>

        </section>

        {/* ERROR */}

        {errorMessage ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[11px] text-rose-700">
            {errorMessage}
          </div>
        ) : null}

        {/* ===============================================
            TABLE
        =============================================== */}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="overflow-x-auto">

            <table className="w-full min-w-[1350px]">

              <thead>

                <tr className="border-b border-slate-200 bg-slate-50/80">

                  <TableHead>
                    SL
                  </TableHead>

                  <TableHead>
                    Medicine
                  </TableHead>

                  <TableHead>
                    Generic
                  </TableHead>

                  <TableHead>
                    Category
                  </TableHead>

                  <TableHead>
                    Company
                  </TableHead>

                  <TableHead>
                    Unit
                  </TableHead>

                  <TableHead>
                    Purchase
                  </TableHead>

                  <TableHead>
                    Sell
                  </TableHead>

                  <TableHead>
                    Stock
                  </TableHead>

                  <TableHead>
                    Expiry
                  </TableHead>

                  <TableHead>
                    Status
                  </TableHead>

                  <TableHead>
                    Action
                  </TableHead>

                </tr>

              </thead>

              <tbody>

                {isLoading ? (

                  <tr>

                    <td
                      colSpan={12}
                      className="px-5 py-16 text-center"
                    >

                      <Loader2 className="mx-auto h-7 w-7 animate-spin text-sky-600" />

                      <p className="mt-3 text-[12px] font-medium text-slate-600">
                        Loading medicines...
                      </p>

                    </td>

                  </tr>

                ) : filteredMedicines.length >
                  0 ? (

                  filteredMedicines.map(
                    (
                      medicine,
                      index,
                    ) => (

                      <tr
                        key={
                          medicine.databaseId
                        }
                        className="border-b border-slate-100 transition last:border-0 hover:bg-slate-50/60"
                      >

                        {/* SL */}

                        <td className="px-4 py-3.5 text-[10px] text-slate-500">
                          {index +
                            1}
                        </td>

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
                                medicine.id
                              }
                            </p>

                          </div>

                        </td>

                        {/* GENERIC */}

                        <td className="px-4 py-3.5">

                          <p className="max-w-[190px] truncate text-[10px] text-slate-500">
                            {
                              medicine.genericName ||
                              "—"
                            }
                          </p>

                        </td>

                        {/* CATEGORY */}

                        <td className="px-4 py-3.5">

                          <span
                            className={`inline-flex max-w-[180px] truncate rounded-full px-2.5 py-1 text-[9px] font-medium ${categoryClass()}`}
                          >
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
                            className="max-w-[170px] truncate text-[10px] text-slate-500"
                          >
                            {
                              medicine.companyName ||
                              "—"
                            }
                          </p>

                        </td>

                        {/* UNIT */}

                        <td className="px-4 py-3.5 text-[10px] text-slate-700">
                          {
                            medicine.unit
                          }
                        </td>

                        {/* PURCHASE */}

                        <td className="px-4 py-3.5 text-[10px] text-slate-600">
                          {formatMoney(
                            medicine.purchasePrice,
                          )}
                        </td>

                        {/* SELL */}

                        <td className="px-4 py-3.5">

                          <span className="text-[10px] font-semibold text-emerald-700">
                            {formatMoney(
                              medicine.sellingPrice,
                            )}
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

                        {/* ACTION */}

                        <td className="px-4 py-3.5">

                          <button
                            type="button"
                            title="View medicine details"
                            onClick={() =>
                              setSelectedMedicine(
                                medicine,
                              )
                            }
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-sky-600 transition hover:bg-sky-50"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>

                        </td>

                      </tr>

                    ),
                  )

                ) : (

                  <tr>

                    <td
                      colSpan={12}
                      className="px-5 py-16 text-center"
                    >

                      <p className="text-[12px] font-medium text-slate-700">
                        No medicines found
                      </p>

                      <p className="mt-1 text-[10px] text-slate-400">
                        Try changing the search or status filter.
                      </p>

                    </td>

                  </tr>

                )}

              </tbody>

            </table>

          </div>

        </section>

        {/* RESULT COUNT */}

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

      {/* ===================================================
          MEDICINE DETAILS MODAL
      =================================================== */}

      {selectedMedicine ? (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]">

          <div className="max-h-[94vh] w-full max-w-[500px] overflow-y-auto rounded-2xl bg-white shadow-2xl">

            {/* HEADER */}

            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">

              <h2 className="text-[15px] font-semibold text-slate-900">
                Medicine Details
              </h2>

              <button
                type="button"
                onClick={() =>
                  setSelectedMedicine(
                    null,
                  )
                }
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>

            </div>

            {/* CONTENT */}

            <div className="p-5">

              {/* MEDICINE HEADER */}

              <div className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-4">

                <h3 className="text-lg font-semibold text-sky-600">
                  {
                    selectedMedicine.name
                  }
                </h3>

                <p className="mt-1 text-[11px] text-slate-500">
                  {selectedMedicine.genericName ||
                    "Generic not specified"}
                  {" · "}
                  {
                    selectedMedicine.category
                  }
                </p>

                <p className="mt-1 text-[9px] text-slate-400">
                  {
                    selectedMedicine.id
                  }
                </p>

              </div>

              {/* DETAIL GRID */}

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">

                <DetailBox
                  label="Company"
                  value={
                    selectedMedicine.companyName ||
                    "—"
                  }
                />

                <DetailBox
                  label="Batch No."
                  value={
                    selectedMedicine.batchNo ||
                    "—"
                  }
                />

                <DetailBox
                  label="Unit Type"
                  value={
                    selectedMedicine.unit
                  }
                />

                <DetailBox
                  label="Dosage Form"
                  value={
                    selectedMedicine.dosageForm ||
                    "—"
                  }
                />

                <DetailBox
                  label="Purchase Price"
                  value={formatMoney(
                    selectedMedicine.purchasePrice,
                  )}
                />

                <DetailBox
                  label="Selling Price"
                  value={formatMoney(
                    selectedMedicine.sellingPrice,
                  )}
                />

                <DetailBox
                  label="MRP"
                  value={formatMoney(
                    selectedMedicine.mrp,
                  )}
                />

                <DetailBox
                  label="Stock"
                  value={`${formatQuantity(
                    selectedMedicine.stock,
                  )} ${
                    selectedMedicine.unit
                  }`}
                />

                <DetailBox
                  label="Min. Stock"
                  value={`${formatQuantity(
                    selectedMedicine.reorderLevel,
                  )} ${
                    selectedMedicine.unit
                  }`}
                />

                <DetailBox
                  label="Expiry Date"
                  value={formatDate(
                    selectedMedicine.expiryDate,
                  )}
                />

                <DetailBox
                  label="Supplier"
                  value={
                    selectedMedicine.supplier ||
                    "—"
                  }
                />

                <div className="rounded-xl bg-slate-50 px-3 py-3">

                  <p className="text-[9px] font-medium uppercase tracking-wide text-slate-400">
                    Status
                  </p>

                  <div className="mt-2">

                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[9px] font-medium ${statusClass(
                        selectedMedicine.status,
                      )}`}
                    >
                      {
                        selectedMedicine.statusLabel
                      }
                    </span>

                  </div>

                </div>

              </div>

              {/* NOTE */}

              {selectedMedicine.purchasePrice ===
                null ||
              !selectedMedicine.supplier ? (

                <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2.5 text-[9px] leading-4 text-amber-700">
                  Purchase price or supplier information is unavailable for this batch because it is not linked to a received purchase record.
                </div>

              ) : null}

              {/* CLOSE */}

              <button
                type="button"
                onClick={() =>
                  setSelectedMedicine(
                    null,
                  )
                }
                className="mt-4 h-10 w-full rounded-xl border border-slate-200 text-[11px] font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Close
              </button>

            </div>

          </div>

        </div>

      ) : null}
    </>
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

function DetailBox({
  label,
  value,
}: {
  label: string;

  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-3">

      <p className="text-[9px] font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 break-words text-[11px] font-medium text-slate-800">
        {value}
      </p>

    </div>
  );
}