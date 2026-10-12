import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import AppLayout from "@/components/layout/AppLayout";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { audioAlertPlayer } from "@/utils/audioAlertPlayer";
import { notificationManager } from "@/services/NotificationManager";
import { User, Sparkles, MapPin, Bell, CheckCircle2 } from "lucide-react";

type Step = "name" | "location" | "notifications" | "voice";

const SetupProfile = () => {
  const [step, setStep] = useState<Step>("name");
  const [displayName, setDisplayName] = useState("");
  const [gender, setGender] = useState<"female" | "male">("female");
  const [locationGranted, setLocationGranted] = useState(false);
  const [notifGranted, setNotifGranted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const saveName = async () => {
    const trimmed = displayName.trim();
    if (!trimmed || !user) return;
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: trimmed })
        .eq("user_id", user.id);
      if (error) {
        await supabase
          .from("profiles")
          .upsert({ user_id: user.id, display_name: trimmed }, { onConflict: "user_id" });
      }
      await supabase.auth.updateUser({ data: { display_name: trimmed } });
      setStep("location");
    } catch (err) {
      console.error(err);
      toast({ title: "Error saving name", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setStep("notifications");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      () => {
        setLocationGranted(true);
        setStep("notifications");
      },
      () => {
        toast({
          title: "Location skipped",
          description: "You can enable it later in settings.",
        });
        setStep("notifications");
      },
      { timeout: 10000 },
    );
  };

  const requestNotifications = async () => {
    try {
      const granted = await notificationManager.requestPermission();
      setNotifGranted(granted);
    } catch (err) {
      console.error("Error requesting notification permissions:", err);
    }
    setStep("voice");
  };

  const finish = () => {
    audioAlertPlayer.setGender(gender);
    toast({
      title: `Welcome, ${displayName.trim()}! 🎉`,
      description: "Your warrior profile is ready.",
    });
    navigate("/home", { replace: true });
  };

  return (
    <AppLayout isAuthenticated={false}>
      <div className="flex justify-center items-center min-h-[80vh] p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-3">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-pink-500 shadow-lg">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-black">
              {step === "name" && "Welcome, Warrior! 💧"}
              {step === "location" && "Enable location"}
              {step === "notifications" && "Enable notifications"}
              {step === "voice" && "Pick your alert voice"}
            </CardTitle>
            <CardDescription className="text-sm leading-relaxed">
              {step === "name" && "What should we call you on your Warrior Badge?"}
              {step === "location" && "We need your location to monitor real climate conditions in your area."}
              {step === "notifications" && "Allow notifications so we can alert you about high sweat-risk conditions and log reminders."}
              {step === "voice" && "Choose the voice used for spoken alerts. You can change this later in Settings."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            {step === "name" && (
              <div className="space-y-3">
                <Label htmlFor="displayName" className="font-semibold">
                  Your name or nickname
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="displayName"
                    type="text"
                    placeholder="e.g. Lafidot, Sarah, Dr. Smith"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="pl-10"
                    maxLength={50}
                    autoFocus
                  />
                </div>
                <Button
                  onClick={saveName}
                  disabled={isLoading || !displayName.trim()}
                  className="w-full"
                >
                  {isLoading ? "Saving..." : "Continue →"}
                </Button>
              </div>
            )}

            {step === "location" && (
              <div className="space-y-4 text-center">
                <MapPin className="h-12 w-12 mx-auto text-primary" />
                <p className="text-sm text-muted-foreground">
                  Real-time temperature, humidity and UV from your area power every alert.
                </p>
                <Button onClick={requestLocation} className="w-full">
                  Allow location
                </Button>
                <Button variant="ghost" onClick={() => setStep("notifications")} className="w-full">
                  Skip
                </Button>
              </div>
            )}

            {step === "notifications" && (
              <div className="space-y-4 text-center">
                <Bell className="h-12 w-12 mx-auto text-primary" />
                <p className="text-sm text-muted-foreground">
                  Climate alerts and 8-hour log reminders are delivered through notifications — even when the app is closed.
                </p>
                <Button onClick={requestNotifications} className="w-full">
                  Allow notifications
                </Button>
                <Button variant="ghost" onClick={() => setStep("voice")} className="w-full">
                  Skip
                </Button>
              </div>
            )}

            {step === "voice" && (
              <div className="space-y-4">
                <RadioGroup
                  value={gender}
                  onValueChange={(v) => setGender(v as "female" | "male")}
                  className="space-y-2"
                >
                  <label className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer">
                    <RadioGroupItem value="female" id="g-female" />
                    <span className="flex-1">
                      <span className="font-semibold block">Female voice</span>
                      <span className="text-xs text-muted-foreground">Default — full coverage of all alert levels.</span>
                    </span>
                  </label>
                  <label className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer">
                    <RadioGroupItem value="male" id="g-male" />
                    <span className="flex-1">
                      <span className="font-semibold block">Male voice</span>
                      <span className="text-xs text-muted-foreground">Available for low / reminder / check-in. Other levels use female.</span>
                    </span>
                  </label>
                </RadioGroup>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    audioAlertPlayer.setGender(gender);
                    audioAlertPlayer.playAlert("checkin");
                  }}
                >
                  Preview voice
                </Button>

                <Button onClick={finish} className="w-full">
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Finish setup
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  Location: {locationGranted ? "✓ enabled" : "skipped"} · Notifications: {notifGranted ? "✓ enabled" : "skipped"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default SetupProfile;
