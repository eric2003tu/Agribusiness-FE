import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, KeyRound, Loader2, MailCheck, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listLanguagesApi } from "@/lib/api/reference";
import type { ApiLanguage } from "@/lib/api/types";
import { useWorkspace } from "@/lib/workspace-store";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create an account — Agribridge" },
      { name: "description", content: "Register for a real Agribridge account." },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const { register, verifyOtp, resendOtp, login } = useWorkspace();
  const navigate = useNavigate();

  const [step, setStep] = useState<"form" | "otp">("form");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [languages, setLanguages] = useState<ApiLanguage[]>([]);
  const [preferredLanguageId, setPreferredLanguageId] = useState<string>("");
  const [otpCode, setOtpCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    listLanguagesApi()
      .then((res) => {
        if (cancelled) return;
        setLanguages(res.results);
        const preferred = res.results.find((l) => l.code === "en") ?? res.results[0];
        if (preferred) setPreferredLanguageId(String(preferred.id));
      })
      .catch(() => {
        /* language list is only needed to populate the select — a failure here
         * still lets the rest of the form render, submission will just surface
         * a clear "preferred_language" field error from the server instead */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function submitRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim() || !password.trim() || !preferredLanguageId) return;
    setBusy(true);
    setFormError("");
    setFieldErrors({});
    const result = await register({
      full_name: fullName.trim(),
      phone: phone.trim(),
      password,
      preferred_language: Number(preferredLanguageId),
      ...(email.trim() ? { email: email.trim() } : {}),
    });
    if (!result.ok) {
      setBusy(false);
      setFormError(result.error ?? "Registration failed.");
      setFieldErrors(result.fieldErrors ?? {});
      return;
    }
    if (email.trim()) {
      setBusy(false);
      setStep("otp");
      return;
    }
    // No email means no OTP was sent — sign the new account in directly.
    const loginResult = await login(phone.trim(), password);
    setBusy(false);
    if (loginResult.ok) void navigate({ to: "/dashboard" });
    else setFormError(loginResult.error ?? "Account created — please sign in.");
  }

  async function submitOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!otpCode.trim()) return;
    setBusy(true);
    setFormError("");
    const result = await verifyOtp(email.trim(), otpCode.trim());
    if (!result.ok) {
      setBusy(false);
      setFormError(result.error ?? "Verification failed.");
      return;
    }
    const loginResult = await login(phone.trim(), password);
    setBusy(false);
    if (loginResult.ok) void navigate({ to: "/dashboard" });
    else setFormError(loginResult.error ?? "Account verified — please sign in.");
  }

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
      <section className="relative hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary-foreground/15 text-sm font-bold">
            AB
          </span>
          <span className="text-sm font-semibold">Agribridge</span>
        </div>
        <div className="max-w-md space-y-4">
          <h2 className="text-4xl font-semibold leading-tight tracking-tight">
            Connecting farmers, buyers and input suppliers across Rwanda.
          </h2>
          <p className="text-sm text-primary-foreground/80">
            List produce, get matched into bulk aggregation groups, pool input orders with nearby
            farmers, and track every transaction from first offer to delivery.
          </p>
        </div>
        <p className="text-xs text-primary-foreground/70">Real account · Agribridge API</p>
      </section>

      <section className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          {step === "form" ? (
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                  Create your Agribridge account
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Tell us who you are and how to reach you.
                </p>
              </div>

              <form className="surface-card space-y-4 p-6" onSubmit={submitRegister}>
                {formError && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                    {formError}
                  </div>
                )}

                <div className="grid gap-2">
                  <Label htmlFor="name">Full name</Label>
                  <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                  {fieldErrors["full_name"] && (
                    <p className="text-xs text-destructive">{fieldErrors["full_name"]}</p>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+250788000000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                  {fieldErrors["phone"] && <p className="text-xs text-destructive">{fieldErrors["phone"]}</p>}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="email">Email (optional — needed to verify your account)</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  {fieldErrors["email"] && <p className="text-xs text-destructive">{fieldErrors["email"]}</p>}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      minLength={8}
                      placeholder="At least 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      aria-pressed={showPassword}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  {fieldErrors["password"] && (
                    <p className="text-xs text-destructive">{fieldErrors["password"]}</p>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label>Preferred language</Label>
                  <Select value={preferredLanguageId} onValueChange={setPreferredLanguageId}>
                    <SelectTrigger>
                      <SelectValue placeholder={languages.length ? "Select a language" : "Loading…"} />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map((l) => (
                        <SelectItem key={l.id} value={String(l.id)}>
                          {l.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
                  Create account
                </Button>
              </form>
            </>
          ) : (
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">Check your email</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  We sent a 6-digit code to {email}. Enter it below to verify your account.
                </p>
              </div>

              <form className="surface-card space-y-4 p-6" onSubmit={submitOtp}>
                {formError && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                    {formError}
                  </div>
                )}
                <div className="grid gap-2">
                  <Label htmlFor="otp">Verification code</Label>
                  <Input
                    id="otp"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="123456"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <MailCheck className="size-4" />}
                  Verify and continue
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  disabled={busy}
                  onClick={() => void resendOtp(email.trim())}
                >
                  <KeyRound className="size-4" /> Resend code
                </Button>
              </form>
            </>
          )}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-primary hover:underline">
              Back to sign in
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
