"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Eye,
  PackagePlus,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  X,
} from "lucide-react";

type PurchaseStatus = "Completed" | "Pending" | "Cancelled";

type PurchaseItem = {
  id: string;
  medicine: string;
  quantity: number;
  unitCost: number;
};

type Purchase = {
  id: string;
  supplier: string;
  purchaseDate: string;
  items: PurchaseItem[];
  totalAmount: number;
  status: PurchaseStatus;
  processedBy: string;
};

type PurchaseItemForm = {
  id: string;
  medicine: string;
  quantity: string;
  unitCost: string;
};

type PurchaseForm = {
  supplier: string;
  purchaseDate: string;
  status: PurchaseStatus;
  items: PurchaseItemForm[];
};

const suppliers = [
  "Square Pharmaceuticals Ltd.",
  "Beximco Pharmaceuticals Ltd.",
  "Renata Limited",
  "Healthcare Pharmaceuticals Ltd.",
  "ACME Laboratories Ltd.",
  "Eskayef Pharmaceuticals Ltd.",
];

const medicines = [
  { name: "Napa 500mg", defaultCost: 8 },
  { name: "Ace Plus", defaultCost: 18 },
  { name: "Napa Extend", defaultCost: 16 },
  { name: "Seclo 20mg", defaultCost: 65 },
  { name: "Maxpro 20mg", defaultCost: 72 },
  { name: "Sergel 20mg", defaultCost: 50 },
  { name: "Losectil 20mg", defaultCost: 55 },
  { name: "Monas 10mg", defaultCost: 120 },
  { name: "Histacin", defaultCost: 5 },
  { name: "Fexo 120mg", defaultCost: 38 },
  { name: "Zimax 500mg", defaultCost: 80 },
  { name: "DP 10mg", defaultCost: 14 },
  { name: "Amdocal 5mg", defaultCost: 28 },
  { name: "Comet 500mg", defaultCost: 30 },
  { name: "Ceevit 250mg", defaultCost: 18 },
];

const initialPurchases: Purchase[] = [
  {
    id: "PUR-2026-001",
    supplier: "Square Pharmaceuticals Ltd.",
    purchaseDate: "2026-07-01",
    items: [
      {
        id: "ITEM-001",
        medicine: "Ace Plus",
        quantity: 100,
        unitCost: 18,
      },
      {
        id: "ITEM-002",
        medicine: "Seclo 20mg",
        quantity: 80,
        unitCost: 65,
      },
      {
        id: "ITEM-003",
        medicine: "Zimax 500mg",
        quantity: 50,
        unitCost: 80,
      },
    ],
    totalAmount: 11000,
    status: "Completed",
    processedBy: "Admin User",
  },
  {
    id: "PUR-2026-002",
    supplier: "Beximco Pharmaceuticals Ltd.",
    purchaseDate: "2026-07-03",
    items: [
      {
        id: "ITEM-004",
        medicine: "Napa 500mg",
        quantity: 250,
        unitCost: 8,
      },
      {
        id: "ITEM-005",
        medicine: "Fexo 120mg",
        quantity: 100,
        unitCost: 38,
      },
    ],
    totalAmount: 5800,
    status: "Completed",
    processedBy: "Admin User",
  },
  {
    id: "PUR-2026-003",
    supplier: "Renata Limited",
    purchaseDate: "2026-07-05",
    items: [
      {
        id: "ITEM-006",
        medicine: "Maxpro 20mg",
        quantity: 120,
        unitCost: 72,
      },
    ],
    totalAmount: 8640,
    status: "Completed",
    processedBy: "Admin User",
  },
  {
    id: "PUR-2026-004",
    supplier: "Healthcare Pharmaceuticals Ltd.",
    purchaseDate: "2026-07-07",
    items: [
      {
        id: "ITEM-007",
        medicine: "Sergel 20mg",
        quantity: 100,
        unitCost: 50,
      },
      {
        id: "ITEM-008",
        medicine: "Monas 10mg",
        quantity: 40,
        unitCost: 120,
      },
    ],
    totalAmount: 9800,
    status: "Pending",
    processedBy: "Admin User",
  },
  {
    id: "PUR-2026-005",
    supplier: "ACME Laboratories Ltd.",
    purchaseDate: "2026-07-08",
    items: [
      {
        id: "ITEM-009",
        medicine: "Amdocal 5mg",
        quantity: 100,
        unitCost: 28,
      },
      {
        id: "ITEM-010",
        medicine: "Comet 500mg",
        quantity: 100,
        unitCost: 30,
      },
    ],
    totalAmount: 5800,
    status: "Pending",
    processedBy: "Admin User",
  },
];

function getTodayLocalDate() {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function createEmptyItem(index = 1): PurchaseItemForm {
  return {
    id: `FORM-${Date.now()}-${index}`,
    medicine: "",
    quantity: "",
    unitCost: "",
  };
}

function createEmptyForm(): PurchaseForm {
  return {
    supplier: "",
    purchaseDate: getTodayLocalDate(),
    status: "Completed",
    items: [createEmptyItem()],
  };
}

export default function PurchasePage() {
  const [purchases, setPurchases] =
    useState<Purchase[]>(initialPurchases);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [isPurchaseModalOpen, setIsPurchaseModalOpen] =
    useState(false);

  const [selectedPurchase, setSelectedPurchase] =
    useState<Purchase | null>(null);

  const [form, setForm] =
    useState<PurchaseForm>(createEmptyForm());

  const statistics = useMemo(() => {
    const completed = purchases.filter(
      (purchase) => purchase.status === "Completed",
    ).length;

    const pending = purchases.filter(
      (purchase) => purchase.status === "Pending",
    ).length;

    const totalValue = purchases
      .filter((purchase) => purchase.status !== "Cancelled")
      .reduce(
        (total, purchase) => total + purchase.totalAmount,
        0,
      );

    return {
      total: purchases.length,
      completed,
      pending,
      totalValue,
    };
  }, [purchases]);

  const filteredPurchases = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return purchases.filter((purchase) => {
      const matchesSearch =
        purchase.id.toLowerCase().includes(search) ||
        purchase.supplier.toLowerCase().includes(search) ||
        purchase.processedBy.toLowerCase().includes(search);

      const matchesStatus =
        statusFilter === "All" ||
        purchase.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [purchases, searchTerm, statusFilter]);

  const formTotal = useMemo(() => {
    return form.items.reduce((total, item) => {
      const quantity = Number(item.quantity) || 0;
      const unitCost = Number(item.unitCost) || 0;

      return total + quantity * unitCost;
    }, 0);
  }, [form.items]);

  function openPurchaseModal() {
    setForm(createEmptyForm());
    setIsPurchaseModalOpen(true);
  }

  function closePurchaseModal() {
    setIsPurchaseModalOpen(false);
    setForm(createEmptyForm());
  }

  function generatePurchaseId() {
    const highestNumber = purchases.reduce(
      (highest, purchase) => {
        const parts = purchase.id.split("-");
        const currentNumber = Number(parts[2]);

        return Math.max(highest, currentNumber);
      },
      0,
    );

    return `PUR-2026-${String(highestNumber + 1).padStart(
      3,
      "0",
    )}`;
  }

  function addPurchaseItem() {
    setForm((currentForm) => ({
      ...currentForm,
      items: [
        ...currentForm.items,
        createEmptyItem(currentForm.items.length + 1),
      ],
    }));
  }

  function removePurchaseItem(itemId: string) {
    if (form.items.length === 1) {
      window.alert(
        "A purchase must contain at least one medicine.",
      );
      return;
    }

    setForm((currentForm) => ({
      ...currentForm,
      items: currentForm.items.filter(
        (item) => item.id !== itemId,
      ),
    }));
  }

  function updatePurchaseItem(
    itemId: string,
    field: keyof PurchaseItemForm,
    value: string,
  ) {
    setForm((currentForm) => ({
      ...currentForm,
      items: currentForm.items.map((item) => {
        if (item.id !== itemId) {
          return item;
        }

        if (field === "medicine") {
          const selectedMedicine = medicines.find(
            (medicine) => medicine.name === value,
          );

          return {
            ...item,
            medicine: value,
            unitCost: selectedMedicine
              ? String(selectedMedicine.defaultCost)
              : "",
          };
        }

        return {
          ...item,
          [field]: value,
        };
      }),
    }));
  }

  function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!form.supplier) {
      window.alert("Please select a supplier.");
      return;
    }

    if (!form.purchaseDate) {
      window.alert("Please select a purchase date.");
      return;
    }

    for (const item of form.items) {
      if (!item.medicine) {
        window.alert(
          "Please select a medicine for every purchase item.",
        );
        return;
      }

      const quantity = Number(item.quantity);
      const unitCost = Number(item.unitCost);

      if (
        Number.isNaN(quantity) ||
        quantity <= 0 ||
        Number.isNaN(unitCost) ||
        unitCost < 0
      ) {
        window.alert(
          "Quantity must be greater than 0 and unit cost must be valid.",
        );
        return;
      }
    }

    const duplicateMedicines = form.items
      .map((item) => item.medicine)
      .filter(
        (medicine, index, allMedicines) =>
          allMedicines.indexOf(medicine) !== index,
      );

    if (duplicateMedicines.length > 0) {
      window.alert(
        "The same medicine should not be added more than once in one purchase.",
      );
      return;
    }

    const newItems: PurchaseItem[] = form.items.map(
      (item, index) => ({
        id: `ITEM-${Date.now()}-${index + 1}`,
        medicine: item.medicine,
        quantity: Number(item.quantity),
        unitCost: Number(item.unitCost),
      }),
    );

    const newPurchase: Purchase = {
      id: generatePurchaseId(),
      supplier: form.supplier,
      purchaseDate: form.purchaseDate,
      items: newItems,
      totalAmount: formTotal,
      status: form.status,
      processedBy: "Admin User",
    };

    setPurchases((currentPurchases) => [
      newPurchase,
      ...currentPurchases,
    ]);

    closePurchaseModal();
  }

  function getStatusClass(status: PurchaseStatus) {
    if (status === "Completed") {
      return "bg-emerald-100 text-emerald-700";
    }

    if (status === "Pending") {
      return "bg-amber-100 text-amber-700";
    }

    return "bg-rose-100 text-rose-600";
  }

  function formatDate(date: string) {
    if (!date) {
      return "";
    }

    const [year, month, day] = date.split("-");

    return `${day}-${month}-${year}`;
  }

  return (
    <>
      <div className="mx-auto w-full max-w-[1600px] space-y-4">
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="flex min-h-[100px] items-center justify-between rounded-2xl border border-sky-200 bg-white p-4 shadow-sm">
            <div>
              <p className="text-[11px] text-slate-500">
                Total Purchases
              </p>

              <h3 className="mt-1 text-[24px] font-semibold text-slate-950">
                {statistics.total}
              </h3>

              <p className="mt-1 text-[10px] text-slate-500">
                Purchase records
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
              <ShoppingBag className="h-5 w-5" />
            </div>
          </article>

          <article className="flex min-h-[100px] items-center justify-between rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
            <div>
              <p className="text-[11px] text-slate-500">
                Completed
              </p>

              <h3 className="mt-1 text-[24px] font-semibold text-emerald-700">
                {statistics.completed}
              </h3>

              <p className="mt-1 text-[10px] text-slate-500">
                Completed purchases
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </article>

          <article className="flex min-h-[100px] items-center justify-between rounded-2xl border border-amber-200 bg-white p-4 shadow-sm">
            <div>
              <p className="text-[11px] text-slate-500">
                Pending
              </p>

              <h3 className="mt-1 text-[24px] font-semibold text-amber-700">
                {statistics.pending}
              </h3>

              <p className="mt-1 text-[10px] text-slate-500">
                Awaiting completion
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-500">
              <Clock3 className="h-5 w-5" />
            </div>
          </article>

          <article className="flex min-h-[100px] items-center justify-between rounded-2xl border border-violet-200 bg-white p-4 shadow-sm">
            <div>
              <p className="text-[11px] text-slate-500">
                Purchase Value
              </p>

              <h3 className="mt-1 text-[24px] font-semibold text-violet-700">
                ৳
                {statistics.totalValue.toLocaleString(
                  "en-US",
                )}
              </h3>

              <p className="mt-1 text-[10px] text-slate-500">
                Total recorded amount
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
              <PackagePlus className="h-5 w-5" />
            </div>
          </article>
        </section>

        <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-[650px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              type="text"
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(event.target.value)
              }
              placeholder="Search by purchase ID, supplier or user..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-[13px] text-slate-700 outline-none placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
              className="h-10 min-w-[170px] rounded-xl border border-slate-200 bg-white px-3 text-[13px] text-slate-600 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            >
              <option value="All">All Status</option>
              <option value="Completed">
                Completed
              </option>
              <option value="Pending">Pending</option>
              <option value="Cancelled">
                Cancelled
              </option>
            </select>

            <button
              type="button"
              onClick={openPurchaseModal}
              className="flex h-10 items-center justify-center gap-2 rounded-xl bg-sky-600 px-5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-sky-700"
            >
              <Plus className="h-4 w-4" />
              New Purchase
            </button>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  <th className="px-4 py-4 text-[11px] font-medium text-slate-500">
                    Purchase ID
                  </th>

                  <th className="px-4 py-4 text-[11px] font-medium text-slate-500">
                    Supplier
                  </th>

                  <th className="px-4 py-4 text-[11px] font-medium text-slate-500">
                    Purchase Date
                  </th>

                  <th className="px-4 py-4 text-[11px] font-medium text-slate-500">
                    Items
                  </th>

                  <th className="px-4 py-4 text-[11px] font-medium text-slate-500">
                    Total Amount
                  </th>

                  <th className="px-4 py-4 text-[11px] font-medium text-slate-500">
                    Status
                  </th>

                  <th className="px-4 py-4 text-[11px] font-medium text-slate-500">
                    Processed By
                  </th>

                  <th className="sticky right-0 z-10 w-[100px] bg-slate-50 px-4 py-4 text-[11px] font-medium text-slate-500">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredPurchases.map((purchase) => (
                  <tr
                    key={purchase.id}
                    className="border-b border-slate-100 transition last:border-b-0 hover:bg-slate-50/70"
                  >
                    <td className="px-4 py-[17px]">
                      <p className="font-mono text-[11px] font-medium text-sky-700">
                        {purchase.id}
                      </p>
                    </td>

                    <td className="px-4 py-[17px] text-[12px] font-medium text-slate-800">
                      {purchase.supplier}
                    </td>

                    <td className="px-4 py-[17px] text-[11px] text-slate-500">
                      {formatDate(
                        purchase.purchaseDate,
                      )}
                    </td>

                    <td className="px-4 py-[17px]">
                      <span className="inline-flex rounded-full bg-violet-50 px-3 py-1 text-[10px] font-medium text-violet-700">
                        {purchase.items.length}{" "}
                        {purchase.items.length === 1
                          ? "item"
                          : "items"}
                      </span>
                    </td>

                    <td className="px-4 py-[17px] text-[12px] font-semibold text-slate-900">
                      ৳
                      {purchase.totalAmount.toLocaleString(
                        "en-US",
                      )}
                    </td>

                    <td className="px-4 py-[17px]">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-[10px] font-medium ${getStatusClass(
                          purchase.status,
                        )}`}
                      >
                        {purchase.status}
                      </span>
                    </td>

                    <td className="px-4 py-[17px] text-[11px] text-slate-500">
                      {purchase.processedBy}
                    </td>

                    <td className="sticky right-0 bg-white px-4 py-[17px]">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedPurchase(purchase)
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-sky-600 transition hover:bg-sky-50"
                        title="View Purchase"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}

                {filteredPurchases.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-5 py-16 text-center"
                    >
                      <Search className="mx-auto h-6 w-6 text-slate-400" />

                      <p className="mt-3 text-sm font-medium text-slate-700">
                        No purchases found
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Try changing the search or status
                        filter.
                      </p>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="border-t border-slate-200 px-4 py-3">
            <p className="text-[11px] text-slate-500">
              Showing {filteredPurchases.length} of{" "}
              {purchases.length} purchase records
            </p>
          </div>
        </section>
      </div>

      {isPurchaseModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]">
          <div className="max-h-[94vh] w-full max-w-[900px] overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-slate-950">
                  New Purchase
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Record medicines purchased from a
                  supplier.
                </p>
              </div>

              <button
                type="button"
                onClick={closePurchaseModal}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="max-h-[calc(94vh-75px)] overflow-y-auto"
            >
              <div className="space-y-5 p-5">
                <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-[12px] font-medium text-slate-700">
                      Supplier
                    </label>

                    <select
                      value={form.supplier}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          supplier: event.target.value,
                        })
                      }
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] text-slate-700 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                      required
                    >
                      <option value="">
                        Select supplier
                      </option>

                      {suppliers.map((supplier) => (
                        <option
                          key={supplier}
                          value={supplier}
                        >
                          {supplier}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-[12px] font-medium text-slate-700">
                      Purchase Date
                    </label>

                    <div className="relative">
                      <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                      <input
                        type="date"
                        value={form.purchaseDate}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            purchaseDate:
                              event.target.value,
                          })
                        }
                        className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-[13px] text-slate-700 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-[12px] font-medium text-slate-700">
                      Status
                    </label>

                    <select
                      value={form.status}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          status: event.target
                            .value as PurchaseStatus,
                        })
                      }
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] text-slate-700 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    >
                      <option value="Completed">
                        Completed
                      </option>

                      <option value="Pending">
                        Pending
                      </option>

                      <option value="Cancelled">
                        Cancelled
                      </option>
                    </select>
                  </div>
                </section>

                <section className="overflow-hidden rounded-2xl border border-slate-200">
                  <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-4 py-3">
                    <div>
                      <h3 className="text-[13px] font-semibold text-slate-900">
                        Purchase Items
                      </h3>

                      <p className="mt-0.5 text-[10px] text-slate-500">
                        Add medicines included in this
                        purchase.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={addPurchaseItem}
                      className="flex h-9 items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 text-[11px] font-semibold text-sky-700 transition hover:bg-sky-100"
                    >
                      <Plus className="h-4 w-4" />
                      Add Item
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px]">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="px-4 py-3 text-left text-[10px] font-medium text-slate-500">
                            Medicine
                          </th>

                          <th className="w-[130px] px-4 py-3 text-left text-[10px] font-medium text-slate-500">
                            Quantity
                          </th>

                          <th className="w-[150px] px-4 py-3 text-left text-[10px] font-medium text-slate-500">
                            Unit Cost
                          </th>

                          <th className="w-[150px] px-4 py-3 text-left text-[10px] font-medium text-slate-500">
                            Subtotal
                          </th>

                          <th className="w-[70px] px-4 py-3 text-left text-[10px] font-medium text-slate-500">
                            Action
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {form.items.map((item) => {
                          const subtotal =
                            (Number(item.quantity) ||
                              0) *
                            (Number(item.unitCost) ||
                              0);

                          return (
                            <tr
                              key={item.id}
                              className="border-b border-slate-100 last:border-b-0"
                            >
                              <td className="px-4 py-3">
                                <select
                                  value={item.medicine}
                                  onChange={(event) =>
                                    updatePurchaseItem(
                                      item.id,
                                      "medicine",
                                      event.target
                                        .value,
                                    )
                                  }
                                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[12px] text-slate-700 outline-none focus:border-sky-400"
                                  required
                                >
                                  <option value="">
                                    Select medicine
                                  </option>

                                  {medicines.map(
                                    (medicine) => (
                                      <option
                                        key={
                                          medicine.name
                                        }
                                        value={
                                          medicine.name
                                        }
                                      >
                                        {
                                          medicine.name
                                        }
                                      </option>
                                    ),
                                  )}
                                </select>
                              </td>

                              <td className="px-4 py-3">
                                <input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(event) =>
                                    updatePurchaseItem(
                                      item.id,
                                      "quantity",
                                      event.target
                                        .value,
                                    )
                                  }
                                  placeholder="0"
                                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[12px] outline-none focus:border-sky-400"
                                  required
                                />
                              </td>

                              <td className="px-4 py-3">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.unitCost}
                                  onChange={(event) =>
                                    updatePurchaseItem(
                                      item.id,
                                      "unitCost",
                                      event.target
                                        .value,
                                    )
                                  }
                                  placeholder="৳0"
                                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[12px] outline-none focus:border-sky-400"
                                  required
                                />
                              </td>

                              <td className="px-4 py-3">
                                <span className="text-[12px] font-semibold text-slate-900">
                                  ৳
                                  {subtotal.toLocaleString(
                                    "en-US",
                                  )}
                                </span>
                              </td>

                              <td className="px-4 py-3">
                                <button
                                  type="button"
                                  onClick={() =>
                                    removePurchaseItem(
                                      item.id,
                                    )
                                  }
                                  className="flex h-8 w-8 items-center justify-center rounded-lg text-rose-500 hover:bg-rose-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="ml-auto max-w-[380px] rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-slate-500">
                      Total Items
                    </span>

                    <span className="text-[13px] font-semibold text-slate-900">
                      {form.items.length}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
                    <span className="text-[13px] font-semibold text-slate-700">
                      Total Amount
                    </span>

                    <span className="text-[20px] font-bold text-sky-700">
                      ৳
                      {formTotal.toLocaleString(
                        "en-US",
                      )}
                    </span>
                  </div>
                </section>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50/60 px-5 py-4">
                <button
                  type="button"
                  onClick={closePurchaseModal}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-5 text-[13px] font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="h-10 rounded-xl bg-sky-600 px-5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-sky-700"
                >
                  Save Purchase
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {selectedPurchase ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-[700px] overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-slate-950">
                  Purchase Details
                </h2>

                <p className="mt-1 font-mono text-xs text-sky-700">
                  {selectedPurchase.id}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedPurchase(null)
                }
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 p-5">
              <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[10px] text-slate-500">
                    Supplier
                  </p>

                  <p className="mt-1 text-[12px] font-semibold text-slate-900">
                    {selectedPurchase.supplier}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[10px] text-slate-500">
                    Purchase Date
                  </p>

                  <p className="mt-1 text-[12px] font-semibold text-slate-900">
                    {formatDate(
                      selectedPurchase.purchaseDate,
                    )}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[10px] text-slate-500">
                    Status
                  </p>

                  <span
                    className={`mt-1 inline-flex rounded-full px-3 py-1 text-[10px] font-medium ${getStatusClass(
                      selectedPurchase.status,
                    )}`}
                  >
                    {selectedPurchase.status}
                  </span>
                </div>

                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[10px] text-slate-500">
                    Processed By
                  </p>

                  <p className="mt-1 text-[12px] font-semibold text-slate-900">
                    {selectedPurchase.processedBy}
                  </p>
                </div>
              </section>

              <section className="overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-4 py-3 text-left text-[10px] font-medium text-slate-500">
                        Medicine
                      </th>

                      <th className="px-4 py-3 text-left text-[10px] font-medium text-slate-500">
                        Qty
                      </th>

                      <th className="px-4 py-3 text-left text-[10px] font-medium text-slate-500">
                        Unit Cost
                      </th>

                      <th className="px-4 py-3 text-left text-[10px] font-medium text-slate-500">
                        Subtotal
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {selectedPurchase.items.map(
                      (item) => (
                        <tr
                          key={item.id}
                          className="border-b border-slate-100 last:border-b-0"
                        >
                          <td className="px-4 py-3 text-[11px] font-medium text-slate-800">
                            {item.medicine}
                          </td>

                          <td className="px-4 py-3 text-[11px] text-slate-500">
                            {item.quantity}
                          </td>

                          <td className="px-4 py-3 text-[11px] text-slate-500">
                            ৳
                            {item.unitCost.toLocaleString(
                              "en-US",
                            )}
                          </td>

                          <td className="px-4 py-3 text-[11px] font-semibold text-slate-900">
                            ৳
                            {(
                              item.quantity *
                              item.unitCost
                            ).toLocaleString(
                              "en-US",
                            )}
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </section>

              <div className="flex items-center justify-between rounded-xl bg-sky-50 p-4">
                <span className="text-[13px] font-semibold text-slate-700">
                  Total Amount
                </span>

                <span className="text-[20px] font-bold text-sky-700">
                  ৳
                  {selectedPurchase.totalAmount.toLocaleString(
                    "en-US",
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}