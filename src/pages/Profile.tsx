import React, { useState, useEffect, useRef } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Edit, Calendar, ArrowRight, Camera, Upload, Check, X, Pencil } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useProfile } from "@/hooks/useProfile";
import { useEpisodes } from "@/hooks/useEpisodes";

// ── Avatar emoji options ────────────────────────────────────────────────────
const AVATAR_EMOJIS = [
  "🧑","👦","👧","👨","👩","🧔","👴","👵",
  "🧑‍💻","🧑‍⚕️","🧑‍🎓","🧑‍🏫","🧑‍🍳","🧑‍🎨","🧑‍🚀",
  "😎","🥷","🦸","🦹","🧙","🧜","🧚","🤠","🥸",
];

type Gender = "male" | "female" | "non-binary" | "prefer-not-to-say";

const GENDER_OPTIONS: { value: Gender; label: string; emoji: string }[] = [
  { value: "male",              label: "Male",             emoji: "🚹" },
  { value: "female",            label: "Female",           emoji: "🚺" },
  { value: "non-binary",        label: "Non-binary",       emoji: "⚧"  },
  { value: "prefer-not-to-say", label: "Prefer not to say",emoji: "🤐" },
];

// ── Stat card ───────────────────────────────────────────────────────────────
const StatCard = ({
  value, label, emoji, gradient,
}: { value: number; label: string; emoji: string; gradient: string }) => (
  <div className={`rounded-2xl p-5 flex flex-col items-center gap-1 ${gradient}`}>
    <span className="text-2xl">{emoji}</span>
    <span className="text-4xl font-black text-gray-800 leading-none">{value}</span>
    <span className="text-xs font-medium text-gray-500 text-center leading-tight">{label}</span>
  </div>
);

// ── Main Component ──────────────────────────────────────────────────────────
const Profile = () => {
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { profile, loading: profileLoading, updateProfile } = useProfile();
  const { episodes } = useEpisodes();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  // Avatar: emoji string OR base64 image URL
  const [selectedAvatar, setSelectedAvatar] = useState<string>(AVATAR_EMOJIS[4]);
  const [avatarType, setAvatarType] = useState<"emoji" | "image">("emoji");
  const [selectedGender, setSelectedGender] = useState<Gender>("prefer-not-to-say");

  const [profileData, setProfileData] = useState({
    display_name: profile?.display_name || "",
    age: profile?.age || "",
    biological_sex: profile?.biological_sex || "",
    gender_identity: profile?.gender_identity || "",
    gender_description: profile?.gender_description || "",
    diagnosis_type: profile?.diagnosis_type || "",
    country: profile?.country || "",
  });

  useEffect(() => {
    if (profile) {
      setProfileData({
        display_name: profile.display_name || "",
        age: profile.age || "",
        biological_sex: profile.biological_sex || "",
        gender_identity: profile.gender_identity || "",
        gender_description: profile.gender_description || "",
        diagnosis_type: profile.diagnosis_type || "",
        country: profile.country || "",
      });
      if ((profile as any).avatar) setSelectedAvatar((profile as any).avatar);
      if ((profile as any).avatar_type) setAvatarType((profile as any).avatar_type);
      if ((profile as any).gender) setSelectedGender((profile as any).gender);
    }
  }, [profile]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const success = await updateProfile({
        display_name: profileData.display_name,
        age: profileData.age ? parseInt(profileData.age as string) : undefined,
        biological_sex: profileData.biological_sex as string,
        gender_identity: profileData.gender_identity as string,
        gender_description: profileData.gender_identity === "Self-describe" ? profileData.gender_description : undefined,
        diagnosis_type: profileData.diagnosis_type as string,
        country: profileData.country as string,
        avatar: selectedAvatar,
        avatar_type: avatarType,
        gender: selectedGender,
      } as any);

      if (success) {
        toast({ title: "Profile updated ✨", description: "Your profile has been saved." });
        setIsEditing(false);
        setShowAvatarPicker(false);
      } else {
        throw new Error("Failed");
      }
    } catch {
      toast({ title: "Update failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setShowAvatarPicker(false);
    setProfileData({
      display_name: profile?.display_name || "",
      age: profile?.age || "",
      biological_sex: profile?.biological_sex || "",
      gender_identity: profile?.gender_identity || "",
      gender_description: profile?.gender_description || "",
      diagnosis_type: profile?.diagnosis_type || "",
      country: profile?.country || "",
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setSelectedAvatar(ev.target?.result as string);
      setAvatarType("image");
      setShowAvatarPicker(false);
    };
    reader.readAsDataURL(file);
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  if (profileLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-200 border-t-blue-500" />
            <p className="text-sm text-gray-400">Loading your profile…</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!user) { navigate("/login"); return null; }

  const displayName = profileData.display_name || user.email || "User";
  const userInitials = displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
  const joinDate = new Date(user.created_at).toLocaleDateString("en-US", {
    year: "numeric", month: "long",
  });

  // Calendar week tracking consistency: unique days logged since Sunday (Day 1)
  const calculateTrackingConsistency = () => {
    if (!episodes || episodes.length === 0) return 0;

    const toKey = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayOfWeek = today.getDay(); // 0 is Sunday, 1 is Monday, etc.

    const windowKeys = new Set<string>();
    for (let i = 0; i <= dayOfWeek; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      windowKeys.add(toKey(d));
    }

    const loggedDays = new Set<string>();
    for (const ep of episodes) {
      const key = toKey(new Date(ep.datetime));
      if (windowKeys.has(key)) loggedDays.add(key);
    }

    // Calculate percentage based on a full 7-day week
    return Math.round((loggedDays.size / 7) * 100);
  };

  const trackingConsistencyPercentage = calculateTrackingConsistency();
  const currentGenderOption = GENDER_OPTIONS.find(g => g.value === selectedGender);

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto pb-10">

        {/* ── HERO GRADIENT HEADER ─────────────────────────────────────── */}
        <div className="relative bg-gradient-to-br from-blue-500 via-blue-400 to-cyan-400 px-6 pt-10 pb-20 rounded-b-[2.5rem] shadow-lg shadow-blue-200">
          {/* Top row */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-blue-100 text-sm font-medium tracking-wide uppercase">My Profile</p>
              <h1 className="text-white text-2xl font-black tracking-tight leading-tight">
                HidroAlly
              </h1>
            </div>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-sm font-semibold px-4 py-2 rounded-full transition-all backdrop-blur-sm"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </button>
            )}
          </div>

          {/* Avatar */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <div
                className="w-24 h-24 rounded-full border-4 border-white shadow-xl flex items-center justify-center bg-white overflow-hidden cursor-pointer"
                onClick={() => isEditing && setShowAvatarPicker(true)}
              >
                {avatarType === "image" ? (
                  <img src={selectedAvatar} alt="avatar" className="w-full h-full object-cover" />
                ) : selectedAvatar.startsWith("http") || selectedAvatar.startsWith("data") ? (
                  <img src={selectedAvatar} alt="avatar" className="w-full h-full object-cover" />
                ) : selectedAvatar.length <= 2 ? (
                  <span className="text-5xl leading-none">{selectedAvatar}</span>
                ) : (
                  <span className="text-3xl font-black text-blue-500">{userInitials}</span>
                )}
              </div>
              {isEditing && (
                <button
                  onClick={() => setShowAvatarPicker(true)}
                  className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-blue-600 border-2 border-white flex items-center justify-center shadow-md hover:bg-blue-700 transition-colors"
                >
                  <Camera className="h-3.5 w-3.5 text-white" />
                </button>
              )}
            </div>

            <h2 className="text-white text-xl font-black mt-3 tracking-tight">{displayName}</h2>
            <p className="text-blue-100 text-sm mt-0.5">{user.email}</p>
            <div className="flex items-center gap-1.5 mt-2 bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
              <Calendar className="h-3 w-3 text-blue-100" />
              <span className="text-xs text-blue-100 font-medium">Joined {joinDate}</span>
            </div>
          </div>
        </div>


        {/* ── AVATAR PICKER SHEET ──────────────────────────────────────── */}
        {showAvatarPicker && (
          <div className="mx-4 -mt-4 bg-white rounded-2xl shadow-xl border border-gray-100 p-5 z-10 relative">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800">Choose your avatar</h3>
              <button onClick={() => setShowAvatarPicker(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Upload photo option */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-dashed border-blue-200 hover:border-blue-400 hover:bg-blue-50 transition-all mb-4"
            >
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Upload className="h-5 w-5 text-blue-500" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-800">Upload a photo</p>
                <p className="text-xs text-gray-500">JPG, PNG supported</p>
              </div>
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

            {/* Emoji grid */}
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Or pick an avatar</p>
            <div className="grid grid-cols-6 gap-2">
              {AVATAR_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => { setSelectedAvatar(emoji); setAvatarType("emoji"); setShowAvatarPicker(false); }}
                  className={`w-full aspect-square rounded-xl text-2xl flex items-center justify-center transition-all
                    ${selectedAvatar === emoji ? "bg-blue-100 border-2 border-blue-400 scale-110" : "bg-gray-50 hover:bg-blue-50 border-2 border-transparent"}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── STATS CARDS ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 mx-4 -mt-8 mb-6 relative z-10">
          <StatCard
            value={episodes.filter(e => !e.is_dry_day).length}
            label="Episodes Logged"
            emoji="📋"
            gradient="bg-gradient-to-br from-white to-blue-50 shadow-md border border-blue-100"
          />
          <StatCard
            value={`${trackingConsistencyPercentage}%`}
            label="Tracking Consistency"
            emoji="🗓️"
            gradient="bg-gradient-to-br from-white to-orange-50 shadow-md border border-orange-100"
          />
        </div>

        <div className="space-y-4 px-4">

          {/* ── PERSONAL INFORMATION ───────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 pt-5 pb-2">
              <h3 className="text-base font-bold text-gray-800">Personal Information</h3>
              <p className="text-xs text-gray-400 mt-0.5">Your profile details</p>
            </div>

            <div className="px-5 pb-5">
              {isEditing ? (
                <div className="space-y-4 pt-2">
                  {/* Display Name */}
                  <div className="space-y-1.5">
                    <Label htmlFor="name" className="text-sm font-semibold text-gray-700">
                      Display Name
                    </Label>
                    <Input
                      id="name"
                      value={profileData.display_name}
                      onChange={(e) => setProfileData({ ...profileData, display_name: e.target.value })}
                      placeholder="Enter your display name"
                      className="rounded-xl min-h-[48px] border-gray-200 focus:border-blue-400 focus:ring-blue-100"
                    />
                  </div>

                  {/* Email (read-only) */}
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-sm font-semibold text-gray-700">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={user.email || ""}
                      disabled
                      className="rounded-xl min-h-[48px] bg-gray-50 text-gray-400 border-gray-200"
                    />
                    <p className="text-[11px] text-gray-400">Email cannot be changed here</p>
                  </div>

                  {/* (Legacy Gender selector removed — replaced by Biological Sex + Gender Identity below) */}


                  {/* Age */}
                  <div className="space-y-1.5">
                    <Label htmlFor="age" className="text-sm font-semibold text-gray-700">
                      Age
                    </Label>
                    <Input
                      id="age"
                      type="number"
                      value={profileData.age}
                      onChange={(e) => setProfileData({ ...profileData, age: e.target.value })}
                      placeholder="Enter your age"
                      className="rounded-xl min-h-[48px] border-gray-200 focus:border-blue-400 focus:ring-blue-100"
                    />
                  </div>

                  {/* Biological Sex */}
                  <div className="space-y-1.5">
                    <Label htmlFor="biological_sex" className="text-sm font-semibold text-gray-700">
                      Biological Sex
                    </Label>
                    <select
                      id="biological_sex"
                      value={profileData.biological_sex}
                      onChange={(e) => setProfileData({ ...profileData, biological_sex: e.target.value })}
                      className="flex h-12 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-100 focus-visible:border-blue-400"
                    >
                      <option value="" disabled>Select option</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Intersex">Intersex</option>
                    </select>
                  </div>

                  {/* Gender Identity */}
                  <div className="space-y-1.5">
                    <Label htmlFor="gender_identity" className="text-sm font-semibold text-gray-700">
                      Gender Identity
                    </Label>
                    <select
                      id="gender_identity"
                      value={profileData.gender_identity}
                      onChange={(e) => setProfileData({ ...profileData, gender_identity: e.target.value })}
                      className="flex h-12 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-100 focus-visible:border-blue-400"
                    >
                      <option value="" disabled>Select option</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Non-binary">Non-binary</option>
                      <option value="Self-describe">Self-describe</option>
                    </select>
                  </div>

                  {profileData.gender_identity === "Self-describe" && (
                    <div className="space-y-1.5 mt-3">
                      <Label htmlFor="gender_description" className="text-sm font-semibold text-gray-700">
                        Please describe your gender
                      </Label>
                      <Input
                        id="gender_description"
                        type="text"
                        value={profileData.gender_description}
                        onChange={(e) => setProfileData({ ...profileData, gender_description: e.target.value })}
                        placeholder="E.g. Agender, Genderfluid, etc."
                        className="rounded-xl min-h-[48px] border-gray-200 focus:border-blue-400 focus:ring-blue-100"
                      />
                    </div>
                  )}

                  {/* Primary Diagnosis Type */}
                  <div className="space-y-1.5">
                    <Label htmlFor="diagnosis_type" className="text-sm font-semibold text-gray-700">
                      Primary Diagnosis Type
                    </Label>
                    <select
                      id="diagnosis_type"
                      value={profileData.diagnosis_type}
                      onChange={(e) => setProfileData({ ...profileData, diagnosis_type: e.target.value })}
                      className="flex h-12 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-100 focus-visible:border-blue-400"
                    >
                      <option value="" disabled>Select option</option>
                      <option value="Primary Focal">Primary Focal</option>
                      <option value="Secondary General">Secondary General</option>
                      <option value="Unsure">Unsure</option>
                    </select>
                  </div>

                  {/* Country */}
                  <div className="space-y-1.5">
                    <Label htmlFor="country" className="text-sm font-semibold text-gray-700">
                      Country
                    </Label>
                    <Input
                      id="country"
                      type="text"
                      value={profileData.country}
                      onChange={(e) => setProfileData({ ...profileData, country: e.target.value })}
                      placeholder="Enter your country"
                      className="rounded-xl min-h-[48px] border-gray-200 focus:border-blue-400 focus:ring-blue-100"
                    />
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="flex-1 rounded-xl min-h-[48px] bg-blue-500 hover:bg-blue-600 font-semibold text-white"
                    >
                      {isSaving ? (
                        <span className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Saving…
                        </span>
                      ) : (
                        "Save Changes"
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleCancel}
                      disabled={isSaving}
                      className="rounded-xl min-h-[48px] px-5 border-gray-200"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 pt-2">
                  {[
                    { label: "Display Name", value: profileData.display_name || "Not set" },
                    { label: "Email", value: user.email },
                    { label: "Age", value: profileData.age || "Not set" },
                    { label: "Biological Sex", value: profileData.biological_sex || "Not set" },
                    { label: "Gender Identity", value: profileData.gender_identity || "Not set" },
                    { label: "Diagnosis", value: profileData.diagnosis_type || "Not set" },
                    { label: "Country", value: profileData.country || "Not set" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                      <span className="text-sm text-gray-400">{item.label}</span>
                      <span className="text-sm font-semibold text-gray-800 text-right max-w-[60%] truncate">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── ACCOUNT SETTINGS ─────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 pt-5 pb-2">
              <h3 className="text-base font-bold text-gray-800">Account Settings</h3>
              <p className="text-xs text-gray-400 mt-0.5">Preferences & privacy</p>
            </div>
            <div className="px-5 pb-5">
              <button
                onClick={() => navigate("/settings")}
                className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50 hover:bg-blue-50 hover:border-blue-200 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
                    <span className="text-lg">⚙️</span>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-800">Manage preferences</p>
                    <p className="text-xs text-gray-400">Notifications, privacy & more</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
              </button>
            </div>
          </div>

          {/* ── HYPERHIDROSIS WARRIOR BADGE ──────────────────────────────── */}
          <div className="bg-gradient-to-r from-blue-500 to-cyan-400 rounded-2xl p-5 flex items-center gap-4 shadow-md shadow-blue-100">
            <span className="text-4xl">🏅</span>
            <div>
              <p className="text-white font-black text-base leading-tight">Hyperhidrosis Warrior</p>
              <p className="text-blue-100 text-xs mt-0.5 leading-snug">
                {episodes.length > 0
                  ? `You've tracked ${episodes.length} episode${episodes.length > 1 ? "s" : ""}. Every log helps science understand this condition better.`
                  : "Start logging your episodes to build your warrior profile."}
              </p>
            </div>
          </div>

          {/* ── LOGOUT BUTTON ────────────────────────────────────────────── */}
          <div className="pt-4 pb-8">
            <Button
              variant="destructive"
              className="w-full rounded-xl min-h-[56px] text-base font-bold shadow-sm"
              onClick={async () => {
                await signOut();
                navigate("/login");
              }}
            >
              Logout
            </Button>
          </div>

        </div>
      </div>
    </AppLayout>
  );
};

export default Profile;
