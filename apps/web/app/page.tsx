import { APPLICATION_STATUSES } from "@applyflow/shared";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-xl px-6 py-16">
      <h1 className="text-3xl font-bold">ApplyFlow</h1>
      <p className="mt-2 text-slate-600">
        Application statuses (imported from <code>@applyflow/shared</code>):
      </p>
      <ul className="mt-6 flex flex-wrap gap-2">
        {APPLICATION_STATUSES.map((status) => (
          <li
            key={status}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-medium"
          >
            {status}
          </li>
        ))}
      </ul>
    </main>
  );
}
