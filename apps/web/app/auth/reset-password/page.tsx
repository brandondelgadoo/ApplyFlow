"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authErrorMessage } from "../../../lib/auth/messages";
import { createBrowserSupabase } from "../../../lib/supabase/client";
import { AuthButton, AuthCard, AuthError, AuthField } from "../../../components/auth-card";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
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
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setPending(false);
    if (updateError) {
      setError(authErrorMessage(updateError));
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <AuthCard title="Choose a new password">
      <form onSubmit={onSubmit}>
        <AuthField
          label="New password"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
        />
        <AuthError message={error} />
        <AuthButton pending={pending}>Save password</AuthButton>
      </form>
    </AuthCard>
  );
}
