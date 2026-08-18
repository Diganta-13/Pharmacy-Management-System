"use client";

import {
  useEffect,
  useState,
} from "react";

import type {
  FormEvent,
} from "react";

import {
  Check,
  Loader2,
} from "lucide-react";

/* =========================================================
   TYPES
========================================================= */

type Role = {
  id: number;

  name: string;

  displayName: string;

  description: string;

  status: "active";
};

type SettingsData = {
  pharmacyName: string;

  address: string;

  phone: string;

  email: string;

  vatEnabled: boolean;

  vatRate: number;

  invoicePrefix: string;

  purchasePrefix: string;

  currencyCode: string;

  invoiceFooter: string;

  updatedAt:
    | string
    | null;

  roles: Role[];
};

type SettingsApiResponse = {
  success: boolean;

  message?: string;

  data?: SettingsData;
};

type SettingsForm = {
  pharmacyName: string;

  address: string;

  phone: string;

  email: string;

  vatEnabled: boolean;

  vatRate: string;
};

/* =========================================================
   DEFAULT
========================================================= */

function createDefaultForm():
  SettingsForm {
  return {
    pharmacyName: "",

    address: "",

    phone: "",

    email: "",

    vatEnabled: false,

    vatRate: "0",
  };
}

/* =========================================================
   PAGE
========================================================= */

export default function SettingsPage() {
  const [
    form,
    setForm,
  ] =
    useState<SettingsForm>(
      createDefaultForm(),
    );

  const [
    roles,
    setRoles,
  ] =
    useState<Role[]>([]);

  const [
    invoicePrefix,
    setInvoicePrefix,
  ] =
    useState("INV");

  const [
    currencyCode,
    setCurrencyCode,
  ] =
    useState("BDT");

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
    errorMessage,
    setErrorMessage,
  ] =
    useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] =
    useState("");

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    const controller =
      new AbortController();

    async function loadSettings() {
      try {
        setErrorMessage("");

        const response =
          await fetch(
            "/api/settings",
            {
              method: "GET",

              cache:
                "no-store",

              signal:
                controller.signal,
            },
          );

        const result:
          SettingsApiResponse =
          await response.json();

        if (
          !response.ok ||
          !result.success ||
          !result.data
        ) {
          throw new Error(
            result.message ||
              "Failed to load settings.",
          );
        }

        if (
          controller.signal
            .aborted
        ) {
          return;
        }

        const settings =
          result.data;

        setForm({
          pharmacyName:
            settings.pharmacyName,

          address:
            settings.address,

          phone:
            settings.phone,

          email:
            settings.email,

          vatEnabled:
            settings.vatEnabled,

          vatRate:
            String(
              settings.vatRate,
            ),
        });

        setRoles(
          settings.roles ?? [],
        );

        setInvoicePrefix(
          settings.invoicePrefix ||
            "INV",
        );

        setCurrencyCode(
          settings.currencyCode ||
            "BDT",
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
          "Load settings error:",
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
              : "Failed to load settings.",
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

    void loadSettings();

    return () => {
      controller.abort();
    };
  }, []);

  /* =======================================================
     RELOAD
  ======================================================= */

  async function reloadSettings() {
    const response =
      await fetch(
        "/api/settings",
        {
          method: "GET",

          cache:
            "no-store",
        },
      );

    const result:
      SettingsApiResponse =
      await response.json();

    if (
      !response.ok ||
      !result.success ||
      !result.data
    ) {
      throw new Error(
        result.message ||
          "Failed to load settings.",
      );
    }

    const settings =
      result.data;

    setForm({
      pharmacyName:
        settings.pharmacyName,

      address:
        settings.address,

      phone:
        settings.phone,

      email:
        settings.email,

      vatEnabled:
        settings.vatEnabled,

      vatRate:
        String(
          settings.vatRate,
        ),
    });

    setRoles(
      settings.roles ?? [],
    );

    setInvoicePrefix(
      settings.invoicePrefix ||
        "INV",
    );

    setCurrencyCode(
      settings.currencyCode ||
        "BDT",
    );
  }

  /* =======================================================
     VALIDATION
  ======================================================= */

  function validateForm() {
    const pharmacyName =
      form.pharmacyName.trim();

    const email =
      form.email.trim();

    const vatRate =
      Number(
        form.vatRate,
      );

    if (!pharmacyName) {
      window.alert(
        "Pharmacy name is required.",
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

    if (
      !Number.isFinite(
        vatRate,
      ) ||
      vatRate < 0 ||
      vatRate > 100
    ) {
      window.alert(
        "VAT rate must be between 0 and 100.",
      );

      return false;
    }

    return true;
  }

  /* =======================================================
     SAVE
  ======================================================= */

  async function handleSave(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      isSaving ||
      !validateForm()
    ) {
      return;
    }

    try {
      setIsSaving(true);

      setErrorMessage("");

      setSuccessMessage("");

      const response =
        await fetch(
          "/api/settings",
          {
            method: "PUT",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                pharmacyName:
                  form.pharmacyName.trim(),

                address:
                  form.address.trim(),

                phone:
                  form.phone.trim(),

                email:
                  form.email.trim(),

                vatEnabled:
                  form.vatEnabled,

                vatRate:
                  Number(
                    form.vatRate,
                  ),
              }),
          },
        );

      const result:
        SettingsApiResponse =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Failed to save settings.",
        );
      }

      await reloadSettings();

      setSuccessMessage(
        "Settings saved successfully.",
      );

      /*
       * Auto-hide success message.
       */
      window.setTimeout(
        () => {
          setSuccessMessage(
            "",
          );
        },
        3000,
      );
    } catch (error) {
      console.error(
        "Save settings error:",
        error,
      );

      const message =
        error instanceof Error
          ? error.message
          : "Failed to save settings.";

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
     LOADING
  ======================================================= */

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] w-full max-w-[610px] items-center justify-center">

        <div className="text-center">

          <Loader2 className="mx-auto h-7 w-7 animate-spin text-sky-600" />

          <p className="mt-3 text-[11px] text-slate-500">
            Loading settings...
          </p>

        </div>

      </div>
    );
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <form
      onSubmit={
        handleSave
      }
      className="w-full max-w-[610px] space-y-4 pb-6"
    >

      {/* ===================================================
          PHARMACY INFORMATION
      =================================================== */}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

        <h2 className="mb-5 text-[12px] font-semibold text-slate-900">
          Pharmacy Information
        </h2>

        <div className="space-y-4">

          {/* PHARMACY NAME */}

          <SettingsField label="Pharmacy Name">

            <input
              type="text"
              required
              maxLength={
                150
              }
              value={
                form.pharmacyName
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

                    pharmacyName:
                      event.target
                        .value,
                  }),
                )
              }
              placeholder="Green Life Pharmacy"
              className={inputClass}
            />

          </SettingsField>

          {/* ADDRESS */}

          <SettingsField label="Address">

            <input
              type="text"
              maxLength={
                255
              }
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
              placeholder="Dhanmondi, Dhaka, Bangladesh"
              className={inputClass}
            />

          </SettingsField>

          {/* PHONE */}

          <SettingsField label="Phone Number">

            <input
              type="text"
              maxLength={
                30
              }
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
              placeholder="01711234567"
              className={inputClass}
            />

          </SettingsField>

          {/* EMAIL */}

          <SettingsField label="Email Address">

            <input
              type="email"
              maxLength={
                150
              }
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
              placeholder="greenlifepharmacy@gmail.com"
              className={inputClass}
            />

          </SettingsField>

        </div>

      </section>

      {/* ===================================================
          VAT SETTINGS
      =================================================== */}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

        <h2 className="mb-5 text-[12px] font-semibold text-slate-900">
          Invoice & VAT Settings
        </h2>

        <div className="space-y-4">

          {/* VAT TOGGLE */}

          <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">

            <div>

              <p className="text-[11px] font-medium text-slate-900">
                Enable VAT
              </p>

              <p className="mt-0.5 text-[8px] text-slate-500">
                Apply VAT to new sales
              </p>

            </div>

            <button
              type="button"
              role="switch"
              aria-checked={
                form.vatEnabled
              }
              disabled={
                isSaving
              }
              onClick={() =>
                setForm(
                  (
                    current,
                  ) => ({
                    ...current,

                    vatEnabled:
                      !current.vatEnabled,
                  }),
                )
              }
              className={`relative h-6 w-11 rounded-full transition ${
                form.vatEnabled
                  ? "bg-emerald-500"
                  : "bg-slate-300"
              } disabled:opacity-50`}
            >

              <span
                className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${
                  form.vatEnabled
                    ? "left-6"
                    : "left-1"
                }`}
              />

            </button>

          </div>

          {/* VAT RATE */}

          <SettingsField label="VAT (%)">

            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={
                form.vatRate
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

                    vatRate:
                      event.target
                        .value,
                  }),
                )
              }
              className={inputClass}
            />

          </SettingsField>

          {/* INVOICE FORMAT */}

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">

            <p className="text-[11px] font-medium text-slate-900">
              Invoice Format
            </p>

            <p className="mt-1 text-[9px] text-slate-500">
              {invoicePrefix}
              -YYYY-NNN · Date:
              DD-MM-YYYY · Currency:
              ৳ ({currencyCode})
            </p>

          </div>

        </div>

      </section>

      {/* ===================================================
          ROLES
      =================================================== */}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

        <h2 className="mb-4 text-[12px] font-semibold text-slate-900">
          User Role Settings
        </h2>

        {roles.length >
        0 ? (

          <div className="space-y-2">

            {roles.map(
              (role) => (

                <div
                  key={
                    role.id
                  }
                  className="flex min-h-[44px] items-center justify-between rounded-xl border border-slate-200 px-3"
                >

                  <div className="min-w-0">

                    <p className="truncate text-[11px] font-medium text-slate-900">
                      {
                        role.displayName
                      }
                    </p>

                    {role.description ? (

                      <p className="mt-0.5 truncate text-[7px] text-slate-400">
                        {
                          role.description
                        }
                      </p>

                    ) : null}

                  </div>

                  <span className="ml-4 inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[8px] font-medium text-emerald-700">

                    <Check className="h-2.5 w-2.5" />

                    Active

                  </span>

                </div>

              ),
            )}

          </div>

        ) : (

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">

            <p className="text-[10px] text-slate-500">
              No roles found.
            </p>

          </div>

        )}

      </section>

      {/* ===================================================
          MESSAGES
      =================================================== */}

      {errorMessage ? (

        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">

          <p className="text-[10px] text-rose-700">
            {
              errorMessage
            }
          </p>

        </div>

      ) : null}

      {successMessage ? (

        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">

          <Check className="h-4 w-4 text-emerald-600" />

          <p className="text-[10px] font-medium text-emerald-700">
            {
              successMessage
            }
          </p>

        </div>

      ) : null}

      {/* ===================================================
          SAVE
      =================================================== */}

      <button
        type="submit"
        disabled={
          isSaving
        }
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-sky-600 text-[11px] font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:bg-sky-400"
      >

        {isSaving ? (

          <>
            <Loader2 className="h-4 w-4 animate-spin" />

            Saving Settings...
          </>

        ) : (

          "Save Settings"

        )}

      </button>

    </form>
  );
}

/* =========================================================
   FIELD
========================================================= */

function SettingsField({
  label,
  children,
}: {
  label: string;

  children:
    React.ReactNode;
}) {
  return (
    <div>

      <label className="mb-2 block text-[11px] font-medium text-slate-900">
        {label}
      </label>

      {children}

    </div>
  );
}

/* =========================================================
   INPUT CLASS
========================================================= */

const inputClass =
  "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[11px] text-slate-800 outline-none placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-100";