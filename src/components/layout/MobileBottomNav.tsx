import React from "react";
import { NavLink } from "react-router-dom";
import {
  Medal,
  LayoutDashboard,
  PlusCircle,
  History,
  CloudRainWind,
  Sparkles,
  Menu,
  TrendingUp,
  Users,
  MessageSquare,
  Settings,
  Hand,
  MapPin,
  Heart,
  HelpCircle,
  Mail,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

// Colour for each nav item when active
const primaryItems = [
  {
    path: "/home",
    icon: LayoutDashboard,
    label: "Home",
    activeColor: "text-violet-600",
    activeBg: "bg-violet-50",
    dotColor: "bg-violet-500",
  },
  {
    path: "/log-episode",
    icon: PlusCircle,
    label: "Log",
    activeColor: "text-pink-600",
    activeBg: "bg-pink-50",
    dotColor: "bg-pink-500",
    isCTA: true,
  },
  {
    path: "/dashboard",
    icon: LayoutDashboard,
    label: "Analytics",
    activeColor: "text-blue-600",
    activeBg: "bg-blue-50",
    dotColor: "bg-blue-500",
  },
  {
    path: "/insights",
    icon: TrendingUp,
    label: "Insight",
    activeColor: "text-pink-600",
    activeBg: "bg-pink-50",
    dotColor: "bg-pink-500",
  },
];

const moreItems = [
  { path: "/climate",      icon: CloudRainWind,    label: "Climate",    color: "text-cyan-600",    bg: "bg-cyan-50"    },
  { path: "/palm-scanner", icon: Hand,             label: "Scanner",    color: "text-cyan-600",    bg: "bg-cyan-50"    },
  { path: "/specialist-radar", icon: MapPin,       label: "Specialist", color: "text-teal-600",    bg: "bg-teal-50"    },
  { path: "/achievements",   icon: Medal,            label: "Achievements", color: "text-amber-600",   bg: "bg-amber-50"   },
  { path: "/hidro-ally",     icon: Sparkles,         label: "HidroAlly",  color: "text-amber-600",   bg: "bg-amber-50"   },
  { path: "/history",      icon: History,          label: "History",    color: "text-violet-600",  bg: "bg-violet-50"  },
  { path: "/community",    icon: Users,            label: "Community",  color: "text-emerald-600", bg: "bg-emerald-50" },
  { path: "/survey",       icon: ClipboardList,    label: "Survey",     color: "text-violet-600",  bg: "bg-violet-50"  },
  { path: "/feedback",     icon: Heart,            label: "Feedback",   color: "text-blue-600",    bg: "bg-blue-50"    },
  { path: "/faqs",         icon: HelpCircle,       label: "FAQs",       color: "text-rose-600",    bg: "bg-rose-50"    },
  { path: "/contact",      icon: Mail,             label: "Contact",    color: "text-violet-600",  bg: "bg-violet-50"  },
  { path: "/settings",     icon: Settings,         label: "Settings",   color: "text-gray-600",    bg: "bg-gray-50"    },
];

const MobileBottomNav: React.FC = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden safe-area-bottom bg-white/95 backdrop-blur-md border-t border-purple-100">
      {/* Top colour stripe */}
      <div className="h-0.5 bg-gradient-to-r from-violet-400 via-pink-400 to-amber-400" />

      <div className="bg-white/95 backdrop-blur-md shadow-lg shadow-purple-100/50">
        <div className="flex items-center justify-around h-16 px-2">

          {primaryItems.map((item) => {
            // Special CTA button for "Log"
            if (item.isCTA) {
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className="flex flex-col items-center justify-center -mt-5"
                >
                  {({ isActive }) => (
                    <>
                      <div className={cn(
                        "w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all",
                        isActive
                          ? "bg-gradient-to-br from-pink-500 to-rose-500 scale-105 shadow-pink-200"
                          : "bg-gradient-to-br from-violet-500 to-pink-500 shadow-purple-200"
                      )}>
                        <item.icon className="h-6 w-6 text-white" />
                      </div>
                      <span className={cn(
                        "text-[10px] font-bold mt-1",
                        isActive ? "text-pink-600" : "text-gray-500"
                      )}>
                        {item.label}
                      </span>
                    </>
                  )}
                </NavLink>
              );
            }

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className="flex flex-col items-center justify-center min-w-[52px]"
              >
                {({ isActive }) => (
                  <div className="flex flex-col items-center gap-0.5">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                      isActive ? `${item.activeBg} scale-105` : "hover:bg-gray-50"
                    )}>
                      <item.icon className={cn(
                        "h-5 w-5 transition-colors",
                        isActive ? item.activeColor : "text-gray-400"
                      )} />
                    </div>
                    <span className={cn(
                      "text-[10px] font-semibold transition-colors",
                      isActive ? item.activeColor : "text-gray-400"
                    )}>
                      {item.label}
                    </span>
                    {/* Active dot indicator */}
                    {isActive && (
                      <div className={cn("w-1 h-1 rounded-full", item.dotColor)} />
                    )}
                  </div>
                )}
              </NavLink>
            );
          })}

          {/* More sheet */}
          <Sheet>
            <SheetTrigger asChild>
              <button className="flex flex-col items-center justify-center min-w-[52px]">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-50">
                  <Menu className="h-5 w-5 text-gray-400" />
                </div>
                <span className="text-[10px] font-semibold text-gray-400">More</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-3xl pb-8 border-0 shadow-2xl">
              {/* Handle */}
              <div className="w-10 h-1 rounded-full bg-gray-200 mx-auto mb-6 mt-1" />

              {/* Sheet header */}
              <div className="px-2 mb-4">
                <h3 className="font-black text-gray-800 text-lg">More</h3>
                <div className="h-0.5 mt-1 bg-gradient-to-r from-violet-400 via-pink-400 to-amber-400 rounded-full" />
              </div>

              <div className="grid grid-cols-3 gap-3 px-2">
                {moreItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      cn(
                        "flex flex-col items-center justify-center gap-2 p-4 rounded-2xl text-xs font-semibold transition-all",
                        isActive
                          ? `${item.bg} ${item.color} shadow-sm`
                          : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                      )
                    }
                  >
                    <item.icon className="h-6 w-6" />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </SheetContent>
          </Sheet>

        </div>
      </div>
    </nav>
  );
};

export default MobileBottomNav;
