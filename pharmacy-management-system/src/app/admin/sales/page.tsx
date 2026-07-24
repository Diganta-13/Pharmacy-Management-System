import DataTable from "@/components/DataTable";

export default function AdminSalesPage() {
  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-semibold text-slate-900">Sales</h2>
      <DataTable columns={["Invoice", "Customer", "Amount", "Date"]} rows={[]} />
    </section>
  );
}
