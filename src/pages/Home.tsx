import QuickActions from "@/components/dashboard/QuickActions";
import AppLayout from "@/components/layout/AppLayout";
import { PermissionGuidanceModal } from "@/components/notifications/PermissionGuidanceModal";

const Home = () => {
  return (
    <AppLayout>
      <PermissionGuidanceModal />
      <QuickActions />
    </AppLayout>
  );
};

export default Home;

