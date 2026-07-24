type DashboardCardProps = {
  title: string;
  value: string;
};

export default function DashboardCard({ title, value }: DashboardCardProps) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">{title}</p>
      <p className="mt-4 text-4xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
