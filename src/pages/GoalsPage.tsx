import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
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
  TrendingDown,
  ArrowRight,
  Info,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowUpRight,
  Landmark,
  Coins,
} from "lucide-react";
import { formatCurrency, formatCompact, formatPercent } from "@/lib/format";

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

const statusConfig = {
  ahead: { label: "Ahead", icon: ArrowUpRight, color: "text-emerald-600 bg-emerald-50", barColor: "from-emerald-400 to-emerald-600" },
  on_track: { label: "On Track", icon: CheckCircle2, color: "text-blue-600 bg-blue-50", barColor: "from-blue-400 to-blue-600" },
  behind: { label: "Behind", icon: AlertTriangle, color: "text-amber-600 bg-amber-50", barColor: "from-amber-400 to-amber-600" },
  at_risk: { label: "At Risk", icon: XCircle, color: "text-red-600 bg-red-50", barColor: "from-red-400 to-red-600" },
} as const;

export default function GoalsPage() {
  const { user } = useAuth({ redirectOnUnauthenticated: true });
  const utils = trpc.useUtils();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<number | null>(null);
  const [includeIlliquid, setIncludeIlliquid] = useState(false);
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

  const { data: tracking } = trpc.goals.trackProgress.useQuery(
    { includeIlliquid },
    { enabled: !!user },
  );

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

        {/* Portfolio & Goal Summary Dashboard */}
        {tracking && goals && goals.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="space-y-4"
          >
            {/* Overall Status Banner */}
            {(() => {
              const sc = statusConfig[tracking.summary.overallStatus];
              const StatusIcon = sc.icon;
              return (
                <Card className={`border-l-4 ${tracking.summary.overallStatus === "ahead" || tracking.summary.overallStatus === "on_track" ? "border-l-emerald-500" : tracking.summary.overallStatus === "behind" ? "border-l-amber-500" : "border-l-red-500"}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${sc.color}`}>
                          <StatusIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-[#0f1a2e]">
                            Overall: {sc.label}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Projected {formatCompact(tracking.summary.totalProjectedValue)} of {formatCompact(tracking.summary.totalGoalTarget)} target
                            {tracking.summary.totalShortfall > 0 && (
                              <span className="text-red-500 ml-1">
                                · Shortfall {formatCompact(tracking.summary.totalShortfall)}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      {tracking.summary.sipGap > 0 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="text-right cursor-help">
                              <p className="text-xs text-muted-foreground">Additional SIP needed</p>
                              <p className="font-semibold text-amber-600">
                                +{formatCurrency(tracking.summary.sipGap)}/mo
                              </p>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="text-xs max-w-xs">
                            <p>Current total SIP: {formatCurrency(tracking.summary.totalCurrentSIP)}/mo</p>
                            <p>Required total SIP: {formatCurrency(tracking.summary.totalRequiredSIP)}/mo</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })()}

            {/* Asset Breakdown + Illiquid Toggle */}
            <div className="grid sm:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs text-muted-foreground">Liquid Assets</span>
                  </div>
                  <p className="text-lg font-bold text-[#0f1a2e]">
                    {formatCompact(tracking.summary.totalLiquidAssets)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Equity, Debt, Liquid, International
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Landmark className="w-4 h-4 text-amber-500" />
                    <span className="text-xs text-muted-foreground">Illiquid Assets</span>
                  </div>
                  <p className="text-lg font-bold text-[#0f1a2e]">
                    {formatCompact(tracking.summary.totalIlliquidAssets)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Real Estate {formatCompact(tracking.summary.illiquidBreakdown.realEstate)} · Gold {formatCompact(tracking.summary.illiquidBreakdown.gold)}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-dashed">
                <CardContent className="p-4 flex flex-col justify-center">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[#0f1a2e]">Include illiquid assets?</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Consider selling gold/real estate to fund goals
                      </p>
                    </div>
                    <Switch
                      checked={includeIlliquid}
                      onCheckedChange={setIncludeIlliquid}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Emergency Fund Status */}
            {tracking.summary.emergencyFund && (
              <Card className={`border-l-4 ${
                tracking.summary.emergencyFund.status === "adequate" ? "border-l-emerald-500" :
                tracking.summary.emergencyFund.status === "low" ? "border-l-amber-500" : "border-l-red-500"
              }`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                        tracking.summary.emergencyFund.status === "adequate" ? "bg-emerald-500/10 text-emerald-600" :
                        tracking.summary.emergencyFund.status === "low" ? "bg-amber-500/10 text-amber-600" : "bg-red-500/10 text-red-600"
                      }`}>
                        <Shield className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-[#0f1a2e]">
                          Emergency Fund: {tracking.summary.emergencyFund.status === "adequate" ? "Adequate" : tracking.summary.emergencyFund.status === "low" ? "Low" : "Missing"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Current: {formatCompact(tracking.summary.emergencyFund.current)} · Recommended: {formatCompact(tracking.summary.emergencyFund.recommended)} (6 months expenses)
                        </p>
                      </div>
                    </div>
                    {tracking.summary.emergencyFund.status !== "adequate" && (
                      <p className="text-sm font-medium text-amber-600">
                        Need {formatCompact(tracking.summary.emergencyFund.recommended - tracking.summary.emergencyFund.current)} more
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}

        {goals && goals.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {goals.map((goal, i) => {
                const Icon = categoryIcons[goal.category] || Target;
                const colorClass = categoryColors[goal.category] || categoryColors.other;
                const progress = Number(goal.targetAmount) > 0
                  ? (Number(goal.currentAmount) / Number(goal.targetAmount)) * 100
                  : 0;

                // Find tracking data for this goal
                const gt = tracking?.goals.find((g) => g.goalId === goal.id);
                const sc = gt ? statusConfig[gt.status] : null;
                const TrackIcon = sc?.icon;

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
                              <div className="flex items-center gap-1">
                                {/* Status Badge */}
                                {gt && sc && TrackIcon && (
                                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${sc.color}`}>
                                    <TrackIcon className="w-3 h-3" />
                                    {sc.label}
                                  </span>
                                )}
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

                            {/* Progress bar */}
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

                            {/* Projected value & SIP info */}
                            {gt && (
                              <div className="mt-3 pt-3 border-t border-border/50 space-y-1.5">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground">Projected</span>
                                  <span className={`font-medium ${gt.status === "ahead" || gt.status === "on_track" ? "text-emerald-600" : "text-amber-600"}`}>
                                    {formatCompact(gt.projectedValue)}
                                  </span>
                                </div>
                                {Number(goal.monthlyContribution) > 0 && (
                                  <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-1">
                                      <TrendingUp className="w-3 h-3 text-emerald-500" />
                                      <span className="text-muted-foreground">SIP</span>
                                    </div>
                                    <span className="text-muted-foreground">
                                      {formatCurrency(goal.monthlyContribution)}/mo
                                    </span>
                                  </div>
                                )}
                                {gt.sipGap > 0 && (
                                  <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-1">
                                      <TrendingDown className="w-3 h-3 text-red-400" />
                                      <span className="text-muted-foreground">SIP gap</span>
                                    </div>
                                    <span className="text-red-500 font-medium">
                                      +{formatCurrency(gt.sipGap)}/mo
                                    </span>
                                  </div>
                                )}
                                {gt.shortfall > 0 && gt.illiquidCanCover > 0 && !includeIlliquid && (
                                  <div className="flex items-center gap-1 text-xs text-amber-600 mt-1">
                                    <Coins className="w-3 h-3" />
                                    <span>
                                      Selling assets could cover {formatCompact(gt.illiquidCanCover)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-xs text-xs space-y-0.5">
                        <p className="font-medium text-[#0f1a2e]">{goal.name}</p>
                        <p>Category: {goal.category} · Priority: {goal.priority}</p>
                        <p>Target (today): {formatCurrency(goal.targetAmount)}</p>
                        {gt && gt.inflationAdjustedTarget > gt.targetAmount && (
                          <p className="text-amber-600">Target (inflation-adjusted): {formatCurrency(gt.inflationAdjustedTarget)}</p>
                        )}
                        <p>Saved: {formatCurrency(goal.currentAmount)} ({formatPercent(progress)})</p>
                        {gt && (
                          <>
                            <p>Projected at maturity: {formatCurrency(gt.projectedValue)}</p>
                            {gt.shortfall > 0 && <p className="text-red-500">Shortfall: {formatCurrency(gt.shortfall)}</p>}
                            {gt.surplus > 0 && <p className="text-emerald-500">Surplus: {formatCurrency(gt.surplus)}</p>}
                            <p>Required SIP: {formatCurrency(gt.requiredMonthlySIP)}/mo</p>
                            <p>Current SIP: {formatCurrency(goal.monthlyContribution)}/mo</p>
                          </>
                        )}
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
