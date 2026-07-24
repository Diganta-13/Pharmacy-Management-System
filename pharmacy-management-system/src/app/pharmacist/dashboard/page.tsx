import DashboardCard from "@/components/DashboardCard";

export default function PharmacistDashboardPage() {
  return (
    <section className="grid gap-6 lg:grid-cols-3">
      <DashboardCard title="Prescriptions" value="24" />
      <DashboardCard title="Dispensed" value="18" />
      <DashboardCard title="Pending" value="6" />
    </section>
  );
}
