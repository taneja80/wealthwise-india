import { useState, useEffect } from "react";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { motion } from "framer-motion";
import {
  Search,
  TrendingUp,
  TrendingDown,
  Minus,
  Building2,
  IndianRupee,
  BarChart3,
  Plus,
  Check,
  GitCompareArrows,
  X,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer,
} from "recharts";
import { formatNumber } from "@/lib/format";
import { toast } from "sonner";

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;
  return (
    <div className="bg-white p-2.5 rounded-lg shadow-lg border border-border/50 text-sm">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="font-semibold">₹{payload[0]?.value}</p>
    </div>
  );
};

function ReturnBadge({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs text-muted-foreground">—</span>;
  const color = value > 0 ? "text-emerald-600" : value < 0 ? "text-red-500" : "text-muted-foreground";
  const Icon = value > 0 ? TrendingUp : value < 0 ? TrendingDown : Minus;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${color}`}>
      <Icon className="w-3 h-3" />
      {value > 0 ? "+" : ""}{value}%
    </span>
  );
}

export default function MFSearchPage() {
  const { user } = useAuth({ redirectOnUnauthenticated: true });
  const [query, setQuery] = useState("");
  const [selectedScheme, setSelectedScheme] = useState<string | null>(null);
  const [addedCodes, setAddedCodes] = useState<Set<string>>(new Set());
  const [compareCodes, setCompareCodes] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);

  const debouncedQuery = useDebounce(query.trim(), 300);
  const searchTerm = debouncedQuery.length >= 2 ? debouncedQuery : "";

  const { data: results, isFetching } = trpc.mf.search.useQuery(
    { query: searchTerm, limit: 50 },
    { enabled: searchTerm.length >= 2 },
  );

  const { data: detail, isFetching: detailLoading } = trpc.mf.details.useQuery(
    { schemeCode: selectedScheme! },
    { enabled: !!selectedScheme },
  );

  const compareDetail0 = trpc.mf.details.useQuery({ schemeCode: compareCodes[0] ?? "" }, { enabled: showCompare && compareCodes.length > 0 });
  const compareDetail1 = trpc.mf.details.useQuery({ schemeCode: compareCodes[1] ?? "" }, { enabled: showCompare && compareCodes.length > 1 });
  const compareDetail2 = trpc.mf.details.useQuery({ schemeCode: compareCodes[2] ?? "" }, { enabled: showCompare && compareCodes.length > 2 });
  const compareDetails = [compareDetail0.data, compareDetail1.data, compareDetail2.data].filter(Boolean);
  const compareLoading = [compareDetail0, compareDetail1, compareDetail2].some((q) => q.isFetching);

  const toggleCompare = (code: string) => {
    setCompareCodes((prev) => {
      if (prev.includes(code)) return prev.filter((c) => c !== code);
      if (prev.length >= 3) { toast.info("Max 3 schemes for comparison"); return prev; }
      return [...prev, code];
    });
  };

  const { data: fundHouses } = trpc.mf.fundHouses.useQuery();

  const utils = trpc.useUtils();
  const addHoldingMutation = trpc.asset.createHolding.useMutation({
    onSuccess: (_data, variables) => {
      toast.success(`${variables.instrument} added to portfolio`);
      setAddedCodes((prev) => new Set(prev).add(variables.schemeCode!));
      utils.asset.listHoldings.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleAddToPortfolio = () => {
    if (!detail) return;
    const nav = parseFloat(detail.latestNav);
    addHoldingMutation.mutate({
      assetClass: "equity",
      instrument: detail.schemeName,
      currentValue: 0,
      monthlySip: 0,
      expectedReturn: detail.performance["3Y"] ?? detail.performance["1Y"] ?? 10,
      riskScore: 5,
      taxTreatment: "equity_ltcg",
      schemeCode: detail.schemeCode,
    });
  };

  const handleSearch = () => {
    // Kept for Enter key / button click — instant override of debounce
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && query.trim().length >= 2) {
      // Force immediate search by setting query directly
    }
  };

  const chartData = detail?.navHistory
    ? [...detail.navHistory]
        .reverse()
        .map((d) => ({ date: d.date, nav: parseFloat(d.nav) }))
    : [];

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-4 lg:p-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-[#0f1a2e] flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-[#d4a843]" />
          Mutual Fund Search
        </h1>
        <p className="text-muted-foreground mt-1">
          Search 10,000+ mutual fund schemes from AMFI with live NAV data
        </p>
      </motion.div>

      {/* Search bar */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-2">
              <Input
                placeholder="Search by scheme name, fund house, or keyword..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="text-base"
              />
              <Button onClick={handleSearch} disabled={query.trim().length < 2 || isFetching}>
                <Search className="w-4 h-4 mr-1" />
                {isFetching ? "Searching..." : "Search"}
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {["SBI Bluechip", "HDFC Mid-Cap", "Axis ELSS", "Parag Parikh Flexi", "Nifty 50 Index", "Liquid Fund"].map(
                (suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setQuery(suggestion)}
                    className="text-xs px-2.5 py-1 rounded-full border hover:border-[#d4a843] hover:bg-[#d4a843]/5 transition-colors"
                  >
                    {suggestion}
                  </button>
                ),
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Results */}
      {results && results.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  {results.length} schemes found
                </CardTitle>
                {compareCodes.length >= 2 && (
                  <Button
                    size="sm"
                    onClick={() => setShowCompare(true)}
                    className="bg-[#d4a843] hover:bg-[#c49a3a] text-white"
                  >
                    <GitCompareArrows className="w-4 h-4 mr-1" />
                    Compare ({compareCodes.length})
                  </Button>
                )}
              </div>
              {compareCodes.length > 0 && compareCodes.length < 2 && (
                <p className="text-xs text-muted-foreground">Select at least 2 schemes to compare</p>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-1 max-h-[500px] overflow-y-auto">
                {results.map((scheme) => (
                  <div
                    key={scheme.schemeCode}
                    className="flex items-center gap-2 p-3 rounded-lg hover:bg-muted/50 transition-colors border-b border-border/30 last:border-0"
                  >
                    <Checkbox
                      checked={compareCodes.includes(scheme.schemeCode)}
                      onCheckedChange={() => toggleCompare(scheme.schemeCode)}
                      className="flex-shrink-0"
                    />
                    <button
                      onClick={() => setSelectedScheme(scheme.schemeCode)}
                      className="w-full text-left"
                    >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{scheme.schemeName}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{scheme.fundHouse}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-semibold">₹{scheme.nav}</p>
                        <p className="text-xs text-muted-foreground">{scheme.date}</p>
                      </div>
                    </div>
                    {scheme.schemeCategory && (
                      <Badge variant="outline" className="mt-1.5 text-xs">
                        {scheme.schemeCategory}
                      </Badge>
                    )}
                  </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {results && results.length === 0 && searchTerm && (
        <Card>
          <CardContent className="p-8 text-center">
            <Search className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No schemes found for "{searchTerm}"</p>
          </CardContent>
        </Card>
      )}

      {/* Fund houses grid (shown when no search) */}
      {!searchTerm && fundHouses && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Top Fund Houses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {fundHouses.slice(0, 20).map((fh) => (
                  <button
                    key={fh.name}
                    onClick={() => {
                      const short = fh.name.split(" ").slice(0, 2).join(" ");
                      setQuery(short);
                    }}
                    className="p-3 rounded-lg border hover:border-[#d4a843] hover:bg-[#d4a843]/5 transition-all text-left"
                  >
                    <p className="text-sm font-medium truncate">{fh.name}</p>
                    <p className="text-xs text-muted-foreground">{fh.schemeCount} schemes</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Scheme detail dialog */}
      <Dialog open={!!selectedScheme} onOpenChange={(open) => !open && setSelectedScheme(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {detailLoading ? (
            <div className="py-12 text-center text-muted-foreground">Loading scheme details...</div>
          ) : detail ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg leading-tight">{detail.schemeName}</DialogTitle>
                <p className="text-sm text-muted-foreground">{detail.fundHouse}</p>
              </DialogHeader>

              <div className="space-y-4 mt-2">
                {/* NAV + badges */}
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <IndianRupee className="w-4 h-4 text-[#d4a843]" />
                    <span className="text-2xl font-bold">{detail.latestNav}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">as on {detail.latestDate}</span>
                  {detail.schemeCategory && (
                    <Badge variant="outline">{detail.schemeCategory}</Badge>
                  )}
                  {detail.schemeType && (
                    <Badge variant="secondary" className="text-xs">{detail.schemeType}</Badge>
                  )}
                </div>

                {/* Performance grid */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {Object.entries(detail.performance).map(([period, ret]) => (
                    <div key={period} className="text-center p-2 rounded-lg bg-muted/30">
                      <p className="text-xs text-muted-foreground mb-0.5">{period}</p>
                      <ReturnBadge value={ret} />
                    </div>
                  ))}
                </div>

                {/* NAV chart */}
                {chartData.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">NAV Trend (Last 3 months)</p>
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis
                            dataKey="date"
                            tick={{ fontSize: 10 }}
                            interval="preserveStartEnd"
                          />
                          <YAxis
                            tick={{ fontSize: 10 }}
                            domain={["auto", "auto"]}
                            tickFormatter={(v) => `₹${v}`}
                          />
                          <ReTooltip content={<CustomTooltip />} />
                          <Area
                            type="monotone"
                            dataKey="nav"
                            stroke="#d4a843"
                            fill="#d4a843"
                            fillOpacity={0.1}
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Scheme info */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Scheme Code</p>
                    <p className="font-medium">{detail.schemeCode}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Type</p>
                    <p className="font-medium">{detail.schemeType || "—"}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">Category</p>
                    <p className="font-medium">{detail.schemeCategory || "—"}</p>
                  </div>
                </div>

                {/* Add to Portfolio */}
                <Button
                  className="w-full bg-[#1a2744] hover:bg-[#1a2744]/90"
                  disabled={addHoldingMutation.isPending || addedCodes.has(detail.schemeCode)}
                  onClick={handleAddToPortfolio}
                >
                  {addedCodes.has(detail.schemeCode) ? (
                    <><Check className="w-4 h-4 mr-2" />Added to Portfolio</>
                  ) : addHoldingMutation.isPending ? (
                    "Adding..."
                  ) : (
                    <><Plus className="w-4 h-4 mr-2" />Add to Portfolio</>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              Could not load scheme details. Please try again.
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Comparison Dialog */}
      <Dialog open={showCompare} onOpenChange={(open) => !open && setShowCompare(false)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitCompareArrows className="w-5 h-5 text-[#d4a843]" />
              Scheme Comparison
            </DialogTitle>
          </DialogHeader>
          {compareLoading ? (
            <div className="py-12 text-center text-muted-foreground">Loading comparison data...</div>
          ) : compareDetails.length >= 2 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 text-muted-foreground font-medium">Attribute</th>
                    {compareDetails.map((d) => (
                      <th key={d!.schemeCode} className="text-left p-2 font-medium max-w-[200px]">
                        <span className="text-xs leading-tight block">{d!.schemeName}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="p-2 text-muted-foreground">NAV</td>
                    {compareDetails.map((d) => <td key={d!.schemeCode} className="p-2 font-semibold">₹{d!.latestNav}</td>)}
                  </tr>
                  <tr className="border-b">
                    <td className="p-2 text-muted-foreground">Category</td>
                    {compareDetails.map((d) => <td key={d!.schemeCode} className="p-2">{d!.schemeCategory ?? "—"}</td>)}
                  </tr>
                  <tr className="border-b">
                    <td className="p-2 text-muted-foreground">Type</td>
                    {compareDetails.map((d) => <td key={d!.schemeCode} className="p-2">{d!.schemeType ?? "—"}</td>)}
                  </tr>
                  <tr className="border-b">
                    <td className="p-2 text-muted-foreground">Fund House</td>
                    {compareDetails.map((d) => <td key={d!.schemeCode} className="p-2">{d!.fundHouse}</td>)}
                  </tr>
                  {["1M", "3M", "6M", "1Y", "3Y", "5Y"].map((period) => (
                    <tr key={period} className="border-b">
                      <td className="p-2 text-muted-foreground">{period} Return</td>
                      {compareDetails.map((d) => (
                        <td key={d!.schemeCode} className="p-2">
                          <ReturnBadge value={d!.performance[period] ?? null} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">Select at least 2 schemes to compare.</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
