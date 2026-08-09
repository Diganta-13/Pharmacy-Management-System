"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

type MedicineStatus = "active" | "inactive";

type Medicine = {
  id: string;
  name: string;
  genericName: string;
  category: string;
  companyName: string;
  batchNo: string;
  unit: string;
  purchasePrice: number;
  sellingPrice: number;
  stockQuantity: number;
  reorderLevel: number;
  expiryDate: string;
  status: MedicineStatus;
};

type MedicineForm = {
  name: string;
  genericName: string;
  category: string;
  companyName: string;
  batchNo: string;
  unit: string;
  purchasePrice: string;
  sellingPrice: string;
  stockQuantity: string;
  reorderLevel: string;
  expiryDate: string;
  status: MedicineStatus;
};

const categories = [
  "Pain Relief",
  "Antibiotic",
  "Gastric / Antacid",
  "Allergy",
  "Diabetes",
  "Blood Pressure",
  "Vitamin & Supplement",
  "Cough & Cold",
];

const units = [
  "Strip",
  "Box",
  "Bottle",
  "Piece",
  "Tube",
  "Sachet",
];

const initialMedicines: Medicine[] = [
  {
    id: "MED-001",
    name: "Napa 500mg",
    genericName: "Paracetamol",
    category: "Pain Relief",
    companyName: "Beximco",
    batchNo: "NP-2601",
    unit: "Strip",
    purchasePrice: 8,
    sellingPrice: 12,
    stockQuantity: 450,
    reorderLevel: 50,
    expiryDate: "2027-01-30",
    status: "active",
  },
  {
    id: "MED-002",
    name: "Ace Plus",
    genericName: "Paracetamol + Caffeine",
    category: "Pain Relief",
    companyName: "Square",
    batchNo: "AC-2602",
    unit: "Strip",
    purchasePrice: 18,
    sellingPrice: 25,
    stockQuantity: 180,
    reorderLevel: 40,
    expiryDate: "2027-04-15",
    status: "active",
  },
  {
    id: "MED-003",
    name: "Napa Extend",
    genericName: "Paracetamol",
    category: "Pain Relief",
    companyName: "Beximco",
    batchNo: "NE-2603",
    unit: "Strip",
    purchasePrice: 16,
    sellingPrice: 22,
    stockQuantity: 160,
    reorderLevel: 40,
    expiryDate: "2027-05-20",
    status: "active",
  },
  {
    id: "MED-004",
    name: "Seclo 20mg",
    genericName: "Omeprazole",
    category: "Gastric / Antacid",
    companyName: "Square",
    batchNo: "SC-2604",
    unit: "Box",
    purchasePrice: 65,
    sellingPrice: 80,
    stockQuantity: 35,
    reorderLevel: 80,
    expiryDate: "2026-10-30",
    status: "active",
  },
  {
    id: "MED-005",
    name: "Maxpro 20mg",
    genericName: "Esomeprazole",
    category: "Gastric / Antacid",
    companyName: "Renata",
    batchNo: "MX-2605",
    unit: "Box",
    purchasePrice: 72,
    sellingPrice: 90,
    stockQuantity: 220,
    reorderLevel: 60,
    expiryDate: "2027-02-28",
    status: "active",
  },
  {
    id: "MED-006",
    name: "Sergel 20mg",
    genericName: "Esomeprazole",
    category: "Gastric / Antacid",
    companyName: "Healthcare",
    batchNo: "SG-2606",
    unit: "Box",
    purchasePrice: 50,
    sellingPrice: 65,
    stockQuantity: 12,
    reorderLevel: 50,
    expiryDate: "2026-09-25",
    status: "active",
  },
  {
    id: "MED-007",
    name: "Losectil 20mg",
    genericName: "Omeprazole",
    category: "Gastric / Antacid",
    companyName: "Eskayef",
    batchNo: "LS-2607",
    unit: "Box",
    purchasePrice: 55,
    sellingPrice: 70,
    stockQuantity: 95,
    reorderLevel: 40,
    expiryDate: "2027-03-10",
    status: "active",
  },
  {
    id: "MED-008",
    name: "Monas 10mg",
    genericName: "Montelukast",
    category: "Allergy",
    companyName: "Acme",
    batchNo: "MN-2608",
    unit: "Strip",
    purchasePrice: 120,
    sellingPrice: 150,
    stockQuantity: 200,
    reorderLevel: 50,
    expiryDate: "2027-06-15",
    status: "active",
  },
  {
    id: "MED-009",
    name: "Histacin",
    genericName: "Chlorpheniramine",
    category: "Allergy",
    companyName: "Jayson",
    batchNo: "HS-2609",
    unit: "Strip",
    purchasePrice: 5,
    sellingPrice: 8,
    stockQuantity: 8,
    reorderLevel: 60,
    expiryDate: "2027-01-20",
    status: "active",
  },
  {
    id: "MED-010",
    name: "Fexo 120mg",
    genericName: "Fexofenadine",
    category: "Allergy",
    companyName: "Beximco",
    batchNo: "FX-2610",
    unit: "Strip",
    purchasePrice: 38,
    sellingPrice: 50,
    stockQuantity: 320,
    reorderLevel: 50,
    expiryDate: "2027-08-12",
    status: "active",
  },
  {
    id: "MED-011",
    name: "Zimax 500mg",
    genericName: "Azithromycin",
    category: "Antibiotic",
    companyName: "Square",
    batchNo: "ZM-2611",
    unit: "Strip",
    purchasePrice: 80,
    sellingPrice: 100,
    stockQuantity: 75,
    reorderLevel: 30,
    expiryDate: "2027-07-30",
    status: "active",
  },
  {
    id: "MED-012",
    name: "DP 10mg",
    genericName: "Domperidone",
    category: "Gastric / Antacid",
    companyName: "Square",
    batchNo: "DP-2612",
    unit: "Strip",
    purchasePrice: 14,
    sellingPrice: 20,
    stockQuantity: 0,
    reorderLevel: 30,
    expiryDate: "2027-05-15",
    status: "active",
  },
  {
    id: "MED-013",
    name: "Amdocal 5mg",
    genericName: "Amlodipine",
    category: "Blood Pressure",
    companyName: "Beximco",
    batchNo: "AM-2613",
    unit: "Strip",
    purchasePrice: 28,
    sellingPrice: 35,
    stockQuantity: 140,
    reorderLevel: 40,
    expiryDate: "2027-10-10",
    status: "active",
  },
  {
    id: "MED-014",
    name: "Comet 500mg",
    genericName: "Metformin",
    category: "Diabetes",
    companyName: "Square",
    batchNo: "CM-2614",
    unit: "Strip",
    purchasePrice: 30,
    sellingPrice: 40,
    stockQuantity: 130,
    reorderLevel: 40,
    expiryDate: "2027-09-20",
    status: "active",
  },
  {
    id: "MED-015",
    name: "Ceevit 250mg",
    genericName: "Vitamin C",
    category: "Vitamin & Supplement",
    companyName: "Square",
    batchNo: "CV-2615",
    unit: "Strip",
    purchasePrice: 18,
    sellingPrice: 25,
    stockQuantity: 210,
    reorderLevel: 50,
    expiryDate: "2027-11-30",
    status: "active",
  },
];

const emptyForm: MedicineForm = {
  name: "",
  genericName: "",
  category: "",
  companyName: "",
  batchNo: "",
  unit: "",
  purchasePrice: "",
  sellingPrice: "",
  stockQuantity: "",
  reorderLevel: "",
  expiryDate: "",
  status: "active",
};

export default function AdminMedicinesPage() {
  const [medicines, setMedicines] =
    useState<Medicine[]>(initialMedicines);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState("All");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] =
    useState<Medicine | null>(null);

  const [form, setForm] =
    useState<MedicineForm>(emptyForm);

  const filteredMedicines = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return medicines.filter((medicine) => {
      const matchesSearch =
        medicine.name.toLowerCase().includes(search) ||
        medicine.genericName.toLowerCase().includes(search) ||
        medicine.companyName.toLowerCase().includes(search) ||
        medicine.batchNo.toLowerCase().includes(search);

      const matchesCategory =
        selectedCategory === "All" ||
        medicine.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [medicines, searchTerm, selectedCategory]);

  function openAddModal() {
    setEditingMedicine(null);
    setForm(emptyForm);
    setIsModalOpen(true);
  }

  function openEditModal(medicine: Medicine) {
    setEditingMedicine(medicine);

    setForm({
      name: medicine.name,
      genericName: medicine.genericName,
      category: medicine.category,
      companyName: medicine.companyName,
      batchNo: medicine.batchNo,
      unit: medicine.unit,
      purchasePrice: String(medicine.purchasePrice),
      sellingPrice: String(medicine.sellingPrice),
      stockQuantity: String(medicine.stockQuantity),
      reorderLevel: String(medicine.reorderLevel),
      expiryDate: medicine.expiryDate,
      status: medicine.status,
    });

    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingMedicine(null);
    setForm(emptyForm);
  }

  function generateMedicineId() {
    const highestNumber = medicines.reduce(
      (highest, medicine) => {
        const currentNumber = Number(
          medicine.id.replace("MED-", ""),
        );

        return Math.max(highest, currentNumber);
      },
      0,
    );

    return `MED-${String(highestNumber + 1).padStart(
      3,
      "0",
    )}`;
  }

  function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const purchasePrice = Number(form.purchasePrice);
    const sellingPrice = Number(form.sellingPrice);
    const stockQuantity = Number(form.stockQuantity);
    const reorderLevel = Number(form.reorderLevel);

    if (
      !form.name.trim() ||
      !form.genericName.trim() ||
      !form.category ||
      !form.companyName.trim() ||
      !form.batchNo.trim() ||
      !form.unit ||
      !form.expiryDate
    ) {
      window.alert("Please fill in all required fields.");
      return;
    }

    if (
      Number.isNaN(purchasePrice) ||
      Number.isNaN(sellingPrice) ||
      Number.isNaN(stockQuantity) ||
      Number.isNaN(reorderLevel)
    ) {
      window.alert(
        "Price, stock and reorder level must be valid numbers.",
      );
      return;
    }

    if (
      purchasePrice < 0 ||
      sellingPrice < 0 ||
      stockQuantity < 0 ||
      reorderLevel < 0
    ) {
      window.alert(
        "Price, stock and reorder level cannot be negative.",
      );
      return;
    }

    if (sellingPrice < purchasePrice) {
      const continueSave = window.confirm(
        "Selling price is lower than purchase price. Do you want to continue?",
      );

      if (!continueSave) {
        return;
      }
    }

    if (editingMedicine) {
      setMedicines((currentMedicines) =>
        currentMedicines.map((medicine) =>
          medicine.id === editingMedicine.id
            ? {
                ...medicine,
                name: form.name.trim(),
                genericName: form.genericName.trim(),
                category: form.category,
                companyName: form.companyName.trim(),
                batchNo: form.batchNo.trim(),
                unit: form.unit,
                purchasePrice,
                sellingPrice,
                stockQuantity,
                reorderLevel,
                expiryDate: form.expiryDate,
                status: form.status,
              }
            : medicine,
        ),
      );
    } else {
      const newMedicine: Medicine = {
        id: generateMedicineId(),
        name: form.name.trim(),
        genericName: form.genericName.trim(),
        category: form.category,
        companyName: form.companyName.trim(),
        batchNo: form.batchNo.trim(),
        unit: form.unit,
        purchasePrice,
        sellingPrice,
        stockQuantity,
        reorderLevel,
        expiryDate: form.expiryDate,
        status: form.status,
      };

      setMedicines((currentMedicines) => [
        ...currentMedicines,
        newMedicine,
      ]);
    }

    closeModal();
  }

  function handleDelete(medicine: Medicine) {
    const shouldDelete = window.confirm(
      `Are you sure you want to delete "${medicine.name}"?`,
    );

    if (!shouldDelete) {
      return;
    }

    setMedicines((currentMedicines) =>
      currentMedicines.filter(
        (currentMedicine) =>
          currentMedicine.id !== medicine.id,
      ),
    );
  }

  function getMedicineStatus(medicine: Medicine) {
    if (medicine.status === "inactive") {
      return "Inactive";
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiryDate = new Date(
      `${medicine.expiryDate}T00:00:00`,
    );

    if (expiryDate < today) {
      return "Expired";
    }

    if (medicine.stockQuantity === 0) {
      return "Out of Stock";
    }

    if (
      medicine.stockQuantity <= medicine.reorderLevel
    ) {
      return "Low Stock";
    }

    const ninetyDaysFromToday = new Date(today);
    ninetyDaysFromToday.setDate(
      ninetyDaysFromToday.getDate() + 90,
    );

    if (expiryDate <= ninetyDaysFromToday) {
      return "Near Expiry";
    }

    return "In Stock";
  }

  function getStatusClass(status: string) {
    switch (status) {
      case "In Stock":
        return "bg-emerald-100 text-emerald-700";

      case "Low Stock":
        return "bg-amber-100 text-amber-700";

      case "Out of Stock":
        return "bg-rose-100 text-rose-600";

      case "Expired":
        return "bg-red-100 text-red-700";

      case "Near Expiry":
        return "bg-orange-100 text-orange-700";

      case "Inactive":
        return "bg-slate-200 text-slate-600";

      default:
        return "bg-slate-100 text-slate-600";
    }
  }

  return (
    <>
      <div className="mx-auto w-full max-w-[1600px] space-y-4">
        <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-[650px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              type="text"
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(event.target.value)
              }
              placeholder="Search by medicine, generic, company or batch..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-[13px] text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <select
              value={selectedCategory}
              onChange={(event) =>
                setSelectedCategory(event.target.value)
              }
              className="h-10 min-w-[190px] rounded-xl border border-slate-200 bg-white px-3 text-[13px] text-slate-600 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            >
              <option value="All">All Categories</option>

              {categories.map((category) => (
                <option
                  key={category}
                  value={category}
                >
                  {category}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={openAddModal}
              className="flex h-10 items-center justify-center gap-2 rounded-xl bg-sky-600 px-5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-sky-700"
            >
              <Plus className="h-4 w-4" />
              Add Medicine
            </button>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1500px] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  <th className="w-[60px] px-4 py-4 text-[11px] font-medium text-slate-500">
                    SL
                  </th>

                  <th className="w-[175px] px-4 py-4 text-[11px] font-medium text-slate-500">
                    Medicine
                  </th>

                  <th className="w-[180px] px-4 py-4 text-[11px] font-medium text-slate-500">
                    Generic
                  </th>

                  <th className="w-[160px] px-4 py-4 text-[11px] font-medium text-slate-500">
                    Category
                  </th>

                  <th className="w-[140px] px-4 py-4 text-[11px] font-medium text-slate-500">
                    Company
                  </th>

                  <th className="w-[90px] px-4 py-4 text-[11px] font-medium text-slate-500">
                    Unit
                  </th>

                  <th className="w-[100px] px-4 py-4 text-[11px] font-medium text-slate-500">
                    Purchase
                  </th>

                  <th className="w-[90px] px-4 py-4 text-[11px] font-medium text-slate-500">
                    Sell
                  </th>

                  <th className="w-[90px] px-4 py-4 text-[11px] font-medium text-slate-500">
                    Stock
                  </th>

                  <th className="w-[120px] px-4 py-4 text-[11px] font-medium text-slate-500">
                    Expiry
                  </th>

                  <th className="w-[120px] px-4 py-4 text-[11px] font-medium text-slate-500">
                    Status
                  </th>

                  <th className="w-[100px] px-4 py-4 text-[11px] font-medium text-slate-500">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredMedicines.map(
                  (medicine, index) => {
                    const displayStatus =
                      getMedicineStatus(medicine);

                    return (
                      <tr
                        key={medicine.id}
                        className="border-b border-slate-100 transition last:border-b-0 hover:bg-slate-50/70"
                      >
                        <td className="px-4 py-[15px] text-[11px] text-slate-500">
                          {index + 1}
                        </td>

                        <td className="px-4 py-[15px]">
                          <div>
                            <p className="text-[13px] font-semibold text-slate-900">
                              {medicine.name}
                            </p>

                            <p className="mt-0.5 font-mono text-[9px] text-slate-400">
                              {medicine.id}
                            </p>
                          </div>
                        </td>

                        <td className="px-4 py-[15px] text-[11px] text-slate-500">
                          {medicine.genericName}
                        </td>

                        <td className="px-4 py-[15px]">
                          <span className="inline-flex rounded-full border border-sky-100 bg-sky-50 px-2.5 py-1 text-[9px] font-medium text-sky-700">
                            {medicine.category}
                          </span>
                        </td>

                        <td className="px-4 py-[15px] text-[11px] text-slate-500">
                          {medicine.companyName}
                        </td>

                        <td className="px-4 py-[15px] text-[11px] text-slate-500">
                          {medicine.unit}
                        </td>

                        <td className="px-4 py-[15px] text-[11px] text-slate-500">
                          ৳
                          {medicine.purchasePrice.toLocaleString(
                            "en-US",
                          )}
                        </td>

                        <td className="px-4 py-[15px] text-[11px] font-medium text-emerald-700">
                          ৳
                          {medicine.sellingPrice.toLocaleString(
                            "en-US",
                          )}
                        </td>

                        <td className="px-4 py-[15px] text-[11px] font-medium text-slate-700">
                          {medicine.stockQuantity}
                        </td>

                        <td className="px-4 py-[15px] text-[10px] text-slate-500">
                          {medicine.expiryDate}
                        </td>

                        <td className="px-4 py-[15px]">
                          <span
                            className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[9px] font-medium ${getStatusClass(
                              displayStatus,
                            )}`}
                          >
                            {displayStatus}
                          </span>
                        </td>

                        <td className="px-4 py-[15px]">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                openEditModal(medicine)
                              }
                              aria-label={`Edit ${medicine.name}`}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-sky-600 transition hover:bg-sky-50"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleDelete(medicine)
                              }
                              aria-label={`Delete ${medicine.name}`}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-rose-500 transition hover:bg-rose-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  },
                )}

                {filteredMedicines.length === 0 ? (
                  <tr>
                    <td
                      colSpan={12}
                      className="px-5 py-16 text-center"
                    >
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                        <Search className="h-5 w-5" />
                      </div>

                      <p className="mt-3 text-sm font-medium text-slate-700">
                        No medicines found
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Try changing your search or
                        category filter.
                      </p>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
            <p className="text-[11px] text-slate-500">
              Showing {filteredMedicines.length} of{" "}
              {medicines.length} medicines
            </p>
          </div>
        </section>
      </div>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]">
          <div className="max-h-[92vh] w-full max-w-[760px] overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-slate-950">
                  {editingMedicine
                    ? "Edit Medicine"
                    : "Add New Medicine"}
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  {editingMedicine
                    ? "Update the selected medicine information."
                    : "Enter the medicine information below."}
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

            <form
              onSubmit={handleSubmit}
              className="max-h-[calc(92vh-82px)] overflow-y-auto"
            >
              <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-[12px] font-medium text-slate-700">
                    Medicine Name
                  </label>

                  <input
                    type="text"
                    value={form.name}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        name: event.target.value,
                      })
                    }
                    placeholder="Example: Napa 500mg"
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-[13px] outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[12px] font-medium text-slate-700">
                    Generic Name
                  </label>

                  <input
                    type="text"
                    value={form.genericName}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        genericName: event.target.value,
                      })
                    }
                    placeholder="Example: Paracetamol"
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-[13px] outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[12px] font-medium text-slate-700">
                    Category
                  </label>

                  <select
                    value={form.category}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        category: event.target.value,
                      })
                    }
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] text-slate-700 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    required
                  >
                    <option value="">
                      Select category
                    </option>

                    {categories.map((category) => (
                      <option
                        key={category}
                        value={category}
                      >
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-[12px] font-medium text-slate-700">
                    Company Name
                  </label>

                  <input
                    type="text"
                    value={form.companyName}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        companyName:
                          event.target.value,
                      })
                    }
                    placeholder="Example: Square"
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-[13px] outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[12px] font-medium text-slate-700">
                    Batch Number
                  </label>

                  <input
                    type="text"
                    value={form.batchNo}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        batchNo: event.target.value,
                      })
                    }
                    placeholder="Example: NP-2601"
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-[13px] outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[12px] font-medium text-slate-700">
                    Unit
                  </label>

                  <select
                    value={form.unit}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        unit: event.target.value,
                      })
                    }
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] text-slate-700 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    required
                  >
                    <option value="">
                      Select unit
                    </option>

                    {units.map((unit) => (
                      <option
                        key={unit}
                        value={unit}
                      >
                        {unit}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-[12px] font-medium text-slate-700">
                    Purchase Price (৳)
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.purchasePrice}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        purchasePrice:
                          event.target.value,
                      })
                    }
                    placeholder="0"
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-[13px] outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[12px] font-medium text-slate-700">
                    Selling Price (৳)
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.sellingPrice}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        sellingPrice:
                          event.target.value,
                      })
                    }
                    placeholder="0"
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-[13px] outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[12px] font-medium text-slate-700">
                    Stock Quantity
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={form.stockQuantity}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        stockQuantity:
                          event.target.value,
                      })
                    }
                    placeholder="0"
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-[13px] outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[12px] font-medium text-slate-700">
                    Reorder Level
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={form.reorderLevel}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        reorderLevel:
                          event.target.value,
                      })
                    }
                    placeholder="0"
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-[13px] outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[12px] font-medium text-slate-700">
                    Expiry Date
                  </label>

                  <input
                    type="date"
                    value={form.expiryDate}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        expiryDate:
                          event.target.value,
                      })
                    }
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-[13px] text-slate-700 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[12px] font-medium text-slate-700">
                    Record Status
                  </label>

                  <select
                    value={form.status}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        status: event.target
                          .value as MedicineStatus,
                      })
                    }
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] text-slate-700 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  >
                    <option value="active">
                      Active
                    </option>

                    <option value="inactive">
                      Inactive
                    </option>
                  </select>
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
                  {editingMedicine
                    ? "Update Medicine"
                    : "Save Medicine"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}