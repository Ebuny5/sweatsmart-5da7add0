import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { QRCodeSVG } from 'qrcode.react';

interface MFASetupDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const MFASetupDialog = ({ isOpen, onClose, onSuccess }: MFASetupDialogProps) => {
  const [step, setStep] = useState<'enroll' | 'verify'>('enroll');
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      startEnrollment();
    } else {
      // Reset state when closed
      setStep('enroll');
      setQrCodeUrl(null);
      setSecret(null);
      setFactorId(null);
      setVerifyCode('');
    }
  }, [isOpen]);

  const startEnrollment = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
      });

      if (error) throw error;

      if (data) {
        setFactorId(data.id);
        setQrCodeUrl(data.totp.qr_code);
        setSecret(data.totp.secret);
        setStep('verify');
      }
    } catch (error: any) {
      toast({
        title: "Error starting enrollment",
        description: error.message,
        variant: "destructive",
      });
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const verifyEnrollment = async () => {
    if (!factorId) return;

    setIsLoading(true);
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      });

      if (challengeError) throw challengeError;

      const { data, error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: verifyCode,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "2-Factor Authentication has been enabled.",
      });
      onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        title: "Verification failed",
        description: error.message || "Invalid code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-white">
        <DialogHeader>
          <DialogTitle>Set up 2-Factor Authentication</DialogTitle>
          <DialogDescription>
            Secure your account by requiring a code from your authenticator app.
          </DialogDescription>
        </DialogHeader>

        {isLoading && step === 'enroll' ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {qrCodeUrl && (
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                  <QRCodeSVG value={qrCodeUrl} size={200} />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-sm font-medium text-gray-800">Scan QR Code</p>
                  <p className="text-xs text-gray-500">Scan this code with your authenticator app (e.g. Google Authenticator, Authy)</p>
                </div>

                {secret && (
                  <div className="w-full">
                    <p className="text-xs text-gray-500 mb-1 text-center">Or enter this code manually:</p>
                    <div className="bg-gray-50 p-2 rounded text-center font-mono text-sm break-all border border-gray-200">
                      {secret}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="code" className="text-sm font-semibold text-gray-800">
                Enter Verification Code
              </label>
              <Input
                id="code"
                placeholder="000 000"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                className="text-center text-xl tracking-widest h-12"
                maxLength={6}
              />
            </div>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0 mt-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full sm:w-auto"
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={verifyEnrollment}
            disabled={verifyCode.length !== 6 || isLoading}
            className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600 text-white"
          >
            {isLoading ? "Verifying..." : "Verify & Enable"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
