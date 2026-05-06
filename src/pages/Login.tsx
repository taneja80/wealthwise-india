import { useState } from "react";
import { Link } from "react-router";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { ArrowRight, Wallet, Mail, LogIn, UserPlus, Eye, EyeOff } from "lucide-react";

function getOAuthUrl() {
  const kimiAuthUrl = import.meta.env.VITE_KIMI_AUTH_URL;
  const appID = import.meta.env.VITE_APP_ID;
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri);

  const url = new URL(`${kimiAuthUrl}/api/oauth/authorize`);
  url.searchParams.set("client_id", appID);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "profile");
  url.searchParams.set("state", state);

  return url.toString();
}

export default function Login() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const loginMutation = trpc.localAuth.login.useMutation({
    onSuccess: (data) => {
      if (data.success && data.token) {
        localStorage.setItem("local_auth_token", data.token);
        window.location.href = "/dashboard";
      } else {
        setError(data.error ?? "Login failed");
      }
    },
    onError: (err) => setError(err.message),
  });

  const registerMutation = trpc.localAuth.register.useMutation({
    onSuccess: (data) => {
      if (data.success && data.token) {
        localStorage.setItem("local_auth_token", data.token);
        window.location.href = "/dashboard";
      } else {
        setError(data.error ?? "Registration failed");
      }
    },
    onError: (err) => setError(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (mode === "login") {
      loginMutation.mutate({ email, password });
    } else {
      if (password.length < 6) {
        setError("Password must be at least 6 characters");
        return;
      }
      registerMutation.mutate({ email, password, name: name || undefined });
    }
  };

  const isPending = loginMutation.isPending || registerMutation.isPending;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f1a2e] via-[#1a2744] to-[#0f1a2e] relative overflow-hidden">
      <div className="absolute top-0 left-0 w-96 h-96 bg-[#d4a843]/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#d4a843]/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md px-4"
      >
        <Link to="/" className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-8 transition-colors text-sm">
          <ArrowRight className="w-4 h-4 rotate-180" />
          Back to Home
        </Link>

        <Card className="border-white/10 bg-white/95 backdrop-blur-xl shadow-2xl">
          <CardHeader className="text-center pb-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#1a2744] to-[#2a3a5c] flex items-center justify-center mx-auto mb-4">
              <Wallet className="w-7 h-7 text-[#d4a843]" />
            </div>
            <CardTitle className="text-xl text-[#0f1a2e]">Welcome to WealthWise</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Sign in to access your financial planning dashboard
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Email/Password Form */}
            <Tabs value={mode} onValueChange={(v) => { setMode(v as "login" | "register"); setError(""); }}>
              <TabsList className="w-full">
                <TabsTrigger value="login" className="flex-1 gap-1">
                  <LogIn className="w-3.5 h-3.5" /> Sign In
                </TabsTrigger>
                <TabsTrigger value="register" className="flex-1 gap-1">
                  <UserPlus className="w-3.5 h-3.5" /> Get Started
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleSubmit} className="space-y-3 mt-3">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  {error && <p className="text-xs text-red-500 bg-red-50 p-2 rounded-lg">{error}</p>}
                  <Button type="submit" disabled={isPending} className="w-full bg-[#1a2744] hover:bg-[#1a2744]/90">
                    {isPending ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleSubmit} className="space-y-3 mt-3">
                  <div className="space-y-2">
                    <Label htmlFor="reg-name">Name (Optional)</Label>
                    <Input
                      id="reg-name"
                      placeholder="Your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-email">Email</Label>
                    <Input
                      id="reg-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="reg-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Min 6 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  {error && <p className="text-xs text-red-500 bg-red-50 p-2 rounded-lg">{error}</p>}
                  <Button type="submit" disabled={isPending} className="w-full bg-[#1a2744] hover:bg-[#1a2744]/90">
                    {isPending ? "Creating account..." : "Create Account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            {/* Divider */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/50" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-3 text-muted-foreground">or continue with</span>
              </div>
            </div>

            {/* OAuth Button */}
            <Button
              variant="outline"
              className="w-full h-11 border-[#1a2744]/20 hover:bg-[#1a2744]/5"
              onClick={() => { window.location.href = getOAuthUrl(); }}
            >
              <Mail className="w-4 h-4 mr-2" />
              Kimi OAuth Sign In
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              By signing in, you agree to our Terms of Service and Privacy Policy.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
