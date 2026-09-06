import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Terms = () => {
  return (
    <AppLayout>
      <div className="container max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-foreground">Terms of Service</h1>
          <p className="text-professional-gray">
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <div className="space-y-6">
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>Acceptance of Terms</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-professional-gray text-sm">
                By accessing or using HidroAlly ("the Service"), you agree to be bound by these Terms of Service ("Terms").
                If you disagree with any part of these terms, you may not access the Service. These Terms apply to all visitors, 
                users, and others who access or use the Service.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>Description of Service</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-professional-gray text-sm">
                HidroAlly is a digital health platform designed to help users track and manage hyperhidrosis symptoms. Our service includes:
              </p>
              <ul className="text-professional-gray text-sm space-y-1 list-disc list-inside">
                <li>Episode tracking and logging capabilities</li>
                <li>Personalized insights and pattern recognition</li>
                <li>Data visualization and reporting tools</li>
                <li>Educational resources about hyperhidrosis management</li>
              </ul>
              <div className="bg-accent/50 p-4 rounded-lg">
                <p className="text-sm font-semibold text-foreground mb-2">Important Medical Disclaimer:</p>
                <p className="text-professional-gray text-sm">
                  HidroAlly is NOT a medical device and does not provide medical diagnosis, treatment, or advice.
                  Always consult with qualified healthcare professionals for medical concerns.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>User Accounts</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-professional-gray text-sm space-y-2 list-disc list-inside">
                <li>You must provide accurate and complete information when creating an account</li>
                <li>You are responsible for maintaining the security of your account credentials</li>
                <li>You must notify us immediately of any unauthorized access to your account</li>
                <li>One person may not maintain multiple accounts</li>
                <li>You must be at least 13 years old to use this service</li>
                <li>Users under 18 must have parental consent</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>Acceptable Use</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-foreground mb-2">You may:</h3>
                <ul className="text-professional-gray text-sm space-y-1 list-disc list-inside">
                  <li>Use the service for personal hyperhidrosis tracking and management</li>
                  <li>Share your data with healthcare providers</li>
                  <li>Export your personal data</li>
                  <li>Provide feedback and suggestions for improvement</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold text-foreground mb-2">You may NOT:</h3>
                <ul className="text-professional-gray text-sm space-y-1 list-disc list-inside">
                  <li>Use the service for any illegal or unauthorized purpose</li>
                  <li>Share or sell your account access to others</li>
                  <li>Attempt to gain unauthorized access to other users' data</li>
                  <li>Upload malicious code or attempt to compromise the service</li>
                  <li>Use the service to provide medical advice to others</li>
                  <li>Reverse engineer or copy our software</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>Data and Privacy</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-professional-gray text-sm space-y-2 list-disc list-inside">
                <li>Your health data remains your property</li>
                <li>We process your data according to our Privacy Policy</li>
                <li>You can request data deletion at any time</li>
                <li>We may use aggregated, anonymized data for research and improvement</li>
                <li>You are responsible for the accuracy of the data you input</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>Service Availability</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-professional-gray text-sm mb-4">
                We strive to maintain service availability but cannot guarantee uninterrupted access:
              </p>
              <ul className="text-professional-gray text-sm space-y-1 list-disc list-inside">
                <li>Service may be temporarily unavailable due to maintenance</li>
                <li>We may suspend service for violations of these Terms</li>
                <li>Technical issues may occasionally affect service quality</li>
                <li>We reserve the right to modify or discontinue features</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>Limitation of Liability</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-accent/50 p-4 rounded-lg mb-4">
                <p className="text-sm font-semibold text-foreground mb-2">Medical Limitation:</p>
                <p className="text-professional-gray text-sm">
                  HidroAlly is not responsible for any medical decisions made based on data or insights from our platform.
                  Always consult healthcare professionals for medical advice.
                </p>
              </div>
              <p className="text-professional-gray text-sm">
                To the maximum extent permitted by law, HidroAlly shall not be liable for any indirect, incidental,
                special, or consequential damages arising from your use of the service, even if we have been advised 
                of the possibility of such damages.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>Termination</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-professional-gray text-sm space-y-2 list-disc list-inside">
                <li>You may terminate your account at any time</li>
                <li>We may terminate accounts for violations of these Terms</li>
                <li>Upon termination, your access to the service will cease immediately</li>
                <li>We will retain your data according to our Privacy Policy</li>
                <li>Some provisions of these Terms will survive termination</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-professional-gray text-sm mb-4">
                If you have questions about these Terms of Service, please contact us:
              </p>
              <p className="text-sm">
                <span className="font-semibold text-foreground">Email:</span>{" "}
                <a href="mailto:sweatsmart@beyondsweat.life" className="text-primary hover:underline">
                  sweatsmart@beyondsweat.life
                </a>
              </p>
            </CardContent>
          </Card>

          <div className="bg-clean-white rounded-lg p-6 border border-border/50">
            <p className="text-sm text-professional-gray">
              <strong>Changes to Terms:</strong> We reserve the right to modify these Terms at any time. 
              We will notify users of significant changes via email or through the app. 
              Continued use of the service after changes constitutes acceptance of the new Terms.
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Terms;