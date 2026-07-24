import DataTable from "@/components/DataTable";

export default function AdminSuppliersPage() {
  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-semibold text-slate-900">Suppliers</h2>
      <DataTable columns={["Supplier", "Contact", "Status"]} rows={[]} />
    </section>
  );
}
