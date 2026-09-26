import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Privacy = () => {
  return (
    <AppLayout>
      <div className="container max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-foreground">Privacy Policy</h1>
          <p className="text-professional-gray">
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <div className="space-y-6">
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>Information We Collect</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-foreground mb-2">Personal Information</h3>
                <ul className="text-professional-gray text-sm space-y-1 list-disc list-inside">
                  <li>Email address and account credentials</li>
                  <li>Profile information you choose to provide</li>
                  <li>Communication preferences</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold text-foreground mb-2">Health Data</h3>
                <ul className="text-professional-gray text-sm space-y-1 list-disc list-inside">
                  <li>Hyperhidrosis episode logs and symptoms</li>
                  <li>Trigger information and patterns</li>
                  <li>Severity ratings and affected body areas</li>
                  <li>Treatment and management notes</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">Usage Data</h3>
                <ul className="text-professional-gray text-sm space-y-1 list-disc list-inside">
                  <li>App usage patterns and preferences</li>
                  <li>Device information and technical data</li>
                  <li>Analytics and performance metrics</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>How We Use Your Information</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-professional-gray text-sm space-y-2 list-disc list-inside">
                <li>Provide and improve our hyperhidrosis tracking services</li>
                <li>Generate personalized insights and recommendations</li>
                <li>Send important updates about your account and our services</li>
                <li>Ensure the security and integrity of our platform</li>
                <li>Comply with legal obligations and protect user rights</li>
                <li>Research and development for better hyperhidrosis management tools</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>Data Security</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-professional-gray text-sm mb-4">
                We implement industry-standard security measures to protect your personal and health information:
              </p>
              <ul className="text-professional-gray text-sm space-y-1 list-disc list-inside">
                <li>End-to-end encryption for all data transmission</li>
                <li>Secure data storage with regular backups</li>
                <li>Multi-factor authentication options</li>
                <li>Regular security audits and monitoring</li>
                <li>Compliance with healthcare data protection standards</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>Your Rights</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-professional-gray text-sm mb-4">
                You have the following rights regarding your personal data:
              </p>
              <ul className="text-professional-gray text-sm space-y-1 list-disc list-inside">
                <li>Access and review your personal information</li>
                <li>Request corrections to inaccurate data</li>
                <li>Delete your account and associated data</li>
                <li>Export your data in a portable format</li>
                <li>Opt-out of non-essential communications</li>
                <li>Withdraw consent for data processing</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>Data Sharing</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-professional-gray text-sm mb-4">
                We do not sell your personal or health data. We may share information only in these limited circumstances:
              </p>
              <ul className="text-professional-gray text-sm space-y-1 list-disc list-inside">
                <li>With your explicit consent</li>
                <li>To comply with legal requirements</li>
                <li>With trusted service providers under strict confidentiality agreements</li>
                <li>In case of business transfer (with advance notice)</li>
                <li>To protect the safety and rights of users</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-professional-gray text-sm mb-4">
                If you have questions about this Privacy Policy or want to exercise your rights, contact us:
              </p>
              <div className="space-y-2">
                <p className="text-sm">
                  <span className="font-semibold text-foreground">Email:</span>{" "}
                  <a href="mailto:sweatsmart@beyondsweat.life" className="text-primary hover:underline">
                    sweatsmart@beyondsweat.life
                  </a>
                </p>
                <p className="text-professional-gray text-sm">
                  We will respond to your privacy-related inquiries within 30 days.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="bg-clean-white rounded-lg p-6 border border-border/50">
            <p className="text-sm text-professional-gray">
              <strong>Important:</strong> This Privacy Policy may be updated periodically. We will notify you of any significant changes via email or through the app. Your continued use of HidroAlly after changes take effect constitutes acceptance of the updated policy.
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Privacy;