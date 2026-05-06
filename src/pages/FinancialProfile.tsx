import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { motion } from "framer-motion";
import { ArrowRight, ArrowLeft, Wallet, CheckCircle2, Info } from "lucide-react";
import { formatCurrency } from "@/lib/format";

function TooltipLabel({ label, tip }: { label: string; tip: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Label>{label}</Label>
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

export default function FinancialProfile() {
  useAuth({ redirectOnUnauthenticated: true });
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const [step, setStep] = useState(1);

  const [formData, setFormData] = useState({
    monthlyIncome: "",
    monthlyExpenses: "",
    emergencyFund: "",
    totalAssets: "",
    totalLiabilities: "",
    equityInvestments: "",
    debtInvestments: "",
    realEstate: "",
    gold: "",
    otherAssets: "",
    inflationScenario: "moderate" as const,
    planningHorizon: "30",
  });

  const liveNetWorth = useMemo(() => {
    const assets = Number(formData.totalAssets) || 0;
    const liabilities = Number(formData.totalLiabilities) || 0;
    return assets - liabilities;
  }, [formData.totalAssets, formData.totalLiabilities]);

  const liveMonthlySavings = useMemo(() => {
    const income = Number(formData.monthlyIncome) || 0;
    const expenses = Number(formData.monthlyExpenses) || 0;
    return income - expenses;
  }, [formData.monthlyIncome, formData.monthlyExpenses]);

  const createFinancialProfile = trpc.profile.createFinancialProfile.useMutation({
    onSuccess: () => {
      utils.profile.getFinancialProfile.invalidate();
      if (step === 1) {
        setStep(2);
      }
    },
  });

  const handleSubmit = () => {
    createFinancialProfile.mutate({
      monthlyIncome: Number(formData.monthlyIncome),
      monthlyExpenses: Number(formData.monthlyExpenses),
      emergencyFund: Number(formData.emergencyFund) || 0,
      totalAssets: Number(formData.totalAssets) || 0,
      totalLiabilities: Number(formData.totalLiabilities) || 0,
      equityInvestments: Number(formData.equityInvestments) || 0,
      debtInvestments: Number(formData.debtInvestments) || 0,
      realEstate: Number(formData.realEstate) || 0,
      gold: Number(formData.gold) || 0,
      otherAssets: Number(formData.otherAssets) || 0,
      inflationScenario: formData.inflationScenario,
      planningHorizon: Number(formData.planningHorizon),
    });
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-[#1a2744] flex items-center justify-center">
                <Wallet className="w-4 h-4 text-[#d4a843]" />
              </div>
              <h1 className="text-2xl font-bold text-[#0f1a2e]">Financial Profile</h1>
            </div>
            <p className="text-muted-foreground">
              Enter your income, expenses, and assets for accurate projections
            </p>
          </div>

          <div className="flex items-center gap-2 mb-6">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={`h-2 flex-1 rounded-full transition-colors cursor-help ${step >= 1 ? "bg-[#d4a843]" : "bg-muted"}`} />
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Income & Assets</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={`h-2 flex-1 rounded-full transition-colors cursor-help ${step >= 2 ? "bg-[#d4a843]" : "bg-muted"}`} />
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Confirmation</TooltipContent>
            </Tooltip>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {step === 1 ? "Income & Assets" : "All Set!"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {step === 1 && (
                <>
                  {/* Live Summary */}
                  {(liveNetWorth !== 0 || liveMonthlySavings !== 0) && (
                    <div className="grid grid-cols-2 gap-3 p-3 bg-muted/50 rounded-xl">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="cursor-help">
                            <p className="text-xs text-muted-foreground">Live Net Worth</p>
                            <p className={`font-semibold ${liveNetWorth >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                              {formatCurrency(liveNetWorth)}
                            </p>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          <p>Total Assets minus Total Liabilities. Updates as you type.</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="cursor-help">
                            <p className="text-xs text-muted-foreground">Monthly Savings</p>
                            <p className={`font-semibold ${liveMonthlySavings >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                              {formatCurrency(liveMonthlySavings)}
                            </p>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          <p>Monthly Income minus Monthly Expenses. Positive means you are saving money.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  )}

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <TooltipLabel label="Monthly Income (₹)" tip="Total monthly income from all sources: salary, business, rental income, dividends, etc." />
                      <Input
                        id="monthlyIncome"
                        type="number"
                        placeholder="75,000"
                        value={formData.monthlyIncome}
                        onChange={(e) => setFormData({ ...formData, monthlyIncome: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <TooltipLabel label="Monthly Expenses (₹)" tip="Total monthly outflows including rent, EMI, groceries, bills, education, insurance premiums, etc." />
                      <Input
                        id="monthlyExpenses"
                        type="number"
                        placeholder="45,000"
                        value={formData.monthlyExpenses}
                        onChange={(e) => setFormData({ ...formData, monthlyExpenses: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <TooltipLabel label="Emergency Fund (₹)" tip="Cash set aside for unexpected events. Ideally 6-12 months of expenses. Kept in liquid/safe instruments." />
                      <Input
                        id="emergencyFund"
                        type="number"
                        placeholder="3,00,000"
                        value={formData.emergencyFund}
                        onChange={(e) => setFormData({ ...formData, emergencyFund: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <TooltipLabel label="Total Assets (₹)" tip="Sum of all your assets: investments, property, gold, cash, vehicles, etc." />
                      <Input
                        id="totalAssets"
                        type="number"
                        placeholder="50,00,000"
                        value={formData.totalAssets}
                        onChange={(e) => setFormData({ ...formData, totalAssets: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <TooltipLabel label="Total Liabilities (₹)" tip="All debts you owe: home loan, car loan, personal loan, credit card dues, education loan, etc." />
                      <Input
                        id="totalLiabilities"
                        type="number"
                        placeholder="20,00,000"
                        value={formData.totalLiabilities}
                        onChange={(e) => setFormData({ ...formData, totalLiabilities: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <TooltipLabel label="Equity Investments (₹)" tip="Value of stocks, equity mutual funds (SIP/Lump sum), ELSS, and index funds" />
                      <Input
                        id="equityInvestments"
                        type="number"
                        placeholder="15,00,000"
                        value={formData.equityInvestments}
                        onChange={(e) => setFormData({ ...formData, equityInvestments: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <TooltipLabel label="Debt/FD/PPF (₹)" tip="Fixed deposits, PPF, EPF, NPS, debt mutual funds, bonds, and other fixed-income instruments" />
                      <Input
                        id="debtInvestments"
                        type="number"
                        placeholder="5,00,000"
                        value={formData.debtInvestments}
                        onChange={(e) => setFormData({ ...formData, debtInvestments: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <TooltipLabel label="Real Estate (₹)" tip="Current market value of owned property excluding the portion financed by loan" />
                      <Input
                        id="realEstate"
                        type="number"
                        placeholder="30,00,000"
                        value={formData.realEstate}
                        onChange={(e) => setFormData({ ...formData, realEstate: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <TooltipLabel label="Gold (₹)" tip="Value of physical gold, gold ETFs, sovereign gold bonds, and digital gold" />
                      <Input
                        id="gold"
                        type="number"
                        placeholder="2,00,000"
                        value={formData.gold}
                        onChange={(e) => setFormData({ ...formData, gold: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <TooltipLabel label="Inflation Scenario" tip="Rate at which living costs rise annually. Moderate (6%) is the historical Indian average." />
                      <Select
                        value={formData.inflationScenario}
                        onValueChange={(v) => setFormData({ ...formData, inflationScenario: v as any })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low (4%)</SelectItem>
                          <SelectItem value="moderate">Moderate (6%)</SelectItem>
                          <SelectItem value="high">High (8%)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <TooltipLabel label="Planning Horizon (Years)" tip="How many years into the future you want projections. Retirement planning usually needs 25-30 years." />
                      <Input
                        id="planningHorizon"
                        type="number"
                        placeholder="30"
                        value={formData.planningHorizon}
                        onChange={(e) => setFormData({ ...formData, planningHorizon: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                    <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-blue-700">
                      All values are in Indian Rupees. Enter approximate values — you can always update them later from your profile page.
                    </p>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button variant="outline" onClick={() => navigate("/profile-setup")}>
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back
                    </Button>
                    <Button
                      className="flex-1 bg-[#1a2744] hover:bg-[#1a2744]/90"
                      onClick={handleSubmit}
                      disabled={createFinancialProfile.isPending || !formData.monthlyIncome || !formData.monthlyExpenses}
                    >
                      {createFinancialProfile.isPending ? "Saving..." : "Continue"}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </>
              )}

              {step === 2 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-6"
                >
                  <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                  </div>
                  <h3 className="text-xl font-semibold text-[#0f1a2e] mb-2">
                    Financial Profile Complete!
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    Now let's create your financial goals and generate projections.
                  </p>
                  <div className="flex gap-3 justify-center">
                    <Button variant="outline" onClick={() => setStep(1)}>
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back
                    </Button>
                    <Button
                      className="bg-[#1a2744] hover:bg-[#1a2744]/90"
                      onClick={() => navigate("/goals")}
                    >
                      Create Goals
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </TooltipProvider>
  );
}
