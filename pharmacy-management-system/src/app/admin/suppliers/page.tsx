"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Building2,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Power,
  Search,
  Truck,
  X,
} from "lucide-react";

/* =========================================================
   TYPES
========================================================= */

type SupplierStatus =
  | "active"
  | "inactive";

type Supplier = {
  id: string;

  databaseId: number;

  name: string;

  contactPerson: string;

  phone: string;

  email: string;

  address: string;

  tradeLicenseNo: string;

  status: SupplierStatus;

  linkedMedicines: number;

  totalPurchases: number;
};

type SupplierForm = {
  name: string;

  contactPerson: string;

  phone: string;

  email: string;

  address: string;

  tradeLicenseNo: string;

  status: SupplierStatus;
};

type SuppliersApiResponse = {
  success: boolean;

  message?: string;

  data?: Supplier[];
};

type MutationApiResponse = {
  success: boolean;

  message?: string;
};

/* =========================================================
   EMPTY FORM
========================================================= */

function createEmptyForm(): SupplierForm {
  return {
    name: "",

    contactPerson: "",

    phone: "",

    email: "",

    address: "",

    tradeLicenseNo: "",

    status: "active",
  };
}

/* =========================================================
   PAGE
========================================================= */

export default function AdminSuppliersPage() {
  const [
    suppliers,
    setSuppliers,
  ] =
    useState<Supplier[]>([]);

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
    isModalOpen,
    setIsModalOpen,
  ] =
    useState(false);

  const [
    editingSupplier,
    setEditingSupplier,
  ] =
    useState<Supplier | null>(
      null,
    );

  const [
    form,
    setForm,
  ] =
    useState<SupplierForm>(
      createEmptyForm(),
    );

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
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    const controller =
      new AbortController();

    async function loadInitialSuppliers() {
      try {
        const response =
          await fetch(
            "/api/suppliers",
            {
              method: "GET",

              cache:
                "no-store",

              signal:
                controller.signal,
            },
          );

        const result:
          SuppliersApiResponse =
          await response.json();

        if (
          !response.ok ||
          !result.success
        ) {
          throw new Error(
            result.message ||
              "Failed to load suppliers.",
          );
        }

        if (
          !controller.signal
            .aborted
        ) {
          setSuppliers(
            result.data ?? [],
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
          "Initial suppliers load error:",
          error,
        );

        if (
          !controller.signal
            .aborted
        ) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Failed to load suppliers.",
          );
        }
      } finally {
        if (
          !controller.signal
            .aborted
        ) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialSuppliers();

    return () => {
      controller.abort();
    };
  }, []);

  /* =======================================================
     RELOAD
  ======================================================= */

  async function loadSuppliers() {
    try {
      setErrorMessage("");

      const response =
        await fetch(
          "/api/suppliers",
          {
            method: "GET",

            cache:
              "no-store",
          },
        );

      const result:
        SuppliersApiResponse =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Failed to load suppliers.",
        );
      }

      setSuppliers(
        result.data ?? [],
      );
    } catch (error) {
      console.error(
        "Load suppliers error:",
        error,
      );

      const message =
        error instanceof Error
          ? error.message
          : "Failed to load suppliers.";

      setErrorMessage(
        message,
      );

      throw error;
    }
  }

  /* =======================================================
     STATISTICS
  ======================================================= */

  const statistics =
    useMemo(() => {
      const active =
        suppliers.filter(
          (supplier) =>
            supplier.status ===
            "active",
        ).length;

      const linkedMedicines =
        suppliers.reduce(
          (
            total,
            supplier,
          ) =>
            total +
            supplier.linkedMedicines,

          0,
        );

      const purchases =
        suppliers.reduce(
          (
            total,
            supplier,
          ) =>
            total +
            supplier.totalPurchases,

          0,
        );

      return {
        total:
          suppliers.length,

        active,

        linkedMedicines,

        purchases,
      };
    }, [suppliers]);

  /* =======================================================
     FILTER
  ======================================================= */

  const filteredSuppliers =
    useMemo(() => {
      const search =
        searchTerm
          .trim()
          .toLowerCase();

      return suppliers.filter(
        (supplier) => {
          const matchesSearch =
            supplier.name
              .toLowerCase()
              .includes(
                search,
              ) ||

            supplier.id
              .toLowerCase()
              .includes(
                search,
              ) ||

            supplier.contactPerson
              .toLowerCase()
              .includes(
                search,
              ) ||

            supplier.phone
              .toLowerCase()
              .includes(
                search,
              ) ||

            supplier.email
              .toLowerCase()
              .includes(
                search,
              );

          const matchesStatus =
            statusFilter ===
              "All" ||
            supplier.status ===
              statusFilter;

          return (
            matchesSearch &&
            matchesStatus
          );
        },
      );
    }, [
      suppliers,
      searchTerm,
      statusFilter,
    ]);

  /* =======================================================
     MODAL
  ======================================================= */

  function openAddModal() {
    setEditingSupplier(
      null,
    );

    setForm(
      createEmptyForm(),
    );

    setIsModalOpen(
      true,
    );
  }

  function openEditModal(
    supplier: Supplier,
  ) {
    setEditingSupplier(
      supplier,
    );

    setForm({
      name:
        supplier.name,

      contactPerson:
        supplier.contactPerson,

      phone:
        supplier.phone,

      email:
        supplier.email,

      address:
        supplier.address,

      tradeLicenseNo:
        supplier.tradeLicenseNo,

      status:
        supplier.status,
    });

    setIsModalOpen(
      true,
    );
  }

  function closeModal() {
    if (isSaving) {
      return;
    }

    setIsModalOpen(
      false,
    );

    setEditingSupplier(
      null,
    );

    setForm(
      createEmptyForm(),
    );
  }

  /* =======================================================
     VALIDATE
  ======================================================= */

  function validateForm() {
    if (
      !form.name.trim()
    ) {
      window.alert(
        "Supplier name is required.",
      );

      return false;
    }

    if (
      form.phone.trim()
        .length > 20
    ) {
      window.alert(
        "Phone number is too long.",
      );

      return false;
    }

    if (
      form.email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        form.email.trim(),
      )
    ) {
      window.alert(
        "Please enter a valid email address.",
      );

      return false;
    }

    return true;
  }

  /* =======================================================
     ADD / EDIT
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

      contactPerson:
        form.contactPerson.trim(),

      phone:
        form.phone.trim(),

      email:
        form.email.trim(),

      address:
        form.address.trim(),

      tradeLicenseNo:
        form.tradeLicenseNo.trim(),

      status:
        form.status,
    };

    try {
      setIsSaving(
        true,
      );

      setErrorMessage(
        "",
      );

      const response =
        await fetch(
          editingSupplier
            ? `/api/suppliers/${editingSupplier.id}`
            : "/api/suppliers",
          {
            method:
              editingSupplier
                ? "PATCH"
                : "POST",

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
            "Supplier operation failed.",
        );
      }

      await loadSuppliers();

      setIsModalOpen(
        false,
      );

      setEditingSupplier(
        null,
      );

      setForm(
        createEmptyForm(),
      );
    } catch (error) {
      console.error(
        "Supplier save error:",
        error,
      );

      const message =
        error instanceof Error
          ? error.message
          : "Supplier operation failed.";

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
     STATUS
  ======================================================= */

  async function toggleSupplierStatus(
    supplier: Supplier,
  ) {
    if (
      statusUpdatingId
    ) {
      return;
    }

    const nextStatus:
      SupplierStatus =
      supplier.status ===
      "active"
        ? "inactive"
        : "active";

    const confirmed =
      window.confirm(
        `Are you sure you want to ${
          nextStatus ===
          "active"
            ? "activate"
            : "deactivate"
        } ${supplier.name}?`,
      );

    if (!confirmed) {
      return;
    }

    try {
      setStatusUpdatingId(
        supplier.id,
      );

      const response =
        await fetch(
          `/api/suppliers/${supplier.id}`,
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
            "Failed to update supplier status.",
        );
      }

      await loadSuppliers();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to update supplier status.";

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

      await loadSuppliers();
    } catch {
      // loadSuppliers handles error
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

        {/* HEADER */}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div>

            <h1 className="text-xl font-semibold text-slate-900">
              Suppliers
            </h1>

            <p className="mt-1 text-[12px] text-slate-500">
              Manage medicine suppliers and purchasing contacts.
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
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 text-[12px] font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:bg-sky-300"
          >

            <Plus className="h-4 w-4" />

            Add Supplier

          </button>

        </div>

        {/* INFO */}

        <section className="rounded-2xl border border-sky-100 bg-sky-50/70 px-4 py-3">

          <div className="flex gap-3">

            <Truck className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />

            <div>

              <p className="text-[12px] font-semibold text-sky-900">
                Supplier Master
              </p>

              <p className="mt-1 text-[11px] leading-5 text-sky-700">
                Active suppliers will be available for new purchases.
                Historical purchase records remain linked even if a
                supplier is later deactivated.
              </p>

            </div>

          </div>

        </section>

        {/* ERROR */}

        {errorMessage ? (

          <section className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">

            <p className="text-[11px] text-rose-700">
              {errorMessage}
            </p>

            <button
              type="button"
              onClick={() =>
                void retryLoad()
              }
              className="text-[10px] font-semibold text-rose-700 underline"
            >
              Retry
            </button>

          </section>

        ) : null}

        {/* STATS */}

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">

          <StatCard
            label="Total Suppliers"
            value={
              statistics.total
            }
            description="Supplier master records"
            icon={
              <Building2 className="h-5 w-5" />
            }
          />

          <StatCard
            label="Active Suppliers"
            value={
              statistics.active
            }
            description="Available for purchasing"
            icon={
              <Truck className="h-5 w-5" />
            }
          />

          <StatCard
            label="Linked Medicines"
            value={
              statistics.linkedMedicines
            }
            description="Medicine-supplier links"
            icon={
              <Building2 className="h-5 w-5" />
            }
          />

          <StatCard
            label="Purchase Records"
            value={
              statistics.purchases
            }
            description="Purchases from suppliers"
            icon={
              <Truck className="h-5 w-5" />
            }
          />

        </section>

        {/* FILTER */}

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_200px]">

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
                placeholder="Search supplier, code, contact, phone or email..."
                className={inputClass}
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
              className={selectClass}
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

        {/* TABLE */}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="overflow-x-auto">

            <table className="w-full min-w-[1200px]">

              <thead>

                <tr className="border-b border-slate-200 bg-slate-50/80">

                  <TableHead>
                    Supplier
                  </TableHead>

                  <TableHead>
                    Contact Person
                  </TableHead>

                  <TableHead>
                    Contact
                  </TableHead>

                  <TableHead>
                    Trade License
                  </TableHead>

                  <TableHead>
                    Medicines
                  </TableHead>

                  <TableHead>
                    Purchases
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
                      colSpan={
                        8
                      }
                      className="px-5 py-16 text-center"
                    >

                      <Loader2 className="mx-auto h-7 w-7 animate-spin text-sky-600" />

                      <p className="mt-3 text-[12px] font-medium text-slate-700">
                        Loading suppliers...
                      </p>

                    </td>

                  </tr>

                ) : (

                  <>
                    {filteredSuppliers.map(
                      (
                        supplier,
                      ) => (

                        <tr
                          key={
                            supplier.id
                          }
                          className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60"
                        >

                          <td className="px-4 py-4">

                            <p className="text-[12px] font-semibold text-slate-900">
                              {
                                supplier.name
                              }
                            </p>

                            <p className="mt-1 font-mono text-[9px] text-slate-400">
                              {
                                supplier.id
                              }
                            </p>

                            {supplier.address ? (

                              <div className="mt-2 flex max-w-[240px] items-start gap-1 text-[9px] text-slate-400">

                                <MapPin className="mt-0.5 h-3 w-3 shrink-0" />

                                <span>
                                  {
                                    supplier.address
                                  }
                                </span>

                              </div>

                            ) : null}

                          </td>

                          <td className="px-4 py-4 text-[11px] text-slate-600">

                            {supplier.contactPerson ||
                              "-"}

                          </td>

                          <td className="px-4 py-4">

                            {supplier.phone ? (

                              <div className="flex items-center gap-1.5 text-[10px] text-slate-600">

                                <Phone className="h-3 w-3 text-slate-400" />

                                {
                                  supplier.phone
                                }

                              </div>

                            ) : null}

                            {supplier.email ? (

                              <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-slate-500">

                                <Mail className="h-3 w-3 text-slate-400" />

                                {
                                  supplier.email
                                }

                              </div>

                            ) : null}

                            {!supplier.phone &&
                            !supplier.email ? (
                              <span className="text-[10px] text-slate-400">
                                -
                              </span>
                            ) : null}

                          </td>

                          <td className="px-4 py-4 text-[10px] text-slate-600">

                            {supplier.tradeLicenseNo ||
                              "-"}

                          </td>

                          <td className="px-4 py-4">

                            <span className="inline-flex rounded-full bg-violet-50 px-2.5 py-1 text-[9px] font-medium text-violet-700">

                              {
                                supplier.linkedMedicines
                              }

                            </span>

                          </td>

                          <td className="px-4 py-4 text-[11px] font-semibold text-slate-700">

                            {
                              supplier.totalPurchases
                            }

                          </td>

                          <td className="px-4 py-4">

                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-[9px] font-medium ${
                                supplier.status ===
                                "active"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-slate-200 text-slate-600"
                              }`}
                            >

                              {
                                supplier.status
                              }

                            </span>

                          </td>

                          <td className="px-4 py-4">

                            <div className="flex items-center gap-1">

                              <button
                                type="button"
                                onClick={() =>
                                  openEditModal(
                                    supplier,
                                  )
                                }
                                disabled={
                                  statusUpdatingId ===
                                  supplier.id
                                }
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-sky-600 hover:bg-sky-50 disabled:opacity-40"
                              >

                                <Pencil className="h-3.5 w-3.5" />

                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  void toggleSupplierStatus(
                                    supplier,
                                  )
                                }
                                disabled={
                                  statusUpdatingId !==
                                  null
                                }
                                className={`flex h-8 w-8 items-center justify-center rounded-lg disabled:opacity-40 ${
                                  supplier.status ===
                                  "active"
                                    ? "text-rose-500 hover:bg-rose-50"
                                    : "text-emerald-600 hover:bg-emerald-50"
                                }`}
                              >

                                {statusUpdatingId ===
                                supplier.id ? (

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

                    {filteredSuppliers.length ===
                    0 ? (

                      <tr>

                        <td
                          colSpan={
                            8
                          }
                          className="px-5 py-16 text-center"
                        >

                          <Truck className="mx-auto h-7 w-7 text-slate-300" />

                          <p className="mt-3 text-[12px] font-medium text-slate-700">
                            No suppliers found
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

      {/* MODAL */}

      {isModalOpen ? (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]">

          <div className="max-h-[94vh] w-full max-w-[720px] overflow-y-auto rounded-2xl bg-white shadow-2xl">

            <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">

              <div>

                <h2 className="text-base font-semibold text-slate-950">

                  {editingSupplier
                    ? "Edit Supplier"
                    : "Add Supplier"}

                </h2>

                <p className="mt-1 text-[10px] text-slate-500">
                  Maintain supplier contact and purchasing information.
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
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 disabled:opacity-40"
              >

                <X className="h-5 w-5" />

              </button>

            </div>

            <form
              onSubmit={
                handleSubmit
              }
            >

              <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">

                <FormField
                  label="Supplier Name *"
                  className="md:col-span-2"
                >

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
                          current,
                        ) => ({
                          ...current,

                          name:
                            event.target
                              .value,
                        }),
                      )
                    }
                    placeholder="e.g. Beximco Pharmaceuticals Ltd."
                    className={fieldClass}
                  />

                </FormField>

                <FormField label="Contact Person">

                  <input
                    type="text"
                    value={
                      form.contactPerson
                    }
                    disabled={
                      isSaving
                    }
                    onChange={(
                      event,
                    ) =>
                      setForm(
                        (
                          current,
                        ) => ({
                          ...current,

                          contactPerson:
                            event.target
                              .value,
                        }),
                      )
                    }
                    placeholder="Contact person"
                    className={fieldClass}
                  />

                </FormField>

                <FormField label="Phone">

                  <input
                    type="text"
                    value={
                      form.phone
                    }
                    disabled={
                      isSaving
                    }
                    onChange={(
                      event,
                    ) =>
                      setForm(
                        (
                          current,
                        ) => ({
                          ...current,

                          phone:
                            event.target
                              .value,
                        }),
                      )
                    }
                    placeholder="01XXXXXXXXX"
                    className={fieldClass}
                  />

                </FormField>

                <FormField label="Email">

                  <input
                    type="email"
                    value={
                      form.email
                    }
                    disabled={
                      isSaving
                    }
                    onChange={(
                      event,
                    ) =>
                      setForm(
                        (
                          current,
                        ) => ({
                          ...current,

                          email:
                            event.target
                              .value,
                        }),
                      )
                    }
                    placeholder="supplier@example.com"
                    className={fieldClass}
                  />

                </FormField>

                <FormField label="Trade License No.">

                  <input
                    type="text"
                    value={
                      form.tradeLicenseNo
                    }
                    disabled={
                      isSaving
                    }
                    onChange={(
                      event,
                    ) =>
                      setForm(
                        (
                          current,
                        ) => ({
                          ...current,

                          tradeLicenseNo:
                            event.target
                              .value,
                        }),
                      )
                    }
                    placeholder="Optional"
                    className={fieldClass}
                  />

                </FormField>

                <FormField
                  label="Address"
                  className="md:col-span-2"
                >

                  <textarea
                    rows={3}
                    value={
                      form.address
                    }
                    disabled={
                      isSaving
                    }
                    onChange={(
                      event,
                    ) =>
                      setForm(
                        (
                          current,
                        ) => ({
                          ...current,

                          address:
                            event.target
                              .value,
                        }),
                      )
                    }
                    placeholder="Supplier address"
                    className="w-full resize-none rounded-xl border border-slate-200 px-3 py-3 text-[11px] outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-100"
                  />

                </FormField>

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
                          current,
                        ) => ({
                          ...current,

                          status:
                            event.target
                              .value as SupplierStatus,
                        }),
                      )
                    }
                    className={fieldClass}
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

              <div className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-200 bg-white px-5 py-4">

                <button
                  type="button"
                  onClick={
                    closeModal
                  }
                  disabled={
                    isSaving
                  }
                  className="h-10 rounded-xl border border-slate-200 px-4 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    isSaving
                  }
                  className="inline-flex h-10 min-w-[125px] items-center justify-center gap-2 rounded-xl bg-sky-600 px-5 text-[11px] font-semibold text-white hover:bg-sky-700 disabled:bg-sky-400"
                >

                  {isSaving ? (

                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>

                  ) : editingSupplier ? (

                    "Save Changes"

                  ) : (

                    "Add Supplier"

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
   STYLE HELPERS
========================================================= */

const inputClass =
  "h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-[11px] outline-none placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100";

const selectClass =
  "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[11px] text-slate-700 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100";

const fieldClass =
  "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[11px] text-slate-700 outline-none placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-100";

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
    <th className="px-4 py-4 text-left text-[10px] font-medium text-slate-500">
      {children}
    </th>
  );
}

function FormField({
  label,
  children,
  className = "",
}: {
  label: string;

  children:
    React.ReactNode;

  className?: string;
}) {
  return (
    <div
      className={
        className
      }
    >

      <label className="mb-2 block text-[11px] font-medium text-slate-700">
        {label}
      </label>

      {children}

    </div>
  );
}

function StatCard({
  label,
  value,
  description,
  icon,
}: {
  label: string;

  value: number;

  description: string;

  icon:
    React.ReactNode;
}) {
  return (
    <article className="flex min-h-[100px] items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

      <div>

        <p className="text-[10px] text-slate-500">
          {label}
        </p>

        <p className="mt-1 text-2xl font-semibold text-slate-950">
          {value}
        </p>

        <p className="mt-1 text-[9px] text-slate-400">
          {description}
        </p>

      </div>

      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
        {icon}
      </div>

    </article>
  );
}