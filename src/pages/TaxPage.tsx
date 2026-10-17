import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { Calculator, Info, Lightbulb, TrendingDown, ArrowRight, ExternalLink } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { Link } from "react-router";

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

export default function TaxPage() {
  useAuth({ redirectOnUnauthenticated: true });
  const utils = trpc.useUtils();
  const { data: calculation } = trpc.tax.calculate.useQuery();
  const { data: profile } = trpc.tax.getProfile.useQuery();

  const [form, setForm] = useState({
    regime: "old" as "old" | "new",
    section80c: 0,
    section80dSelf: 0,
    section80dParents: 0,
    section80ccd1b: 0,
    section24b: 0,
    hraExemption: 0,
    hasNps: false,
    hasPpf: false,
    hasHealthInsurance: false,
    parentsSeniorCitizen: false,
  });

  // Populate the form once the saved profile loads (query data is undefined on first render)
  useEffect(() => {
    if (!profile) return;

    const frameId = requestAnimationFrame(() => {
      setForm((prev) => ({
        ...prev,
        regime: (profile.regime ?? "old") as "old" | "new",
        section80c: Number(profile.section80c ?? 0),
        section80dSelf: Number(profile.section80dSelf ?? 0),
        section80dParents: Number(profile.section80dParents ?? 0),
        section80ccd1b: Number(profile.section80ccd1b ?? 0),
        section24b: Number(profile.section24b ?? 0),
        hraExemption: Number(profile.hraExemption ?? 0),
        hasNps: profile.hasNps ?? false,
        hasPpf: profile.hasPpf ?? false,
        hasHealthInsurance: profile.hasHealthInsurance ?? false,
        parentsSeniorCitizen: profile.parentsSeniorCitizen ?? false,
      }));
    });

    return () => cancelAnimationFrame(frameId);
  }, [profile]);

  const saveProfile = trpc.tax.saveProfile.useMutation({
    onSuccess: () => {
      utils.tax.getProfile.invalidate();
      utils.tax.calculate.invalidate();
    },
  });

  const handleSave = () => {
    saveProfile.mutate({
      regime: form.regime,
      section80c: form.section80c,
      section80dSelf: form.section80dSelf,
      section80dParents: form.section80dParents,
      section80ccd1b: form.section80ccd1b,
      section24b: form.section24b,
      hraExemption: form.hraExemption,
      hasNps: form.hasNps,
      hasPpf: form.hasPpf,
      hasHealthInsurance: form.hasHealthInsurance,
      parentsSeniorCitizen: form.parentsSeniorCitizen,
      section80e: 0,
      section80g: 0,
      ltaClaimed: false,
      hasEpf: profile?.hasEpf ?? false,
    });
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="max-w-6xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-[#1a2744] flex items-center justify-center">
              <Calculator className="w-4 h-4 text-[#d4a843]" />
            </div>
            <h1 className="text-2xl font-bold text-[#0f1a2e]">Tax Planning</h1>
          </div>
          <p className="text-muted-foreground">
            Optimize your taxes under Indian tax regime with deductions and exemptions
          </p>
        </motion.div>

        {calculation && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Card className="cursor-help">
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">Annual Income</p>
                      <p className="text-xl font-bold text-[#0f1a2e]">{formatCurrency(calculation.annualIncome)}</p>
                    </CardContent>
                  </Card>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">Your total annual income from all sources</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Card className="cursor-help border-emerald-200 bg-emerald-50/50">
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">Best Regime Tax</p>
                      <p className="text-xl font-bold text-emerald-600">
                        {formatCurrency(calculation.recommendedRegime === "old" ? calculation.oldRegime.taxPayable : calculation.newRegime.taxPayable)}
                      </p>
                    </CardContent>
                  </Card>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">Recommended tax regime gives lowest liability</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Card className="cursor-help">
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">Effective Tax Rate</p>
                      <p className="text-xl font-bold text-[#d4a843]">
                        {calculation.recommendedRegime === "old" ? calculation.oldRegime.effectiveRate : calculation.newRegime.effectiveRate}%
                      </p>
                    </CardContent>
                  </Card>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">Tax as percentage of total income</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Card className="cursor-help border-[#d4a843]/20 bg-[#d4a843]/5">
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">Save More Tax</p>
                      <p className="text-xl font-bold text-[#d4a843]">{formatCurrency(calculation.unused80c)}</p>
                      <p className="text-xs text-muted-foreground">unused 80C limit</p>
                    </CardContent>
                  </Card>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">You can invest this much more in 80C to save additional tax</TooltipContent>
              </Tooltip>
            </div>
          </motion.div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Tax Calculator Form */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-[#d4a843]" />
                  Deductions & Exemptions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Tabs value={form.regime} onValueChange={(v) => setForm({ ...form, regime: v as "old" | "new" })}>
                  <TabsList className="w-full">
                    <TabsTrigger value="old" className="flex-1">Old Regime (with deductions)</TabsTrigger>
                    <TabsTrigger value="new" className="flex-1">New Regime (lower rates)</TabsTrigger>
                  </TabsList>
                  <TabsContent value="old" className="space-y-4 mt-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <TooltipLabel label="Section 80C (₹)" tip="ELSS, PPF, LIC, NSC, Tuition fees, Home loan principal. Max ₹1,50,000" />
                        <Input type="number" value={form.section80c} onChange={(e) => setForm({ ...form, section80c: Number(e.target.value) })} placeholder="1,50,000" />
                        <p className="text-xs text-muted-foreground">Max: {formatCurrency(150000)} · Used: {formatCurrency(form.section80c)}</p>
                      </div>
                      <div className="space-y-2">
                        <TooltipLabel label="Section 80D - Self (₹)" tip="Health insurance premium for self & family. Max ₹25,000 (₹50,000 if senior citizen)" />
                        <Input type="number" value={form.section80dSelf} onChange={(e) => setForm({ ...form, section80dSelf: Number(e.target.value) })} placeholder="25,000" />
                      </div>
                      <div className="space-y-2">
                        <TooltipLabel label="Section 80D - Parents (₹)" tip="Health insurance for parents. Max ₹25,000 (₹50,000 if senior citizen parents)" />
                        <Input type="number" value={form.section80dParents} onChange={(e) => setForm({ ...form, section80dParents: Number(e.target.value) })} placeholder="0" />
                      </div>
                      <div className="space-y-2">
                        <TooltipLabel label="Section 80CCD(1B) - NPS (₹)" tip="Additional NPS contribution. Max ₹50,000 over and above 80C" />
                        <Input type="number" value={form.section80ccd1b} onChange={(e) => setForm({ ...form, section80ccd1b: Number(e.target.value) })} placeholder="50,000" />
                      </div>
                      <div className="space-y-2">
                        <TooltipLabel label="Section 24(b) - Home Loan (₹)" tip="Interest on home loan for self-occupied property. Max ₹2,00,000" />
                        <Input type="number" value={form.section24b} onChange={(e) => setForm({ ...form, section24b: Number(e.target.value) })} placeholder="2,00,000" />
                      </div>
                      <div className="space-y-2">
                        <TooltipLabel label="HRA Exemption (₹)" tip="House Rent Allowance exemption based on salary, rent paid, and city of residence" />
                        <Input type="number" value={form.hraExemption} onChange={(e) => setForm({ ...form, hraExemption: Number(e.target.value) })} placeholder="0" />
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="new" className="mt-4">
                    <div className="p-4 bg-blue-50 rounded-xl">
                      <p className="text-sm text-blue-800">
                        Under the new tax regime, most deductions are not allowed except:
                      </p>
                      <ul className="text-sm text-blue-700 mt-2 space-y-1 list-disc list-inside">
                        <li>Standard deduction: ₹75,000</li>
                        <li>Employer NPS contribution (80CCD(2)): Up to 10% of salary</li>
                        <li>Home loan interest for rented property</li>
                      </ul>
                      <p className="text-sm text-blue-800 mt-2">
                        However, tax rates are lower. We will compare both regimes for you.
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="grid sm:grid-cols-2 gap-4 pt-2">
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild><span className="text-sm cursor-help">Have NPS?</span></TooltipTrigger>
                        <TooltipContent className="text-xs">National Pension System - additional ₹50K deduction under 80CCD(1B)</TooltipContent>
                      </Tooltip>
                    </div>
                    <Switch checked={form.hasNps} onCheckedChange={(v) => setForm({ ...form, hasNps: v })} />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild><span className="text-sm cursor-help">Health Insurance?</span></TooltipTrigger>
                        <TooltipContent className="text-xs">Required to claim Section 80D deduction</TooltipContent>
                      </Tooltip>
                    </div>
                    <Switch checked={form.hasHealthInsurance} onCheckedChange={(v) => setForm({ ...form, hasHealthInsurance: v })} />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild><span className="text-sm cursor-help">Senior Citizen Parents?</span></TooltipTrigger>
                        <TooltipContent className="text-xs">Higher 80D limit of ₹50,000 for senior citizen parents</TooltipContent>
                      </Tooltip>
                    </div>
                    <Switch checked={form.parentsSeniorCitizen} onCheckedChange={(v) => setForm({ ...form, parentsSeniorCitizen: v })} />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild><span className="text-sm cursor-help">Have PPF?</span></TooltipTrigger>
                        <TooltipContent className="text-xs">Public Provident Fund - qualifies for 80C. EEE tax status.</TooltipContent>
                      </Tooltip>
                    </div>
                    <Switch checked={form.hasPpf} onCheckedChange={(v) => setForm({ ...form, hasPpf: v })} />
                  </div>
                </div>

                <Button onClick={handleSave} disabled={saveProfile.isPending} className="w-full bg-[#1a2744] hover:bg-[#1a2744]/90">
                  {saveProfile.isPending ? "Calculating..." : "Calculate Tax"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Comparison & Suggestions */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="space-y-4">
            {calculation && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-emerald-500" />
                    Regime Comparison
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <span className="text-sm">Old Regime Tax</span>
                      <span className="font-semibold">{formatCurrency(calculation.oldRegime.taxPayable)}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <span className="text-sm">New Regime Tax</span>
                      <span className="font-semibold">{formatCurrency(calculation.newRegime.taxPayable)}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 border border-emerald-200">
                      <span className="text-sm font-medium text-emerald-700">You Save</span>
                      <span className="font-bold text-emerald-600">{formatCurrency(Math.abs(calculation.oldRegime.taxPayable - calculation.newRegime.taxPayable))}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-[#d4a843]/10 border border-[#d4a843]/20">
                      <span className="text-sm font-medium text-[#d4a843]">Recommended</span>
                      <span className="font-bold text-[#d4a843] capitalize">{calculation.recommendedRegime} Regime</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {calculation && calculation.suggestions.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-[#d4a843]" />
                    Tax Saving Tips
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {calculation.suggestions.map((s, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-[#d4a843]/5">
                      <ArrowRight className="w-3 h-3 text-[#d4a843] mt-1 flex-shrink-0" />
                      <p className="text-xs text-[#0f1a2e]">{s}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Info className="w-4 h-4 text-[#d4a843]" />
                  Tax Slabs FY 2025-26
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-xs">
                  <p className="font-medium text-sm">Old Regime:</p>
                  <div className="grid grid-cols-2 gap-1">
                    <span className="text-muted-foreground">0 – ₹2.5L</span><span>Nil</span>
                    <span className="text-muted-foreground">₹2.5L – ₹5L</span><span>5%</span>
                    <span className="text-muted-foreground">₹5L – ₹10L</span><span>20%</span>
                    <span className="text-muted-foreground">Above ₹10L</span><span>30%</span>
                  </div>
                  <p className="font-medium text-sm mt-3">New Regime (Budget 2025):</p>
                  <div className="grid grid-cols-2 gap-1">
                    <span className="text-muted-foreground">0 – ₹4L</span><span>Nil</span>
                    <span className="text-muted-foreground">₹4L – ₹8L</span><span>5%</span>
                    <span className="text-muted-foreground">₹8L – ₹12L</span><span>10%</span>
                    <span className="text-muted-foreground">₹12L – ₹16L</span><span>15%</span>
                    <span className="text-muted-foreground">₹16L – ₹20L</span><span>20%</span>
                    <span className="text-muted-foreground">₹20L – ₹24L</span><span>25%</span>
                    <span className="text-muted-foreground">Above ₹24L</span><span>30%</span>
                  </div>
                  <p className="text-muted-foreground mt-2">+ 4% Health & Education Cess on all regimes</p>
                  <p className="text-muted-foreground">New regime: no tax up to ₹12L taxable income (Section 87A rebate)</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Tax-Saving Investment Recommendations */}
        {calculation && calculation.unused80c > 0 && form.regime === "old" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card className="border-[#d4a843]/30 bg-gradient-to-r from-[#d4a843]/5 to-transparent">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-[#d4a843]" />
                  Recommended Tax-Saving Investments
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  You have {formatCurrency(calculation.unused80c)} unused 80C limit. Here&apos;s how to invest it:
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[
                    {
                      name: "ELSS Mutual Funds",
                      section: "80C",
                      returns: "10-15%",
                      lockIn: "3 years",
                      description: "Lowest lock-in among 80C options. Equity-linked, best for long-term wealth creation.",
                      action: "Search ELSS",
                      link: "/mf-search",
                      highlight: true,
                    },
                    {
                      name: "PPF (Public Provident Fund)",
                      section: "80C",
                      returns: "7.1%",
                      lockIn: "15 years",
                      description: "Tax-free returns (EEE status). Government-backed, zero risk. Max ₹1.5L/year.",
                      action: null,
                      link: null,
                      highlight: false,
                    },
                    {
                      name: "NPS (Tier-I)",
                      section: "80CCD(1B)",
                      returns: "8-12%",
                      lockIn: "Till 60",
                      description: "Extra ₹50K deduction over 80C. Market-linked returns with partial equity exposure.",
                      action: null,
                      link: null,
                      highlight: !form.hasNps,
                    },
                    {
                      name: "5-Year Tax Saver FD",
                      section: "80C",
                      returns: "6.5-7.5%",
                      lockIn: "5 years",
                      description: "Fixed returns, no market risk. Interest taxable. Good for conservative investors.",
                      action: null,
                      link: null,
                      highlight: false,
                    },
                    {
                      name: "SSY (Sukanya Samriddhi)",
                      section: "80C",
                      returns: "8.2%",
                      lockIn: "21 years",
                      description: "For girl child. EEE tax status. Highest among small savings. Max ₹1.5L/year.",
                      action: null,
                      link: null,
                      highlight: false,
                    },
                    {
                      name: "Health Insurance",
                      section: "80D",
                      returns: "Risk cover",
                      lockIn: "Annual",
                      description: form.hasHealthInsurance
                        ? "You already have health insurance. Consider top-up plans for higher cover."
                        : "Get ₹25K-₹50K deduction. Essential protection for your family.",
                      action: null,
                      link: null,
                      highlight: !form.hasHealthInsurance,
                    },
                  ].map((inv) => (
                    <div
                      key={inv.name}
                      className={`p-3 rounded-xl border ${inv.highlight ? "border-[#d4a843]/40 bg-[#d4a843]/5" : "border-border/30 bg-muted/30"}`}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <h4 className="text-sm font-semibold text-[#0f1a2e]">{inv.name}</h4>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{inv.section}</span>
                      </div>
                      <div className="flex gap-3 text-xs text-muted-foreground mb-2">
                        <span>Returns: <strong className="text-emerald-600">{inv.returns}</strong></span>
                        <span>Lock-in: <strong>{inv.lockIn}</strong></span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{inv.description}</p>
                      {inv.action && inv.link && (
                        <Link to={inv.link}>
                          <Button size="sm" variant="outline" className="w-full text-xs h-7">
                            {inv.action}
                            <ExternalLink className="w-3 h-3 ml-1" />
                          </Button>
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </TooltipProvider>
  );
}
