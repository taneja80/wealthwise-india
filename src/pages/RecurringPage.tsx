import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { CalendarClock, Plus, Trash2, IndianRupee, CreditCard, Repeat, Wallet } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { toast } from "sonner";

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  sip: { label: "SIP", color: "bg-emerald-100 text-emerald-700" },
  emi: { label: "EMI", color: "bg-red-100 text-red-700" },
  subscription: { label: "Subscription", color: "bg-blue-100 text-blue-700" },
  insurance: { label: "Insurance", color: "bg-purple-100 text-purple-700" },
  rent: { label: "Rent", color: "bg-amber-100 text-amber-700" },
  other: { label: "Other", color: "bg-gray-100 text-gray-700" },
};

export default function RecurringPage() {
  useAuth({ redirectOnUnauthenticated: true });
  const utils = trpc.useUtils();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", type: "sip" as string, amount: "", frequency: "monthly" as string,
    dueDay: "1", startDate: new Date().toISOString().slice(0, 10), endDate: "", autoPay: false, notes: "",
  });

  const { data: transactions } = trpc.recurring.list.useQuery();
  const { data: upcoming } = trpc.recurring.upcoming.useQuery({ days: 30 });
  const { data: monthlyTotal } = trpc.recurring.monthlyTotal.useQuery();

  const createMutation = trpc.recurring.create.useMutation({
    onSuccess: () => {
      toast.success("Transaction added");
      utils.recurring.list.invalidate();
      utils.recurring.upcoming.invalidate();
      utils.recurring.monthlyTotal.invalidate();
      setDialogOpen(false);
      setForm({ name: "", type: "sip", amount: "", frequency: "monthly", dueDay: "1", startDate: new Date().toISOString().slice(0, 10), endDate: "", autoPay: false, notes: "" });
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.recurring.delete.useMutation({
    onSuccess: () => {
      toast.success("Transaction deleted");
      utils.recurring.list.invalidate();
      utils.recurring.upcoming.invalidate();
      utils.recurring.monthlyTotal.invalidate();
    },
  });

  const handleSubmit = () => {
    createMutation.mutate({
      name: form.name,
      type: form.type as any,
      amount: Number(form.amount),
      frequency: form.frequency as any,
      dueDay: Number(form.dueDay),
      startDate: form.startDate,
      endDate: form.endDate || undefined,
      autoPay: form.autoPay,
      notes: form.notes || undefined,
    });
  };

  // Build calendar grid for current month
  const today = new Date();
  const calendarDays = (() => {
    const year = today.getFullYear();
    const month = today.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: Array<{ day: number | null; debits: typeof upcoming }> = [];
    for (let i = 0; i < firstDay; i++) days.push({ day: null, debits: [] });
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const debits = upcoming?.filter((u) => u.date === dateStr) ?? [];
      days.push({ day: d, debits });
    }
    return days;
  })();

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-4 lg:p-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#0f1a2e] flex items-center gap-2">
              <CalendarClock className="w-6 h-6 text-[#d4a843]" />
              Recurring Transactions
            </h1>
            <p className="text-muted-foreground mt-1">Track SIPs, EMIs, subscriptions & their due dates</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#1a2744] hover:bg-[#1a2744]/90">
                <Plus className="w-4 h-4 mr-1" /> Add Transaction
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Recurring Transaction</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input placeholder="e.g. SBI Bluechip SIP" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Amount (₹)</Label>
                    <Input type="number" placeholder="5000" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Frequency</Label>
                    <Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Due Day</Label>
                    <Input type="number" min={1} max={31} value={form.dueDay} onChange={(e) => setForm({ ...form, dueDay: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date (optional)</Label>
                    <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.autoPay} onCheckedChange={(v) => setForm({ ...form, autoPay: v })} />
                  <Label>Auto-pay enabled</Label>
                </div>
                <Button className="w-full bg-[#1a2744]" onClick={handleSubmit} disabled={!form.name || !form.amount || createMutation.isPending}>
                  {createMutation.isPending ? "Adding..." : "Add Transaction"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      {/* Summary cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#d4a843]/10 flex items-center justify-center">
                <Wallet className="w-4 h-4 text-[#d4a843]" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Monthly Outflow</p>
                <p className="text-xl font-bold text-[#0f1a2e]">{formatCurrency(monthlyTotal?.monthlyTotal ?? 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                <Repeat className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Active Transactions</p>
                <p className="text-xl font-bold text-[#0f1a2e]">{transactions?.length ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Next 7 Days</p>
                <p className="text-xl font-bold text-[#0f1a2e]">
                  {upcoming?.filter((u) => {
                    const d = new Date(u.date);
                    return d.getTime() - today.getTime() < 7 * 86400000;
                  }).length ?? 0} debits
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Calendar view */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {today.toLocaleString("default", { month: "long", year: "numeric" })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground mb-2">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <span key={d} className="font-medium">{d}</span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((cell, i) => (
                  <div
                    key={i}
                    className={`min-h-[60px] p-1 rounded-lg border text-xs ${
                      cell.day === today.getDate() ? "border-[#d4a843] bg-[#d4a843]/5" :
                      cell.day ? "border-border/30" : "border-transparent"
                    }`}
                  >
                    {cell.day && (
                      <>
                        <span className={`font-medium ${cell.day === today.getDate() ? "text-[#d4a843]" : "text-muted-foreground"}`}>
                          {cell.day}
                        </span>
                        {cell.debits && cell.debits.length > 0 && (
                          <div className="mt-0.5 space-y-0.5">
                            {cell.debits.slice(0, 2).map((d, j) => (
                              <div key={j} className={`px-1 py-0.5 rounded text-[9px] truncate ${TYPE_LABELS[d.type]?.color ?? "bg-gray-100"}`}>
                                ₹{Number(d.amount).toLocaleString("en-IN")}
                              </div>
                            ))}
                            {cell.debits.length > 2 && (
                              <span className="text-[9px] text-muted-foreground">+{cell.debits.length - 2} more</span>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Transaction list */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">All Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {transactions?.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">No recurring transactions yet. Add your first SIP, EMI, or subscription.</p>
                )}
                {transactions?.map((txn) => (
                  <div key={txn.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{txn.name}</p>
                        <Badge variant="outline" className={`text-[10px] ${TYPE_LABELS[txn.type]?.color}`}>
                          {TYPE_LABELS[txn.type]?.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatCurrency(Number(txn.amount))} · {txn.frequency} · Day {txn.dueDay}
                        {txn.autoPay && " · Auto-pay"}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-red-500" onClick={() => deleteMutation.mutate({ id: txn.id })}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Upcoming debits timeline */}
      {upcoming && upcoming.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Upcoming 30 Days</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {upcoming.map((u, i) => {
                  const d = new Date(u.date);
                  const daysAway = Math.ceil((d.getTime() - today.getTime()) / 86400000);
                  return (
                    <div key={`${u.id}-${u.date}-${i}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30">
                      <div className="w-12 text-center flex-shrink-0">
                        <p className="text-xs text-muted-foreground">{d.toLocaleDateString("en-IN", { month: "short" })}</p>
                        <p className="text-lg font-bold text-[#0f1a2e]">{d.getDate()}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{u.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {daysAway === 0 ? "Today" : daysAway === 1 ? "Tomorrow" : `In ${daysAway} days`}
                          {u.autoPay && " · Auto-pay"}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-semibold text-red-600">-{formatCurrency(Number(u.amount))}</p>
                        <Badge variant="outline" className={`text-[10px] ${TYPE_LABELS[u.type]?.color}`}>
                          {TYPE_LABELS[u.type]?.label}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
