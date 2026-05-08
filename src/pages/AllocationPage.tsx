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
import { RefreshCw, Target, TrendingUp, AlertCircle, Info } from "lucide-react";
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip, Legend } from "recharts";
import { formatCurrency } from "@/lib/format";

const COLORS = ["#1a2744", "#d4a843", "#10b981", "#8b5cf6", "#f59e0b", "#3b82f6"];

const assetClassLabels: Record<string, string> = {
  equity: "Equity / Mutual Funds",
  debt: "Debt / FD / PPF",
  gold: "Gold",
  real_estate: "Real Estate",
  liquid: "Liquid / Savings",
  international: "International Equity",
};

const assetClassTooltips: Record<string, string> = {
  equity: "Stocks and equity mutual funds. Highest returns (~12%) but volatile. Best for long-term goals (10+ years).",
  debt: "Fixed deposits, PPF, bonds, debt mutual funds. Stable returns (~7%). Ideal for short to medium-term goals.",
  gold: "Physical gold or gold ETFs. Hedge against inflation. Returns ~8%. Good for diversification.",
  real_estate: "Property investments. Returns ~10%. Illiquid but good for wealth preservation.",
  liquid: "Savings accounts, liquid funds. Returns ~4%. For emergency funds and very short-term needs.",
  international: "US/European equity funds. Returns ~11%. Diversifies currency and geographic risk.",
};

const riskLabels: Record<string, { label: string; color: string; bg: string; tooltip: string }> = {
  conservative: { 
    label: "Conservative", 
    color: "text-emerald-600", 
    bg: "bg-emerald-50",
    tooltip: "More debt and liquid assets. Lower returns but safer. Suitable for short-term or high-priority goals."
  },
  moderate: { 
    label: "Moderate", 
    color: "text-[#d4a843]", 
    bg: "bg-[#d4a843]/10",
    tooltip: "Balanced mix of equity and debt. Medium risk with decent returns. Good for 5-15 year goals."
  },
  aggressive: { 
    label: "Aggressive", 
    color: "text-red-600", 
    bg: "bg-red-50",
    tooltip: "Higher equity allocation. Higher returns potential but more volatile. Best for long-term goals (15+ years)."
  },
};

export default function AllocationPage() {
  const { user } = useAuth({ redirectOnUnauthenticated: true });
  const utils = trpc.useUtils();

  const { data: allocations, refetch } = trpc.allocation.generate.useQuery(undefined, {
    enabled: !!user,
  });

  const { data: goals } = trpc.goals.list.useQuery(undefined, {
    enabled: !!user,
  });

  const handleRefresh = () => {
    utils.allocation.generate.invalidate();
    refetch();
  };

  const aggregated = allocations?.reduce((acc, curr) => {
    const existing = acc.find((a) => a.assetClass === curr.assetClass);
    if (existing) {
      existing.recommendedAmount += curr.recommendedAmount;
      existing.allocationPercent += curr.allocationPercent;
    } else {
      acc.push({
        assetClass: curr.assetClass,
        recommendedAmount: curr.recommendedAmount,
        allocationPercent: curr.allocationPercent,
        expectedReturn: curr.expectedReturn,
      });
    }
    return acc;
  }, [] as Array<{ assetClass: string; recommendedAmount: number; allocationPercent: number; expectedReturn: number }>);

  const pieData = aggregated?.map((a) => ({
    name: assetClassLabels[a.assetClass] ?? a.assetClass,
    value: a.recommendedAmount,
    percent: a.allocationPercent,
  })) ?? [];

  return (
    <TooltipProvider delayDuration={300}>
      <div className="max-w-6xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-2xl font-bold text-[#0f1a2e]">Investment Allocation</h1>
            <p className="text-muted-foreground mt-1">
              Asset class recommendations tailored to your goals and time horizons
            </p>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" onClick={handleRefresh}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Recalculate
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              <p>Regenerate allocations based on your latest goals and profile</p>
            </TooltipContent>
          </Tooltip>
        </motion.div>

        {(!allocations || allocations.length === 0) && (
          <Card className="border-dashed border-2">
            <CardContent className="p-8 text-center">
              <AlertCircle className="w-8 h-8 text-[#d4a843] mx-auto mb-3" />
              <h3 className="font-semibold text-[#0f1a2e] mb-1">No Allocations Available</h3>
              <p className="text-sm text-muted-foreground">
                Create financial goals first to generate personalized asset allocation recommendations.
              </p>
            </CardContent>
          </Card>
        )}

        {allocations && allocations.length > 0 && (
          <>
            {/* Overall Allocation Pie Chart */}
            <div className="grid lg:grid-cols-2 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card>
                  <CardHeader className="pb-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <CardTitle className="text-lg cursor-help flex items-center gap-2">
                          Overall Asset Allocation
                          <Info className="w-3.5 h-3.5 text-muted-foreground/40" />
                        </CardTitle>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs text-xs">
                        <p>Combined allocation across all your goals. Hover over the legend items to learn about each asset class.</p>
                      </TooltipContent>
                    </Tooltip>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <RePieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            {pieData.map((_, index) => (
                              <Cell key={index} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <ReTooltip
                            formatter={(value: unknown, name: unknown) => [
                              formatCurrency(value as number),
                              name as string,
                            ]}
                          />
                          <Legend />
                        </RePieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

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
                          Allocation Summary
                          <Info className="w-3.5 h-3.5 text-muted-foreground/40" />
                        </CardTitle>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs text-xs">
                        <p>Percentage and amount allocation per asset class. Hover over each bar for more details.</p>
                      </TooltipContent>
                    </Tooltip>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {aggregated?.map((item, i) => {
                        const total = aggregated.reduce((s, a) => s + a.allocationPercent, 0);
                        const percent = total > 0 ? (item.allocationPercent / total) * 100 : 0;
                        return (
                          <Tooltip key={item.assetClass}>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-3 cursor-help">
                                <div
                                  className="w-3 h-3 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-medium truncate">
                                      {assetClassLabels[item.assetClass] ?? item.assetClass}
                                    </span>
                                    <span className="text-sm font-semibold">
                                      {percent.toFixed(1)}%
                                    </span>
                                  </div>
                                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                                    <div
                                      className="h-full rounded-full transition-all"
                                      style={{
                                        width: `${percent}%`,
                                        backgroundColor: COLORS[i % COLORS.length],
                                      }}
                                    />
                                  </div>
                                  <div className="flex items-center justify-between mt-1">
                                    <span className="text-xs text-muted-foreground">
                                      {formatCurrency(item.recommendedAmount)}
                                    </span>
                                    <span className="text-xs text-emerald-600">
                                      {Number(item.expectedReturn).toFixed(1)}% expected return
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="max-w-xs text-xs">
                              <p className="font-medium">{assetClassLabels[item.assetClass]}</p>
                              <p>{assetClassTooltips[item.assetClass]}</p>
                              <p className="mt-1 text-[#d4a843]">Recommended: {formatCurrency(item.recommendedAmount)}</p>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Per-Goal Allocations */}
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
                        Goal-Based Allocations
                        <Info className="w-3.5 h-3.5 text-muted-foreground/40" />
                      </CardTitle>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs text-xs">
                      <p>Each goal gets its own asset mix based on timeline and priority. Shorter goals = safer assets. Longer goals = more equity.</p>
                    </TooltipContent>
                  </Tooltip>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {goals?.map((goal) => {
                      const goalAllocs = allocations.filter((a) => a.goalId === goal.id);
                      if (goalAllocs.length === 0) return null;

                      const riskLevel = goalAllocs[0]?.riskLevel ?? "moderate";
                      const riskInfo = riskLabels[riskLevel] ?? riskLabels.moderate;

                      return (
                        <div key={goal.id} className="border-b border-border/50 last:border-0 pb-6 last:pb-0">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-[#1a2744] flex items-center justify-center">
                                <Target className="w-4 h-4 text-[#d4a843]" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-[#0f1a2e]">{goal.name}</h3>
                                <p className="text-xs text-muted-foreground">
                                  {goal.timelineYears} years · {formatCurrency(goal.targetAmount)} target
                                </p>
                              </div>
                            </div>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className={`text-xs px-2 py-1 rounded-full ${riskInfo.bg} ${riskInfo.color} cursor-help`}>
                                  {riskInfo.label} Risk
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="left" className="max-w-xs text-xs">
                                <p>{riskInfo.tooltip}</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>

                          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {goalAllocs.map((alloc, i) => (
                              <Tooltip key={alloc.id}>
                                <TooltipTrigger asChild>
                                  <div className="p-3 rounded-xl bg-muted/50 border border-border/30 cursor-help hover:bg-muted/80 transition-colors">
                                    <div className="flex items-center gap-2 mb-2">
                                      <div
                                        className="w-2 h-2 rounded-full"
                                        style={{ backgroundColor: COLORS[i % COLORS.length] }}
                                      />
                                      <span className="text-sm font-medium">
                                        {assetClassLabels[alloc.assetClass] ?? alloc.assetClass}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm text-muted-foreground">
                                        {formatCurrency(alloc.recommendedAmount)}
                                      </span>
                                      <span className="text-sm font-semibold text-[#d4a843]">
                                        {Number(alloc.allocationPercent).toFixed(0)}%
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1 mt-1">
                                      <TrendingUp className="w-3 h-3 text-emerald-500" />
                                      <span className="text-xs text-emerald-600">
                                        {Number(alloc.expectedReturn).toFixed(1)}% return
                                      </span>
                                    </div>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="max-w-xs text-xs">
                                  <p className="font-medium">{assetClassLabels[alloc.assetClass]}</p>
                                  <p>{assetClassTooltips[alloc.assetClass]}</p>
                                  <p className="mt-1">Recommended amount: {formatCurrency(alloc.recommendedAmount)}</p>
                                  <p>Expected return: {alloc.expectedReturn}%</p>
                                </TooltipContent>
                              </Tooltip>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </>
        )}
      </div>
    </TooltipProvider>
  );
}
