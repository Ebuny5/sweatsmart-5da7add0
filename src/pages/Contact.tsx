import { Mail, MessageSquare, Clock, Heart, ExternalLink } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Inline SVG icons for the 4 social platforms (no extra library needed)
const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" className="w-full h-full fill-current" xmlns="http://www.w3.org/2000/svg">
    <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.874v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
  </svg>
);

const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" className="w-full h-full fill-current" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);

const LinkedInIcon = () => (
  <svg viewBox="0 0 24 24" className="w-full h-full fill-current" xmlns="http://www.w3.org/2000/svg">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

const TwitterXIcon = () => (
  <svg viewBox="0 0 24 24" className="w-full h-full fill-current" xmlns="http://www.w3.org/2000/svg">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.259 5.631 5.905-5.631zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const Contact = () => {
  return (
    <AppLayout>
      <div className="container max-w-4xl mx-auto space-y-8">

        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-foreground">Contact Us</h1>
          <p className="text-xl text-professional-gray max-w-2xl mx-auto">
            Have questions about HidroAlly? We're here to help you on your hyperhidrosis management journey.
          </p>
        </div>

        {/* Email + Response Time */}
        <div className="grid gap-8 md:grid-cols-2">
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-primary" />
                Email Support
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-professional-gray">
                Get in touch with our support team for any questions or assistance.
              </p>
              <div className="space-y-2">
                <p className="font-medium text-foreground">General Support</p>
                <a
                  href="mailto:info@giftovate.world"
                  className="text-primary hover:underline flex items-center gap-2"
                >
                  info@giftovate.world
                  <Mail className="h-4 w-4" />
                </a>
              </div>
              <Button
                onClick={() => window.location.href = 'mailto:info@giftovate.world'}
                className="w-full"
              >
                Send Email
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-primary" />
                Response Time
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-professional-gray">
                We typically respond to all inquiries within 24-48 hours during business days.
              </p>
              <div className="space-y-3">
                <div>
                  <p className="font-medium text-foreground">Business Hours</p>
                  <p className="text-sm text-professional-gray">Monday - Friday: 9:00 AM - 5:00 PM EST</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">Weekend Support</p>
                  <p className="text-sm text-professional-gray">Limited support on weekends</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Social Media */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <ExternalLink className="h-5 w-5 text-primary" />
              Follow Us
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-professional-gray text-center">
              Follow for more updates on the app and emerging technology
            </p>
            <div className="flex items-center justify-center gap-6 py-4">

              {/* Facebook */}
              <button
                onClick={() => window.open('https://www.facebook.com/giftovatetherapeutics', '_blank')}
                className="w-16 h-16 rounded-full flex items-center justify-center text-white transition-transform hover:scale-110 active:scale-95"
                style={{ background: '#1877F2' }}
                aria-label="Facebook"
              >
                <span className="w-7 h-7"><FacebookIcon /></span>
              </button>

              {/* Instagram */}
              <button
                onClick={() => window.open('https://www.instagram.com/giftovatetherapeutics', '_blank')}
                className="w-16 h-16 rounded-full flex items-center justify-center text-white transition-transform hover:scale-110 active:scale-95"
                style={{ background: 'linear-gradient(135deg, #f58529, #dd2a7b, #8134af)' }}
                aria-label="Instagram"
              >
                <span className="w-7 h-7"><InstagramIcon /></span>
              </button>

              {/* LinkedIn */}
              <button
                onClick={() => window.open('https://www.linkedin.com/company/giftovate-therapeutics-ltd/', '_blank')}
                className="w-16 h-16 rounded-full flex items-center justify-center text-white transition-transform hover:scale-110 active:scale-95"
                style={{ background: '#0A66C2' }}
                aria-label="LinkedIn"
              >
                <span className="w-7 h-7"><LinkedInIcon /></span>
              </button>

              {/* Twitter / X */}
              <button
                onClick={() => window.open('https://x.com/giftovatethera', '_blank')}
                className="w-16 h-16 rounded-full flex items-center justify-center text-white transition-transform hover:scale-110 active:scale-95"
                style={{ background: '#000000' }}
                aria-label="Twitter / X"
              >
                <span className="w-7 h-7"><TwitterXIcon /></span>
              </button>

            </div>
          </CardContent>
        </Card>

        {/* WhatsApp Community */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-green-500" />
              WhatsApp Community
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-professional-gray">
              Join our WhatsApp group to connect directly with others managing hyperhidrosis, share tips and get real-time support.
            </p>
            <Button
              onClick={() => window.open('https://chat.whatsapp.com/BKgrDMOttm76Jva6fSZUMi?mode=ac_t', '_blank')}
              className="w-full bg-green-500 hover:bg-green-600 text-white"
            >
              Join WhatsApp Group
            </Button>
          </CardContent>
        </Card>

        {/* Beyond Sweat Foundation */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <ExternalLink className="h-5 w-5 text-teal-500" />
              Beyond Sweat Foundation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-professional-gray">
              A dedicated foundation providing education, advocacy and support resources for the global hyperhidrosis community.
            </p>
            <Button
              onClick={() => window.open('https://www.beyondsweat.org', '_blank')}
              className="w-full bg-teal-500 hover:bg-teal-600 text-white"
            >
              Visit beyondsweat.org
            </Button>
          </CardContent>
        </Card>

        {/* Feedback */}
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

        {/* FAQ */}
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
        <div className="text-center bg-clean-white rounded-lg p-8 border border-border/50">
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

export default Contact;
