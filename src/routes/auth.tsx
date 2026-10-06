import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Hema Gogo" },
      { name: "description", content: "Sign in to save your Hema Gogo workspace settings and AI Hema change history." },
      { property: "og:title", content: "Sign in — Hema Gogo" },
      { property: "og:description", content: "Sign in to your Hema Gogo workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const res = mode === "in"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
    setBusy(false);
    if (res.error) return toast.error(res.error.message);
    if (mode === "up" && !res.data.session) return toast.success("Check your email to confirm your account.");
    navigate({ to: "/" });
  };

  const google = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) toast.error(r.error.message ?? "Google sign-in failed");
  };

  return (
    <main className="grid min-h-svh place-items-center bg-secondary/30 px-4">
      <Toaster />
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-md bg-primary font-black text-primary-foreground">H</span>
          <div>
            <h1 className="font-semibold">Hema Gogo</h1>
            <p className="text-xs text-muted-foreground">{mode === "in" ? "Sign in to your workspace" : "Create your account"}</p>
          </div>
        </div>
        <Button variant="outline" className="w-full" onClick={google}>Continue with Google</Button>
        <div className="my-4 text-center text-xs text-muted-foreground">or</div>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1"><Label htmlFor="email">Email</Label><Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div className="space-y-1"><Label htmlFor="pw">Password</Label><Input id="pw" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
          <Button type="submit" className="w-full" disabled={busy}>{mode === "in" ? "Sign in" : "Create account"}</Button>
        </form>
        <button className="mt-4 w-full text-center text-sm text-muted-foreground underline-offset-4 hover:underline" onClick={() => setMode(mode === "in" ? "up" : "in")}>
          {mode === "in" ? "No account? Create one" : "Have an account? Sign in"}
        </button>
        <Link to="/" className="mt-2 block text-center text-xs text-muted-foreground">Continue without signing in</Link>
      </div>
    </main>
  );
}
