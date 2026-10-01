import { Heart } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const Feedback = () => {
  return (
    <AppLayout>
      <div className="container max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-foreground">Share Your Feedback</h1>
          <p className="text-xl text-professional-gray max-w-2xl mx-auto">
            Your voice matters to us! We're constantly working to improve HidroAlly.
          </p>
        </div>

        <Card className="border-border/50 shadow-sm bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Heart className="h-5 w-5 text-blue-500" />
              Share Your Feedback
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-professional-gray">
              Your voice matters to us! We're constantly working to improve HidroAlly and make it the best tool for managing hyperhidrosis. Whether it's a feature request, a suggestion, or just sharing your experience — we'd love to hear from you.
            </p>
            <p className="text-sm text-professional-gray">
              Every piece of feedback helps us build a better community and a more supportive experience for everyone living with hyperhidrosis.
            </p>
            <Button
              onClick={() => window.open('https://docs.google.com/forms/d/e/1FAIpQLSfHBkUOMxFhB03UyfpnrEQk5VlszVUFN2n-TqjRwJ1ehqSeTw/viewform?fbzx=7815900527824722421', '_blank')}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white"
            >
              Share Your Feedback
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Feedback;
