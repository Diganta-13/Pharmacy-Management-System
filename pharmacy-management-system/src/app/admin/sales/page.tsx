"use client";

import { useMemo, useState } from "react";
import {
  Minus,
  Plus,
  Search,
  ShoppingCart,
  X,
} from "lucide-react";

type Medicine = {
  id: string;
  name: string;
  genericName: string;
  category: string;
  stock: number;
  unit: string;
  price: number;
};

type CartItem = {
  medicineId: string;
  name: string;
  price: number;
  quantity: number;
  availableStock: number;
};

type PaymentMethod =
  | "Cash"
  | "bKash"
  | "Nagad"
  | "Card"
  | "Rocket";

type SaleStatus = "paid" | "pending" | "due";

type Sale = {
  invoice: string;
  customer: string;
  mobile: string;
  date: string;
  items: number;
  amount: number;
  method: PaymentMethod;
  status: SaleStatus;
};

type GeneratedInvoice = {
  invoice: string;
  customer: string;
  mobile: string;
  date: string;
  items: CartItem[];
  paymentMethod: PaymentMethod;
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  vatAmount: number;
  total: number;
};

const initialMedicines: Medicine[] = [
  {
    id: "MED-001",
    name: "Napa 500mg",
    genericName: "Paracetamol",
    category: "Pain Relief",
    stock: 450,
    unit: "strips",
    price: 12,
  },
  {
    id: "MED-002",
    name: "Ace Plus",
    genericName: "Paracetamol + Caffeine",
    category: "Pain Relief",
    stock: 180,
    unit: "strips",
    price: 25,
  },
  {
    id: "MED-004",
    name: "Seclo 20mg",
    genericName: "Omeprazole",
    category: "Gastric / Antacid",
    stock: 35,
    unit: "boxes",
    price: 80,
  },
  {
    id: "MED-005",
    name: "Maxpro 20mg",
    genericName: "Esomeprazole",
    category: "Gastric / Antacid",
    stock: 290,
    unit: "boxes",
    price: 90,
  },
  {
    id: "MED-006",
    name: "Sergel 20mg",
    genericName: "Rabeprazole",
    category: "Gastric / Antacid",
    stock: 12,
    unit: "boxes",
    price: 85,
  },
  {
    id: "MED-008",
    name: "Monas 10mg",
    genericName: "Montelukast",
    category: "Allergy",
    stock: 200,
    unit: "strips",
    price: 150,
  },
  {
    id: "MED-009",
    name: "Histacin",
    genericName: "Chlorphenamine",
    category: "Allergy",
    stock: 8,
    unit: "strips",
    price: 8,
  },
  {
    id: "MED-010",
    name: "Fexo 120mg",
    genericName: "Fexofenadine",
    category: "Allergy",
    stock: 320,
    unit: "strips",
    price: 50,
  },
  {
    id: "MED-007",
    name: "Losectil 20mg",
    genericName: "Omeprazole",
    category: "Gastric / Antacid",
    stock: 95,
    unit: "boxes",
    price: 70,
  },
  {
    id: "MED-003",
    name: "Napa Extend",
    genericName: "Paracetamol ER",
    category: "Pain Relief",
    stock: 600,
    unit: "strips",
    price: 25,
  },
  {
    id: "MED-013",
    name: "Amdocal 5mg",
    genericName: "Amlodipine",
    category: "Blood Pressure",
    stock: 140,
    unit: "strips",
    price: 35,
  },
  {
    id: "MED-011",
    name: "Zimax 500mg",
    genericName: "Azithromycin",
    category: "Antibiotic",
    stock: 75,
    unit: "strips",
    price: 120,
  },
  {
    id: "MED-012",
    name: "DP 10mg",
    genericName: "Domperidone",
    category: "Gastric / Antacid",
    stock: 0,
    unit: "strips",
    price: 20,
  },
];

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
    status: "pending",
  },
  {
    invoice: "INV-2026-004",
    customer: "Farzana Akter",
    mobile: "01612345678",
    date: "05-07-2026",
    items: 4,
    amount: 2480,
    method: "Nagad",
    status: "paid",
  },
  {
    invoice: "INV-2026-005",
    customer: "Mehedi Hasan",
    mobile: "01512345678",
    date: "04-07-2026",
    items: 7,
    amount: 6825,
    method: "Card",
    status: "paid",
  },
  {
    invoice: "INV-2026-006",
    customer: "Tanvir Ahmed",
    mobile: "01912345678",
    date: "04-07-2026",
    items: 2,
    amount: 1200,
    method: "Rocket",
    status: "due",
  },
  {
    invoice: "INV-2026-007",
    customer: "Sadiya Islam",
    mobile: "01711111111",
    date: "03-07-2026",
    items: 3,
    amount: 840,
    method: "Cash",
    status: "paid",
  },
];

function getLocalDate() {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${day}-${month}-${year}`;
}

export default function SalesPage() {
  const [medicines, setMedicines] =
    useState<Medicine[]>(initialMedicines);

  const [recentSales, setRecentSales] =
    useState<Sale[]>(initialSales);

  const [cart, setCart] = useState<CartItem[]>([]);

  const [searchTerm, setSearchTerm] = useState("");

  const [customerName, setCustomerName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("Cash");

  const [discountPercent, setDiscountPercent] =
    useState("0");

  const [generatedInvoice, setGeneratedInvoice] =
    useState<GeneratedInvoice | null>(null);

  const filteredMedicines = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return medicines.filter((medicine) => {
      return (
        medicine.name.toLowerCase().includes(search) ||
        medicine.genericName.toLowerCase().includes(search)
      );
    });
  }, [medicines, searchTerm]);

  const subtotal = useMemo(() => {
    return cart.reduce(
      (total, item) =>
        total + item.price * item.quantity,
      0,
    );
  }, [cart]);

  const safeDiscountPercent = Math.min(
    100,
    Math.max(0, Number(discountPercent) || 0),
  );

  const discountAmount =
    subtotal * (safeDiscountPercent / 100);

  const amountAfterDiscount =
    subtotal - discountAmount;

  const vatAmount = amountAfterDiscount * 0.05;

  const total = amountAfterDiscount + vatAmount;

  function addToCart(medicine: Medicine) {
    if (medicine.stock <= 0) {
      window.alert(
        `${medicine.name} is currently out of stock.`,
      );
      return;
    }

    const existingItem = cart.find(
      (item) => item.medicineId === medicine.id,
    );

    if (existingItem) {
      if (
        existingItem.quantity >=
        medicine.stock
      ) {
        window.alert(
          `Only ${medicine.stock} ${medicine.unit} of ${medicine.name} are available.`,
        );
        return;
      }

      setCart((currentCart) =>
        currentCart.map((item) =>
          item.medicineId === medicine.id
            ? {
                ...item,
                quantity: item.quantity + 1,
              }
            : item,
        ),
      );

      return;
    }

    const newItem: CartItem = {
      medicineId: medicine.id,
      name: medicine.name,
      price: medicine.price,
      quantity: 1,
      availableStock: medicine.stock,
    };

    setCart((currentCart) => [
      ...currentCart,
      newItem,
    ]);
  }

  function increaseQuantity(item: CartItem) {
    if (item.quantity >= item.availableStock) {
      window.alert(
        `Maximum available stock for ${item.name} is ${item.availableStock}.`,
      );
      return;
    }

    setCart((currentCart) =>
      currentCart.map((cartItem) =>
        cartItem.medicineId === item.medicineId
          ? {
              ...cartItem,
              quantity: cartItem.quantity + 1,
            }
          : cartItem,
      ),
    );
  }

  function decreaseQuantity(item: CartItem) {
    if (item.quantity <= 1) {
      return;
    }

    setCart((currentCart) =>
      currentCart.map((cartItem) =>
        cartItem.medicineId === item.medicineId
          ? {
              ...cartItem,
              quantity: cartItem.quantity - 1,
            }
          : cartItem,
      ),
    );
  }

  function removeFromCart(medicineId: string) {
    setCart((currentCart) =>
      currentCart.filter(
        (item) => item.medicineId !== medicineId,
      ),
    );
  }

  function generateInvoiceNumber() {
    const highestNumber = recentSales.reduce(
      (highest, sale) => {
        const number = Number(
          sale.invoice.split("-")[2],
        );

        return Math.max(highest, number);
      },
      0,
    );

    return `INV-2026-${String(
      highestNumber + 1,
    ).padStart(3, "0")}`;
  }

  function handleGenerateInvoice() {
    if (cart.length === 0) {
      window.alert(
        "Please add at least one medicine to the cart.",
      );
      return;
    }

    if (
      mobileNumber.trim() &&
      !/^01\d{9}$/.test(mobileNumber.trim())
    ) {
      window.alert(
        "Please enter a valid 11-digit Bangladeshi mobile number.",
      );
      return;
    }

    for (const item of cart) {
      const medicine = medicines.find(
        (medicine) =>
          medicine.id === item.medicineId,
      );

      if (!medicine) {
        continue;
      }

      if (item.quantity > medicine.stock) {
        window.alert(
          `${medicine.name} does not have enough stock.`,
        );
        return;
      }
    }

    const invoiceNumber =
      generateInvoiceNumber();

    const customer =
      customerName.trim() || "Walk-in Customer";

    const mobile =
      mobileNumber.trim() || "-";

    const invoice: GeneratedInvoice = {
      invoice: invoiceNumber,
      customer,
      mobile,
      date: getLocalDate(),
      items: [...cart],
      paymentMethod,
      subtotal,
      discountPercent: safeDiscountPercent,
      discountAmount,
      vatAmount,
      total,
    };

    const totalItems = cart.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );

    const newSale: Sale = {
      invoice: invoiceNumber,
      customer,
      mobile,
      date: getLocalDate(),
      items: totalItems,
      amount: Math.round(total),
      method: paymentMethod,
      status: "paid",
    };

    setRecentSales((currentSales) => [
      newSale,
      ...currentSales,
    ]);

    setMedicines((currentMedicines) =>
      currentMedicines.map((medicine) => {
        const soldItem = cart.find(
          (item) =>
            item.medicineId === medicine.id,
        );

        if (!soldItem) {
          return medicine;
        }

        return {
          ...medicine,
          stock:
            medicine.stock -
            soldItem.quantity,
        };
      }),
    );

    setGeneratedInvoice(invoice);

    setCart([]);
    setCustomerName("");
    setMobileNumber("");
    setPaymentMethod("Cash");
    setDiscountPercent("0");
  }

  function getStatusClass(status: SaleStatus) {
    if (status === "paid") {
      return "bg-emerald-100 text-emerald-700";
    }

    if (status === "pending") {
      return "bg-amber-100 text-amber-700";
    }

    return "bg-rose-100 text-rose-600";
  }

  return (
    <>
      <div className="mx-auto grid w-full max-w-[1600px] grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(380px,1fr)]">
        {/* LEFT SIDE */}
        <div className="min-w-0 space-y-4">
          {/* Search */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                type="text"
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(event.target.value)
                }
                placeholder="Search by medicine name or generic name..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-[13px] text-slate-700 outline-none placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              />
            </div>
          </section>

          {/* Medicines */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80">
                    <th className="px-4 py-4 text-[11px] font-medium text-slate-500">
                      Medicine
                    </th>

                    <th className="px-4 py-4 text-[11px] font-medium text-slate-500">
                      Generic
                    </th>

                    <th className="px-4 py-4 text-[11px] font-medium text-slate-500">
                      Category
                    </th>

                    <th className="px-4 py-4 text-[11px] font-medium text-slate-500">
                      Stock
                    </th>

                    <th className="px-4 py-4 text-[11px] font-medium text-slate-500">
                      Price (৳)
                    </th>

                    <th className="w-[100px] px-4 py-4 text-[11px] font-medium text-slate-500">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredMedicines.map(
                    (medicine) => (
                      <tr
                        key={medicine.id}
                        className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70"
                      >
                        <td className="px-4 py-[15px] text-[13px] font-semibold text-slate-900">
                          {medicine.name}
                        </td>

                        <td className="px-4 py-[15px] text-[11px] text-slate-500">
                          {medicine.genericName}
                        </td>

                        <td className="px-4 py-[15px]">
                          <span className="inline-flex rounded-full border border-sky-100 bg-sky-50 px-2.5 py-1 text-[9px] font-medium text-sky-700">
                            {medicine.category}
                          </span>
                        </td>

                        <td className="px-4 py-[15px] text-[12px] text-slate-700">
                          <span
                            className={
                              medicine.stock === 0
                                ? "font-semibold text-rose-600"
                                : ""
                            }
                          >
                            {medicine.stock}{" "}
                            {medicine.unit}
                          </span>
                        </td>

                        <td className="px-4 py-[15px] text-[12px] font-semibold text-emerald-700">
                          ৳{medicine.price}
                        </td>

                        <td className="px-4 py-[15px]">
                          <button
                            type="button"
                            disabled={
                              medicine.stock === 0
                            }
                            onClick={() =>
                              addToCart(
                                medicine,
                              )
                            }
                            className={`flex h-8 items-center gap-1.5 rounded-xl px-3 text-[11px] font-semibold text-white transition ${
                              medicine.stock === 0
                                ? "cursor-not-allowed bg-slate-300"
                                : "bg-sky-600 hover:bg-sky-700"
                            }`}
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Add
                          </button>
                        </td>
                      </tr>
                    ),
                  )}

                  {filteredMedicines.length ===
                  0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-5 py-14 text-center"
                      >
                        <Search className="mx-auto h-6 w-6 text-slate-400" />

                        <p className="mt-3 text-sm font-medium text-slate-700">
                          No medicines found
                        </p>
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>

          {/* Recent Sales */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-4 py-4">
              <h2 className="text-[13px] font-semibold text-slate-900">
                Recent Sales
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70">
                    <th className="px-4 py-3 text-left text-[10px] font-medium text-slate-500">
                      Invoice
                    </th>

                    <th className="px-4 py-3 text-left text-[10px] font-medium text-slate-500">
                      Customer
                    </th>

                    <th className="px-4 py-3 text-left text-[10px] font-medium text-slate-500">
                      Mobile
                    </th>

                    <th className="px-4 py-3 text-left text-[10px] font-medium text-slate-500">
                      Date
                    </th>

                    <th className="px-4 py-3 text-left text-[10px] font-medium text-slate-500">
                      Items
                    </th>

                    <th className="px-4 py-3 text-left text-[10px] font-medium text-slate-500">
                      Amount (৳)
                    </th>

                    <th className="px-4 py-3 text-left text-[10px] font-medium text-slate-500">
                      Method
                    </th>

                    <th className="px-4 py-3 text-left text-[10px] font-medium text-slate-500">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {recentSales.map((sale) => (
                    <tr
                      key={sale.invoice}
                      className="border-b border-slate-100 last:border-b-0"
                    >
                      <td className="px-4 py-3 font-mono text-[11px] font-medium text-sky-700">
                        {sale.invoice}
                      </td>

                      <td className="px-4 py-3 text-[11px] font-medium text-slate-800">
                        {sale.customer}
                      </td>

                      <td className="px-4 py-3 text-[10px] text-slate-500">
                        {sale.mobile}
                      </td>

                      <td className="px-4 py-3 text-[10px] text-slate-500">
                        {sale.date}
                      </td>

                      <td className="px-4 py-3 text-[11px] text-slate-700">
                        {sale.items}
                      </td>

                      <td className="px-4 py-3 text-[12px] font-semibold text-emerald-700">
                        ৳
                        {sale.amount.toLocaleString(
                          "en-US",
                        )}
                      </td>

                      <td className="px-4 py-3 text-[10px] text-slate-700">
                        {sale.method}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[9px] font-medium ${getStatusClass(
                            sale.status,
                          )}`}
                        >
                          {sale.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* RIGHT SIDE BILLING CART */}
        <div className="min-w-0">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:sticky xl:top-4">
            <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
              <ShoppingCart className="h-4 w-4 text-sky-600" />

              <h2 className="text-[13px] font-semibold text-slate-900">
                Billing Cart
              </h2>
            </div>

            <div className="space-y-4 p-5">
              <div>
                <label className="mb-2 block text-[12px] font-medium text-slate-700">
                  Customer Name
                </label>

                <input
                  type="text"
                  value={customerName}
                  onChange={(event) =>
                    setCustomerName(
                      event.target.value,
                    )
                  }
                  placeholder="Customer name (optional)"
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[12px] outline-none placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-[12px] font-medium text-slate-700">
                  Mobile Number
                </label>

                <input
                  type="text"
                  value={mobileNumber}
                  maxLength={11}
                  onChange={(event) =>
                    setMobileNumber(
                      event.target.value.replace(
                        /\D/g,
                        "",
                      ),
                    )
                  }
                  placeholder="017XXXXXXXX"
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[12px] outline-none placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                />
              </div>

              {/* CART ITEMS */}
              <div className="space-y-2">
                {cart.length === 0 ? (
                  <div className="flex min-h-[120px] items-center justify-center text-center">
                    <div>
                      <ShoppingCart className="mx-auto h-6 w-6 text-slate-300" />

                      <p className="mt-2 text-[12px] text-slate-500">
                        No items in cart.
                      </p>

                      <p className="text-[11px] text-slate-400">
                        Search and add medicines.
                      </p>
                    </div>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div
                      key={item.medicineId}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] font-semibold text-slate-800">
                          {item.name}
                        </p>

                        <p className="mt-0.5 text-[9px] text-slate-500">
                          ৳{item.price} ×{" "}
                          {item.quantity} = ৳
                          {(
                            item.price *
                            item.quantity
                          ).toLocaleString(
                            "en-US",
                          )}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            decreaseQuantity(
                              item,
                            )
                          }
                          disabled={
                            item.quantity <= 1
                          }
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Minus className="h-3 w-3" />
                        </button>

                        <span className="w-5 text-center text-[12px] font-semibold text-slate-800">
                          {item.quantity}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            increaseQuantity(
                              item,
                            )
                          }
                          disabled={
                            item.quantity >=
                            item.availableStock
                          }
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Plus className="h-3 w-3" />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            removeFromCart(
                              item.medicineId,
                            )
                          }
                          className="flex h-7 w-7 items-center justify-center rounded-full text-rose-500 transition hover:bg-rose-50"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* PAYMENT */}
            <div className="space-y-4 border-t border-slate-200 p-5">
              <div>
                <label className="mb-2 block text-[12px] font-medium text-slate-700">
                  Payment Method
                </label>

                <select
                  value={paymentMethod}
                  onChange={(event) =>
                    setPaymentMethod(
                      event.target
                        .value as PaymentMethod,
                    )
                  }
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[12px] text-slate-700 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
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

              <div>
                <label className="mb-2 block text-[12px] font-medium text-slate-700">
                  Discount (%)
                </label>

                <input
                  type="number"
                  min="0"
                  max="100"
                  value={discountPercent}
                  onChange={(event) =>
                    setDiscountPercent(
                      event.target.value,
                    )
                  }
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[12px] outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                />
              </div>

              {/* TOTAL */}
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">
                    Subtotal
                  </span>

                  <span className="text-slate-700">
                    ৳
                    {subtotal.toLocaleString(
                      "en-US",
                    )}
                  </span>
                </div>

                {safeDiscountPercent > 0 ? (
                  <div className="mt-2 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">
                      Discount (
                      {safeDiscountPercent}%)
                    </span>

                    <span className="text-rose-500">
                      -৳
                      {Math.round(
                        discountAmount,
                      ).toLocaleString(
                        "en-US",
                      )}
                    </span>
                  </div>
                ) : null}

                <div className="mt-2 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">
                    VAT (5%)
                  </span>

                  <span className="text-slate-700">
                    ৳
                    {Math.round(
                      vatAmount,
                    ).toLocaleString(
                      "en-US",
                    )}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
                  <span className="text-[14px] font-semibold text-slate-900">
                    Total
                  </span>

                  <span className="text-[18px] font-bold text-sky-600">
                    ৳
                    {Math.round(
                      total,
                    ).toLocaleString(
                      "en-US",
                    )}
                  </span>
                </div>
              </div>

              <button
                type="button"
                disabled={cart.length === 0}
                onClick={
                  handleGenerateInvoice
                }
                className="h-11 w-full rounded-xl bg-sky-600 text-[13px] font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-sky-300"
              >
                Generate Invoice
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* INVOICE PREVIEW MODAL */}
      {generatedInvoice ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]">
          <div className="max-h-[92vh] w-full max-w-[650px] overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-slate-950">
                  Invoice Generated
                </h2>

                <p className="mt-1 font-mono text-[11px] text-sky-700">
                  {generatedInvoice.invoice}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setGeneratedInvoice(null)
                }
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 p-5">
              <div className="text-center">
                <h2 className="text-xl font-bold text-slate-900">
                  Green Life Pharmacy
                </h2>

                <p className="mt-1 text-[11px] text-slate-500">
                  Pharmacy Management System
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[9px] text-slate-500">
                    Customer
                  </p>

                  <p className="mt-1 text-[11px] font-semibold text-slate-900">
                    {
                      generatedInvoice.customer
                    }
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[9px] text-slate-500">
                    Mobile
                  </p>

                  <p className="mt-1 text-[11px] font-semibold text-slate-900">
                    {
                      generatedInvoice.mobile
                    }
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[9px] text-slate-500">
                    Date
                  </p>

                  <p className="mt-1 text-[11px] font-semibold text-slate-900">
                    {
                      generatedInvoice.date
                    }
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[9px] text-slate-500">
                    Payment
                  </p>

                  <p className="mt-1 text-[11px] font-semibold text-slate-900">
                    {
                      generatedInvoice.paymentMethod
                    }
                  </p>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-3 py-3 text-left text-[10px] font-medium text-slate-500">
                        Medicine
                      </th>

                      <th className="px-3 py-3 text-left text-[10px] font-medium text-slate-500">
                        Qty
                      </th>

                      <th className="px-3 py-3 text-left text-[10px] font-medium text-slate-500">
                        Price
                      </th>

                      <th className="px-3 py-3 text-right text-[10px] font-medium text-slate-500">
                        Total
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {generatedInvoice.items.map(
                      (item) => (
                        <tr
                          key={
                            item.medicineId
                          }
                          className="border-t border-slate-100"
                        >
                          <td className="px-3 py-3 text-[11px] text-slate-800">
                            {item.name}
                          </td>

                          <td className="px-3 py-3 text-[11px] text-slate-500">
                            {item.quantity}
                          </td>

                          <td className="px-3 py-3 text-[11px] text-slate-500">
                            ৳{item.price}
                          </td>

                          <td className="px-3 py-3 text-right text-[11px] font-semibold text-slate-900">
                            ৳
                            {(
                              item.price *
                              item.quantity
                            ).toLocaleString(
                              "en-US",
                            )}
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>

              <div className="ml-auto max-w-[320px] space-y-2">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500">
                    Subtotal
                  </span>

                  <span>
                    ৳
                    {generatedInvoice.subtotal.toLocaleString(
                      "en-US",
                    )}
                  </span>
                </div>

                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500">
                    Discount (
                    {
                      generatedInvoice.discountPercent
                    }
                    %)
                  </span>

                  <span>
                    -৳
                    {Math.round(
                      generatedInvoice.discountAmount,
                    ).toLocaleString(
                      "en-US",
                    )}
                  </span>
                </div>

                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500">
                    VAT (5%)
                  </span>

                  <span>
                    ৳
                    {Math.round(
                      generatedInvoice.vatAmount,
                    ).toLocaleString(
                      "en-US",
                    )}
                  </span>
                </div>

                <div className="flex justify-between border-t border-slate-200 pt-3 text-[14px] font-bold">
                  <span>Total</span>

                  <span className="text-sky-700">
                    ৳
                    {Math.round(
                      generatedInvoice.total,
                    ).toLocaleString(
                      "en-US",
                    )}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setGeneratedInvoice(null)
                }
                className="h-10 w-full rounded-xl bg-sky-600 text-[12px] font-semibold text-white hover:bg-sky-700"
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