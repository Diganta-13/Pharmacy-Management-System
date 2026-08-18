"use client";

import {
  useState,
} from "react";

import type {
  FormEvent,
} from "react";

import {
  Loader2,
  X,
} from "lucide-react";

/* =========================================================
   TYPES
========================================================= */

type PaymentMethod =
  | "CASH"
  | "BKASH"
  | "NAGAD"
  | "CARD"
  | "ROCKET"
  | "BANK";

type Props = {
  invoice: string;

  dueAmount: number;

  onClose: () => void;

  onSuccess: () =>
    | void
    | Promise<void>;
};

/* =========================================================
   HELPERS
========================================================= */

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

/* =========================================================
   COMPONENT
========================================================= */

export default function CollectPaymentModal({
  invoice,
  dueAmount,
  onClose,
  onSuccess,
}: Props) {
  const [
    amount,
    setAmount,
  ] =
    useState(
      String(
        dueAmount,
      ),
    );

  const [
    paymentMethod,
    setPaymentMethod,
  ] =
    useState<PaymentMethod>(
      "CASH",
    );

  const [
    transactionReference,
    setTransactionReference,
  ] =
    useState("");

  const [
    notes,
    setNotes,
  ] =
    useState("");

  const [
    isSaving,
    setIsSaving,
  ] =
    useState(false);

  /* =======================================================
     SUBMIT
  ======================================================= */

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (isSaving) {
      return;
    }

    const numericAmount =
      Number(amount);

    if (
      !Number.isFinite(
        numericAmount,
      ) ||
      numericAmount <= 0
    ) {
      window.alert(
        "Enter a valid payment amount.",
      );

      return;
    }

    if (
      numericAmount >
      dueAmount
    ) {
      window.alert(
        `Payment cannot exceed ৳${formatMoney(
          dueAmount,
        )}.`,
      );

      return;
    }

    try {
      setIsSaving(true);

      const response =
        await fetch(
          `/api/sales/${encodeURIComponent(
            invoice,
          )}/payments`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                amount:
                  numericAmount,

                paymentMethod,

                transactionReference:
                  transactionReference.trim(),

                notes:
                  notes.trim(),
              }),
          },
        );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Failed to collect payment.",
        );
      }

      await onSuccess();

      onClose();
    } catch (error) {
      console.error(
        "Collect payment error:",
        error,
      );

      window.alert(
        error instanceof Error
          ? error.message
          : "Failed to collect payment.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]">

      <div className="w-full max-w-[440px] overflow-hidden rounded-2xl bg-white shadow-2xl">

        {/* HEADER */}

        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">

          <div>
            <h2 className="text-[15px] font-semibold text-slate-900">
              Collect Payment
            </h2>

            <p className="mt-1 font-mono text-[9px] text-slate-500">
              {invoice}
            </p>
          </div>

          <button
            type="button"
            disabled={
              isSaving
            }
            onClick={
              onClose
            }
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>

        </div>

        <form
          onSubmit={
            handleSubmit
          }
        >

          <div className="space-y-4 p-5">

            {/* OUTSTANDING */}

            <section className="rounded-xl border border-rose-100 bg-rose-50 p-4">

              <p className="text-[9px] font-medium text-rose-500">
                Outstanding Due
              </p>

              <p className="mt-1 text-xl font-semibold text-rose-600">
                ৳
                {formatMoney(
                  dueAmount,
                )}
              </p>

            </section>

            {/* AMOUNT */}

            <div>

              <label className="mb-2 block text-[11px] font-medium text-slate-800">
                Payment Amount *
              </label>

              <input
                type="number"
                min="0.01"
                max={
                  dueAmount
                }
                step="0.01"
                required
                value={
                  amount
                }
                disabled={
                  isSaving
                }
                onChange={(
                  event,
                ) =>
                  setAmount(
                    event.target.value,
                  )
                }
                className={inputClass}
              />

            </div>

            {/* METHOD */}

            <div>

              <label className="mb-2 block text-[11px] font-medium text-slate-800">
                Payment Method *
              </label>

              <select
                value={
                  paymentMethod
                }
                disabled={
                  isSaving
                }
                onChange={(
                  event,
                ) =>
                  setPaymentMethod(
                    event.target
                      .value as PaymentMethod,
                  )
                }
                className={inputClass}
              >
                <option value="CASH">
                  Cash
                </option>

                <option value="BKASH">
                  bKash
                </option>

                <option value="NAGAD">
                  Nagad
                </option>

                <option value="CARD">
                  Card
                </option>

                <option value="ROCKET">
                  Rocket
                </option>

                <option value="BANK">
                  Bank
                </option>
              </select>

            </div>

            {/* TRANSACTION REFERENCE */}

            {paymentMethod !==
            "CASH" ? (

              <div>

                <label className="mb-2 block text-[11px] font-medium text-slate-800">
                  Transaction Reference
                </label>

                <input
                  type="text"
                  maxLength={
                    150
                  }
                  value={
                    transactionReference
                  }
                  disabled={
                    isSaving
                  }
                  onChange={(
                    event,
                  ) =>
                    setTransactionReference(
                      event.target.value,
                    )
                  }
                  placeholder="Transaction ID / reference"
                  className={inputClass}
                />

              </div>

            ) : null}

            {/* NOTES */}

            <div>

              <label className="mb-2 block text-[11px] font-medium text-slate-800">
                Notes
              </label>

              <input
                type="text"
                maxLength={
                  255
                }
                value={
                  notes
                }
                disabled={
                  isSaving
                }
                onChange={(
                  event,
                ) =>
                  setNotes(
                    event.target.value,
                  )
                }
                placeholder="Optional note"
                className={inputClass}
              />

            </div>

          </div>

          {/* FOOTER */}

          <div className="grid grid-cols-2 gap-3 px-5 pb-5">

            <button
              type="button"
              disabled={
                isSaving
              }
              onClick={
                onClose
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

                  Saving...
                </>
              ) : (
                "Collect Payment"
              )}

            </button>

          </div>

        </form>

      </div>

    </div>
  );
}

const inputClass =
  "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[11px] text-slate-700 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-100";