import { ClipboardList } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const Survey = () => {
  return (
    <AppLayout>
      <div className="container max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-foreground">Survey</h1>
          <p className="text-xl text-professional-gray max-w-2xl mx-auto">
            Participate in the First Pan-Africa Hyperhidrosis Survey.
          </p>
        </div>

        <Card className="border-border/50 shadow-sm bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <ClipboardList className="h-5 w-5 text-blue-500" />
              Pan-Africa Hyperhidrosis Survey
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-professional-gray">
              Welcome to the First Pan-African Hyperhidrosis survey documenting experiences of hyperhidrosis (excessive sweating) in Africa.
            </p>
            <p className="text-sm text-professional-gray">
              Your participation will help establish the first epidemiological data on hyperhidrosis in Africa, inform healthcare policy and medical education, improve access to diagnosis and treatment, break the silence around this condition, and advocate for inclusion in global health programs.
            </p>
            <Button
              onClick={() => window.open('https://docs.google.com/forms/d/1VHmpQSef9rYXU4QnU0Z0YsUR4YEjPR2eYr0ksvFwpdU/viewform', '_blank')}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white"
            >
              Take the Survey
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Survey;
