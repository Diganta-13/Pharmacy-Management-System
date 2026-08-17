"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  ReactNode,
} from "react";

import {
  Loader2,
  Minus,
  Plus,
  Search,
  ShoppingCart,
  X,
} from "lucide-react";

/* =========================================================
   TYPES
========================================================= */

type PaymentMethod =
  | "Cash"
  | "bKash"
  | "Nagad"
  | "Card"
  | "Rocket";

type PaymentStatus =
  | "paid"
  | "partial"
  | "due";

type MedicineUnit = {
  id: string;

  unitName: string;

  conversionToBase: number;

  price: number;

  sellable: boolean;
};

type MedicineBatch = {
  id: string;

  batchNo: string;

  expiryDate: string;

  stockBaseQuantity: number;

  status:
    | "ACTIVE"
    | "DEPLETED"
    | "EXPIRED"
    | "BLOCKED";
};

type Medicine = {
  id: string;

  databaseId?: number;

  name: string;

  genericName: string;

  category: string;

  baseUnit: string;

  units: MedicineUnit[];

  batches: MedicineBatch[];
};

type CartItem = {
  id: string;

  medicineId: string;

  medicineName: string;

  baseUnit: string;

  unitName: string;

  conversionToBase: number;

  unitPrice: number;

  quantity: number;
};

type SaleRowDraft = {
  unitName: string;

  quantity: string;
};

type Sale = {
  invoice: string;

  customer: string;

  mobile: string;

  date: string;

  items: number;

  amount: number;

  method: string;

  status: PaymentStatus;
};

type InvoiceItem = {
  id: string;

  medicineId: string;

  medicineName: string;

  baseUnit?: string;

  unitName: string;

  conversionToBase: number;

  unitPrice: number;

  quantity: number;
};

type GeneratedInvoice = {
  invoice: string;

  customer: string;

  mobile: string;

  date: string;

  items: InvoiceItem[];

  subtotal: number;

  discountPercent: number;

  discountAmount: number;

  vatEnabled: boolean;

  vatRatePercent: number;

  vatAmount: number;

  total: number;

  paymentMethod: string;

  paymentStatus: PaymentStatus;

  paidAmount: number;

  dueAmount: number;
};

type SalesSettings = {
  vatEnabled: boolean;

  vatRatePercent: number;
};

type CatalogApiResponse = {
  success: boolean;

  message?: string;

  data?: Medicine[];

  settings?: SalesSettings;
};

type SalesApiResponse = {
  success: boolean;

  message?: string;

  data?: Sale[];
};

type CreateSaleApiResponse = {
  success: boolean;

  message?: string;

  data?: GeneratedInvoice;
};

/* =========================================================
   DEFAULT SETTINGS
========================================================= */

const DEFAULT_SALES_SETTINGS: SalesSettings = {
  vatEnabled: false,

  vatRatePercent: 0,
};

/* =========================================================
   HELPERS
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

function roundMoney(
  value: number,
) {
  return (
    Math.round(
      (value +
        Number.EPSILON) *
        100,
    ) / 100
  );
}

function formatMoney(
  value: number,
) {
  return value.toLocaleString(
    "en-US",
    {
      minimumFractionDigits:
        2,

      maximumFractionDigits:
        2,
    },
  );
}

/* =========================================================
   UNIT HELPERS
========================================================= */

function getSellableUnits(
  medicine: Medicine,
) {
  return medicine.units
    .filter(
      (unit) =>
        unit.sellable,
    )
    .sort(
      (
        first,
        second,
      ) =>
        second.conversionToBase -
        first.conversionToBase,
    );
}

function getDefaultSellingUnit(
  medicine: Medicine,
) {
  const units =
    getSellableUnits(
      medicine,
    );

  const baseUnit =
    units.find(
      (unit) =>
        unit.unitName ===
        medicine.baseUnit,
    );

  return (
    baseUnit ??
    units[
      units.length - 1
    ]
  );
}

function createInitialDrafts(
  medicines: Medicine[],
) {
  const drafts: Record<
    string,
    SaleRowDraft
  > = {};

  medicines.forEach(
    (medicine) => {
      const defaultUnit =
        getDefaultSellingUnit(
          medicine,
        );

      drafts[
        medicine.id
      ] = {
        unitName:
          defaultUnit
            ?.unitName ??
          "",

        quantity:
          "1",
      };
    },
  );

  return drafts;
}

/* =========================================================
   STOCK HELPERS
========================================================= */

function isBatchValid(
  batch: MedicineBatch,
) {
  return (
    batch.status ===
      "ACTIVE" &&
    batch.stockBaseQuantity >
      0 &&
    batch.expiryDate >=
      getTodayDateOnly()
  );
}

function getValidStockBase(
  medicine: Medicine,
) {
  return medicine.batches
    .filter(
      isBatchValid,
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

function getExpiredStockBase(
  medicine: Medicine,
) {
  const today =
    getTodayDateOnly();

  return medicine.batches
    .filter(
      (batch) =>
        batch.stockBaseQuantity >
          0 &&
        (
          batch.status ===
            "EXPIRED" ||
          batch.expiryDate <
            today
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

/* =========================================================
   PAGE
========================================================= */

export default function SalesPage() {
  /* =======================================================
     DATABASE DATA
  ======================================================= */

  const [
    medicines,
    setMedicines,
  ] =
    useState<Medicine[]>([]);

  const [
    recentSales,
    setRecentSales,
  ] =
    useState<Sale[]>([]);

  const [
    settings,
    setSettings,
  ] =
    useState<SalesSettings>(
      DEFAULT_SALES_SETTINGS,
    );

  /* =======================================================
     SALE DRAFTS
  ======================================================= */

  const [
    drafts,
    setDrafts,
  ] =
    useState<
      Record<
        string,
        SaleRowDraft
      >
    >({});

  const [
    cart,
    setCart,
  ] =
    useState<CartItem[]>(
      [],
    );

  /* =======================================================
     SEARCH
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

  /* =======================================================
     BILLING
  ======================================================= */

  const [
    customerName,
    setCustomerName,
  ] =
    useState("");

  const [
    mobileNumber,
    setMobileNumber,
  ] =
    useState("");

  const [
    paymentStatus,
    setPaymentStatus,
  ] =
    useState<PaymentStatus>(
      "paid",
    );

  const [
    paymentMethod,
    setPaymentMethod,
  ] =
    useState<PaymentMethod>(
      "Cash",
    );

  const [
    partialPaidAmount,
    setPartialPaidAmount,
  ] =
    useState("");

  const [
    discountPercent,
    setDiscountPercent,
  ] =
    useState("0");

  /* =======================================================
     UI STATE
  ======================================================= */

  const [
    generatedInvoice,
    setGeneratedInvoice,
  ] =
    useState<GeneratedInvoice | null>(
      null,
    );

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true);

  const [
    isSubmitting,
    setIsSubmitting,
  ] =
    useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState("");

  /* =======================================================
     INITIAL DATABASE LOAD
  ======================================================= */

  useEffect(() => {
    const controller =
      new AbortController();

    async function loadInitialData() {
      try {
        const [
          catalogResponse,
          salesResponse,
        ] =
          await Promise.all([
            fetch(
              "/api/sales/catalog",
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
              "/api/sales",
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

        const catalogResult:
          CatalogApiResponse =
          await catalogResponse.json();

        const salesResult:
          SalesApiResponse =
          await salesResponse.json();

        if (
          !catalogResponse.ok ||
          !catalogResult.success
        ) {
          throw new Error(
            catalogResult.message ||
              "Failed to load medicine catalog.",
          );
        }

        if (
          !salesResponse.ok ||
          !salesResult.success
        ) {
          throw new Error(
            salesResult.message ||
              "Failed to load recent sales.",
          );
        }

        if (
          controller.signal
            .aborted
        ) {
          return;
        }

        const loadedMedicines =
          catalogResult.data ??
          [];

        setMedicines(
          loadedMedicines,
        );

        setDrafts(
          createInitialDrafts(
            loadedMedicines,
          ),
        );

        setRecentSales(
          salesResult.data ??
            [],
        );

        setSettings(
          catalogResult.settings ??
            DEFAULT_SALES_SETTINGS,
        );
      } catch (error) {
        if (
          error instanceof Error &&
          error.name ===
            "AbortError"
        ) {
          return;
        }

        console.error(
          "Sales initial load error:",
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
              : "Failed to load sales data.",
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
     RELOAD DATABASE DATA

     Called after a completed sale.
  ======================================================= */

  async function reloadSalesData() {
    const [
      catalogResponse,
      salesResponse,
    ] =
      await Promise.all([
        fetch(
          "/api/sales/catalog",
          {
            method:
              "GET",

            cache:
              "no-store",
          },
        ),

        fetch(
          "/api/sales",
          {
            method:
              "GET",

            cache:
              "no-store",
          },
        ),
      ]);

    const catalogResult:
      CatalogApiResponse =
      await catalogResponse.json();

    const salesResult:
      SalesApiResponse =
      await salesResponse.json();

    if (
      !catalogResponse.ok ||
      !catalogResult.success
    ) {
      throw new Error(
        catalogResult.message ||
          "Failed to refresh stock.",
      );
    }

    if (
      !salesResponse.ok ||
      !salesResult.success
    ) {
      throw new Error(
        salesResult.message ||
          "Failed to refresh sales.",
      );
    }

    const freshMedicines =
      catalogResult.data ??
      [];

    setMedicines(
      freshMedicines,
    );

    setDrafts(
      createInitialDrafts(
        freshMedicines,
      ),
    );

    setRecentSales(
      salesResult.data ??
        [],
    );

    setSettings(
      catalogResult.settings ??
        DEFAULT_SALES_SETTINGS,
    );
  }

  /* =======================================================
     CATEGORIES
  ======================================================= */

  const categories =
    useMemo(() => {
      return [
        "All",

        ...Array.from(
          new Set(
            medicines.map(
              (medicine) =>
                medicine.category,
            ),
          ),
        ).sort(),
      ];
    }, [medicines]);

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

            medicine.category
              .toLowerCase()
              .includes(
                search,
              );

          const matchesCategory =
            categoryFilter ===
              "All" ||
            medicine.category ===
              categoryFilter;

          return (
            matchesSearch &&
            matchesCategory
          );
        },
      );
    }, [
      medicines,
      searchTerm,
      categoryFilter,
    ]);

  /* =======================================================
     CART RESERVED STOCK

     Example:

     Cart:
       1 Box   = 100 Tablet
       5 Strip = 50 Tablet
       3 Tab   = 3 Tablet

     Reserved = 153 Tablet
  ======================================================= */

  function getReservedBase(
    medicineId: string,
  ) {
    return cart
      .filter(
        (item) =>
          item.medicineId ===
          medicineId,
      )
      .reduce(
        (
          total,
          item,
        ) =>
          total +
          item.quantity *
            item.conversionToBase,

        0,
      );
  }

  function getRemainingBase(
    medicine: Medicine,
  ) {
    return Math.max(
      0,

      getValidStockBase(
        medicine,
      ) -
        getReservedBase(
          medicine.id,
        ),
    );
  }

  /* =======================================================
     DRAFT UNIT
  ======================================================= */

  function updateUnit(
    medicineId: string,
    unitName: string,
  ) {
    setDrafts(
      (current) => ({
        ...current,

        [medicineId]: {
          unitName,

          quantity:
            "1",
        },
      }),
    );
  }

  /* =======================================================
     DRAFT QUANTITY
  ======================================================= */

  function updateQuantity(
    medicineId: string,
    value: string,
  ) {
    /*
     * Blank input allowed so Backspace works.
     * Whole quantity only.
     */
    if (
      !/^\d*$/.test(
        value,
      )
    ) {
      return;
    }

    setDrafts(
      (current) => ({
        ...current,

        [medicineId]: {
          unitName:
            current[
              medicineId
            ]?.unitName ??
            "",

          quantity:
            value,
        },
      }),
    );
  }

  /* =======================================================
     ADD TO CART
  ======================================================= */

  function addToCart(
    medicine: Medicine,
  ) {
    const draft =
      drafts[
        medicine.id
      ];

    if (!draft) {
      return;
    }

    const unit =
      medicine.units.find(
        (currentUnit) =>
          currentUnit.unitName ===
            draft.unitName &&
          currentUnit.sellable,
      );

    if (!unit) {
      window.alert(
        "Please select a valid selling unit.",
      );

      return;
    }

    if (
      unit.price <= 0
    ) {
      window.alert(
        `${medicine.name} does not have a valid selling price for ${unit.unitName}.`,
      );

      return;
    }

    const quantity =
      Number(
        draft.quantity,
      );

    if (
      !Number.isInteger(
        quantity,
      ) ||
      quantity <= 0
    ) {
      window.alert(
        "Quantity must be a positive whole number.",
      );

      return;
    }

    const requestedBase =
      quantity *
      unit.conversionToBase;

    const availableBase =
      getRemainingBase(
        medicine,
      );

    if (
      requestedBase >
      availableBase
    ) {
      window.alert(
        `Not enough stock.\nAvailable: ${availableBase.toLocaleString(
          "en-US",
        )} ${medicine.baseUnit}`,
      );

      return;
    }

    const cartId =
      `${medicine.id}-${unit.id}`;

    const existing =
      cart.find(
        (item) =>
          item.id ===
          cartId,
      );

    if (existing) {
      setCart(
        (current) =>
          current.map(
            (item) =>
              item.id ===
              cartId
                ? {
                    ...item,

                    quantity:
                      item.quantity +
                      quantity,
                  }
                : item,
          ),
      );
    } else {
      setCart(
        (current) => [
          ...current,

          {
            id:
              cartId,

            medicineId:
              medicine.id,

            medicineName:
              medicine.name,

            baseUnit:
              medicine.baseUnit,

            unitName:
              unit.unitName,

            conversionToBase:
              unit.conversionToBase,

            unitPrice:
              unit.price,

            quantity,
          },
        ],
      );
    }

    setDrafts(
      (current) => ({
        ...current,

        [medicine.id]: {
          ...current[
            medicine.id
          ],

          quantity:
            "1",
        },
      }),
    );
  }

  /* =======================================================
     REMOVE CART ITEM
  ======================================================= */

  function removeCartItem(
    id: string,
  ) {
    setCart(
      (current) =>
        current.filter(
          (item) =>
            item.id !== id,
        ),
    );
  }

  /* =======================================================
     DECREASE CART
  ======================================================= */

  function decreaseCartItem(
    item: CartItem,
  ) {
    if (
      item.quantity <= 1
    ) {
      return;
    }

    setCart(
      (current) =>
        current.map(
          (cartItem) =>
            cartItem.id ===
            item.id
              ? {
                  ...cartItem,

                  quantity:
                    cartItem.quantity -
                    1,
                }
              : cartItem,
        ),
    );
  }

  /* =======================================================
     INCREASE CART

     Checks TOTAL remaining medicine stock regardless
     of Box / Strip / Tablet.
  ======================================================= */

  function increaseCartItem(
    item: CartItem,
  ) {
    const medicine =
      medicines.find(
        (currentMedicine) =>
          currentMedicine.id ===
          item.medicineId,
      );

    if (!medicine) {
      return;
    }

    const remainingBase =
      getRemainingBase(
        medicine,
      );

    if (
      item.conversionToBase >
      remainingBase
    ) {
      window.alert(
        `Not enough stock for another ${item.unitName}.`,
      );

      return;
    }

    setCart(
      (current) =>
        current.map(
          (cartItem) =>
            cartItem.id ===
            item.id
              ? {
                  ...cartItem,

                  quantity:
                    cartItem.quantity +
                    1,
                }
              : cartItem,
        ),
    );
  }

  /* =======================================================
     TOTALS
  ======================================================= */

  const subtotal =
    useMemo(() => {
      return roundMoney(
        cart.reduce(
          (
            total,
            item,
          ) =>
            total +
            item.unitPrice *
              item.quantity,

          0,
        ),
      );
    }, [cart]);

  const safeDiscount =
    useMemo(() => {
      const value =
        Number(
          discountPercent,
        );

      if (
        !Number.isFinite(
          value,
        )
      ) {
        return 0;
      }

      return Math.min(
        100,

        Math.max(
          0,
          value,
        ),
      );
    }, [
      discountPercent,
    ]);

  const discountAmount =
    useMemo(() => {
      return roundMoney(
        subtotal *
          (
            safeDiscount /
            100
          ),
      );
    }, [
      subtotal,
      safeDiscount,
    ]);

  const subtotalAfterDiscount =
    roundMoney(
      subtotal -
        discountAmount,
    );

  const vatAmount =
    settings.vatEnabled
      ? roundMoney(
          subtotalAfterDiscount *
            (
              settings.vatRatePercent /
              100
            ),
        )
      : 0;

  const total =
    roundMoney(
      subtotalAfterDiscount +
        vatAmount,
    );

  const partialPaid =
    Number(
      partialPaidAmount,
    ) || 0;

  const paidAmount =
    paymentStatus ===
    "paid"
      ? total
      : paymentStatus ===
          "partial"
        ? Math.max(
            0,
            Math.min(
              partialPaid,
              total,
            ),
          )
        : 0;

  const dueAmount =
    paymentStatus ===
    "paid"
      ? 0
      : paymentStatus ===
          "partial"
        ? roundMoney(
            Math.max(
              0,
              total -
                paidAmount,
            ),
          )
        : total;

  /* =======================================================
     GENERATE INVOICE → DATABASE
  ======================================================= */

  async function generateInvoice() {
    if (isSubmitting) {
      return;
    }

    if (
      cart.length === 0
    ) {
      window.alert(
        "Please add at least one medicine.",
      );

      return;
    }

    const cleanCustomerName =
      customerName.trim();

    const cleanMobile =
      mobileNumber.trim();

    if (
      cleanMobile &&
      !/^01\d{9}$/.test(
        cleanMobile,
      )
    ) {
      window.alert(
        "Please enter a valid 11-digit mobile number.",
      );

      return;
    }

    /*
     * Due / Partial must belong to
     * a traceable customer.
     */
    if (
      (
        paymentStatus ===
          "partial" ||
        paymentStatus ===
          "due"
      ) &&
      (
        !cleanCustomerName ||
        !cleanMobile
      )
    ) {
      window.alert(
        "Customer name and mobile number are required for partial or due sales.",
      );

      return;
    }

    if (
      paymentStatus ===
      "partial"
    ) {
      const partial =
        Number(
          partialPaidAmount,
        );

      if (
        !Number.isFinite(
          partial,
        ) ||
        partial <= 0 ||
        partial >= total
      ) {
        window.alert(
          "Partial paid amount must be greater than 0 and less than the invoice total.",
        );

        return;
      }
    }

    /*
     * Final client-side stock check.
     *
     * Server performs another locked FEFO check,
     * so database remains authoritative.
     */
    const medicineIds =
      Array.from(
        new Set(
          cart.map(
            (item) =>
              item.medicineId,
          ),
        ),
      );

    for (
      const medicineId of
      medicineIds
    ) {
      const medicine =
        medicines.find(
          (currentMedicine) =>
            currentMedicine.id ===
            medicineId,
        );

      if (!medicine) {
        window.alert(
          "Medicine data changed. Please refresh the page.",
        );

        return;
      }

      const requested =
        cart
          .filter(
            (item) =>
              item.medicineId ===
              medicineId,
          )
          .reduce(
            (
              totalRequested,
              item,
            ) =>
              totalRequested +
              item.quantity *
                item.conversionToBase,

            0,
          );

      if (
        requested >
        getValidStockBase(
          medicine,
        )
      ) {
        window.alert(
          `${medicine.name} does not have enough valid stock.`,
        );

        return;
      }
    }

    try {
      setIsSubmitting(
        true,
      );

      setErrorMessage(
        "",
      );

      const response =
        await fetch(
          "/api/sales",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                customerName:
                  cleanCustomerName,

                mobileNumber:
                  cleanMobile,

                paymentStatus,

                paymentMethod,

                partialPaidAmount:
                  paymentStatus ===
                  "partial"
                    ? Number(
                        partialPaidAmount,
                      )
                    : 0,

                discountPercent:
                  safeDiscount,

                /*
                 * Important:
                 *
                 * Do NOT send price,
                 * conversion or stock quantity
                 * as trusted values.
                 *
                 * Server reads those from DB.
                 */
                items:
                  cart.map(
                    (item) => ({
                      medicineId:
                        item.medicineId,

                      unitName:
                        item.unitName,

                      quantity:
                        item.quantity,
                    }),
                  ),
              }),
          },
        );

      const result:
        CreateSaleApiResponse =
        await response.json();

      if (
        !response.ok ||
        !result.success ||
        !result.data
      ) {
        throw new Error(
          result.message ||
            "Failed to complete sale.",
        );
      }

      /*
       * IMPORTANT:
       * Invoice comes from SERVER,
       * not frontend calculation.
       */
      setGeneratedInvoice(
        result.data,
      );

      setCart([]);

      setCustomerName("");

      setMobileNumber("");

      setPaymentStatus(
        "paid",
      );

      setPaymentMethod(
        "Cash",
      );

      setPartialPaidAmount(
        "",
      );

      setDiscountPercent(
        "0",
      );

      /*
       * Sale already succeeded.
       * Refresh stock + recent sales from DB.
       */
      try {
        await reloadSalesData();
      } catch (
        refreshError
      ) {
        console.error(
          "Sale completed but refresh failed:",
          refreshError,
        );

        setErrorMessage(
          "Sale completed successfully, but the page could not refresh automatically. Please refresh the page.",
        );
      }
    } catch (error) {
      console.error(
        "Generate invoice error:",
        error,
      );

      const message =
        error instanceof Error
          ? error.message
          : "Failed to complete sale.";

      setErrorMessage(
        message,
      );

      window.alert(
        message,
      );
    } finally {
      setIsSubmitting(
        false,
      );
    }
  }

  /* =======================================================
     STATUS STYLE
  ======================================================= */

  function statusClass(
    status: PaymentStatus,
  ) {
    if (
      status ===
      "paid"
    ) {
      return "bg-emerald-100 text-emerald-700";
    }

    if (
      status ===
      "partial"
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
      <div className="mx-auto grid w-full max-w-[1600px] grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(390px,1fr)]">

        {/* =================================================
            LEFT SIDE
        ================================================= */}

        <div className="min-w-0 space-y-4">

          {/* ERROR */}

          {errorMessage ? (

            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">

              <p className="text-[10px] text-rose-700">
                {
                  errorMessage
                }
              </p>

            </div>

          ) : null}

          {/* ===============================================
              SEARCH + CATEGORY
          =============================================== */}

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

            <div className="flex flex-col gap-3 md:flex-row">

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
                  placeholder="Search medicine or generic name..."
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-[11px] text-slate-700 outline-none placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
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
                className="h-10 min-w-[190px] rounded-xl border border-slate-200 bg-white px-3 text-[11px] text-slate-700 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              >

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

                      {category ===
                      "All"
                        ? "All Categories"
                        : category}

                    </option>

                  ),
                )}

              </select>

            </div>

          </section>

          {/* ===============================================
              MEDICINE TABLE
          =============================================== */}

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

            <table className="w-full table-fixed">

              <thead>

                <tr className="border-b border-slate-200 bg-slate-50/80">

                  <th className="w-[31%] px-4 py-3 text-left text-[10px] font-medium text-slate-500">
                    Medicine
                  </th>

                  <th className="w-[17%] px-3 py-3 text-left text-[10px] font-medium text-slate-500">
                    Stock
                  </th>

                  <th className="w-[17%] px-3 py-3 text-left text-[10px] font-medium text-slate-500">
                    Unit
                  </th>

                  <th className="w-[10%] px-2 py-3 text-center text-[10px] font-medium text-slate-500">
                    Qty
                  </th>

                  <th className="w-[14%] px-3 py-3 text-left text-[10px] font-medium text-slate-500">
                    Price
                  </th>

                  <th className="w-[11%] px-2 py-3 text-center text-[10px] font-medium text-slate-500">
                    Action
                  </th>

                </tr>

              </thead>

              <tbody>

                {isLoading ? (

                  <tr>

                    <td
                      colSpan={
                        6
                      }
                      className="px-5 py-16 text-center"
                    >

                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-sky-600" />

                      <p className="mt-3 text-[11px] font-medium text-slate-600">
                        Loading medicines...
                      </p>

                    </td>

                  </tr>

                ) : (

                  <>
                    {filteredMedicines.map(
                      (
                        medicine,
                      ) => {
                        const validStock =
                          getValidStockBase(
                            medicine,
                          );

                        const expiredStock =
                          getExpiredStockBase(
                            medicine,
                          );

                        const remaining =
                          getRemainingBase(
                            medicine,
                          );

                        const draft =
                          drafts[
                            medicine.id
                          ];

                        const selectedUnit =
                          medicine.units.find(
                            (unit) =>
                              unit.unitName ===
                                draft
                                  ?.unitName &&
                              unit.sellable,
                          );

                        const quantity =
                          Number(
                            draft
                              ?.quantity,
                          ) || 0;

                        const maxQuantity =
                          selectedUnit
                            ? Math.floor(
                                remaining /
                                  selectedUnit.conversionToBase,
                              )
                            : 0;

                        const price =
                          selectedUnit
                            ? selectedUnit.price *
                              quantity
                            : 0;

                        return (

                          <tr
                            key={
                              medicine.id
                            }
                            className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50"
                          >

                            {/* MEDICINE */}

                            <td className="px-4 py-4 align-middle">

                              <p className="truncate text-[11px] font-semibold text-slate-900">
                                {
                                  medicine.name
                                }
                              </p>

                              <p className="mt-1 truncate text-[8px] text-slate-500">
                                {
                                  medicine.genericName
                                }
                              </p>

                              <span className="mt-1.5 inline-flex max-w-full rounded-full border border-sky-100 bg-sky-50 px-2 py-0.5 text-[7px] font-medium text-sky-700">

                                <span className="truncate">
                                  {
                                    medicine.category
                                  }
                                </span>

                              </span>

                            </td>

                            {/* STOCK */}

                            <td className="px-3 py-4 align-middle">

                              <p
                                className={`text-[10px] font-semibold ${
                                  remaining >
                                  0
                                    ? "text-slate-800"
                                    : "text-rose-600"
                                }`}
                              >

                                {remaining.toLocaleString(
                                  "en-US",
                                )}

                              </p>

                              <p className="mt-0.5 text-[8px] text-slate-400">
                                {
                                  medicine.baseUnit
                                }
                              </p>

                              {validStock !==
                              remaining ? (

                                <p className="mt-1 text-[7px] text-sky-600">

                                  {(
                                    validStock -
                                    remaining
                                  ).toLocaleString(
                                    "en-US",
                                  )}{" "}

                                  reserved

                                </p>

                              ) : null}

                              {expiredStock >
                              0 ? (

                                <p className="mt-1 text-[7px] text-rose-500">

                                  {expiredStock.toLocaleString(
                                    "en-US",
                                  )}{" "}

                                  expired

                                </p>

                              ) : null}

                            </td>

                            {/* UNIT */}

                            <td className="px-3 py-4 align-middle">

                              <select
                                value={
                                  draft
                                    ?.unitName ??
                                  ""
                                }
                                disabled={
                                  remaining <=
                                    0 ||
                                  isSubmitting
                                }
                                onChange={(
                                  event,
                                ) =>
                                  updateUnit(
                                    medicine.id,

                                    event.target
                                      .value,
                                  )
                                }
                                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-[9px] text-slate-700 outline-none focus:border-sky-400 disabled:bg-slate-50"
                              >

                                {getSellableUnits(
                                  medicine,
                                ).map(
                                  (
                                    sellUnit,
                                  ) => {
                                    const available =
                                      Math.floor(
                                        remaining /
                                          sellUnit.conversionToBase,
                                      );

                                    return (

                                      <option
                                        key={
                                          sellUnit.id
                                        }
                                        value={
                                          sellUnit.unitName
                                        }
                                      >

                                        {
                                          sellUnit.unitName
                                        }{" "}

                                        (
                                        {
                                          available
                                        }
                                        )

                                      </option>

                                    );
                                  },
                                )}

                              </select>

                            </td>

                            {/* QTY */}

                            <td className="px-2 py-4 text-center align-middle">

                              <input
                                type="text"
                                inputMode="numeric"
                                value={
                                  draft
                                    ?.quantity ??
                                  "1"
                                }
                                disabled={
                                  remaining <=
                                    0 ||
                                  isSubmitting
                                }
                                onChange={(
                                  event,
                                ) =>
                                  updateQuantity(
                                    medicine.id,

                                    event.target
                                      .value,
                                  )
                                }
                                className="h-9 w-full rounded-lg border border-slate-200 px-1 text-center text-[10px] font-medium outline-none focus:border-sky-400 disabled:bg-slate-50"
                              />

                              {selectedUnit ? (

                                <p className="mt-1 text-center text-[7px] text-slate-400">
                                  Max{" "}
                                  {
                                    maxQuantity
                                  }
                                </p>

                              ) : null}

                            </td>

                            {/* PRICE */}

                            <td className="px-3 py-4 align-middle">

                              <p
                                className={`text-[10px] font-semibold ${
                                  selectedUnit &&
                                  selectedUnit.price >
                                    0
                                    ? "text-emerald-700"
                                    : "text-rose-500"
                                }`}
                              >

                                ৳
                                {formatMoney(
                                  price,
                                )}

                              </p>

                              {selectedUnit ? (

                                <p className="mt-1 text-[7px] text-slate-400">

                                  {selectedUnit.price >
                                  0 ? (
                                    <>
                                      ৳
                                      {formatMoney(
                                        selectedUnit.price,
                                      )}
                                      /
                                      {
                                        selectedUnit.unitName
                                      }
                                    </>
                                  ) : (
                                    "Price unavailable"
                                  )}

                                </p>

                              ) : null}

                            </td>

                            {/* ACTION */}

                            <td className="px-2 py-4 text-center align-middle">

                              <button
                                type="button"
                                disabled={
                                  isSubmitting ||
                                  remaining <=
                                    0 ||
                                  !selectedUnit ||
                                  selectedUnit.price <=
                                    0 ||
                                  quantity <=
                                    0 ||
                                  quantity >
                                    maxQuantity
                                }
                                onClick={() =>
                                  addToCart(
                                    medicine,
                                  )
                                }
                                className="inline-flex h-9 items-center justify-center gap-1 rounded-lg bg-sky-600 px-3 text-[9px] font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                              >

                                <Plus className="h-3 w-3" />

                                Add

                              </button>

                            </td>

                          </tr>

                        );
                      },
                    )}

                    {filteredMedicines.length ===
                    0 ? (

                      <tr>

                        <td
                          colSpan={
                            6
                          }
                          className="px-5 py-14 text-center"
                        >

                          <p className="text-[11px] font-medium text-slate-600">
                            No medicines found
                          </p>

                        </td>

                      </tr>

                    ) : null}
                  </>

                )}

              </tbody>

            </table>

          </section>

          {/* ===============================================
              RECENT SALES
          =============================================== */}

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

            <div className="border-b border-slate-200 px-4 py-4">

              <h2 className="text-[12px] font-semibold text-slate-900">
                Recent Sales
              </h2>

            </div>

            <div className="overflow-x-auto">

              <table className="w-full min-w-[720px]">

                <thead>

                  <tr className="border-b border-slate-200 bg-slate-50/70">

                    <TableHead>
                      Invoice
                    </TableHead>

                    <TableHead>
                      Customer
                    </TableHead>

                    <TableHead>
                      Mobile
                    </TableHead>

                    <TableHead>
                      Date
                    </TableHead>

                    <TableHead>
                      Items
                    </TableHead>

                    <TableHead>
                      Amount
                    </TableHead>

                    <TableHead>
                      Method
                    </TableHead>

                    <TableHead>
                      Status
                    </TableHead>

                  </tr>

                </thead>

                <tbody>

                  {recentSales.map(
                    (sale) => (

                      <tr
                        key={
                          sale.invoice
                        }
                        className="border-b border-slate-100 last:border-b-0"
                      >

                        <td className="px-3 py-3 font-mono text-[9px] text-sky-700">
                          {
                            sale.invoice
                          }
                        </td>

                        <td className="px-3 py-3 text-[9px] font-medium text-slate-800">
                          {
                            sale.customer
                          }
                        </td>

                        <td className="px-3 py-3 text-[9px] text-slate-500">
                          {
                            sale.mobile
                          }
                        </td>

                        <td className="px-3 py-3 text-[9px] text-slate-500">
                          {
                            sale.date
                          }
                        </td>

                        <td className="px-3 py-3 text-[9px] text-slate-600">
                          {
                            sale.items
                          }
                        </td>

                        <td className="px-3 py-3 text-[9px] font-semibold text-emerald-700">

                          ৳
                          {formatMoney(
                            sale.amount,
                          )}

                        </td>

                        <td className="px-3 py-3 text-[9px] text-slate-600">
                          {
                            sale.method
                          }
                        </td>

                        <td className="px-3 py-3">

                          <span
                            className={`rounded-full px-2 py-1 text-[8px] font-medium capitalize ${statusClass(
                              sale.status,
                            )}`}
                          >
                            {
                              sale.status
                            }
                          </span>

                        </td>

                      </tr>

                    ),
                  )}

                  {recentSales.length ===
                  0 ? (

                    <tr>

                      <td
                        colSpan={
                          8
                        }
                        className="px-5 py-12 text-center text-[10px] text-slate-400"
                      >
                        No sales yet
                      </td>

                    </tr>

                  ) : null}

                </tbody>

              </table>

            </div>

          </section>

        </div>

        {/* =================================================
            BILLING CART
        ================================================= */}

        <aside className="min-w-0">

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:sticky xl:top-4">

            <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">

              <ShoppingCart className="h-4 w-4 text-sky-600" />

              <h2 className="text-[13px] font-semibold text-slate-900">
                Billing Cart
              </h2>

            </div>

            <div className="space-y-4 p-5">

              {/* ===========================================
                  CUSTOMER NAME
              =========================================== */}

              <div>

                <FieldLabel>
                  Customer Name
                </FieldLabel>

                <input
                  value={
                    customerName
                  }
                  disabled={
                    isSubmitting
                  }
                  onChange={(
                    event,
                  ) =>
                    setCustomerName(
                      event.target
                        .value,
                    )
                  }
                  placeholder="Customer name (optional)"
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[10px] outline-none focus:border-sky-400 disabled:bg-slate-50"
                />

              </div>

              {/* ===========================================
                  MOBILE
              =========================================== */}

              <div>

                <FieldLabel>
                  Mobile Number
                </FieldLabel>

                <input
                  maxLength={
                    11
                  }
                  value={
                    mobileNumber
                  }
                  disabled={
                    isSubmitting
                  }
                  onChange={(
                    event,
                  ) =>
                    setMobileNumber(
                      event.target.value.replace(
                        /\D/g,
                        "",
                      ),
                    )
                  }
                  placeholder="017XXXXXXXX"
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[10px] outline-none focus:border-sky-400 disabled:bg-slate-50"
                />

              </div>

              {/* ===========================================
                  CART ITEMS
              =========================================== */}

              {cart.length ===
              0 ? (

                <div className="flex min-h-[170px] flex-col items-center justify-center text-center">

                  <ShoppingCart className="h-7 w-7 text-slate-300" />

                  <p className="mt-3 text-[10px] font-medium text-slate-500">
                    No items in cart.
                  </p>

                  <p className="mt-1 text-[9px] text-slate-400">
                    Select unit, quantity and add medicine.
                  </p>

                </div>

              ) : (

                <div className="space-y-2">

                  {cart.map(
                    (item) => (

                      <div
                        key={
                          item.id
                        }
                        className="rounded-xl border border-slate-200 p-3"
                      >

                        <div className="flex justify-between gap-3">

                          <div>

                            <p className="text-[10px] font-semibold text-slate-800">
                              {
                                item.medicineName
                              }
                            </p>

                            <p className="mt-1 text-[9px] font-semibold text-sky-700">

                              {
                                item.quantity
                              }{" "}

                              {
                                item.unitName
                              }

                            </p>

                            <p className="mt-1 text-[8px] text-slate-500">

                              ৳
                              {formatMoney(
                                item.unitPrice,
                              )}{" "}

                              ×{" "}

                              {
                                item.quantity
                              }{" "}

                              = ৳
                              {formatMoney(
                                item.unitPrice *
                                  item.quantity,
                              )}

                            </p>

                            <p className="mt-1 text-[7px] text-slate-400">

                              Deduct{" "}

                              {(
                                item.quantity *
                                item.conversionToBase
                              ).toLocaleString(
                                "en-US",
                              )}{" "}

                              {
                                item.baseUnit
                              }

                            </p>

                          </div>

                          <button
                            type="button"
                            disabled={
                              isSubmitting
                            }
                            onClick={() =>
                              removeCartItem(
                                item.id,
                              )
                            }
                            className="h-7 w-7 text-rose-500 disabled:opacity-40"
                          >

                            <X className="h-3.5 w-3.5" />

                          </button>

                        </div>

                        <div className="mt-3 flex items-center gap-2">

                          <button
                            type="button"
                            disabled={
                              isSubmitting ||
                              item.quantity <=
                                1
                            }
                            onClick={() =>
                              decreaseCartItem(
                                item,
                              )
                            }
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 disabled:opacity-40"
                          >

                            <Minus className="h-3 w-3" />

                          </button>

                          <span className="min-w-[25px] text-center text-[10px] font-semibold">
                            {
                              item.quantity
                            }
                          </span>

                          <button
                            type="button"
                            disabled={
                              isSubmitting
                            }
                            onClick={() =>
                              increaseCartItem(
                                item,
                              )
                            }
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 disabled:opacity-40"
                          >

                            <Plus className="h-3 w-3" />

                          </button>

                        </div>

                      </div>

                    ),
                  )}

                </div>

              )}

              {/* ===========================================
                  PAYMENT STATUS
              =========================================== */}

              <div>

                <FieldLabel>
                  Payment Status
                </FieldLabel>

                <select
                  value={
                    paymentStatus
                  }
                  disabled={
                    isSubmitting
                  }
                  onChange={(
                    event,
                  ) => {
                    const value =
                      event.target
                        .value as PaymentStatus;

                    setPaymentStatus(
                      value,
                    );

                    if (
                      value !==
                      "partial"
                    ) {
                      setPartialPaidAmount(
                        "",
                      );
                    }
                  }}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[10px] text-slate-700 outline-none focus:border-sky-400 disabled:bg-slate-50"
                >

                  <option value="paid">
                    Paid
                  </option>

                  <option value="partial">
                    Partial
                  </option>

                  <option value="due">
                    Due
                  </option>

                </select>

              </div>

              {/* ===========================================
                  PAYMENT METHOD
              =========================================== */}

              {paymentStatus !==
              "due" ? (

                <div>

                  <FieldLabel>
                    Payment Method
                  </FieldLabel>

                  <select
                    value={
                      paymentMethod
                    }
                    disabled={
                      isSubmitting
                    }
                    onChange={(
                      event,
                    ) =>
                      setPaymentMethod(
                        event.target
                          .value as PaymentMethod,
                      )
                    }
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[10px] text-slate-700 outline-none focus:border-sky-400 disabled:bg-slate-50"
                  >

                    <option value="Cash">
                      Cash
                    </option>

                    <option value="bKash">
                      bKash
                    </option>

                    <option value="Nagad">
                      Nagad
                    </option>

                    <option value="Card">
                      Card
                    </option>

                    <option value="Rocket">
                      Rocket
                    </option>

                  </select>

                </div>

              ) : null}

              {/* ===========================================
                  PARTIAL PAYMENT
              =========================================== */}

              {paymentStatus ===
              "partial" ? (

                <div>

                  <FieldLabel>
                    Paid Amount
                  </FieldLabel>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      partialPaidAmount
                    }
                    disabled={
                      isSubmitting
                    }
                    onChange={(
                      event,
                    ) =>
                      setPartialPaidAmount(
                        event.target
                          .value,
                      )
                    }
                    placeholder="Enter paid amount"
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[10px] outline-none focus:border-sky-400 disabled:bg-slate-50"
                  />

                </div>

              ) : null}

              {/* ===========================================
                  DISCOUNT
              =========================================== */}

              <div>

                <FieldLabel>
                  Discount (%)
                </FieldLabel>

                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={
                    discountPercent
                  }
                  disabled={
                    isSubmitting
                  }
                  onChange={(
                    event,
                  ) =>
                    setDiscountPercent(
                      event.target
                        .value,
                    )
                  }
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[10px] outline-none focus:border-sky-400 disabled:bg-slate-50"
                />

              </div>

              {/* ===========================================
                  BILL
              =========================================== */}

              <div className="rounded-xl bg-slate-50 p-4">

                <BillLine
                  label="Subtotal"
                  value={
                    subtotal
                  }
                />

                {safeDiscount >
                0 ? (

                  <BillLine
                    label={`Discount (${safeDiscount}%)`}
                    value={
                      -discountAmount
                    }
                  />

                ) : null}

                {settings.vatEnabled ? (

                  <BillLine
                    label={`VAT (${settings.vatRatePercent}%)`}
                    value={
                      vatAmount
                    }
                  />

                ) : (

                  <div className="mt-2 flex justify-between text-[9px] text-slate-400">

                    <span>
                      VAT
                    </span>

                    <span>
                      Disabled in Settings
                    </span>

                  </div>

                )}

                <div className="mt-3 flex justify-between border-t border-slate-200 pt-3">

                  <span className="text-[12px] font-semibold">
                    Total
                  </span>

                  <span className="text-[18px] font-bold text-sky-700">

                    ৳
                    {formatMoney(
                      total,
                    )}

                  </span>

                </div>

                {paymentStatus ===
                "partial" ? (

                  <>
                    <BillLine
                      label="Paid"
                      value={
                        paidAmount
                      }
                    />

                    <BillLine
                      label="Due"
                      value={
                        dueAmount
                      }
                    />
                  </>

                ) : null}

                {paymentStatus ===
                "due" ? (

                  <BillLine
                    label="Due"
                    value={
                      total
                    }
                  />

                ) : null}

              </div>

              {/* ===========================================
                  GENERATE
              =========================================== */}

              <button
                type="button"
                disabled={
                  cart.length ===
                    0 ||
                  isSubmitting
                }
                onClick={() =>
                  void generateInvoice()
                }
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-sky-600 text-[11px] font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-sky-300"
              >

                {isSubmitting ? (

                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />

                    Processing Sale...
                  </>

                ) : (

                  "Generate Invoice"

                )}

              </button>

            </div>

          </section>

        </aside>

      </div>

      {/* ===================================================
          INVOICE MODAL
      =================================================== */}

      {generatedInvoice ? (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">

          <div className="max-h-[92vh] w-full max-w-[700px] overflow-y-auto rounded-2xl bg-white shadow-2xl">

            {/* HEADER */}

            <div className="flex justify-between border-b border-slate-200 px-5 py-4">

              <div>

                <h2 className="text-base font-semibold">
                  Invoice Generated
                </h2>

                <p className="mt-1 font-mono text-[10px] text-sky-700">
                  {
                    generatedInvoice.invoice
                  }
                </p>

              </div>

              <button
                type="button"
                onClick={() =>
                  setGeneratedInvoice(
                    null,
                  )
                }
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"
              >

                <X className="h-5 w-5" />

              </button>

            </div>

            {/* BODY */}

            <div className="space-y-5 p-5">

              {/* CUSTOMER INFO */}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

                <InvoiceInfo
                  label="Customer"
                  value={
                    generatedInvoice.customer
                  }
                />

                <InvoiceInfo
                  label="Mobile"
                  value={
                    generatedInvoice.mobile
                  }
                />

                <InvoiceInfo
                  label="Date"
                  value={
                    generatedInvoice.date
                  }
                />

                <InvoiceInfo
                  label="Payment"
                  value={
                    generatedInvoice.paymentMethod
                  }
                />

              </div>

              {/* ITEMS */}

              <div className="overflow-hidden rounded-xl border border-slate-200">

                <table className="w-full">

                  <thead>

                    <tr className="bg-slate-50">

                      <TableHead>
                        Medicine
                      </TableHead>

                      <TableHead>
                        Qty
                      </TableHead>

                      <TableHead>
                        Price
                      </TableHead>

                      <TableHead>
                        Total
                      </TableHead>

                    </tr>

                  </thead>

                  <tbody>

                    {generatedInvoice.items.map(
                      (
                        item,
                        index,
                      ) => (

                        <tr
                          key={`${item.id}-${index}`}
                          className="border-t border-slate-100"
                        >

                          <td className="px-3 py-3 text-[9px]">
                            {
                              item.medicineName
                            }
                          </td>

                          <td className="px-3 py-3 text-[9px]">

                            {
                              item.quantity
                            }{" "}

                            {
                              item.unitName
                            }

                          </td>

                          <td className="px-3 py-3 text-[9px]">

                            ৳
                            {formatMoney(
                              item.unitPrice,
                            )}

                          </td>

                          <td className="px-3 py-3 text-[9px] font-semibold">

                            ৳
                            {formatMoney(
                              item.unitPrice *
                                item.quantity,
                            )}

                          </td>

                        </tr>

                      ),
                    )}

                  </tbody>

                </table>

              </div>

              {/* TOTAL */}

              <div className="ml-auto max-w-[320px] rounded-xl bg-slate-50 p-4">

                <BillLine
                  label="Subtotal"
                  value={
                    generatedInvoice.subtotal
                  }
                />

                {generatedInvoice.discountAmount >
                0 ? (

                  <BillLine
                    label={`Discount (${generatedInvoice.discountPercent}%)`}
                    value={
                      -generatedInvoice.discountAmount
                    }
                  />

                ) : null}

                {generatedInvoice.vatEnabled ? (

                  <BillLine
                    label={`VAT (${generatedInvoice.vatRatePercent}%)`}
                    value={
                      generatedInvoice.vatAmount
                    }
                  />

                ) : null}

                <div className="mt-3 flex justify-between border-t border-slate-200 pt-3">

                  <span className="font-semibold">
                    Total
                  </span>

                  <span className="text-lg font-bold text-sky-700">

                    ৳
                    {formatMoney(
                      generatedInvoice.total,
                    )}

                  </span>

                </div>

                <BillLine
                  label="Paid"
                  value={
                    generatedInvoice.paidAmount
                  }
                />

                {generatedInvoice.dueAmount >
                0 ? (

                  <BillLine
                    label="Due"
                    value={
                      generatedInvoice.dueAmount
                    }
                  />

                ) : null}

              </div>

            </div>

            {/* FOOTER */}

            <div className="flex justify-end border-t border-slate-200 px-5 py-4">

              <button
                type="button"
                onClick={() =>
                  setGeneratedInvoice(
                    null,
                  )
                }
                className="h-10 rounded-xl bg-sky-600 px-5 text-[10px] font-semibold text-white hover:bg-sky-700"
              >
                Done
              </button>

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

function TableHead({
  children,
}: {
  children:
    ReactNode;
}) {
  return (
    <th className="px-3 py-3 text-left text-[9px] font-medium text-slate-500">
      {children}
    </th>
  );
}

function FieldLabel({
  children,
}: {
  children:
    ReactNode;
}) {
  return (
    <label className="mb-2 block text-[10px] font-medium text-slate-700">
      {children}
    </label>
  );
}

function BillLine({
  label,
  value,
}: {
  label: string;

  value: number;
}) {
  return (
    <div className="mt-2 flex items-center justify-between text-[9px] text-slate-500">

      <span>
        {label}
      </span>

      <span
        className={
          value < 0
            ? "text-rose-500"
            : ""
        }
      >

        {value <
        0
          ? "- "
          : ""}

        ৳
        {formatMoney(
          Math.abs(
            value,
          ),
        )}

      </span>

    </div>
  );
}

function InvoiceInfo({
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

      <p className="mt-1 text-[10px] font-semibold text-slate-800">
        {value}
      </p>

    </div>
  );
}