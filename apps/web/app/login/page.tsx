"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { authErrorMessage } from "../../lib/auth/messages";
import { createBrowserSupabase } from "../../lib/supabase/client";
import { AuthButton, AuthCard, AuthError, AuthField, AuthLink } from "../../components/auth-card";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(
    searchParams.get("error") === "confirm" ? "That confirmation link is invalid or expired." : "",
  );
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setPending(true);
    const supabase = createBrowserSupabase();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setPending(false);
    if (signInError) {
      setError(authErrorMessage(signInError));
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <AuthCard
      title="Log in"
      footer={
        <>
          New here? <AuthLink href="/signup">Sign up</AuthLink>
          {" · "}
          <AuthLink href="/forgot-password">Forgot password</AuthLink>
        </>
      }
    >
      <form onSubmit={onSubmit}>
        <AuthField
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
        />
        <AuthField
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
        />
        <AuthError message={error} />
        <AuthButton pending={pending}>Log in</AuthButton>
      </form>
    </AuthCard>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
