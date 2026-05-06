import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import {
  Shield,
  TrendingUp,
  AlertCircle,
  HeartPulse,
  Clock,
  Target,
  ArrowRight,
  Info,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { formatCurrency, formatCompact } from "@/lib/format";

function TooltipLabel({ label, tip }: { label: string; tip: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Label className="text-sm">{label}</Label>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="w-3 h-3 text-muted-foreground/50 cursor-help" />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs">
          <p>{tip}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;
  return (
    <div className="bg-white p-3 rounded-lg shadow-lg border border-border/50 text-sm">
      <p className="font-medium mb-1">Year {label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium">{formatCurrency(entry.value)}</span>
        </p>
      ))}
    </div>
  );
};

export default function RetirementPage() {
  useAuth({ redirectOnUnauthenticated: true });
  const utils = trpc.useUtils();
  const { data: model } = trpc.retirement.getModel.useQuery();
  const { data: calculation } = trpc.retirement.calculate.useQuery();
  const { data: fProfile } = trpc.profile.getFinancialProfile.useQuery();
  const { data: uProfile } = trpc.profile.getUserProfile.useQuery();

  const [form, setForm] = useState({
    retirementAge: model?.retirementAge ?? 60,
    currentMonthlyExpense: Number(model?.currentMonthlyExpense ?? fProfile?.monthlyExpenses ?? 0),
    postRetirementExpensePercent: model?.postRetirementExpensePercent ?? 70,
    healthcareInflation: Number(model?.healthcareInflation ?? 10),
    lifestyleInflation: Number(model?.lifestyleInflation ?? 6),
    lifeExpectancy: model?.lifeExpectancy ?? 85,
    monthlyPension: Number(model?.monthlyPension ?? 0),
    rentalIncomePostRetirement: Number(model?.rentalIncomePostRetirement ?? 0),
  });

  useEffect(() => {
    if (model && fProfile) {
      setForm({
        retirementAge: model.retirementAge ?? 60,
        currentMonthlyExpense: Number(model.currentMonthlyExpense ?? fProfile.monthlyExpenses ?? 0),
        postRetirementExpensePercent: model.postRetirementExpensePercent ?? 70,
        healthcareInflation: Number(model.healthcareInflation ?? 10),
        lifestyleInflation: Number(model.lifestyleInflation ?? 6),
        lifeExpectancy: model.lifeExpectancy ?? 85,
        monthlyPension: Number(model.monthlyPension ?? 0),
        rentalIncomePostRetirement: Number(model.rentalIncomePostRetirement ?? 0),
      });
    }
  }, [model, fProfile]);

  const saveModel = trpc.retirement.saveModel.useMutation({
    onSuccess: () => {
      utils.retirement.getModel.invalidate();
      utils.retirement.calculate.invalidate();
    },
  });

  const handleSave = () => {
    saveModel.mutate(form);
  };

  const summary = calculation?.summary;
  const preRetirement = calculation?.preRetirement ?? [];
  const postRetirement = calculation?.postRetirement ?? [];
  const age = uProfile?.age ?? 30;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="max-w-6xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-[#1a2744] flex items-center justify-center">
              <Shield className="w-4 h-4 text-[#d4a843]" />
            </div>
            <h1 className="text-2xl font-bold text-[#0f1a2e]">Retirement Planning</h1>
          </div>
          <p className="text-muted-foreground">Model post-retirement expenses with healthcare inflation and income sources</p>
        </motion.div>

        {/* Summary Cards */}
        {summary && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Card className="cursor-help border-[#d4a843]/20 bg-[#d4a843]/5">
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">Corpus Needed</p>
                      <p className="text-xl font-bold text-[#d4a843]">{formatCompact(summary.corpusNeeded)}</p>
                      <p className="text-xs text-muted-foreground">at age {summary.retirementAge}</p>
                    </CardContent>
                  </Card>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  <p>Total corpus needed using 3.5% safe withdrawal rule</p>
                  <p>Full value: {formatCurrency(summary.corpusNeeded)}</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Card className="cursor-help">
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">Current Assets</p>
                      <p className="text-xl font-bold text-[#0f1a2e]">{formatCompact(summary.currentAssets)}</p>
                    </CardContent>
                  </Card>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">Your current total assets</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Card className="cursor-help">
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">Gap to Fill</p>
                      <p className={`text-xl font-bold ${summary.corpusGap > 0 ? "text-red-500" : "text-emerald-600"}`}>
                        {formatCompact(summary.corpusGap)}
                      </p>
                    </CardContent>
                  </Card>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {summary.corpusGap > 0 ? "Additional savings needed" : "You have surplus!"}
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Card className="cursor-help">
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">Monthly SIP Needed</p>
                      <p className="text-xl font-bold text-blue-600">{formatCurrency(summary.monthlySavingsNeeded)}</p>
                    </CardContent>
                  </Card>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Monthly investment needed at 10% return to bridge the gap
                </TooltipContent>
              </Tooltip>
            </div>
          </motion.div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Configuration Form */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-1">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#d4a843]" />
                  Retirement Parameters
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <TooltipLabel label="Current Age" tip="Your current age from profile" />
                    <Input value={age} disabled className="bg-muted/50" />
                  </div>
                  <div className="space-y-1">
                    <TooltipLabel label="Retire At" tip="Age when you plan to retire. Determines accumulation period." />
                    <Input type="number" value={form.retirementAge} onChange={(e) => setForm({ ...form, retirementAge: Number(e.target.value) })} />
                  </div>
                </div>
                <div className="space-y-1">
                  <TooltipLabel label="Monthly Expenses (₹)" tip="Current monthly expenses. Post-retirement expenses are a percentage of this." />
                  <Input type="number" value={form.currentMonthlyExpense} onChange={(e) => setForm({ ...form, currentMonthlyExpense: Number(e.target.value) })} />
                </div>
                <div className="space-y-1">
                  <TooltipLabel label="Post-Retirement Expense %" tip="Expenses typically reduce to 60-80% after retirement. Healthcare costs may offset some savings." />
                  <Input type="number" value={form.postRetirementExpensePercent} onChange={(e) => setForm({ ...form, postRetirementExpensePercent: Number(e.target.value) })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <TooltipLabel label="Healthcare Inflation %" tip="Medical costs in India rise 10-12% annually, much faster than general inflation." />
                    <Input type="number" value={form.healthcareInflation} onChange={(e) => setForm({ ...form, healthcareInflation: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-1">
                    <TooltipLabel label="Lifestyle Inflation %" tip="General cost of living increase. Historical average in India is ~6%." />
                    <Input type="number" value={form.lifestyleInflation} onChange={(e) => setForm({ ...form, lifestyleInflation: Number(e.target.value) })} />
                  </div>
                </div>
                <div className="space-y-1">
                  <TooltipLabel label="Life Expectancy" tip="How long you expect to live. Plan for 85-90 to be safe." />
                  <Input type="number" value={form.lifeExpectancy} onChange={(e) => setForm({ ...form, lifeExpectancy: Number(e.target.value) })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <TooltipLabel label="Monthly Pension (₹)" tip="Expected pension, annuity, or other regular post-retirement income." />
                    <Input type="number" value={form.monthlyPension} onChange={(e) => setForm({ ...form, monthlyPension: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-1">
                    <TooltipLabel label="Rental Income (₹)" tip="Expected monthly rental income post-retirement from property." />
                    <Input type="number" value={form.rentalIncomePostRetirement} onChange={(e) => setForm({ ...form, rentalIncomePostRetirement: Number(e.target.value) })} />
                  </div>
                </div>
                <Button onClick={handleSave} disabled={saveModel.isPending} className="w-full bg-[#1a2744] hover:bg-[#1a2744]/90">
                  {saveModel.isPending ? "Calculating..." : "Update & Calculate"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>

            {summary && (
              <Card className="mt-4">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <HeartPulse className="w-4 h-4 text-red-500" />
                    Key Insights
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Years to Retirement</p>
                    <p className="font-semibold">{summary.yearsToRetirement} years</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Years in Retirement</p>
                    <p className="font-semibold">{summary.yearsInRetirement} years</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Safe Withdrawal Rate</p>
                    <p className="font-semibold">{summary.safeWithdrawalRate}%</p>
                    <p className="text-xs text-muted-foreground">Adjusted for Indian inflation</p>
                  </div>
                  {summary.monthlyPension > 0 && (
                    <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                      <p className="text-xs text-emerald-600">Monthly Income Sources</p>
                      <p className="font-semibold text-emerald-700">{formatCurrency(summary.monthlyPension + summary.monthlyRentalIncome)}</p>
                      <p className="text-xs text-emerald-600">Reduces corpus needed</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </motion.div>

          {/* Charts */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="lg:col-span-2 space-y-4">
            <Tabs defaultValue="pre">
              <TabsList>
                <TabsTrigger value="pre">Pre-Retirement</TabsTrigger>
                <TabsTrigger value="post">Post-Retirement</TabsTrigger>
              </TabsList>

              <TabsContent value="pre" className="mt-4">
                {preRetirement.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-[#d4a843]" />
                        Expense Growth Until Retirement
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={preRetirement}>
                            <defs>
                              <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="year" stroke="#94a3b8" fontSize={12} />
                            <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => formatCompact(v)} />
                            <ReTooltip content={<CustomTooltip />} />
                            <Legend />
                            <Area type="monotone" dataKey="annualIncome" name="Annual Income" stroke="#10b981" strokeWidth={2} fill="transparent" />
                            <Area type="monotone" dataKey="annualExpense" name="Annual Expenses" stroke="#ef4444" strokeWidth={2} fill="url(#expenseGrad)" />
                            <Area type="monotone" dataKey="annualSavings" name="Annual Savings" stroke="#3b82f6" strokeWidth={2} fill="transparent" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="post" className="mt-4">
                {postRetirement.length > 0 && (
                  <>
                    <Card className="mb-4">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-red-500" />
                          Post-Retirement Monthly Expenses
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-72">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={postRetirement}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                              <XAxis dataKey="year" stroke="#94a3b8" fontSize={12} />
                              <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => formatCompact(v)} />
                              <ReTooltip content={<CustomTooltip />} />
                              <Legend />
                              <Line type="monotone" dataKey="monthlyExpense" name="Monthly Expense" stroke="#ef4444" strokeWidth={2} dot={false} />
                              <Line type="monotone" dataKey="monthlyPension" name="Pension" stroke="#10b981" strokeWidth={2} dot={false} />
                              <Line type="monotone" dataKey="monthlyRental" name="Rental Income" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Target className="w-4 h-4 text-[#d4a843]" />
                          Corpus Required by Year
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-72">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={postRetirement}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                              <XAxis dataKey="year" stroke="#94a3b8" fontSize={12} />
                              <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => formatCompact(v)} />
                              <ReTooltip content={<CustomTooltip />} />
                              <Bar dataKey="annualShortfall" name="Annual Shortfall" fill="#ef4444" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>
      </div>
    </TooltipProvider>
  );
}
