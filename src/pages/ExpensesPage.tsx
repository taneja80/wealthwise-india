import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { PieChart, Save, TrendingDown, BarChart3 } from "lucide-react";
import {
  PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { formatCurrency, formatCompact } from "@/lib/format";
import { toast } from "sonner";

const CATEGORIES = [
  { key: "rent", label: "Rent/Housing", icon: "🏠" },
  { key: "groceries", label: "Groceries", icon: "🛒" },
  { key: "utilities", label: "Utilities", icon: "💡" },
  { key: "emi", label: "EMIs/Loans", icon: "🏦" },
  { key: "insurance", label: "Insurance", icon: "🛡️" },
  { key: "entertainment", label: "Entertainment", icon: "🎬" },
  { key: "education", label: "Education", icon: "📚" },
  { key: "healthcare", label: "Healthcare", icon: "🏥" },
  { key: "transport", label: "Transport", icon: "🚗" },
  { key: "subscriptions", label: "Subscriptions", icon: "📱" },
  { key: "shopping", label: "Shopping", icon: "🛍️" },
  { key: "dining", label: "Dining Out", icon: "🍽️" },
  { key: "other", label: "Other", icon: "📦" },
] as const;

const PIE_COLORS = [
  "#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#3b82f6",
  "#ec4899", "#14b8a6", "#f97316", "#06b6d4", "#84cc16", "#a855f7", "#64748b",
];

export default function ExpensesPage() {
  useAuth({ redirectOnUnauthenticated: true });
  const utils = trpc.useUtils();
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  );

  const { data: existing } = trpc.expense.list.useQuery({ month: selectedMonth });
  const { data: trend } = trpc.expense.trend.useQuery({ months: 6 });

  const [amounts, setAmounts] = useState<Record<string, string>>({});

  // Sync form with server data when it loads
  const initializedMonth = useMemo(() => {
    if (!existing) return null;
    const vals: Record<string, string> = {};
    for (const row of existing) {
      vals[row.category] = String(Number(row.amount));
    }
    return { month: selectedMonth, vals };
  }, [existing, selectedMonth]);

  const currentAmounts = useMemo(() => {
    if (initializedMonth && Object.keys(amounts).length === 0) return initializedMonth.vals;
    return amounts;
  }, [initializedMonth, amounts]);

  const upsertMutation = trpc.expense.upsert.useMutation({
    onSuccess: () => {
      toast.success("Expenses saved");
      utils.expense.list.invalidate();
      utils.expense.trend.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSave = () => {
    const categories = CATEGORIES
      .filter((c) => Number(currentAmounts[c.key]) > 0)
      .map((c) => ({
        category: c.key,
        amount: Number(currentAmounts[c.key]),
      }));
    upsertMutation.mutate({ month: selectedMonth, categories });
  };

  const totalExpenses = CATEGORIES.reduce((s, c) => s + (Number(currentAmounts[c.key]) || 0), 0);

  const pieData = CATEGORIES
    .map((c, i) => ({ name: c.label, value: Number(currentAmounts[c.key]) || 0, color: PIE_COLORS[i] }))
    .filter((d) => d.value > 0);

  // Month navigation
  const months: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-4 lg:p-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-[#0f1a2e] flex items-center gap-2">
          <PieChart className="w-6 h-6 text-[#d4a843]" />
          Expense Breakdown
        </h1>
        <p className="text-muted-foreground mt-1">
          Categorize your monthly expenses for better budgeting insights
        </p>
      </motion.div>

      {/* Month selector */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {months.map((m) => {
          const d = new Date(m + "-01");
          return (
            <button
              key={m}
              onClick={() => { setSelectedMonth(m); setAmounts({}); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                selectedMonth === m
                  ? "bg-[#0f1a2e] text-white"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              {d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" })}
            </button>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Category inputs */}
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Monthly Expenses</CardTitle>
                <span className="text-sm font-semibold text-[#d4a843]">{formatCurrency(totalExpenses)}</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {CATEGORIES.map((cat) => (
                  <div key={cat.key} className="flex items-center gap-2">
                    <span className="text-base w-6 text-center">{cat.icon}</span>
                    <Label className="text-xs flex-1 min-w-[80px]">{cat.label}</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      className="w-28 h-8 text-sm text-right"
                      value={currentAmounts[cat.key] ?? ""}
                      onChange={(e) => setAmounts({ ...currentAmounts, [cat.key]: e.target.value })}
                    />
                  </div>
                ))}
              </div>
              <Button
                className="w-full mt-4 bg-[#1a2744]"
                onClick={handleSave}
                disabled={upsertMutation.isPending}
              >
                <Save className="w-4 h-4 mr-1" />
                {upsertMutation.isPending ? "Saving..." : "Save Expenses"}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Charts */}
        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-3 space-y-4">
          {/* Pie chart */}
          {pieData.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-[#d4a843]" />
                  Expense Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {pieData.map((d) => (
                          <Cell key={d.name} fill={d.color} />
                        ))}
                      </Pie>
                      <ReTooltip
                        formatter={(value: string | number | readonly (string | number)[] | undefined, name: string | number | undefined) => {
                          const nextValue = Array.isArray(value) ? value[0] : value;
                          const numeric = typeof nextValue === "number" ? nextValue : Number(nextValue ?? 0);
                          return [formatCurrency(numeric), String(name ?? "Total")];
                        }}
                      />
                      <Legend
                        formatter={(value: string) => <span className="text-xs">{value}</span>}
                      />
                    </RePieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Trend chart */}
          {trend && trend.length >= 2 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[#d4a843]" />
                  Monthly Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 11 }}
                        tickFormatter={(m) => {
                          const d = new Date(m + "-01");
                          return d.toLocaleDateString("en-IN", { month: "short" });
                        }}
                      />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCompact(v)} />
                      <ReTooltip formatter={(value: string | number | readonly (string | number)[] | undefined) => {
                        const nextValue = Array.isArray(value) ? value[0] : value;
                        const numeric = typeof nextValue === "number" ? nextValue : Number(nextValue ?? 0);
                        return [formatCurrency(numeric), "Total"];
                      }} />
                      <Bar dataKey="total" fill="#d4a843" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
    </div>
  );
}
