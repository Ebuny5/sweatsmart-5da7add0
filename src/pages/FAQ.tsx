import { MessageSquare } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const FAQ = () => {
  return (
    <AppLayout>
      <div className="container max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-foreground">Frequently Asked Questions</h1>
          <p className="text-xl text-professional-gray max-w-2xl mx-auto">
            Find answers to common questions about using HidroAlly.
          </p>
        </div>

        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-primary" />
              Frequently Asked Questions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-foreground mb-2">How do I track my hyperhidrosis episodes?</h3>
                <p className="text-professional-gray text-sm">
                  Simply log into your HidroAlly dashboard and click "Log Episode" to record details about your hyperhidrosis episodes, including triggers, severity, and affected areas.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">Is my health data secure?</h3>
                <p className="text-professional-gray text-sm">
                  Yes, we take data security seriously. All your health information is encrypted and stored securely in compliance with healthcare privacy standards.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">Can I export my data?</h3>
                <p className="text-professional-gray text-sm">
                  Yes, you can export your episode data and insights to share with your healthcare provider or for your personal records.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Immediate Help */}
        <div className="text-center bg-clean-white rounded-lg p-8 border border-border/50 mt-8">
          <h2 className="text-2xl font-bold text-foreground mb-4">Need Immediate Help?</h2>
          <p className="text-professional-gray mb-6">
            For urgent medical concerns, please consult with your healthcare provider or contact emergency services.
          </p>
          <p className="text-sm text-professional-gray">
            HidroAlly is a tracking and management tool and should not replace professional medical advice.
          </p>
        </div>
      </div>
    </AppLayout>
  );
};

export default FAQ;
