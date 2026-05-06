import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { motion, AnimatePresence } from "framer-motion";
import {
  Target,
  Plus,
  Trash2,
  Edit2,
  GraduationCap,
  Home,
  Car,
  Heart,
  Plane,
  Shield,
  Gem,
  TrendingUp,
  ArrowRight,
  Info,
} from "lucide-react";
import { formatCurrency, formatPercent } from "@/lib/format";

const goalTemplates = [
  { category: "retirement", name: "Retirement Corpus", icon: Shield, defaultAmount: 50000000, defaultYears: 25, defaultReturn: 10 },
  { category: "education", name: "Child's Education", icon: GraduationCap, defaultAmount: 5000000, defaultYears: 15, defaultReturn: 9 },
  { category: "home", name: "Buy a Home", icon: Home, defaultAmount: 15000000, defaultYears: 10, defaultReturn: 8 },
  { category: "vehicle", name: "Buy a Car", icon: Car, defaultAmount: 1500000, defaultYears: 5, defaultReturn: 7 },
  { category: "wedding", name: "Wedding Fund", icon: Heart, defaultAmount: 3000000, defaultYears: 3, defaultReturn: 7 },
  { category: "travel", name: "World Tour", icon: Plane, defaultAmount: 2000000, defaultYears: 7, defaultReturn: 8 },
  { category: "emergency", name: "Emergency Fund", icon: Shield, defaultAmount: 1000000, defaultYears: 2, defaultReturn: 6 },
  { category: "wealth", name: "Wealth Building", icon: Gem, defaultAmount: 20000000, defaultYears: 20, defaultReturn: 12 },
];

const categoryIcons: Record<string, typeof Target> = {
  retirement: Shield,
  education: GraduationCap,
  home: Home,
  vehicle: Car,
  wedding: Heart,
  travel: Plane,
  emergency: Shield,
  wealth: Gem,
  other: Target,
};

const categoryColors: Record<string, string> = {
  retirement: "bg-amber-50 text-amber-600",
  education: "bg-blue-50 text-blue-600",
  home: "bg-emerald-50 text-emerald-600",
  vehicle: "bg-purple-50 text-purple-600",
  wedding: "bg-pink-50 text-pink-600",
  travel: "bg-cyan-50 text-cyan-600",
  emergency: "bg-red-50 text-red-600",
  wealth: "bg-[#d4a843]/10 text-[#d4a843]",
  other: "bg-gray-50 text-gray-600",
};

function TooltipLabel({ label, tip }: { label: string; tip: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Label>{label}</Label>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="w-3 h-3 text-muted-foreground/50 cursor-help" />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs">
          <p>{tip}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

export default function GoalsPage() {
  const { user } = useAuth({ redirectOnUnauthenticated: true });
  const utils = trpc.useUtils();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    category: "retirement" as const,
    targetAmount: "",
    currentAmount: "",
    timelineYears: "",
    priority: "medium" as const,
    description: "",
    monthlyContribution: "",
    expectedReturn: "8",
  });

  const { data: goals, isLoading } = trpc.goals.list.useQuery(undefined, {
    enabled: !!user,
  });

  const createGoal = trpc.goals.create.useMutation({
    onSuccess: () => {
      utils.goals.list.invalidate();
      setDialogOpen(false);
      resetForm();
    },
  });

  const updateGoal = trpc.goals.update.useMutation({
    onSuccess: () => {
      utils.goals.list.invalidate();
      setDialogOpen(false);
      setEditingGoal(null);
      resetForm();
    },
  });

  const deleteGoal = trpc.goals.delete.useMutation({
    onSuccess: () => {
      utils.goals.list.invalidate();
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      category: "retirement",
      targetAmount: "",
      currentAmount: "",
      timelineYears: "",
      priority: "medium",
      description: "",
      monthlyContribution: "",
      expectedReturn: "8",
    });
  };

  const selectTemplate = (template: typeof goalTemplates[0]) => {
    setFormData({
      name: template.name,
      category: template.category as any,
      targetAmount: String(template.defaultAmount),
      currentAmount: "0",
      timelineYears: String(template.defaultYears),
      priority: "medium",
      description: "",
      monthlyContribution: "",
      expectedReturn: String(template.defaultReturn),
    });
  };

  const handleSubmit = () => {
    if (editingGoal) {
      updateGoal.mutate({
        id: editingGoal,
        name: formData.name,
        category: formData.category,
        targetAmount: Number(formData.targetAmount),
        currentAmount: Number(formData.currentAmount),
        timelineYears: Number(formData.timelineYears),
        priority: formData.priority,
        description: formData.description || undefined,
        monthlyContribution: Number(formData.monthlyContribution) || 0,
        expectedReturn: Number(formData.expectedReturn),
      });
    } else {
      createGoal.mutate({
        name: formData.name,
        category: formData.category,
        targetAmount: Number(formData.targetAmount),
        currentAmount: Number(formData.currentAmount) || 0,
        timelineYears: Number(formData.timelineYears),
        priority: formData.priority,
        description: formData.description || undefined,
        monthlyContribution: Number(formData.monthlyContribution) || 0,
        expectedReturn: Number(formData.expectedReturn),
      });
    }
  };

  const startEdit = (goal: NonNullable<typeof goals>[0]) => {
    setEditingGoal(goal.id);
    setFormData({
      name: goal.name,
      category: goal.category as any,
      targetAmount: String(goal.targetAmount),
      currentAmount: String(goal.currentAmount),
      timelineYears: String(goal.timelineYears),
      priority: goal.priority as any,
      description: goal.description || "",
      monthlyContribution: String(goal.monthlyContribution),
      expectedReturn: String(goal.expectedReturn),
    });
    setDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-4 border-[#d4a843] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="max-w-6xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-2xl font-bold text-[#0f1a2e]">Financial Goals</h1>
            <p className="text-muted-foreground mt-1">
              Define your goals and track your progress
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button
                className="bg-[#1a2744] hover:bg-[#1a2744]/90"
                onClick={() => {
                  setEditingGoal(null);
                  resetForm();
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Goal
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingGoal ? "Edit Goal" : "Create New Goal"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                {!editingGoal && (
                  <div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Label className="mb-2 block cursor-help flex items-center gap-1.5">
                          Quick Templates
                          <Info className="w-3 h-3 text-muted-foreground/50" />
                        </Label>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs text-xs">
                        <p>Click any template to auto-fill realistic defaults. Adjust the numbers to match your situation.</p>
                      </TooltipContent>
                    </Tooltip>
                    <div className="grid grid-cols-2 gap-2">
                      {goalTemplates.map((template) => {
                        const Icon = template.icon;
                        return (
                          <Tooltip key={template.category}>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => selectTemplate(template)}
                                className="flex items-center gap-2 p-2 rounded-lg border border-border/50 hover:border-[#d4a843]/30 hover:bg-[#d4a843]/5 transition-all text-left"
                              >
                                <Icon className="w-4 h-4 text-[#d4a843]" />
                                <span className="text-sm">{template.name}</span>
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                              <p><span className="font-medium">Target:</span> {formatCurrency(template.defaultAmount)}</p>
                              <p><span className="font-medium">Timeline:</span> {template.defaultYears} years</p>
                              <p><span className="font-medium">Expected Return:</span> {template.defaultReturn}%</p>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <TooltipLabel label="Goal Name" tip="Give your goal a clear, memorable name" />
                  <Input
                    placeholder="e.g., Retirement Corpus"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <TooltipLabel label="Category" tip="Categories help determine the right asset allocation for each goal" />
                    <Select
                      value={formData.category}
                      onValueChange={(v) => setFormData({ ...formData, category: v as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="retirement">Retirement</SelectItem>
                        <SelectItem value="education">Education</SelectItem>
                        <SelectItem value="home">Home</SelectItem>
                        <SelectItem value="vehicle">Vehicle</SelectItem>
                        <SelectItem value="wedding">Wedding</SelectItem>
                        <SelectItem value="travel">Travel</SelectItem>
                        <SelectItem value="emergency">Emergency</SelectItem>
                        <SelectItem value="wealth">Wealth</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <TooltipLabel label="Priority" tip="High priority goals get more conservative (safer) allocations" />
                    <Select
                      value={formData.priority}
                      onValueChange={(v) => setFormData({ ...formData, priority: v as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <TooltipLabel label="Target Amount (₹)" tip="The total amount you need to fully achieve this goal" />
                    <Input
                      type="number"
                      placeholder="50,00,000"
                      value={formData.targetAmount}
                      onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <TooltipLabel label="Current Amount (₹)" tip="How much you have already saved towards this goal" />
                    <Input
                      type="number"
                      placeholder="0"
                      value={formData.currentAmount}
                      onChange={(e) => setFormData({ ...formData, currentAmount: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <TooltipLabel label="Timeline (Years)" tip="Number of years until you need this money. Shorter timelines mean safer investments" />
                    <Input
                      type="number"
                      placeholder="10"
                      value={formData.timelineYears}
                      onChange={(e) => setFormData({ ...formData, timelineYears: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <TooltipLabel label="Expected Return (%)" tip="Average annual return you expect from investments for this goal. Equity ~12%, Debt ~7%" />
                    <Input
                      type="number"
                      placeholder="8"
                      value={formData.expectedReturn}
                      onChange={(e) => setFormData({ ...formData, expectedReturn: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <TooltipLabel label="Monthly Contribution (₹)" tip="How much you plan to invest every month (SIP) towards this goal" />
                  <Input
                    type="number"
                    placeholder="15,000"
                    value={formData.monthlyContribution}
                    onChange={(e) => setFormData({ ...formData, monthlyContribution: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Description (Optional)</Label>
                  <Input
                    placeholder="Additional details about this goal"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <Button
                  className="w-full bg-[#1a2744] hover:bg-[#1a2744]/90"
                  onClick={handleSubmit}
                  disabled={createGoal.isPending || updateGoal.isPending || !formData.name || !formData.targetAmount || !formData.timelineYears}
                >
                  {createGoal.isPending || updateGoal.isPending ? "Saving..." : editingGoal ? "Update Goal" : "Create Goal"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </motion.div>

        {goals && goals.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {goals.map((goal, i) => {
                const Icon = categoryIcons[goal.category] || Target;
                const colorClass = categoryColors[goal.category] || categoryColors.other;
                const progress = Number(goal.targetAmount) > 0
                  ? (Number(goal.currentAmount) / Number(goal.targetAmount)) * 100
                  : 0;
                const remaining = Number(goal.targetAmount) - Number(goal.currentAmount);

                return (
                  <motion.div
                    key={goal.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Card className="group hover:shadow-md transition-all duration-300 cursor-help">
                          <CardContent className="p-5">
                            <div className="flex items-start justify-between mb-4">
                              <div className={`w-10 h-10 rounded-xl ${colorClass} flex items-center justify-center`}>
                                <Icon className="w-5 h-5" />
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    startEdit(goal);
                                  }}
                                >
                                  <Edit2 className="w-4 h-4 text-muted-foreground" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteGoal.mutate({ id: goal.id });
                                  }}
                                >
                                  <Trash2 className="w-4 h-4 text-red-400" />
                                </Button>
                              </div>
                            </div>

                            <h3 className="font-semibold text-[#0f1a2e] mb-1">{goal.name}</h3>
                            <div className="flex items-center gap-2 mb-3">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${colorClass}`}>
                                {goal.category}
                              </span>
                              <span className="text-xs text-muted-foreground">{goal.timelineYears} years</span>
                            </div>

                            <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-2">
                              <div
                                className="h-full bg-gradient-to-r from-[#d4a843] to-[#b8923d] rounded-full transition-all"
                                style={{ width: `${Math.min(progress, 100)}%` }}
                              />
                            </div>

                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">
                                {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
                              </span>
                              <span className="font-medium text-[#d4a843]">{formatPercent(progress)}</span>
                            </div>

                            {Number(goal.monthlyContribution) > 0 && (
                              <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-2 text-sm">
                                <TrendingUp className="w-3 h-3 text-emerald-500" />
                                <span className="text-muted-foreground">
                                  SIP: {formatCurrency(goal.monthlyContribution)}/mo
                                </span>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-xs text-xs">
                        <p className="font-medium text-[#0f1a2e]">{goal.name}</p>
                        <p>Category: {goal.category} · Priority: {goal.priority}</p>
                        <p>Target: {formatCurrency(goal.targetAmount)}</p>
                        <p>Saved: {formatCurrency(goal.currentAmount)} ({formatPercent(progress)})</p>
                        <p>Remaining: {formatCurrency(remaining)}</p>
                        <p>Monthly SIP: {formatCurrency(goal.monthlyContribution)}</p>
                        <p>Expected Return: {goal.expectedReturn}%</p>
                        <p>Timeline: {goal.timelineYears} years</p>
                      </TooltipContent>
                    </Tooltip>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="border-dashed border-2">
              <CardContent className="p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-[#d4a843]/10 flex items-center justify-center mx-auto mb-4">
                  <Target className="w-8 h-8 text-[#d4a843]" />
                </div>
                <h3 className="text-lg font-semibold text-[#0f1a2e] mb-2">No Goals Yet</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Start by creating your first financial goal. We have templates for retirement, education, home purchase, and more.
                </p>
                <Button
                  className="bg-[#1a2744] hover:bg-[#1a2744]/90"
                  onClick={() => setDialogOpen(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Goal
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </TooltipProvider>
  );
}
