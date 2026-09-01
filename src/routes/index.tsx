import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Crown,
  GraduationCap,
  KeyRound,
  Loader2,
  LogIn,
  UserCog,
  Users,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DEMO_CREDENTIALS } from "@/lib/auth";
import { useWorkspace } from "@/lib/workspace-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sign in — TaskFlow" },
      {
        name: "description",
        content:
          "Sign in to TaskFlow to plan work, assign tasks and track your team's workload. Demo accounts available for every role.",
      },
      { property: "og:title", content: "Sign in — TaskFlow" },
      { property: "og:description", content: "Demo accounts for admin, manager and worker roles." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: LoginPage,
});

const ROLE_ICON = {
  admin: Crown,
  principal: UserCog,
  dean: UserCog,
  hod: UserCog,
  campus_admin: UserCog,
  staff: Users,
  student: GraduationCap,
  finance: Wallet,
} as const;

function LoginPage() {
  const { signIn, session, ready } = useWorkspace();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && session) {
      void navigate({ to: "/dashboard", replace: true });
    }
  }, [ready, session, navigate]);

  function submit(nextEmail = email, nextPassword = password) {
    setBusy(true);
    signIn(nextEmail, nextPassword);
    setBusy(false);
  }

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
      <section className="relative hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary-foreground/15 text-sm font-bold">
            TF
          </span>
          <span className="text-sm font-semibold">TaskFlow</span>
        </div>
        <div className="max-w-md space-y-4">
          <h2 className="text-4xl font-semibold leading-tight tracking-tight">
            Plan the work. Track the people. Waste no hour.
          </h2>
          <p className="text-sm text-primary-foreground/80">
            Assign tasks, watch progress in real time and spot idle team members before the day is
            gone — with dashboards tailored to every role.
          </p>
        </div>
        <p className="text-xs text-primary-foreground/70">Demo workspace · mock data</p>
      </section>

      <section className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Sign in to TaskFlow
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Use your work email, or pick a demo role below.
            </p>
          </div>

          <form
            className="surface-card space-y-4 p-6"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                placeholder="you@taskflow.io"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
              Sign in
            </Button>
          </form>

          <div className="mt-8">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <KeyRound className="size-3.5" />
              Demo credentials
            </div>
            <ul className="mt-3 space-y-3">
              {DEMO_CREDENTIALS.map((c) => {
                const Icon = ROLE_ICON[c.role];
                return (
                  <li key={c.email} className="surface-card p-4">
                    <div className="flex items-start gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                        <Icon className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground">{c.label}</p>
                          <Badge variant="secondary" className="capitalize">
                            {c.role}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{c.blurb}</p>
                        <p className="mt-2 font-mono text-xs text-muted-foreground">
                          {c.email} · {c.password}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEmail(c.email);
                          setPassword(c.password);
                          submit(c.email, c.password);
                        }}
                      >
                        Use
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
