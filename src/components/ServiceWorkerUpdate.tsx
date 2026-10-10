import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

const SW_UPDATE_KEY = 'sweatsmart-sw-updated';
const SW_UPDATE_COOLDOWN = 30000; // 30 seconds cooldown after update

const ServiceWorkerUpdate = () => {
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const hasReloaded = useRef(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // Check if we just updated (prevent immediate re-prompt)
    const lastUpdate = localStorage.getItem(SW_UPDATE_KEY);
    const justUpdated = lastUpdate && (Date.now() - parseInt(lastUpdate, 10)) < SW_UPDATE_COOLDOWN;
    
    if (justUpdated) {
      console.log('SW: Recently updated, skipping update check');
      return;
    }

    const checkForUpdates = async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (!reg) return;
        
        setRegistration(reg);
        
        // Only show prompt if there's a waiting worker AND we haven't just updated
        if (reg.waiting && !justUpdated) {
          setShowUpdatePrompt(true);
        }

        // Listen for new service worker installing
        const handleUpdateFound = () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setShowUpdatePrompt(true);
            }
          });
        };
        
        reg.addEventListener('updatefound', handleUpdateFound);

        // Listen for controller change - but only reload ONCE
        const handleControllerChange = () => {
          if (hasReloaded.current) return;
          hasReloaded.current = true;
          
          // Mark that we just updated
          localStorage.setItem(SW_UPDATE_KEY, Date.now().toString());
          console.log('SW: New service worker activated, reloading...');
          window.location.reload();
        };
        
        navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
        
        return () => {
          reg.removeEventListener('updatefound', handleUpdateFound);
          navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
        };
      } catch (error) {
        console.error('Error checking for SW updates:', error);
      }
    };

    checkForUpdates();

    // Check for updates less frequently (every 15 minutes instead of 5)
    const interval = setInterval(() => {
      navigator.serviceWorker.getRegistration().then(reg => {
        if (reg) reg.update();
      });
    }, 15 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const handleUpdate = () => {
    if (registration?.waiting) {
      // Mark update time before triggering
      localStorage.setItem(SW_UPDATE_KEY, Date.now().toString());
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    setShowUpdatePrompt(false);
  };

  const handleDismiss = () => {
    // Allow dismissing - will show again on next page load if still pending
    setShowUpdatePrompt(false);
  };

  if (!showUpdatePrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-in slide-in-from-bottom-4">
      <div className="bg-primary text-primary-foreground p-4 rounded-lg shadow-lg">
        <div className="flex items-center gap-3">
          <RefreshCw className="h-5 w-5" />
          <div className="flex-1">
            <p className="font-medium">Update Available</p>
            <p className="text-sm opacity-90">A new version of HidroAlly is ready.</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleDismiss}
              className="text-primary-foreground hover:bg-primary-foreground/20"
            >
              Later
            </Button>
            <Button 
              variant="secondary" 
              size="sm"
              onClick={handleUpdate}
            >
              Update
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceWorkerUpdate;
