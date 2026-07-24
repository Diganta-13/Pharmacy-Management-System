import DataTable from "@/components/DataTable";

export default function AdminCustomersPage() {
  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-semibold text-slate-900">Customers</h2>
      <DataTable columns={["Customer", "Phone", "Last Visit"]} rows={[]} />
    </section>
  );
}
