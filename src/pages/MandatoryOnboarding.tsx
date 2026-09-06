import React, { useState } from "react";
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
  const { profile, updateProfile } = useProfile();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    age: "",
    biological_sex: "",
    gender_identity: "",
    diagnosis_type: "",
    country: "",
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!formData.age || !formData.biological_sex || !formData.gender_identity || !formData.diagnosis_type || !formData.country) {
      toast({
        title: "Missing fields",
        description: "Please fill in all fields to continue.",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);

    try {
      const success = await updateProfile({
        age: parseInt(formData.age),
        biological_sex: formData.biological_sex,
        gender_identity: formData.gender_identity,
        diagnosis_type: formData.diagnosis_type,
        country: formData.country,
        is_profile_complete: true,
      });

      if (success) {
        toast({
          title: "Profile setup complete ✨",
          description: "Welcome to HidroAlly, your hyperhidrosis digital companion 😊",
        });
        navigate("/home", { replace: true });
      } else {
        throw new Error("Failed to update profile");
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

  return (
    <AppLayout isAuthenticated={true}>
      <div className="flex justify-center items-center min-h-[80vh] p-4 bg-[#E9E4FA]">
        <Card className="w-full max-w-md shadow-lg border-0 bg-white/90 backdrop-blur">
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
            <form onSubmit={handleSubmit} className="space-y-5">

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
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : (
                  <>
                    Complete Profile
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default MandatoryOnboarding;
