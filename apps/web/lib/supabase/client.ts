"use client";

import { createBrowserClient } from "@supabase/ssr";

// Used by the sign-up, log-in, and password forms. The browser stores the
// login cookie; the server client in server.ts reads that same cookie.
export function createBrowserSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase URL and public key must be configured.");
  return createBrowserClient(url, key);
}
