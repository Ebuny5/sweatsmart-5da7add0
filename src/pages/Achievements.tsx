import React, { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useEpisodes } from "@/hooks/useEpisodes";
import WarriorBadge from "@/components/dashboard/WarriorBadge";
import AppLayout from "@/components/layout/AppLayout";
import { Lock } from "lucide-react";

const Achievements = () => {
  const { user } = useAuth();
  const { episodes } = useEpisodes();

  // Exclude dry days
  const validEpisodes = useMemo(() => {
    return episodes.filter(e => !e.is_dry_day);
  }, [episodes]);

  const episodeCount = validEpisodes.length;
  const hasEpisodes = episodeCount > 0;
  const displayName = user?.user_metadata?.first_name || user?.email?.split('@')[0] || "Warrior";

  return (
    <AppLayout>
      <div className="max-w-md mx-auto space-y-6 pb-20">
        <div className="px-4">
          <h1 className="text-2xl font-black text-gray-800 tracking-tight">Achievements</h1>
          <p className="text-gray-500 text-sm mt-1">Unlock badges and track your milestones.</p>
        </div>

        <div className="px-4">
          {hasEpisodes ? (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-violet-50 to-pink-50 rounded-2xl p-4 border border-purple-100 shadow-sm">
                <p className="text-xs font-black text-purple-700 uppercase tracking-widest mb-1">🏅 Your Warrior Badge</p>
                <p className="text-sm text-gray-600 leading-snug">
                  You've earned this badge for starting your journey! Save and share it to raise awareness.
                </p>
              </div>
              <WarriorBadge
                userName={displayName}
                episodeCount={episodeCount}
                episodes={validEpisodes.map(e => ({ datetime: e.datetime }))}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
                <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1">🏅 Warrior Badge</p>
                <p className="text-sm text-gray-600 leading-snug">
                  Log your first episode to unlock this badge.
                </p>
              </div>

              <div className="relative rounded-3xl overflow-hidden border border-gray-200 bg-gray-100 p-6 flex flex-col items-center justify-center min-h-[300px]">
                <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-white shadow-lg flex items-center justify-center mb-4">
                    <Lock className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-800 font-bold text-lg">Badge Locked</p>
                  <p className="text-gray-500 text-sm mt-1 max-w-[200px] text-center">
                    Start tracking your sweat journey to reveal your badge.
                  </p>
                </div>
                {/* Faded preview */}
                <div className="opacity-30 pointer-events-none filter grayscale blur-sm w-full transform scale-90">
                  <WarriorBadge
                    userName="Warrior"
                    episodeCount={0}
                    episodes={[]}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Achievements;
