"use client";

import {
  FormEvent,
  ReactNode,
  useMemo,
  useState,
} from "react";

import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Boxes,
  Package,
  Pencil,
  Search,
  X,
} from "lucide-react";

/* =========================================================
   TYPES
========================================================= */

type StockBatch = {
  id: string;
  batchNo: string;
  expiryDate: string;

  /*
   * IMPORTANT:
   *
   * Every batch quantity is stored
   * in the medicine's BASE UNIT.
   *
   * Examples:
   * Tablet
   * Capsule
   * Bottle
   */
  stockBaseQuantity: number;
};

type StockMedicine = {
  id: string;

  medicineName: string;
  genericName: string;
  category: string;

  baseUnit: string;

  /*
   * Reorder level is also always
   * stored in BASE UNIT.
   */
  reorderLevelBase: number;

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

/* =========================================================
   DEMO STOCK DATA
========================================================= */

/*
 * This structure matches the database direction:
 *
 * Medicine
 *    ↓
 * Medicine Units
 *    ↓
 * Medicine Batches
 *
 * Stock is NOT stored as:
 *
 * 20 Box
 * 15 Strip
 *
 * Internally everything is base quantity.
 */

const initialStockItems: StockMedicine[] = [
  {
    id: "MED-001",

    medicineName: "Napa 500mg",
    genericName: "Paracetamol",
    category: "Pain Relief",

    baseUnit: "Tablet",

    reorderLevelBase: 500,

    batches: [
      {
        id: "BAT-NAPA-OLD",

        batchNo: "NPA-2501",

        expiryDate:
          "2026-06-30",

        stockBaseQuantity:
          100,
      },

      {
        id: "BAT-NAPA-A",

        batchNo: "NPA-2608-A",

        expiryDate:
          "2026-12-31",

        stockBaseQuantity:
          1500,
      },

      {
        id: "BAT-NAPA-B",

        batchNo: "NPA-2608-B",

        expiryDate:
          "2027-12-31",

        stockBaseQuantity:
          3000,
      },
    ],
  },

  {
    id: "MED-002",

    medicineName: "Ace Plus",
    genericName:
      "Paracetamol + Caffeine",
    category: "Pain Relief",

    baseUnit: "Tablet",

    reorderLevelBase: 400,

    batches: [
      {
        id: "BAT-ACE-A",

        batchNo: "ACE-2608-A",

        expiryDate:
          "2027-04-15",

        stockBaseQuantity:
          1800,
      },
    ],
  },

  {
    id: "MED-003",

    medicineName:
      "Napa Extend",

    genericName:
      "Paracetamol",

    category:
      "Pain Relief",

    baseUnit:
      "Tablet",

    reorderLevelBase:
      400,

    batches: [
      {
        id: "BAT-NEXT-A",

        batchNo:
          "NEXT-2608-A",

        expiryDate:
          "2027-05-20",

        stockBaseQuantity:
          1600,
      },
    ],
  },

  {
    id: "MED-004",

    medicineName:
      "Seclo 20mg",

    genericName:
      "Omeprazole",

    category:
      "Gastric / Antacid",

    baseUnit:
      "Capsule",

    reorderLevelBase:
      800,

    batches: [
      {
        id: "BAT-SEC-A",

        batchNo:
          "SCL-2608-A",

        expiryDate:
          "2026-10-30",

        stockBaseQuantity:
          1500,
      },

      {
        id: "BAT-SEC-B",

        batchNo:
          "SCL-2609-B",

        expiryDate:
          "2027-04-30",

        stockBaseQuantity:
          2000,
      },
    ],
  },

  {
    id: "MED-005",

    medicineName:
      "Maxpro 20mg",

    genericName:
      "Esomeprazole",

    category:
      "Gastric / Antacid",

    baseUnit:
      "Capsule",

    reorderLevelBase:
      6000,

    batches: [
      {
        id: "BAT-MAX-A",

        batchNo:
          "MXP-2608-C",

        expiryDate:
          "2028-01-31",

        stockBaseQuantity:
          22000,
      },
    ],
  },

  {
    id: "MED-006",

    medicineName:
      "Sergel 20mg",

    genericName:
      "Esomeprazole",

    category:
      "Gastric / Antacid",

    baseUnit:
      "Capsule",

    reorderLevelBase:
      5000,

    batches: [
      {
        id: "BAT-SER-A",

        batchNo:
          "SG-2606",

        expiryDate:
          "2026-09-25",

        stockBaseQuantity:
          1200,
      },
    ],
  },

  {
    id: "MED-007",

    medicineName:
      "Monas 10mg",

    genericName:
      "Montelukast",

    category:
      "Allergy",

    baseUnit:
      "Tablet",

    reorderLevelBase:
      500,

    batches: [
      {
        id: "BAT-MON-A",

        batchNo:
          "MN-2608",

        expiryDate:
          "2027-06-15",

        stockBaseQuantity:
          2000,
      },
    ],
  },

  {
    id: "MED-008",

    medicineName:
      "Fexo 120mg",

    genericName:
      "Fexofenadine",

    category:
      "Allergy",

    baseUnit:
      "Tablet",

    reorderLevelBase:
      500,

    batches: [
      {
        id: "BAT-FEX-A",

        batchNo:
          "FX-2610",

        expiryDate:
          "2027-08-12",

        stockBaseQuantity:
          3200,
      },
    ],
  },

  {
    id: "MED-009",

    medicineName:
      "Histacin",

    genericName:
      "Chlorpheniramine",

    category:
      "Allergy",

    baseUnit:
      "Tablet",

    reorderLevelBase:
      600,

    batches: [
      {
        id: "BAT-HIS-A",

        batchNo:
          "HS-2609",

        expiryDate:
          "2027-01-20",

        stockBaseQuantity:
          80,
      },
    ],
  },

  {
    id: "MED-010",

    medicineName:
      "Amdocal 5mg",

    genericName:
      "Amlodipine",

    category:
      "Blood Pressure",

    baseUnit:
      "Tablet",

    reorderLevelBase:
      400,

    batches: [
      {
        id: "BAT-AMD-A",

        batchNo:
          "AM-2613",

        expiryDate:
          "2027-10-10",

        stockBaseQuantity:
          1400,
      },
    ],
  },

  {
    id: "MED-011",

    medicineName:
      "Zimax 500mg",

    genericName:
      "Azithromycin",

    category:
      "Antibiotic",

    baseUnit:
      "Tablet",

    reorderLevelBase:
      300,

    batches: [
      {
        id: "BAT-ZIM-A",

        batchNo:
          "ZM-2611",

        expiryDate:
          "2027-07-30",

        stockBaseQuantity:
          750,
      },
    ],
  },

  {
    id: "MED-012",

    medicineName:
      "DP 10mg",

    genericName:
      "Domperidone",

    category:
      "Gastric / Antacid",

    baseUnit:
      "Tablet",

    reorderLevelBase:
      300,

    batches: [
      {
        id: "BAT-DP-A",

        batchNo:
          "DP-2612",

        expiryDate:
          "2027-05-15",

        stockBaseQuantity:
          0,
      },
    ],
  },

  {
    id: "MED-013",

    medicineName:
      "Napa Syrup 100ml",

    genericName:
      "Paracetamol",

    category:
      "Pain Relief",

    baseUnit:
      "Bottle",

    reorderLevelBase:
      20,

    batches: [
      {
        id: "BAT-SYR-A",

        batchNo:
          "NPS-2608",

        expiryDate:
          "2027-09-30",

        stockBaseQuantity:
          55,
      },
    ],
  },
];

/* =========================================================
   DATE HELPERS
========================================================= */

function getTodayDateOnly() {
  const today =
    new Date();

  const year =
    today.getFullYear();

  const month =
    String(
      today.getMonth() + 1,
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
   STOCK CALCULATION HELPERS
========================================================= */

function isBatchExpired(
  batch: StockBatch,
) {
  return (
    batch.expiryDate <
    getTodayDateOnly()
  );
}

/*
 * Physical stock:
 *
 * Includes valid + expired stock.
 *
 * This means how much product physically
 * exists inside the pharmacy.
 */
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
 * Available stock:
 *
 * Only NON-EXPIRED stock.
 *
 * This is the quantity Sales/Billing
 * is allowed to sell.
 */
function getAvailableStock(
  medicine: StockMedicine,
) {
  return medicine.batches
    .filter(
      (batch) =>
        !isBatchExpired(
          batch,
        ),
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
        ),
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
 * LOW STOCK IS MEDICINE-LEVEL.
 *
 * Example:
 *
 * Batch A = 100
 * Batch B = 5000
 *
 * Total valid = 5100
 *
 * Reorder = 500
 *
 * Result = In Stock
 *
 * NOT Low Stock just because Batch A = 100.
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

/*
 * Finds nearest expiry among
 * NON-EXPIRED batches that still
 * contain stock.
 */
function getNearestValidExpiry(
  medicine: StockMedicine,
) {
  const validBatches =
    medicine.batches
      .filter(
        (batch) =>
          !isBatchExpired(
            batch,
          ) &&
          batch.stockBaseQuantity >
            0,
      )
      .sort(
        (a, b) =>
          a.expiryDate.localeCompare(
            b.expiryDate,
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
    new Date(
      today,
    );

  nearExpiry.setDate(
    nearExpiry.getDate() +
      90,
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
    >(
      initialStockItems,
    );

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

      type: "increase",

      quantity: "",

      reason: "",
    });

  /* =======================================================
     SUMMARY STATISTICS
  ======================================================= */

  const statistics =
    useMemo(() => {
      const total =
        stockItems.length;

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
        total,
        healthy,
        low,
        out,
      };
    }, [
      stockItems,
    ]);

  /* =======================================================
     SEARCH + FILTER + SORT
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

            const currentStatus =
              getStockStatus(
                medicine,
              );

            const matchesStatus =
              statusFilter ===
                "All" ||
              currentStatus ===
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

      /*
       * Sorting is based on
       * VALID AVAILABLE BASE STOCK.
       */
      if (
        sortOption ===
        "quantity-low-high"
      ) {
        result.sort(
          (a, b) =>
            getAvailableStock(
              a,
            ) -
            getAvailableStock(
              b,
            ),
        );
      }

      if (
        sortOption ===
        "quantity-high-low"
      ) {
        result.sort(
          (a, b) =>
            getAvailableStock(
              b,
            ) -
            getAvailableStock(
              a,
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
     OPEN ADJUSTMENT
  ======================================================= */

  function openAdjustmentModal(
    medicine: StockMedicine,
  ) {
    /*
     * Default batch:
     *
     * nearest valid batch with stock
     *
     * otherwise first batch.
     */
    const validBatch =
      [...medicine.batches]
        .filter(
          (batch) =>
            !isBatchExpired(
              batch,
            ) &&
            batch.stockBaseQuantity >
              0,
        )
        .sort(
          (a, b) =>
            a.expiryDate.localeCompare(
              b.expiryDate,
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

  /* =======================================================
     SELECTED BATCH
  ======================================================= */

  const selectedBatch =
    selectedMedicine?.batches.find(
      (batch) =>
        batch.id ===
        adjustmentForm.batchId,
    ) ?? null;

  /* =======================================================
     SAVE STOCK ADJUSTMENT
  ======================================================= */

  function handleStockAdjustment(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      !selectedMedicine
    ) {
      return;
    }

    if (
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

    /*
     * Never allow negative stock.
     */
    if (
      adjustmentForm.type ===
        "decrease" &&
      quantity >
        selectedBatch.stockBaseQuantity
    ) {
      window.alert(
        `Cannot decrease ${quantity.toLocaleString(
          "en-US",
        )} ${selectedMedicine.baseUnit}.\n\nBatch ${selectedBatch.batchNo} currently contains only ${selectedBatch.stockBaseQuantity.toLocaleString(
          "en-US",
        )} ${selectedMedicine.baseUnit}.`,
      );

      return;
    }

    setStockItems(
      (currentItems) =>
        currentItems.map(
          (medicine) => {
            if (
              medicine.id !==
              selectedMedicine.id
            ) {
              return medicine;
            }

            return {
              ...medicine,

              batches:
                medicine.batches.map(
                  (batch) => {
                    if (
                      batch.id !==
                      selectedBatch.id
                    ) {
                      return batch;
                    }

                    const updatedQuantity =
                      adjustmentForm.type ===
                      "increase"
                        ? batch.stockBaseQuantity +
                          quantity
                        : batch.stockBaseQuantity -
                          quantity;

                    return {
                      ...batch,

                      stockBaseQuantity:
                        updatedQuantity,
                    };
                  },
                ),
            };
          },
        ),
    );

    /*
     * Later DB integration:
     *
     * this same action will create:
     *
     * stock_movements
     *
     * type:
     * ADJUSTMENT_IN
     * or
     * ADJUSTMENT_OUT
     *
     * medicine_id
     * batch_id
     * quantity_change
     * reason
     * user_id
     * created_at
     */

    closeAdjustmentModal();
  }

  /* =======================================================
     BADGE STYLE
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

        {/* =================================================
            SUMMARY
        ================================================= */}

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">

          <SummaryCard
            label="Total Stock Items"
            value={
              statistics.total
            }
            description="Medicines with stock records"
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

        {/* =================================================
            SEARCH + FILTER + SORT
        ================================================= */}

        <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row">

          {/* SEARCH */}

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
                  event.target.value,
                )
              }
              placeholder="Search medicine, generic, category or batch..."
              className="h-10 w-full rounded-xl border border-slate-200 pl-10 pr-4 text-[11px] text-slate-700 outline-none placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            />

          </div>

          {/* STATUS */}

          <select
            value={
              statusFilter
            }
            onChange={(
              event,
            ) =>
              setStatusFilter(
                event.target.value,
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

          {/* QUANTITY SORT */}

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

        {/* =================================================
            STOCK TABLE
        ================================================= */}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="overflow-x-auto">

            <table className="w-full min-w-[1100px]">

              <thead>

                <tr className="border-b border-slate-200 bg-slate-50/80">

                  <th className="w-[270px] px-4 py-4 text-left text-[10px] font-medium text-slate-500">
                    Medicine
                  </th>

                  <th className="w-[140px] px-4 py-4 text-left text-[10px] font-medium text-slate-500">
                    Available Stock
                  </th>

                  <th className="w-[140px] px-4 py-4 text-left text-[10px] font-medium text-slate-500">
                    Physical Stock
                  </th>

                  <th className="w-[130px] px-4 py-4 text-left text-[10px] font-medium text-slate-500">
                    Reorder Level
                  </th>

                  <th className="w-[90px] px-4 py-4 text-left text-[10px] font-medium text-slate-500">
                    Batches
                  </th>

                  <th className="w-[145px] px-4 py-4 text-left text-[10px] font-medium text-slate-500">
                    Nearest Expiry
                  </th>

                  <th className="w-[120px] px-4 py-4 text-left text-[10px] font-medium text-slate-500">
                    Stock Status
                  </th>

                  <th className="w-[90px] px-4 py-4 text-center text-[10px] font-medium text-slate-500">
                    Action
                  </th>

                </tr>

              </thead>

              <tbody>

                {filteredStockItems.map(
                  (medicine) => {
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
                              {expired.toLocaleString(
                                "en-US",
                              )}{" "}
                              expired
                            </p>

                          ) : (

                            <p className="mt-1 text-[7px] text-slate-400">
                              No expired stock
                            </p>

                          )}

                        </td>

                        {/* REORDER */}

                        <td className="px-4 py-4">

                          <p className="text-[11px] font-medium text-slate-700">
                            {medicine.reorderLevelBase.toLocaleString(
                              "en-US",
                            )}
                          </p>

                          <p className="mt-0.5 text-[8px] text-slate-400">
                            {
                              medicine.baseUnit
                            }
                          </p>

                        </td>

                        {/* BATCHES */}

                        <td className="px-4 py-4">

                          <p className="text-[12px] font-semibold text-slate-800">
                            {
                              medicine.batches.length
                            }
                          </p>

                          <p className="mt-0.5 text-[8px] text-slate-400">
                            batch
                            {medicine.batches.length !==
                            1
                              ? "es"
                              : ""}
                          </p>

                        </td>

                        {/* NEAREST EXPIRY */}

                        <td className="px-4 py-4">

                          {nearestExpiry ? (

                            <>
                              <p className="text-[10px] font-medium text-slate-700">
                                {formatDate(
                                  nearestExpiry,
                                )}
                              </p>

                              <span
                                className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[7px] font-medium ${expiryStatusClass(
                                  nearestExpiryStatus ??
                                    "Valid",
                                )}`}
                              >
                                {
                                  nearestExpiryStatus
                                }
                              </span>
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
                            title="View batches / Adjust stock"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-sky-600 hover:bg-sky-50"
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
                      colSpan={8}
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
          BATCH + STOCK ADJUSTMENT MODAL
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
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>

            </div>

            <div className="space-y-5 p-5">

              {/* STOCK SUMMARY */}

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

              {/* =============================================
                  BATCH INVENTORY
              ============================================= */}

              <section>

                <h3 className="text-[12px] font-semibold text-slate-900">
                  Batch Inventory
                </h3>

                <p className="mt-1 text-[9px] text-slate-500">
                  Stock is maintained separately for every batch.
                </p>

                <div className="mt-3 space-y-2">

                  {selectedMedicine.batches.map(
                    (batch) => {
                      const expired =
                        isBatchExpired(
                          batch,
                        );

                      const expiryStatus =
                        getExpiryStatus(
                          batch.expiryDate,
                        );

                      return (

                        <div
                          key={
                            batch.id
                          }
                          className={`grid grid-cols-1 gap-3 rounded-xl border p-3 sm:grid-cols-[1.2fr_1fr_1fr_auto] sm:items-center ${
                            expired
                              ? "border-rose-100 bg-rose-50/40"
                              : "border-slate-200"
                          }`}
                        >

                          <div>

                            <p className="font-mono text-[10px] font-semibold text-slate-800">
                              {
                                batch.batchNo
                              }
                            </p>

                            <p className="mt-1 text-[8px] text-slate-400">
                              Batch
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

              {/* =============================================
                  ADJUSTMENT
              ============================================= */}

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
                  Adjust a specific batch only. Later every adjustment will create a stock movement audit record.
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
                    onChange={(
                      event,
                    ) =>
                      setAdjustmentForm({
                        ...adjustmentForm,

                        batchId:
                          event.target.value,
                      })
                    }
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[10px] text-slate-700 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
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
                          {isBatchExpired(
                            batch,
                          )
                            ? " — EXPIRED"
                            : ""}
                        </option>

                      ),
                    )}

                  </select>

                </div>

                {/* SELECTED BATCH INFO */}

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
                        value={getExpiryStatus(
                          selectedBatch.expiryDate,
                        )}
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
                    onChange={(
                      event,
                    ) =>
                      setAdjustmentForm({
                        ...adjustmentForm,

                        quantity:
                          event.target.value,
                      })
                    }
                    placeholder={`Enter ${selectedMedicine.baseUnit} quantity`}
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[10px] outline-none placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  />

                </div>

                {/* REASON */}

                <div className="mt-4">

                  <label className="mb-2 block text-[10px] font-medium text-slate-700">
                    Reason *
                  </label>

                  <textarea
                    rows={3}
                    value={
                      adjustmentForm.reason
                    }
                    onChange={(
                      event,
                    ) =>
                      setAdjustmentForm({
                        ...adjustmentForm,

                        reason:
                          event.target.value,
                      })
                    }
                    placeholder="Example: damaged medicine, stock recount, return correction..."
                    className="w-full resize-none rounded-xl border border-slate-200 px-3 py-3 text-[10px] outline-none placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  />

                </div>

                {/* BUTTONS */}

                <div className="mt-5 flex justify-end gap-2">

                  <button
                    type="button"
                    onClick={
                      closeAdjustmentModal
                    }
                    className="h-10 rounded-xl border border-slate-200 px-4 text-[10px] font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="h-10 rounded-xl bg-sky-600 px-5 text-[10px] font-semibold text-white hover:bg-sky-700"
                  >
                    Save Adjustment
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
   SMALL COMPONENTS
========================================================= */

function SummaryCard({
  label,
  value,
  description,
  icon,
  iconClass,
}: {
  label: string;

  value:
    | string
    | number;

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

        <h3 className="mt-1 text-[24px] font-semibold text-slate-950">
          {value}
        </h3>

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

      <p className="mt-1 text-[9px] font-semibold text-slate-700">
        {value}
      </p>

    </div>
  );
}