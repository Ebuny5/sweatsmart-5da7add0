declare global {

  interface SpeechRecognition extends EventTarget {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    maxAlternatives: number;
    start(): void;
    stop(): void;
    abort(): void;
    onresult: ((event: any) => void) | null;
    onerror: ((event: any) => void) | null;
    onend: ((event: any) => void) | null;
    onstart: ((event: any) => void) | null;
  }

  var SpeechRecognition: { prototype: SpeechRecognition; new (): SpeechRecognition };

  interface PushManager {
    getSubscription(): Promise<PushSubscription | null>;
    subscribe(options?: PushSubscriptionOptionsInit): Promise<PushSubscription>;
    permissionState(options?: PushSubscriptionOptionsInit): Promise<PermissionState>;
  }

  interface ServiceWorkerRegistration {
    readonly pushManager: PushManager;
  }

  interface Window {
    notificationTimeout?: NodeJS.Timeout;
    notificationInterval?: NodeJS.Timeout;
    median?: {
      notification?: {
        show: (options: { title: string; body: string; badge?: string }) => void;
      };
    };
    Capacitor?: {
      Plugins?: {
        LocalNotifications?: {
          schedule: (options: { notifications: Array<{ title: string; body: string; id: number; schedule: { at: Date } }> }) => void;
        };
      };
    };
  }
}

export {};
