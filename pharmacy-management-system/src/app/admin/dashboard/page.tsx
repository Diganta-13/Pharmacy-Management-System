import DashboardCard from "@/components/DashboardCard";

export default function AdminDashboardPage() {
  return (
    <main className="p-6 bg-gray-50 min-h-screen">

      <h1 className="text-3xl font-bold mb-6">
        Admin Dashboard
      </h1>

      <section className="grid gap-6 md:grid-cols-3">

        <DashboardCard 
          title="Total Medicines"
          value="120"
        />

        <DashboardCard 
          title="Today's Sales"
          value="$8.4K"
        />

        <DashboardCard 
          title="Customers"
          value="42"
        />

      </section>

    </main>
  );
}