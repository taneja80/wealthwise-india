import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Link } from "react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import {
  Target,
  TrendingUp,
  Wallet,
  PieChart,
  ArrowRight,
  AlertCircle,
  IndianRupee,
  Percent,
  Clock,
  Info,
  Calculator,
  Landmark,
  Shield,
  Download,
  Trash2,
} from "lucide-react";
import { formatCurrency, formatCompact, formatPercent } from "@/lib/format";

export default function Dashboard() {
  const { user, isLoading: authLoading, logout } = useAuth({ redirectOnUnauthenticated: true });
  const { data: userProfile } = trpc.profile.getUserProfile.useQuery(undefined, { enabled: !!user });
  const { data: financialProfile } = trpc.profile.getFinancialProfile.useQuery(undefined, { enabled: !!user });
  const { data: goals } = trpc.goals.list.useQuery(undefined, { enabled: !!user });

  const [deleteConfirm, setDeleteConfirm] = useState("");

  const exportMutation = trpc.export.allData.useQuery(undefined, {
    enabled: false, // only fetch on demand
  });

  const deleteAccountMutation = trpc.account.deleteAccount.useMutation({
    onSuccess: () => {
      window.location.href = "/";
    },
  });

  const handleExport = async () => {
    const result = await exportMutation.refetch();
    if (result.data) {
      const blob = new Blob([result.data.csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = result.data.filename;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-4 border-[#d4a843] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const totalGoals = goals?.length ?? 0;
  const totalTarget = goals?.reduce((sum, g) => sum + Number(g.targetAmount), 0) ?? 0;
  const monthlyIncome = Number(financialProfile?.monthlyIncome ?? 0);
  const monthlyExpenses = Number(financialProfile?.monthlyExpenses ?? 0);
  const netWorth = Number(financialProfile?.totalAssets ?? 0) - Number(financialProfile?.totalLiabilities ?? 0);
  const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100 : 0;
  const hasProfile = !!userProfile && !!financialProfile;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="max-w-6xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-[#0f1a2e]">
            Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
          </h1>
          <p className="text-muted-foreground mt-1">
            Here&apos;s your financial overview at a glance
          </p>
        </motion.div>

        {!hasProfile && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="border-[#d4a843]/30 bg-gradient-to-r from-[#d4a843]/5 to-transparent">
              <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-[#d4a843]/10 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-[#d4a843]" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-[#0f1a2e]">Complete Your Profile</h3>
                  <p className="text-sm text-muted-foreground">
                    Set up your financial profile to unlock personalized cash flow projections and investment recommendations.
                  </p>
                </div>
                <Link to="/profile-setup">
                  <Button className="bg-[#1a2744] hover:bg-[#1a2744]/90 whitespace-nowrap">
                    Get Started
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Stats Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { title: "Net Worth", value: formatCompact(netWorth), fullValue: formatCurrency(netWorth), icon: Wallet, color: "text-emerald-600", bg: "bg-emerald-50", tooltip: "Total assets minus total liabilities. This is your true financial position." },
            { title: "Monthly Income", value: formatCurrency(monthlyIncome), icon: IndianRupee, color: "text-[#d4a843]", bg: "bg-[#d4a843]/10", tooltip: "Your total monthly income from all sources including salary, business, rent, etc." },
            { title: "Savings Rate", value: formatPercent(savingsRate), icon: Percent, color: "text-blue-600", bg: "bg-blue-50", tooltip: "Percentage of income left after expenses. Aim for at least 20-30% for healthy financial growth." },
            { title: "Active Goals", value: `${totalGoals}`, icon: Target, color: "text-purple-600", bg: "bg-purple-50", tooltip: "Number of financial goals you are actively tracking and saving towards." },
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div key={stat.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Card className="cursor-help">
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-3">
                          <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center`}>
                            <Icon className={`w-4 h-4 ${stat.color}`} />
                          </div>
                          <Info className="w-3 h-3 text-muted-foreground/40" />
                        </div>
                        <p className="text-2xl font-bold text-[#0f1a2e]">{stat.value}</p>
                        <p className="text-sm text-muted-foreground mt-1">{stat.title}</p>
                      </CardContent>
                    </Card>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs text-xs">
                    <p>{stat.tooltip}</p>
                    {stat.fullValue && <p className="mt-1 text-[#d4a843] font-medium">Full value: {stat.fullValue}</p>}
                  </TooltipContent>
                </Tooltip>
              </motion.div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { title: "Manage Goals", description: `${totalGoals} goals with ${formatCompact(totalTarget)} target`, icon: Target, path: "/goals", color: "from-purple-500/10 to-purple-500/5", iconColor: "text-purple-600", tooltip: "Create, edit and track progress on all your financial goals" },
            { title: "Cash Flow Projections", description: "30-year forecast with inflation scenarios", icon: TrendingUp, path: "/cash-flow", color: "from-emerald-500/10 to-emerald-500/5", iconColor: "text-emerald-600", tooltip: "See how your income, expenses, and net worth will evolve over decades" },
            { title: "Investment Allocation", description: "Asset class recommendations per goal", icon: PieChart, path: "/allocation", color: "from-[#d4a843]/10 to-[#d4a843]/5", iconColor: "text-[#d4a843]", tooltip: "Get personalized equity, debt, gold, and real estate allocation for each goal" },
            { title: "Tax Planning", description: "Optimize tax under old & new regime", icon: Calculator, path: "/tax-planning", color: "from-red-500/10 to-red-500/5", iconColor: "text-red-500", tooltip: "Compare tax under old vs new regime and find deductions to maximize savings" },
            { title: "Asset Classes", description: "Track investments by asset class", icon: Landmark, path: "/assets", color: "from-blue-500/10 to-blue-500/5", iconColor: "text-blue-500", tooltip: "Track holdings, project growth, and see CAPM-based optimal allocation" },
            { title: "Retirement Planning", description: "Post-retirement expense modeling", icon: Shield, path: "/retirement", color: "from-emerald-600/10 to-emerald-600/5", iconColor: "text-emerald-600", tooltip: "Model post-retirement expenses with healthcare inflation and corpus planning" },
          ].map((action, i) => {
            const Icon = action.icon;
            return (
              <motion.div key={action.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.1 }}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link to={action.path}>
                      <Card className={`group hover:shadow-md transition-all duration-300 bg-gradient-to-br ${action.color} border-0 cursor-pointer`}>
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between">
                            <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center">
                              <Icon className={`w-5 h-5 ${action.iconColor}`} />
                            </div>
                            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-[#d4a843] group-hover:translate-x-1 transition-all" />
                          </div>
                          <h3 className="font-semibold text-[#0f1a2e] mt-3">{action.title}</h3>
                          <p className="text-sm text-muted-foreground mt-1">{action.description}</p>
                        </CardContent>
                      </Card>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs text-xs">
                    <p>{action.tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              </motion.div>
            );
          })}
        </div>

        {/* Recent Goals */}
        {goals && goals.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <CardTitle className="text-lg cursor-help flex items-center gap-2">
                        Your Financial Goals
                        <Info className="w-3.5 h-3.5 text-muted-foreground/40" />
                      </CardTitle>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs text-xs">
                      <p>Track your progress towards each goal. The bar shows what percentage of the target amount you have saved so far.</p>
                    </TooltipContent>
                  </Tooltip>
                  <Link to="/goals">
                    <Button variant="ghost" size="sm" className="text-[#d4a843]">
                      View All
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {goals.slice(0, 4).map((goal) => {
                    const progress = Number(goal.targetAmount) > 0 ? (Number(goal.currentAmount) / Number(goal.targetAmount)) * 100 : 0;
                    return (
                      <Tooltip key={goal.id}>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-4 p-3 rounded-xl bg-muted/50 cursor-help hover:bg-muted/80 transition-colors">
                            <div className="w-10 h-10 rounded-lg bg-[#1a2744] flex items-center justify-center flex-shrink-0">
                              <Target className="w-4 h-4 text-[#d4a843]" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <p className="font-medium text-sm truncate">{goal.name}</p>
                                <span className="text-xs text-muted-foreground">{goal.timelineYears} years</span>
                              </div>
                              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-[#d4a843] to-[#b8923d] rounded-full transition-all" style={{ width: `${Math.min(progress, 100)}%` }} />
                              </div>
                              <div className="flex items-center justify-between mt-1">
                                <span className="text-xs text-muted-foreground">
                                  {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
                                </span>
                                <span className="text-xs font-medium text-[#d4a843]">{formatPercent(progress)}</span>
                              </div>
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-xs">
                          <p><span className="font-medium">Goal:</span> {goal.name}</p>
                          <p><span className="font-medium">Category:</span> {goal.category}</p>
                          <p><span className="font-medium">Saved:</span> {formatCurrency(goal.currentAmount)} of {formatCurrency(goal.targetAmount)}</p>
                          <p><span className="font-medium">Remaining:</span> {formatCurrency(Number(goal.targetAmount) - Number(goal.currentAmount))}</p>
                          <p><span className="font-medium">Monthly SIP:</span> {formatCurrency(goal.monthlyContribution)}</p>
                          <p><span className="font-medium">Expected Return:</span> {goal.expectedReturn}%</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Profile Summary */}
        {hasProfile && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
            <Card>
              <CardHeader className="pb-3">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <CardTitle className="text-lg cursor-help flex items-center gap-2">
                      Profile Summary
                      <Info className="w-3.5 h-3.5 text-muted-foreground/40" />
                    </CardTitle>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-xs">
                    <p>Key details from your profile used to generate personalized projections.</p>
                  </TooltipContent>
                </Tooltip>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { icon: Clock, label: "Age", value: `${userProfile?.age} years`, tip: "Your current age determines retirement timeline and risk capacity" },
                    { icon: Wallet, label: "Profession", value: `${userProfile?.profession}`, tip: "Profession affects income growth rate assumptions" },
                    { icon: Percent, label: "Inflation Scenario", value: `${financialProfile?.inflationScenario ?? ""}`, tip: "Low=4%, Moderate=6%, High=8% annual inflation applied to expenses" },
                    { icon: TrendingUp, label: "Planning Horizon", value: `${financialProfile?.planningHorizon} years`, tip: "Number of years for which cash flow projections are generated" },
                  ].map((item, i) => (
                    <Tooltip key={i}>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-3 cursor-help">
                          <item.icon className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">{item.label}</p>
                            <p className="font-medium capitalize">{item.value}</p>
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-xs">
                        <p>{item.tip}</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Account Management */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Account Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="outline"
                  onClick={handleExport}
                  disabled={exportMutation.isFetching}
                >
                  <Download className="w-4 h-4 mr-2" />
                  {exportMutation.isFetching ? "Exporting..." : "Export All Data (CSV)"}
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Account
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete your account and all associated data including
                        goals, projections, investments, and chat history. This action cannot be undone.
                        <br /><br />
                        Type <strong>DELETE</strong> below to confirm.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <Input
                      placeholder="Type DELETE to confirm"
                      value={deleteConfirm}
                      onChange={(e) => setDeleteConfirm(e.target.value)}
                    />
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => setDeleteConfirm("")}>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        disabled={deleteConfirm !== "DELETE" || deleteAccountMutation.isPending}
                        onClick={() => deleteAccountMutation.mutate({ confirmation: "DELETE" })}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        {deleteAccountMutation.isPending ? "Deleting..." : "Delete Permanently"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </TooltipProvider>
  );
}
