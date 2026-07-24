export default function LoginPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <section className="mx-auto flex max-w-md flex-col gap-6 rounded-3xl bg-white p-10 shadow-sm">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Sign in</h1>
          <p className="mt-2 text-sm text-slate-600">Access the admin or pharmacist workspace.</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-slate-700">
          <p className="text-sm">This login page is a placeholder. Authentication will be added in a later iteration.</p>
        </div>
      </section>
    </main>
  );
}
