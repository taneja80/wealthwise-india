import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  ExternalLink,
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
  const [query, setQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedScheme, setSelectedScheme] = useState<string | null>(null);

  const { data: results, isFetching } = trpc.mf.search.useQuery(
    { query: searchTerm, limit: 50 },
    { enabled: searchTerm.length >= 2 },
  );

  const { data: detail, isFetching: detailLoading } = trpc.mf.details.useQuery(
    { schemeCode: selectedScheme! },
    { enabled: !!selectedScheme },
  );

  const { data: fundHouses } = trpc.mf.fundHouses.useQuery();

  const handleSearch = () => {
    if (query.trim().length >= 2) {
      setSearchTerm(query.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
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
                    onClick={() => {
                      setQuery(suggestion);
                      setSearchTerm(suggestion);
                    }}
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
              <CardTitle className="text-base">
                {results.length} schemes found
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 max-h-[500px] overflow-y-auto">
                {results.map((scheme) => (
                  <button
                    key={scheme.schemeCode}
                    onClick={() => setSelectedScheme(scheme.schemeCode)}
                    className="w-full text-left p-3 rounded-lg hover:bg-muted/50 transition-colors border-b border-border/30 last:border-0"
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
                      setSearchTerm(short);
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
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              Could not load scheme details. Please try again.
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
