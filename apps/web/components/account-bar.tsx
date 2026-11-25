"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createBrowserSupabase } from "../lib/supabase/client";

// Shows Log in / Sign up, or the current email and Log out.
export function AccountBar() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createBrowserSupabase();
    void supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });
  }, []);

  async function logOut() {
    const supabase = createBrowserSupabase();
    await supabase.auth.signOut();
    setEmail(null);
    router.refresh();
  }

  if (!email) {
    return (
      <p className="mt-8 flex gap-4 text-sm">
        <Link href="/login" className="font-medium underline">
          Log in
        </Link>
        <Link href="/signup" className="font-medium underline">
          Sign up
        </Link>
      </p>
    );
  }

  return (
    <p className="mt-8 flex items-center gap-4 text-sm">
      <span>Logged in as {email}</span>
      <button type="button" onClick={() => void logOut()} className="font-medium underline">
        Log out
      </button>
    </p>
  );
}
