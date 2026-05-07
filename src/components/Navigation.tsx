import { Link, useLocation, useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  LayoutDashboard,
  Target,
  TrendingUp,
  PieChart,
  MessageSquare,
  User,
  Menu,
  LogOut,
  Wallet,
  ChevronRight,
  Calculator,
  Landmark,
  Shield,
  Upload,
  Banknote,
  Globe,
  BarChart3,
  GitCompareArrows,
} from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const navItems = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Goals", path: "/goals", icon: Target },
  { label: "Cash Flow", path: "/cash-flow", icon: TrendingUp },
  { label: "Asset Classes", path: "/assets", icon: Landmark },
  { label: "Import Portfolio", path: "/import", icon: Upload },
  { label: "MF Search", path: "/mf-search", icon: BarChart3 },
  { label: "Retirement", path: "/retirement", icon: Shield },
  { label: "Tax Planning", path: "/tax-planning", icon: Calculator },
  { label: "Allocation", path: "/allocation", icon: PieChart },
  { label: "SIP Calculator", path: "/sip-calculator", icon: TrendingUp },
  { label: "EMI Calculator", path: "/emi-calculator", icon: Banknote },
  { label: "What-If", path: "/what-if", icon: GitCompareArrows },
  { label: "Currency", path: "/currency", icon: Globe },
  { label: "Advisor", path: "/advisor", icon: MessageSquare },
  { label: "Profile", path: "/profile-setup", icon: User },
];

export function Navigation() {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isLanding = location.pathname === "/";

  if (isLanding) {
    return (
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-border/50"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1a2744] to-[#d4a843] flex items-center justify-center">
                <Wallet className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-xl text-[#1a2744]">WealthWise</span>
            </Link>
            <div className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Features
              </a>
              <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                How It Works
              </a>
              {isAuthenticated ? (
                <Button
                  onClick={() => navigate("/dashboard")}
                  className="bg-[#1a2744] hover:bg-[#1a2744]/90 text-white"
                >
                  Dashboard
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button
                  onClick={() => navigate("/login")}
                  className="bg-[#1a2744] hover:bg-[#1a2744]/90 text-white"
                >
                  Get Started
                </Button>
              )}
            </div>
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <div className="flex flex-col gap-4 mt-8">
                  <a href="#features" onClick={() => setMobileOpen(false)} className="text-sm font-medium px-4 py-2">
                    Features
                  </a>
                  <a href="#how-it-works" onClick={() => setMobileOpen(false)} className="text-sm font-medium px-4 py-2">
                    How It Works
                  </a>
                  <Button
                    onClick={() => {
                      setMobileOpen(false);
                      navigate(isAuthenticated ? "/dashboard" : "/login");
                    }}
                    className="mx-4 bg-[#1a2744]"
                  >
                    {isAuthenticated ? "Dashboard" : "Get Started"}
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </motion.nav>
    );
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 h-screen fixed left-0 top-0 bg-[#0f1a2e] text-white z-50">
        <div className="p-6">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#d4a843] to-[#b8923d] flex items-center justify-center">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-white">WealthWise</span>
          </Link>
        </div>

        <div className="flex-1 px-3 py-2">
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-[#d4a843]/20 text-[#d4a843]"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="p-4 border-t border-white/10">
          {isAuthenticated && user && (
            <div className="flex items-center gap-3 mb-3">
              {user.avatar && (
                <img src={user.avatar} alt="" className="w-8 h-8 rounded-full" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.name}</p>
                <p className="text-xs text-slate-400 truncate">{user.email}</p>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            className="w-full justify-start text-slate-400 hover:text-white hover:bg-white/5"
            onClick={logout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-[#0f1a2e] text-white border-b border-white/10">
        <div className="flex items-center justify-between h-14 px-4">
          <Link to="/" className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-[#d4a843]" />
            <span className="font-bold text-sm">WealthWise</span>
          </Link>
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 bg-[#0f1a2e] border-white/10">
              <div className="flex flex-col gap-1 mt-6">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                        isActive
                          ? "bg-[#d4a843]/20 text-[#d4a843]"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </Link>
                  );
                })}
                <div className="mt-4 pt-4 border-t border-white/10">
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-slate-400 hover:text-white"
                    onClick={() => {
                      setMobileOpen(false);
                      logout();
                    }}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const isLanding = location.pathname === "/";
  const isLogin = location.pathname === "/login";

  if (isLanding || isLogin) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="lg:ml-64 pt-14 lg:pt-0 min-h-screen">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="p-4 lg:p-8"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
