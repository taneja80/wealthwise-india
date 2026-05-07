import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { Calculator, IndianRupee, Percent, Clock, Building2, Car, GraduationCap } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
} from "recharts";
import { formatCurrency, formatCompact } from "@/lib/format";

function computeEMI(principal: number, annualRate: number, tenureMonths: number): number {
  if (annualRate === 0) return principal / tenureMonths;
  const r = annualRate / 100 / 12;
  return (principal * r * Math.pow(1 + r, tenureMonths)) / (Math.pow(1 + r, tenureMonths) - 1);
}

function generateAmortization(principal: number, annualRate: number, tenureMonths: number) {
  const r = annualRate / 100 / 12;
  const emi = computeEMI(principal, annualRate, tenureMonths);
  let balance = principal;
  const schedule: Array<{
    month: number;
    year: number;
    emi: number;
    principal: number;
    interest: number;
    balance: number;
  }> = [];

  for (let m = 1; m <= tenureMonths; m++) {
    const interestPart = balance * r;
    const principalPart = emi - interestPart;
    balance = Math.max(0, balance - principalPart);

    schedule.push({
      month: m,
      year: Math.ceil(m / 12),
      emi: Math.round(emi),
      principal: Math.round(principalPart),
      interest: Math.round(interestPart),
      balance: Math.round(balance),
    });
  }

  return schedule;
}

function aggregateByYear(schedule: ReturnType<typeof generateAmortization>) {
  const yearMap = new Map<number, { principal: number; interest: number }>();
  for (const row of schedule) {
    const existing = yearMap.get(row.year) ?? { principal: 0, interest: 0 };
    existing.principal += row.principal;
    existing.interest += row.interest;
    yearMap.set(row.year, existing);
  }
  return Array.from(yearMap.entries()).map(([year, data]) => ({
    year,
    principal: Math.round(data.principal),
    interest: Math.round(data.interest),
    total: Math.round(data.principal + data.interest),
  }));
}

const PRESETS = [
  { label: "Home Loan", icon: Building2, principal: 5000000, rate: 8.5, tenure: 240 },
  { label: "Car Loan", icon: Car, principal: 800000, rate: 9.5, tenure: 60 },
  { label: "Education Loan", icon: GraduationCap, principal: 1500000, rate: 10.5, tenure: 84 },
];

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

export default function EMICalculatorPage() {
  const [principal, setPrincipal] = useState(5000000);
  const [interestRate, setInterestRate] = useState(8.5);
  const [tenureMonths, setTenureMonths] = useState(240);
  const [prepayment, setPrepayment] = useState(0);

  const effectivePrincipal = Math.max(0, principal - prepayment);

  const schedule = useMemo(
    () => generateAmortization(effectivePrincipal, interestRate, tenureMonths),
    [effectivePrincipal, interestRate, tenureMonths],
  );

  const yearlyData = useMemo(() => aggregateByYear(schedule), [schedule]);

  const emi = schedule.length > 0 ? schedule[0].emi : 0;
  const totalPayment = emi * tenureMonths;
  const totalInterest = totalPayment - effectivePrincipal;
  const interestPercent = effectivePrincipal > 0 ? ((totalInterest / effectivePrincipal) * 100).toFixed(0) : "0";
  const tenureYears = Math.floor(tenureMonths / 12);
  const tenureRemMonths = tenureMonths % 12;

  const applyPreset = (preset: typeof PRESETS[number]) => {
    setPrincipal(preset.principal);
    setInterestRate(preset.rate);
    setTenureMonths(preset.tenure);
    setPrepayment(0);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-4 lg:p-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-[#0f1a2e] flex items-center gap-2">
          <Calculator className="w-6 h-6 text-[#d4a843]" />
          EMI Calculator
        </h1>
        <p className="text-muted-foreground mt-1">
          Calculate EMI for home, car, or education loans with amortization schedule
        </p>
      </motion.div>

      {/* Presets */}
      <div className="flex gap-3 flex-wrap">
        {PRESETS.map((preset) => {
          const Icon = preset.icon;
          return (
            <button
              key={preset.label}
              onClick={() => applyPreset(preset)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:border-[#d4a843] hover:bg-[#d4a843]/5 transition-all text-sm"
            >
              <Icon className="w-4 h-4" />
              {preset.label}
            </button>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Inputs */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-2 space-y-5"
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Loan Parameters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="flex items-center gap-1.5">
                    <IndianRupee className="w-3.5 h-3.5" /> Loan Amount
                  </Label>
                  <span className="text-sm font-medium">{formatCurrency(principal)}</span>
                </div>
                <Slider
                  value={[principal]}
                  onValueChange={([v]) => setPrincipal(v)}
                  min={100000}
                  max={50000000}
                  step={100000}
                />
                <Input
                  type="number"
                  value={principal}
                  onChange={(e) => setPrincipal(Math.max(0, Number(e.target.value)))}
                  className="mt-2 h-8 text-sm"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5" /> Interest Rate (%)
                  </Label>
                  <span className="text-sm font-medium">{interestRate}%</span>
                </div>
                <Slider
                  value={[interestRate]}
                  onValueChange={([v]) => setInterestRate(v)}
                  min={1}
                  max={25}
                  step={0.1}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Tenure (months)
                  </Label>
                  <span className="text-sm font-medium">
                    {tenureYears > 0 ? `${tenureYears}y` : ""}{tenureRemMonths > 0 ? ` ${tenureRemMonths}m` : ""}
                  </span>
                </div>
                <Slider
                  value={[tenureMonths]}
                  onValueChange={([v]) => setTenureMonths(v)}
                  min={6}
                  max={360}
                  step={6}
                />
                <Input
                  type="number"
                  value={tenureMonths}
                  onChange={(e) => setTenureMonths(Math.max(1, Number(e.target.value)))}
                  className="mt-2 h-8 text-sm"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="flex items-center gap-1.5">
                    <IndianRupee className="w-3.5 h-3.5" /> Prepayment (optional)
                  </Label>
                  <span className="text-sm font-medium">{formatCurrency(prepayment)}</span>
                </div>
                <Slider
                  value={[prepayment]}
                  onValueChange={([v]) => setPrepayment(v)}
                  min={0}
                  max={Math.max(principal, 1)}
                  step={10000}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  One-time prepayment reduces effective principal
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Results */}
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-3 space-y-4"
        >
          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Monthly EMI", value: formatCompact(emi), color: "text-blue-600" },
              { label: "Total Interest", value: formatCompact(totalInterest), color: "text-red-500" },
              { label: "Total Payment", value: formatCompact(totalPayment), color: "text-[#d4a843]" },
              { label: "Interest / Principal", value: `${interestPercent}%`, color: "text-purple-600" },
            ].map((stat) => (
              <Card key={stat.label} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Detailed */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">Monthly EMI</p>
                  <p className="text-sm font-semibold">{formatCurrency(emi)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Interest</p>
                  <p className="text-sm font-semibold text-red-500">{formatCurrency(totalInterest)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Amount</p>
                  <p className="text-sm font-semibold text-[#d4a843]">{formatCurrency(totalPayment)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="chart">
            <TabsList>
              <TabsTrigger value="chart">Chart</TabsTrigger>
              <TabsTrigger value="schedule">Amortization</TabsTrigger>
            </TabsList>

            <TabsContent value="chart">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Principal vs Interest (Yearly)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={yearlyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="year" tick={{ fontSize: 12 }} label={{ value: "Year", position: "insideBottom", offset: -5 }} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCompact(v)} />
                        <ReTooltip content={<CustomTooltip />} />
                        <Legend />
                        <Bar dataKey="principal" name="Principal" fill="#3b82f6" stackId="emi" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="interest" name="Interest" fill="#ef4444" stackId="emi" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="schedule">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Year-wise Amortization</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-[400px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-white">
                        <tr className="border-b text-muted-foreground">
                          <th className="text-left py-2 font-medium">Year</th>
                          <th className="text-right py-2 font-medium">Principal</th>
                          <th className="text-right py-2 font-medium">Interest</th>
                          <th className="text-right py-2 font-medium">Total Paid</th>
                        </tr>
                      </thead>
                      <tbody>
                        {yearlyData.map((row) => (
                          <tr key={row.year} className="border-b border-border/30">
                            <td className="py-1.5">{row.year}</td>
                            <td className="text-right">{formatCompact(row.principal)}</td>
                            <td className="text-right text-red-500">{formatCompact(row.interest)}</td>
                            <td className="text-right font-medium">{formatCompact(row.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}
