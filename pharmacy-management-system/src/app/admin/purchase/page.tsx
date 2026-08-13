"use client";

import {
  FormEvent,
  ReactNode,
  useMemo,
  useState,
} from "react";

import {
  Boxes,
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

type PurchaseStatus =
  | "Received"
  | "Pending"
  | "Cancelled";

type MedicineUnitConfig = {
  unitName: string;
  conversionToBase: number;
  sellable: boolean;
  purchasable: boolean;
};

type MedicineConfig = {
  id: string;
  name: string;
  genericName: string;
  baseUnit: string;
  units: MedicineUnitConfig[];
};

type UnitPrice = {
  unitName: string;
  conversionToBase: number;
  sellingPrice: number;
  mrp: number | null;
};

type PurchaseItem = {
  id: string;
  medicineId: string;
  medicine: string;
  genericName: string;
  baseUnit: string;

  purchaseUnit: string;
  conversionToBase: number;

  quantity: number;
  baseQuantity: number;

  unitCost: number;

  batchNo: string;
  expiryDate: string;

  unitPrices: UnitPrice[];
};

type Purchase = {
  id: string;
  supplier: string;
  supplierInvoiceNo: string;
  purchaseDate: string;
  status: PurchaseStatus;
  items: PurchaseItem[];
  totalAmount: number;
  processedBy: string;
};

type UnitPriceForm = {
  unitName: string;
  conversionToBase: number;
  sellingPrice: string;
  mrp: string;
};

type PurchaseItemForm = {
  id: string;

  medicineId: string;

  purchaseUnit: string;
  conversionToBase: number;

  quantity: string;
  unitCost: string;

  batchNo: string;
  expiryDate: string;

  unitPrices: UnitPriceForm[];
};

type PurchaseForm = {
  supplier: string;
  supplierInvoiceNo: string;
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

const medicineCatalog: MedicineConfig[] = [
  {
    id: "MED-001",
    name: "Napa 500mg",
    genericName: "Paracetamol",
    baseUnit: "Tablet",
    units: [
      {
        unitName: "Tablet",
        conversionToBase: 1,
        sellable: true,
        purchasable: false,
      },
      {
        unitName: "Strip",
        conversionToBase: 10,
        sellable: true,
        purchasable: true,
      },
      {
        unitName: "Box",
        conversionToBase: 200,
        sellable: true,
        purchasable: true,
      },
    ],
  },

  {
    id: "MED-002",
    name: "Ace Plus",
    genericName: "Paracetamol + Caffeine",
    baseUnit: "Tablet",
    units: [
      {
        unitName: "Tablet",
        conversionToBase: 1,
        sellable: true,
        purchasable: false,
      },
      {
        unitName: "Strip",
        conversionToBase: 10,
        sellable: true,
        purchasable: true,
      },
      {
        unitName: "Box",
        conversionToBase: 200,
        sellable: true,
        purchasable: true,
      },
    ],
  },

  {
    id: "MED-003",
    name: "Napa Extend",
    genericName: "Paracetamol",
    baseUnit: "Tablet",
    units: [
      {
        unitName: "Tablet",
        conversionToBase: 1,
        sellable: true,
        purchasable: false,
      },
      {
        unitName: "Strip",
        conversionToBase: 10,
        sellable: true,
        purchasable: true,
      },
      {
        unitName: "Box",
        conversionToBase: 100,
        sellable: true,
        purchasable: true,
      },
    ],
  },

  {
    id: "MED-004",
    name: "Seclo 20mg",
    genericName: "Omeprazole",
    baseUnit: "Capsule",
    units: [
      {
        unitName: "Capsule",
        conversionToBase: 1,
        sellable: true,
        purchasable: false,
      },
      {
        unitName: "Strip",
        conversionToBase: 10,
        sellable: true,
        purchasable: true,
      },
      {
        unitName: "Box",
        conversionToBase: 100,
        sellable: true,
        purchasable: true,
      },
    ],
  },

  {
    id: "MED-005",
    name: "Maxpro 20mg",
    genericName: "Esomeprazole",
    baseUnit: "Capsule",
    units: [
      {
        unitName: "Capsule",
        conversionToBase: 1,
        sellable: true,
        purchasable: false,
      },
      {
        unitName: "Strip",
        conversionToBase: 10,
        sellable: true,
        purchasable: true,
      },
      {
        unitName: "Box",
        conversionToBase: 100,
        sellable: true,
        purchasable: true,
      },
    ],
  },

  {
    id: "MED-006",
    name: "Sergel 20mg",
    genericName: "Esomeprazole",
    baseUnit: "Capsule",
    units: [
      {
        unitName: "Capsule",
        conversionToBase: 1,
        sellable: true,
        purchasable: false,
      },
      {
        unitName: "Strip",
        conversionToBase: 10,
        sellable: true,
        purchasable: true,
      },
      {
        unitName: "Box",
        conversionToBase: 100,
        sellable: true,
        purchasable: true,
      },
    ],
  },

  {
    id: "MED-007",
    name: "Monas 10mg",
    genericName: "Montelukast",
    baseUnit: "Tablet",
    units: [
      {
        unitName: "Tablet",
        conversionToBase: 1,
        sellable: true,
        purchasable: false,
      },
      {
        unitName: "Strip",
        conversionToBase: 10,
        sellable: true,
        purchasable: true,
      },
      {
        unitName: "Box",
        conversionToBase: 100,
        sellable: true,
        purchasable: true,
      },
    ],
  },

  {
    id: "MED-008",
    name: "Fexo 120mg",
    genericName: "Fexofenadine",
    baseUnit: "Tablet",
    units: [
      {
        unitName: "Tablet",
        conversionToBase: 1,
        sellable: true,
        purchasable: false,
      },
      {
        unitName: "Strip",
        conversionToBase: 10,
        sellable: true,
        purchasable: true,
      },
      {
        unitName: "Box",
        conversionToBase: 100,
        sellable: true,
        purchasable: true,
      },
    ],
  },

  {
    id: "MED-009",
    name: "Amdocal 5mg",
    genericName: "Amlodipine",
    baseUnit: "Tablet",
    units: [
      {
        unitName: "Tablet",
        conversionToBase: 1,
        sellable: true,
        purchasable: false,
      },
      {
        unitName: "Strip",
        conversionToBase: 10,
        sellable: true,
        purchasable: true,
      },
      {
        unitName: "Box",
        conversionToBase: 100,
        sellable: true,
        purchasable: true,
      },
    ],
  },

  {
    id: "MED-010",
    name: "Ceevit 250mg",
    genericName: "Vitamin C",
    baseUnit: "Tablet",
    units: [
      {
        unitName: "Tablet",
        conversionToBase: 1,
        sellable: true,
        purchasable: false,
      },
      {
        unitName: "Strip",
        conversionToBase: 10,
        sellable: true,
        purchasable: true,
      },
      {
        unitName: "Box",
        conversionToBase: 100,
        sellable: true,
        purchasable: true,
      },
    ],
  },
];

const initialPurchases: Purchase[] = [
  {
    id: "PUR-2026-001",
    supplier: "Beximco Pharmaceuticals Ltd.",
    supplierInvoiceNo: "BEX-88201",
    purchaseDate: "2026-08-01",
    status: "Received",
    processedBy: "Admin User",
    totalAmount: 9000,

    items: [
      {
        id: "PITEM-001",
        medicineId: "MED-001",
        medicine: "Napa 500mg",
        genericName: "Paracetamol",
        baseUnit: "Tablet",

        purchaseUnit: "Box",
        conversionToBase: 200,

        quantity: 50,
        baseQuantity: 10000,

        unitCost: 180,

        batchNo: "NPA-2608-A",
        expiryDate: "2027-12-31",

        unitPrices: [
          {
            unitName: "Tablet",
            conversionToBase: 1,
            sellingPrice: 1.2,
            mrp: 1.2,
          },
          {
            unitName: "Strip",
            conversionToBase: 10,
            sellingPrice: 12,
            mrp: 12,
          },
          {
            unitName: "Box",
            conversionToBase: 200,
            sellingPrice: 240,
            mrp: 240,
          },
        ],
      },
    ],
  },

  {
    id: "PUR-2026-002",
    supplier: "Square Pharmaceuticals Ltd.",
    supplierInvoiceNo: "SQR-55120",
    purchaseDate: "2026-08-04",
    status: "Received",
    processedBy: "Admin User",
    totalAmount: 7800,

    items: [
      {
        id: "PITEM-002",
        medicineId: "MED-004",
        medicine: "Seclo 20mg",
        genericName: "Omeprazole",
        baseUnit: "Capsule",

        purchaseUnit: "Box",
        conversionToBase: 100,

        quantity: 60,
        baseQuantity: 6000,

        unitCost: 130,

        batchNo: "SCL-2608-B",
        expiryDate: "2027-04-30",

        unitPrices: [
          {
            unitName: "Capsule",
            conversionToBase: 1,
            sellingPrice: 1.8,
            mrp: 2,
          },
          {
            unitName: "Strip",
            conversionToBase: 10,
            sellingPrice: 18,
            mrp: 20,
          },
          {
            unitName: "Box",
            conversionToBase: 100,
            sellingPrice: 180,
            mrp: 200,
          },
        ],
      },
    ],
  },

  {
    id: "PUR-2026-003",
    supplier: "Renata Limited",
    supplierInvoiceNo: "REN-77342",
    purchaseDate: "2026-08-08",
    status: "Pending",
    processedBy: "Admin User",
    totalAmount: 5500,

    items: [
      {
        id: "PITEM-003",
        medicineId: "MED-005",
        medicine: "Maxpro 20mg",
        genericName: "Esomeprazole",
        baseUnit: "Capsule",

        purchaseUnit: "Box",
        conversionToBase: 100,

        quantity: 50,
        baseQuantity: 5000,

        unitCost: 110,

        batchNo: "MXP-2608-C",
        expiryDate: "2028-01-31",

        unitPrices: [
          {
            unitName: "Capsule",
            conversionToBase: 1,
            sellingPrice: 1.6,
            mrp: 1.8,
          },
          {
            unitName: "Strip",
            conversionToBase: 10,
            sellingPrice: 16,
            mrp: 18,
          },
          {
            unitName: "Box",
            conversionToBase: 100,
            sellingPrice: 160,
            mrp: 180,
          },
        ],
      },
    ],
  },
];

function getTodayLocalDate() {
  const today = new Date();

  const year = today.getFullYear();

  const month = String(
    today.getMonth() + 1,
  ).padStart(2, "0");

  const day = String(
    today.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function createEmptyItem(
  index = 1,
): PurchaseItemForm {
  return {
    id: `FORM-${Date.now()}-${index}`,

    medicineId: "",

    purchaseUnit: "",
    conversionToBase: 1,

    quantity: "",
    unitCost: "",

    batchNo: "",
    expiryDate: "",

    unitPrices: [],
  };
}

function createEmptyForm(): PurchaseForm {
  return {
    supplier: "",
    supplierInvoiceNo: "",
    purchaseDate: getTodayLocalDate(),
    status: "Received",
    items: [createEmptyItem()],
  };
}

function formatDate(date: string) {
  if (!date) {
    return "-";
  }

  const [year, month, day] =
    date.split("-");

  return `${day}-${month}-${year}`;
}

export default function PurchasePage() {
  const [purchases, setPurchases] =
    useState<Purchase[]>(
      initialPurchases,
    );

  const [searchTerm, setSearchTerm] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("All");

  const [
    isPurchaseModalOpen,
    setIsPurchaseModalOpen,
  ] = useState(false);

  const [
    selectedPurchase,
    setSelectedPurchase,
  ] = useState<Purchase | null>(null);

  const [form, setForm] =
    useState<PurchaseForm>(
      createEmptyForm(),
    );

  const formTotal = useMemo(() => {
    return form.items.reduce(
      (total, item) => {
        const quantity =
          Number(item.quantity) || 0;

        const unitCost =
          Number(item.unitCost) || 0;

        return (
          total +
          quantity * unitCost
        );
      },
      0,
    );
  }, [form.items]);

  const statistics = useMemo(() => {
    const received =
      purchases.filter(
        (purchase) =>
          purchase.status ===
          "Received",
      ).length;

    const pending =
      purchases.filter(
        (purchase) =>
          purchase.status ===
          "Pending",
      ).length;

    const totalValue =
      purchases
        .filter(
          (purchase) =>
            purchase.status !==
            "Cancelled",
        )
        .reduce(
          (sum, purchase) =>
            sum +
            purchase.totalAmount,
          0,
        );

    return {
      total: purchases.length,
      received,
      pending,
      totalValue,
    };
  }, [purchases]);

  const filteredPurchases =
    useMemo(() => {
      const search =
        searchTerm
          .trim()
          .toLowerCase();

      return purchases.filter(
        (purchase) => {
          const matchesSearch =
            purchase.id
              .toLowerCase()
              .includes(search) ||
            purchase.supplier
              .toLowerCase()
              .includes(search) ||
            purchase
              .supplierInvoiceNo
              .toLowerCase()
              .includes(search) ||
            purchase.items.some(
              (item) =>
                item.medicine
                  .toLowerCase()
                  .includes(
                    search,
                  ) ||
                item.batchNo
                  .toLowerCase()
                  .includes(
                    search,
                  ),
            );

          const matchesStatus =
            statusFilter ===
              "All" ||
            purchase.status ===
              statusFilter;

          return (
            matchesSearch &&
            matchesStatus
          );
        },
      );
    }, [
      purchases,
      searchTerm,
      statusFilter,
    ]);

  function generatePurchaseId() {
    const year =
      new Date().getFullYear();

    const highestNumber =
      purchases.reduce(
        (highest, purchase) => {
          const parts =
            purchase.id.split("-");

          const number =
            Number(
              parts[
                parts.length - 1
              ],
            ) || 0;

          return Math.max(
            highest,
            number,
          );
        },
        0,
      );

    return `PUR-${year}-${String(
      highestNumber + 1,
    ).padStart(3, "0")}`;
  }

  function openPurchaseModal() {
    setForm(createEmptyForm());

    setIsPurchaseModalOpen(
      true,
    );
  }

  function closePurchaseModal() {
    setIsPurchaseModalOpen(
      false,
    );

    setForm(createEmptyForm());
  }

  function addItem() {
    setForm(
      (currentForm) => ({
        ...currentForm,

        items: [
          ...currentForm.items,

          createEmptyItem(
            currentForm.items
              .length + 1,
          ),
        ],
      }),
    );
  }

  function removeItem(
    itemId: string,
  ) {
    setForm(
      (currentForm) => {
        if (
          currentForm.items
            .length === 1
        ) {
          return currentForm;
        }

        return {
          ...currentForm,

          items:
            currentForm.items.filter(
              (item) =>
                item.id !==
                itemId,
            ),
        };
      },
    );
  }

  function updateMedicine(
    itemId: string,
    medicineId: string,
  ) {
    const medicine =
      medicineCatalog.find(
        (medicine) =>
          medicine.id ===
          medicineId,
      );

    setForm(
      (currentForm) => ({
        ...currentForm,

        items:
          currentForm.items.map(
            (item) => {
              if (
                item.id !==
                itemId
              ) {
                return item;
              }

              if (!medicine) {
                return {
                  ...item,

                  medicineId:
                    "",

                  purchaseUnit:
                    "",

                  conversionToBase:
                    1,

                  unitPrices: [],
                };
              }

              const purchasableUnits =
                medicine.units.filter(
                  (unit) =>
                    unit.purchasable,
                );

              const defaultPurchaseUnit =
                purchasableUnits[0];

              return {
                ...item,

                medicineId:
                  medicine.id,

                purchaseUnit:
                  defaultPurchaseUnit
                    ?.unitName ??
                  "",

                conversionToBase:
                  defaultPurchaseUnit
                    ?.conversionToBase ??
                  1,

                unitPrices:
                  medicine.units
                    .filter(
                      (unit) =>
                        unit.sellable,
                    )
                    .map(
                      (unit) => ({
                        unitName:
                          unit.unitName,

                        conversionToBase:
                          unit.conversionToBase,

                        sellingPrice:
                          "",

                        mrp: "",
                      }),
                    ),
              };
            },
          ),
      }),
    );
  }

  function updatePurchaseUnit(
    itemId: string,
    purchaseUnit: string,
  ) {
    setForm(
      (currentForm) => ({
        ...currentForm,

        items:
          currentForm.items.map(
            (item) => {
              if (
                item.id !==
                itemId
              ) {
                return item;
              }

              const medicine =
                medicineCatalog.find(
                  (medicine) =>
                    medicine.id ===
                    item.medicineId,
                );

              const unit =
                medicine?.units.find(
                  (unit) =>
                    unit.unitName ===
                    purchaseUnit,
                );

              return {
                ...item,

                purchaseUnit,

                conversionToBase:
                  unit
                    ?.conversionToBase ??
                  1,
              };
            },
          ),
      }),
    );
  }

  function updateItemField(
    itemId: string,
    field:
      | "quantity"
      | "unitCost"
      | "batchNo"
      | "expiryDate",
    value: string,
  ) {
    setForm(
      (currentForm) => ({
        ...currentForm,

        items:
          currentForm.items.map(
            (item) =>
              item.id === itemId
                ? {
                    ...item,
                    [field]:
                      value,
                  }
                : item,
          ),
      }),
    );
  }

  function updatePrice(
    itemId: string,
    unitName: string,
    field:
      | "sellingPrice"
      | "mrp",
    value: string,
  ) {
    setForm(
      (currentForm) => ({
        ...currentForm,

        items:
          currentForm.items.map(
            (item) =>
              item.id ===
              itemId
                ? {
                    ...item,

                    unitPrices:
                      item.unitPrices.map(
                        (
                          price,
                        ) =>
                          price.unitName ===
                          unitName
                            ? {
                                ...price,

                                [field]:
                                  value,
                              }
                            : price,
                      ),
                  }
                : item,
          ),
      }),
    );
  }

  function validateForm() {
    if (!form.supplier) {
      window.alert(
        "Please select a supplier.",
      );

      return false;
    }

    if (!form.purchaseDate) {
      window.alert(
        "Purchase date is required.",
      );

      return false;
    }

    if (
      form.items.length === 0
    ) {
      window.alert(
        "Add at least one purchase item.",
      );

      return false;
    }

    const seenBatchKeys =
      new Set<string>();

    for (
      let index = 0;
      index <
      form.items.length;
      index++
    ) {
      const item =
        form.items[index];

      const itemNumber =
        index + 1;

      if (
        !item.medicineId
      ) {
        window.alert(
          `Select a medicine for item ${itemNumber}.`,
        );

        return false;
      }

      if (
        !item.purchaseUnit
      ) {
        window.alert(
          `Select purchase unit for item ${itemNumber}.`,
        );

        return false;
      }

      const quantity =
        Number(item.quantity);

      if (
        !Number.isInteger(
          quantity,
        ) ||
        quantity <= 0
      ) {
        window.alert(
          `Quantity for item ${itemNumber} must be a positive whole number.`,
        );

        return false;
      }

      const unitCost =
        Number(item.unitCost);

      if (
        Number.isNaN(
          unitCost,
        ) ||
        unitCost <= 0
      ) {
        window.alert(
          `Enter valid purchase cost for item ${itemNumber}.`,
        );

        return false;
      }

      if (
        !item.batchNo.trim()
      ) {
        window.alert(
          `Batch number is required for item ${itemNumber}.`,
        );

        return false;
      }

      if (
        !item.expiryDate
      ) {
        window.alert(
          `Expiry date is required for item ${itemNumber}.`,
        );

        return false;
      }

      if (
        item.expiryDate <=
        form.purchaseDate
      ) {
        window.alert(
          `Expiry date for item ${itemNumber} must be after the purchase date.`,
        );

        return false;
      }

      const duplicateKey =
        `${item.medicineId}-${item.batchNo
          .trim()
          .toLowerCase()}`;

      if (
        seenBatchKeys.has(
          duplicateKey,
        )
      ) {
        window.alert(
          `The same medicine and batch number is entered more than once.`,
        );

        return false;
      }

      seenBatchKeys.add(
        duplicateKey,
      );

      if (
        item.unitPrices
          .length === 0
      ) {
        window.alert(
          `Selling units are not configured for item ${itemNumber}.`,
        );

        return false;
      }

      for (const price of item.unitPrices) {
        const sellingPrice =
          Number(
            price.sellingPrice,
          );

        if (
          Number.isNaN(
            sellingPrice,
          ) ||
          sellingPrice <= 0
        ) {
          window.alert(
            `Enter selling price for ${price.unitName} in item ${itemNumber}.`,
          );

          return false;
        }

        if (
          price.mrp.trim()
        ) {
          const mrp =
            Number(price.mrp);

          if (
            Number.isNaN(
              mrp,
            ) ||
            mrp <= 0
          ) {
            window.alert(
              `Enter valid MRP for ${price.unitName} in item ${itemNumber}.`,
            );

            return false;
          }

          if (
            sellingPrice >
            mrp
          ) {
            window.alert(
              `Selling price cannot be greater than MRP for ${price.unitName}.`,
            );

            return false;
          }
        }
      }
    }

    return true;
  }

  function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    const purchaseItems:
      PurchaseItem[] =
      form.items.map(
        (item, index) => {
          const medicine =
            medicineCatalog.find(
              (medicine) =>
                medicine.id ===
                item.medicineId,
            )!;

          const quantity =
            Number(
              item.quantity,
            );

          return {
            id: `ITEM-${Date.now()}-${index}`,

            medicineId:
              medicine.id,

            medicine:
              medicine.name,

            genericName:
              medicine.genericName,

            baseUnit:
              medicine.baseUnit,

            purchaseUnit:
              item.purchaseUnit,

            conversionToBase:
              item.conversionToBase,

            quantity,

            baseQuantity:
              quantity *
              item.conversionToBase,

            unitCost:
              Number(
                item.unitCost,
              ),

            batchNo:
              item.batchNo
                .trim(),

            expiryDate:
              item.expiryDate,

            unitPrices:
              item.unitPrices.map(
                (price) => ({
                  unitName:
                    price.unitName,

                  conversionToBase:
                    price.conversionToBase,

                  sellingPrice:
                    Number(
                      price.sellingPrice,
                    ),

                  mrp:
                    price.mrp.trim()
                      ? Number(
                          price.mrp,
                        )
                      : null,
                }),
              ),
          };
        },
      );

    const newPurchase:
      Purchase = {
      id: generatePurchaseId(),

      supplier:
        form.supplier,

      supplierInvoiceNo:
        form.supplierInvoiceNo
          .trim(),

      purchaseDate:
        form.purchaseDate,

      status:
        form.status,

      items:
        purchaseItems,

      totalAmount:
        formTotal,

      processedBy:
        "Admin User",
    };

    setPurchases(
      (currentPurchases) => [
        newPurchase,
        ...currentPurchases,
      ],
    );

    closePurchaseModal();
  }

  function getStatusClass(
    status: PurchaseStatus,
  ) {
    if (
      status === "Received"
    ) {
      return "bg-emerald-100 text-emerald-700";
    }

    if (
      status === "Pending"
    ) {
      return "bg-amber-100 text-amber-700";
    }

    return "bg-rose-100 text-rose-600";
  }

  return (
    <>
      <div className="mx-auto w-full max-w-[1600px] space-y-5">

        {/* HEADER */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">
              Purchase
            </h1>

            <p className="mt-1 text-[12px] text-slate-500">
              Receive medicines with batch, expiry,
              packaging and batch-specific pricing.
            </p>
          </div>

          <button
            type="button"
            onClick={
              openPurchaseModal
            }
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 text-[12px] font-semibold text-white shadow-sm transition hover:bg-sky-700"
          >
            <Plus className="h-4 w-4" />
            New Purchase
          </button>
        </div>

        {/* INFO */}
        <div className="rounded-2xl border border-sky-100 bg-sky-50/70 px-4 py-3">
          <div className="flex gap-3">
            <PackagePlus className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />

            <div>
              <p className="text-[12px] font-semibold text-sky-900">
                Inventory Entry Point
              </p>

              <p className="mt-1 text-[11px] leading-5 text-sky-700">
                Received purchases will later create
                inventory batches and stock movements.
                Pending purchases will not increase
                available stock until received.
              </p>
            </div>
          </div>
        </div>

        {/* STATISTICS */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={
              <ShoppingBag className="h-4 w-4" />
            }
            label="Total Purchases"
            value={statistics.total}
          />

          <StatCard
            icon={
              <CheckCircle2 className="h-4 w-4" />
            }
            label="Received"
            value={statistics.received}
          />

          <StatCard
            icon={
              <Clock3 className="h-4 w-4" />
            }
            label="Pending"
            value={statistics.pending}
          />

          <StatCard
            icon={
              <Boxes className="h-4 w-4" />
            }
            label="Purchase Value"
            value={`৳${statistics.totalValue.toLocaleString(
              "en-US",
            )}`}
          />
        </div>

        {/* SEARCH */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">

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
                placeholder="Search purchase, supplier, medicine or batch..."
                className={inputClass}
                style={{
                  paddingLeft:
                    "2.5rem",
                }}
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
              className={
                inputClass
              }
            >
              <option value="All">
                All Status
              </option>

              <option value="Received">
                Received
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

        {/* PURCHASE TABLE */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="overflow-x-auto">

            <table className="w-full min-w-[1050px]">

              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80">

                  <TableHead>
                    Purchase No.
                  </TableHead>

                  <TableHead>
                    Supplier
                  </TableHead>

                  <TableHead>
                    Supplier Invoice
                  </TableHead>

                  <TableHead>
                    Date
                  </TableHead>

                  <TableHead>
                    Items
                  </TableHead>

                  <TableHead>
                    Batches
                  </TableHead>

                  <TableHead>
                    Amount
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
                {filteredPurchases.map(
                  (
                    purchase,
                  ) => (
                    <tr
                      key={
                        purchase.id
                      }
                      className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60"
                    >

                      <td className="px-4 py-4 font-mono text-[11px] font-medium text-sky-700">
                        {
                          purchase.id
                        }
                      </td>

                      <td className="px-4 py-4">
                        <p className="text-[11px] font-medium text-slate-800">
                          {
                            purchase.supplier
                          }
                        </p>
                      </td>

                      <td className="px-4 py-4 text-[10px] text-slate-500">
                        {purchase
                          .supplierInvoiceNo ||
                          "-"}
                      </td>

                      <td className="px-4 py-4 text-[10px] text-slate-500">
                        {formatDate(
                          purchase.purchaseDate,
                        )}
                      </td>

                      <td className="px-4 py-4 text-[11px] text-slate-700">
                        {
                          purchase
                            .items
                            .length
                        }
                      </td>

                      <td className="px-4 py-4 text-[11px] text-slate-700">
                        {
                          purchase
                            .items
                            .length
                        }
                      </td>

                      <td className="px-4 py-4 text-[12px] font-semibold text-emerald-700">
                        ৳
                        {purchase.totalAmount.toLocaleString(
                          "en-US",
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[9px] font-medium ${getStatusClass(
                            purchase.status,
                          )}`}
                        >
                          {
                            purchase.status
                          }
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedPurchase(
                              purchase,
                            )
                          }
                          title="View purchase"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-sky-600 transition hover:bg-sky-50"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ),
                )}

                {filteredPurchases.length ===
                0 ? (
                  <tr>
                    <td
                      colSpan={
                        9
                      }
                      className="px-5 py-16 text-center"
                    >
                      <Search className="mx-auto h-7 w-7 text-slate-300" />

                      <p className="mt-3 text-sm font-medium text-slate-700">
                        No purchases found
                      </p>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* NEW PURCHASE MODAL */}
      {isPurchaseModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]">

          <div className="max-h-[95vh] w-full max-w-[1100px] overflow-y-auto rounded-2xl bg-white shadow-2xl">

            <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">

              <div>
                <h2 className="text-base font-semibold text-slate-950">
                  New Purchase
                </h2>

                <p className="mt-1 text-[10px] text-slate-500">
                  Receive batch and pricing information accurately.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closePurchaseModal
                }
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"
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

                {/* PURCHASE HEADER */}
                <div>
                  <SectionTitle
                    title="Purchase Information"
                    description="Supplier and receiving information."
                  />

                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">

                    <FormField label="Supplier *">
                      <select
                        value={
                          form.supplier
                        }
                        onChange={(
                          event,
                        ) =>
                          setForm(
                            (
                              current,
                            ) => ({
                              ...current,

                              supplier:
                                event
                                  .target
                                  .value,
                            }),
                          )
                        }
                        className={
                          inputClass
                        }
                      >
                        <option value="">
                          Select supplier
                        </option>

                        {suppliers.map(
                          (
                            supplier,
                          ) => (
                            <option
                              key={
                                supplier
                              }
                              value={
                                supplier
                              }
                            >
                              {
                                supplier
                              }
                            </option>
                          ),
                        )}
                      </select>
                    </FormField>

                    <FormField label="Supplier Invoice No.">
                      <input
                        value={
                          form.supplierInvoiceNo
                        }
                        onChange={(
                          event,
                        ) =>
                          setForm(
                            (
                              current,
                            ) => ({
                              ...current,

                              supplierInvoiceNo:
                                event
                                  .target
                                  .value,
                            }),
                          )
                        }
                        placeholder="e.g. INV-45892"
                        className={
                          inputClass
                        }
                      />
                    </FormField>

                    <FormField label="Purchase Date *">
                      <input
                        type="date"
                        value={
                          form.purchaseDate
                        }
                        onChange={(
                          event,
                        ) =>
                          setForm(
                            (
                              current,
                            ) => ({
                              ...current,

                              purchaseDate:
                                event
                                  .target
                                  .value,
                            }),
                          )
                        }
                        className={
                          inputClass
                        }
                      />
                    </FormField>

                    <FormField label="Status *">
                      <select
                        value={
                          form.status
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
                                event
                                  .target
                                  .value as PurchaseStatus,
                            }),
                          )
                        }
                        className={
                          inputClass
                        }
                      >
                        <option value="Received">
                          Received
                        </option>

                        <option value="Pending">
                          Pending
                        </option>

                        <option value="Cancelled">
                          Cancelled
                        </option>
                      </select>
                    </FormField>
                  </div>
                </div>

                {/* ITEMS */}
                <div className="border-t border-slate-200 pt-6">

                  <div className="flex items-center justify-between">

                    <SectionTitle
                      title="Purchase Items"
                      description="Each different batch should be entered as a separate item."
                    />

                    <button
                      type="button"
                      onClick={
                        addItem
                      }
                      className="inline-flex h-9 items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 text-[11px] font-semibold text-sky-700 hover:bg-sky-100"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Item
                    </button>
                  </div>

                  <div className="mt-4 space-y-4">

                    {form.items.map(
                      (
                        item,
                        index,
                      ) => {
                        const medicine =
                          medicineCatalog.find(
                            (
                              medicine,
                            ) =>
                              medicine.id ===
                              item.medicineId,
                          );

                        const purchasableUnits =
                          medicine?.units.filter(
                            (
                              unit,
                            ) =>
                              unit.purchasable,
                          ) ?? [];

                        const quantity =
                          Number(
                            item.quantity,
                          ) || 0;

                        const baseQuantity =
                          quantity *
                          item.conversionToBase;

                        const lineTotal =
                          quantity *
                          (Number(
                            item.unitCost,
                          ) ||
                            0);

                        return (
                          <div
                            key={
                              item.id
                            }
                            className="rounded-2xl border border-slate-200 bg-slate-50/40 p-4"
                          >

                            <div className="mb-4 flex items-center justify-between">

                              <div>
                                <p className="text-[12px] font-semibold text-slate-900">
                                  Item{" "}
                                  {index +
                                    1}
                                </p>

                                {medicine ? (
                                  <p className="mt-1 text-[9px] text-slate-400">
                                    Base
                                    unit:{" "}
                                    {
                                      medicine.baseUnit
                                    }
                                  </p>
                                ) : null}
                              </div>

                              {form
                                .items
                                .length >
                              1 ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    removeItem(
                                      item.id,
                                    )
                                  }
                                  className="flex h-8 w-8 items-center justify-center rounded-lg text-rose-500 hover:bg-rose-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              ) : null}
                            </div>

                            {/* MEDICINE / PURCHASE */}
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">

                              <FormField label="Medicine *">
                                <select
                                  value={
                                    item.medicineId
                                  }
                                  onChange={(
                                    event,
                                  ) =>
                                    updateMedicine(
                                      item.id,
                                      event
                                        .target
                                        .value,
                                    )
                                  }
                                  className={
                                    inputClass
                                  }
                                >
                                  <option value="">
                                    Select medicine
                                  </option>

                                  {medicineCatalog.map(
                                    (
                                      medicine,
                                    ) => (
                                      <option
                                        key={
                                          medicine.id
                                        }
                                        value={
                                          medicine.id
                                        }
                                      >
                                        {
                                          medicine.name
                                        }
                                      </option>
                                    ),
                                  )}
                                </select>
                              </FormField>

                              <FormField label="Purchase Unit *">
                                <select
                                  value={
                                    item.purchaseUnit
                                  }
                                  disabled={
                                    !medicine
                                  }
                                  onChange={(
                                    event,
                                  ) =>
                                    updatePurchaseUnit(
                                      item.id,
                                      event
                                        .target
                                        .value,
                                    )
                                  }
                                  className={`${inputClass} disabled:bg-slate-100`}
                                >
                                  <option value="">
                                    Select unit
                                  </option>

                                  {purchasableUnits.map(
                                    (
                                      unit,
                                    ) => (
                                      <option
                                        key={
                                          unit.unitName
                                        }
                                        value={
                                          unit.unitName
                                        }
                                      >
                                        {
                                          unit.unitName
                                        }{" "}
                                        (×
                                        {
                                          unit.conversionToBase
                                        }{" "}
                                        {
                                          medicine?.baseUnit
                                        }
                                        )
                                      </option>
                                    ),
                                  )}
                                </select>
                              </FormField>

                              <FormField label="Quantity *">
                                <input
                                  type="number"
                                  min="1"
                                  step="1"
                                  value={
                                    item.quantity
                                  }
                                  onChange={(
                                    event,
                                  ) =>
                                    updateItemField(
                                      item.id,
                                      "quantity",
                                      event
                                        .target
                                        .value,
                                    )
                                  }
                                  placeholder="e.g. 5"
                                  className={
                                    inputClass
                                  }
                                />
                              </FormField>

                              <FormField
                                label={`Purchase Cost / ${
                                  item.purchaseUnit ||
                                  "Unit"
                                } *`}
                              >
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={
                                    item.unitCost
                                  }
                                  onChange={(
                                    event,
                                  ) =>
                                    updateItemField(
                                      item.id,
                                      "unitCost",
                                      event
                                        .target
                                        .value,
                                    )
                                  }
                                  placeholder="৳0.00"
                                  className={
                                    inputClass
                                  }
                                />
                              </FormField>
                            </div>

                            {/* BATCH */}
                            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">

                              <FormField label="Batch Number *">
                                <input
                                  type="text"
                                  value={
                                    item.batchNo
                                  }
                                  onChange={(
                                    event,
                                  ) =>
                                    updateItemField(
                                      item.id,
                                      "batchNo",
                                      event
                                        .target
                                        .value,
                                    )
                                  }
                                  placeholder="e.g. NPA-2608-A"
                                  className={
                                    inputClass
                                  }
                                />
                              </FormField>

                              <FormField label="Expiry Date *">
                                <input
                                  type="date"
                                  value={
                                    item.expiryDate
                                  }
                                  onChange={(
                                    event,
                                  ) =>
                                    updateItemField(
                                      item.id,
                                      "expiryDate",
                                      event
                                        .target
                                        .value,
                                    )
                                  }
                                  className={
                                    inputClass
                                  }
                                />
                              </FormField>
                            </div>

                            {/* CONVERSION PREVIEW */}
                            {medicine &&
                            item.purchaseUnit ? (
                              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">

                                <div className="rounded-xl border border-sky-100 bg-sky-50 p-3">
                                  <p className="text-[9px] text-sky-600">
                                    Inventory Quantity
                                  </p>

                                  <p className="mt-1 text-[13px] font-semibold text-sky-900">
                                    {baseQuantity.toLocaleString(
                                      "en-US",
                                    )}{" "}
                                    {
                                      medicine.baseUnit
                                    }
                                  </p>

                                  <p className="mt-1 text-[9px] text-sky-600">
                                    {
                                      quantity
                                    }{" "}
                                    {
                                      item.purchaseUnit
                                    }{" "}
                                    ×{" "}
                                    {
                                      item.conversionToBase
                                    }
                                  </p>
                                </div>

                                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                                  <p className="text-[9px] text-emerald-600">
                                    Item Purchase Total
                                  </p>

                                  <p className="mt-1 text-[13px] font-semibold text-emerald-900">
                                    ৳
                                    {lineTotal.toLocaleString(
                                      "en-US",
                                    )}
                                  </p>
                                </div>
                              </div>
                            ) : null}

                            {/* BATCH PRICING */}
                            {item
                              .unitPrices
                              .length >
                            0 ? (
                              <div className="mt-5 border-t border-slate-200 pt-5">

                                <div>
                                  <h4 className="text-[11px] font-semibold text-slate-900">
                                    Batch Selling Prices
                                  </h4>

                                  <p className="mt-1 text-[9px] text-slate-500">
                                    Prices
                                    can
                                    differ
                                    between
                                    batches.
                                    Configure
                                    each
                                    sellable
                                    unit.
                                  </p>
                                </div>

                                <div className="mt-3 space-y-2">

                                  {item.unitPrices.map(
                                    (
                                      price,
                                    ) => (
                                      <div
                                        key={
                                          price.unitName
                                        }
                                        className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-3 md:grid-cols-[1fr_160px_160px]"
                                      >

                                        <div className="flex items-center">
                                          <div>
                                            <p className="text-[11px] font-semibold text-slate-800">
                                              {
                                                price.unitName
                                              }
                                            </p>

                                            <p className="mt-1 text-[9px] text-slate-400">
                                              1{" "}
                                              {
                                                price.unitName
                                              }{" "}
                                              ={" "}
                                              {
                                                price.conversionToBase
                                              }{" "}
                                              {
                                                medicine?.baseUnit
                                              }
                                            </p>
                                          </div>
                                        </div>

                                        <FormField label="Selling Price *">
                                          <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={
                                              price.sellingPrice
                                            }
                                            onChange={(
                                              event,
                                            ) =>
                                              updatePrice(
                                                item.id,
                                                price.unitName,
                                                "sellingPrice",
                                                event
                                                  .target
                                                  .value,
                                              )
                                            }
                                            placeholder="৳0.00"
                                            className={
                                              inputClass
                                            }
                                          />
                                        </FormField>

                                        <FormField label="MRP">
                                          <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={
                                              price.mrp
                                            }
                                            onChange={(
                                              event,
                                            ) =>
                                              updatePrice(
                                                item.id,
                                                price.unitName,
                                                "mrp",
                                                event
                                                  .target
                                                  .value,
                                              )
                                            }
                                            placeholder="Optional"
                                            className={
                                              inputClass
                                            }
                                          />
                                        </FormField>
                                      </div>
                                    ),
                                  )}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        );
                      },
                    )}
                  </div>
                </div>

                {/* TOTAL */}
                <div className="flex justify-end border-t border-slate-200 pt-5">

                  <div className="w-full max-w-[340px] rounded-xl bg-slate-50 p-4">

                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>
                        Purchase Total
                      </span>

                      <span>
                        ৳
                        {formTotal.toLocaleString(
                          "en-US",
                        )}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">

                      <span className="text-[13px] font-semibold text-slate-900">
                        Grand Total
                      </span>

                      <span className="text-[18px] font-bold text-sky-700">
                        ৳
                        {formTotal.toLocaleString(
                          "en-US",
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* FOOTER */}
              <div className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-200 bg-white px-5 py-4">

                <button
                  type="button"
                  onClick={
                    closePurchaseModal
                  }
                  className="h-10 rounded-xl border border-slate-200 px-4 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="h-10 rounded-xl bg-sky-600 px-5 text-[11px] font-semibold text-white hover:bg-sky-700"
                >
                  Save Purchase
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* DETAILS MODAL */}
      {selectedPurchase ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]">

          <div className="max-h-[94vh] w-full max-w-[900px] overflow-y-auto rounded-2xl bg-white shadow-2xl">

            <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">

              <div>
                <h2 className="text-base font-semibold text-slate-950">
                  Purchase Details
                </h2>

                <p className="mt-1 font-mono text-[10px] text-sky-700">
                  {
                    selectedPurchase.id
                  }
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedPurchase(
                    null,
                  )
                }
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 p-5">

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">

                <DetailBox
                  label="Supplier"
                  value={
                    selectedPurchase.supplier
                  }
                />

                <DetailBox
                  label="Supplier Invoice"
                  value={
                    selectedPurchase.supplierInvoiceNo ||
                    "-"
                  }
                />

                <DetailBox
                  label="Purchase Date"
                  value={formatDate(
                    selectedPurchase.purchaseDate,
                  )}
                />

                <DetailBox
                  label="Status"
                  value={
                    selectedPurchase.status
                  }
                />
              </div>

              <div className="space-y-3">

                {selectedPurchase.items.map(
                  (
                    item,
                    index,
                  ) => (
                    <div
                      key={
                        item.id
                      }
                      className="rounded-xl border border-slate-200 p-4"
                    >

                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">

                        <div>
                          <p className="text-[12px] font-semibold text-slate-900">
                            {index +
                              1}
                            .{" "}
                            {
                              item.medicine
                            }
                          </p>

                          <p className="mt-1 text-[9px] text-slate-400">
                            {
                              item.genericName
                            }
                          </p>
                        </div>

                        <div className="text-left sm:text-right">

                          <p className="text-[10px] text-slate-500">
                            Batch
                          </p>

                          <p className="text-[11px] font-semibold text-slate-800">
                            {
                              item.batchNo
                            }
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">

                        <DetailBox
                          label="Purchased"
                          value={`${item.quantity} ${item.purchaseUnit}`}
                        />

                        <DetailBox
                          label="Base Stock"
                          value={`${item.baseQuantity.toLocaleString(
                            "en-US",
                          )} ${item.baseUnit}`}
                        />

                        <DetailBox
                          label="Purchase Cost"
                          value={`৳${item.unitCost.toLocaleString(
                            "en-US",
                          )} / ${item.purchaseUnit}`}
                        />

                        <DetailBox
                          label="Expiry"
                          value={formatDate(
                            item.expiryDate,
                          )}
                        />
                      </div>

                      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">

                        <div className="border-b border-slate-200 bg-slate-50 px-3 py-2">

                          <p className="text-[10px] font-semibold text-slate-700">
                            Batch Selling Prices
                          </p>
                        </div>

                        <table className="w-full">

                          <thead>
                            <tr className="border-b border-slate-100">

                              <TableHead>
                                Unit
                              </TableHead>

                              <TableHead>
                                Conversion
                              </TableHead>

                              <TableHead>
                                Selling Price
                              </TableHead>

                              <TableHead>
                                MRP
                              </TableHead>
                            </tr>
                          </thead>

                          <tbody>
                            {item.unitPrices.map(
                              (
                                price,
                              ) => (
                                <tr
                                  key={
                                    price.unitName
                                  }
                                  className="border-b border-slate-100 last:border-b-0"
                                >

                                  <td className="px-4 py-3 text-[10px] font-medium text-slate-800">
                                    {
                                      price.unitName
                                    }
                                  </td>

                                  <td className="px-4 py-3 text-[10px] text-slate-500">
                                    ×
                                    {
                                      price.conversionToBase
                                    }{" "}
                                    {
                                      item.baseUnit
                                    }
                                  </td>

                                  <td className="px-4 py-3 text-[10px] font-semibold text-emerald-700">
                                    ৳
                                    {
                                      price.sellingPrice
                                    }
                                  </td>

                                  <td className="px-4 py-3 text-[10px] text-slate-600">
                                    {price.mrp !==
                                    null
                                      ? `৳${price.mrp}`
                                      : "-"}
                                  </td>
                                </tr>
                              ),
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ),
                )}
              </div>

              <div className="flex justify-end">

                <div className="w-full max-w-[300px] rounded-xl bg-slate-50 p-4">

                  <div className="flex items-center justify-between">

                    <span className="text-[12px] font-semibold text-slate-800">
                      Purchase Total
                    </span>

                    <span className="text-[16px] font-bold text-sky-700">
                      ৳
                      {selectedPurchase.totalAmount.toLocaleString(
                        "en-US",
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

const inputClass =
  "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[11px] text-slate-700 outline-none placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100";

function TableHead({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <th className="px-4 py-3 text-left text-[10px] font-medium text-slate-500">
      {children}
    </th>
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
      <label className="mb-2 block text-[10px] font-medium text-slate-700">
        {label}
      </label>

      {children}
    </div>
  );
}

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

function DetailBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-[9px] text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-[10px] font-semibold text-slate-800">
        {value}
      </p>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

      <div className="flex items-center gap-2 text-sky-600">
        {icon}

        <p className="text-[10px] font-medium text-slate-500">
          {label}
        </p>
      </div>

      <p className="mt-3 text-2xl font-semibold text-slate-900">
        {value}
      </p>
    </div>
  );
}