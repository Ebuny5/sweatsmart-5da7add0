import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { notificationManager } from "@/services/NotificationManager";
import { audioAlertPlayer } from "@/utils/audioAlertPlayer";
import { markPermissionsAsked, werePermissionsAsked } from "@/utils/onboardingStatus";
import { Sparkles, MapPin, Bell, CheckCircle2, Loader2 } from "lucide-react";

type Status = "unknown" | "enabled" | "blocked" | "not-now";
type Step = "location" | "notifications" | "done";

const queryPermission = async (name: "geolocation" | "notifications"): Promise<PermissionState | null> => {
  try {
    if (!navigator.permissions?.query) return null;
    const res = await navigator.permissions.query({ name: name as PermissionName });
    return res.state;
  } catch {
    return null;
  }
};

/**
 * One-time device permissions step for brand-new users.
 * Name comes from sign-up / Google, voice is always the female alert voice,
 * so neither is asked here. Already-granted permissions are skipped automatically.
 */
const SetupProfile = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [step, setStep] = useState<Step>("location");
  const [locationStatus, setLocationStatus] = useState<Status>("unknown");
  const [notifStatus, setNotifStatus] = useState<Status>("unknown");
  const [busy, setBusy] = useState(false);

  const goHome = () => {
    if (user) markPermissionsAsked(user.id);
    navigate("/home", { replace: true });
  };

  // Detect what is already enabled so we never re-ask or mislabel it.
  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/login", { replace: true }); return; }
    if (werePermissionsAsked(user.id)) { navigate("/home", { replace: true }); return; }
    audioAlertPlayer.setGender("female");

    (async () => {
      const geo = await queryPermission("geolocation");
      const notifGranted = typeof Notification !== "undefined" && Notification.permission === "granted";
      const loc: Status = geo === "granted" ? "enabled" : "unknown";
      const notif: Status = notifGranted ? "enabled" : "unknown";
      setLocationStatus(loc);
      setNotifStatus(notif);
      if (loc === "enabled" && notif === "enabled") goHome();
      else if (loc === "enabled") setStep("notifications");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user]);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus("blocked");
      setStep(notifStatus === "enabled" ? "done" : "notifications");
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      () => {
        setLocationStatus("enabled");
        setBusy(false);
        setStep(notifStatus === "enabled" ? "done" : "notifications");
      },
      async (err) => {
        // A slow GPS fix is NOT a refusal — check the real permission state.
        const state = await queryPermission("geolocation");
        const granted = state === "granted" || err.code !== err.PERMISSION_DENIED;
        setLocationStatus(granted ? "enabled" : "blocked");
        setBusy(false);
        setStep(notifStatus === "enabled" ? "done" : "notifications");
      },
      { timeout: 15000, maximumAge: 600000, enableHighAccuracy: false },
    );
  };

  const requestNotifications = async () => {
    setBusy(true);
    try {
      const granted = await notificationManager.requestPermission();
      const actual = typeof Notification !== "undefined" ? Notification.permission === "granted" : granted;
      setNotifStatus(granted || actual ? "enabled" : "blocked");
    } catch {
      setNotifStatus("blocked");
    }
    setBusy(false);
    setStep("done");
  };

  const label = (s: Status) =>
    s === "enabled" ? "✓ Enabled" : s === "blocked" ? "Off — enable anytime in Settings" : "Not now";

  return (
    <AppLayout isAuthenticated={true}>
      <div className="flex justify-center items-center min-h-[80vh] p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-3">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-pink-500 shadow-lg">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-black">
              {step === "location" && "Enable location"}
              {step === "notifications" && "Enable notifications"}
              {step === "done" && "You're all set 💧"}
            </CardTitle>
            <CardDescription className="text-sm leading-relaxed">
              {step === "location" && "We use your location to monitor real climate conditions in your area."}
              {step === "notifications" && "Get climate risk alerts and 8-hour check-in reminders, even when the app is closed."}
              {step === "done" && "Your HidroAlly companion is ready."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {step === "location" && (
              <div className="space-y-4 text-center">
                <MapPin className="h-12 w-12 mx-auto text-primary" />
                <Button onClick={requestLocation} disabled={busy} className="w-full min-h-14">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Allow location"}
                </Button>
                <Button variant="ghost" disabled={busy} onClick={() => { setLocationStatus("not-now"); setStep(notifStatus === "enabled" ? "done" : "notifications"); }} className="w-full min-h-14">
                  Not now
                </Button>
              </div>
            )}

            {step === "notifications" && (
              <div className="space-y-4 text-center">
                <Bell className="h-12 w-12 mx-auto text-primary" />
                <Button onClick={requestNotifications} disabled={busy} className="w-full min-h-14">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Allow notifications"}
                </Button>
                <Button variant="ghost" disabled={busy} onClick={() => { setNotifStatus("not-now"); setStep("done"); }} className="w-full min-h-14">
                  Not now
                </Button>
              </div>
            )}

            {step === "done" && (
              <div className="space-y-4">
                <div className="rounded-lg border p-3 text-sm space-y-1">
                  <p>Location: <span className="font-semibold">{label(locationStatus)}</span></p>
                  <p>Notifications: <span className="font-semibold">{label(notifStatus)}</span></p>
                </div>
                <Button onClick={goHome} className="w-full min-h-14">
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Go to my dashboard
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default SetupProfile;
