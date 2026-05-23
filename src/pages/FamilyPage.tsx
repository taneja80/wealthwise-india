import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { Users, Plus, Trash2, IndianRupee, Wallet } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { toast } from "sonner";

const RELATION_LABELS: Record<string, string> = {
  self: "Self",
  spouse: "Spouse",
  parent: "Parent",
  child: "Child",
  sibling: "Sibling",
};

const RELATION_COLORS: Record<string, string> = {
  self: "bg-blue-100 text-blue-700",
  spouse: "bg-pink-100 text-pink-700",
  parent: "bg-purple-100 text-purple-700",
  child: "bg-emerald-100 text-emerald-700",
  sibling: "bg-amber-100 text-amber-700",
};

export default function FamilyPage() {
  useAuth({ redirectOnUnauthenticated: true });
  const utils = trpc.useUtils();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", relation: "spouse" as string, age: "",
    monthlyIncome: "", monthlyExpenses: "", totalAssets: "", totalLiabilities: "", notes: "",
  });

  const { data: members } = trpc.family.list.useQuery();
  const { data: summary } = trpc.family.summary.useQuery();

  const createMutation = trpc.family.create.useMutation({
    onSuccess: () => {
      toast.success("Family member added");
      utils.family.list.invalidate();
      utils.family.summary.invalidate();
      setDialogOpen(false);
      setForm({ name: "", relation: "spouse", age: "", monthlyIncome: "", monthlyExpenses: "", totalAssets: "", totalLiabilities: "", notes: "" });
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.family.delete.useMutation({
    onSuccess: () => {
      toast.success("Member removed");
      utils.family.list.invalidate();
      utils.family.summary.invalidate();
    },
  });

  const handleSubmit = () => {
    createMutation.mutate({
      name: form.name,
      relation: form.relation as any,
      age: form.age ? Number(form.age) : undefined,
      monthlyIncome: Number(form.monthlyIncome) || 0,
      monthlyExpenses: Number(form.monthlyExpenses) || 0,
      totalAssets: Number(form.totalAssets) || 0,
      totalLiabilities: Number(form.totalLiabilities) || 0,
      notes: form.notes || undefined,
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-4 lg:p-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#0f1a2e] flex items-center gap-2">
              <Users className="w-6 h-6 text-[#d4a843]" />
              Family Finances
            </h1>
            <p className="text-muted-foreground mt-1">Track finances for your family on a single account</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#1a2744] hover:bg-[#1a2744]/90">
                <Plus className="w-4 h-4 mr-1" /> Add Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Family Member</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Relation</Label>
                    <Select value={form.relation} onValueChange={(v) => setForm({ ...form, relation: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(RELATION_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Age</Label>
                  <Input type="number" placeholder="30" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Monthly Income (₹)</Label>
                    <Input type="number" placeholder="0" value={form.monthlyIncome} onChange={(e) => setForm({ ...form, monthlyIncome: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Monthly Expenses (₹)</Label>
                    <Input type="number" placeholder="0" value={form.monthlyExpenses} onChange={(e) => setForm({ ...form, monthlyExpenses: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Total Assets (₹)</Label>
                    <Input type="number" placeholder="0" value={form.totalAssets} onChange={(e) => setForm({ ...form, totalAssets: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Total Liabilities (₹)</Label>
                    <Input type="number" placeholder="0" value={form.totalLiabilities} onChange={(e) => setForm({ ...form, totalLiabilities: e.target.value })} />
                  </div>
                </div>
                <Button className="w-full bg-[#1a2744]" onClick={handleSubmit} disabled={!form.name || createMutation.isPending}>
                  {createMutation.isPending ? "Adding..." : "Add Member"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      {/* Family Summary */}
      {summary && summary.memberCount > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Family Net Worth", value: formatCurrency(summary.netWorth), color: "text-emerald-600", bg: "bg-emerald-50", icon: Wallet },
            { label: "Combined Income", value: formatCurrency(summary.totalMonthlyIncome) + "/mo", color: "text-[#d4a843]", bg: "bg-[#d4a843]/10", icon: IndianRupee },
            { label: "Combined Expenses", value: formatCurrency(summary.totalMonthlyExpenses) + "/mo", color: "text-red-500", bg: "bg-red-50", icon: IndianRupee },
            { label: "Family Members", value: String(summary.memberCount), color: "text-blue-600", bg: "bg-blue-50", icon: Users },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <Card key={s.label}>
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center`}>
                      <Icon className={`w-4 h-4 ${s.color}`} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                      <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Member cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {members?.length === 0 && (
          <Card className="sm:col-span-2 lg:col-span-3">
            <CardContent className="p-8 text-center">
              <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">Add family members to track joint finances</p>
            </CardContent>
          </Card>
        )}
        {members?.map((m, i) => (
          <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-[#0f1a2e]">{m.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${RELATION_COLORS[m.relation] ?? "bg-gray-100"}`}>
                      {RELATION_LABELS[m.relation] ?? m.relation}
                    </span>
                    {m.age && <span className="text-xs text-muted-foreground ml-2">Age {m.age}</span>}
                  </div>
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-red-500" onClick={() => deleteMutation.mutate({ id: m.id })}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Income</p>
                    <p className="font-medium">{formatCurrency(Number(m.monthlyIncome))}/mo</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Expenses</p>
                    <p className="font-medium">{formatCurrency(Number(m.monthlyExpenses))}/mo</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Assets</p>
                    <p className="font-medium text-emerald-600">{formatCurrency(Number(m.totalAssets))}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Liabilities</p>
                    <p className="font-medium text-red-500">{formatCurrency(Number(m.totalLiabilities))}</p>
                  </div>
                </div>
                {m.notes && <p className="text-xs text-muted-foreground mt-2 italic">{m.notes}</p>}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
