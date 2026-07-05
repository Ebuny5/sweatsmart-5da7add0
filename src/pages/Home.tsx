import { useState } from "react";
import QuickActions from "@/components/dashboard/QuickActions";
import AppLayout from "@/components/layout/AppLayout";
import { PermissionGuidanceModal } from "@/components/notifications/PermissionGuidanceModal";
import ClimateNotificationSidebar from "@/components/climate/ClimateNotificationSidebar";
import { Menu } from "lucide-react";

const Home = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <AppLayout>
      <PermissionGuidanceModal />
      <QuickActions />

      {/* Corner UI Toggle for Climate Testing */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="fixed top-20 right-4 z-50 p-3 bg-violet-600 text-white rounded-xl shadow-lg hover:bg-violet-700 transition-all active:scale-95 md:top-24"
        aria-label="Toggle Climate Testing"
      >
        <Menu className="h-6 w-6" />
      </button>

      <ClimateNotificationSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
    </AppLayout>
  );
};

export default Home;

