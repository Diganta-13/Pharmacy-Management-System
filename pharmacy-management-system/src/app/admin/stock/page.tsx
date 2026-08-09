"use client";

import { FormEvent, useMemo, useState } from "react";
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

type StockItem = {
  id: string;
  medicineName: string;
  genericName: string;
  category: string;
  batchNo: string;
  unit: string;
  stockQuantity: number;
  reorderLevel: number;
  expiryDate: string;
};

type AdjustmentType = "increase" | "decrease";

type AdjustmentForm = {
  type: AdjustmentType;
  quantity: string;
  reason: string;
};

const initialStockItems: StockItem[] = [
  {
    id: "MED-001",
    medicineName: "Napa 500mg",
    genericName: "Paracetamol",
    category: "Pain Relief",
    batchNo: "NP-2601",
    unit: "Strip",
    stockQuantity: 450,
    reorderLevel: 50,
    expiryDate: "2027-01-30",
  },
  {
    id: "MED-002",
    medicineName: "Ace Plus",
    genericName: "Paracetamol + Caffeine",
    category: "Pain Relief",
    batchNo: "AC-2602",
    unit: "Strip",
    stockQuantity: 180,
    reorderLevel: 40,
    expiryDate: "2027-04-15",
  },
  {
    id: "MED-003",
    medicineName: "Napa Extend",
    genericName: "Paracetamol",
    category: "Pain Relief",
    batchNo: "NE-2603",
    unit: "Strip",
    stockQuantity: 160,
    reorderLevel: 40,
    expiryDate: "2027-05-20",
  },
  {
    id: "MED-004",
    medicineName: "Seclo 20mg",
    genericName: "Omeprazole",
    category: "Gastric / Antacid",
    batchNo: "SC-2604",
    unit: "Box",
    stockQuantity: 35,
    reorderLevel: 80,
    expiryDate: "2026-10-30",
  },
  {
    id: "MED-005",
    medicineName: "Maxpro 20mg",
    genericName: "Esomeprazole",
    category: "Gastric / Antacid",
    batchNo: "MX-2605",
    unit: "Box",
    stockQuantity: 220,
    reorderLevel: 60,
    expiryDate: "2027-02-28",
  },
  {
    id: "MED-006",
    medicineName: "Sergel 20mg",
    genericName: "Esomeprazole",
    category: "Gastric / Antacid",
    batchNo: "SG-2606",
    unit: "Box",
    stockQuantity: 12,
    reorderLevel: 50,
    expiryDate: "2026-09-25",
  },
  {
    id: "MED-007",
    medicineName: "Losectil 20mg",
    genericName: "Omeprazole",
    category: "Gastric / Antacid",
    batchNo: "LS-2607",
    unit: "Box",
    stockQuantity: 95,
    reorderLevel: 40,
    expiryDate: "2027-03-10",
  },
  {
    id: "MED-008",
    medicineName: "Monas 10mg",
    genericName: "Montelukast",
    category: "Allergy",
    batchNo: "MN-2608",
    unit: "Strip",
    stockQuantity: 200,
    reorderLevel: 50,
    expiryDate: "2027-06-15",
  },
  {
    id: "MED-009",
    medicineName: "Histacin",
    genericName: "Chlorpheniramine",
    category: "Allergy",
    batchNo: "HS-2609",
    unit: "Strip",
    stockQuantity: 8,
    reorderLevel: 60,
    expiryDate: "2027-01-20",
  },
  {
    id: "MED-010",
    medicineName: "Fexo 120mg",
    genericName: "Fexofenadine",
    category: "Allergy",
    batchNo: "FX-2610",
    unit: "Strip",
    stockQuantity: 320,
    reorderLevel: 50,
    expiryDate: "2027-08-12",
  },
  {
    id: "MED-011",
    medicineName: "Zimax 500mg",
    genericName: "Azithromycin",
    category: "Antibiotic",
    batchNo: "ZM-2611",
    unit: "Strip",
    stockQuantity: 75,
    reorderLevel: 30,
    expiryDate: "2027-07-30",
  },
  {
    id: "MED-012",
    medicineName: "DP 10mg",
    genericName: "Domperidone",
    category: "Gastric / Antacid",
    batchNo: "DP-2612",
    unit: "Strip",
    stockQuantity: 0,
    reorderLevel: 30,
    expiryDate: "2027-05-15",
  },
  {
    id: "MED-013",
    medicineName: "Amdocal 5mg",
    genericName: "Amlodipine",
    category: "Blood Pressure",
    batchNo: "AM-2613",
    unit: "Strip",
    stockQuantity: 140,
    reorderLevel: 40,
    expiryDate: "2027-10-10",
  },
  {
    id: "MED-014",
    medicineName: "Comet 500mg",
    genericName: "Metformin",
    category: "Diabetes",
    batchNo: "CM-2614",
    unit: "Strip",
    stockQuantity: 130,
    reorderLevel: 40,
    expiryDate: "2027-09-20",
  },
  {
    id: "MED-015",
    medicineName: "Ceevit 250mg",
    genericName: "Vitamin C",
    category: "Vitamin & Supplement",
    batchNo: "CV-2615",
    unit: "Strip",
    stockQuantity: 210,
    reorderLevel: 50,
    expiryDate: "2027-11-30",
  },
];

const emptyAdjustment: AdjustmentForm = {
  type: "increase",
  quantity: "",
  reason: "",
};

export default function StockPage() {
  const [stockItems, setStockItems] =
    useState<StockItem[]>(initialStockItems);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [selectedItem, setSelectedItem] =
    useState<StockItem | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);

  const [adjustmentForm, setAdjustmentForm] =
    useState<AdjustmentForm>(emptyAdjustment);

  function getStockStatus(item: StockItem) {
    if (item.stockQuantity === 0) {
      return "Out of Stock";
    }

    if (item.stockQuantity <= item.reorderLevel) {
      return "Low Stock";
    }

    return "In Stock";
  }

  function getExpiryStatus(expiryDate: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiry = new Date(`${expiryDate}T00:00:00`);

    if (expiry < today) {
      return "Expired";
    }

    const ninetyDaysLater = new Date(today);
    ninetyDaysLater.setDate(today.getDate() + 90);

    if (expiry <= ninetyDaysLater) {
      return "Near Expiry";
    }

    return "Valid";
  }

  const statistics = useMemo(() => {
    const totalStock = stockItems.reduce(
      (total, item) => total + item.stockQuantity,
      0,
    );

    const lowStock = stockItems.filter(
      (item) =>
        item.stockQuantity > 0 &&
        item.stockQuantity <= item.reorderLevel,
    ).length;

    const outOfStock = stockItems.filter(
      (item) => item.stockQuantity === 0,
    ).length;

    const healthyStock = stockItems.filter(
      (item) => item.stockQuantity > item.reorderLevel,
    ).length;

    return {
      totalStock,
      lowStock,
      outOfStock,
      healthyStock,
    };
  }, [stockItems]);

  const filteredStockItems = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return stockItems.filter((item) => {
      const matchesSearch =
        item.medicineName.toLowerCase().includes(search) ||
        item.genericName.toLowerCase().includes(search) ||
        item.batchNo.toLowerCase().includes(search) ||
        item.category.toLowerCase().includes(search);

      const currentStatus = getStockStatus(item);

      const matchesStatus =
        statusFilter === "All" ||
        currentStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [stockItems, searchTerm, statusFilter]);

  function openAdjustmentModal(item: StockItem) {
    setSelectedItem(item);
    setAdjustmentForm(emptyAdjustment);
    setIsModalOpen(true);
  }

  function closeModal() {
    setSelectedItem(null);
    setAdjustmentForm(emptyAdjustment);
    setIsModalOpen(false);
  }

  function handleAdjustment(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!selectedItem) {
      return;
    }

    const quantity = Number(adjustmentForm.quantity);

    if (
      !adjustmentForm.quantity ||
      Number.isNaN(quantity) ||
      quantity <= 0
    ) {
      window.alert("Please enter a valid quantity.");
      return;
    }

    if (!adjustmentForm.reason.trim()) {
      window.alert(
        "Please provide a reason for the stock adjustment.",
      );
      return;
    }

    if (
      adjustmentForm.type === "decrease" &&
      quantity > selectedItem.stockQuantity
    ) {
      window.alert(
        "You cannot decrease more than the available stock.",
      );
      return;
    }

    setStockItems((currentItems) =>
      currentItems.map((item) => {
        if (item.id !== selectedItem.id) {
          return item;
        }

        const newQuantity =
          adjustmentForm.type === "increase"
            ? item.stockQuantity + quantity
            : item.stockQuantity - quantity;

        return {
          ...item,
          stockQuantity: newQuantity,
        };
      }),
    );

    closeModal();
  }

  function getStockBadgeClass(status: string) {
    if (status === "In Stock") {
      return "bg-emerald-100 text-emerald-700";
    }

    if (status === "Low Stock") {
      return "bg-amber-100 text-amber-700";
    }

    return "bg-rose-100 text-rose-600";
  }

  function getExpiryBadgeClass(status: string) {
    if (status === "Valid") {
      return "bg-sky-50 text-sky-700";
    }

    if (status === "Near Expiry") {
      return "bg-orange-100 text-orange-700";
    }

    return "bg-red-100 text-red-700";
  }

  return (
    <>
      <div className="mx-auto w-full max-w-[1600px] space-y-4">
        {/* Summary Cards */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="flex min-h-[100px] items-center justify-between rounded-2xl border border-sky-200 bg-white p-4 shadow-sm">
            <div>
              <p className="text-[11px] text-slate-500">
                Total Stock Items
              </p>

              <h3 className="mt-1 text-[24px] font-semibold text-slate-950">
                {statistics.totalStock.toLocaleString("en-US")}
              </h3>

              <p className="mt-1 text-[10px] text-slate-500">
                Across all medicines
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
              <Boxes className="h-5 w-5" />
            </div>
          </article>

          <article className="flex min-h-[100px] items-center justify-between rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
            <div>
              <p className="text-[11px] text-slate-500">
                Healthy Stock
              </p>

              <h3 className="mt-1 text-[24px] font-semibold text-emerald-700">
                {statistics.healthyStock}
              </h3>

              <p className="mt-1 text-[10px] text-slate-500">
                Above reorder level
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <Package className="h-5 w-5" />
            </div>
          </article>

          <article className="flex min-h-[100px] items-center justify-between rounded-2xl border border-amber-200 bg-white p-4 shadow-sm">
            <div>
              <p className="text-[11px] text-slate-500">
                Low Stock
              </p>

              <h3 className="mt-1 text-[24px] font-semibold text-amber-700">
                {statistics.lowStock}
              </h3>

              <p className="mt-1 text-[10px] text-slate-500">
                Reorder required
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-500">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </article>

          <article className="flex min-h-[100px] items-center justify-between rounded-2xl border border-rose-200 bg-white p-4 shadow-sm">
            <div>
              <p className="text-[11px] text-slate-500">
                Out of Stock
              </p>

              <h3 className="mt-1 text-[24px] font-semibold text-rose-600">
                {statistics.outOfStock}
              </h3>

              <p className="mt-1 text-[10px] text-slate-500">
                Immediate attention
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
              <Package className="h-5 w-5" />
            </div>
          </article>
        </section>

        {/* Search and Filter */}
        <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-[720px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              type="text"
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(event.target.value)
              }
              placeholder="Search by medicine, generic, category or batch..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-[13px] text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value)
            }
            className="h-10 min-w-[180px] rounded-xl border border-slate-200 bg-white px-3 text-[13px] text-slate-600 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
          >
            <option value="All">All Stock Status</option>
            <option value="In Stock">In Stock</option>
            <option value="Low Stock">Low Stock</option>
            <option value="Out of Stock">
              Out of Stock
            </option>
          </select>
        </section>

        {/* Stock Table */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1250px] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  <th className="w-[60px] px-4 py-4 text-[11px] font-medium text-slate-500">
                    SL
                  </th>

                  <th className="w-[190px] px-4 py-4 text-[11px] font-medium text-slate-500">
                    Medicine
                  </th>

                  <th className="w-[170px] px-4 py-4 text-[11px] font-medium text-slate-500">
                    Generic
                  </th>

                  <th className="w-[150px] px-4 py-4 text-[11px] font-medium text-slate-500">
                    Category
                  </th>

                  <th className="w-[110px] px-4 py-4 text-[11px] font-medium text-slate-500">
                    Batch
                  </th>

                  <th className="w-[90px] px-4 py-4 text-[11px] font-medium text-slate-500">
                    Unit
                  </th>

                  <th className="w-[100px] px-4 py-4 text-[11px] font-medium text-slate-500">
                    Current Stock
                  </th>

                  <th className="w-[100px] px-4 py-4 text-[11px] font-medium text-slate-500">
                    Reorder Level
                  </th>

                  <th className="w-[120px] px-4 py-4 text-[11px] font-medium text-slate-500">
                    Stock Status
                  </th>

                  <th className="w-[120px] px-4 py-4 text-[11px] font-medium text-slate-500">
                    Expiry
                  </th>

                  <th className="w-[120px] px-4 py-4 text-[11px] font-medium text-slate-500">
                    Expiry Status
                  </th>

                  <th className="sticky right-0 z-10 w-[100px] bg-slate-50 px-4 py-4 text-[11px] font-medium text-slate-500">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredStockItems.map((item, index) => {
                  const stockStatus = getStockStatus(item);
                  const expiryStatus = getExpiryStatus(
                    item.expiryDate,
                  );

                  return (
                    <tr
                      key={item.id}
                      className="border-b border-slate-100 transition last:border-b-0 hover:bg-slate-50/70"
                    >
                      <td className="px-4 py-[16px] text-[11px] text-slate-500">
                        {index + 1}
                      </td>

                      <td className="px-4 py-[16px]">
                        <p className="text-[13px] font-semibold text-slate-900">
                          {item.medicineName}
                        </p>

                        <p className="mt-0.5 font-mono text-[9px] text-slate-400">
                          {item.id}
                        </p>
                      </td>

                      <td className="px-4 py-[16px] text-[11px] text-slate-500">
                        {item.genericName}
                      </td>

                      <td className="px-4 py-[16px]">
                        <span className="inline-flex rounded-full border border-sky-100 bg-sky-50 px-2.5 py-1 text-[9px] font-medium text-sky-700">
                          {item.category}
                        </span>
                      </td>

                      <td className="px-4 py-[16px] font-mono text-[10px] text-slate-500">
                        {item.batchNo}
                      </td>

                      <td className="px-4 py-[16px] text-[11px] text-slate-500">
                        {item.unit}
                      </td>

                      <td className="px-4 py-[16px]">
                        <span
                          className={`text-[13px] font-semibold ${
                            item.stockQuantity === 0
                              ? "text-rose-600"
                              : item.stockQuantity <=
                                  item.reorderLevel
                                ? "text-amber-600"
                                : "text-slate-900"
                          }`}
                        >
                          {item.stockQuantity}
                        </span>
                      </td>

                      <td className="px-4 py-[16px] text-[11px] text-slate-500">
                        {item.reorderLevel}
                      </td>

                      <td className="px-4 py-[16px]">
                        <span
                          className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[9px] font-medium ${getStockBadgeClass(
                            stockStatus,
                          )}`}
                        >
                          {stockStatus}
                        </span>
                      </td>

                      <td className="px-4 py-[16px] text-[10px] text-slate-500">
                        {item.expiryDate}
                      </td>

                      <td className="px-4 py-[16px]">
                        <span
                          className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[9px] font-medium ${getExpiryBadgeClass(
                            expiryStatus,
                          )}`}
                        >
                          {expiryStatus}
                        </span>
                      </td>

                      <td className="sticky right-0 bg-white px-4 py-[16px]">
                        <button
                          type="button"
                          onClick={() =>
                            openAdjustmentModal(item)
                          }
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-sky-600 transition hover:bg-sky-50"
                          aria-label={`Adjust ${item.medicineName} stock`}
                          title="Adjust Stock"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {filteredStockItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan={12}
                      className="px-5 py-16 text-center"
                    >
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                        <Search className="h-5 w-5" />
                      </div>

                      <p className="mt-3 text-sm font-medium text-slate-700">
                        No stock records found
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Try changing the search or stock
                        status filter.
                      </p>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
            <p className="text-[11px] text-slate-500">
              Showing {filteredStockItems.length} of{" "}
              {stockItems.length} medicines
            </p>
          </div>
        </section>
      </div>

      {/* Stock Adjustment Modal */}
      {isModalOpen && selectedItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-[520px] overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-slate-950">
                  Adjust Stock
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  {selectedItem.medicineName} · Current
                  stock: {selectedItem.stockQuantity}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAdjustment}>
              <div className="space-y-4 p-5">
                <div>
                  <label className="mb-2 block text-[12px] font-medium text-slate-700">
                    Adjustment Type
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setAdjustmentForm({
                          ...adjustmentForm,
                          type: "increase",
                        })
                      }
                      className={`flex h-11 items-center justify-center gap-2 rounded-xl border text-[12px] font-medium transition ${
                        adjustmentForm.type === "increase"
                          ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-white text-slate-500"
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
                          type: "decrease",
                        })
                      }
                      className={`flex h-11 items-center justify-center gap-2 rounded-xl border text-[12px] font-medium transition ${
                        adjustmentForm.type === "decrease"
                          ? "border-rose-300 bg-rose-50 text-rose-600"
                          : "border-slate-200 bg-white text-slate-500"
                      }`}
                    >
                      <ArrowDown className="h-4 w-4" />
                      Decrease
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-[12px] font-medium text-slate-700">
                    Quantity
                  </label>

                  <input
                    type="number"
                    min="1"
                    value={adjustmentForm.quantity}
                    onChange={(event) =>
                      setAdjustmentForm({
                        ...adjustmentForm,
                        quantity: event.target.value,
                      })
                    }
                    placeholder="Enter quantity"
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-[13px] outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[12px] font-medium text-slate-700">
                    Reason
                  </label>

                  <textarea
                    value={adjustmentForm.reason}
                    onChange={(event) =>
                      setAdjustmentForm({
                        ...adjustmentForm,
                        reason: event.target.value,
                      })
                    }
                    placeholder="Example: Damaged item, physical stock correction..."
                    rows={3}
                    className="w-full resize-none rounded-xl border border-slate-200 px-3 py-3 text-[13px] outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    required
                  />
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">
                      Current Stock
                    </span>

                    <span className="font-semibold text-slate-900">
                      {selectedItem.stockQuantity}
                    </span>
                  </div>

                  <div className="mt-2 flex justify-between text-[11px]">
                    <span className="text-slate-500">
                      New Stock
                    </span>

                    <span className="font-semibold text-sky-700">
                      {adjustmentForm.quantity
                        ? adjustmentForm.type === "increase"
                          ? selectedItem.stockQuantity +
                            Number(
                              adjustmentForm.quantity,
                            )
                          : Math.max(
                              0,
                              selectedItem.stockQuantity -
                                Number(
                                  adjustmentForm.quantity,
                                ),
                            )
                        : selectedItem.stockQuantity}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50/60 px-5 py-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-5 text-[13px] font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="h-10 rounded-xl bg-sky-600 px-5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-sky-700"
                >
                  Update Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}