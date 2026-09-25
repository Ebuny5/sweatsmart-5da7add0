import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { ExternalLink } from "lucide-react";

const Legal = () => {
  const { session } = useAuth();

  return (
    <AppLayout isAuthenticated={!!session}>
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <h1 className="text-4xl font-bold mb-6">Legal Information</h1>
        
        <Card>
          <CardHeader>
            <CardTitle>Company Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-700">
            <p>
              HidroAlly is developed and managed by Giftovate Therapeutics Ltd., in partnership with <a href="https://www.beyondsweat.life" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                Beyond Sweat Foundation <ExternalLink className="w-4 h-4" />
              </a>, to alleviate the challenges of hyperhidrosis warriors through digital health innovation.
            </p>
            
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <p className="font-semibold">Registered Company Number (RC): RC 8721638</p>
              <p className="mt-2">Registered in: Nigeria</p>
            </div>
            
            <p className="mt-6">
              For more information, visit <a href="https://www.giftovate.world" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                www.giftovate.world <ExternalLink className="w-4 h-4" />
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Legal;
