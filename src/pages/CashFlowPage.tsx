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
import { motion } from "framer-motion";
import { TrendingUp, RefreshCw, IndianRupee, AlertCircle, Info } from "lucide-react";
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

function chartFormatCurrency(value: number) {
  return formatCompact(value);
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;
  return (
    <div className="bg-white p-3 rounded-lg shadow-lg border border-border/50 text-sm">
      <p className="font-medium mb-2">Year {label}</p>
      {payload.map((entry: any, index: number) => (
        <p key={index} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium">{formatCurrency(entry.value)}</span>
        </p>
      ))}
    </div>
  );
};

export default function CashFlowPage() {
  const { user } = useAuth({ redirectOnUnauthenticated: true });
  const utils = trpc.useUtils();

  const { data: projections, refetch } = trpc.cashFlow.generate.useQuery(undefined, {
    enabled: !!user,
  });

  const { data: storedProjections } = trpc.cashFlow.get.useQuery(undefined, {
    enabled: !!user,
  });

  const displayData = projections ?? storedProjections?.map(p => ({
    year: p.year,
    age: p.age,
    income: Number(p.income),
    expenses: Number(p.expenses),
    savings: Number(p.savings),
    investments: Number(p.investments),
    netWorth: Number(p.netWorth),
    goalContributions: p.goalContributions,
  })) ?? [];

  const handleRefresh = () => {
    utils.cashFlow.generate.invalidate();
    refetch();
  };

  const chartData = displayData.map((d) => ({
    year: d.year,
    age: d.age,
    Income: d.income,
    Expenses: d.expenses,
    Savings: d.savings,
    Investments: d.investments,
    NetWorth: d.netWorth,
  }));

  const latest = displayData[displayData.length - 1];
  const first = displayData[0];

  return (
    <TooltipProvider delayDuration={300}>
      <div className="max-w-6xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-2xl font-bold text-[#0f1a2e]">Cash Flow Projections</h1>
            <p className="text-muted-foreground mt-1">
              30-year forecast based on your income, expenses, goals, and inflation scenario
            </p>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" onClick={handleRefresh}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              <p>Regenerate projections with your latest profile and goals data</p>
            </TooltipContent>
          </Tooltip>
        </motion.div>

        {displayData.length === 0 && (
          <Card className="border-dashed border-2">
            <CardContent className="p-8 text-center">
              <AlertCircle className="w-8 h-8 text-[#d4a843] mx-auto mb-3" />
              <h3 className="font-semibold text-[#0f1a2e] mb-1">No Projections Available</h3>
              <p className="text-sm text-muted-foreground">
                Complete your financial profile and add goals to generate cash flow projections.
              </p>
            </CardContent>
          </Card>
        )}

        {displayData.length > 0 && (
          <>
            {/* Summary Cards */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  title: "Starting Net Worth",
                  value: formatCompact(first?.netWorth ?? 0),
                  fullValue: formatCurrency(first?.netWorth ?? 0),
                  icon: IndianRupee,
                  color: "text-blue-600",
                  bg: "bg-blue-50",
                  tooltip: "Your current net worth at the beginning of the projection period",
                },
                {
                  title: "Projected Net Worth",
                  value: formatCompact(latest?.netWorth ?? 0),
                  fullValue: formatCurrency(latest?.netWorth ?? 0),
                  icon: TrendingUp,
                  color: "text-emerald-600",
                  bg: "bg-emerald-50",
                  tooltip: "Estimated net worth at the end of your planning horizon, assuming consistent savings and investment growth",
                },
                {
                  title: "Total Savings",
                  value: formatCompact(displayData.reduce((sum, d) => sum + (d.savings > 0 ? d.savings : 0), 0)),
                  fullValue: formatCurrency(displayData.reduce((sum, d) => sum + (d.savings > 0 ? d.savings : 0), 0)),
                  icon: TrendingUp,
                  color: "text-[#d4a843]",
                  bg: "bg-[#d4a843]/10",
                  tooltip: "Cumulative savings over the entire projection period (income minus expenses minus goal contributions)",
                },
                {
                  title: "Final Age",
                  value: `${latest?.age ?? 0} years`,
                  icon: IndianRupee,
                  color: "text-purple-600",
                  bg: "bg-purple-50",
                  tooltip: "Your age at the end of the planning horizon. Income assumptions change after retirement (age 60)",
                },
              ].map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <motion.div
                    key={stat.title}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.05 }}
                  >
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

            {/* Net Worth Chart */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardHeader className="pb-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <CardTitle className="text-lg cursor-help flex items-center gap-2">
                        Net Worth Growth
                        <Info className="w-3.5 h-3.5 text-muted-foreground/40" />
                      </CardTitle>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs text-xs">
                      <p>Shows how your total net worth (assets minus liabilities) is projected to grow over time through savings and investment returns.</p>
                    </TooltipContent>
                  </Tooltip>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="networthGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#d4a843" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#d4a843" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="year" stroke="#94a3b8" fontSize={12} />
                        <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={chartFormatCurrency} />
                        <ReTooltip content={<CustomTooltip />} />
                        <Area
                          type="monotone"
                          dataKey="NetWorth"
                          stroke="#d4a843"
                          strokeWidth={2}
                          fill="url(#networthGradient)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Income vs Expenses Chart */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card>
                <CardHeader className="pb-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <CardTitle className="text-lg cursor-help flex items-center gap-2">
                        Income vs Expenses Over Time
                        <Info className="w-3.5 h-3.5 text-muted-foreground/40" />
                      </CardTitle>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs text-xs">
                      <p>Income grows at 5% annually. Expenses grow at your selected inflation rate. After age 60, income drops (retirement) and expenses reduce.</p>
                    </TooltipContent>
                  </Tooltip>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="year" stroke="#94a3b8" fontSize={12} />
                        <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={chartFormatCurrency} />
                        <ReTooltip content={<CustomTooltip />} />
                        <Legend />
                        <Line type="monotone" dataKey="Income" stroke="#10b981" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="Expenses" stroke="#ef4444" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="Savings" stroke="#3b82f6" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Savings & Investments Bar Chart */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card>
                <CardHeader className="pb-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <CardTitle className="text-lg cursor-help flex items-center gap-2">
                        Annual Savings & Investments
                        <Info className="w-3.5 h-3.5 text-muted-foreground/40" />
                      </CardTitle>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs text-xs">
                      <p>Savings = income minus expenses minus goal contributions. Investments include 70% of positive savings plus all goal contributions.</p>
                    </TooltipContent>
                  </Tooltip>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData.slice(0, 15)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="year" stroke="#94a3b8" fontSize={12} />
                        <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={chartFormatCurrency} />
                        <ReTooltip content={<CustomTooltip />} />
                        <Legend />
                        <Bar dataKey="Savings" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Investments" fill="#d4a843" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Data Table */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <CardTitle className="text-lg cursor-help flex items-center gap-2">
                          Yearly Breakdown
                          <Info className="w-3.5 h-3.5 text-muted-foreground/40" />
                        </CardTitle>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs text-xs">
                        <p>Detailed year-by-year numbers. Hover over column headers to understand what each value represents.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/50">
                          <th className="text-left py-2 px-3 font-medium text-muted-foreground">
                            <Tooltip>
                              <TooltipTrigger asChild><span className="cursor-help">Year</span></TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">Projection year from now</TooltipContent>
                            </Tooltip>
                          </th>
                          <th className="text-left py-2 px-3 font-medium text-muted-foreground">
                            <Tooltip>
                              <TooltipTrigger asChild><span className="cursor-help">Age</span></TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">Your age in that year</TooltipContent>
                            </Tooltip>
                          </th>
                          <th className="text-right py-2 px-3 font-medium text-muted-foreground">
                            <Tooltip>
                              <TooltipTrigger asChild><span className="cursor-help">Income</span></TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">Annual income with 5% growth applied</TooltipContent>
                            </Tooltip>
                          </th>
                          <th className="text-right py-2 px-3 font-medium text-muted-foreground">
                            <Tooltip>
                              <TooltipTrigger asChild><span className="cursor-help">Expenses</span></TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">Annual expenses adjusted for inflation</TooltipContent>
                            </Tooltip>
                          </th>
                          <th className="text-right py-2 px-3 font-medium text-muted-foreground">
                            <Tooltip>
                              <TooltipTrigger asChild><span className="cursor-help">Savings</span></TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">Income minus expenses minus goal contributions</TooltipContent>
                            </Tooltip>
                          </th>
                          <th className="text-right py-2 px-3 font-medium text-muted-foreground">
                            <Tooltip>
                              <TooltipTrigger asChild><span className="cursor-help">Net Worth</span></TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">Cumulative wealth including investment returns</TooltipContent>
                            </Tooltip>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayData.slice(0, 10).map((row) => (
                          <Tooltip key={row.year}>
                            <TooltipTrigger asChild>
                              <tr className="border-b border-border/30 hover:bg-muted/30 transition-colors cursor-help">
                                <td className="py-2 px-3">{row.year}</td>
                                <td className="py-2 px-3">{row.age}</td>
                                <td className="text-right py-2 px-3 text-emerald-600">{formatCurrency(row.income)}</td>
                                <td className="text-right py-2 px-3 text-red-500">{formatCurrency(row.expenses)}</td>
                                <td className="text-right py-2 px-3 text-blue-600">{formatCurrency(row.savings)}</td>
                                <td className="text-right py-2 px-3 font-medium">{formatCurrency(row.netWorth)}</td>
                              </tr>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="text-xs">
                              <p><span className="font-medium">Age {row.age} (Year {row.year})</span></p>
                              <p>Income: {formatCurrency(row.income)} · Expenses: {formatCurrency(row.expenses)}</p>
                              <p>Savings: {formatCurrency(row.savings)} · Investments: {formatCurrency(row.investments)}</p>
                              <p>Net Worth: {formatCurrency(row.netWorth)}</p>
                            </TooltipContent>
                          </Tooltip>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3 text-center">
                    Showing first 10 years. Projections assume {first ? "moderate" : "default"} inflation scenario with 7% portfolio growth.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </>
        )}
      </div>
    </TooltipProvider>
  );
}
