"use client";

import { useMemo, useState } from "react";
import {
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
};

type Medicine = {
  id: string;
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

type GeneratedInvoice = {
  invoice: string;

  customer: string;
  mobile: string;
  date: string;

  items: CartItem[];

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

/* =========================================================
   SETTINGS
========================================================= */

/*
 * Later this value will come from the
 * Settings table / Settings API.
 *
 * VAT is NOT hard-coded in Sales.
 */
const DEFAULT_SALES_SETTINGS: SalesSettings = {
  vatEnabled: false,
  vatRatePercent: 0,
};

/* =========================================================
   MEDICINES
========================================================= */

const initialMedicines: Medicine[] = [
  {
    id: "MED-001",
    name: "Napa 500mg",
    genericName: "Paracetamol",
    category: "Pain Relief",

    baseUnit: "Tablet",

    units: [
      {
        unitName: "Tablet",
        conversionToBase: 1,
        price: 1.2,
        sellable: true,
      },
      {
        unitName: "Strip",
        conversionToBase: 10,
        price: 12,
        sellable: true,
      },
      {
        unitName: "Box",
        conversionToBase: 200,
        price: 240,
        sellable: true,
      },
    ],

    batches: [
      {
        id: "BAT-NAPA-OLD",
        batchNo: "NPA-2501",
        expiryDate: "2026-06-30",
        stockBaseQuantity: 100,
      },
      {
        id: "BAT-NAPA-A",
        batchNo: "NPA-2608-A",
        expiryDate: "2026-12-31",
        stockBaseQuantity: 1500,
      },
      {
        id: "BAT-NAPA-B",
        batchNo: "NPA-2608-B",
        expiryDate: "2027-12-31",
        stockBaseQuantity: 3000,
      },
    ],
  },

  {
    id: "MED-002",
    name: "Ace Plus",
    genericName: "Paracetamol + Caffeine",
    category: "Pain Relief",

    baseUnit: "Tablet",

    units: [
      {
        unitName: "Tablet",
        conversionToBase: 1,
        price: 2.5,
        sellable: true,
      },
      {
        unitName: "Strip",
        conversionToBase: 10,
        price: 25,
        sellable: true,
      },
      {
        unitName: "Box",
        conversionToBase: 200,
        price: 500,
        sellable: true,
      },
    ],

    batches: [
      {
        id: "BAT-ACE-A",
        batchNo: "ACE-2608-A",
        expiryDate: "2027-04-15",
        stockBaseQuantity: 1800,
      },
    ],
  },

  {
    id: "MED-003",
    name: "Napa Extend",
    genericName: "Paracetamol",
    category: "Pain Relief",

    baseUnit: "Tablet",

    units: [
      {
        unitName: "Tablet",
        conversionToBase: 1,
        price: 2.5,
        sellable: true,
      },
      {
        unitName: "Strip",
        conversionToBase: 10,
        price: 25,
        sellable: true,
      },
      {
        unitName: "Box",
        conversionToBase: 100,
        price: 250,
        sellable: true,
      },
    ],

    batches: [
      {
        id: "BAT-NEXT-A",
        batchNo: "NEXT-2608-A",
        expiryDate: "2027-05-20",
        stockBaseQuantity: 1600,
      },
    ],
  },

  {
    id: "MED-004",
    name: "Seclo 20mg",
    genericName: "Omeprazole",
    category: "Gastric / Antacid",

    baseUnit: "Capsule",

    units: [
      {
        unitName: "Capsule",
        conversionToBase: 1,
        price: 8,
        sellable: true,
      },
      {
        unitName: "Strip",
        conversionToBase: 10,
        price: 80,
        sellable: true,
      },
      {
        unitName: "Box",
        conversionToBase: 100,
        price: 800,
        sellable: true,
      },
    ],

    batches: [
      {
        id: "BAT-SEC-A",
        batchNo: "SCL-2608-A",
        expiryDate: "2026-10-30",
        stockBaseQuantity: 1500,
      },
      {
        id: "BAT-SEC-B",
        batchNo: "SCL-2609-B",
        expiryDate: "2027-04-30",
        stockBaseQuantity: 2000,
      },
    ],
  },

  {
    id: "MED-005",
    name: "Maxpro 20mg",
    genericName: "Esomeprazole",
    category: "Gastric / Antacid",

    baseUnit: "Capsule",

    units: [
      {
        unitName: "Capsule",
        conversionToBase: 1,
        price: 9,
        sellable: true,
      },
      {
        unitName: "Strip",
        conversionToBase: 10,
        price: 90,
        sellable: true,
      },
      {
        unitName: "Box",
        conversionToBase: 100,
        price: 900,
        sellable: true,
      },
    ],

    batches: [
      {
        id: "BAT-MAX-A",
        batchNo: "MXP-2608-C",
        expiryDate: "2028-01-31",
        stockBaseQuantity: 22000,
      },
    ],
  },

  {
    id: "MED-006",
    name: "Sergel 20mg",
    genericName: "Esomeprazole",
    category: "Gastric / Antacid",

    baseUnit: "Capsule",

    units: [
      {
        unitName: "Capsule",
        conversionToBase: 1,
        price: 8.5,
        sellable: true,
      },
      {
        unitName: "Strip",
        conversionToBase: 10,
        price: 85,
        sellable: true,
      },
      {
        unitName: "Box",
        conversionToBase: 100,
        price: 850,
        sellable: true,
      },
    ],

    batches: [
      {
        id: "BAT-SER-A",
        batchNo: "SG-2606",
        expiryDate: "2026-09-25",
        stockBaseQuantity: 1200,
      },
    ],
  },

  {
    id: "MED-007",
    name: "Monas 10mg",
    genericName: "Montelukast",
    category: "Allergy",

    baseUnit: "Tablet",

    units: [
      {
        unitName: "Tablet",
        conversionToBase: 1,
        price: 15,
        sellable: true,
      },
      {
        unitName: "Strip",
        conversionToBase: 10,
        price: 150,
        sellable: true,
      },
      {
        unitName: "Box",
        conversionToBase: 100,
        price: 1500,
        sellable: true,
      },
    ],

    batches: [
      {
        id: "BAT-MON-A",
        batchNo: "MN-2608",
        expiryDate: "2027-06-15",
        stockBaseQuantity: 2000,
      },
    ],
  },

  {
    id: "MED-008",
    name: "Fexo 120mg",
    genericName: "Fexofenadine",
    category: "Allergy",

    baseUnit: "Tablet",

    units: [
      {
        unitName: "Tablet",
        conversionToBase: 1,
        price: 5,
        sellable: true,
      },
      {
        unitName: "Strip",
        conversionToBase: 10,
        price: 50,
        sellable: true,
      },
      {
        unitName: "Box",
        conversionToBase: 100,
        price: 500,
        sellable: true,
      },
    ],

    batches: [
      {
        id: "BAT-FEX-A",
        batchNo: "FX-2610",
        expiryDate: "2027-08-12",
        stockBaseQuantity: 3200,
      },
    ],
  },

  {
    id: "MED-009",
    name: "Histacin",
    genericName: "Chlorpheniramine",
    category: "Allergy",

    baseUnit: "Tablet",

    units: [
      {
        unitName: "Tablet",
        conversionToBase: 1,
        price: 0.8,
        sellable: true,
      },
      {
        unitName: "Strip",
        conversionToBase: 10,
        price: 8,
        sellable: true,
      },
    ],

    batches: [
      {
        id: "BAT-HIS-A",
        batchNo: "HS-2609",
        expiryDate: "2027-01-20",
        stockBaseQuantity: 80,
      },
    ],
  },

  {
    id: "MED-010",
    name: "Amdocal 5mg",
    genericName: "Amlodipine",
    category: "Blood Pressure",

    baseUnit: "Tablet",

    units: [
      {
        unitName: "Tablet",
        conversionToBase: 1,
        price: 3.5,
        sellable: true,
      },
      {
        unitName: "Strip",
        conversionToBase: 10,
        price: 35,
        sellable: true,
      },
      {
        unitName: "Box",
        conversionToBase: 100,
        price: 350,
        sellable: true,
      },
    ],

    batches: [
      {
        id: "BAT-AMD-A",
        batchNo: "AM-2613",
        expiryDate: "2027-10-10",
        stockBaseQuantity: 1400,
      },
    ],
  },

  {
    id: "MED-011",
    name: "Zimax 500mg",
    genericName: "Azithromycin",
    category: "Antibiotic",

    baseUnit: "Tablet",

    units: [
      {
        unitName: "Tablet",
        conversionToBase: 1,
        price: 12,
        sellable: true,
      },
      {
        unitName: "Strip",
        conversionToBase: 10,
        price: 120,
        sellable: true,
      },
      {
        unitName: "Box",
        conversionToBase: 100,
        price: 1200,
        sellable: true,
      },
    ],

    batches: [
      {
        id: "BAT-ZIM-A",
        batchNo: "ZM-2611",
        expiryDate: "2027-07-30",
        stockBaseQuantity: 750,
      },
    ],
  },

  {
    id: "MED-012",
    name: "Napa Syrup 100ml",
    genericName: "Paracetamol",
    category: "Pain Relief",

    baseUnit: "Bottle",

    units: [
      {
        unitName: "Bottle",
        conversionToBase: 1,
        price: 35,
        sellable: true,
      },
      {
        unitName: "Box",
        conversionToBase: 5,
        price: 175,
        sellable: true,
      },
    ],

    batches: [
      {
        id: "BAT-SYR-A",
        batchNo: "NPS-2608",
        expiryDate: "2027-09-30",
        stockBaseQuantity: 55,
      },
    ],
  },
];

/* =========================================================
   SALES HISTORY
========================================================= */

const initialSales: Sale[] = [
  {
    invoice: "INV-2026-001",
    customer: "Rahim Uddin",
    mobile: "01711234567",
    date: "06-07-2026",
    items: 3,
    amount: 1845,
    method: "Cash",
    status: "paid",
  },
  {
    invoice: "INV-2026-002",
    customer: "Nasrin Begum",
    mobile: "01812345678",
    date: "06-07-2026",
    items: 5,
    amount: 4230,
    method: "bKash",
    status: "paid",
  },
  {
    invoice: "INV-2026-003",
    customer: "Kamal Hossain",
    mobile: "01812222222",
    date: "05-07-2026",
    items: 2,
    amount: 960,
    method: "Cash",
    status: "partial",
  },
];

/* =========================================================
   DATE + MONEY HELPERS
========================================================= */

function getTodayDateOnly() {
  const today = new Date();

  const year =
    today.getFullYear();

  const month = String(
    today.getMonth() + 1,
  ).padStart(2, "0");

  const day = String(
    today.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getDisplayDate() {
  const today = new Date();

  const year =
    today.getFullYear();

  const month = String(
    today.getMonth() + 1,
  ).padStart(2, "0");

  const day = String(
    today.getDate(),
  ).padStart(2, "0");

  return `${day}-${month}-${year}`;
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
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
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
      (a, b) =>
        b.conversionToBase -
        a.conversionToBase,
    );
}

function getDefaultSellingUnit(
  medicine: Medicine,
) {
  const units =
    getSellableUnits(
      medicine,
    );

  const base =
    units.find(
      (unit) =>
        unit.unitName ===
        medicine.baseUnit,
    );

  return (
    base ??
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
          defaultUnit?.unitName ??
          "",

        quantity: "1",
      };
    },
  );

  return drafts;
}

/* =========================================================
   STOCK HELPERS
========================================================= */

function getValidStockBase(
  medicine: Medicine,
) {
  const today =
    getTodayDateOnly();

  return medicine.batches
    .filter(
      (batch) =>
        batch.stockBaseQuantity >
          0 &&
        batch.expiryDate >=
          today,
    )
    .reduce(
      (sum, batch) =>
        sum +
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
        batch.expiryDate <
          today,
    )
    .reduce(
      (sum, batch) =>
        sum +
        batch.stockBaseQuantity,
      0,
    );
}

/*
 * FEFO
 *
 * First Expiry First Out
 */
function deductStockFEFO(
  medicine: Medicine,
  requestedBaseQuantity: number,
): Medicine {
  let remaining =
    requestedBaseQuantity;

  const today =
    getTodayDateOnly();

  const batches =
    medicine.batches.map(
      (batch) => ({
        ...batch,
      }),
    );

  const validBatches =
    batches
      .map(
        (batch, index) => ({
          batch,
          index,
        }),
      )
      .filter(
        ({ batch }) =>
          batch.stockBaseQuantity >
            0 &&
          batch.expiryDate >=
            today,
      )
      .sort((a, b) =>
        a.batch.expiryDate.localeCompare(
          b.batch.expiryDate,
        ),
      );

  for (
    const item of validBatches
  ) {
    if (
      remaining <= 0
    ) {
      break;
    }

    const batch =
      batches[
        item.index
      ];

    const deduction =
      Math.min(
        remaining,
        batch.stockBaseQuantity,
      );

    batch.stockBaseQuantity -=
      deduction;

    remaining -= deduction;
  }

  return {
    ...medicine,
    batches,
  };
}

/* =========================================================
   PAGE
========================================================= */

export default function SalesPage() {
  const [
    medicines,
    setMedicines,
  ] =
    useState<Medicine[]>(
      initialMedicines,
    );

  const [
    recentSales,
    setRecentSales,
  ] =
    useState<Sale[]>(
      initialSales,
    );

  const [settings] =
    useState<SalesSettings>(
      DEFAULT_SALES_SETTINGS,
    );

  const [
    drafts,
    setDrafts,
  ] =
    useState<
      Record<
        string,
        SaleRowDraft
      >
    >(() =>
      createInitialDrafts(
        initialMedicines,
      ),
    );

  const [
    cart,
    setCart,
  ] =
    useState<CartItem[]>(
      [],
    );

  const [
    searchTerm,
    setSearchTerm,
  ] = useState("");

  /*
   * NEW CATEGORY FILTER
   */
  const [
    categoryFilter,
    setCategoryFilter,
  ] =
    useState("All");

  const [
    customerName,
    setCustomerName,
  ] = useState("");

  const [
    mobileNumber,
    setMobileNumber,
  ] = useState("");

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
  ] = useState("");

  const [
    discountPercent,
    setDiscountPercent,
  ] = useState("0");

  const [
    generatedInvoice,
    setGeneratedInvoice,
  ] =
    useState<GeneratedInvoice | null>(
      null,
    );

  /* =======================================================
     CATEGORY LIST
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
     SEARCH + CATEGORY
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
     RESERVED CART STOCK
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
        (sum, item) =>
          sum +
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
     ROW DRAFT
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
          quantity: "1",
        },
      }),
    );
  }

  function updateQuantity(
    medicineId: string,
    value: string,
  ) {
    if (
      value !== "" &&
      !/^\d+$/.test(
        value,
      )
    ) {
      return;
    }

    setDrafts(
      (current) => ({
        ...current,

        [medicineId]: {
          ...current[
            medicineId
          ],

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
        (unit) =>
          unit.unitName ===
            draft.unitName &&
          unit.sellable,
      );

    if (!unit) {
      window.alert(
        "Please select a valid selling unit.",
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
        "Please enter a valid whole quantity.",
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
      `${medicine.id}-${unit.unitName}`;

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
            id: cartId,

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

          quantity: "1",
        },
      }),
    );
  }

  /* =======================================================
     CART CONTROLS
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

  function increaseCartItem(
    item: CartItem,
  ) {
    const medicine =
      medicines.find(
        (medicine) =>
          medicine.id ===
          item.medicineId,
      );

    if (!medicine) {
      return;
    }

    const valid =
      getValidStockBase(
        medicine,
      );

    const reserved =
      getReservedBase(
        medicine.id,
      );

    if (
      reserved +
        item.conversionToBase >
      valid
    ) {
      window.alert(
        `Not enough ${medicine.name} stock.`,
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
     BILL TOTAL
  ======================================================= */

  const subtotal =
    useMemo(() => {
      return roundMoney(
        cart.reduce(
          (sum, item) =>
            sum +
            item.unitPrice *
              item.quantity,
          0,
        ),
      );
    }, [cart]);

  const safeDiscount =
    Math.min(
      100,
      Math.max(
        0,
        Number(
          discountPercent,
        ) || 0,
      ),
    );

  const discountAmount =
    roundMoney(
      subtotal *
        (safeDiscount /
          100),
    );

  const afterDiscount =
    roundMoney(
      subtotal -
        discountAmount,
    );

  const vatAmount =
    settings.vatEnabled
      ? roundMoney(
          afterDiscount *
            (settings.vatRatePercent /
              100),
        )
      : 0;

  const total =
    roundMoney(
      afterDiscount +
        vatAmount,
    );

  let paidAmount = 0;

  if (
    paymentStatus ===
    "paid"
  ) {
    paidAmount =
      total;
  }

  if (
    paymentStatus ===
    "partial"
  ) {
    paidAmount =
      Math.max(
        0,
        Math.min(
          Number(
            partialPaidAmount,
          ) || 0,
          total,
        ),
      );
  }

  const dueAmount =
    roundMoney(
      Math.max(
        0,
        total -
          paidAmount,
      ),
    );

  /* =======================================================
     INVOICE ID
  ======================================================= */

  function generateInvoiceNo() {
    const year =
      new Date().getFullYear();

    const highest =
      recentSales.reduce(
        (
          result,
          sale,
        ) => {
          const number =
            Number(
              sale.invoice
                .split("-")
                .pop(),
            ) || 0;

          return Math.max(
            result,
            number,
          );
        },
        0,
      );

    return `INV-${year}-${String(
      highest + 1,
    ).padStart(3, "0")}`;
  }

  /* =======================================================
     GENERATE INVOICE
  ======================================================= */

  function generateInvoice() {
    if (
      cart.length === 0
    ) {
      window.alert(
        "Please add at least one medicine.",
      );

      return;
    }

    if (
      mobileNumber.trim() &&
      !/^01\d{9}$/.test(
        mobileNumber.trim(),
      )
    ) {
      window.alert(
        "Please enter a valid 11-digit mobile number.",
      );

      return;
    }

    /*
     * Final stock validation.
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
          (medicine) =>
            medicine.id ===
            medicineId,
        );

      if (!medicine) {
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
            (sum, item) =>
              sum +
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

    if (
      paymentStatus ===
      "partial"
    ) {
      const amount =
        Number(
          partialPaidAmount,
        );

      if (
        !amount ||
        amount <= 0 ||
        amount >= total
      ) {
        window.alert(
          "Partial amount must be greater than 0 and less than total.",
        );

        return;
      }
    }

    const invoiceNo =
      generateInvoiceNo();

    const customer =
      customerName.trim() ||
      "Walk-in Customer";

    const mobile =
      mobileNumber.trim() ||
      "-";

    const method =
      paymentStatus ===
      "due"
        ? "-"
        : paymentMethod;

    /* STOCK DEDUCTION */

    setMedicines(
      (current) =>
        current.map(
          (medicine) => {
            const items =
              cart.filter(
                (item) =>
                  item.medicineId ===
                  medicine.id,
              );

            if (
              items.length === 0
            ) {
              return medicine;
            }

            const requiredBase =
              items.reduce(
                (sum, item) =>
                  sum +
                  item.quantity *
                    item.conversionToBase,
                0,
              );

            return deductStockFEFO(
              medicine,
              requiredBase,
            );
          },
        ),
    );

    const invoice:
      GeneratedInvoice = {
      invoice:
        invoiceNo,

      customer,
      mobile,

      date:
        getDisplayDate(),

      items:
        cart.map(
          (item) => ({
            ...item,
          }),
        ),

      subtotal,

      discountPercent:
        safeDiscount,

      discountAmount,

      vatEnabled:
        settings.vatEnabled,

      vatRatePercent:
        settings.vatRatePercent,

      vatAmount,

      total,

      paymentMethod:
        method,

      paymentStatus,

      paidAmount,

      dueAmount,
    };

    setGeneratedInvoice(
      invoice,
    );

    setRecentSales(
      (current) => [
        {
          invoice:
            invoiceNo,

          customer,
          mobile,

          date:
            getDisplayDate(),

          items:
            cart.reduce(
              (sum, item) =>
                sum +
                item.quantity,
              0,
            ),

          amount:
            total,

          method,

          status:
            paymentStatus,
        },

        ...current,
      ],
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

    setPartialPaidAmount("");

    setDiscountPercent(
      "0",
    );
  }

  function statusClass(
    status: PaymentStatus,
  ) {
    if (
      status === "paid"
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

        {/* LEFT */}

        <div className="min-w-0 space-y-4">

          {/* SEARCH + CATEGORY */}

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

            <div className="flex flex-col gap-3 md:flex-row">

              <div className="relative flex-1">

                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
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
                  className="h-10 w-full rounded-xl border border-slate-200 pl-10 pr-4 text-[11px] outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
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

          {/* COMPACT MEDICINE TABLE */}

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

            {/*
              No min-width.
              No horizontal scroll.
            */}

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

                {filteredMedicines.map(
                  (medicine) => {
                    const validStock =
                      getValidStockBase(
                        medicine,
                      );

                    const expired =
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

                    const unit =
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
                      unit
                        ? Math.floor(
                            remaining /
                              unit.conversionToBase,
                          )
                        : 0;

                    const price =
                      unit
                        ? unit.price *
                          quantity
                        : 0;

                    return (

                      <tr
                        key={
                          medicine.id
                        }
                        className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60"
                      >

                        {/* MEDICINE + GENERIC + CATEGORY */}

                        <td className="px-4 py-4 align-middle">

                          <p className="truncate text-[12px] font-semibold text-slate-900">
                            {
                              medicine.name
                            }
                          </p>

                          <p className="mt-0.5 truncate text-[9px] text-slate-500">
                            {
                              medicine.genericName
                            }
                          </p>

                          <div className="mt-1.5 flex items-center gap-2">

                            <span className="inline-flex max-w-full truncate rounded-full border border-sky-100 bg-sky-50 px-2 py-0.5 text-[8px] font-medium text-sky-700">
                              {
                                medicine.category
                              }
                            </span>

                          </div>

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

                          {expired >
                          0 ? (

                            <p className="mt-1 text-[7px] text-rose-500">
                              {expired.toLocaleString(
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
                              0
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
                            className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-[9px] text-slate-700 outline-none focus:border-sky-400"
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
                                      sellUnit.unitName
                                    }
                                    value={
                                      sellUnit.unitName
                                    }
                                  >
                                    {
                                      sellUnit.unitName
                                    }{" "}
                                    ({available})
                                  </option>

                                );
                              },
                            )}

                          </select>

                        </td>

                        {/* QTY */}

                        <td className="px-2 py-4 align-middle">

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
                              0
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
                            className="h-9 w-full rounded-lg border border-slate-200 px-1 text-center text-[10px] font-medium outline-none focus:border-sky-400"
                          />

                          {unit ? (

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

                          <p className="text-[10px] font-semibold text-emerald-700">
                            ৳
                            {formatMoney(
                              price,
                            )}
                          </p>

                          {unit ? (

                            <p className="mt-1 text-[7px] text-slate-400">
                              ৳
                              {formatMoney(
                                unit.price,
                              )}
                              /
                              {
                                unit.unitName
                              }
                            </p>

                          ) : null}

                        </td>

                        {/* ACTION */}

                        <td className="px-2 py-4 text-center align-middle">

                          <button
                            type="button"
                            disabled={
                              remaining <=
                                0 ||
                              !unit ||
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

              </tbody>

            </table>

            {filteredMedicines.length ===
            0 ? (

              <div className="py-14 text-center">

                <Search className="mx-auto h-6 w-6 text-slate-300" />

                <p className="mt-2 text-[12px] font-medium text-slate-600">
                  No medicines found
                </p>

              </div>

            ) : null}

          </section>

          {/* RECENT SALES */}

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

            <div className="border-b border-slate-200 px-4 py-4">

              <h2 className="text-[13px] font-semibold text-slate-900">
                Recent Sales
              </h2>

            </div>

            <div className="overflow-x-auto">

              <table className="w-full min-w-[700px]">

                <thead>

                  <tr className="border-b border-slate-200 bg-slate-50">

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

                        <td className="px-3 py-3 text-[9px]">
                          {
                            sale.items
                          }
                        </td>

                        <td className="px-3 py-3 text-[10px] font-semibold text-emerald-700">
                          ৳
                          {formatMoney(
                            sale.amount,
                          )}
                        </td>

                        <td className="px-3 py-3 text-[9px]">
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

              {/* CUSTOMER */}

              <div>

                <label className="mb-2 block text-[10px] font-medium text-slate-700">
                  Customer Name
                </label>

                <input
                  value={
                    customerName
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
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[10px] outline-none"
                />

              </div>

              <div>

                <label className="mb-2 block text-[10px] font-medium text-slate-700">
                  Mobile Number
                </label>

                <input
                  maxLength={11}
                  value={
                    mobileNumber
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
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[10px] outline-none"
                />

              </div>

              {/* CART */}

              <div className="space-y-2">

                {cart.length ===
                0 ? (

                  <div className="py-10 text-center">

                    <ShoppingCart className="mx-auto h-6 w-6 text-slate-300" />

                    <p className="mt-2 text-[10px] text-slate-500">
                      No items in cart.
                    </p>

                    <p className="text-[9px] text-slate-400">
                      Select unit, quantity and add medicine.
                    </p>

                  </div>

                ) : (

                  cart.map(
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
                            onClick={() =>
                              removeCartItem(
                                item.id,
                              )
                            }
                            className="h-7 w-7 text-rose-500"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>

                        </div>

                        <div className="mt-3 flex items-center gap-2">

                          <button
                            type="button"
                            disabled={
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
                            onClick={() =>
                              increaseCartItem(
                                item,
                              )
                            }
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100"
                          >
                            <Plus className="h-3 w-3" />
                          </button>

                        </div>

                      </div>

                    ),
                  )

                )}

              </div>

            </div>

            {/* PAYMENT */}

            <div className="space-y-4 border-t border-slate-200 p-5">

              <FieldLabel>
                Payment Status
              </FieldLabel>

              <select
                value={
                  paymentStatus
                }
                onChange={(
                  event,
                ) => {
                  setPaymentStatus(
                    event.target
                      .value as PaymentStatus,
                  );

                  setPartialPaidAmount(
                    "",
                  );
                }}
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[10px]"
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

              {paymentStatus !==
              "due" ? (

                <>
                  <FieldLabel>
                    Payment Method
                  </FieldLabel>

                  <select
                    value={
                      paymentMethod
                    }
                    onChange={(
                      event,
                    ) =>
                      setPaymentMethod(
                        event.target
                          .value as PaymentMethod,
                      )
                    }
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[10px]"
                  >

                    <option>
                      Cash
                    </option>

                    <option>
                      bKash
                    </option>

                    <option>
                      Nagad
                    </option>

                    <option>
                      Card
                    </option>

                    <option>
                      Rocket
                    </option>

                  </select>
                </>

              ) : null}

              {paymentStatus ===
              "partial" ? (

                <>
                  <FieldLabel>
                    Paid Amount
                  </FieldLabel>

                  <input
                    type="number"
                    value={
                      partialPaidAmount
                    }
                    onChange={(
                      event,
                    ) =>
                      setPartialPaidAmount(
                        event.target
                          .value,
                      )
                    }
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[10px]"
                  />
                </>

              ) : null}

              <FieldLabel>
                Discount (%)
              </FieldLabel>

              <input
                type="number"
                min="0"
                max="100"
                value={
                  discountPercent
                }
                onChange={(
                  event,
                ) =>
                  setDiscountPercent(
                    event.target
                      .value,
                  )
                }
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[10px]"
              />

              {/* BILL */}

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

              <button
                disabled={
                  cart.length ===
                  0
                }
                onClick={
                  generateInvoice
                }
                className="h-11 w-full rounded-xl bg-sky-600 text-[11px] font-semibold text-white hover:bg-sky-700 disabled:bg-sky-300"
              >
                Generate Invoice
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
                onClick={() =>
                  setGeneratedInvoice(
                    null,
                  )
                }
              >
                <X className="h-5 w-5 text-slate-500" />
              </button>

            </div>

            <div className="space-y-5 p-5">

              <div className="text-center">

                <h2 className="text-xl font-bold">
                  Green Life Pharmacy
                </h2>

                <p className="text-[9px] text-slate-500">
                  Pharmacy Management System
                </p>

              </div>

              <div className="grid grid-cols-2 gap-3">

                <InvoiceInfo
                  label="Invoice"
                  value={
                    generatedInvoice.invoice
                  }
                />

                <InvoiceInfo
                  label="Date"
                  value={
                    generatedInvoice.date
                  }
                />

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
                  label="Payment"
                  value={
                    generatedInvoice.paymentMethod
                  }
                />

                <InvoiceInfo
                  label="Status"
                  value={
                    generatedInvoice.paymentStatus.toUpperCase()
                  }
                />

              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200">

                <table className="w-full">

                  <thead className="bg-slate-50">

                    <tr>

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
                      (item) => (

                        <tr
                          key={
                            item.id
                          }
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

                <BillLine
                  label="Due"
                  value={
                    generatedInvoice.dueAmount
                  }
                />

              </div>

              <button
                onClick={() =>
                  setGeneratedInvoice(
                    null,
                  )
                }
                className="h-10 w-full rounded-xl bg-sky-600 text-[10px] font-semibold text-white"
              >
                Close Invoice
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
    React.ReactNode;
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
    React.ReactNode;
}) {
  return (
    <label className="block text-[10px] font-medium text-slate-700">
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
    <div className="mt-2 flex justify-between text-[9px]">

      <span className="text-slate-500">
        {label}
      </span>

      <span
        className={
          value < 0
            ? "text-rose-500"
            : "text-slate-700"
        }
      >
        {value < 0
          ? "-"
          : ""}
        ৳
        {formatMoney(
          Math.abs(value),
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