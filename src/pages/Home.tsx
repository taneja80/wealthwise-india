import { Link } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Target,
  TrendingUp,
  Shield,
  PieChart,
  MessageSquare,
  ChevronRight,
  Star,
  CheckCircle2,
  IndianRupee,
} from "lucide-react";

const features = [
  {
    icon: Target,
    title: "Goal-Based Planning",
    description: "Set realistic financial goals from retirement to education, with timeline-based projections.",
  },
  {
    icon: TrendingUp,
    title: "Cash Flow Analysis",
    description: "Visualize your income, expenses, savings, and net worth growth across decades.",
  },
  {
    icon: Shield,
    title: "Risk Assessment",
    description: "Tailored asset allocation across equity, debt, gold, and real estate based on your horizon.",
  },
  {
    icon: PieChart,
    title: "Inflation Scenarios",
    description: "Plan for low, moderate, and high inflation scenarios to stress-test your financial future.",
  },
  {
    icon: MessageSquare,
    title: "AI Financial Advisor",
    description: "Get personalized investment advice and answers to your financial questions instantly.",
  },
  {
    icon: IndianRupee,
    title: "India-Specific Insights",
    description: "Tax planning, PPF, NPS, SIP strategies, and other instruments tailored for Indian investors.",
  },
];

const steps = [
  {
    number: "01",
    title: "Create Your Profile",
    description: "Enter your age, income, expenses, assets, and liabilities to build your financial baseline.",
  },
  {
    number: "02",
    title: "Define Your Goals",
    description: "Set realistic targets for retirement, home purchase, education, travel, and more.",
  },
  {
    number: "03",
    title: "Generate Projections",
    description: "See your 30-year cash flow statement with inflation-adjusted income and expenses.",
  },
  {
    number: "04",
    title: "Optimize Allocation",
    description: "Get personalized asset allocation recommendations to meet each goal on time.",
  },
];

export default function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-[#f8f9fc]">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/hero-bg.jpg"
            alt=""
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0f1a2e]/80 via-[#0f1a2e]/60 to-[#f8f9fc]" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 pt-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#d4a843]/10 border border-[#d4a843]/20 text-[#d4a843] text-sm font-medium mb-6">
                <Star className="w-4 h-4" />
                Abhi's Personal Financial Planner
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
                Plan Your Wealth,
                <br />
                <span className="text-[#d4a843]">Secure Your Future</span>
              </h1>
              <p className="text-lg text-slate-300 mb-8 max-w-xl leading-relaxed">
                Comprehensive financial planning for Indian households. Set goals, project cash flows,
                optimize investments, and get AI-powered advice — all in one platform.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to={isAuthenticated ? "/dashboard" : "/login"}>
                  <Button
                    size="lg"
                    className="bg-[#d4a843] hover:bg-[#b8923d] text-[#0f1a2e] font-semibold px-8"
                  >
                    Start Planning
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
                <a href="#features">
                  <Button
                    variant="outline"
                    size="lg"
                    className="border-[#d4a843]/60 text-[#d4a843] hover:bg-[#d4a843]/10 hover:border-[#d4a843] px-8 font-semibold"
                  >
                    Explore Features
                  </Button>
                </a>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="hidden lg:block"
            >
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-r from-[#d4a843]/20 to-[#1a2744]/20 rounded-3xl blur-2xl" />
                <div className="relative bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-white font-medium">Financial Overview</span>
                    <span className="text-[#d4a843] text-sm">This Year</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 rounded-xl p-4">
                      <p className="text-slate-400 text-xs mb-1">Net Worth</p>
                      <p className="text-white text-xl font-bold">₹1.2 Cr</p>
                      <p className="text-emerald-400 text-xs mt-1">+12.5%</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4">
                      <p className="text-slate-400 text-xs mb-1">Monthly Savings</p>
                      <p className="text-white text-xl font-bold">₹45,000</p>
                      <p className="text-emerald-400 text-xs mt-1">+8.2%</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4">
                      <p className="text-slate-400 text-xs mb-1">Goals on Track</p>
                      <p className="text-white text-xl font-bold">4/5</p>
                      <p className="text-[#d4a843] text-xs mt-1">80%</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4">
                      <p className="text-slate-400 text-xs mb-1">Investments</p>
                      <p className="text-white text-xl font-bold">₹38L</p>
                      <p className="text-emerald-400 text-xs mt-1">+15.3%</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-[#0f1a2e] mb-4">
              Everything You Need to Build Wealth
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From goal setting to investment allocation, our platform covers every aspect of personal financial planning.
            </p>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="group bg-white rounded-2xl p-6 border border-border/50 hover:border-[#d4a843]/30 hover:shadow-lg hover:shadow-[#d4a843]/5 transition-all duration-300"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1a2744] to-[#2a3a5c] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Icon className="w-5 h-5 text-[#d4a843]" />
                  </div>
                  <h3 className="text-lg font-semibold text-[#0f1a2e] mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 lg:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-[#0f1a2e] mb-4">
              Your Financial Journey in 4 Steps
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              A simple, guided process to create a comprehensive financial plan tailored to your life.
            </p>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, i) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="relative"
              >
                <div className="bg-[#f8f9fc] rounded-2xl p-6 h-full">
                  <span className="text-4xl font-bold text-[#d4a843]/30">
                    {step.number}
                  </span>
                  <h3 className="text-lg font-semibold text-[#0f1a2e] mt-3 mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-3 transform -translate-y-1/2">
                    <ChevronRight className="w-5 h-5 text-[#d4a843]" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0f1a2e] to-[#1a2744] p-8 sm:p-12 lg:p-16"
          >
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#d4a843]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="relative z-10 max-w-2xl">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Ready to Take Control of Your Finances?
              </h2>
              <p className="text-lg text-slate-300 mb-8">
                Build your personalized financial roadmap with comprehensive tools for goal planning, cash flow projections, and investment optimization.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to={isAuthenticated ? "/dashboard" : "/login"}>
                  <Button
                    size="lg"
                    className="bg-[#d4a843] hover:bg-[#b8923d] text-[#0f1a2e] font-semibold px-8"
                  >
                    Get Started Free
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
              </div>
              <div className="flex items-center gap-2 mt-6 text-sm text-slate-400">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>No credit card required</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400 ml-4" />
                <span>Free forever plan</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0f1a2e] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#d4a843] to-[#b8923d] flex items-center justify-center">
                <IndianRupee className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-white">WealthWise India</span>
            </div>
            <p className="text-sm text-slate-400">
              Disclaimer: This platform provides financial planning tools for educational purposes. Please consult a SEBI-registered investment advisor before making investment decisions.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
