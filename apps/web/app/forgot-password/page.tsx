"use client";

import { useState } from "react";
import { authErrorMessage } from "../../lib/auth/messages";
import { createBrowserSupabase } from "../../lib/supabase/client";
import { AuthButton, AuthCard, AuthError, AuthField, AuthLink } from "../../components/auth-card";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setPending(true);
    const supabase = createBrowserSupabase();
    // After they click the email, the callback logs them in and sends them
    // to the page where they choose a new password.
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
    });
    setPending(false);
    if (resetError) {
      setError(authErrorMessage(resetError));
      return;
    }
    setSent(true);
  }

  return (
    <AuthCard
      title="Reset your password"
      footer={
        <>
          Remembered it? <AuthLink href="/login">Log in</AuthLink>
        </>
      }
    >
      {sent ? (
        <p>Check your email for a link to choose a new password.</p>
      ) : (
        <form onSubmit={onSubmit}>
          <AuthField
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            autoComplete="email"
          />
          <AuthError message={error} />
          <AuthButton pending={pending}>Send reset link</AuthButton>
        </form>
      )}
    </AuthCard>
  );
}
