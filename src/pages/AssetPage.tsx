import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  TooltipProvider,
} from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import {
  Landmark,
  Plus,
  Trash2,
  TrendingUp,
  AlertCircle,
  BarChart3,
  Target,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  Legend,
  ScatterChart,
  Scatter,
} from "recharts";
import { formatCurrency, formatCompact } from "@/lib/format";

const assetClassColors: Record<string, string> = {
  equity: "#1a2744",
  debt: "#d4a843",
  gold: "#f59e0b",
  real_estate: "#10b981",
  liquid: "#3b82f6",
  international: "#8b5cf6",
};

const assetClassNames: Record<string, string> = {
  equity: "Equity / Mutual Funds",
  debt: "Debt / FD / PPF",
  gold: "Gold / ETFs",
  real_estate: "Real Estate / REITs",
  liquid: "Liquid / Savings",
  international: "International Equity",
};

const taxTreatmentLabels: Record<string, string> = {
  equity_ltcg: "Equity LTCG (10% > ₹1L)",
  debt_interest: "Interest Income (Slab)",
  debt_ltcg: "Debt LTCG (20% indexed)",
  gold_ltcg: "Gold LTCG (20% indexed)",
  real_estate_ltcg: "RE LTCG (20% indexed)",
  tax_free: "Tax Free",
  epf_tax_deferred: "EPF (Tax Deferred)",
};

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

export default function AssetPage() {
  useAuth({ redirectOnUnauthenticated: true });
  const utils = trpc.useUtils();
  const { data: holdings } = trpc.asset.listHoldings.useQuery();
  const { data: projections } = trpc.asset.projectByAssetClass.useQuery();
  const { data: frontier } = trpc.asset.getEfficientFrontier.useQuery();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    assetClass: "equity" as const,
    instrument: "",
    currentValue: "",
    monthlySip: "",
    expectedReturn: "12",
    taxTreatment: "equity_ltcg" as const,
  });

  const createHolding = trpc.asset.createHolding.useMutation({
    onSuccess: () => {
      utils.asset.listHoldings.invalidate();
      utils.asset.projectByAssetClass.invalidate();
      utils.asset.getEfficientFrontier.invalidate();
      setDialogOpen(false);
      setForm({ assetClass: "equity", instrument: "", currentValue: "", monthlySip: "", expectedReturn: "12", taxTreatment: "equity_ltcg" });
    },
  });

  const deleteHolding = trpc.asset.deleteHolding.useMutation({
    onSuccess: () => {
      utils.asset.listHoldings.invalidate();
      utils.asset.projectByAssetClass.invalidate();
    },
  });

  const totalValue = holdings?.reduce((s, h) => s + Number(h.currentValue), 0) ?? 0;
  const totalSip = holdings?.reduce((s, h) => s + Number(h.monthlySip), 0) ?? 0;

  // Build chart data from projections
  const chartDataMap: Record<number, Record<string, number>> = {};
  projections?.projections.forEach(p => {
    if (!chartDataMap[p.year]) chartDataMap[p.year] = { year: p.year };
    chartDataMap[p.year][p.assetClass] = p.projectedValue;
  });
  const chartData = Object.values(chartDataMap).sort((a: any, b: any) => a.year - b.year);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="max-w-6xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#1a2744] flex items-center justify-center">
              <Landmark className="w-4 h-4 text-[#d4a843]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#0f1a2e]">Asset Classes</h1>
              <p className="text-muted-foreground text-sm">Track holdings, project growth, and optimize with CAPM</p>
            </div>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#1a2744] hover:bg-[#1a2744]/90">
                <Plus className="w-4 h-4 mr-1" /> Add Holding
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Add Investment Holding</DialogTitle></DialogHeader>
              <div className="space-y-3 pt-2">
                <div className="space-y-2">
                  <Label>Asset Class</Label>
                  <Select value={form.assetClass} onValueChange={(v) => setForm({ ...form, assetClass: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(assetClassNames).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Instrument Name</Label>
                  <Input placeholder="e.g., Nifty 50 Index Fund" value={form.instrument} onChange={(e) => setForm({ ...form, instrument: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Current Value (₹)</Label>
                    <Input type="number" placeholder="1,00,000" value={form.currentValue} onChange={(e) => setForm({ ...form, currentValue: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Monthly SIP (₹)</Label>
                    <Input type="number" placeholder="10,000" value={form.monthlySip} onChange={(e) => setForm({ ...form, monthlySip: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Expected Return (%)</Label>
                    <Input type="number" placeholder="12" value={form.expectedReturn} onChange={(e) => setForm({ ...form, expectedReturn: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Tax Treatment</Label>
                    <Select value={form.taxTreatment} onValueChange={(v) => setForm({ ...form, taxTreatment: v as any })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(taxTreatmentLabels).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={() => createHolding.mutate({
                  assetClass: form.assetClass,
                  instrument: form.instrument,
                  currentValue: Number(form.currentValue),
                  monthlySip: Number(form.monthlySip) || 0,
                  expectedReturn: Number(form.expectedReturn),
                  taxTreatment: form.taxTreatment,
                })} disabled={createHolding.isPending || !form.instrument || !form.currentValue} className="w-full bg-[#1a2744]">
                  {createHolding.isPending ? "Adding..." : "Add Holding"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </motion.div>

        {/* Summary Stats */}
        <div className="grid sm:grid-cols-3 gap-4">
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Holdings</p>
            <p className="text-2xl font-bold text-[#0f1a2e]">{formatCurrency(totalValue)}</p>
            <p className="text-xs text-muted-foreground">{holdings?.length ?? 0} instruments</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Monthly SIP</p>
            <p className="text-2xl font-bold text-[#0f1a2e]">{formatCurrency(totalSip)}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Optimal Portfolio Return</p>
            <p className="text-2xl font-bold text-[#d4a843]">{projections?.optimalPortfolio.expectedReturn ?? 0}%</p>
            <p className="text-xs text-muted-foreground">Risk: {projections?.optimalPortfolio.volatility ?? 0}%</p>
          </CardContent></Card>
        </div>

        <Tabs defaultValue="holdings">
          <TabsList>
            <TabsTrigger value="holdings">Holdings</TabsTrigger>
            <TabsTrigger value="projections">Projections</TabsTrigger>
            <TabsTrigger value="frontier">Efficient Frontier</TabsTrigger>
            <TabsTrigger value="optimal">Optimal Allocation</TabsTrigger>
          </TabsList>

          <TabsContent value="holdings" className="space-y-4 mt-4">
            {!holdings || holdings.length === 0 ? (
              <Card className="border-dashed border-2"><CardContent className="p-8 text-center">
                <AlertCircle className="w-8 h-8 text-[#d4a843] mx-auto mb-2" />
                <p className="text-muted-foreground">Add your investment holdings to track and project their growth</p>
              </CardContent></Card>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {holdings.map((h) => (
                  <Card key={h.id} className="hover:shadow-md transition-all">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: assetClassColors[h.assetClass] }} />
                          <span className="text-xs font-medium text-muted-foreground">{assetClassNames[h.assetClass]}</span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteHolding.mutate({ id: h.id })}>
                          <Trash2 className="w-3 h-3 text-red-400" />
                        </Button>
                      </div>
                      <p className="font-semibold text-sm mb-1">{h.instrument}</p>
                      <p className="text-lg font-bold text-[#0f1a2e]">{formatCurrency(h.currentValue)}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        {Number(h.monthlySip) > 0 && <span>SIP: {formatCurrency(h.monthlySip)}/mo</span>}
                        <span className="text-emerald-600">{h.expectedReturn}% return</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="projections" className="mt-4">
            {chartData.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#d4a843]" />
                    Asset Class Projections
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData.slice(0, 20)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="year" stroke="#94a3b8" fontSize={12} />
                        <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => formatCompact(v)} />
                        <ReTooltip content={<CustomTooltip />} />
                        <Legend />
                        {projections?.assetClasses.map((ac) => (
                          <Area key={ac.class} type="monotone" dataKey={ac.class} name={ac.name}
                            stroke={assetClassColors[ac.class]} fill={assetClassColors[ac.class]} fillOpacity={0.1} strokeWidth={2} />
                        ))}
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="frontier" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[#d4a843]" />
                  Efficient Frontier (Risk vs Return)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="volatility" name="Volatility (%)" stroke="#94a3b8" fontSize={12} label={{ value: "Risk (Volatility %)", position: "insideBottom", offset: -5, fontSize: 12 }} />
                      <YAxis dataKey="return" name="Return (%)" stroke="#94a3b8" fontSize={12} label={{ value: "Expected Return %", angle: -90, position: "insideLeft", fontSize: 12 }} />
                      <ReTooltip formatter={(value: any, name: any) => [`${value}%`, name]} />
                      <Scatter data={frontier ?? []} fill="#d4a843">
                        {(frontier ?? []).map((entry: any, index: number) => (
                          <circle key={index} r={8} fill={entry.risk === "high" ? "#ef4444" : entry.risk === "medium" ? "#d4a843" : "#10b981"} />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center justify-center gap-4 mt-3 text-xs">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Low Risk</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#d4a843]" /> Medium Risk</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> High Risk</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="optimal" className="mt-4">
            {projections && (
              <div className="grid lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Target className="w-4 h-4 text-[#d4a843]" />
                      Optimal Portfolio
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-muted/50 rounded-lg"><p className="text-xs text-muted-foreground">Expected Return</p><p className="text-lg font-bold text-emerald-600">{projections.optimalPortfolio.expectedReturn}%</p></div>
                      <div className="p-3 bg-muted/50 rounded-lg"><p className="text-xs text-muted-foreground">Volatility</p><p className="text-lg font-bold text-[#d4a843]">{projections.optimalPortfolio.volatility}%</p></div>
                      <div className="p-3 bg-muted/50 rounded-lg"><p className="text-xs text-muted-foreground">Sharpe Ratio</p><p className="text-lg font-bold text-blue-600">{projections.optimalPortfolio.sharpeRatio}</p></div>
                      <div className="p-3 bg-muted/50 rounded-lg"><p className="text-xs text-muted-foreground">Risk Profile</p><p className="text-lg font-bold capitalize text-purple-600">{projections.optimalPortfolio.riskTolerance}</p></div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Recommended Weights</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {projections.assetClasses.map((ac) => {
                        const optimal = projections.optimalPortfolio.weights[ac.class] ?? 0;
                        return (
                          <div key={ac.class} className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: assetClassColors[ac.class] }} />
                            <span className="text-sm flex-1">{ac.name}</span>
                            <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${optimal}%`, backgroundColor: assetClassColors[ac.class] }} />
                            </div>
                            <span className="text-sm font-semibold w-10 text-right">{optimal}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
