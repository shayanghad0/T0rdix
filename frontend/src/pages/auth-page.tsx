import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { KeyRound, Mail, User as UserIcon } from "lucide-react";
import { api, ApiClientError } from "@/services/api";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "@/stores/toast-store";
import { AuthLayout } from "@/layouts/auth-layout";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import type { User } from "@/types";

interface AuthResponse {
  token: string;
  user: User;
}

interface AuthForm {
  name: string;
  email: string;
  password: string;
}

/** Combined sign-in / sign-up route: `/login` and `/login?mode=register`. */
export function AuthPage({ mode }: { mode: "login" | "register" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const token = useAuthStore((state) => state.token);
  const setSession = useAuthStore((state) => state.setSession);

  const [form, setForm] = useState<AuthForm>({ name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (token) return <Navigate to={location.state?.from ?? "/dashboard"} replace />;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const path = mode === "register" ? "/auth/register" : "/auth/login";
      const body =
        mode === "register"
          ? { name: form.name, email: form.email, password: form.password }
          : { email: form.email, password: form.password };
      const data = await api.post<AuthResponse>(path, body);
      setSession(data.token, data.user);
      toast.success(mode === "register" ? `Welcome, ${data.user.name}!` : "Signed in", "Workspace unlocked.");
      navigate(location.state?.from ?? "/dashboard", { replace: true });
    } catch (cause) {
      const message = cause instanceof ApiClientError ? cause.message : "Unexpected error";
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout headline={mode === "register" ? "Build Faster" : "Ship Faster"}>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2 md:hidden">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent font-mono text-sm font-bold text-white">
            T
          </div>
          <span className="font-mono text-sm font-bold text-content">T0rdix</span>
        </div>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </div>

      <h2 className="text-lg font-semibold text-content">
        {mode === "register" ? "Create your account" : "Welcome back"}
      </h2>
      <p className="mt-1 text-xs text-muted">
        {mode === "register"
          ? "The first account created becomes the workspace ADMIN."
          : "Sign in to your local T0rdix workspace."}
      </p>

      {error ? (
        <div className="mt-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2.5 text-xs text-danger" role="alert">
          {error}
          {mode === "login" ? (
            <span className="mt-1 block text-[11px] text-danger/80">
              Demo accounts: admin@t0rdix.dev / admin123 · member@t0rdix.dev / member123
            </span>
          ) : null}
        </div>
      ) : null}

      <form onSubmit={(event) => void submit(event)} className="mt-5 space-y-4">
        {mode === "register" ? (
          <Field label="Name">
            <div className="relative">
              <UserIcon className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-faint" />
              <Input
                className="pl-9"
                placeholder="Ada Lovelace"
                autoComplete="name"
                minLength={2}
                required
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </div>
          </Field>
        ) : null}

        <Field label="Email">
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-faint" />
            <Input
              className="pl-9"
              type="email"
              placeholder="you@company.dev"
              autoComplete="email"
              required
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
            />
          </div>
        </Field>

        <Field label="Password" hint={mode === "register" ? "At least 8 characters." : undefined}>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-faint" />
            <Input
              className="pl-9"
              type="password"
              placeholder="••••••••"
              autoComplete={mode === "register" ? "new-password" : "current-password"}
              minLength={8}
              required
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
            />
          </div>
        </Field>

        <Button type="submit" className="w-full" size="lg" loading={busy}>
          {mode === "register" ? "Create account" : "Sign in"}
        </Button>
      </form>

      <p className="mt-5 text-center text-xs text-muted">
        {mode === "register" ? (
          <>
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-primary hover:underline">Sign in</Link>
          </>
        ) : (
          <>
            New here?{" "}
            <Link to="/login?mode=register" className="font-medium text-primary hover:underline">Create an account</Link>
          </>
        )}
      </p>
    </AuthLayout>
  );
}
