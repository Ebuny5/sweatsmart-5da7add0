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

  return (
    <header className="w-full z-50 sticky top-0">
      <div className="bg-gradient-to-r from-violet-600 via-purple-500 to-pink-500 shadow-lg shadow-purple-200/50">
        <div className="container flex h-16 items-center justify-between px-4">

          {/* Logo */}
          <div
            className="flex items-center gap-2.5 cursor-pointer"
            onClick={() => navigate(user ? "/home" : "/")}
          >
            <div className="relative h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-inner border border-blue-400/50">
              <span className="text-white text-lg font-black">S</span>
              <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-amber-400 border-2 border-white shadow-sm" />
            </div>
            <div>
              <h1 className="text-blue-300 text-xl font-black tracking-tight leading-none">
                SweatSmart
              </h1>
              <p className="text-blue-200 text-xs font-bold leading-none mt-0.5">
                Hyperhidrosis Tracker
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
                      <div className={`relative w-9 h-9 rounded-full bg-gradient-to-br ${avatarGradient} flex items-center justify-center shadow-inner border-2 border-white/60`}>
                        <span className="text-white text-sm font-black">{userInitials}</span>
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white shadow-sm" />
                    </div>
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  align="end"
                  className="w-56 rounded-2xl shadow-xl border border-purple-100 p-1 mt-2"
                >
                  <div className="px-3 py-3 mb-1">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarGradient} flex items-center justify-center shadow-sm`}>
                        <span className="text-white text-sm font-black">{userInitials}</span>
                      </div>
                      <div className="overflow-hidden">
                        <p className="font-bold text-sm text-gray-800 truncate">{userName || "User"}</p>
                        <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                      </div>
                    </div>
                  </div>

                  <DropdownMenuSeparator className="bg-purple-50" />

                  <DropdownMenuItem
                    onClick={() => navigate("/profile")}
                    className="rounded-xl gap-2.5 cursor-pointer py-2.5 focus:bg-purple-50"
                  >
                    <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center">
                      <User className="h-3.5 w-3.5 text-violet-600" />
                    </div>
                    <span className="font-medium text-sm">Profile</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => navigate("/settings")}
                    className="rounded-xl gap-2.5 cursor-pointer py-2.5 focus:bg-purple-50"
                  >
                    <div className="w-7 h-7 rounded-lg bg-pink-100 flex items-center justify-center">
                      <Settings className="h-3.5 w-3.5 text-pink-600" />
                    </div>
                    <span className="font-medium text-sm">Settings</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => window.open("https://docs.google.com/forms/d/e/1FAIpQLSfHBkUOMxFhB03UyfpnrEQk5VlszVUFN2n-TqjRwJ1ehqSeTw/viewform", "_blank", "noopener,noreferrer")}
                    className="rounded-xl gap-2.5 cursor-pointer py-2.5 focus:bg-purple-50"
                  >
                    <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
                      <MessageSquare className="h-3.5 w-3.5 text-amber-600" />
                    </div>
                    <span className="font-medium text-sm">Feedback</span>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="bg-purple-50" />

                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="rounded-xl gap-2.5 cursor-pointer py-2.5 focus:bg-red-50 text-red-500 focus:text-red-600"
                  >
                    <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center">
                      <LogOut className="h-3.5 w-3.5 text-red-500" />
                    </div>
                    <span className="font-medium text-sm">Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate("/login")}
                  className="text-white/90 hover:text-white text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-white/10 transition-all"
                >
                  Login
                </button>
                <button
                  onClick={() => navigate("/register")}
                  className="bg-white text-purple-600 text-sm font-bold px-4 py-1.5 rounded-lg hover:bg-purple-50 transition-all shadow-sm"
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
