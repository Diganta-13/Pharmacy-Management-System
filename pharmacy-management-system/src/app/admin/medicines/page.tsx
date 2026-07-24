import DataTable from "@/components/DataTable";

export default function AdminMedicinesPage() {
  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-semibold text-slate-900">Medicines</h2>
      <DataTable columns={["Name", "Category", "Stock", "Price"]} rows={[]} />
    </section>
  );
}
