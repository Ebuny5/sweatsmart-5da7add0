/**
 * AppUpdateService — tells an installed native build when the store has a newer
 * version. The store (Play/App Store) only updates apps in the background, so the
 * app itself has to surface "update available" while it is open.
 *
 * The manifest is served from the website (not the bundled assets) so a new
 * release can be announced without shipping a new native build.
 */

export const APP_VERSION_MANIFEST_URL = 'https://www.hidroally.space/app-version.json';
export const PLAY_STORE_ID = 'guru.sweatsmart.twa';

export type AppUpdateInfo = {
  currentVersion: string;
  latestVersion: string;
  forceUpdate: boolean;
  notes?: string;
  storeUrl: string;
};

const DISMISS_KEY = 'sweatsmart:app_update_dismissed';

function toParts(version?: string | null): number[] {
  return String(version || '')
    .split(/[.+-]/)
    .map((part) => parseInt(part, 10))
    .map((n) => (Number.isFinite(n) ? n : 0));
}

/** True when `current` is strictly older than `latest`. */
export function isVersionOlder(current?: string | null, latest?: string | null): boolean {
  const a = toParts(current);
  const b = toParts(latest);
  if (!b.length || !b.some((n) => n > 0)) return false;
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i++) {
    const left = a[i] ?? 0;
    const right = b[i] ?? 0;
    if (left === right) continue;
    return left < right;
  }
  return false;
}

function playStoreUrl(): string {
  return `https://play.google.com/store/apps/details?id=${PLAY_STORE_ID}`;
}

export async function checkForAppUpdate(): Promise<AppUpdateInfo | null> {
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform?.()) return null;

    const platform = Capacitor.getPlatform();
    const { App } = await import('@capacitor/app');
    const appInfo = await App.getInfo();
    const currentVersion = appInfo?.version || '0.0.0';

    const response = await fetch(`${APP_VERSION_MANIFEST_URL}?t=${Date.now()}`, {
      cache: 'no-store',
    });
    if (!response.ok) return null;

    const manifest = await response.json();
    const latestVersion = String(manifest?.latestVersion || manifest?.version || '');
    if (!latestVersion || !isVersionOlder(currentVersion, latestVersion)) return null;

    const storeUrl =
      (platform === 'ios' ? manifest?.iosStoreUrl : manifest?.storeUrl) ||
      manifest?.storeUrl ||
      playStoreUrl();

    return {
      currentVersion,
      latestVersion,
      forceUpdate: manifest?.minSupportedVersion
        ? isVersionOlder(currentVersion, String(manifest.minSupportedVersion))
        : false,
      notes: typeof manifest?.notes === 'string' ? manifest.notes : undefined,
      storeUrl,
    };
  } catch {
    // Offline, blocked network, or not a native build — never block the app.
    return null;
  }
}

export function isUpdateDismissed(version?: string): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { version?: string; at?: number };
    if (!parsed?.at) return false;
    const oneDay = 24 * 60 * 60 * 1000;
    if (Date.now() - parsed.at > oneDay) return false;
    return !version || parsed.version === version;
  } catch {
    return false;
  }
}

export function dismissUpdate(version: string): void {
  try {
    localStorage.setItem(DISMISS_KEY, JSON.stringify({ version, at: Date.now() }));
  } catch {
    /* ignore */
  }
}
