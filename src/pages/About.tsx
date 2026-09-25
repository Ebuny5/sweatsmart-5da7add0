import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { ExternalLink } from "lucide-react";

const About = () => {
  const { session } = useAuth();

  return (
    <AppLayout isAuthenticated={!!session}>
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <h1 className="text-4xl font-bold mb-6">About Us</h1>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Our Mission</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-700">
            <p>
              At <a href="https://www.giftovate.world" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                Giftovate Therapeutics Ltd <ExternalLink className="w-4 h-4" />
              </a>, we are reimagining digital health for invisible and stigmatized conditions. Our flagship innovation, the HidroAlly app, empowers individuals living with hyperhidrosis to log symptoms, analyze triggers, and receive personalized recommendations for better daily management.
            </p>
            
            <p>
              HidroAlly already features a palm scanner powered by Google Gemini Cloud Vision and generative AI, capable of differentiating and detecting hyperhidrosis. This demo has been successfully integrated with simulated data from Xiaomi Band wearables and galvanic skin response (GSR) sensors during the Innovate Naija Challenge. With funding, we aim to expand to full live sensor integration, delivering real-time readings for users worldwide.
            </p>
            
            <p>
              In partnership with the <a href="https://www.beyondsweat.life" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                Beyond Sweat Foundation <ExternalLink className="w-4 h-4" />
              </a>, we are also developing eco-capsule cooling devices and thermoelectric gloves and socks — practical, affordable solutions to give hyperhidrosis warriors comfort and confidence, especially in Africa's hot climate.
            </p>
            
            <p className="font-semibold">
              Our mission is simple: alleviate the challenges of hyperhidrosis warriors through innovation, advocacy, and inclusive health technology.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default About;
