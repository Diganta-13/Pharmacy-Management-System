"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  FormEvent,
  ReactNode,
} from "react";

import {
  Loader2,
  Package,
  Pencil,
  Pill,
  Plus,
  Power,
  Search,
  X,
} from "lucide-react";

/* =========================================================
   TYPES
========================================================= */

type MedicineStatus =
  | "active"
  | "inactive";

type ReorderMode =
  | "MANUAL"
  | "AUTO";

type MedicineUnit = {
  id: string;

  unitName: string;

  conversionToBase: number;

  sellable: boolean;

  purchasable: boolean;

  isBaseUnit: boolean;
};

type Medicine = {
  id: string;

  databaseId?: number;

  name: string;

  genericName: string;

  category: string;

  companyName: string;

  dosageForm: string;

  strength: string;

  baseUnit: string;

  /*
   * Effective reorder level used for stock status.
   *
   * MANUAL -> manualReorderLevel
   * AUTO   -> autoReorderLevel
   */
  reorderLevel: number;

  /*
   * Kept separately so editing an AUTO medicine
   * never overwrites its manual fallback with the
   * calculated AUTO threshold.
   */
  manualReorderLevel?: number;

  autoReorderLevel?: number;

  reorderMode?: ReorderMode;

  prescriptionRequired: boolean;

  status: MedicineStatus;

  units: MedicineUnit[];
};

type MedicineUnitForm = {
  id: string;

  unitName: string;

  conversionToBase: string;

  sellable: boolean;

  purchasable: boolean;

  isBaseUnit: boolean;
};

type MedicineForm = {
  name: string;

  genericName: string;

  category: string;

  companyName: string;

  dosageForm: string;

  strength: string;

  baseUnit: string;

  reorderLevel: string;

  reorderMode: ReorderMode;

  prescriptionRequired: boolean;

  status: MedicineStatus;

  units: MedicineUnitForm[];
};

type CategoryOption = {
  id: number;

  name: string;

  status:
    | "active"
    | "inactive";
};

type MedicinesApiResponse = {
  success: boolean;

  message?: string;

  data?: Medicine[];
};

type CategoriesApiResponse = {
  success: boolean;

  message?: string;

  data?: CategoryOption[];
};

type MutationApiResponse = {
  success: boolean;

  message?: string;

  data?: unknown;
};

/* =========================================================
   STATIC OPTIONS
========================================================= */

const dosageForms = [
  "Tablet",
  "Capsule",
  "Syrup",
  "Suspension",
  "Cream",
  "Ointment",
  "Injection",
  "Drops",
  "Inhaler",
  "Sachet",
  "Other",
];

const baseUnits = [
  "Tablet",
  "Capsule",
  "Bottle",
  "Tube",
  "Vial",
  "Ampoule",
  "Sachet",
  "Piece",
  "Inhaler",
  "Pen",
  "Cartridge",
  "Packet",
  "Jar",
  "Other",
];

/* =========================================================
   EMPTY FORM
========================================================= */

function createEmptyForm(): MedicineForm {
  return {
    name: "",

    genericName: "",

    category: "",

    companyName: "",

    dosageForm: "",

    strength: "",

    baseUnit: "Tablet",

    reorderLevel: "",

    reorderMode: "MANUAL",

    prescriptionRequired: false,

    status: "active",

    units: [
      {
        id: "BASE-UNIT",

        unitName: "Tablet",

        conversionToBase: "1",

        sellable: true,

        purchasable: false,

        isBaseUnit: true,
      },
    ],
  };
}

/* =========================================================
   PAGE
========================================================= */

export default function MedicinesPage() {
  /* =======================================================
     DATABASE DATA
  ======================================================= */

  const [
    medicines,
    setMedicines,
  ] =
    useState<Medicine[]>([]);

  const [
    categoryOptions,
    setCategoryOptions,
  ] =
    useState<CategoryOption[]>([]);

  /* =======================================================
     FILTERS
  ======================================================= */

  const [
    searchTerm,
    setSearchTerm,
  ] =
    useState("");

  const [
    categoryFilter,
    setCategoryFilter,
  ] =
    useState("All");

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState("All");

  /* =======================================================
     MODAL
  ======================================================= */

  const [
    isModalOpen,
    setIsModalOpen,
  ] =
    useState(false);

  const [
    editingMedicine,
    setEditingMedicine,
  ] =
    useState<Medicine | null>(
      null,
    );

  const [
    form,
    setForm,
  ] =
    useState<MedicineForm>(
      createEmptyForm(),
    );

  /* =======================================================
     ASYNC STATE
  ======================================================= */

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true);

  const [
    isSaving,
    setIsSaving,
  ] =
    useState(false);

  const [
    statusUpdatingId,
    setStatusUpdatingId,
  ] =
    useState<string | null>(
      null,
    );

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState("");

  /* =======================================================
     CATEGORY OPTIONS
  ======================================================= */

  /*
   * Filter dropdown:
   * show every category currently used by medicines
   * plus categories coming from DB.
   */
  const categories =
    useMemo(() => {
      const names =
        new Set<string>();

      categoryOptions.forEach(
        (category) => {
          names.add(
            category.name,
          );
        },
      );

      medicines.forEach(
        (medicine) => {
          if (
            medicine.category
          ) {
            names.add(
              medicine.category,
            );
          }
        },
      );

      return Array.from(
        names,
      ).sort((a, b) =>
        a.localeCompare(b),
      );
    }, [
      categoryOptions,
      medicines,
    ]);

  /*
   * Add/Edit form normally uses
   * ACTIVE categories.
   *
   * If an existing medicine belongs
   * to a category that later became
   * inactive, preserve that category
   * while editing.
   */
  const formCategories =
    useMemo(() => {
      const active =
        categoryOptions
          .filter(
            (category) =>
              category.status ===
              "active",
          )
          .map(
            (category) =>
              category.name,
          );

      if (
        form.category &&
        !active.includes(
          form.category,
        )
      ) {
        return [
          form.category,
          ...active,
        ];
      }

      return active;
    }, [
      categoryOptions,
      form.category,
    ]);

  /* =======================================================
     LOAD MEDICINES
  ======================================================= */

  async function loadMedicines() {
    try {
      setErrorMessage("");

      const response =
        await fetch(
          "/api/medicines",
          {
            method: "GET",

            cache:
              "no-store",
          },
        );

      const result:
        MedicinesApiResponse =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Failed to load medicines.",
        );
      }

      setMedicines(
        result.data ?? [],
      );
    } catch (error) {
      console.error(
        "Load medicines error:",
        error,
      );

      const message =
        error instanceof Error
          ? error.message
          : "Failed to load medicines.";

      setErrorMessage(
        message,
      );

      throw error;
    }
  }

  /* =======================================================
     LOAD CATEGORIES
  ======================================================= */

  async function loadCategories() {
    try {
      const response =
        await fetch(
          "/api/categories",
          {
            method: "GET",

            cache:
              "no-store",
          },
        );

      const result:
        CategoriesApiResponse =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Failed to load categories.",
        );
      }

      setCategoryOptions(
        result.data ?? [],
      );
    } catch (error) {
      console.error(
        "Load medicine categories error:",
        error,
      );

      throw error;
    }
  }

  /* =======================================================
     INITIAL DATABASE LOAD
  ======================================================= */

  useEffect(() => {
    const controller =
      new AbortController();

    async function loadInitialData() {
      try {
        const [
          medicineResponse,
          categoryResponse,
        ] =
          await Promise.all([
            fetch(
              "/api/medicines",
              {
                method:
                  "GET",

                cache:
                  "no-store",

                signal:
                  controller.signal,
              },
            ),

            fetch(
              "/api/categories",
              {
                method:
                  "GET",

                cache:
                  "no-store",

                signal:
                  controller.signal,
              },
            ),
          ]);

        const medicineResult:
          MedicinesApiResponse =
          await medicineResponse.json();

        const categoryResult:
          CategoriesApiResponse =
          await categoryResponse.json();

        if (
          !medicineResponse.ok ||
          !medicineResult.success
        ) {
          throw new Error(
            medicineResult.message ||
              "Failed to load medicines.",
          );
        }

        if (
          !categoryResponse.ok ||
          !categoryResult.success
        ) {
          throw new Error(
            categoryResult.message ||
              "Failed to load categories.",
          );
        }

        if (
          !controller.signal
            .aborted
        ) {
          setMedicines(
            medicineResult.data ??
              [],
          );

          setCategoryOptions(
            categoryResult.data ??
              [],
          );
        }
      } catch (error) {
        if (
          error instanceof
            Error &&
          error.name ===
            "AbortError"
        ) {
          return;
        }

        console.error(
          "Initial medicine load error:",
          error,
        );

        if (
          !controller.signal
            .aborted
        ) {
          setErrorMessage(
            error instanceof
              Error
              ? error.message
              : "Failed to load medicines.",
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

    void loadInitialData();

    return () => {
      controller.abort();
    };
  }, []);

  /* =======================================================
     FILTERED MEDICINES
  ======================================================= */

  const filteredMedicines =
    useMemo(() => {
      const search =
        searchTerm
          .trim()
          .toLowerCase();

      return medicines.filter(
        (medicine) => {
          const matchesSearch =
            medicine.name
              .toLowerCase()
              .includes(
                search,
              ) ||

            medicine.genericName
              .toLowerCase()
              .includes(
                search,
              ) ||

            medicine.companyName
              .toLowerCase()
              .includes(
                search,
              ) ||

            medicine.id
              .toLowerCase()
              .includes(
                search,
              );

          const matchesCategory =
            categoryFilter ===
              "All" ||
            medicine.category ===
              categoryFilter;

          const matchesStatus =
            statusFilter ===
              "All" ||
            medicine.status ===
              statusFilter;

          return (
            matchesSearch &&
            matchesCategory &&
            matchesStatus
          );
        },
      );
    }, [
      medicines,
      searchTerm,
      categoryFilter,
      statusFilter,
    ]);

  /* =======================================================
     STATISTICS
  ======================================================= */

  const statistics =
    useMemo(() => {
      const active =
        medicines.filter(
          (medicine) =>
            medicine.status ===
            "active",
        ).length;

      const prescriptionRequired =
        medicines.filter(
          (medicine) =>
            medicine.prescriptionRequired,
        ).length;

      const configuredUnits =
        medicines.reduce(
          (
            total,
            medicine,
          ) =>
            total +
            medicine.units
              .length,

          0,
        );

      return {
        total:
          medicines.length,

        active,

        prescriptionRequired,

        configuredUnits,
      };
    }, [medicines]);

  /* =======================================================
     OPEN ADD
  ======================================================= */

  function openAddModal() {
    setEditingMedicine(
      null,
    );

    setForm(
      createEmptyForm(),
    );

    setIsModalOpen(
      true,
    );
  }

  /* =======================================================
     OPEN EDIT
  ======================================================= */

  function openEditModal(
    medicine: Medicine,
  ) {
    setEditingMedicine(
      medicine,
    );

    setForm({
      name:
        medicine.name,

      genericName:
        medicine.genericName,

      category:
        medicine.category,

      companyName:
        medicine.companyName,

      dosageForm:
        medicine.dosageForm,

      strength:
        medicine.strength,

      baseUnit:
        medicine.baseUnit,

      reorderLevel:
        String(
          medicine.manualReorderLevel ??
            medicine.reorderLevel,
        ),

      reorderMode:
        medicine.reorderMode ??
        "MANUAL",

      prescriptionRequired:
        medicine.prescriptionRequired,

      status:
        medicine.status,

      units:
        medicine.units.map(
          (unit) => ({
            id:
              unit.id,

            unitName:
              unit.unitName,

            conversionToBase:
              String(
                unit.conversionToBase,
              ),

            sellable:
              unit.sellable,

            purchasable:
              unit.purchasable,

            isBaseUnit:
              unit.isBaseUnit,
          }),
        ),
    });

    setIsModalOpen(
      true,
    );
  }

  /* =======================================================
     CLOSE MODAL
  ======================================================= */

  function closeModal() {
    if (isSaving) {
      return;
    }

    setIsModalOpen(
      false,
    );

    setEditingMedicine(
      null,
    );

    setForm(
      createEmptyForm(),
    );
  }

  /* =======================================================
     BASE UNIT CHANGE
  ======================================================= */

  function handleBaseUnitChange(
    newBaseUnit: string,
  ) {
    setForm(
      (currentForm) => {
        const newUnits =
          currentForm.units
            .filter(
              (unit) =>
                unit.isBaseUnit ||
                unit.unitName
                  .trim()
                  .toLowerCase() !==
                  newBaseUnit
                    .trim()
                    .toLowerCase(),
            )
            .map(
              (unit) =>
                unit.isBaseUnit
                  ? {
                      ...unit,

                      unitName:
                        newBaseUnit,

                      conversionToBase:
                        "1",
                    }
                  : unit,
            );

        return {
          ...currentForm,

          baseUnit:
            newBaseUnit,

          units:
            newUnits,
        };
      },
    );
  }

  /* =======================================================
     ADD PACKAGING UNIT
  ======================================================= */

  function addPackagingUnit() {
    setForm(
      (currentForm) => ({
        ...currentForm,

        units: [
          ...currentForm.units,

          {
            id: `NEW-UNIT-${Date.now()}-${currentForm.units.length + 1}`,

            unitName: "",

            conversionToBase:
              "",

            sellable:
              true,

            purchasable:
              true,

            isBaseUnit:
              false,
          },
        ],
      }),
    );
  }

  /* =======================================================
     UPDATE UNIT
  ======================================================= */

  function updateUnit(
    unitId: string,

    field:
      | "unitName"
      | "conversionToBase"
      | "sellable"
      | "purchasable",

    value:
      | string
      | boolean,
  ) {
    setForm(
      (currentForm) => ({
        ...currentForm,

        units:
          currentForm.units.map(
            (unit) =>
              unit.id ===
              unitId
                ? {
                    ...unit,

                    [field]:
                      value,
                  }
                : unit,
          ),
      }),
    );
  }

  /* =======================================================
     REMOVE PACKAGING UNIT
  ======================================================= */

  function removePackagingUnit(
    unitId: string,
  ) {
    setForm(
      (currentForm) => ({
        ...currentForm,

        units:
          currentForm.units.filter(
            (unit) =>
              unit.id !==
                unitId ||
              unit.isBaseUnit,
          ),
      }),
    );
  }

  /* =======================================================
     FORM VALIDATION
  ======================================================= */

  function validateForm() {
    if (
      !form.name.trim()
    ) {
      window.alert(
        "Medicine name is required.",
      );

      return false;
    }

    if (
      !form.genericName.trim()
    ) {
      window.alert(
        "Generic name is required.",
      );

      return false;
    }

    if (
      !form.category
    ) {
      window.alert(
        "Please select a category.",
      );

      return false;
    }

    if (
      !form.companyName.trim()
    ) {
      window.alert(
        "Company name is required.",
      );

      return false;
    }

    if (
      !form.dosageForm
    ) {
      window.alert(
        "Please select a dosage form.",
      );

      return false;
    }

    if (
      !form.strength.trim()
    ) {
      window.alert(
        "Strength is required.",
      );

      return false;
    }

    if (
      !form.baseUnit
    ) {
      window.alert(
        "Please select a base unit.",
      );

      return false;
    }

    const reorderLevel =
      Number(
        form.reorderLevel,
      );

    if (
      form.reorderLevel.trim() ===
        "" ||
      Number.isNaN(
        reorderLevel,
      ) ||
      reorderLevel < 0 ||
      !Number.isInteger(
        reorderLevel,
      )
    ) {
      window.alert(
        "Please enter a valid whole-number reorder level.",
      );

      return false;
    }

    if (
      form.units.length ===
      0
    ) {
      window.alert(
        "At least one unit configuration is required.",
      );

      return false;
    }

    const unitNames =
      form.units.map(
        (unit) =>
          unit.unitName
            .trim()
            .toLowerCase(),
      );

    if (
      unitNames.some(
        (name) =>
          !name,
      )
    ) {
      window.alert(
        "Every packaging unit must have a unit name.",
      );

      return false;
    }

    if (
      new Set(unitNames)
        .size !==
      unitNames.length
    ) {
      window.alert(
        "Duplicate unit names are not allowed.",
      );

      return false;
    }

    const baseUnitsFound =
      form.units.filter(
        (unit) =>
          unit.isBaseUnit,
      );

    if (
      baseUnitsFound.length !==
      1
    ) {
      window.alert(
        "Exactly one base unit is required.",
      );

      return false;
    }

    if (
      baseUnitsFound[0].unitName
        .trim()
        .toLowerCase() !==
      form.baseUnit
        .trim()
        .toLowerCase()
    ) {
      window.alert(
        "Configured base unit does not match selected base unit.",
      );

      return false;
    }

    for (
      const unit of
      form.units
    ) {
      const conversion =
        Number(
          unit.conversionToBase,
        );

      if (
        Number.isNaN(
          conversion,
        ) ||
        conversion <= 0 ||
        !Number.isInteger(
          conversion,
        )
      ) {
        window.alert(
          `Conversion for ${unit.unitName || "a unit"} must be a positive whole number.`,
        );

        return false;
      }

      if (
        unit.isBaseUnit &&
        conversion !== 1
      ) {
        window.alert(
          "Base unit conversion must always be 1.",
        );

        return false;
      }

      if (
        !unit.isBaseUnit &&
        conversion <= 1
      ) {
        window.alert(
          `${unit.unitName} must contain more than 1 ${form.baseUnit}.`,
        );

        return false;
      }

      if (
        !unit.sellable &&
        !unit.purchasable
      ) {
        window.alert(
          `${unit.unitName} must be sellable, purchasable, or both.`,
        );

        return false;
      }
    }

    return true;
  }

  /* =======================================================
     ADD / EDIT MEDICINE
  ======================================================= */

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (isSaving) {
      return;
    }

    if (
      !validateForm()
    ) {
      return;
    }

    const payload = {
      name:
        form.name.trim(),

      genericName:
        form.genericName.trim(),

      category:
        form.category,

      companyName:
        form.companyName.trim(),

      dosageForm:
        form.dosageForm,

      strength:
        form.strength.trim(),

      baseUnit:
        form.baseUnit,

      reorderLevel:
        Number(
          form.reorderLevel,
        ),

      reorderMode:
        form.reorderMode,

      prescriptionRequired:
        form.prescriptionRequired,

      status:
        form.status,

      units:
        form.units.map(
          (unit) => ({
            /*
             * Numeric IDs from DB are preserved
             * during edit.
             *
             * NEW-UNIT-* IDs are ignored by
             * the API and inserted as new units.
             */
            id:
              unit.id,

            unitName:
              unit.unitName.trim(),

            conversionToBase:
              Number(
                unit.conversionToBase,
              ),

            sellable:
              unit.sellable,

            purchasable:
              unit.purchasable,

            isBaseUnit:
              unit.isBaseUnit,
          }),
        ),
    };

    try {
      setIsSaving(
        true,
      );

      setErrorMessage(
        "",
      );

      const url =
        editingMedicine
          ? `/api/medicines/${editingMedicine.id}`
          : "/api/medicines";

      const method =
        editingMedicine
          ? "PATCH"
          : "POST";

      const response =
        await fetch(
          url,
          {
            method,

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                payload,
              ),
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
            "Medicine operation failed.",
        );
      }

      /*
       * Do not manually mutate local medicine data.
       * Reload from DB so database remains
       * the single source of truth.
       */
      await loadMedicines();

      setIsModalOpen(
        false,
      );

      setEditingMedicine(
        null,
      );

      setForm(
        createEmptyForm(),
      );
    } catch (error) {
      console.error(
        "Medicine save error:",
        error,
      );

      const message =
        error instanceof Error
          ? error.message
          : "Medicine operation failed.";

      setErrorMessage(
        message,
      );

      window.alert(
        message,
      );
    } finally {
      setIsSaving(
        false,
      );
    }
  }

  /* =======================================================
     ACTIVATE / DEACTIVATE
  ======================================================= */

  async function toggleMedicineStatus(
    medicine: Medicine,
  ) {
    if (
      statusUpdatingId
    ) {
      return;
    }

    const nextStatus:
      MedicineStatus =
      medicine.status ===
      "active"
        ? "inactive"
        : "active";

    const action =
      nextStatus ===
      "inactive"
        ? "deactivate"
        : "activate";

    const confirmed =
      window.confirm(
        `Are you sure you want to ${action} ${medicine.name}?`,
      );

    if (
      !confirmed
    ) {
      return;
    }

    try {
      setStatusUpdatingId(
        medicine.id,
      );

      setErrorMessage(
        "",
      );

      const response =
        await fetch(
          `/api/medicines/${medicine.id}`,
          {
            method:
              "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                mode:
                  "status",

                status:
                  nextStatus,
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
            "Failed to update medicine status.",
        );
      }

      await loadMedicines();
    } catch (error) {
      console.error(
        "Medicine status error:",
        error,
      );

      const message =
        error instanceof Error
          ? error.message
          : "Failed to update medicine status.";

      setErrorMessage(
        message,
      );

      window.alert(
        message,
      );
    } finally {
      setStatusUpdatingId(
        null,
      );
    }
  }

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

      await Promise.all([
        loadMedicines(),
        loadCategories(),
      ]);
    } catch {
      // Individual loaders already handle/log errors.
    } finally {
      setIsLoading(
        false,
      );
    }
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <>
      <div className="mx-auto w-full max-w-[1600px] space-y-5">

        {/* =================================================
            PAGE HEADER
        ================================================= */}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div>

            <h1 className="text-xl font-semibold text-slate-900">
              Medicines
            </h1>

            <p className="mt-1 text-[12px] text-slate-500">
              Manage medicine master data and packaging units.
            </p>

          </div>

          <button
            type="button"
            onClick={
              openAddModal
            }
            disabled={
              isLoading
            }
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 text-[12px] font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-sky-300"
          >

            <Plus className="h-4 w-4" />

            Add Medicine

          </button>

        </div>

        {/* =================================================
            IMPORTANT INFO
        ================================================= */}

        <div className="rounded-2xl border border-sky-100 bg-sky-50/70 px-4 py-3">

          <div className="flex gap-3">

            <Pill className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />

            <div>

              <p className="text-[12px] font-semibold text-sky-900">
                Medicine Master
              </p>

              <p className="mt-1 text-[11px] leading-5 text-sky-700">
                Batch number, expiry date, stock quantity,
                purchase cost and batch selling price are
                intentionally not stored here. Those will be
                managed through Purchase and Batch Inventory.
              </p>

            </div>

          </div>

        </div>

        {/* =================================================
            DATABASE ERROR
        ================================================= */}

        {errorMessage ? (

          <div className="flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">

            <p className="text-[11px] text-rose-700">
              {errorMessage}
            </p>

            <button
              type="button"
              onClick={() =>
                void retryLoad()
              }
              className="text-left text-[10px] font-semibold text-rose-700 underline sm:text-right"
            >
              Retry
            </button>

          </div>

        ) : null}

        {/* =================================================
            STATISTICS
        ================================================= */}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">

          <StatCard
            label="Total Medicines"
            value={
              statistics.total
            }
            description="Medicine master records"
          />

          <StatCard
            label="Active Medicines"
            value={
              statistics.active
            }
            description="Available for operations"
          />

          <StatCard
            label="Prescription Required"
            value={
              statistics.prescriptionRequired
            }
            description="Rx controlled products"
          />

          <StatCard
            label="Configured Units"
            value={
              statistics.configuredUnits
            }
            description="Base + packaging units"
          />

        </div>

        {/* =================================================
            SEARCH + FILTER
        ================================================= */}

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_220px_180px]">

            <div className="relative">

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
                placeholder="Search medicine, generic, company or code..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-[12px] text-slate-700 outline-none placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              />

            </div>

            <select
              value={
                categoryFilter
              }
              onChange={(
                event,
              ) =>
                setCategoryFilter(
                  event.target
                    .value,
                )
              }
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-[12px] text-slate-700 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            >

              <option value="All">
                All Categories
              </option>

              {categories.map(
                (category) => (

                  <option
                    key={
                      category
                    }
                    value={
                      category
                    }
                  >
                    {category}
                  </option>

                ),
              )}

            </select>

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
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-[12px] text-slate-700 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            >

              <option value="All">
                All Status
              </option>

              <option value="active">
                Active
              </option>

              <option value="inactive">
                Inactive
              </option>

            </select>

          </div>

        </section>

        {/* =================================================
            TABLE
        ================================================= */}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="overflow-x-auto">

            <table className="w-full min-w-[1250px] border-collapse text-left">

              <thead>

                <tr className="border-b border-slate-200 bg-slate-50/80">

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
                    Form / Strength
                  </TableHead>

                  <TableHead>
                    Base Unit
                  </TableHead>

                  <TableHead>
                    Reorder Level
                  </TableHead>

                  <TableHead>
                    Packaging
                  </TableHead>

                  <TableHead>
                    Rx
                  </TableHead>

                  <TableHead>
                    Status
                  </TableHead>

                  <th className="sticky right-0 z-10 w-[115px] bg-slate-50 px-4 py-4 text-[10px] font-medium text-slate-500">
                    Action
                  </th>

                </tr>

              </thead>

              <tbody>

                {isLoading ? (

                  <tr>

                    <td
                      colSpan={
                        11
                      }
                      className="px-5 py-16 text-center"
                    >

                      <Loader2 className="mx-auto h-7 w-7 animate-spin text-sky-600" />

                      <p className="mt-3 text-sm font-medium text-slate-700">
                        Loading medicines...
                      </p>

                      <p className="mt-1 text-[11px] text-slate-400">
                        Reading medicine master data from the database.
                      </p>

                    </td>

                  </tr>

                ) : (

                  <>
                    {filteredMedicines.map(
                      (
                        medicine,
                      ) => (

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
                                medicine.name
                              }
                            </p>

                            <p className="mt-1 font-mono text-[9px] text-slate-400">
                              {
                                medicine.id
                              }
                            </p>

                          </td>

                          {/* GENERIC */}

                          <td className="px-4 py-4 text-[11px] text-slate-600">
                            {
                              medicine.genericName
                            }
                          </td>

                          {/* CATEGORY */}

                          <td className="px-4 py-4">

                            <span className="inline-flex rounded-full border border-sky-100 bg-sky-50 px-2.5 py-1 text-[9px] font-medium text-sky-700">
                              {
                                medicine.category
                              }
                            </span>

                          </td>

                          {/* COMPANY */}

                          <td className="px-4 py-4 text-[11px] text-slate-600">

                            {medicine.companyName ||
                              "-"}

                          </td>

                          {/* FORM / STRENGTH */}

                          <td className="px-4 py-4">

                            <p className="text-[11px] font-medium text-slate-700">
                              {medicine.dosageForm ||
                                "-"}
                            </p>

                            <p className="mt-1 text-[10px] text-slate-400">
                              {medicine.strength ||
                                "-"}
                            </p>

                          </td>

                          {/* BASE UNIT */}

                          <td className="px-4 py-4">

                            <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-700">

                              {
                                medicine.baseUnit
                              }

                            </span>

                          </td>

                          {/* REORDER */}

                          <td className="px-4 py-4">

                            <p className="text-[11px] font-semibold text-slate-800">

                              {medicine.reorderLevel.toLocaleString(
                                "en-US",
                              )}

                            </p>

                            <p className="mt-1 text-[9px] text-slate-400">
                              {
                                medicine.baseUnit
                              }
                            </p>

                            <p
                              className={`mt-1 text-[8px] font-medium ${
                                medicine.reorderMode ===
                                "AUTO"
                                  ? "text-violet-600"
                                  : "text-slate-400"
                              }`}
                            >
                              {medicine.reorderMode ===
                              "AUTO"
                                ? "Auto"
                                : "Manual"}
                            </p>

                          </td>

                          {/* PACKAGING */}

                          <td className="max-w-[260px] px-4 py-4">

                            <div className="flex flex-wrap gap-1.5">

                              {medicine.units.map(
                                (
                                  unit,
                                ) => (

                                  <span
                                    key={
                                      unit.id
                                    }
                                    className={`inline-flex rounded-lg border px-2 py-1 text-[9px] ${
                                      unit.isBaseUnit
                                        ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                                        : "border-slate-200 bg-white text-slate-600"
                                    }`}
                                  >

                                    {
                                      unit.unitName
                                    }

                                    <span className="ml-1 font-semibold">
                                      ×
                                      {
                                        unit.conversionToBase
                                      }
                                    </span>

                                  </span>

                                ),
                              )}

                            </div>

                          </td>

                          {/* RX */}

                          <td className="px-4 py-4">

                            {medicine.prescriptionRequired ? (

                              <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-[9px] font-medium text-amber-700">
                                Required
                              </span>

                            ) : (

                              <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-medium text-slate-500">
                                No
                              </span>

                            )}

                          </td>

                          {/* STATUS */}

                          <td className="px-4 py-4">

                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-[9px] font-medium ${
                                medicine.status ===
                                "active"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-slate-200 text-slate-600"
                              }`}
                            >
                              {
                                medicine.status
                              }
                            </span>

                          </td>

                          {/* ACTION */}

                          <td className="sticky right-0 bg-white px-4 py-4">

                            <div className="flex items-center gap-1">

                              <button
                                type="button"
                                onClick={() =>
                                  openEditModal(
                                    medicine,
                                  )
                                }
                                disabled={
                                  statusUpdatingId ===
                                  medicine.id
                                }
                                title="Edit medicine"
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-sky-600 transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-40"
                              >

                                <Pencil className="h-3.5 w-3.5" />

                              </button>

                              <button
                                type="button"
                                disabled={
                                  statusUpdatingId !==
                                  null
                                }
                                onClick={() =>
                                  void toggleMedicineStatus(
                                    medicine,
                                  )
                                }
                                title={
                                  medicine.status ===
                                  "active"
                                    ? "Deactivate"
                                    : "Activate"
                                }
                                className={`flex h-8 w-8 items-center justify-center rounded-lg transition disabled:cursor-not-allowed disabled:opacity-50 ${
                                  medicine.status ===
                                  "active"
                                    ? "text-rose-500 hover:bg-rose-50"
                                    : "text-emerald-600 hover:bg-emerald-50"
                                }`}
                              >

                                {statusUpdatingId ===
                                medicine.id ? (

                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />

                                ) : (

                                  <Power className="h-3.5 w-3.5" />

                                )}

                              </button>

                            </div>

                          </td>

                        </tr>

                      ),
                    )}

                    {filteredMedicines.length ===
                    0 ? (

                      <tr>

                        <td
                          colSpan={
                            11
                          }
                          className="px-5 py-16 text-center"
                        >

                          <Pill className="mx-auto h-7 w-7 text-slate-300" />

                          <p className="mt-3 text-sm font-medium text-slate-700">
                            No medicines found
                          </p>

                          <p className="mt-1 text-[11px] text-slate-400">
                            Try changing your search or filters.
                          </p>

                        </td>

                      </tr>

                    ) : null}
                  </>

                )}

              </tbody>

            </table>

          </div>

        </section>

      </div>

      {/* ===================================================
          ADD / EDIT MODAL
      =================================================== */}

      {isModalOpen ? (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]">

          <div className="max-h-[94vh] w-full max-w-[900px] overflow-y-auto rounded-2xl bg-white shadow-2xl">

            {/* MODAL HEADER */}

            <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">

              <div>

                <h2 className="text-base font-semibold text-slate-950">

                  {editingMedicine
                    ? "Edit Medicine"
                    : "Add Medicine"}

                </h2>

                <p className="mt-1 text-[10px] text-slate-500">
                  Configure medicine identity and packaging units.
                </p>

              </div>

              <button
                type="button"
                onClick={
                  closeModal
                }
                disabled={
                  isSaving
                }
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              >

                <X className="h-5 w-5" />

              </button>

            </div>

            <form
              onSubmit={
                handleSubmit
              }
            >

              <div className="space-y-6 p-5">

                {/* =========================================
                    BASIC INFORMATION
                ========================================= */}

                <div>

                  <SectionTitle
                    title="Medicine Information"
                    description="Basic product identity. Stock and batch data are handled separately."
                  />

                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">

                    <FormField label="Medicine Name *">

                      <input
                        type="text"
                        value={
                          form.name
                        }
                        disabled={
                          isSaving
                        }
                        onChange={(
                          event,
                        ) =>
                          setForm(
                            (
                              currentForm,
                            ) => ({
                              ...currentForm,

                              name:
                                event
                                  .target
                                  .value,
                            }),
                          )
                        }
                        placeholder="e.g. Napa 500mg"
                        className={`${inputClass} disabled:bg-slate-100`}
                      />

                    </FormField>

                    <FormField label="Generic Name *">

                      <input
                        type="text"
                        value={
                          form.genericName
                        }
                        disabled={
                          isSaving
                        }
                        onChange={(
                          event,
                        ) =>
                          setForm(
                            (
                              currentForm,
                            ) => ({
                              ...currentForm,

                              genericName:
                                event
                                  .target
                                  .value,
                            }),
                          )
                        }
                        placeholder="e.g. Paracetamol"
                        className={`${inputClass} disabled:bg-slate-100`}
                      />

                    </FormField>

                    <FormField label="Category *">

                      <select
                        value={
                          form.category
                        }
                        disabled={
                          isSaving
                        }
                        onChange={(
                          event,
                        ) =>
                          setForm(
                            (
                              currentForm,
                            ) => ({
                              ...currentForm,

                              category:
                                event
                                  .target
                                  .value,
                            }),
                          )
                        }
                        className={`${inputClass} disabled:bg-slate-100`}
                      >

                        <option value="">
                          Select category
                        </option>

                        {formCategories.map(
                          (
                            category,
                          ) => (

                            <option
                              key={
                                category
                              }
                              value={
                                category
                              }
                            >
                              {
                                category
                              }
                            </option>

                          ),
                        )}

                      </select>

                    </FormField>

                    <FormField label="Company / Manufacturer *">

                      <input
                        type="text"
                        value={
                          form.companyName
                        }
                        disabled={
                          isSaving
                        }
                        onChange={(
                          event,
                        ) =>
                          setForm(
                            (
                              currentForm,
                            ) => ({
                              ...currentForm,

                              companyName:
                                event
                                  .target
                                  .value,
                            }),
                          )
                        }
                        placeholder="e.g. Beximco"
                        className={`${inputClass} disabled:bg-slate-100`}
                      />

                    </FormField>

                    <FormField label="Dosage Form *">

                      <select
                        value={
                          form.dosageForm
                        }
                        disabled={
                          isSaving
                        }
                        onChange={(
                          event,
                        ) =>
                          setForm(
                            (
                              currentForm,
                            ) => ({
                              ...currentForm,

                              dosageForm:
                                event
                                  .target
                                  .value,
                            }),
                          )
                        }
                        className={`${inputClass} disabled:bg-slate-100`}
                      >

                        <option value="">
                          Select dosage form
                        </option>

                        {dosageForms.map(
                          (
                            dosageForm,
                          ) => (

                            <option
                              key={
                                dosageForm
                              }
                              value={
                                dosageForm
                              }
                            >
                              {
                                dosageForm
                              }
                            </option>

                          ),
                        )}

                      </select>

                    </FormField>

                    <FormField label="Strength *">

                      <input
                        type="text"
                        value={
                          form.strength
                        }
                        disabled={
                          isSaving
                        }
                        onChange={(
                          event,
                        ) =>
                          setForm(
                            (
                              currentForm,
                            ) => ({
                              ...currentForm,

                              strength:
                                event
                                  .target
                                  .value,
                            }),
                          )
                        }
                        placeholder="e.g. 500mg"
                        className={`${inputClass} disabled:bg-slate-100`}
                      />

                    </FormField>

                  </div>

                </div>

                {/* =========================================
                    INVENTORY CONFIGURATION
                ========================================= */}

                <div className="border-t border-slate-200 pt-6">

                  <SectionTitle
                    title="Inventory Configuration"
                    description="Base unit is the smallest unit used for inventory calculations."
                  />

                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">

                    <FormField label="Base Unit *">

                      <select
                        value={
                          form.baseUnit
                        }
                        disabled={
                          isSaving
                        }
                        onChange={(
                          event,
                        ) =>
                          handleBaseUnitChange(
                            event.target
                              .value,
                          )
                        }
                        className={`${inputClass} disabled:bg-slate-100`}
                      >

                        {baseUnits.map(
                          (unit) => (

                            <option
                              key={
                                unit
                              }
                              value={
                                unit
                              }
                            >
                              {unit}
                            </option>

                          ),
                        )}

                      </select>

                    </FormField>

                    <FormField
                      label={
                        form.reorderMode ===
                        "AUTO"
                          ? "Manual Fallback Level *"
                          : "Reorder Level *"
                      }
                      hint={`Stored in ${form.baseUnit}`}
                    >

                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={
                          form.reorderLevel
                        }
                        disabled={
                          isSaving
                        }
                        onChange={(
                          event,
                        ) =>
                          setForm(
                            (
                              currentForm,
                            ) => ({
                              ...currentForm,

                              reorderLevel:
                                event
                                  .target
                                  .value,
                            }),
                          )
                        }
                        placeholder="e.g. 500"
                        className={`${inputClass} disabled:bg-slate-100`}
                      />

                    </FormField>

                    <FormField
                      label="Reorder Mode *"
                      hint="Manual or sales-based auto"
                    >

                      <select
                        value={
                          form.reorderMode
                        }
                        disabled={
                          isSaving
                        }
                        onChange={(
                          event,
                        ) =>
                          setForm(
                            (
                              currentForm,
                            ) => ({
                              ...currentForm,

                              reorderMode:
                                event
                                  .target
                                  .value as ReorderMode,
                            }),
                          )
                        }
                        className={`${inputClass} disabled:bg-slate-100`}
                      >

                        <option value="MANUAL">
                          Manual
                        </option>

                        <option value="AUTO">
                          Auto - Sales Based
                        </option>

                      </select>

                    </FormField>

                  </div>

                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">

                    <p className="text-[11px] font-semibold text-slate-800">
                      Reorder Logic
                    </p>

                    <p className="mt-1 text-[10px] leading-5 text-slate-500">

                      {form.reorderMode ===
                      "AUTO"
                        ? `Auto mode calculates the reorder level from recent completed sales, supplier lead time and safety stock. The entered Reorder Level (${form.reorderLevel || "0"} ${form.baseUnit}) is preserved as the safe manual fallback until enough sales history is available.`
                        : `Manual mode uses the entered Reorder Level (${form.reorderLevel || "0"} ${form.baseUnit}) directly. Low-stock logic compares total valid sellable stock against this base-unit threshold.`}

                    </p>

                  </div>

                </div>

                {/* =========================================
                    PACKAGING
                ========================================= */}

                <div className="border-t border-slate-200 pt-6">

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                    <SectionTitle
                      title="Packaging Units"
                      description={`Define how larger units convert to ${form.baseUnit}.`}
                    />

                    <button
                      type="button"
                      onClick={
                        addPackagingUnit
                      }
                      disabled={
                        isSaving
                      }
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 text-[11px] font-semibold text-sky-700 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >

                      <Plus className="h-3.5 w-3.5" />

                      Add Packaging Unit

                    </button>

                  </div>

                  <div className="mt-4 space-y-3">

                    {form.units.map(
                      (unit) => (

                        <div
                          key={
                            unit.id
                          }
                          className={`rounded-xl border p-4 ${
                            unit.isBaseUnit
                              ? "border-emerald-200 bg-emerald-50/40"
                              : "border-slate-200 bg-white"
                          }`}
                        >

                          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_180px_120px_120px_45px] lg:items-end">

                            <FormField
                              label={
                                unit.isBaseUnit
                                  ? "Base Unit"
                                  : "Unit Name *"
                              }
                            >

                              <input
                                type="text"
                                value={
                                  unit.unitName
                                }
                                disabled={
                                  unit.isBaseUnit ||
                                  isSaving
                                }
                                onChange={(
                                  event,
                                ) =>
                                  updateUnit(
                                    unit.id,

                                    "unitName",

                                    event.target
                                      .value,
                                  )
                                }
                                placeholder="e.g. Strip"
                                className={`${inputClass} disabled:bg-slate-100 disabled:text-slate-500`}
                              />

                            </FormField>

                            <FormField
                              label={`Contains (${form.baseUnit}) *`}
                            >

                              <input
                                type="number"
                                min="1"
                                step="1"
                                value={
                                  unit.conversionToBase
                                }
                                disabled={
                                  unit.isBaseUnit ||
                                  isSaving
                                }
                                onChange={(
                                  event,
                                ) =>
                                  updateUnit(
                                    unit.id,

                                    "conversionToBase",

                                    event.target
                                      .value,
                                  )
                                }
                                placeholder="e.g. 10"
                                className={`${inputClass} disabled:bg-slate-100 disabled:text-slate-500`}
                              />

                            </FormField>

                            <label className="flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3">

                              <input
                                type="checkbox"
                                checked={
                                  unit.sellable
                                }
                                disabled={
                                  isSaving
                                }
                                onChange={(
                                  event,
                                ) =>
                                  updateUnit(
                                    unit.id,

                                    "sellable",

                                    event.target
                                      .checked,
                                  )
                                }
                                className="h-4 w-4 accent-sky-600"
                              />

                              <span className="text-[10px] font-medium text-slate-700">
                                Sellable
                              </span>

                            </label>

                            <label className="flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3">

                              <input
                                type="checkbox"
                                checked={
                                  unit.purchasable
                                }
                                disabled={
                                  isSaving
                                }
                                onChange={(
                                  event,
                                ) =>
                                  updateUnit(
                                    unit.id,

                                    "purchasable",

                                    event.target
                                      .checked,
                                  )
                                }
                                className="h-4 w-4 accent-sky-600"
                              />

                              <span className="text-[10px] font-medium text-slate-700">
                                Purchasable
                              </span>

                            </label>

                            <div className="flex h-10 items-center justify-center">

                              {unit.isBaseUnit ? (

                                <div
                                  title="Base unit cannot be removed"
                                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600"
                                >

                                  <Package className="h-4 w-4" />

                                </div>

                              ) : (

                                <button
                                  type="button"
                                  disabled={
                                    isSaving
                                  }
                                  onClick={() =>
                                    removePackagingUnit(
                                      unit.id,
                                    )
                                  }
                                  title="Remove unit"
                                  className="flex h-9 w-9 items-center justify-center rounded-lg text-rose-500 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
                                >

                                  <X className="h-4 w-4" />

                                </button>

                              )}

                            </div>

                          </div>

                          {unit.isBaseUnit ? (

                            <p className="mt-3 text-[9px] text-emerald-700">
                              Base unit always has conversion ×1.
                            </p>

                          ) : (

                            <p className="mt-3 text-[9px] text-slate-400">

                              1{" "}
                              {unit.unitName ||
                                "unit"}{" "}
                              ={" "}
                              {unit.conversionToBase ||
                                "?"}{" "}
                              {form.baseUnit}

                            </p>

                          )}

                        </div>

                      ),
                    )}

                  </div>

                </div>

                {/* =========================================
                    CONTROL
                ========================================= */}

                <div className="border-t border-slate-200 pt-6">

                  <SectionTitle
                    title="Medicine Controls"
                    description="Used later by billing, purchasing and authorization rules."
                  />

                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">

                    <div>

                      <label className="flex min-h-[58px] cursor-pointer items-center justify-between rounded-xl border border-slate-200 px-4 py-3">

                        <div>

                          <p className="text-[11px] font-medium text-slate-800">
                            Prescription Required
                          </p>

                          <p className="mt-1 text-[9px] text-slate-400">
                            Mark medicine as prescription-controlled.
                          </p>

                        </div>

                        <input
                          type="checkbox"
                          checked={
                            form.prescriptionRequired
                          }
                          disabled={
                            isSaving
                          }
                          onChange={(
                            event,
                          ) =>
                            setForm(
                              (
                                currentForm,
                              ) => ({
                                ...currentForm,

                                prescriptionRequired:
                                  event
                                    .target
                                    .checked,
                              }),
                            )
                          }
                          className="h-4 w-4 accent-sky-600"
                        />

                      </label>

                    </div>

                    <FormField label="Status">

                      <select
                        value={
                          form.status
                        }
                        disabled={
                          isSaving
                        }
                        onChange={(
                          event,
                        ) =>
                          setForm(
                            (
                              currentForm,
                            ) => ({
                              ...currentForm,

                              status:
                                event
                                  .target
                                  .value as MedicineStatus,
                            }),
                          )
                        }
                        className={`${inputClass} disabled:bg-slate-100`}
                      >

                        <option value="active">
                          Active
                        </option>

                        <option value="inactive">
                          Inactive
                        </option>

                      </select>

                    </FormField>

                  </div>

                </div>

              </div>

              {/* ===========================================
                  MODAL FOOTER
              =========================================== */}

              <div className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-200 bg-white px-5 py-4">

                <button
                  type="button"
                  onClick={
                    closeModal
                  }
                  disabled={
                    isSaving
                  }
                  className="h-10 rounded-xl border border-slate-200 px-4 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    isSaving
                  }
                  className="inline-flex h-10 min-w-[125px] items-center justify-center gap-2 rounded-xl bg-sky-600 px-5 text-[11px] font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-sky-400"
                >

                  {isSaving ? (

                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />

                      Saving...
                    </>

                  ) : editingMedicine ? (

                    "Save Changes"

                  ) : (

                    "Add Medicine"

                  )}

                </button>

              </div>

            </form>

          </div>

        </div>

      ) : null}
    </>
  );
}

/* =========================================================
   STYLES
========================================================= */

const inputClass =
  "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[11px] text-slate-700 outline-none placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100";

/* =========================================================
   TABLE HEAD
========================================================= */

function TableHead({
  children,
}: {
  children:
    ReactNode;
}) {
  return (
    <th className="px-4 py-4 text-[10px] font-medium text-slate-500">
      {children}
    </th>
  );
}

/* =========================================================
   FORM FIELD
========================================================= */

function FormField({
  label,
  hint,
  children,
}: {
  label: string;

  hint?: string;

  children:
    ReactNode;
}) {
  return (
    <div>

      <div className="mb-2 flex items-center justify-between">

        <label className="text-[11px] font-medium text-slate-700">
          {label}
        </label>

        {hint ? (

          <span className="text-[9px] text-slate-400">
            {hint}
          </span>

        ) : null}

      </div>

      {children}

    </div>
  );
}

/* =========================================================
   SECTION TITLE
========================================================= */

function SectionTitle({
  title,
  description,
}: {
  title: string;

  description: string;
}) {
  return (
    <div>

      <h3 className="text-[13px] font-semibold text-slate-900">
        {title}
      </h3>

      <p className="mt-1 text-[10px] text-slate-500">
        {description}
      </p>

    </div>
  );
}

/* =========================================================
   STAT CARD
========================================================= */

function StatCard({
  label,
  value,
  description,
}: {
  label: string;

  value: number;

  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

      <p className="text-[10px] font-medium text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-2xl font-semibold text-slate-900">

        {value.toLocaleString(
          "en-US",
        )}

      </p>

      <p className="mt-1 text-[9px] text-slate-400">
        {description}
      </p>

    </div>
  );
}