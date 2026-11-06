import { useCallback, useEffect, useState } from 'react';
import { ArrowUpCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  checkForAppUpdate,
  dismissUpdate,
  isUpdateDismissed,
  type AppUpdateInfo,
} from '@/services/AppUpdateService';

/**
 * Shows "update available" inside the installed Android/iOS build.
 * Renders nothing on the web build or when the store version matches.
 */
const AppUpdatePrompt = () => {
  const [update, setUpdate] = useState<AppUpdateInfo | null>(null);
  const [hidden, setHidden] = useState(false);

  const runCheck = useCallback(async () => {
    const info = await checkForAppUpdate();
    if (!info) {
      setUpdate(null);
      return;
    }
    if (!info.forceUpdate && isUpdateDismissed(info.latestVersion)) {
      setUpdate(info);
      setHidden(true);
      return;
    }
    setUpdate(info);
    setHidden(false);
  }, []);

  useEffect(() => {
    void runCheck();

    let removeListener: (() => void) | undefined;
    let cancelled = false;

    void (async () => {
      try {
        const { App } = await import('@capacitor/app');
        const handle = await App.addListener('appStateChange', ({ isActive }) => {
          if (isActive) void runCheck();
        });
        if (cancelled) void handle.remove();
        else removeListener = () => void handle.remove();
      } catch {
        /* web build or plugin unavailable */
      }
    })();

    return () => {
      cancelled = true;
      removeListener?.();
    };
  }, [runCheck]);

  if (!update || hidden) return null;

  const canDismiss = !update.forceUpdate;

  return (
    <div className="fixed inset-x-3 bottom-24 z-[70] mx-auto max-w-md rounded-2xl border border-purple-200 bg-white/98 p-4 shadow-2xl backdrop-blur supports-[backdrop-filter]:bg-white/90">
      <div className="flex items-start gap-3">
        <ArrowUpCircle className="mt-0.5 h-5 w-5 shrink-0 text-purple-600" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">
            {update.forceUpdate ? 'Update required' : 'Update available'}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            {update.forceUpdate
              ? `Version ${update.latestVersion} is required to keep reminders and alerts working. You are on ${update.currentVersion}.`
              : `HidroAlly ${update.latestVersion} is available in the store. You are on ${update.currentVersion}.`}
          </p>
          {update.notes ? (
            <p className="mt-1 text-xs leading-relaxed text-slate-500">{update.notes}</p>
          ) : null}
          <div className="mt-3 flex items-center gap-2">
            <a
              href={update.storeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center justify-center rounded-md bg-purple-600 px-4 text-sm font-medium text-white transition-colors hover:bg-purple-700"
            >
              Update now
            </a>
            {canDismiss ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 text-slate-600"
                onClick={() => {
                  dismissUpdate(update.latestVersion);
                  setHidden(true);
                }}
              >
                Later
              </Button>
            ) : null}
          </div>
        </div>
        {canDismiss ? (
          <button
            type="button"
            aria-label="Dismiss update notice"
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            onClick={() => {
              dismissUpdate(update.latestVersion);
              setHidden(true);
            }}
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
};

export default AppUpdatePrompt;
