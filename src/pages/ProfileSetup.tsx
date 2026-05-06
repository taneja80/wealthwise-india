import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { motion } from "framer-motion";
import { ArrowRight, ArrowLeft, User, CheckCircle2, Info } from "lucide-react";

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

export default function ProfileSetup() {
  useAuth({ redirectOnUnauthenticated: true });
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const [step, setStep] = useState(1);

  const [formData, setFormData] = useState({
    age: "",
    profession: "",
    familyStatus: "single" as const,
    dependents: "0",
    city: "",
  });

  const createProfile = trpc.profile.createUserProfile.useMutation({
    onSuccess: () => {
      utils.profile.getUserProfile.invalidate();
      if (step === 1) {
        setStep(2);
      }
    },
  });

  const handleSubmit = () => {
    createProfile.mutate({
      age: Number(formData.age),
      profession: formData.profession,
      familyStatus: formData.familyStatus,
      dependents: Number(formData.dependents),
      city: formData.city || undefined,
    });
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="max-w-xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-[#1a2744] flex items-center justify-center">
                <User className="w-4 h-4 text-[#d4a843]" />
              </div>
              <h1 className="text-2xl font-bold text-[#0f1a2e]">Profile Setup</h1>
            </div>
            <p className="text-muted-foreground">
              Tell us about yourself to personalize your financial plan
            </p>
          </div>

          <div className="flex items-center gap-2 mb-6">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={`h-2 flex-1 rounded-full transition-colors cursor-help ${step >= 1 ? "bg-[#d4a843]" : "bg-muted"}`} />
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Personal details</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={`h-2 flex-1 rounded-full transition-colors cursor-help ${step >= 2 ? "bg-[#d4a843]" : "bg-muted"}`} />
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Confirmation</TooltipContent>
            </Tooltip>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {step === 1 ? "Personal Information" : "All Set!"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {step === 1 && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <TooltipLabel label="Age" tip="Your current age determines retirement timeline, risk capacity, and how long your investments can compound" />
                      <Input
                        id="age"
                        type="number"
                        placeholder="30"
                        value={formData.age}
                        onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <TooltipLabel label="Dependents" tip="Number of family members financially dependent on you. Affects emergency fund and insurance recommendations" />
                      <Input
                        id="dependents"
                        type="number"
                        placeholder="0"
                        value={formData.dependents}
                        onChange={(e) => setFormData({ ...formData, dependents: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <TooltipLabel label="Profession" tip="Your profession helps estimate income growth rate and job stability factors in projections" />
                    <Input
                      id="profession"
                      placeholder="Software Engineer, Doctor, Business Owner..."
                      value={formData.profession}
                      onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <TooltipLabel label="Family Status" tip="Marital status affects expense assumptions, tax planning, and goal priorities" />
                    <Select
                      value={formData.familyStatus}
                      onValueChange={(v) => setFormData({ ...formData, familyStatus: v as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single">Single</SelectItem>
                        <SelectItem value="married">Married</SelectItem>
                        <SelectItem value="married_with_children">Married with Children</SelectItem>
                        <SelectItem value="retired">Retired</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <TooltipLabel label="City (Optional)" tip="Your city helps estimate cost of living adjustments for expense projections" />
                    <Input
                      id="city"
                      placeholder="Mumbai, Bangalore, Delhi..."
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button
                      className="flex-1 bg-[#1a2744] hover:bg-[#1a2744]/90"
                      onClick={handleSubmit}
                      disabled={createProfile.isPending || !formData.age || !formData.profession}
                    >
                      {createProfile.isPending ? "Saving..." : "Continue"}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </>
              )}

              {step === 2 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-6"
                >
                  <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                  </div>
                  <h3 className="text-xl font-semibold text-[#0f1a2e] mb-2">
                    Profile Created!
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    Now let's set up your financial details to generate your personalized plan.
                  </p>
                  <div className="flex gap-3 justify-center">
                    <Button variant="outline" onClick={() => setStep(1)}>
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back
                    </Button>
                    <Button
                      className="bg-[#1a2744] hover:bg-[#1a2744]/90"
                      onClick={() => navigate("/financial-profile")}
                    >
                      Set Up Finances
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </TooltipProvider>
  );
}
