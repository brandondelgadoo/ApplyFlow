"use client";

import { useState } from "react";
import { authErrorMessage } from "../../lib/auth/messages";
import { createBrowserSupabase } from "../../lib/supabase/client";
import { AuthButton, AuthCard, AuthError, AuthField, AuthLink } from "../../components/auth-card";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setPending(true);
    const supabase = createBrowserSupabase();
    // emailRedirectTo is where the confirmation link sends the person.
    // /auth/callback turns that link into a logged-in session.
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setPending(false);
    if (signUpError) {
      setError(authErrorMessage(signUpError));
      return;
    }
    setSent(true);
  }

  return (
    <AuthCard
      title="Create an account"
      footer={
        <>
          Already have an account? <AuthLink href="/login">Log in</AuthLink>
        </>
      }
    >
      {sent ? (
        <p>Check your email to confirm your account. Then you can log in.</p>
      ) : (
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
            autoComplete="new-password"
          />
          <AuthError message={error} />
          <AuthButton pending={pending}>Sign up</AuthButton>
        </form>
      )}
    </AuthCard>
  );
}
