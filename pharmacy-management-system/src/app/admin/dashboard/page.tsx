import DashboardCard from "@/components/DashboardCard";

export default function AdminDashboardPage() {
  return (
    <section className="grid gap-6 lg:grid-cols-3">
      <DashboardCard title="Medicines" value="120" />
      <DashboardCard title="Sales" value="$8.4k" />
      <DashboardCard title="Customers" value="42" />
    </section>
  );
}
