import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

function configuration() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase URL and public key must be configured.");
  return { url, key };
}

// Route-handler clients are created per request; never share sessions between users.
export async function createCookieClient() {
  const { url, key } = configuration();
  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        for (const { name, value, options } of cookiesToSet) {
          cookieStore.set(name, value, options);
        }
      },
    },
  });
}

export function createBearerClient(token: string) {
  const { url, key } = configuration();
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    // Database calls use the user's token too, keeping RLS active. No service key.
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}
