export default function Navbar() {
  return (
    <nav className="flex items-center justify-between rounded-3xl bg-white px-6 py-4 shadow-sm">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">Pharmacy Management</p>
      </div>
      <div className="flex items-center gap-4 text-sm text-slate-600">
        <span>Welcome, User</span>
      </div>
    </nav>
  );
}
