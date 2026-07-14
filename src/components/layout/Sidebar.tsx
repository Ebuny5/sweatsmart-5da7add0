import React from "react";
import { NavLink } from "react-router-dom";
import {
  Home,
  LayoutDashboard,
  PlusCircle,
  History,
  TrendingUp,
  Hand,
  CloudRainWind,
  Users,
  MessageSquare,
  Settings,
  Sparkles,
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";

const menuItems = [
  {
    path: "/home",
    icon: Home,
    label: "Home",
    activeGradient: "from-violet-500 to-purple-600",
    activeBg: "bg-violet-50",
    activeText: "text-violet-700",
    iconBg: "bg-violet-100",
  },
  {
    path: "/log-episode",
    icon: PlusCircle,
    label: "Log Episode",
    activeGradient: "from-pink-500 to-rose-500",
    activeBg: "bg-pink-50",
    activeText: "text-pink-700",
    iconBg: "bg-pink-100",
  },
  {
    path: "/dashboard",
    icon: LayoutDashboard,
    label: "Analytics",
    activeGradient: "from-blue-500 to-indigo-600",
    activeBg: "bg-blue-50",
    activeText: "text-blue-700",
    iconBg: "bg-blue-100",
  },
  {
    path: "/insights",
    icon: TrendingUp,
    label: "Insights",
    activeGradient: "from-amber-400 to-orange-500",
    activeBg: "bg-amber-50",
    activeText: "text-amber-700",
    iconBg: "bg-amber-100",
  },
  {
    path: "/history",
    icon: History,
    label: "History",
    activeGradient: "from-fuchsia-500 to-pink-600",
    activeBg: "bg-fuchsia-50",
    activeText: "text-fuchsia-700",
    iconBg: "bg-fuchsia-100",
  },
  {
    path: "/climate",
    icon: CloudRainWind,
    label: "Climate Alert",
    activeGradient: "from-sky-400 to-cyan-500",
    activeBg: "bg-sky-50",
    activeText: "text-sky-700",
    iconBg: "bg-sky-100",
  },
  {
    path: "/palm-scanner",
    icon: Hand,
    label: "Scanner",
    activeGradient: "from-cyan-400 to-blue-500",
    activeBg: "bg-cyan-50",
    activeText: "text-cyan-700",
    iconBg: "bg-cyan-100",
  },
  {
    path: "/specialist-radar",
    icon: MapPin,
    label: "Specialist Radar",
    activeGradient: "from-teal-400 to-cyan-500",
    activeBg: "bg-teal-50",
    activeText: "text-teal-700",
    iconBg: "bg-teal-100",
  },
  {
    path: "/hidro-ally",
    icon: Sparkles,
    label: "HidroAlly",
    activeGradient: "from-yellow-400 to-amber-500",
    activeBg: "bg-yellow-50",
    activeText: "text-yellow-700",
    iconBg: "bg-yellow-100",
  },
  {
    path: "/community",
    icon: Users,
    label: "Community",
    activeGradient: "from-emerald-400 to-teal-500",
    activeBg: "bg-emerald-50",
    activeText: "text-emerald-700",
    iconBg: "bg-emerald-100",
  },
  {
    path: "/contact",
    icon: MessageSquare,
    label: "Feedback",
    activeGradient: "from-violet-400 to-purple-500",
    activeBg: "bg-violet-50",
    activeText: "text-violet-700",
    iconBg: "bg-violet-100",
  },
  {
    path: "/settings",
    icon: Settings,
    label: "Settings",
    activeGradient: "from-gray-400 to-gray-600",
    activeBg: "bg-gray-50",
    activeText: "text-gray-700",
    iconBg: "bg-gray-100",
  },
];

const Sidebar: React.FC = () => {
  return (
    <aside className="w-64 flex flex-col bg-white border-r border-purple-100 shadow-sm">

      {/* ── Nav items ─────────────────────────────────────────────────── */}
      <nav className="flex-1 p-3 overflow-y-auto">
        <ul className="space-y-1">
          {menuItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all group",
                    isActive
                      ? `${item.activeBg} ${item.activeText}`
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {/* Icon container */}
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center transition-all shrink-0",
                      isActive
                        ? `bg-gradient-to-br ${item.activeGradient} shadow-sm`
                        : `${item.iconBg} group-hover:scale-105`
                    )}>
                      <item.icon className={cn(
                        "h-4 w-4",
                        isActive ? "text-white" : ""
                      )} />
                    </div>

                    <span className="truncate">{item.label}</span>

                    {/* Active indicator bar */}
                    {isActive && (
                      <div className={cn(
                        "ml-auto w-1.5 h-5 rounded-full bg-gradient-to-b",
                        item.activeGradient
                      )} />
                    )}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* ── Footer stripe ─────────────────────────────────────────────── */}
      <div className="h-0.5 bg-gradient-to-r from-violet-400 via-pink-400 to-amber-400" />
      <div className="p-4">
        <div className="rounded-xl bg-gradient-to-br from-violet-50 to-pink-50 border border-purple-100 p-3 text-center">
          <p className="text-xs font-bold text-purple-700">🏅 Hyperhidrosis Tracker</p>
          <p className="text-[10px] text-gray-500 mt-0.5">Track · Understand · Manage</p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
