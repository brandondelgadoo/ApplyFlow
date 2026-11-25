// Turns Supabase's auth errors into the sentences issue #13 asks us to show.
type AuthFailure = { message: string; code?: string };

export function authErrorMessage(error: AuthFailure): string {
  const code = error.code ?? "";
  const message = error.message.toLowerCase();

  if (code === "invalid_credentials" || message.includes("invalid login")) {
    return "Email or password is incorrect.";
  }
  if (code === "email_not_confirmed" || message.includes("email not confirmed")) {
    return "Confirm your email before logging in.";
  }
  if (
    code === "weak_password" ||
    message.includes("at least 8") ||
    message.includes("password should be")
  ) {
    return "Password must be at least 8 characters.";
  }
  if (code === "user_already_exists" || message.includes("already registered")) {
    return "An account with that email already exists. Log in instead.";
  }

  return error.message;
}
