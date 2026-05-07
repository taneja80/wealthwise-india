import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { Calculator, TrendingUp, IndianRupee, Percent, Clock } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatCurrency, formatCompact } from "@/lib/format";

function computeSIP(monthly: number, rate: number, years: number) {
  const n = years * 12;
  const r = rate / 100 / 12;
  if (r === 0) return monthly * n;
  return monthly * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
}

function computeLumpsum(principal: number, rate: number, years: number) {
  return principal * Math.pow(1 + rate / 100, years);
}

function generateChartData(
  monthly: number,
  lumpsum: number,
  rate: number,
  years: number,
  stepUpPercent: number,
) {
  const data = [];
  let totalInvested = lumpsum;
  let currentSip = monthly;
  let corpus = lumpsum;

  for (let year = 1; year <= years; year++) {
    const monthlyRate = rate / 100 / 12;
    // Grow lumpsum + accumulated corpus
    for (let m = 0; m < 12; m++) {
      corpus = corpus * (1 + monthlyRate) + currentSip;
    }
    totalInvested += currentSip * 12;

    data.push({
      year,
      invested: Math.round(totalInvested),
      corpus: Math.round(corpus),
      returns: Math.round(corpus - totalInvested),
    });

    // Annual step-up
    currentSip = currentSip * (1 + stepUpPercent / 100);
  }

  return data;
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

export default function SIPCalculatorPage() {
  const [monthlySip, setMonthlySip] = useState(10000);
  const [lumpsum, setLumpsum] = useState(0);
  const [expectedReturn, setExpectedReturn] = useState(12);
  const [timePeriod, setTimePeriod] = useState(15);
  const [stepUp, setStepUp] = useState(0);

  const chartData = useMemo(
    () => generateChartData(monthlySip, lumpsum, expectedReturn, timePeriod, stepUp),
    [monthlySip, lumpsum, expectedReturn, timePeriod, stepUp],
  );

  const finalData = chartData[chartData.length - 1];
  const totalInvested = finalData?.invested ?? 0;
  const totalCorpus = finalData?.corpus ?? 0;
  const totalReturns = totalCorpus - totalInvested;
  const wealthMultiple = totalInvested > 0 ? (totalCorpus / totalInvested).toFixed(1) : "0";

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-4 lg:p-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-[#0f1a2e] flex items-center gap-2">
          <Calculator className="w-6 h-6 text-[#d4a843]" />
          SIP Calculator
        </h1>
        <p className="text-muted-foreground mt-1">
          Plan your mutual fund investments with SIP, lumpsum, and step-up analysis
        </p>
      </motion.div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Inputs */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-2 space-y-5"
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Investment Parameters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="flex items-center gap-1.5">
                    <IndianRupee className="w-3.5 h-3.5" /> Monthly SIP
                  </Label>
                  <span className="text-sm font-medium">{formatCurrency(monthlySip)}</span>
                </div>
                <Slider
                  value={[monthlySip]}
                  onValueChange={([v]) => setMonthlySip(v)}
                  min={500}
                  max={500000}
                  step={500}
                />
                <Input
                  type="number"
                  value={monthlySip}
                  onChange={(e) => setMonthlySip(Math.max(0, Number(e.target.value)))}
                  className="mt-2 h-8 text-sm"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="flex items-center gap-1.5">
                    <IndianRupee className="w-3.5 h-3.5" /> Lumpsum (optional)
                  </Label>
                  <span className="text-sm font-medium">{formatCurrency(lumpsum)}</span>
                </div>
                <Slider
                  value={[lumpsum]}
                  onValueChange={([v]) => setLumpsum(v)}
                  min={0}
                  max={10000000}
                  step={10000}
                />
                <Input
                  type="number"
                  value={lumpsum}
                  onChange={(e) => setLumpsum(Math.max(0, Number(e.target.value)))}
                  className="mt-2 h-8 text-sm"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5" /> Expected Return (%)
                  </Label>
                  <span className="text-sm font-medium">{expectedReturn}%</span>
                </div>
                <Slider
                  value={[expectedReturn]}
                  onValueChange={([v]) => setExpectedReturn(v)}
                  min={1}
                  max={30}
                  step={0.5}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Time Period (years)
                  </Label>
                  <span className="text-sm font-medium">{timePeriod} years</span>
                </div>
                <Slider
                  value={[timePeriod]}
                  onValueChange={([v]) => setTimePeriod(v)}
                  min={1}
                  max={40}
                  step={1}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5" /> Annual Step-Up (%)
                  </Label>
                  <span className="text-sm font-medium">{stepUp}%</span>
                </div>
                <Slider
                  value={[stepUp]}
                  onValueChange={([v]) => setStepUp(v)}
                  min={0}
                  max={25}
                  step={1}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Increase SIP by this % every year (e.g. with salary hikes)
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
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Invested", value: formatCompact(totalInvested), color: "text-blue-600", bg: "bg-blue-50" },
              { label: "Returns", value: formatCompact(totalReturns), color: "text-emerald-600", bg: "bg-emerald-50" },
              { label: "Total Corpus", value: formatCompact(totalCorpus), color: "text-[#d4a843]", bg: "bg-[#d4a843]/10" },
              { label: "Wealth Multiple", value: `${wealthMultiple}x`, color: "text-purple-600", bg: "bg-purple-50" },
            ].map((stat) => (
              <Card key={stat.label} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Detailed breakdown */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">Total Invested</p>
                  <p className="text-sm font-semibold">{formatCurrency(totalInvested)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Est. Returns</p>
                  <p className="text-sm font-semibold text-emerald-600">{formatCurrency(totalReturns)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Value</p>
                  <p className="text-sm font-semibold text-[#d4a843]">{formatCurrency(totalCorpus)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Growth Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="year"
                      tick={{ fontSize: 12 }}
                      label={{ value: "Years", position: "insideBottom", offset: -5 }}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => formatCompact(v)}
                    />
                    <ReTooltip content={<CustomTooltip />} />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="invested"
                      name="Invested"
                      stackId="1"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.3}
                    />
                    <Area
                      type="monotone"
                      dataKey="returns"
                      name="Returns"
                      stackId="1"
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Year-wise breakdown */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Year-wise Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-[300px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left py-2 font-medium">Year</th>
                      <th className="text-right py-2 font-medium">Invested</th>
                      <th className="text-right py-2 font-medium">Returns</th>
                      <th className="text-right py-2 font-medium">Corpus</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chartData.map((row) => (
                      <tr key={row.year} className="border-b border-border/30">
                        <td className="py-1.5">{row.year}</td>
                        <td className="text-right">{formatCompact(row.invested)}</td>
                        <td className="text-right text-emerald-600">{formatCompact(row.returns)}</td>
                        <td className="text-right font-medium">{formatCompact(row.corpus)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
