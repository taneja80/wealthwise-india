import { useState } from "react";
import { Link } from "react-router";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { ArrowRight, Wallet, Mail, LogIn, UserPlus, Eye, EyeOff, KeyRound, ArrowLeft } from "lucide-react";

const SECURITY_QUESTIONS = [
  "What is the name of your first pet?",
  "What city were you born in?",
  "What is your mother's maiden name?",
  "What was the name of your first school?",
  "What is your favourite movie?",
  "What is the name of your childhood best friend?",
];

function getOAuthUrl() {
  const kimiAuthUrl = import.meta.env.VITE_KIMI_AUTH_URL;
  const appID = import.meta.env.VITE_APP_ID;
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = crypto.randomUUID();
  document.cookie = `oauth_state=${state}; path=/; max-age=600; SameSite=Lax`;
  document.cookie = `oauth_redirect_uri=${encodeURIComponent(redirectUri)}; path=/; max-age=600; SameSite=Lax`;
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
  const [securityQuestion, setSecurityQuestion] = useState(SECURITY_QUESTIONS[0]);
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  // Forgot password state
  const [forgotMode, setForgotMode] = useState<"idle" | "email" | "answer" | "done">("idle");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotQuestion, setForgotQuestion] = useState("");
  const [forgotAnswer, setForgotAnswer] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [forgotError, setForgotError] = useState("");

  const loginMutation = trpc.localAuth.login.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        window.location.href = "/dashboard";
      } else {
        setError(data.error ?? "Login failed");
      }
    },
    onError: (err) => setError(err.message),
  });

  const registerMutation = trpc.localAuth.register.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        window.location.href = "/dashboard";
      } else {
        setError(data.error ?? "Registration failed");
      }
    },
    onError: (err) => setError(err.message),
  });

  const getQuestionMutation = trpc.localAuth.getSecurityQuestion.useMutation({
    onSuccess: (data) => {
      if (data.success && data.securityQuestion) {
        setForgotQuestion(data.securityQuestion);
        setForgotMode("answer");
        setForgotError("");
      } else {
        setForgotError(data.error ?? "Account not found");
      }
    },
    onError: (err) => setForgotError(err.message),
  });

  const resetMutation = trpc.localAuth.resetPassword.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        setForgotMode("done");
        setForgotError("");
      } else {
        setForgotError(data.error ?? "Reset failed");
      }
    },
    onError: (err) => setForgotError(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (mode === "login") {
      loginMutation.mutate({ email, password });
    } else {
      if (password.length < 8) {
        setError("Password must be at least 8 characters");
        return;
      }
      if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
        setError("Password must include uppercase, lowercase, a digit, and a special character");
        return;
      }
      if (!securityAnswer.trim()) {
        setError("Please provide a security answer for password recovery");
        return;
      }
      registerMutation.mutate({ email, password, name: name || undefined, securityQuestion, securityAnswer });
    }
  };

  const isPending = loginMutation.isPending || registerMutation.isPending;
  const kimiEnabled = Boolean(import.meta.env.VITE_KIMI_AUTH_URL && import.meta.env.VITE_APP_ID);

  const exitForgotMode = () => {
    setForgotMode("idle");
    setForgotEmail("");
    setForgotQuestion("");
    setForgotAnswer("");
    setNewPassword("");
    setForgotError("");
  };

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
              {forgotMode !== "idle" ? (
                <KeyRound className="w-7 h-7 text-[#d4a843]" />
              ) : (
                <Wallet className="w-7 h-7 text-[#d4a843]" />
              )}
            </div>
            <CardTitle className="text-xl text-[#0f1a2e]">
              {forgotMode !== "idle" ? "Reset Password" : "Welcome to WealthWise"}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {forgotMode === "email" && "Enter your email to find your account"}
              {forgotMode === "answer" && "Answer your security question"}
              {forgotMode === "done" && "Your password has been reset!"}
              {forgotMode === "idle" && "Sign in to access your financial planning dashboard"}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* ---- Forgot Password Flow ---- */}
            {forgotMode === "email" && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                  />
                </div>
                {forgotError && <p className="text-xs text-red-500 bg-red-50 p-2 rounded-lg">{forgotError}</p>}
                <Button
                  className="w-full bg-[#1a2744] hover:bg-[#1a2744]/90"
                  disabled={getQuestionMutation.isPending || !forgotEmail}
                  onClick={() => getQuestionMutation.mutate({ email: forgotEmail })}
                >
                  {getQuestionMutation.isPending ? "Looking up..." : "Continue"}
                </Button>
                <button onClick={exitForgotMode} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mx-auto">
                  <ArrowLeft className="w-3 h-3" /> Back to Sign In
                </button>
              </div>
            )}

            {forgotMode === "answer" && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Security Question</Label>
                  <p className="text-sm font-medium text-[#0f1a2e] bg-slate-50 p-3 rounded-lg">{forgotQuestion}</p>
                </div>
                <div className="space-y-2">
                  <Label>Your Answer</Label>
                  <Input
                    placeholder="Type your answer"
                    value={forgotAnswer}
                    onChange={(e) => setForgotAnswer(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>New Password</Label>
                  <Input
                    type="password"
                    placeholder="Min 8 chars, A-z, 0-9, special"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                {forgotError && <p className="text-xs text-red-500 bg-red-50 p-2 rounded-lg">{forgotError}</p>}
                <Button
                  className="w-full bg-[#1a2744] hover:bg-[#1a2744]/90"
                  disabled={resetMutation.isPending || !forgotAnswer || !newPassword}
                  onClick={() => resetMutation.mutate({ email: forgotEmail, securityAnswer: forgotAnswer, newPassword })}
                >
                  {resetMutation.isPending ? "Resetting..." : "Reset Password"}
                </Button>
                <button onClick={exitForgotMode} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mx-auto">
                  <ArrowLeft className="w-3 h-3" /> Back to Sign In
                </button>
              </div>
            )}

            {forgotMode === "done" && (
              <div className="space-y-3 text-center">
                <p className="text-sm text-emerald-600 font-medium">Password reset successfully!</p>
                <Button className="w-full bg-[#1a2744] hover:bg-[#1a2744]/90" onClick={exitForgotMode}>
                  Sign In with New Password
                </Button>
              </div>
            )}

            {/* ---- Normal Login / Register Flow ---- */}
            {forgotMode === "idle" && (
              <>
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
                        <div className="flex items-center justify-between">
                          <Label htmlFor="login-password">Password</Label>
                          <button
                            type="button"
                            onClick={() => setForgotMode("email")}
                            className="text-xs text-[#d4a843] hover:text-[#b8923d] font-medium"
                          >
                            Forgot password?
                          </button>
                        </div>
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
                            placeholder="Min 8 chars, A-z, 0-9, special"
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
                      <div className="space-y-2">
                        <Label htmlFor="reg-security-q">Security Question</Label>
                        <select
                          id="reg-security-q"
                          value={securityQuestion}
                          onChange={(e) => setSecurityQuestion(e.target.value)}
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                          {SECURITY_QUESTIONS.map((q) => (
                            <option key={q} value={q}>{q}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reg-security-a">Security Answer</Label>
                        <Input
                          id="reg-security-a"
                          placeholder="Your answer (used for password recovery)"
                          value={securityAnswer}
                          onChange={(e) => setSecurityAnswer(e.target.value)}
                          required
                        />
                      </div>
                      {error && <p className="text-xs text-red-500 bg-red-50 p-2 rounded-lg">{error}</p>}
                      <Button type="submit" disabled={isPending} className="w-full bg-[#1a2744] hover:bg-[#1a2744]/90">
                        {isPending ? "Creating account..." : "Create Account"}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>

                {kimiEnabled && (
                  <>
                    <div className="relative my-4">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-border/50" />
                      </div>
                      <div className="relative flex justify-center text-xs">
                        <span className="bg-white px-3 text-muted-foreground">or continue with</span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full h-11 border-[#1a2744]/20 hover:bg-[#1a2744]/5"
                      onClick={() => { window.location.href = getOAuthUrl(); }}
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Kimi OAuth Sign In
                    </Button>
                  </>
                )}

                <p className="text-xs text-muted-foreground text-center">
                  By signing in, you agree to our Terms of Service and Privacy Policy.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
