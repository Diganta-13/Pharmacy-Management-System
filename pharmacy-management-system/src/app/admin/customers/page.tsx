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
  Pencil,
  Plus,
  Search,
  X,
} from "lucide-react";

import CollectPaymentModal from "@/components/customers/CollectPaymentModal";

/* =========================================================
   TYPES
========================================================= */

type CustomerStatus =
  | "active"
  | "inactive";

type Customer = {
  id: string;

  databaseId: number;

  name: string;

  phone: string;

  email: string;

  address: string;

  status: CustomerStatus;

  totalSales: number;

  totalPurchaseAmount: number;

  totalPaid: number;

  totalDue: number;

  lastVisit:
    | string
    | null;

  createdAt?: string;
};

type CustomerSale = {
  invoice: string;

  saleDate: string;

  itemCount: number;

  amount: number;

  paidAmount: number;

  dueAmount: number;

  paymentStatus:
    | "PAID"
    | "PARTIAL"
    | "DUE";

  status:
    | "COMPLETED"
    | "CANCELLED";
};

type CustomerProfile =
  Customer & {
    sales: CustomerSale[];
  };

type CustomerForm = {
  name: string;

  phone: string;

  email: string;

  address: string;
};

type CustomerFormMode =
  | "add"
  | "edit";

type CustomersApiResponse = {
  success: boolean;

  message?: string;

  data?: Customer[];
};

type CustomerDetailsApiResponse = {
  success: boolean;

  message?: string;

  data?: CustomerProfile;
};

type MutationApiResponse = {
  success: boolean;

  message?: string;
};

/* =========================================================
   HELPERS
========================================================= */

function createEmptyForm():
  CustomerForm {
  return {
    name: "",
    phone: "",
    email: "",
    address: "",
  };
}

function formatMoney(
  value: number,
) {
  return value.toLocaleString(
    "en-US",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    },
  );
}

function formatDate(
  value:
    | string
    | null,
) {
  if (!value) {
    return "—";
  }

  const datePart =
    value.slice(0, 10);

  const [
    year,
    month,
    day,
  ] =
    datePart.split("-");

  if (
    !year ||
    !month ||
    !day
  ) {
    return value;
  }

  return `${day}-${month}-${year}`;
}

function getInitial(
  name: string,
) {
  const clean =
    name.trim();

  return clean
    ? clean
        .charAt(0)
        .toUpperCase()
    : "?";
}

function getThirtyDaysAgo() {
  const today =
    new Date();

  today.setHours(
    0,
    0,
    0,
    0,
  );

  today.setDate(
    today.getDate() -
      30,
  );

  const year =
    today.getFullYear();

  const month =
    String(
      today.getMonth() +
        1,
    ).padStart(2, "0");

  const day =
    String(
      today.getDate(),
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isActiveWithin30Days(
  customer: Customer,
) {
  if (
    customer.status !==
      "active" ||
    !customer.lastVisit
  ) {
    return false;
  }

  return (
    customer.lastVisit.slice(
      0,
      10,
    ) >=
    getThirtyDaysAgo()
  );
}

/* =========================================================
   PAGE
========================================================= */

export default function CustomersPage() {
  const [
    customers,
    setCustomers,
  ] =
    useState<Customer[]>([]);

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
     ADD / EDIT
  ======================================================= */

  const [
    isCustomerModalOpen,
    setIsCustomerModalOpen,
  ] =
    useState(false);

  const [
    formMode,
    setFormMode,
  ] =
    useState<CustomerFormMode>(
      "add",
    );

  const [
    editingCustomer,
    setEditingCustomer,
  ] =
    useState<CustomerProfile | null>(
      null,
    );

  const [
    form,
    setForm,
  ] =
    useState<CustomerForm>(
      createEmptyForm(),
    );

  const [
    isSaving,
    setIsSaving,
  ] =
    useState(false);

  /* =======================================================
     PROFILE
  ======================================================= */

  const [
    selectedCustomer,
    setSelectedCustomer,
  ] =
    useState<CustomerProfile | null>(
      null,
    );

  const [
    profileLoadingId,
    setProfileLoadingId,
  ] =
    useState<string | null>(
      null,
    );

  /* =======================================================
     STATUS
  ======================================================= */

  const [
    isStatusUpdating,
    setIsStatusUpdating,
  ] =
    useState(false);

  /* =======================================================
     DUE PAYMENT
  ======================================================= */

  const [
    dueTarget,
    setDueTarget,
  ] =
    useState<{
      invoice: string;

      dueAmount: number;
    } | null>(
      null,
    );

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    const controller =
      new AbortController();

    async function loadInitialCustomers() {
      try {
        const response =
          await fetch(
            "/api/customers",
            {
              method: "GET",
              cache: "no-store",
              signal:
                controller.signal,
            },
          );

        const result:
          CustomersApiResponse =
          await response.json();

        if (
          !response.ok ||
          !result.success
        ) {
          throw new Error(
            result.message ||
              "Failed to load customers.",
          );
        }

        if (
          controller.signal
            .aborted
        ) {
          return;
        }

        setCustomers(
          result.data ?? [],
        );
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
          "Customer initial load error:",
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
              : "Failed to load customers.",
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

    void loadInitialCustomers();

    return () => {
      controller.abort();
    };
  }, []);

  /* =======================================================
     LOAD CUSTOMERS
  ======================================================= */

  async function loadCustomers() {
    try {
      setErrorMessage("");

      const response =
        await fetch(
          "/api/customers",
          {
            method: "GET",
            cache: "no-store",
          },
        );

      const result:
        CustomersApiResponse =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Failed to load customers.",
        );
      }

      const data =
        result.data ?? [];

      setCustomers(data);

      return data;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to load customers.";

      setErrorMessage(
        message,
      );

      throw error;
    }
  }

  /* =======================================================
     FETCH PROFILE
  ======================================================= */

  async function fetchCustomerProfile(
    customerId: string,
  ) {
    const response =
      await fetch(
        `/api/customers/${encodeURIComponent(
          customerId,
        )}`,
        {
          method: "GET",
          cache: "no-store",
        },
      );

    const result:
      CustomerDetailsApiResponse =
      await response.json();

    if (
      !response.ok ||
      !result.success ||
      !result.data
    ) {
      throw new Error(
        result.message ||
          "Failed to load customer profile.",
      );
    }

    return result.data;
  }

  async function refreshCustomer(
    customerId: string,
  ) {
    await loadCustomers();

    const profile =
      await fetchCustomerProfile(
        customerId,
      );

    setSelectedCustomer(
      profile,
    );

    return profile;
  }

  /* =======================================================
     STATISTICS
  ======================================================= */

  const statistics =
    useMemo(() => {
      const totalCustomers =
        customers.length;

      const active30Days =
        customers.filter(
          isActiveWithin30Days,
        ).length;

      const totalDue =
        customers.reduce(
          (
            total,
            customer,
          ) =>
            total +
            customer.totalDue,
          0,
        );

      const totalSpent =
        customers.reduce(
          (
            total,
            customer,
          ) =>
            total +
            customer.totalPurchaseAmount,
          0,
        );

      const averageSpend =
        totalCustomers > 0
          ? totalSpent /
            totalCustomers
          : 0;

      return {
        totalCustomers,
        active30Days,
        totalDue,
        averageSpend,
      };
    }, [customers]);

  /* =======================================================
     SEARCH
  ======================================================= */

  const filteredCustomers =
    useMemo(() => {
      const search =
        searchTerm
          .trim()
          .toLowerCase();

      if (!search) {
        return customers;
      }

      return customers.filter(
        (customer) =>
          customer.name
            .toLowerCase()
            .includes(search) ||

          customer.phone
            .toLowerCase()
            .includes(search) ||

          customer.email
            .toLowerCase()
            .includes(search) ||

          customer.id
            .toLowerCase()
            .includes(search),
      );
    }, [
      customers,
      searchTerm,
    ]);

  /* =======================================================
     ADD
  ======================================================= */

  function openAddModal() {
    setFormMode("add");

    setEditingCustomer(
      null,
    );

    setForm(
      createEmptyForm(),
    );

    setIsCustomerModalOpen(
      true,
    );
  }

  /* =======================================================
     EDIT
  ======================================================= */

  function openEditModal(
    customer:
      CustomerProfile,
  ) {
    setFormMode("edit");

    setEditingCustomer(
      customer,
    );

    setForm({
      name:
        customer.name,

      phone:
        customer.phone,

      email:
        customer.email,

      address:
        customer.address,
    });

    setSelectedCustomer(
      null,
    );

    setIsCustomerModalOpen(
      true,
    );
  }

  function closeCustomerModal() {
    if (isSaving) {
      return;
    }

    setIsCustomerModalOpen(
      false,
    );

    if (
      formMode === "edit" &&
      editingCustomer
    ) {
      setSelectedCustomer(
        editingCustomer,
      );
    }

    setEditingCustomer(
      null,
    );

    setFormMode("add");

    setForm(
      createEmptyForm(),
    );
  }

  /* =======================================================
     VALIDATE
  ======================================================= */

  function validateCustomer() {
    const name =
      form.name.trim();

    const phone =
      form.phone.trim();

    const email =
      form.email.trim();

    if (!name) {
      window.alert(
        "Customer full name is required.",
      );

      return false;
    }

    if (!phone) {
      window.alert(
        "Phone number is required for a registered customer.",
      );

      return false;
    }

    if (
      !/^01\d{9}$/.test(
        phone,
      )
    ) {
      window.alert(
        "Please enter a valid 11-digit Bangladesh mobile number.",
      );

      return false;
    }

    if (
      email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email,
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
     SAVE ADD / EDIT
  ======================================================= */

  async function handleCustomerSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      isSaving ||
      !validateCustomer()
    ) {
      return;
    }

    try {
      setIsSaving(true);

      setErrorMessage("");

      /* ADD */

      if (
        formMode === "add"
      ) {
        const response =
          await fetch(
            "/api/customers",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  name:
                    form.name.trim(),

                  phone:
                    form.phone.trim(),

                  email:
                    form.email.trim(),

                  address:
                    form.address.trim(),

                  status:
                    "active",
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
              "Failed to add customer.",
          );
        }

        await loadCustomers();

        setIsCustomerModalOpen(
          false,
        );

        setForm(
          createEmptyForm(),
        );

        return;
      }

      /* EDIT */

      if (
        !editingCustomer
      ) {
        throw new Error(
          "Customer information is missing.",
        );
      }

      const customerId =
        editingCustomer.id;

      const response =
        await fetch(
          `/api/customers/${encodeURIComponent(
            customerId,
          )}`,
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                name:
                  form.name.trim(),

                phone:
                  form.phone.trim(),

                email:
                  form.email.trim(),

                address:
                  form.address.trim(),

                status:
                  editingCustomer.status,
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
            "Failed to update customer.",
        );
      }

      const refreshedProfile =
        await refreshCustomer(
          customerId,
        );

      setIsCustomerModalOpen(
        false,
      );

      setEditingCustomer(
        null,
      );

      setFormMode("add");

      setForm(
        createEmptyForm(),
      );

      setSelectedCustomer(
        refreshedProfile,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : formMode === "edit"
            ? "Failed to update customer."
            : "Failed to add customer.";

      setErrorMessage(
        message,
      );

      window.alert(
        message,
      );
    } finally {
      setIsSaving(false);
    }
  }

  /* =======================================================
     OPEN PROFILE
  ======================================================= */

  async function openCustomerProfile(
    customer: Customer,
  ) {
    if (
      profileLoadingId
    ) {
      return;
    }

    try {
      setProfileLoadingId(
        customer.id,
      );

      const profile =
        await fetchCustomerProfile(
          customer.id,
        );

      setSelectedCustomer(
        profile,
      );
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Failed to load customer profile.",
      );
    } finally {
      setProfileLoadingId(
        null,
      );
    }
  }

  /* =======================================================
     ACTIVE / INACTIVE
  ======================================================= */

  async function handleToggleCustomerStatus() {
    if (
      !selectedCustomer ||
      isStatusUpdating
    ) {
      return;
    }

    const customerId =
      selectedCustomer.id;

    const nextStatus:
      CustomerStatus =
      selectedCustomer.status ===
      "active"
        ? "inactive"
        : "active";

    const actionText =
      nextStatus ===
      "inactive"
        ? "deactivate"
        : "activate";

    const confirmed =
      window.confirm(
        `Are you sure you want to ${actionText} ${selectedCustomer.name}?`,
      );

    if (!confirmed) {
      return;
    }

    try {
      setIsStatusUpdating(
        true,
      );

      const response =
        await fetch(
          `/api/customers/${encodeURIComponent(
            customerId,
          )}`,
          {
            method: "PATCH",

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
            "Failed to update customer status.",
        );
      }

      await refreshCustomer(
        customerId,
      );
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Failed to update customer status.",
      );
    } finally {
      setIsStatusUpdating(
        false,
      );
    }
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <>
      <div className="mx-auto w-full max-w-[1600px] space-y-4">

        {/* STATISTICS */}

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">

          <StatCard
            label="Total Customers"
            value={statistics.totalCustomers.toLocaleString(
              "en-US",
            )}
            className="border-sky-200 bg-sky-50/60"
            valueClassName="text-sky-700"
          />

          <StatCard
            label="Active (30 days)"
            value={statistics.active30Days.toLocaleString(
              "en-US",
            )}
            className="border-emerald-200 bg-emerald-50/60"
            valueClassName="text-emerald-700"
          />

          <StatCard
            label="Total Due"
            value={`৳${formatMoney(
              statistics.totalDue,
            )}`}
            className="border-rose-200 bg-rose-50/60"
            valueClassName="text-rose-600"
          />

          <StatCard
            label="Avg. Spend"
            value={`৳${formatMoney(
              statistics.averageSpend,
            )}`}
            className="border-violet-200 bg-violet-50/60"
            valueClassName="text-violet-700"
          />

        </section>

        {/* ERROR */}

        {errorMessage ? (
          <section className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">

            <p className="text-[10px] text-rose-700">
              {errorMessage}
            </p>

            <button
              type="button"
              onClick={() =>
                void loadCustomers()
              }
              className="text-[9px] font-semibold text-rose-700 underline"
            >
              Retry
            </button>

          </section>
        ) : null}

        {/* SEARCH */}

        <section className="flex flex-col gap-3 sm:flex-row">

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
              placeholder="Search by name, phone or email..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-[11px] text-slate-700 shadow-sm outline-none placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            />

          </div>

          <button
            type="button"
            onClick={
              openAddModal
            }
            disabled={
              isLoading
            }
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-sky-600 px-5 text-[11px] font-semibold text-white shadow-sm hover:bg-sky-700 disabled:bg-sky-300"
          >

            <Plus className="h-4 w-4" />

            Add Customer

          </button>

        </section>

        {/* CUSTOMER LIST */}

        {isLoading ? (
          <section className="flex min-h-[300px] items-center justify-center rounded-2xl border border-slate-200 bg-white">

            <div className="text-center">

              <Loader2 className="mx-auto h-7 w-7 animate-spin text-sky-600" />

              <p className="mt-3 text-[11px] text-slate-500">
                Loading customers...
              </p>

            </div>

          </section>
        ) : filteredCustomers.length >
          0 ? (
          <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">

            {filteredCustomers.map(
              (
                customer,
                index,
              ) => (
                <button
                  key={
                    customer.id
                  }
                  type="button"
                  onClick={() =>
                    void openCustomerProfile(
                      customer,
                    )
                  }
                  className={`min-h-[190px] rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:shadow-md ${
                    customer.status ===
                    "active"
                      ? "border-slate-200 hover:border-sky-300"
                      : "border-slate-200 opacity-70 hover:border-slate-300"
                  }`}
                >

                  <div className="flex items-start gap-3">

                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${avatarClass(
                        index,
                      )}`}
                    >
                      {getInitial(
                        customer.name,
                      )}
                    </div>

                    <div className="min-w-0">

                      <div className="flex items-center gap-2">

                        <p className="truncate text-[12px] font-semibold text-slate-900">
                          {
                            customer.name
                          }
                        </p>

                        {customer.status ===
                        "inactive" ? (
                          <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[6px] font-semibold text-slate-600">
                            INACTIVE
                          </span>
                        ) : null}

                      </div>

                      <p className="mt-0.5 truncate text-[9px] text-slate-500">
                        {
                          customer.phone
                        }
                      </p>

                      <p className="mt-0.5 truncate text-[9px] text-slate-500">
                        {customer.address ||
                          "No address"}
                      </p>

                    </div>

                    {profileLoadingId ===
                    customer.id ? (
                      <Loader2 className="ml-auto h-4 w-4 shrink-0 animate-spin text-sky-500" />
                    ) : null}

                  </div>

                  <div className="my-4 border-t border-slate-200" />

                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">

                    <CardMetric
                      label="PURCHASES"
                      value={customer.totalSales.toLocaleString(
                        "en-US",
                      )}
                    />

                    <CardMetric
                      label="TOTAL SPENT"
                      value={`৳${formatMoney(
                        customer.totalPurchaseAmount,
                      )}`}
                      valueClassName="text-emerald-700"
                    />

                    <CardMetric
                      label="LAST VISIT"
                      value={formatDate(
                        customer.lastVisit,
                      )}
                    />

                    <CardMetric
                      label="DUE"
                      value={
                        customer.totalDue >
                        0
                          ? `৳${formatMoney(
                              customer.totalDue,
                            )}`
                          : "—"
                      }
                      valueClassName={
                        customer.totalDue >
                        0
                          ? "text-rose-600"
                          : "text-slate-500"
                      }
                    />

                  </div>

                </button>
              ),
            )}

          </section>
        ) : (
          <section className="flex min-h-[300px] items-center justify-center rounded-2xl border border-slate-200 bg-white">

            <div className="text-center">

              <p className="text-[12px] font-medium text-slate-700">
                No customers found
              </p>

              <p className="mt-1 text-[10px] text-slate-400">
                Add a customer or try another search.
              </p>

            </div>

          </section>
        )}

      </div>

      {/* ===================================================
          ADD / EDIT MODAL
      =================================================== */}

      {isCustomerModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]">

          <div className="w-full max-w-[480px] overflow-hidden rounded-2xl bg-white shadow-2xl">

            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">

              <h2 className="text-[15px] font-semibold text-slate-900">
                {formMode ===
                "edit"
                  ? "Edit Customer"
                  : "Add New Customer"}
              </h2>

              <button
                type="button"
                onClick={
                  closeCustomerModal
                }
                disabled={
                  isSaving
                }
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40"
              >
                <X className="h-4 w-4" />
              </button>

            </div>

            <form
              onSubmit={
                handleCustomerSubmit
              }
            >

              <div className="space-y-4 px-5 py-5">

                <FormField label="Full Name *">

                  <input
                    type="text"
                    required
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
                            event.target.value,
                        }),
                      )
                    }
                    placeholder="Customer full name"
                    className={inputClass}
                  />

                </FormField>

                <FormField label="Phone Number *">

                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    maxLength={11}
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
                            event.target.value.replace(
                              /\D/g,
                              "",
                            ),
                        }),
                      )
                    }
                    placeholder="017XXXXXXXX"
                    className={inputClass}
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
                            event.target.value,
                        }),
                      )
                    }
                    placeholder="email@gmail.com"
                    className={inputClass}
                  />

                </FormField>

                <FormField label="Address">

                  <input
                    type="text"
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
                            event.target.value,
                        }),
                      )
                    }
                    placeholder="Area, District"
                    className={inputClass}
                  />

                </FormField>

              </div>

              <div className="grid grid-cols-2 gap-3 px-5 pb-5">

                <button
                  type="button"
                  onClick={
                    closeCustomerModal
                  }
                  disabled={
                    isSaving
                  }
                  className="h-10 rounded-xl border border-slate-200 bg-white text-[11px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    isSaving
                  }
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-sky-600 text-[11px] font-semibold text-white hover:bg-sky-700 disabled:bg-sky-400"
                >

                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />

                      {formMode ===
                      "edit"
                        ? "Saving..."
                        : "Adding..."}
                    </>
                  ) : formMode ===
                    "edit" ? (
                    "Save Changes"
                  ) : (
                    "Add Customer"
                  )}

                </button>

              </div>

            </form>

          </div>

        </div>
      ) : null}

      {/* ===================================================
          CUSTOMER PROFILE
      =================================================== */}

      {selectedCustomer ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]">

          <div className="max-h-[92vh] w-full max-w-[480px] overflow-y-auto rounded-2xl bg-white shadow-2xl">

            <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">

              <h2 className="text-[15px] font-semibold text-slate-900">
                Customer Profile
              </h2>

              <button
                type="button"
                onClick={() =>
                  setSelectedCustomer(
                    null,
                  )
                }
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>

            </div>

            <div className="space-y-4 p-5">

              {/* PROFILE CARD */}

              <section className="flex items-center gap-4 rounded-2xl border border-sky-100 bg-sky-50 p-4">

                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-amber-400 text-base font-semibold text-white">
                  {getInitial(
                    selectedCustomer.name,
                  )}
                </div>

                <div className="min-w-0 flex-1">

                  <div className="flex items-center gap-2">

                    <p className="truncate text-[14px] font-semibold text-slate-900">
                      {
                        selectedCustomer.name
                      }
                    </p>

                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[7px] font-semibold ${
                        selectedCustomer.status ===
                        "active"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {selectedCustomer.status ===
                      "active"
                        ? "ACTIVE"
                        : "INACTIVE"}
                    </span>

                  </div>

                  <p className="mt-1 truncate text-[9px] text-slate-500">

                    {selectedCustomer.phone}

                    {selectedCustomer.email
                      ? ` · ${selectedCustomer.email}`
                      : ""}

                  </p>

                  <p className="mt-1 truncate text-[9px] text-slate-500">
                    {selectedCustomer.address ||
                      "No address"}
                  </p>

                </div>

              </section>

              {/* STATS */}

              <section className="grid grid-cols-2 gap-3">

                <ProfileMetric
                  label="TOTAL PURCHASES"
                  value={selectedCustomer.totalSales.toLocaleString(
                    "en-US",
                  )}
                />

                <ProfileMetric
                  label="TOTAL SPENT"
                  value={`৳${formatMoney(
                    selectedCustomer.totalPurchaseAmount,
                  )}`}
                />

                <ProfileMetric
                  label="LAST VISIT"
                  value={formatDate(
                    selectedCustomer.lastVisit,
                  )}
                />

                <ProfileMetric
                  label="DUE AMOUNT"
                  value={`৳${formatMoney(
                    selectedCustomer.totalDue,
                  )}`}
                  valueClassName={
                    selectedCustomer.totalDue >
                    0
                      ? "text-rose-600"
                      : ""
                  }
                />

              </section>

              {/* HISTORY */}

              <section className="rounded-2xl border border-slate-200 p-4">

                <h3 className="text-[12px] font-semibold text-slate-900">
                  Purchase History
                </h3>

                {selectedCustomer.sales.length >
                0 ? (
                  <div className="mt-3 space-y-2">

                    {selectedCustomer.sales.map(
                      (sale) => {
                        const cancelled =
                          sale.status ===
                          "CANCELLED";

                        return (
                          <div
                            key={
                              sale.invoice
                            }
                            className="rounded-xl bg-slate-50 p-3"
                          >

                            <div className="flex items-start justify-between gap-3">

                              <div>

                                <p className="font-mono text-[9px] font-semibold text-sky-700">
                                  {
                                    sale.invoice
                                  }
                                </p>

                                <p className="mt-1 text-[8px] text-slate-400">
                                  {formatDate(
                                    sale.saleDate,
                                  )}
                                </p>

                              </div>

                              <p className="text-[10px] font-semibold text-emerald-700">
                                ৳
                                {formatMoney(
                                  sale.amount,
                                )}
                              </p>

                            </div>

                            <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-200 pt-2">

                              <HistoryMetric
                                label="Items"
                                value={sale.itemCount.toLocaleString(
                                  "en-US",
                                )}
                              />

                              <HistoryMetric
                                label="Paid"
                                value={`৳${formatMoney(
                                  sale.paidAmount,
                                )}`}
                              />

                              <HistoryMetric
                                label="Due"
                                value={`৳${formatMoney(
                                  sale.dueAmount,
                                )}`}
                                valueClassName={
                                  sale.dueAmount >
                                  0
                                    ? "text-rose-600"
                                    : ""
                                }
                              />

                            </div>

                            <div className="mt-2">

                              <span
                                className={`inline-flex rounded-full px-2 py-0.5 text-[7px] font-medium ${
                                  cancelled
                                    ? "bg-slate-200 text-slate-600"
                                    : sale.paymentStatus ===
                                        "PAID"
                                      ? "bg-emerald-100 text-emerald-700"
                                      : sale.paymentStatus ===
                                          "PARTIAL"
                                        ? "bg-amber-100 text-amber-700"
                                        : "bg-rose-100 text-rose-600"
                                }`}
                              >
                                {cancelled
                                  ? "CANCELLED"
                                  : sale.paymentStatus}
                              </span>

                            </div>

                            {!cancelled &&
                            sale.dueAmount >
                              0 ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setDueTarget({
                                    invoice:
                                      sale.invoice,

                                    dueAmount:
                                      sale.dueAmount,
                                  })
                                }
                                className="mt-3 h-8 w-full rounded-lg bg-sky-600 text-[9px] font-semibold text-white hover:bg-sky-700"
                              >
                                Collect Payment
                              </button>
                            ) : null}

                          </div>
                        );
                      },
                    )}

                  </div>
                ) : (
                  <p className="mt-2 text-[10px] leading-5 text-slate-500">
                    No purchase history yet.
                  </p>
                )}

              </section>

              {/* ACTIONS */}

              <div className="grid grid-cols-3 gap-3">

                <button
                  type="button"
                  onClick={() =>
                    openEditModal(
                      selectedCustomer,
                    )
                  }
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-sky-600 px-2 text-[10px] font-semibold text-white hover:bg-sky-700"
                >
                  <Pencil className="h-3.5 w-3.5" />

                  Edit
                </button>

                <button
                  type="button"
                  disabled={
                    isStatusUpdating
                  }
                  onClick={() =>
                    void handleToggleCustomerStatus()
                  }
                  className={`h-10 rounded-xl px-2 text-[9px] font-semibold disabled:opacity-50 ${
                    selectedCustomer.status ===
                    "active"
                      ? "border border-rose-200 bg-white text-rose-600 hover:bg-rose-50"
                      : "bg-emerald-600 text-white hover:bg-emerald-700"
                  }`}
                >
                  {isStatusUpdating
                    ? "Updating..."
                    : selectedCustomer.status ===
                        "active"
                      ? "Deactivate"
                      : "Activate"}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setSelectedCustomer(
                      null,
                    )
                  }
                  className="h-10 rounded-xl border border-slate-200 bg-white text-[10px] font-medium text-slate-700 hover:bg-slate-50"
                >
                  Close
                </button>

              </div>

            </div>

          </div>

        </div>
      ) : null}

      {/* ===================================================
          COLLECT PAYMENT
      =================================================== */}

      {dueTarget ? (
        <CollectPaymentModal
          invoice={
            dueTarget.invoice
          }
          dueAmount={
            dueTarget.dueAmount
          }
          onClose={() =>
            setDueTarget(
              null,
            )
          }
          onSuccess={async () => {
            const customerId =
              selectedCustomer?.id;

            if (
              customerId
            ) {
              await refreshCustomer(
                customerId,
              );
            } else {
              await loadCustomers();
            }
          }}
        />
      ) : null}
    </>
  );
}

/* =========================================================
   STYLES
========================================================= */

const inputClass =
  "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[11px] text-slate-700 outline-none placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-100";

/* =========================================================
   SMALL COMPONENTS
========================================================= */

function StatCard({
  label,
  value,
  className,
  valueClassName,
}: {
  label: string;

  value: string;

  className: string;

  valueClassName: string;
}) {
  return (
    <article
      className={`min-h-[85px] rounded-2xl border p-4 ${className}`}
    >

      <p className="text-[9px] font-medium text-slate-500">
        {label}
      </p>

      <p
        className={`mt-2 text-[22px] font-semibold ${valueClassName}`}
      >
        {value}
      </p>

    </article>
  );
}

function CardMetric({
  label,
  value,
  valueClassName =
    "text-slate-900",
}: {
  label: string;

  value: string;

  valueClassName?: string;
}) {
  return (
    <div>

      <p className="text-[8px] font-medium text-slate-500">
        {label}
      </p>

      <p
        className={`mt-1 text-[10px] font-semibold ${valueClassName}`}
      >
        {value}
      </p>

    </div>
  );
}

function ProfileMetric({
  label,
  value,
  valueClassName =
    "text-slate-900",
}: {
  label: string;

  value: string;

  valueClassName?: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">

      <p className="text-[8px] font-medium text-slate-500">
        {label}
      </p>

      <p
        className={`mt-1 text-[11px] font-semibold ${valueClassName}`}
      >
        {value}
      </p>

    </div>
  );
}

function HistoryMetric({
  label,
  value,
  valueClassName =
    "text-slate-700",
}: {
  label: string;

  value: string;

  valueClassName?: string;
}) {
  return (
    <div>

      <p className="text-[7px] text-slate-400">
        {label}
      </p>

      <p
        className={`mt-0.5 text-[8px] font-semibold ${valueClassName}`}
      >
        {value}
      </p>

    </div>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;

  children: ReactNode;
}) {
  return (
    <div>

      <label className="mb-2 block text-[11px] font-medium text-slate-800">
        {label}
      </label>

      {children}

    </div>
  );
}

function avatarClass(
  index: number,
) {
  const classes = [
    "bg-amber-400",
    "bg-lime-500",
    "bg-emerald-500",
    "bg-cyan-500",
    "bg-indigo-600",
    "bg-purple-500",
    "bg-pink-600",
    "bg-orange-600",
  ];

  return classes[
    index %
      classes.length
  ];
}