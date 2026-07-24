import Link from "next/link";

const navItems = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/medicines", label: "Medicines" },
  { href: "/admin/suppliers", label: "Suppliers" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/sales", label: "Sales" },
];

export default function Sidebar() {
  return (
    <aside className="w-full max-w-xs space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Navigation</p>
      </div>
      <nav className="space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block rounded-2xl px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
