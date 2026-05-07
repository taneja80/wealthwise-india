import { useState, useMemo } from "react";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowLeftRight, RefreshCw, IndianRupee, Globe } from "lucide-react";
import { formatNumber } from "@/lib/format";

export default function CurrencyPage() {
  const [amount, setAmount] = useState(1000);
  const [fromCurrency, setFromCurrency] = useState("USD");
  const [toCurrency, setToCurrency] = useState("INR");

  const { data: currencies } = trpc.currency.list.useQuery();
  const { data: ratesData, refetch: refetchRates, isFetching: ratesFetching } =
    trpc.currency.rates.useQuery();

  const { data: conversion } = trpc.currency.convert.useQuery(
    { amount, from: fromCurrency, to: toCurrency },
    { enabled: amount > 0 },
  );

  const swap = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  const rates = ratesData?.rates ?? {};
  const currencyList = currencies ?? [];

  // Popular cross rates for the selected "from" currency
  const crossRates = useMemo(() => {
    const popular = ["INR", "USD", "EUR", "GBP", "AED", "SGD", "JPY", "CAD", "AUD"];
    const fromRate = rates[fromCurrency] ?? 1;
    return popular
      .filter((c) => c !== fromCurrency)
      .map((code) => {
        const toRate = rates[code] ?? 1;
        return {
          code,
          meta: currencyList.find((c) => c.code === code),
          rate: fromRate / toRate,
        };
      });
  }, [fromCurrency, rates, currencyList]);

  const fromMeta = currencyList.find((c) => c.code === fromCurrency);
  const toMeta = currencyList.find((c) => c.code === toCurrency);

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4 lg:p-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-[#0f1a2e] flex items-center gap-2">
          <Globe className="w-6 h-6 text-[#d4a843]" />
          Currency Converter
        </h1>
        <p className="text-muted-foreground mt-1">
          Convert between 20 currencies with live exchange rates
        </p>
      </motion.div>

      {/* Main Converter */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardContent className="p-6">
            <div className="grid md:grid-cols-[1fr,auto,1fr] gap-4 items-end">
              {/* From */}
              <div className="space-y-2">
                <Label>From</Label>
                <Select value={fromCurrency} onValueChange={setFromCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencyList.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.flag} {c.code} — {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
                  className="text-lg font-semibold"
                />
                {fromMeta && (
                  <p className="text-xs text-muted-foreground">
                    {fromMeta.symbol} {formatNumber(amount)}
                  </p>
                )}
              </div>

              {/* Swap */}
              <div className="flex justify-center pb-6">
                <Button variant="outline" size="icon" onClick={swap} className="rounded-full">
                  <ArrowLeftRight className="w-4 h-4" />
                </Button>
              </div>

              {/* To */}
              <div className="space-y-2">
                <Label>To</Label>
                <Select value={toCurrency} onValueChange={setToCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencyList.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.flag} {c.code} — {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="h-[40px] flex items-center rounded-md border bg-muted/30 px-3">
                  <span className="text-lg font-semibold text-[#d4a843]">
                    {conversion ? formatNumber(conversion.converted) : "—"}
                  </span>
                </div>
                {toMeta && conversion && (
                  <p className="text-xs text-muted-foreground">
                    {toMeta.symbol} {formatNumber(conversion.converted)}
                  </p>
                )}
              </div>
            </div>

            {/* Rate info */}
            {conversion && !("error" in conversion && conversion.error) && (
              <div className="mt-4 pt-4 border-t flex flex-wrap items-center justify-between gap-2 text-sm">
                <div className="space-y-1">
                  <p className="text-muted-foreground">
                    1 {fromCurrency} = <span className="font-semibold text-foreground">{conversion.rate} {toCurrency}</span>
                  </p>
                  {toCurrency !== "INR" && fromCurrency !== "INR" && (
                    <p className="text-muted-foreground">
                      <IndianRupee className="w-3 h-3 inline" /> INR equivalent:{" "}
                      <span className="font-semibold text-foreground">₹{formatNumber(conversion.inrEquivalent)}</span>
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => refetchRates()}
                  disabled={ratesFetching}
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-1 ${ratesFetching ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Cross rates grid */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {fromCurrency} Cross Rates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {crossRates.map((cr) => (
                <button
                  key={cr.code}
                  onClick={() => setToCurrency(cr.code)}
                  className={`p-3 rounded-lg border text-left transition-all hover:border-[#d4a843] hover:bg-[#d4a843]/5 ${
                    toCurrency === cr.code ? "border-[#d4a843] bg-[#d4a843]/5" : ""
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{cr.meta?.flag}</span>
                    <span className="font-medium text-sm">{cr.code}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    1 {fromCurrency} = {cr.rate.toFixed(4)}
                  </p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick amounts */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quick Conversions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-2 font-medium">{fromCurrency}</th>
                    <th className="text-right py-2 font-medium">{toCurrency}</th>
                    {toCurrency !== "INR" && fromCurrency !== "INR" && (
                      <th className="text-right py-2 font-medium">INR</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {[1, 10, 100, 500, 1000, 5000, 10000, 50000, 100000].map((qty) => {
                    const fromRate = rates[fromCurrency] ?? 1;
                    const toRate = rates[toCurrency] ?? 1;
                    const converted = qty * (fromRate / toRate);
                    const inr = qty * fromRate;
                    return (
                      <tr key={qty} className="border-b border-border/30">
                        <td className="py-1.5">{fromMeta?.symbol}{formatNumber(qty)}</td>
                        <td className="text-right font-medium">
                          {toMeta?.symbol}{formatNumber(Math.round(converted * 100) / 100)}
                        </td>
                        {toCurrency !== "INR" && fromCurrency !== "INR" && (
                          <td className="text-right text-muted-foreground">
                            ₹{formatNumber(Math.round(inr * 100) / 100)}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {ratesData && (
        <p className="text-xs text-center text-muted-foreground">
          Rates last updated: {new Date(ratesData.updatedAt).toLocaleString("en-IN")}
        </p>
      )}
    </div>
  );
}
