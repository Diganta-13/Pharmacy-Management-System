"use client";

import {
  FormEvent,
  ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Boxes,
  Loader2,
  Package,
  Pencil,
  Search,
  X,
} from "lucide-react";

/* =========================================================
   TYPES
========================================================= */

type BatchStatus =
  | "ACTIVE"
  | "DEPLETED"
  | "EXPIRED"
  | "BLOCKED";

type StockBatch = {
  id: string;

  batchNo: string;

  expiryDate: string;

  stockBaseQuantity: number;

  status: BatchStatus;
};

type StockMedicine = {
  id: string;

  databaseId?: number;

  medicineName: string;

  genericName: string;

  category: string;

  baseUnit: string;

  reorderLevelBase: number;

  reorderMode?:
    | "MANUAL"
    | "AUTO";

  batches: StockBatch[];
};

type StockStatus =
  | "In Stock"
  | "Low Stock"
  | "Out of Stock";

type AdjustmentType =
  | "increase"
  | "decrease";

type SortOption =
  | "default"
  | "quantity-low-high"
  | "quantity-high-low";

type AdjustmentForm = {
  batchId: string;

  type: AdjustmentType;

  quantity: string;

  reason: string;
};

type StockApiResponse = {
  success: boolean;

  message?: string;

  data?: StockMedicine[];
};

type MutationApiResponse = {
  success: boolean;

  message?: string;
};

/* =========================================================
   DATE
========================================================= */

function getTodayDateOnly() {
  const today =
    new Date();

  const year =
    today.getFullYear();

  const month =
    String(
      today.getMonth() +
        1,
    ).padStart(
      2,
      "0",
    );

  const day =
    String(
      today.getDate(),
    ).padStart(
      2,
      "0",
    );

  return `${year}-${month}-${day}`;
}

function formatDate(
  value: string,
) {
  if (!value) {
    return "-";
  }

  const [
    year,
    month,
    day,
  ] =
    value.split("-");

  return `${day}-${month}-${year}`;
}

/* =========================================================
   STOCK LOGIC
========================================================= */

function isBatchExpired(
  batch: StockBatch,
) {
  return (
    batch.expiryDate <
    getTodayDateOnly()
  );
}

function isBatchAvailable(
  batch: StockBatch,
) {
  return (
    batch.status ===
      "ACTIVE" &&
    !isBatchExpired(
      batch,
    ) &&
    batch.stockBaseQuantity >
      0
  );
}

/* Physical quantity inside pharmacy */
function getPhysicalStock(
  medicine: StockMedicine,
) {
  return medicine.batches.reduce(
    (
      total,
      batch,
    ) =>
      total +
      batch.stockBaseQuantity,

    0,
  );
}

/*
  Sellable stock only.

  BLOCKED / EXPIRED / DEPLETED
  batches are excluded.
*/
function getAvailableStock(
  medicine: StockMedicine,
) {
  return medicine.batches
    .filter(
      isBatchAvailable,
    )
    .reduce(
      (
        total,
        batch,
      ) =>
        total +
        batch.stockBaseQuantity,

      0,
    );
}

function getExpiredStock(
  medicine: StockMedicine,
) {
  return medicine.batches
    .filter(
      (batch) =>
        isBatchExpired(
          batch,
        ) ||
        batch.status ===
          "EXPIRED",
    )
    .reduce(
      (
        total,
        batch,
      ) =>
        total +
        batch.stockBaseQuantity,

      0,
    );
}

/*
  LOW STOCK MUST BE CHECKED
  AT MEDICINE LEVEL.

  Not batch level.
*/
function getStockStatus(
  medicine: StockMedicine,
): StockStatus {
  const available =
    getAvailableStock(
      medicine,
    );

  if (
    available === 0
  ) {
    return "Out of Stock";
  }

  if (
    available <=
    medicine.reorderLevelBase
  ) {
    return "Low Stock";
  }

  return "In Stock";
}

function getNearestValidExpiry(
  medicine: StockMedicine,
) {
  const validBatches =
    medicine.batches
      .filter(
        isBatchAvailable,
      )
      .sort(
        (
          first,
          second,
        ) =>
          first.expiryDate.localeCompare(
            second.expiryDate,
          ),
      );

  return (
    validBatches[0]
      ?.expiryDate ??
    null
  );
}

function getExpiryStatus(
  expiryDate: string,
) {
  const today =
    new Date();

  today.setHours(
    0,
    0,
    0,
    0,
  );

  const expiry =
    new Date(
      `${expiryDate}T00:00:00`,
    );

  if (
    expiry < today
  ) {
    return "Expired";
  }

  const nearExpiry =
    new Date(today);

  /*
   * Final project policy:
   * Near Expiry = today through next 30 days.
   */
  nearExpiry.setDate(
    nearExpiry.getDate() +
      30,
  );

  if (
    expiry <=
    nearExpiry
  ) {
    return "Near Expiry";
  }

  return "Valid";
}

/* =========================================================
   PAGE
========================================================= */

export default function StockPage() {
  const [
    stockItems,
    setStockItems,
  ] =
    useState<
      StockMedicine[]
    >([]);

  const [
    searchTerm,
    setSearchTerm,
  ] =
    useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState("All");

  const [
    sortOption,
    setSortOption,
  ] =
    useState<SortOption>(
      "default",
    );

  const [
    selectedMedicine,
    setSelectedMedicine,
  ] =
    useState<StockMedicine | null>(
      null,
    );

  const [
    adjustmentForm,
    setAdjustmentForm,
  ] =
    useState<AdjustmentForm>({
      batchId: "",

      type:
        "increase",

      quantity: "",

      reason: "",
    });

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true);

  const [
    isAdjusting,
    setIsAdjusting,
  ] =
    useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState("");

  /* =======================================================
     INITIAL DB LOAD
  ======================================================= */

  useEffect(() => {
    const controller =
      new AbortController();

    async function loadInitialStock() {
      try {
        const response =
          await fetch(
            "/api/stock",
            {
              cache:
                "no-store",

              signal:
                controller.signal,
            },
          );

        const result:
          StockApiResponse =
          await response.json();

        if (
          !response.ok ||
          !result.success
        ) {
          throw new Error(
            result.message ||
              "Failed to load stock.",
          );
        }

        if (
          !controller.signal
            .aborted
        ) {
          setStockItems(
            result.data ??
              [],
          );
        }
      } catch (error) {
        if (
          error instanceof Error &&
          error.name ===
            "AbortError"
        ) {
          return;
        }

        console.error(
          "Initial stock error:",
          error,
        );

        if (
          !controller.signal
            .aborted
        ) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Failed to load stock.",
          );
        }
      } finally {
        if (
          !controller.signal
            .aborted
        ) {
          setIsLoading(
            false,
          );
        }
      }
    }

    void loadInitialStock();

    return () => {
      controller.abort();
    };
  }, []);

  /* =======================================================
     RELOAD STOCK
  ======================================================= */

  async function loadStock() {
    try {
      setErrorMessage("");

      const response =
        await fetch(
          "/api/stock",
          {
            cache:
              "no-store",
          },
        );

      const result:
        StockApiResponse =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Failed to load stock.",
        );
      }

      const freshData =
        result.data ?? [];

      setStockItems(
        freshData,
      );

      return freshData;
    } catch (error) {
      console.error(
        "Load stock error:",
        error,
      );

      const message =
        error instanceof Error
          ? error.message
          : "Failed to load stock.";

      setErrorMessage(
        message,
      );

      throw error;
    }
  }

  /* =======================================================
     SUMMARY
  ======================================================= */

  const statistics =
    useMemo(() => {
      /*
       * Stocked Medicines:
       * Active medicines that already have
       * at least one batch / stock record.
       *
       * This is different from total active
       * medicines in the Medicines module.
       */
      const stocked =
        stockItems.filter(
          (medicine) =>
            medicine.batches.length >
            0,
        ).length;

      const healthy =
        stockItems.filter(
          (medicine) =>
            getStockStatus(
              medicine,
            ) ===
            "In Stock",
        ).length;

      const low =
        stockItems.filter(
          (medicine) =>
            getStockStatus(
              medicine,
            ) ===
            "Low Stock",
        ).length;

      const out =
        stockItems.filter(
          (medicine) =>
            getStockStatus(
              medicine,
            ) ===
            "Out of Stock",
        ).length;

      return {
        stocked,
        healthy,
        low,
        out,
      };
    }, [
      stockItems,
    ]);

  /* =======================================================
     FILTER + SORT
  ======================================================= */

  const filteredStockItems =
    useMemo(() => {
      const search =
        searchTerm
          .trim()
          .toLowerCase();

      const filtered =
        stockItems.filter(
          (medicine) => {
            const matchesSearch =
              medicine.medicineName
                .toLowerCase()
                .includes(
                  search,
                ) ||

              medicine.genericName
                .toLowerCase()
                .includes(
                  search,
                ) ||

              medicine.category
                .toLowerCase()
                .includes(
                  search,
                ) ||

              medicine.batches.some(
                (batch) =>
                  batch.batchNo
                    .toLowerCase()
                    .includes(
                      search,
                    ),
              );

            const status =
              getStockStatus(
                medicine,
              );

            const matchesStatus =
              statusFilter ===
                "All" ||
              status ===
                statusFilter;

            return (
              matchesSearch &&
              matchesStatus
            );
          },
        );

      const result = [
        ...filtered,
      ];

      if (
        sortOption ===
        "quantity-low-high"
      ) {
        result.sort(
          (
            first,
            second,
          ) =>
            getAvailableStock(
              first,
            ) -
            getAvailableStock(
              second,
            ),
        );
      }

      if (
        sortOption ===
        "quantity-high-low"
      ) {
        result.sort(
          (
            first,
            second,
          ) =>
            getAvailableStock(
              second,
            ) -
            getAvailableStock(
              first,
            ),
        );
      }

      return result;
    }, [
      stockItems,
      searchTerm,
      statusFilter,
      sortOption,
    ]);

  /* =======================================================
     OPEN DETAILS
  ======================================================= */

  function openAdjustmentModal(
    medicine: StockMedicine,
  ) {
    const validBatch =
      [...medicine.batches]
        .filter(
          isBatchAvailable,
        )
        .sort(
          (
            first,
            second,
          ) =>
            first.expiryDate.localeCompare(
              second.expiryDate,
            ),
        )[0];

    const defaultBatch =
      validBatch ??
      medicine.batches[0];

    setSelectedMedicine(
      medicine,
    );

    setAdjustmentForm({
      batchId:
        defaultBatch?.id ??
        "",

      type:
        "increase",

      quantity: "",

      reason: "",
    });
  }

  function closeAdjustmentModal() {
    if (isAdjusting) {
      return;
    }

    setSelectedMedicine(
      null,
    );

    setAdjustmentForm({
      batchId: "",

      type:
        "increase",

      quantity: "",

      reason: "",
    });
  }

  const selectedBatch =
    selectedMedicine?.batches.find(
      (batch) =>
        batch.id ===
        adjustmentForm.batchId,
    ) ?? null;

  /* =======================================================
     SAVE ADJUSTMENT
  ======================================================= */

  async function handleStockAdjustment(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      !selectedMedicine ||
      !selectedBatch
    ) {
      window.alert(
        "Please select a batch.",
      );

      return;
    }

    const quantity =
      Number(
        adjustmentForm.quantity,
      );

    if (
      !Number.isInteger(
        quantity,
      ) ||
      quantity <= 0
    ) {
      window.alert(
        "Please enter a valid whole quantity.",
      );

      return;
    }

    if (
      !adjustmentForm.reason.trim()
    ) {
      window.alert(
        "Please enter a reason for this stock adjustment.",
      );

      return;
    }

    if (
      adjustmentForm.type ===
        "decrease" &&
      quantity >
        selectedBatch.stockBaseQuantity
    ) {
      window.alert(
        `Cannot decrease more than ${selectedBatch.stockBaseQuantity.toLocaleString(
          "en-US",
        )} ${selectedMedicine.baseUnit}.`,
      );

      return;
    }

    try {
      setIsAdjusting(
        true,
      );

      const response =
        await fetch(
          "/api/stock/adjust",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                batchId:
                  selectedBatch.id,

                type:
                  adjustmentForm.type,

                quantity,

                reason:
                  adjustmentForm.reason.trim(),
              }),
          },
        );

      const result:
        MutationApiResponse =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Stock adjustment failed.",
        );
      }

      const freshData =
        await loadStock();

      const updatedMedicine =
        freshData.find(
          (medicine) =>
            medicine.id ===
            selectedMedicine.id,
        );

      if (
        updatedMedicine
      ) {
        setSelectedMedicine(
          updatedMedicine,
        );

        const updatedBatch =
          updatedMedicine.batches.find(
            (batch) =>
              batch.id ===
              selectedBatch.id,
          );

        setAdjustmentForm({
          batchId:
            updatedBatch?.id ??
            "",

          type:
            "increase",

          quantity: "",

          reason: "",
        });
      } else {
        closeAdjustmentModal();
      }
    } catch (error) {
      console.error(
        "Adjustment error:",
        error,
      );

      window.alert(
        error instanceof Error
          ? error.message
          : "Stock adjustment failed.",
      );
    } finally {
      setIsAdjusting(
        false,
      );
    }
  }

  /* =======================================================
     BADGES
  ======================================================= */

  function stockStatusClass(
    status: StockStatus,
  ) {
    if (
      status ===
      "In Stock"
    ) {
      return "bg-emerald-100 text-emerald-700";
    }

    if (
      status ===
      "Low Stock"
    ) {
      return "bg-amber-100 text-amber-700";
    }

    return "bg-rose-100 text-rose-600";
  }

  function expiryStatusClass(
    status: string,
  ) {
    if (
      status ===
      "Valid"
    ) {
      return "bg-sky-50 text-sky-700";
    }

    if (
      status ===
      "Near Expiry"
    ) {
      return "bg-amber-100 text-amber-700";
    }

    return "bg-rose-100 text-rose-600";
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <>
      <div className="mx-auto w-full max-w-[1600px] space-y-4">

        {/* SUMMARY */}

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">

          <SummaryCard
            label="Stocked Medicines"
            value={
              statistics.stocked
            }
            description="Medicines with batch records"
            icon={
              <Boxes className="h-5 w-5" />
            }
            iconClass="bg-sky-50 text-sky-600"
          />

          <SummaryCard
            label="Healthy Stock"
            value={
              statistics.healthy
            }
            description="Above reorder level"
            icon={
              <Package className="h-5 w-5" />
            }
            iconClass="bg-emerald-50 text-emerald-600"
          />

          <SummaryCard
            label="Low Stock"
            value={
              statistics.low
            }
            description="Reorder required"
            icon={
              <AlertTriangle className="h-5 w-5" />
            }
            iconClass="bg-amber-50 text-amber-600"
          />

          <SummaryCard
            label="Out of Stock"
            value={
              statistics.out
            }
            description="No valid stock available"
            icon={
              <Package className="h-5 w-5" />
            }
            iconClass="bg-rose-50 text-rose-500"
          />

        </section>

        {/* ERROR */}

        {errorMessage ? (

          <section className="flex items-center justify-between gap-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">

            <p className="text-[11px] text-rose-700">
              {errorMessage}
            </p>

            <button
              type="button"
              onClick={() =>
                void loadStock()
              }
              className="text-[10px] font-semibold text-rose-700 underline"
            >
              Retry
            </button>

          </section>

        ) : null}

        {/* SEARCH / FILTER / SORT */}

        <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row">

          <div className="relative flex-1">

            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              type="text"
              value={
                searchTerm
              }
              onChange={(
                event,
              ) =>
                setSearchTerm(
                  event.target
                    .value,
                )
              }
              placeholder="Search medicine, generic, category or batch..."
              className="h-10 w-full rounded-xl border border-slate-200 pl-10 pr-4 text-[11px] text-slate-700 outline-none placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
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
                  .value,
              )
            }
            className="h-10 min-w-[180px] rounded-xl border border-slate-200 bg-white px-3 text-[11px] text-slate-700 outline-none focus:border-sky-400"
          >

            <option value="All">
              All Stock Status
            </option>

            <option value="In Stock">
              In Stock
            </option>

            <option value="Low Stock">
              Low Stock
            </option>

            <option value="Out of Stock">
              Out of Stock
            </option>

          </select>

          <select
            value={
              sortOption
            }
            onChange={(
              event,
            ) =>
              setSortOption(
                event.target
                  .value as SortOption,
              )
            }
            className="h-10 min-w-[200px] rounded-xl border border-slate-200 bg-white px-3 text-[11px] text-slate-700 outline-none focus:border-sky-400"
          >

            <option value="default">
              Sort by Quantity
            </option>

            <option value="quantity-low-high">
              Quantity: Low to High
            </option>

            <option value="quantity-high-low">
              Quantity: High to Low
            </option>

          </select>

        </section>

        {/* TABLE */}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="overflow-x-auto">

            <table className="w-full min-w-[1100px]">

              <thead>

                <tr className="border-b border-slate-200 bg-slate-50/80">

                  <TableHead className="w-[270px]">
                    Medicine
                  </TableHead>

                  <TableHead className="w-[140px]">
                    Available Stock
                  </TableHead>

                  <TableHead className="w-[140px]">
                    Physical Stock
                  </TableHead>

                  <TableHead className="w-[130px]">
                    Reorder Level
                  </TableHead>

                  <TableHead className="w-[90px]">
                    Batches
                  </TableHead>

                  <TableHead className="w-[145px]">
                    Nearest Expiry
                  </TableHead>

                  <TableHead className="w-[120px]">
                    Stock Status
                  </TableHead>

                  <TableHead className="w-[90px] text-center">
                    Action
                  </TableHead>

                </tr>

              </thead>

              <tbody>

                {isLoading ? (

                  <tr>

                    <td
                      colSpan={
                        8
                      }
                      className="px-5 py-16 text-center"
                    >

                      <Loader2 className="mx-auto h-7 w-7 animate-spin text-sky-600" />

                      <p className="mt-3 text-[12px] font-medium text-slate-700">
                        Loading stock...
                      </p>

                    </td>

                  </tr>

                ) : (

                  <>
                    {filteredStockItems.map(
                      (
                        medicine,
                      ) => {
                        const available =
                          getAvailableStock(
                            medicine,
                          );

                        const physical =
                          getPhysicalStock(
                            medicine,
                          );

                        const expired =
                          getExpiredStock(
                            medicine,
                          );

                        const status =
                          getStockStatus(
                            medicine,
                          );

                        const nearestExpiry =
                          getNearestValidExpiry(
                            medicine,
                          );

                        const nearestExpiryStatus =
                          nearestExpiry
                            ? getExpiryStatus(
                                nearestExpiry,
                              )
                            : null;

                        return (

                          <tr
                            key={
                              medicine.id
                            }
                            className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60"
                          >

                            {/* MEDICINE */}

                            <td className="px-4 py-4">

                              <p className="text-[12px] font-semibold text-slate-900">
                                {
                                  medicine.medicineName
                                }
                              </p>

                              <p className="mt-1 text-[9px] text-slate-500">
                                {
                                  medicine.genericName
                                }
                              </p>

                              <div className="mt-1.5 flex items-center gap-2">

                                <span className="inline-flex rounded-full border border-sky-100 bg-sky-50 px-2 py-0.5 text-[8px] font-medium text-sky-700">
                                  {
                                    medicine.category
                                  }
                                </span>

                                <span className="font-mono text-[8px] text-slate-400">
                                  {
                                    medicine.id
                                  }
                                </span>

                              </div>

                            </td>

                            {/* AVAILABLE */}

                            <td className="px-4 py-4">

                              <p
                                className={`text-[12px] font-semibold ${
                                  status ===
                                  "Out of Stock"
                                    ? "text-rose-600"
                                    : status ===
                                        "Low Stock"
                                      ? "text-amber-600"
                                      : "text-slate-900"
                                }`}
                              >

                                {available.toLocaleString(
                                  "en-US",
                                )}

                              </p>

                              <p className="mt-0.5 text-[8px] text-slate-400">
                                {
                                  medicine.baseUnit
                                }
                              </p>

                              <p className="mt-1 text-[7px] text-emerald-600">
                                Sellable
                              </p>

                            </td>

                            {/* PHYSICAL */}

                            <td className="px-4 py-4">

                              <p className="text-[12px] font-semibold text-slate-800">

                                {physical.toLocaleString(
                                  "en-US",
                                )}

                              </p>

                              <p className="mt-0.5 text-[8px] text-slate-400">
                                {
                                  medicine.baseUnit
                                }
                              </p>

                              {expired >
                              0 ? (

                                <p className="mt-1 text-[7px] text-rose-500">

                                  {
                                    expired
                                  }{" "}

                                  expired

                                </p>

                              ) : null}

                            </td>

                            {/* REORDER */}

                            <td className="px-4 py-4">

                              <p className="text-[11px] font-semibold text-slate-700">

                                {medicine.reorderLevelBase.toLocaleString(
                                  "en-US",
                                )}

                              </p>

                              <p className="mt-0.5 text-[8px] text-slate-400">
                                {
                                  medicine.baseUnit
                                }
                              </p>

                              {medicine.reorderMode ===
                              "AUTO" ? (

                                <p className="mt-1 text-[7px] font-medium text-violet-600">
                                  Auto
                                </p>

                              ) : null}

                            </td>

                            {/* BATCH */}

                            <td className="px-4 py-4">

                              <span className="inline-flex rounded-full bg-violet-50 px-2.5 py-1 text-[9px] font-medium text-violet-700">

                                {
                                  medicine.batches
                                    .length
                                }

                              </span>

                            </td>

                            {/* EXPIRY */}

                            <td className="px-4 py-4">

                              {nearestExpiry ? (

                                <>
                                  <p className="text-[9px] font-medium text-slate-700">

                                    {formatDate(
                                      nearestExpiry,
                                    )}

                                  </p>

                                  {nearestExpiryStatus ? (

                                    <span
                                      className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[7px] font-medium ${expiryStatusClass(
                                        nearestExpiryStatus,
                                      )}`}
                                    >
                                      {
                                        nearestExpiryStatus
                                      }
                                    </span>

                                  ) : null}
                                </>

                              ) : (

                                <span className="text-[9px] text-slate-400">
                                  No valid batch
                                </span>

                              )}

                            </td>

                            {/* STATUS */}

                            <td className="px-4 py-4">

                              <span
                                className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[8px] font-medium ${stockStatusClass(
                                  status,
                                )}`}
                              >
                                {
                                  status
                                }
                              </span>

                            </td>

                            {/* ACTION */}

                            <td className="px-4 py-4 text-center">

                              <button
                                type="button"
                                onClick={() =>
                                  openAdjustmentModal(
                                    medicine,
                                  )
                                }
                                disabled={
                                  medicine.batches
                                    .length ===
                                  0
                                }
                                title={
                                  medicine.batches
                                    .length >
                                  0
                                    ? "View batches / Adjust stock"
                                    : "No batch available"
                                }
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-sky-600 hover:bg-sky-50 disabled:cursor-not-allowed disabled:text-slate-300"
                              >

                                <Pencil className="h-4 w-4" />

                              </button>

                            </td>

                          </tr>

                        );
                      },
                    )}

                    {filteredStockItems.length ===
                    0 ? (

                      <tr>

                        <td
                          colSpan={
                            8
                          }
                          className="px-5 py-16 text-center"
                        >

                          <Search className="mx-auto h-6 w-6 text-slate-300" />

                          <p className="mt-3 text-[12px] font-medium text-slate-700">
                            No stock records found
                          </p>

                          <p className="mt-1 text-[10px] text-slate-400">
                            Try another search or filter.
                          </p>

                        </td>

                      </tr>

                    ) : null}
                  </>

                )}

              </tbody>

            </table>

          </div>

          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">

            <p className="text-[9px] text-slate-500">

              Showing{" "}
              {
                filteredStockItems.length
              }{" "}
              of{" "}
              {
                stockItems.length
              }{" "}
              medicines

            </p>

          </div>

        </section>

      </div>

      {/* ===================================================
          STOCK DETAILS + ADJUSTMENT MODAL
      =================================================== */}

      {selectedMedicine ? (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]">

          <div className="max-h-[94vh] w-full max-w-[760px] overflow-y-auto rounded-2xl bg-white shadow-2xl">

            {/* HEADER */}

            <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">

              <div>

                <h2 className="text-base font-semibold text-slate-950">
                  Stock Details & Adjustment
                </h2>

                <p className="mt-1 text-[10px] text-slate-500">

                  {
                    selectedMedicine.medicineName
                  }{" "}

                  · Base Unit:{" "}

                  {
                    selectedMedicine.baseUnit
                  }

                </p>

              </div>

              <button
                type="button"
                onClick={
                  closeAdjustmentModal
                }
                disabled={
                  isAdjusting
                }
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 disabled:opacity-40"
              >

                <X className="h-5 w-5" />

              </button>

            </div>

            <div className="space-y-5 p-5">

              {/* SUMMARY */}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">

                <InfoBox
                  label="Available Stock"
                  value={`${getAvailableStock(
                    selectedMedicine,
                  ).toLocaleString(
                    "en-US",
                  )} ${
                    selectedMedicine.baseUnit
                  }`}
                />

                <InfoBox
                  label="Physical Stock"
                  value={`${getPhysicalStock(
                    selectedMedicine,
                  ).toLocaleString(
                    "en-US",
                  )} ${
                    selectedMedicine.baseUnit
                  }`}
                />

                <InfoBox
                  label="Reorder Level"
                  value={`${selectedMedicine.reorderLevelBase.toLocaleString(
                    "en-US",
                  )} ${
                    selectedMedicine.baseUnit
                  }`}
                />

              </div>

              {/* BATCH LIST */}

              <section>

                <h3 className="text-[12px] font-semibold text-slate-900">
                  Inventory Batches
                </h3>

                <p className="mt-1 text-[9px] text-slate-500">
                  Actual inventory is maintained separately for every batch.
                </p>

                <div className="mt-3 space-y-2">

                  {selectedMedicine.batches.map(
                    (batch) => {
                      const expiryStatus =
                        getExpiryStatus(
                          batch.expiryDate,
                        );

                      return (

                        <div
                          key={
                            batch.id
                          }
                          className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 p-3 sm:grid-cols-[1fr_160px_120px_100px] sm:items-center"
                        >

                          <div>

                            <p className="text-[10px] font-semibold text-slate-800">
                              {
                                batch.batchNo
                              }
                            </p>

                            <p className="mt-1 text-[8px] text-slate-400">
                              Batch ID #
                              {
                                batch.id
                              }
                            </p>

                          </div>

                          <div>

                            <p className="text-[11px] font-semibold text-slate-800">

                              {batch.stockBaseQuantity.toLocaleString(
                                "en-US",
                              )}{" "}

                              {
                                selectedMedicine.baseUnit
                              }

                            </p>

                            <p className="mt-1 text-[8px] text-slate-400">
                              Physical quantity
                            </p>

                          </div>

                          <div>

                            <p className="text-[9px] font-medium text-slate-700">

                              {formatDate(
                                batch.expiryDate,
                              )}

                            </p>

                            <p className="mt-1 text-[8px] text-slate-400">
                              Expiry
                            </p>

                          </div>

                          <span
                            className={`inline-flex w-fit rounded-full px-2.5 py-1 text-[8px] font-medium ${expiryStatusClass(
                              expiryStatus,
                            )}`}
                          >
                            {
                              expiryStatus
                            }
                          </span>

                        </div>

                      );
                    },
                  )}

                </div>

              </section>

              {/* ADJUSTMENT */}

              <form
                onSubmit={
                  handleStockAdjustment
                }
                className="border-t border-slate-200 pt-5"
              >

                <h3 className="text-[12px] font-semibold text-slate-900">
                  Manual Stock Adjustment
                </h3>

                <p className="mt-1 text-[9px] text-slate-500">
                  Every adjustment updates the selected batch and creates a stock movement audit record.
                </p>

                {/* BATCH */}

                <div className="mt-4">

                  <label className="mb-2 block text-[10px] font-medium text-slate-700">
                    Batch *
                  </label>

                  <select
                    value={
                      adjustmentForm.batchId
                    }
                    disabled={
                      isAdjusting
                    }
                    onChange={(
                      event,
                    ) =>
                      setAdjustmentForm({
                        ...adjustmentForm,

                        batchId:
                          event.target
                            .value,
                      })
                    }
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[10px] text-slate-700 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-100"
                  >

                    {selectedMedicine.batches.map(
                      (batch) => (

                        <option
                          key={
                            batch.id
                          }
                          value={
                            batch.id
                          }
                        >

                          {
                            batch.batchNo
                          }{" "}

                          —{" "}

                          {batch.stockBaseQuantity.toLocaleString(
                            "en-US",
                          )}{" "}

                          {
                            selectedMedicine.baseUnit
                          }

                        </option>

                      ),
                    )}

                  </select>

                </div>

                {/* CURRENT BATCH */}

                {selectedBatch ? (

                  <div className="mt-3 rounded-xl bg-slate-50 p-3">

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">

                      <SmallInfo
                        label="Current Quantity"
                        value={`${selectedBatch.stockBaseQuantity.toLocaleString(
                          "en-US",
                        )} ${
                          selectedMedicine.baseUnit
                        }`}
                      />

                      <SmallInfo
                        label="Expiry"
                        value={formatDate(
                          selectedBatch.expiryDate,
                        )}
                      />

                      <SmallInfo
                        label="Status"
                        value={
                          selectedBatch.status
                        }
                      />

                    </div>

                  </div>

                ) : null}

                {/* TYPE */}

                <div className="mt-4">

                  <label className="mb-2 block text-[10px] font-medium text-slate-700">
                    Adjustment Type
                  </label>

                  <div className="grid grid-cols-2 gap-3">

                    <button
                      type="button"
                      disabled={
                        isAdjusting
                      }
                      onClick={() =>
                        setAdjustmentForm({
                          ...adjustmentForm,

                          type:
                            "increase",
                        })
                      }
                      className={`flex h-10 items-center justify-center gap-2 rounded-xl border text-[10px] font-semibold ${
                        adjustmentForm.type ===
                        "increase"
                          ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 text-slate-500"
                      }`}
                    >

                      <ArrowUp className="h-4 w-4" />

                      Increase

                    </button>

                    <button
                      type="button"
                      disabled={
                        isAdjusting
                      }
                      onClick={() =>
                        setAdjustmentForm({
                          ...adjustmentForm,

                          type:
                            "decrease",
                        })
                      }
                      className={`flex h-10 items-center justify-center gap-2 rounded-xl border text-[10px] font-semibold ${
                        adjustmentForm.type ===
                        "decrease"
                          ? "border-rose-300 bg-rose-50 text-rose-700"
                          : "border-slate-200 text-slate-500"
                      }`}
                    >

                      <ArrowDown className="h-4 w-4" />

                      Decrease

                    </button>

                  </div>

                </div>

                {/* QUANTITY */}

                <div className="mt-4">

                  <label className="mb-2 block text-[10px] font-medium text-slate-700">

                    Quantity (
                    {
                      selectedMedicine.baseUnit
                    }
                    ) *

                  </label>

                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={
                      adjustmentForm.quantity
                    }
                    disabled={
                      isAdjusting
                    }
                    onChange={(
                      event,
                    ) =>
                      setAdjustmentForm({
                        ...adjustmentForm,

                        quantity:
                          event.target
                            .value,
                      })
                    }
                    placeholder={`Enter ${selectedMedicine.baseUnit} quantity`}
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[10px] outline-none placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-100"
                  />

                </div>

                {/* REASON */}

                <div className="mt-4">

                  <label className="mb-2 block text-[10px] font-medium text-slate-700">
                    Reason *
                  </label>

                  <textarea
                    value={
                      adjustmentForm.reason
                    }
                    disabled={
                      isAdjusting
                    }
                    onChange={(
                      event,
                    ) =>
                      setAdjustmentForm({
                        ...adjustmentForm,

                        reason:
                          event.target
                            .value,
                      })
                    }
                    rows={3}
                    placeholder="Example: Physical count correction"
                    className="w-full resize-none rounded-xl border border-slate-200 px-3 py-3 text-[10px] outline-none placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-100"
                  />

                </div>

                {/* SAVE */}

                <div className="mt-5 flex justify-end">

                  <button
                    type="submit"
                    disabled={
                      isAdjusting
                    }
                    className="inline-flex h-10 min-w-[150px] items-center justify-center gap-2 rounded-xl bg-sky-600 px-5 text-[10px] font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-sky-400"
                  >

                    {isAdjusting ? (

                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </>

                    ) : (

                      "Save Adjustment"

                    )}

                  </button>

                </div>

              </form>

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
  className = "",
}: {
  children:
    ReactNode;

  className?: string;
}) {
  return (
    <th
      className={`px-4 py-4 text-left text-[10px] font-medium text-slate-500 ${className}`}
    >
      {children}
    </th>
  );
}

function SummaryCard({
  label,
  value,
  description,
  icon,
  iconClass,
}: {
  label: string;

  value: number;

  description: string;

  icon: ReactNode;

  iconClass: string;
}) {
  return (
    <article className="flex min-h-[100px] items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

      <div>

        <p className="text-[10px] text-slate-500">
          {label}
        </p>

        <p className="mt-1 text-[24px] font-semibold text-slate-950">
          {value}
        </p>

        <p className="mt-1 text-[9px] text-slate-400">
          {description}
        </p>

      </div>

      <div
        className={`flex h-11 w-11 items-center justify-center rounded-2xl ${iconClass}`}
      >
        {icon}
      </div>

    </article>
  );
}

function InfoBox({
  label,
  value,
}: {
  label: string;

  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">

      <p className="text-[8px] text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-[11px] font-semibold text-slate-800">
        {value}
      </p>

    </div>
  );
}

function SmallInfo({
  label,
  value,
}: {
  label: string;

  value: string;
}) {
  return (
    <div>

      <p className="text-[8px] text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-[10px] font-semibold text-slate-700">
        {value}
      </p>

    </div>
  );
}