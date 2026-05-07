import { useState, useMemo, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";
import {
  GitCompareArrows,
  Plus,
  Trash2,
  Copy,
  TrendingUp,
  TrendingDown,
  IndianRupee,
  Percent,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  RotateCcw,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatCurrency, formatCompact, formatPercent } from "@/lib/format";

// ---- Scenario engine ----

interface ScenarioParams {
  name: string;
  color: string;
  monthlyIncome: number;
  monthlyExpenses: number;
  currentSavings: number;
  monthlySip: number;
  expectedReturn: number;
  inflationRate: number;
  incomeGrowth: number;
  sipStepUp: number;
  retirementAge: number;
  currentAge: number;
  horizonYears: number;
  lumpsum: number;
  emiPerMonth: number;
  emiEndYear: number;
}

interface YearProjection {
  year: number;
  age: number;
  income: number;
  expenses: number;
  savings: number;
  sipContribution: number;
  corpus: number;
  netWorth: number;
}

function projectScenario(params: ScenarioParams): YearProjection[] {
  const data: YearProjection[] = [];
  let income = params.monthlyIncome * 12;
  let expenses = params.monthlyExpenses * 12;
  let corpus = params.currentSavings + params.lumpsum;
  let annualSip = params.monthlySip * 12;
  const returnRate = params.expectedReturn / 100;
  const inflationRate = params.inflationRate / 100;
  const incomeGrowth = params.incomeGrowth / 100;
  const sipStepUp = params.sipStepUp / 100;

  for (let y = 1; y <= params.horizonYears; y++) {
    const age = params.currentAge + y;
    const isRetired = age > params.retirementAge;

    // Post-retirement: income drops to 0, expenses may change
    if (isRetired) {
      income = 0;
    } else {
      income = income * (1 + incomeGrowth);
    }
    expenses = expenses * (1 + inflationRate);

    // EMI deduction
    let emiAnnual = 0;
    if (y <= params.emiEndYear && params.emiPerMonth > 0) {
      emiAnnual = params.emiPerMonth * 12;
    }

    const netIncome = income - expenses - emiAnnual;
    const actualSip = isRetired ? 0 : annualSip;

    // Corpus growth = existing corpus * return + new SIP contributions
    corpus = corpus * (1 + returnRate) + actualSip + Math.max(netIncome, 0);

    // Post-retirement: drawdown from corpus for expenses shortfall
    if (isRetired && netIncome < 0) {
      corpus = corpus + netIncome; // netIncome is negative = drawdown
    }

    const netWorth = Math.max(corpus, 0);

    data.push({
      year: y,
      age,
      income: Math.round(income),
      expenses: Math.round(expenses + emiAnnual),
      savings: Math.round(Math.max(netIncome, 0)),
      sipContribution: Math.round(actualSip),
      corpus: Math.round(corpus),
      netWorth: Math.round(netWorth),
    });

    // Annual step-up on SIP
    if (!isRetired) {
      annualSip = annualSip * (1 + sipStepUp);
    }
  }

  return data;
}

// ---- Preset scenarios ----

const SCENARIO_COLORS = [
  "#1a2744", "#d4a843", "#10b981", "#ef4444", "#8b5cf6", "#3b82f6",
];

function defaultParams(overrides?: Partial<ScenarioParams>): ScenarioParams {
  return {
    name: "Base Case",
    color: SCENARIO_COLORS[0],
    monthlyIncome: 100000,
    monthlyExpenses: 50000,
    currentSavings: 500000,
    monthlySip: 15000,
    expectedReturn: 12,
    inflationRate: 6,
    incomeGrowth: 8,
    sipStepUp: 10,
    retirementAge: 60,
    currentAge: 30,
    horizonYears: 35,
    lumpsum: 0,
    emiPerMonth: 0,
    emiEndYear: 0,
    ...overrides,
  };
}

const PRESETS: { label: string; desc: string; overrides: Partial<ScenarioParams> }[] = [
  {
    label: "Aggressive Saver",
    desc: "Higher SIP + step-up",
    overrides: { name: "Aggressive Saver", monthlySip: 30000, sipStepUp: 15 },
  },
  {
    label: "Early Retirement",
    desc: "Retire at 50",
    overrides: { name: "Early Retirement", retirementAge: 50, monthlySip: 25000 },
  },
  {
    label: "Conservative Returns",
    desc: "8% return, lower risk",
    overrides: { name: "Conservative", expectedReturn: 8, monthlySip: 20000 },
  },
  {
    label: "High Inflation",
    desc: "8% inflation scenario",
    overrides: { name: "High Inflation", inflationRate: 8 },
  },
  {
    label: "Home Loan",
    desc: "₹40K EMI for 20 years",
    overrides: { name: "With Home Loan", emiPerMonth: 40000, emiEndYear: 20 },
  },
  {
    label: "Career Growth",
    desc: "12% income growth",
    overrides: { name: "Career Growth", incomeGrowth: 12 },
  },
];

// ---- Chart tooltip ----

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;
  return (
    <div className="bg-white p-3 rounded-lg shadow-lg border border-border/50 text-sm max-w-xs">
      <p className="font-medium mb-1.5">Year {label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground truncate">{entry.name}:</span>
          <span className="font-medium">{formatCompact(entry.value)}</span>
        </p>
      ))}
    </div>
  );
};

// ---- Diff indicator ----

function DiffBadge({ base, compare, suffix = "" }: { base: number; compare: number; suffix?: string }) {
  if (base === 0) return null;
  const diff = compare - base;
  const pct = (diff / Math.abs(base)) * 100;
  if (Math.abs(pct) < 0.1) return null;

  const isPositive = diff > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${
        isPositive ? "text-emerald-600" : "text-red-500"
      }`}
    >
      {isPositive ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
      {isPositive ? "+" : ""}{pct.toFixed(1)}%{suffix}
    </span>
  );
}

// ---- Scenario Parameter Panel ----

function ScenarioPanel({
  params,
  onChange,
  onRemove,
  onDuplicate,
  canRemove,
  index,
}: {
  params: ScenarioParams;
  onChange: (p: ScenarioParams) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  canRemove: boolean;
  index: number;
}) {
  const set = (field: keyof ScenarioParams, value: number | string) =>
    onChange({ ...params, [field]: value });

  return (
    <Card className="border-t-4" style={{ borderTopColor: params.color }}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Input
            value={params.name}
            onChange={(e) => set("name", e.target.value)}
            className="font-semibold text-sm h-8 max-w-[180px] border-0 p-0 focus-visible:ring-0 shadow-none"
          />
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDuplicate} title="Duplicate">
              <Copy className="w-3.5 h-3.5" />
            </Button>
            {canRemove && (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={onRemove} title="Remove">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <SliderField
          label="Monthly Income"
          icon={<IndianRupee className="w-3 h-3" />}
          value={params.monthlyIncome}
          onChange={(v) => set("monthlyIncome", v)}
          min={10000}
          max={1000000}
          step={5000}
          format={(v) => formatCompact(v)}
        />
        <SliderField
          label="Monthly Expenses"
          icon={<IndianRupee className="w-3 h-3" />}
          value={params.monthlyExpenses}
          onChange={(v) => set("monthlyExpenses", v)}
          min={5000}
          max={500000}
          step={2500}
          format={(v) => formatCompact(v)}
        />
        <SliderField
          label="Monthly SIP"
          icon={<IndianRupee className="w-3 h-3" />}
          value={params.monthlySip}
          onChange={(v) => set("monthlySip", v)}
          min={0}
          max={200000}
          step={1000}
          format={(v) => formatCompact(v)}
        />
        <SliderField
          label="Current Savings"
          icon={<IndianRupee className="w-3 h-3" />}
          value={params.currentSavings}
          onChange={(v) => set("currentSavings", v)}
          min={0}
          max={50000000}
          step={50000}
          format={(v) => formatCompact(v)}
        />
        <SliderField
          label="Expected Return"
          icon={<Percent className="w-3 h-3" />}
          value={params.expectedReturn}
          onChange={(v) => set("expectedReturn", v)}
          min={4}
          max={20}
          step={0.5}
          format={(v) => `${v}%`}
        />
        <SliderField
          label="Inflation Rate"
          icon={<Percent className="w-3 h-3" />}
          value={params.inflationRate}
          onChange={(v) => set("inflationRate", v)}
          min={2}
          max={12}
          step={0.5}
          format={(v) => `${v}%`}
        />
        <SliderField
          label="Income Growth"
          icon={<TrendingUp className="w-3 h-3" />}
          value={params.incomeGrowth}
          onChange={(v) => set("incomeGrowth", v)}
          min={0}
          max={20}
          step={1}
          format={(v) => `${v}%`}
        />
        <SliderField
          label="SIP Step-Up"
          icon={<TrendingUp className="w-3 h-3" />}
          value={params.sipStepUp}
          onChange={(v) => set("sipStepUp", v)}
          min={0}
          max={25}
          step={1}
          format={(v) => `${v}%`}
        />
        <SliderField
          label="Current Age"
          icon={<Clock className="w-3 h-3" />}
          value={params.currentAge}
          onChange={(v) => set("currentAge", v)}
          min={18}
          max={65}
          step={1}
          format={(v) => `${v} yrs`}
        />
        <SliderField
          label="Retirement Age"
          icon={<Clock className="w-3 h-3" />}
          value={params.retirementAge}
          onChange={(v) => set("retirementAge", v)}
          min={40}
          max={70}
          step={1}
          format={(v) => `${v} yrs`}
        />
        <SliderField
          label="Horizon"
          icon={<Clock className="w-3 h-3" />}
          value={params.horizonYears}
          onChange={(v) => set("horizonYears", v)}
          min={5}
          max={50}
          step={1}
          format={(v) => `${v} yrs`}
        />
        <SliderField
          label="Lumpsum"
          icon={<IndianRupee className="w-3 h-3" />}
          value={params.lumpsum}
          onChange={(v) => set("lumpsum", v)}
          min={0}
          max={10000000}
          step={50000}
          format={(v) => formatCompact(v)}
        />
        <SliderField
          label="EMI/month"
          icon={<IndianRupee className="w-3 h-3" />}
          value={params.emiPerMonth}
          onChange={(v) => set("emiPerMonth", v)}
          min={0}
          max={200000}
          step={1000}
          format={(v) => formatCompact(v)}
        />
        {params.emiPerMonth > 0 && (
          <SliderField
            label="EMI Duration"
            icon={<Clock className="w-3 h-3" />}
            value={params.emiEndYear}
            onChange={(v) => set("emiEndYear", v)}
            min={1}
            max={30}
            step={1}
            format={(v) => `${v} yrs`}
          />
        )}
      </CardContent>
    </Card>
  );
}

function SliderField({
  label,
  icon,
  value,
  onChange,
  min,
  max,
  step,
  format,
}: {
  label: string;
  icon: React.ReactNode;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <Label className="text-xs flex items-center gap-1">
          {icon} {label}
        </Label>
        <span className="text-xs font-medium tabular-nums">{format(value)}</span>
      </div>
      <Slider value={[value]} onValueChange={([v]) => onChange(v)} min={min} max={max} step={step} />
    </div>
  );
}

// ---- Main Page ----

export default function WhatIfPage() {
  const { user } = useAuth({ redirectOnUnauthenticated: true });
  const { data: userProfile } = trpc.profile.getUserProfile.useQuery(undefined, { enabled: !!user });
  const { data: financialProfile } = trpc.profile.getFinancialProfile.useQuery(undefined, { enabled: !!user });

  // Seed base scenario from user's actual data when available
  const baseFromProfile = useMemo<Partial<ScenarioParams>>(() => {
    const overrides: Partial<ScenarioParams> = {};
    if (userProfile?.age) overrides.currentAge = userProfile.age;
    if (financialProfile) {
      const fp = financialProfile;
      if (fp.monthlyIncome) overrides.monthlyIncome = Number(fp.monthlyIncome);
      if (fp.monthlyExpenses) overrides.monthlyExpenses = Number(fp.monthlyExpenses);
      const totalSavings =
        Number(fp.totalAssets || 0) - Number(fp.totalLiabilities || 0);
      if (totalSavings > 0) overrides.currentSavings = totalSavings;
      if (fp.planningHorizon) overrides.horizonYears = fp.planningHorizon;
      if (fp.inflationScenario === "low") overrides.inflationRate = 4;
      else if (fp.inflationScenario === "high") overrides.inflationRate = 8;
    }
    return overrides;
  }, [userProfile, financialProfile]);

  const [scenarios, setScenarios] = useState<ScenarioParams[]>([
    defaultParams({ ...baseFromProfile, name: "Base Case", color: SCENARIO_COLORS[0] }),
    defaultParams({
      ...baseFromProfile,
      name: "Optimistic",
      color: SCENARIO_COLORS[1],
      monthlySip: (baseFromProfile.monthlyIncome ?? 100000) * 0.25,
      sipStepUp: 15,
      expectedReturn: 14,
    }),
  ]);

  // Re-seed when profile loads
  const [seeded, setSeeded] = useState(false);
  if (!seeded && baseFromProfile.currentAge) {
    setScenarios([
      defaultParams({ ...baseFromProfile, name: "Base Case", color: SCENARIO_COLORS[0] }),
      defaultParams({
        ...baseFromProfile,
        name: "Optimistic",
        color: SCENARIO_COLORS[1],
        monthlySip: Math.round((baseFromProfile.monthlyIncome ?? 100000) * 0.25),
        sipStepUp: 15,
        expectedReturn: 14,
      }),
    ]);
    setSeeded(true);
  }

  const projections = useMemo(
    () => scenarios.map((s) => ({ params: s, data: projectScenario(s) })),
    [scenarios],
  );

  const updateScenario = useCallback((index: number, params: ScenarioParams) => {
    setScenarios((prev) => prev.map((s, i) => (i === index ? params : s)));
  }, []);

  const removeScenario = useCallback((index: number) => {
    setScenarios((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const duplicateScenario = useCallback((index: number) => {
    setScenarios((prev) => {
      if (prev.length >= 6) return prev;
      const copy = {
        ...prev[index],
        name: `${prev[index].name} (Copy)`,
        color: SCENARIO_COLORS[prev.length % SCENARIO_COLORS.length],
      };
      return [...prev, copy];
    });
  }, []);

  const addPreset = useCallback(
    (preset: (typeof PRESETS)[number]) => {
      if (scenarios.length >= 6) return;
      setScenarios((prev) => [
        ...prev,
        defaultParams({
          ...baseFromProfile,
          ...preset.overrides,
          color: SCENARIO_COLORS[prev.length % SCENARIO_COLORS.length],
        }),
      ]);
    },
    [scenarios.length, baseFromProfile],
  );

  const resetAll = useCallback(() => {
    setScenarios([
      defaultParams({ ...baseFromProfile, name: "Base Case", color: SCENARIO_COLORS[0] }),
    ]);
  }, [baseFromProfile]);

  // ---- Build combined chart data ----
  const maxYears = Math.max(...scenarios.map((s) => s.horizonYears));
  const chartData = useMemo(() => {
    const rows: any[] = [];
    for (let y = 1; y <= maxYears; y++) {
      const row: any = { year: y };
      for (const proj of projections) {
        const point = proj.data.find((d) => d.year === y);
        row[proj.params.name] = point?.netWorth ?? null;
      }
      rows.push(row);
    }
    return rows;
  }, [projections, maxYears]);

  // ---- Summary metrics at horizon end ----
  const summaries = projections.map((proj) => {
    const last = proj.data[proj.data.length - 1];
    const retirementYear = proj.data.find((d) => d.age === proj.params.retirementAge);
    const totalSipInvested = proj.data.reduce((sum, d) => sum + d.sipContribution, 0);
    return {
      name: proj.params.name,
      color: proj.params.color,
      finalCorpus: last?.netWorth ?? 0,
      retirementCorpus: retirementYear?.netWorth ?? 0,
      totalSipInvested,
      peakNetWorth: Math.max(...proj.data.map((d) => d.netWorth)),
      corpusDepletionAge: proj.data.find((d) => d.netWorth <= 0)?.age ?? null,
    };
  });

  const baseSummary = summaries[0];

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4 lg:p-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#0f1a2e] flex items-center gap-2">
              <GitCompareArrows className="w-6 h-6 text-[#d4a843]" />
              What-If Scenarios
            </h1>
            <p className="text-muted-foreground mt-1">
              Compare up to 6 financial scenarios side-by-side
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={resetAll}>
              <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset
            </Button>
            <Button
              size="sm"
              disabled={scenarios.length >= 6}
              onClick={() =>
                setScenarios((prev) => [
                  ...prev,
                  defaultParams({
                    ...baseFromProfile,
                    name: `Scenario ${prev.length + 1}`,
                    color: SCENARIO_COLORS[prev.length % SCENARIO_COLORS.length],
                  }),
                ])
              }
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Scenario
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Quick presets */}
      <div className="flex gap-2 flex-wrap">
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            onClick={() => addPreset(preset)}
            disabled={scenarios.length >= 6}
            className="text-xs px-3 py-1.5 rounded-full border hover:border-[#d4a843] hover:bg-[#d4a843]/5 transition-colors disabled:opacity-40"
          >
            {preset.label}
            <span className="text-muted-foreground ml-1">— {preset.desc}</span>
          </button>
        ))}
      </div>

      {/* Summary comparison cards */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {summaries.map((s, i) => (
            <Card key={s.name + i} className="border-t-4" style={{ borderTopColor: s.color }}>
              <CardContent className="p-3 space-y-2">
                <p className="font-medium text-sm truncate">{s.name}</p>
                <div>
                  <p className="text-xs text-muted-foreground">Final Corpus</p>
                  <p className="text-base font-bold">{formatCompact(s.finalCorpus)}</p>
                  {i > 0 && <DiffBadge base={baseSummary.finalCorpus} compare={s.finalCorpus} />}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">At Retirement</p>
                  <p className="text-sm font-semibold">{formatCompact(s.retirementCorpus)}</p>
                  {i > 0 && <DiffBadge base={baseSummary.retirementCorpus} compare={s.retirementCorpus} />}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total SIP Invested</p>
                  <p className="text-sm">{formatCompact(s.totalSipInvested)}</p>
                </div>
                {s.corpusDepletionAge && (
                  <Badge variant="destructive" className="text-[10px]">
                    Corpus runs out at {s.corpusDepletionAge}
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.div>

      {/* Charts + Parameter panels */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Charts (2/3 width) */}
        <div className="lg:col-span-2 space-y-4">
          <Tabs defaultValue="networth">
            <TabsList>
              <TabsTrigger value="networth">Net Worth</TabsTrigger>
              <TabsTrigger value="table">Comparison Table</TabsTrigger>
            </TabsList>

            <TabsContent value="networth">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Net Worth Projection</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                          dataKey="year"
                          tick={{ fontSize: 12 }}
                          label={{ value: "Years", position: "insideBottom", offset: -5 }}
                        />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCompact(v)} />
                        <ReTooltip content={<CustomTooltip />} />
                        <Legend />
                        {scenarios.map((s) => (
                          <Line
                            key={s.name}
                            type="monotone"
                            dataKey={s.name}
                            stroke={s.color}
                            strokeWidth={2}
                            dot={false}
                            connectNulls
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="table">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Year-wise Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-[400px] overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-white z-10">
                        <tr className="border-b">
                          <th className="text-left py-2 font-medium text-muted-foreground">Year</th>
                          {scenarios.map((s, i) => (
                            <th key={i} className="text-right py-2 font-medium" style={{ color: s.color }}>
                              {s.name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({ length: maxYears }, (_, y) => y + 1)
                          .filter((y) => y % 5 === 0 || y === 1 || y === maxYears)
                          .map((y) => (
                            <tr key={y} className="border-b border-border/30">
                              <td className="py-1.5">{y}</td>
                              {projections.map((proj, i) => {
                                const point = proj.data.find((d) => d.year === y);
                                return (
                                  <td key={i} className="text-right font-medium">
                                    {point ? formatCompact(point.netWorth) : "—"}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Detailed metrics comparison */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Scenario Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 font-medium text-muted-foreground">Metric</th>
                      {summaries.map((s, i) => (
                        <th key={i} className="text-right py-2 font-medium" style={{ color: s.color }}>
                          {s.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: "Monthly SIP", key: "monthlySip", fmt: formatCompact },
                      { label: "Expected Return", key: "expectedReturn", fmt: (v: number) => `${v}%` },
                      { label: "Inflation Rate", key: "inflationRate", fmt: (v: number) => `${v}%` },
                      { label: "Retirement Age", key: "retirementAge", fmt: (v: number) => `${v}` },
                      { label: "SIP Step-Up", key: "sipStepUp", fmt: (v: number) => `${v}%` },
                    ].map((metric) => (
                      <tr key={metric.key} className="border-b border-border/30">
                        <td className="py-1.5 text-muted-foreground">{metric.label}</td>
                        {scenarios.map((s, i) => (
                          <td key={i} className="text-right font-medium">
                            {metric.fmt((s as any)[metric.key])}
                          </td>
                        ))}
                      </tr>
                    ))}
                    <tr className="border-b border-border/30">
                      <td className="py-1.5 text-muted-foreground">Final Corpus</td>
                      {summaries.map((s, i) => (
                        <td key={i} className="text-right font-bold" style={{ color: s.color }}>
                          {formatCompact(s.finalCorpus)}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-border/30">
                      <td className="py-1.5 text-muted-foreground">Retirement Corpus</td>
                      {summaries.map((s, i) => (
                        <td key={i} className="text-right font-semibold">
                          {formatCompact(s.retirementCorpus)}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-1.5 text-muted-foreground">Peak Net Worth</td>
                      {summaries.map((s, i) => (
                        <td key={i} className="text-right">{formatCompact(s.peakNetWorth)}</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Scenario parameter panels (1/3 width, scrollable) */}
        <div className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto pr-1">
          {scenarios.map((s, i) => (
            <ScenarioPanel
              key={i}
              params={s}
              onChange={(p) => updateScenario(i, p)}
              onRemove={() => removeScenario(i)}
              onDuplicate={() => duplicateScenario(i)}
              canRemove={scenarios.length > 1}
              index={i}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
