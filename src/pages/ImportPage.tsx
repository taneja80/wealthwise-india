import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { motion } from "framer-motion";
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Trash2,
} from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { toast } from "sonner";

const assetClassNames: Record<string, string> = {
  equity: "Equity",
  debt: "Debt",
  gold: "Gold",
  real_estate: "Real Estate",
  liquid: "Liquid",
  international: "International",
};

const SAMPLE_CAS = `Scheme Name,Current Value,Monthly SIP
SBI Bluechip Fund - Growth,125000,5000
HDFC Mid-Cap Opportunities - Growth,85000,3000
ICICI Prudential Liquid Fund,50000,0
Axis Gold ETF,30000,1000
Motilal Oswal Nasdaq 100 FOF,45000,2000
HDFC Short Term Debt Fund,60000,0`;

type ParsedHolding = {
  instrument: string;
  currentValue: number;
  monthlySip: number;
  assetClass: string;
  taxTreatment: string;
  expectedReturn: number;
  riskScore: number;
};

export default function ImportPage() {
  useAuth({ redirectOnUnauthenticated: true });
  const utils = trpc.useUtils();

  const [rawText, setRawText] = useState("");
  const [preview, setPreview] = useState<ParsedHolding[]>([]);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [step, setStep] = useState<"paste" | "preview" | "done">("paste");

  const parseMutation = trpc.import.parseCAS.useMutation({
    onSuccess: (data) => {
      if (data.length === 0) {
        toast.error("No holdings found. Check the format and try again.");
        return;
      }
      setPreview(data);
      setStep("preview");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const importMutation = trpc.import.bulkImport.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.imported} holdings imported to your portfolio.`);
      setStep("done");
      utils.asset.listHoldings.invalidate();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const handleParse = () => {
    if (!rawText.trim()) return;
    parseMutation.mutate({ text: rawText });
  };

  const handleImport = () => {
    importMutation.mutate({
      holdings: preview.map((h) => ({
        instrument: h.instrument,
        currentValue: h.currentValue,
        monthlySip: h.monthlySip,
        assetClass: h.assetClass as any,
        expectedReturn: h.expectedReturn,
        riskScore: h.riskScore,
        taxTreatment: h.taxTreatment as any,
      })),
      replaceExisting,
    });
  };

  const removeRow = (index: number) => {
    setPreview((prev) => prev.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, field: string, value: string) => {
    setPreview((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    );
  };

  const totalValue = preview.reduce((sum, h) => sum + h.currentValue, 0);
  const totalSip = preview.reduce((sum, h) => sum + h.monthlySip, 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-4 lg:p-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-[#0f1a2e] flex items-center gap-2">
          <Upload className="w-6 h-6 text-[#d4a843]" />
          Import Portfolio
        </h1>
        <p className="text-muted-foreground mt-1">
          Paste your CDSL CAS statement, broker CSV, or a simple list of holdings
        </p>
      </motion.div>

      {step === "paste" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Paste Holdings Data
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-4 text-sm space-y-2">
                <p className="font-medium">Supported formats:</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li><strong>CDSL CAS</strong> — Copy-paste the mutual fund section from your statement</li>
                  <li><strong>CSV</strong> — <code>Scheme Name, Value, Monthly SIP</code> (one per line)</li>
                  <li><strong>Simple list</strong> — <code>Scheme Name - ₹1,25,000</code></li>
                </ul>
              </div>

              <div>
                <Label htmlFor="cas-text">Holdings Data</Label>
                <Textarea
                  id="cas-text"
                  placeholder="Paste your holdings here..."
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  rows={12}
                  className="mt-1 font-mono text-sm"
                />
              </div>

              <div className="flex items-center gap-3">
                <Button onClick={handleParse} disabled={!rawText.trim() || parseMutation.isPending}>
                  {parseMutation.isPending ? "Parsing..." : "Parse & Preview"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setRawText(SAMPLE_CAS)}
                >
                  Load Sample Data
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {step === "preview" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  Preview ({preview.length} holdings — Total: {formatCurrency(totalValue)})
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setStep("paste")}>
                  ← Back
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">Instrument</TableHead>
                      <TableHead>Asset Class</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                      <TableHead className="text-right">Monthly SIP</TableHead>
                      <TableHead className="text-right">Exp. Return</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium text-sm">{row.instrument}</TableCell>
                        <TableCell>
                          <Select
                            value={row.assetClass}
                            onValueChange={(v) => updateRow(i, "assetClass", v)}
                          >
                            <SelectTrigger className="w-[140px] h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(assetClassNames).map(([k, v]) => (
                                <SelectItem key={k} value={k}>{v}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(row.currentValue)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(row.monthlySip)}</TableCell>
                        <TableCell className="text-right">{row.expectedReturn}%</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeRow(i)}>
                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/30 font-semibold">
                      <TableCell>Total</TableCell>
                      <TableCell></TableCell>
                      <TableCell className="text-right">{formatCurrency(totalValue)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(totalSip)}/mo</TableCell>
                      <TableCell></TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between mt-6 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="replace"
                    checked={replaceExisting}
                    onCheckedChange={(v) => setReplaceExisting(v === true)}
                  />
                  <Label htmlFor="replace" className="text-sm">
                    Replace all existing holdings
                  </Label>
                </div>
                <Button onClick={handleImport} disabled={preview.length === 0 || importMutation.isPending}>
                  {importMutation.isPending ? "Importing..." : `Import ${preview.length} Holdings`}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {step === "done" && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <Card className="text-center py-12">
            <CardContent className="space-y-4">
              <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" />
              <h2 className="text-xl font-bold">Import Complete!</h2>
              <p className="text-muted-foreground">
                Your portfolio has been updated. Head to Asset Classes to view your holdings.
              </p>
              <div className="flex justify-center gap-3 mt-4">
                <Button variant="outline" onClick={() => { setStep("paste"); setRawText(""); setPreview([]); }}>
                  Import More
                </Button>
                <Button onClick={() => window.location.href = "/assets"}>
                  View Portfolio
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
