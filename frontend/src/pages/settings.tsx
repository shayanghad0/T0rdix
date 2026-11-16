import { useEffect, useState } from "react";
import { BadgeCheck, Cog, KeyRound, Monitor, Palette, ShieldCheck, Terminal, User as UserIcon } from "lucide-react";
import { api } from "@/services/api";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "@/stores/toast-store";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { CodeEditor } from "@/components/ui/code-editor";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import type { User } from "@/types";

interface AppSettings {
  id: string;
  version: number;
  seededAt: string;
  values: Record<string, unknown>;
}

/** Profile, CLI tokens and workspace preferences. */
export function SettingsPage() {
  const { user, patchUser } = useAuthStore();
  const [name, setName] = useState(user?.name ?? "");
  const [savingProfile, setSavingProfile] = useState(false);

  const [cliToken, setCliToken] = useState<string | null>(null);
  const [cliBusy, setCliBusy] = useState(false);

  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [aiStatus, setAiStatus] = useState<{ provider: string; label: string } | null>(null);

  useEffect(() => {
    void api.get<AppSettings>("/settings").then(setSettings).catch(() => undefined);
    void api.get<{ provider: string; label: string }>("/ai").then(setAiStatus).catch(() => undefined);
  }, []);

  if (!user) return null;

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      const updated = await api.patch<{ user: User }>("/auth/me", { name });
      patchUser(updated.user);
      toast.success("Profile updated");
    } catch (cause) {
      toast.error("Update failed", cause instanceof Error ? cause.message : undefined);
    } finally {
      setSavingProfile(false);
    }
  };

  const issueToken = async () => {
    setCliBusy(true);
    try {
      const { token } = await api.post<{ token: string }>("/auth/me/token");
      setCliToken(token);
      patchUser({ ...user, hasApiToken: true });
      toast.success("CLI token issued", "Copy it now — it is shown only once.");
    } catch (cause) {
      toast.error("Could not issue token", cause instanceof Error ? cause.message : undefined);
    } finally {
      setCliBusy(false);
    }
  };

  const cliSnippet = [
    "# 1) Authenticate the CLI",
    cliToken ? `t0rdix login --token ${cliToken}` : "t0rdix login --token <your-token-from-settings>",
    "",
    "# 2) Pull the dev environment of your active project",
    `t0rdix secrets pull --env development --out .env.development`,
    "",
    "# 3) Push local changes back into the vault",
    `t0rdix secrets push --file .env.development --env development`,
    "",
    "# 4) Serve mock endpoints right from your terminal",
    "t0rdix mock start --project <projectId> --port 4000",
  ].join("\n");

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-medium uppercase tracking-widest text-faint">Preferences</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-content">Settings</h1>
        <p className="mt-1 text-sm text-muted">Account, CLI access, appearance and platform status.</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <SpotlightCard className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <UserIcon className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-content">Profile</h2>
          </div>
          <div className="space-y-4">
            <Field label="Display name">
              <Input value={name} onChange={(event) => setName(event.target.value)} />
            </Field>
            <Field label="Email">
              <Input value={user.email} disabled />
            </Field>
            <div className="flex items-center justify-between">
              <Badge variant={user.role === "ADMIN" ? "primary" : "default"}>{user.role}</Badge>
              <Button size="sm" loading={savingProfile} onClick={() => void saveProfile()}>Save profile</Button>
            </div>
          </div>
        </SpotlightCard>

        <SpotlightCard glow="var(--c-accent)" className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <Palette className="h-4 w-4 text-accent" />
            <h2 className="text-sm font-semibold text-content">Appearance</h2>
          </div>
          <p className="text-xs text-muted">T0rdix is dark-mode first; light theme is one click away.</p>
          <div className="mt-4 flex items-center gap-3">
            <ThemeToggle />
            <span className="inline-flex items-center gap-1.5 text-xs text-faint">
              <Monitor className="h-3.5 w-3.5" /> persisted locally
            </span>
          </div>
        </SpotlightCard>

        <SpotlightCard glow="var(--c-success)" className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-success" />
              <h2 className="text-sm font-semibold text-content">CLI access</h2>
            </div>
            <Badge variant={user.hasApiToken ? "success" : "default"}>
              {user.hasApiToken ? "token active" : "no token"}
            </Badge>
          </div>
          <p className="text-xs text-muted">
            Issue a long-lived token for the <code className="font-mono text-accent">t0rdix</code> CLI. Issuing a new
            token rotates and invalidates the previous one.
          </p>
          <Button variant="subtle" size="sm" className="mt-4" loading={cliBusy} onClick={() => void issueToken()}>
            <KeyRound className="h-3.5 w-3.5" /> {user.hasApiToken ? "Rotate token" : "Issue token"}
          </Button>

          {cliToken ? (
            <div className="mt-4">
              <CodeEditor language="shell" height={52} value={cliToken} readOnly />
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => {
                  void navigator.clipboard.writeText(cliToken);
                  toast.success("Token copied");
                }}
              >
                Copy token
              </Button>
            </div>
          ) : null}

          <div className="mt-5">
            <p className="mb-2 text-xs font-medium text-muted">Quickstart</p>
            <CodeEditor language="shell" height={190} value={cliSnippet} readOnly />
          </div>
        </SpotlightCard>

        <div className="space-y-4">
          <SpotlightCard glow="var(--c-warning)" className="p-6">
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-warning" />
              <h2 className="text-sm font-semibold text-content">Security posture</h2>
            </div>
            <ul className="space-y-2 text-xs text-muted">
              <li className="flex items-center gap-2"><BadgeCheck className="h-3.5 w-3.5 text-success" /> Secrets encrypted with AES-256-GCM at rest</li>
              <li className="flex items-center gap-2"><BadgeCheck className="h-3.5 w-3.5 text-success" /> Passwords hashed with bcrypt (10 rounds)</li>
              <li className="flex items-center gap-2"><BadgeCheck className="h-3.5 w-3.5 text-success" /> JWT auth with role enforcement (ADMIN / MEMBER)</li>
              <li className="flex items-center gap-2"><BadgeCheck className="h-3.5 w-3.5 text-success" /> Auth endpoints rate limited (20/min/IP)</li>
              <li className="flex items-center gap-2"><BadgeCheck className="h-3.5 w-3.5 text-success" /> Secret values are never written to logs</li>
            </ul>
          </SpotlightCard>

          <SpotlightCard className="p-6">
            <div className="mb-3 flex items-center gap-2">
              <Cog className="h-4 w-4 text-muted" />
              <h2 className="text-sm font-semibold text-content">Platform & AI</h2>
            </div>
            <div className="space-y-2 text-xs text-muted">
              <p>
                Settings store version: <span className="font-mono text-content">v{settings?.version ?? "?"}</span>
              </p>
              <p>
                AI provider:{" "}
                <span className="font-mono text-accent">
                  {aiStatus ? `${aiStatus.provider} (${aiStatus.label})` : "loading…"}
                </span>
              </p>
              <p className="leading-relaxed text-faint">
                The <code className="font-mono">/ai</code> module ships an offline heuristic provider today; model-backed
                providers (local LLMs) can be plugged in without API changes.
              </p>
            </div>
          </SpotlightCard>
        </div>
      </div>
    </div>
  );
}
