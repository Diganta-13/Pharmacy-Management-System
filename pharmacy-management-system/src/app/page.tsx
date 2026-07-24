export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <section className="mx-auto max-w-5xl rounded-3xl bg-white p-10 shadow-sm">
        <h1 className="text-4xl font-semibold text-slate-900">Pharmacy Management System</h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
          Welcome to the pharmacy dashboard scaffold. Use the admin and pharmacist routes to manage medicines,
          suppliers, customers, and sales.
        </p>
      </section>
    </main>
  );
}
