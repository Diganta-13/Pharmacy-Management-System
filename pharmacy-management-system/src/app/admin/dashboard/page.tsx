"use client";

import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Box,
  CircleDollarSign,
  Clock3,
  Package,
  Pill,
  TrendingUp,
  UserRoundCog,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type StatCard = {
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
  borderClass: string;
  iconClass: string;
};

const statCards: StatCard[] = [
  {
    title: "Total Medicines",
    value: "15",
    description: "+3 this month",
    icon: Pill,
    borderClass: "border-sky-200",
    iconClass: "bg-sky-50 text-sky-600",
  },
  {
    title: "Today's Sales",
    value: "৳6,075",
    description: "+12.5% from yesterday",
    icon: CircleDollarSign,
    borderClass: "border-emerald-200",
    iconClass: "bg-emerald-50 text-emerald-600",
  },
  {
    title: "Low Stock Alerts",
    value: "3",
    description: "1 out of stock",
    icon: AlertTriangle,
    borderClass: "border-amber-200",
    iconClass: "bg-amber-50 text-amber-500",
  },
  {
    title: "Expiry Alerts",
    value: "3",
    description: "Within 90 days",
    icon: Clock3,
    borderClass: "border-rose-200",
    iconClass: "bg-rose-50 text-rose-500",
  },
  {
    title: "Monthly Sales",
    value: "৳18,380",
    description: "Jul 2026",
    icon: TrendingUp,
    borderClass: "border-violet-200",
    iconClass: "bg-violet-50 text-violet-600",
  },
  {
    title: "Total Stock Items",
    value: "2,840",
    description: "Across all categories",
    icon: Box,
    borderClass: "border-sky-200",
    iconClass: "bg-sky-50 text-sky-600",
  },
  {
    title: "Total Customers",
    value: "8",
    description: "Registered",
    icon: Users,
    borderClass: "border-teal-200",
    iconClass: "bg-teal-50 text-teal-600",
  },
  {
    title: "Total Employees",
    value: "5",
    description: "4 active",
    icon: UserRoundCog,
    borderClass: "border-indigo-200",
    iconClass: "bg-indigo-50 text-indigo-600",
  },
];

const monthlySales = [
  { month: "Jan", amount: 180000 },
  { month: "Feb", amount: 215000 },
  { month: "Mar", amount: 255000 },
  { month: "Apr", amount: 300000 },
  { month: "May", amount: 320000 },
  { month: "Jun", amount: 385000 },
  { month: "Jul", amount: 425000 },
];

const medicineTypes = [
  {
    name: "Gastric / Antacid",
    value: 32,
    revenue: "৳1,71,200",
    color: "#0789c8",
  },
  {
    name: "Pain Relief",
    value: 26,
    revenue: "৳46,250",
    color: "#129b8d",
  },
  {
    name: "Antibiotic",
    value: 18,
    revenue: "৳1,71,600",
    color: "#7c4df2",
  },
  {
    name: "Allergy",
    value: 14,
    revenue: "৳71,800",
    color: "#f59e0b",
  },
  {
    name: "Vitamin & Supplement",
    value: 10,
    revenue: "৳43,200",
    color: "#13b77a",
  },
];

const recentSales = [
  {
    invoice: "INV-2026-001",
    customer: "Rahim Uddin",
    date: "06-07-2026",
    items: 3,
    amount: "৳1,845",
    method: "Cash",
    status: "paid",
  },
  {
    invoice: "INV-2026-002",
    customer: "Nasrin Begum",
    date: "06-07-2026",
    items: 5,
    amount: "৳4,230",
    method: "bKash",
    status: "paid",
  },
  {
    invoice: "INV-2026-003",
    customer: "Kamal Hossain",
    date: "05-07-2026",
    items: 2,
    amount: "৳960",
    method: "Cash",
    status: "pending",
  },
  {
    invoice: "INV-2026-004",
    customer: "Farzana Akter",
    date: "05-07-2026",
    items: 4,
    amount: "৳2,480",
    method: "Nagad",
    status: "paid",
  },
  {
    invoice: "INV-2026-005",
    customer: "Mehedi Hasan",
    date: "04-07-2026",
    items: 7,
    amount: "৳6,825",
    method: "Card",
    status: "paid",
  },
  {
    invoice: "INV-2026-006",
    customer: "Tanvir Ahmed",
    date: "04-07-2026",
    items: 2,
    amount: "৳1,200",
    method: "Rocket",
    status: "due",
  },
  {
    invoice: "INV-2026-007",
    customer: "Sadiya Islam",
    date: "03-07-2026",
    items: 3,
    amount: "৳840",
    method: "Cash",
    status: "paid",
  },
];

const lowStockItems = [
  {
    name: "Seclo 20mg",
    stock: "35 boxes",
    minimum: "min 80",
    status: "Low",
  },
  {
    name: "Sergel 20mg",
    stock: "12 boxes",
    minimum: "min 50",
    status: "Low",
  },
  {
    name: "Histacin",
    stock: "8 strips",
    minimum: "min 60",
    status: "Low",
  },
  {
    name: "DP 10mg",
    stock: "0 strips",
    minimum: "min 30",
    status: "Out",
  },
];

const topMedicines = [
  {
    rank: 1,
    name: "Napa 500mg",
    sold: "1,240 strips",
    revenue: "৳14,880",
    percent: 100,
    category: "Pain Relief",
  },
  {
    rank: 2,
    name: "Seclo 20mg",
    sold: "980 boxes",
    revenue: "৳78,400",
    percent: 79,
    category: "Gastric / Antacid",
  },
  {
    rank: 3,
    name: "Maxpro 20mg",
    sold: "870 boxes",
    revenue: "৳78,300",
    percent: 70,
    category: "Gastric / Antacid",
  },
  {
    rank: 4,
    name: "Histacin",
    sold: "740 strips",
    revenue: "৳5,920",
    percent: 60,
    category: "Allergy",
  },
  {
    rank: 5,
    name: "Monas 10mg",
    sold: "620 strips",
    revenue: "৳93,000",
    percent: 50,
    category: "Allergy",
  },
];

function StatCardItem({ card }: { card: StatCard }) {
  const Icon = card.icon;

  return (
    <article
      className={`flex min-h-[100px] items-start justify-between rounded-2xl border bg-white p-4 shadow-sm ${card.borderClass}`}
    >
      <div>
        <p className="text-[11px] text-slate-500">{card.title}</p>
        <h3 className="mt-1 text-[22px] font-semibold leading-tight text-slate-950">
          {card.value}
        </h3>
        <p className="mt-1 text-[10px] text-slate-500">
          {card.description}
        </p>
      </div>

      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${card.iconClass}`}
      >
        <Icon className="h-5 w-5" />
      </div>
    </article>
  );
}

function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: string;
}) {
  return (
    <div className="flex items-start justify-between border-b border-slate-200 px-4 py-3">
      <div>
        <h3 className="text-[13px] font-semibold text-slate-950">{title}</h3>

        {subtitle ? (
          <p className="mt-0.5 text-[10px] text-slate-500">{subtitle}</p>
        ) : null}
      </div>

      {action ? (
        <button
          type="button"
          className="text-[10px] font-medium text-sky-600 hover:text-sky-700"
        >
          {action}
        </button>
      ) : null}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusClass =
    status === "paid"
      ? "bg-emerald-100 text-emerald-700"
      : status === "pending"
        ? "bg-amber-100 text-amber-700"
        : "bg-rose-100 text-rose-600";

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-medium capitalize ${statusClass}`}
    >
      {status}
    </span>
  );
}

export default function DashboardPage() {
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-4">
      {/* Statistics */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <StatCardItem key={card.title} card={card} />
        ))}
      </section>

      {/* Charts */}
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[2fr_1fr]">
        <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-start justify-between px-4 pb-1 pt-4">
            <div>
              <h3 className="text-[13px] font-semibold text-slate-950">
                Monthly Sales Chart
              </h3>
              <p className="text-[10px] text-slate-500">
                Jan - Jul 2026 · Bangladeshi Taka (৳)
              </p>
            </div>

            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-medium text-emerald-600">
              ↗ +10.2%
            </span>
          </div>

          <div className="h-[260px] px-2 pb-4 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={monthlySales}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e7edf2"
                />

                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "#8190a5" }}
                />

                <YAxis
                  axisLine={false}
                  tickLine={false}
                  width={48}
                  tick={{ fontSize: 10, fill: "#8190a5" }}
                  tickFormatter={(value: number) =>
                    value === 0 ? "৳0k" : `৳${value / 1000}k`
                  }
                />

                <Tooltip
                  cursor={{ fill: "#f5f9fc" }}
                  formatter={(value) => [
                    `৳${Number(value).toLocaleString("en-US")}`,
                    "Sales",
                  ]}
                />

                <Bar
                  dataKey="amount"
                  fill="#0789c8"
                  radius={[6, 6, 0, 0]}
                  barSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="px-4 pb-1 pt-4">
            <h3 className="text-[13px] font-semibold text-slate-950">
              Most Sold Medicine Type
            </h3>
            <p className="text-[10px] text-slate-500">
              By revenue · Admin view
            </p>
          </div>

          <div className="h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={medicineTypes}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={72}
                  paddingAngle={2}
                  stroke="#ffffff"
                  strokeWidth={2}
                >
                  {medicineTypes.map((item) => (
                    <Cell key={item.name} fill={item.color} />
                  ))}
                </Pie>

                <Tooltip formatter={(value) => [`${value}%`, "Sales"]} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2 px-4 pb-4">
            {medicineTypes.map((item) => (
              <div
                key={item.name}
                className="flex items-center gap-2 text-[10px]"
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color }}
                />

                <span className="min-w-0 flex-1 truncate text-slate-500">
                  {item.name}
                </span>

                <span className="font-semibold text-slate-900">
                  {item.value}%
                </span>

                <span className="w-[65px] text-right text-emerald-600">
                  {item.revenue}
                </span>
              </div>
            ))}
          </div>
        </article>
      </section>

      {/* Sales table and stock */}
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[2fr_1fr]">
        <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <SectionHeader
            title="Recent Sales"
            subtitle="Invoice, amount & payment method"
            action="View all"
          />

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70">
                  <th className="px-4 py-3 text-[10px] font-medium text-slate-500">
                    Invoice
                  </th>
                  <th className="px-4 py-3 text-[10px] font-medium text-slate-500">
                    Customer
                  </th>
                  <th className="px-4 py-3 text-[10px] font-medium text-slate-500">
                    Date
                  </th>
                  <th className="px-4 py-3 text-[10px] font-medium text-slate-500">
                    Items
                  </th>
                  <th className="px-4 py-3 text-[10px] font-medium text-slate-500">
                    Amount (৳)
                  </th>
                  <th className="px-4 py-3 text-[10px] font-medium text-slate-500">
                    Method
                  </th>
                  <th className="px-4 py-3 text-[10px] font-medium text-slate-500">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody>
                {recentSales.map((sale) => (
                  <tr
                    key={sale.invoice}
                    className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 text-[11px] font-medium text-sky-600">
                      {sale.invoice}
                    </td>

                    <td className="px-4 py-3 text-[11px] text-slate-900">
                      {sale.customer}
                    </td>

                    <td className="px-4 py-3 text-[10px] text-slate-500">
                      {sale.date}
                    </td>

                    <td className="px-4 py-3 text-[11px] text-slate-800">
                      {sale.items}
                    </td>

                    <td className="px-4 py-3 text-[11px] font-semibold text-emerald-700">
                      {sale.amount}
                    </td>

                    <td className="px-4 py-3">
                      <span className="rounded-full border border-sky-100 bg-sky-50 px-2.5 py-1 text-[10px] text-sky-700">
                        {sale.method}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <StatusBadge status={sale.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <SectionHeader title="Low Stock Alerts" action="Manage" />

          <div>
            {lowStockItems.map((item) => {
              const isOut = item.status === "Out";

              return (
                <div
                  key={item.name}
                  className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0"
                >
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      isOut ? "bg-rose-500" : "bg-orange-400"
                    }`}
                  />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-medium text-slate-900">
                      {item.name}
                    </p>

                    <p className="text-[10px] text-slate-500">
                      {item.stock} · {item.minimum}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${
                      isOut
                        ? "bg-rose-100 text-rose-600"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              );
            })}
          </div>
        </article>
      </section>

      {/* Top medicines and categories */}
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <SectionHeader
            title="Most Sold Medicines"
            subtitle="Top 5 by quantity sold"
            action="TOP 5"
          />

          <div>
            {topMedicines.map((medicine) => (
              <div
                key={medicine.rank}
                className="border-b border-slate-100 px-4 py-3 last:border-b-0"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${
                      medicine.rank === 1
                        ? "bg-amber-100 text-amber-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {medicine.rank}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-[12px] font-semibold text-slate-900">
                        {medicine.name}
                      </p>

                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-[10px] text-slate-500">
                          {medicine.sold}
                        </span>

                        <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">
                          {medicine.revenue}
                        </span>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-sky-500"
                          style={{ width: `${medicine.percent}%` }}
                        />
                      </div>

                      <span className="w-8 text-right text-[9px] text-slate-500">
                        {medicine.percent}%
                      </span>

                      <span className="rounded-full border border-sky-100 bg-sky-50 px-2 py-0.5 text-[9px] text-sky-700">
                        {medicine.category}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <SectionHeader
            title="Most Sold Medicine Category"
            subtitle="By quantity & revenue"
          />

          <div>
            {medicineTypes.map((category, index) => {
              const pieces = [2140, 1850, 1430, 1360, 720];

              return (
                <div
                  key={category.name}
                  className="px-4 py-[13px]"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-4">
                        <p className="truncate text-[12px] font-medium text-slate-900">
                          {category.name}
                        </p>

                        <p className="shrink-0 text-[10px] text-slate-500">
                          {pieces[index].toLocaleString("en-US")} pcs ·{" "}
                          <span
                            className="font-semibold"
                            style={{ color: category.color }}
                          >
                            {category.revenue}
                          </span>
                        </p>
                      </div>

                      <div className="mt-2 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(
                                category.value * 3,
                                100,
                              )}%`,
                              backgroundColor: category.color,
                            }}
                          />
                        </div>

                        <span className="w-7 text-right text-[9px] text-slate-500">
                          {category.value}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </article>
      </section>
    </div>
  );
}