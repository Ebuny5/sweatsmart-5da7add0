import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";

const Cookies = () => {
  const { session } = useAuth();

  return (
    <AppLayout isAuthenticated={!!session}>
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <h1 className="text-4xl font-bold mb-6">Cookies Policy</h1>
        
        <Card>
          <CardHeader>
            <CardTitle>How We Use Cookies</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-700">
            <p>
              Our website may use cookies to:
            </p>
            
            <ul className="list-disc pl-6 space-y-2">
              <li>Save your preferences</li>
              <li>Track anonymous usage statistics</li>
              <li>Improve browsing experience</li>
            </ul>
            
            <p className="mt-4">
              You may disable cookies in your browser settings, though some features may not work as intended.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Cookies;
