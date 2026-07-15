import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { LogOut, User, Settings, MessageSquare } from "lucide-react";

interface HeaderProps {
  isAuthenticated?: boolean;
}

const AVATAR_GRADIENTS = [
  "from-violet-500 to-purple-600",
  "from-pink-500 to-rose-500",
  "from-amber-400 to-orange-500",
  "from-cyan-400 to-blue-500",
  "from-emerald-400 to-teal-500",
  "from-fuchsia-500 to-pink-600",
];

const getAvatarGradient = (initials: string) => {
  const index = (initials.charCodeAt(0) || 0) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[index];
};

const Header: React.FC<HeaderProps> = ({ isAuthenticated }) => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { profile } = useProfile();

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const userName = profile?.display_name || user?.email || "";
  const userInitials = userName
    ? userName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  const avatarGradient = getAvatarGradient(userInitials);

  // Custom Avatar rendering logic
  const renderAvatar = (sizeClasses: string) => {
    if (profile?.avatar_type === 'image' && profile.avatar) {
      return (
        <img
          src={profile.avatar}
          alt="Avatar"
          className={`rounded-full object-cover ${sizeClasses}`}
        />
      );
    } else if (profile?.avatar_type === 'emoji' && profile.avatar) {
      return (
        <div className={`rounded-full bg-white flex items-center justify-center ${sizeClasses}`}>
          <span className="text-xl leading-none">{profile.avatar}</span>
        </div>
      );
    } else {
      // Default avatar (no picture/emoji selected yet) — matches 5th option in Profile picker
      return (
        <div className={`rounded-full bg-white flex items-center justify-center ${sizeClasses}`}>
          <span className="text-xl leading-none">👩</span>
        </div>
      );
    }
  };

  return (
    <header className="w-full z-50 sticky top-0 safe-area-top bg-violet-600">
      <div className="bg-gradient-to-r from-violet-600 via-purple-500 to-pink-500 shadow-lg shadow-purple-200/50">
        <div className="container flex h-16 items-center justify-between px-4">

          {/* Logo */}
          <div
            className="flex items-center gap-2.5 cursor-pointer"
            onClick={() => navigate(user ? "/home" : "/")}
          >
            <div className="flex items-center justify-center">
              <span className="text-2xl drop-shadow-md">🏅</span>
            </div>
            <div>
              <h1 className="text-white text-xl font-black tracking-tight leading-none drop-shadow-md">
                SweatSmart
              </h1>
              <p className="text-white/80 text-xs font-bold leading-none mt-0.5 drop-shadow-md">
                {user ? "Hyperhidrosis Warrior" : "Hyperhidrosis Tracker"}
              </p>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="relative flex items-center gap-2 focus:outline-none group">
                    <div className="relative">
                      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-300 to-orange-400 scale-[1.15] shadow-md" />
                      <div className="relative w-9 h-9 rounded-full overflow-hidden border-2 border-white/60">
                        {renderAvatar("w-full h-full")}
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white shadow-sm z-10" />
                    </div>
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  align="end"
                  className="w-56 rounded-2xl shadow-xl border border-purple-100 p-1 mt-2"
                >
                  <DropdownMenuItem
                    onClick={() => navigate("/profile")}
                    className="rounded-xl gap-2.5 cursor-pointer py-2.5 focus:bg-purple-50"
                  >
                    <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center">
                      <User className="h-3.5 w-3.5 text-violet-600" />
                    </div>
                    <span className="font-medium text-sm">Profile</span>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="bg-purple-50" />

                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="rounded-xl gap-2.5 cursor-pointer py-2.5 focus:bg-red-50"
                  >
                    <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center">
                      <LogOut className="h-3.5 w-3.5 text-red-600" />
                    </div>
                    <span className="font-medium text-sm text-red-600">Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate("/login")}
                  className="bg-[#D6CEFA]/20 text-white hover:bg-[#D6CEFA]/40 text-sm font-medium px-4 py-1.5 rounded-lg transition-all border border-[#D6CEFA]/50"
                >
                  Login
                </button>
                <button
                  onClick={() => navigate("/register")}
                  className="bg-[#D6CEFA] text-violet-800 text-sm font-bold px-4 py-1.5 rounded-lg hover:brightness-105 transition-all shadow-sm"
                >
                  Sign Up
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="h-0.5 bg-gradient-to-r from-violet-400 via-pink-400 to-amber-400" />
    </header>
  );
};

export default Header;
