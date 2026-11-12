import Link from "next/link";

// Shared layout for the account forms. Issue #7's component library is not
// installed yet, so these pages use the same Tailwind look as the home page.
export function AuthCard({
  title,
  children,
  footer,
}: {
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-3xl font-bold">ApplyFlow</h1>
      <p className="mt-2 text-lg text-slate-700">{title}</p>
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">{children}</div>
      {footer ? <div className="mt-4 text-sm text-slate-600">{footer}</div> : null}
    </main>
  );
}

export function AuthField({
  label,
  type,
  value,
  onChange,
  autoComplete,
}: {
  label: string;
  type: "email" | "password";
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
}) {
  return (
    <label className="mt-4 block text-sm font-medium text-slate-700">
      {label}
      <input
        type={type}
        value={value}
        autoComplete={autoComplete}
        required
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-900"
      />
    </label>
  );
}

export function AuthButton({ children, pending }: { children: React.ReactNode; pending: boolean }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-6 w-full rounded-lg bg-slate-900 px-4 py-2 font-medium text-white disabled:opacity-60"
    >
      {pending ? "Please wait…" : children}
    </button>
  );
}

export function AuthError({ message }: { message: string }) {
  if (!message) return null;
  return <p className="mt-4 text-sm text-red-700">{message}</p>;
}

export function AuthLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="font-medium text-slate-900 underline">
      {children}
    </Link>
  );
}
