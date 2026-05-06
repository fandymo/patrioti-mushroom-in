import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sprout, LogIn, ShieldCheck, BarChart3, ClipboardList, Loader2 } from "lucide-react";
import { useState } from "react";
import { trpc } from "@/lib/trpc";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const utils = trpc.useUtils();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
        setIsLoading(false);
        return;
      }

      // Refresh auth state and reload
      await utils.auth.me.invalidate();
      window.location.href = "/";
    } catch (err) {
      setError("Network error. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-green-50 via-emerald-50 to-white">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 md:px-10">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Sprout className="h-5 w-5 text-primary" />
          </div>
          <span className="text-lg font-bold text-primary tracking-tight">Patrioti</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: Info */}
          <div className="hidden lg:flex flex-col gap-8">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight text-foreground leading-tight">
                Mushroom Harvest<br />
                <span className="text-primary">Tracking System</span>
              </h1>
              <p className="mt-4 text-muted-foreground text-lg leading-relaxed max-w-md">
                Streamline your harvest operations with real-time tracking, comprehensive reports, and team management — all in one place.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="flex items-start gap-4 p-4 rounded-xl bg-white/70 border border-green-100 shadow-sm">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <ClipboardList className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-foreground">Quick Data Entry</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Mobile-optimized forms for fast harvest recording on the go</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 rounded-xl bg-white/70 border border-green-100 shadow-sm">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-foreground">Detailed Reports</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Analyze performance by employee, room, shift, and more</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 rounded-xl bg-white/70 border border-green-100 shadow-sm">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-foreground">Role-Based Access</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Admins manage everything, workers enter their own data securely</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Login Card */}
          <div className="flex justify-center lg:justify-end">
            <div className="w-full max-w-sm">
              <form onSubmit={handleLogin} className="bg-white rounded-2xl shadow-xl border border-green-100 p-8 flex flex-col items-center gap-6">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <Sprout className="h-8 w-8 text-primary" />
                </div>

                <div className="text-center">
                  <h2 className="text-2xl font-bold tracking-tight text-foreground">
                    Welcome Back
                  </h2>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                    Sign in to access the harvest tracking system
                  </p>
                </div>

                {/* Mobile-only features */}
                <div className="lg:hidden w-full space-y-2 text-center">
                  <p className="text-xs text-muted-foreground">
                    Track harvests · Manage teams · View reports
                  </p>
                </div>

                {error && (
                  <div className="w-full p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center">
                    {error}
                  </div>
                )}

                <div className="w-full space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      autoFocus
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full shadow-lg hover:shadow-xl transition-all text-base font-medium gap-2"
                  disabled={isLoading || !email.trim() || !password}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      <LogIn className="h-4 w-4" />
                      Sign In
                    </>
                  )}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  Don't have an account? Contact your administrator.
                </p>
              </form>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-4 text-xs text-muted-foreground">
        Patrioti Mushrooms &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
