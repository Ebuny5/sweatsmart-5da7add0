import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { markOnboarded, nameFromAuth, werePermissionsAsked } from "@/utils/onboardingStatus";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/useProfile";
import { Sparkles, ArrowRight } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";

const MandatoryOnboarding = () => {
  const { profile } = useProfile();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState<1 | 2>(1);

  const [formData, setFormData] = useState({
    age: "",
    biological_sex: "",
    gender_identity: "",
    diagnosis_type: "",
    country: "",
    // Clinical Profile fields
    onset_bracket: "",
    family_history: "",
    night_sweats: "",
    on_medication: "", // "yes" | "no" | ""
    conditions: [] as string[],
  });

  // Prefill anything the user already gave us so they never re-type it.
  useEffect(() => {
    if (!profile) return;
    setFormData((prev) => ({
      age: prev.age || (profile.age ? String(profile.age) : ""),
      biological_sex: prev.biological_sex || (profile as any).biological_sex || "",
      gender_identity: prev.gender_identity || (profile as any).gender_identity || "",
      diagnosis_type: prev.diagnosis_type || (profile as any).diagnosis_type || "",
      country: prev.country || (profile as any).country || "",
      onset_bracket: prev.onset_bracket || (profile as any).onset_bracket || "",
      family_history: prev.family_history || (profile as any).family_history || "",
      night_sweats: prev.night_sweats || (profile as any).night_sweats || "",
      on_medication: prev.on_medication || ((profile as any).on_medication === true ? "yes" : (profile as any).on_medication === false ? "no" : ""),
      conditions: prev.conditions?.length ? prev.conditions : (profile as any).conditions || [],
    }));
  }, [profile]);

  const [isSaving, setIsSaving] = useState(false);

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.age || !formData.biological_sex || !formData.gender_identity || !formData.diagnosis_type || !formData.country) {
      toast({
        title: "Missing fields",
        description: "Please fill in all fields to continue.",
        variant: "destructive"
      });
      return;
    }
    setStep(2);
  };

  const handleCompleteAll = async (skipStep2 = false) => {
    if (!user) return;
    setIsSaving(true);

    try {
      const payload: Record<string, unknown> = {
        user_id: user.id,
        age: parseInt(formData.age),
        biological_sex: formData.biological_sex,
        gender_identity: formData.gender_identity,
        diagnosis_type: formData.diagnosis_type,
        country: formData.country,
        is_profile_complete: true,
      };

      if (!skipStep2) {
        if (formData.onset_bracket) payload.onset_bracket = formData.onset_bracket;
        if (formData.family_history) payload.family_history = formData.family_history;
        if (formData.night_sweats) payload.night_sweats = formData.night_sweats;
        if (formData.on_medication) payload.on_medication = formData.on_medication === "yes";
        if (formData.conditions.length) payload.conditions = formData.conditions;
      }

      if (!profile?.display_name?.trim()) {
        const n = nameFromAuth(user);
        if (n) payload.display_name = n;
      }

      const { error } = await supabase
        .from("profiles")
        .upsert(payload as never, { onConflict: "user_id" });

      if (!error) {
        markOnboarded(user.id);
        window.dispatchEvent(new CustomEvent("sweatsmart:profile-updated"));
        toast({
          title: "Profile setup complete ✨",
          description: "Welcome to HidroAlly, your hyperhidrosis digital companion 😊",
        });
        navigate(werePermissionsAsked(user.id) ? "/home" : "/setup-profile", { replace: true });
      } else {
        throw error;
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "Setup failed",
        description: "There was a problem saving your details. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleCondition = (cond: string) => {
    setFormData(prev => {
      const exists = prev.conditions.includes(cond);
      if (exists) return { ...prev, conditions: prev.conditions.filter(c => c !== cond) };
      return { ...prev, conditions: [...prev.conditions, cond] };
    });
  };

  return (
    <AppLayout isAuthenticated={true}>
      <div className="flex justify-center items-center min-h-[80vh] p-4 bg-[#E9E4FA]">
        <Card className="w-full max-w-md shadow-lg border-0 bg-white/90 backdrop-blur">
          {step === 1 ? (
            <>
              <CardHeader className="text-center space-y-3 pb-6">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-pink-500 shadow-lg mb-2">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-2xl font-black text-gray-800">
                  Welcome to HidroAlly
                </CardTitle>
                <CardDescription className="text-sm leading-relaxed text-gray-600">
                  To personalize your experience and insights, please tell us a little bit about yourself.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <form onSubmit={handleStep1Submit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="age" className="font-semibold text-gray-700">Age</Label>
                    <Input
                      id="age"
                      type="number"
                      min="1"
                      max="120"
                      placeholder="Enter your age"
                      value={formData.age}
                      onChange={(e) => setFormData({...formData, age: e.target.value})}
                      className="rounded-xl bg-gray-50/50"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="biological_sex" className="font-semibold text-gray-700">Biological Sex</Label>
                    <select
                      id="biological_sex"
                      value={formData.biological_sex}
                      onChange={(e) => setFormData({...formData, biological_sex: e.target.value})}
                      className="flex h-10 w-full rounded-xl border border-input bg-gray-50/50 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      required
                    >
                      <option value="" disabled>Select option</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Intersex">Intersex</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gender_identity" className="font-semibold text-gray-700">Gender Identity</Label>
                    <select
                      id="gender_identity"
                      value={formData.gender_identity}
                      onChange={(e) => setFormData({...formData, gender_identity: e.target.value})}
                      className="flex h-10 w-full rounded-xl border border-input bg-gray-50/50 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      required
                    >
                      <option value="" disabled>Select option</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Non-binary">Non-binary</option>
                      <option value="Self-describe">Self-describe</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="diagnosis_type" className="font-semibold text-gray-700">Primary Diagnosis Type</Label>
                    <select
                      id="diagnosis_type"
                      value={formData.diagnosis_type}
                      onChange={(e) => setFormData({...formData, diagnosis_type: e.target.value})}
                      className="flex h-10 w-full rounded-xl border border-input bg-gray-50/50 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      required
                    >
                      <option value="" disabled>Select option</option>
                      <option value="Primary Focal">Primary Focal</option>
                      <option value="Secondary General">Secondary General</option>
                      <option value="Unsure">Unsure</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="country" className="font-semibold text-gray-700">Country</Label>
                    <Input
                      id="country"
                      type="text"
                      placeholder="e.g. United States"
                      value={formData.country}
                      onChange={(e) => setFormData({...formData, country: e.target.value})}
                      className="rounded-xl bg-gray-50/50"
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 rounded-xl bg-violet-600 hover:bg-violet-700 text-md font-bold mt-2 shadow-md shadow-violet-200"
                  >
                    Continue
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </form>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader className="text-center space-y-2 pb-4">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 text-violet-600 mb-1">
                  🩺
                </div>
                <CardTitle className="text-xl font-bold text-gray-800">
                  Help us understand you better
                </CardTitle>
                <CardDescription className="text-xs text-gray-500">
                  Optional clinical profile (30 seconds). Sharpen your pattern analysis.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Onset Age */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">How old were you when the sweating started?</Label>
                  <select
                    value={formData.onset_bracket}
                    onChange={(e) => setFormData({ ...formData, onset_bracket: e.target.value })}
                    className="flex h-10 w-full rounded-xl border border-input bg-gray-50/50 px-3 py-2 text-xs"
                  >
                    <option value="">Select option</option>
                    <option value="Childhood under 13">Childhood under 13</option>
                    <option value="Teens 13-19">Teens 13-19</option>
                    <option value="20-25">20-25</option>
                    <option value="26-39">26-39</option>
                    <option value="40 or older">40 or older</option>
                    <option value="Not sure">Not sure</option>
                  </select>
                </div>

                {/* Family History */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Does anyone in your family sweat a lot?</Label>
                  <select
                    value={formData.family_history}
                    onChange={(e) => setFormData({ ...formData, family_history: e.target.value })}
                    className="flex h-10 w-full rounded-xl border border-input bg-gray-50/50 px-3 py-2 text-xs"
                  >
                    <option value="">Select option</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                    <option value="Not sure">Not sure</option>
                  </select>
                </div>

                {/* Night Sweats */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Do you ever wake up with your clothes or bedsheets soaked?</Label>
                  <select
                    value={formData.night_sweats}
                    onChange={(e) => setFormData({ ...formData, night_sweats: e.target.value })}
                    className="flex h-10 w-full rounded-xl border border-input bg-gray-50/50 px-3 py-2 text-xs"
                  >
                    <option value="">Select option</option>
                    <option value="Never">Never</option>
                    <option value="Sometimes">Sometimes</option>
                    <option value="Often">Often</option>
                  </select>
                </div>

                {/* On Medication */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Do you take any regular medicine?</Label>
                  <select
                    value={formData.on_medication}
                    onChange={(e) => setFormData({ ...formData, on_medication: e.target.value })}
                    className="flex h-10 w-full rounded-xl border border-input bg-gray-50/50 px-3 py-2 text-xs"
                  >
                    <option value="">Select option</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>

                {/* Health Conditions */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Any health conditions?</Label>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {["Diabetes", "Thyroid problem", "High blood pressure", "Pregnancy or menopause", "Other", "None"].map(cond => {
                      const isSel = formData.conditions.includes(cond);
                      return (
                        <button
                          key={cond}
                          type="button"
                          onClick={() => toggleCondition(cond)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                            isSel ? "bg-violet-600 text-white border-violet-600" : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                          }`}
                        >
                          {cond}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-3 space-y-2">
                  <Button
                    type="button"
                    onClick={() => handleCompleteAll(false)}
                    disabled={isSaving}
                    className="w-full h-11 rounded-xl bg-violet-600 hover:bg-violet-700 text-sm font-bold shadow-md shadow-violet-200"
                  >
                    {isSaving ? "Saving..." : "Save & Complete Setup"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => handleCompleteAll(true)}
                    disabled={isSaving}
                    className="w-full h-10 rounded-xl text-xs font-semibold text-gray-500 hover:text-gray-800"
                  >
                    Skip for now
                  </Button>
                </div>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </AppLayout>
  );
};

export default MandatoryOnboarding;
