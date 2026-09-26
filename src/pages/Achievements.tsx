import React, { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useEpisodes } from "@/hooks/useEpisodes";
import WarriorBadge from "@/components/dashboard/WarriorBadge";
import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Achievements = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { episodes } = useEpisodes();
  const navigate = useNavigate();

  const displayName = profile?.display_name || user?.email?.split("@")[0] || "Warrior";
  const nonDryEpisodes = useMemo(() => episodes.filter(e => !e.is_dry_day), [episodes]);
  const hasEpisodes = nonDryEpisodes.length > 0;

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: "#f5f4f7" }}>
      {/* Header */}
      <div className="px-6 py-6 border-b border-purple-100 bg-white/80 backdrop-blur-md sticky top-0 z-10 flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center hover:bg-purple-100 transition-colors"
        >
          <ChevronLeft className="h-5 w-5 text-purple-700" />
        </button>
        <div>
          <h1 className="text-xl font-black tracking-tight text-gray-800">Achievements</h1>
          <p className="text-xs text-gray-500">Your hyperhidrosis journey</p>
        </div>
      </div>

      <div className="px-4 py-8 max-w-md mx-auto relative">
        <div className={!hasEpisodes ? "grayscale blur-[2px] opacity-70 pointer-events-none transition-all duration-500" : ""}>
          <WarriorBadge
            userName={displayName}
            episodeCount={nonDryEpisodes.length}
            episodes={episodes.map(e => ({ datetime: e.datetime }))}
          />
        </div>

        {!hasEpisodes && (
          <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center z-20 pointer-events-auto">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg mb-4">
              <span className="text-3xl">🔒</span>
            </div>
            <h2 className="text-xl font-black text-gray-800 mb-2 shadow-sm p-1 bg-white/50 rounded">Badge Locked</h2>
            <p className="text-sm font-medium text-gray-600 bg-white/80 p-3 rounded-xl shadow-sm border border-gray-100">
              Start logging your first episode to begin your warrior journey and unlock this badge. 💧
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Achievements;
