import { useEffect, useRef, useCallback, useState } from "react";

interface CaptchaProps {
  onVerify: (isVerified: boolean) => void;
  className?: string;
}

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
    onTurnstileLoad?: () => void;
  }
}

const Captcha = ({ onVerify, className }: CaptchaProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "verified" | "error">("loading");

  const removeWidget = useCallback(() => {
    if (!widgetIdRef.current || !window.turnstile) return;
    try {
      window.turnstile.remove(widgetIdRef.current);
    } catch {
      // ignore widget cleanup errors
    }
    widgetIdRef.current = null;
  }, []);

  const renderWidget = useCallback(() => {
    if (!containerRef.current || !window.turnstile) return;

    if (!TURNSTILE_SITE_KEY) {
      console.error("Turnstile site key missing: set VITE_TURNSTILE_SITE_KEY");
      setStatus("error");
      onVerify(true);
      return;
    }

    removeWidget();

    try {
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        theme: "light",
        size: "normal",
        appearance: "always",
        callback: () => {
          setStatus("verified");
          onVerify(true);
        },
        "expired-callback": () => {
          setStatus("ready");
          onVerify(false);
        },
        "error-callback": (errorCode: string) => {
          console.error("Turnstile error:", errorCode);
          setStatus("error");
          onVerify(true);
        },
      });
      setStatus("ready");
    } catch (err) {
      console.error("Turnstile render failed:", err);
      setStatus("error");
      onVerify(true);
    }
  }, [onVerify, removeWidget]);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) {
      setStatus("error");
      onVerify(true);
      return;
    }

    const onLoad = () => renderWidget();

    if (window.turnstile) {
      // Turnstile already loaded, render immediately
      onLoad();
    } else if (!document.querySelector('script[src*="turnstile"]')) {
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad&render=explicit";
      script.async = true;
      window.onTurnstileLoad = onLoad;
      document.head.appendChild(script);
    } else {
      // Script tag exists but turnstile not ready yet
      const prev = window.onTurnstileLoad;
      window.onTurnstileLoad = () => {
        prev?.();
        onLoad();
      };
    }

    return () => removeWidget();
  }, [removeWidget, renderWidget, onVerify]);

  return (
    <div className={className}>
      <div ref={containerRef} style={{ minHeight: 65 }} />
      {status === "loading" && (
        <p className="text-sm text-muted-foreground mt-1">Loading verification...</p>
      )}
      {status === "error" && (
        <p className="text-sm text-muted-foreground mt-1">
          Verification could not load on this device. You can continue.
        </p>
      )}
      {status === "verified" && (
        <p className="text-sm text-green-600 mt-1">✓ Verified</p>
      )}
    </div>
  );
};

export default Captcha;
