/**
 * AudioAlertPlayer
 *
 * Replaces the previous browser TTS pipeline (`speechSynthesis`) with the
 * project's own pre-recorded MP3 voice files.
 *
 * Sequence for every alert:
 *   1. Short "water sound" cue
 *   2. Voice clip matching the alert kind (climate severity OR reminder/checkin)
 *
 * Voice gender is selected from `localStorage.sweatsmart_voice_gender`
 * ('female' default). Male voices are wired up for what we have today;
 * missing male variants gracefully fall back to female so users always
 * hear an alert.
 *
 * To replace any audio file, just drop a new MP3 at the matching path
 * under /public/sounds/ — no code changes required.
 */

export type ClimateAlertKind = 'low' | 'moderate' | 'high' | 'extreme';
export type ReminderKind = 'reminder' | 'checkin';
export type AlertKind = ClimateAlertKind | ReminderKind;
export type VoiceGender = 'female' | 'male';

const WATER_SOUND_PATH = '/sounds/water-sound.mp3';

const FEMALE_VOICES: Record<AlertKind, string> = {
  low: '/sounds/voice-female-low.mp3',
  moderate: '/sounds/voice-female-moderate.mp3',
  high: '/sounds/voice-female-high.mp3',
  extreme: '/sounds/voice-female-extreme.mp3',
  reminder: '/sounds/6-hour-reminder.mp3',
  checkin: '/sounds/6-hour-reminder.mp3',
};

// Male voices — we only have low/reminder/checkin uploaded today.
// Missing entries fall back to the female file of the same kind.
const MALE_VOICES: Partial<Record<AlertKind, string>> = {
  low: '/sounds/voice-male-low.mp3',
  reminder: '/sounds/6-hour-reminder.mp3',
  checkin: '/sounds/6-hour-reminder.mp3',
};

const GENDER_STORAGE_KEY = 'sweatsmart_voice_gender';
const SOUND_ENABLED_KEY = 'sweatsmart_sound_enabled';

function getGender(): VoiceGender {
  try {
    const v = localStorage.getItem(GENDER_STORAGE_KEY);
    return v === 'male' ? 'male' : 'female';
  } catch {
    return 'female';
  }
}

function isSoundEnabled(): boolean {
  try {
    const raw = localStorage.getItem(SOUND_ENABLED_KEY);
    if (raw === null) return true;
    return JSON.parse(raw) !== false;
  } catch {
    return true;
  }
}

function resolveVoicePath(kind: AlertKind, gender: VoiceGender): string {
  if (gender === 'male') {
    return MALE_VOICES[kind] ?? FEMALE_VOICES[kind];
  }
  return FEMALE_VOICES[kind];
}

function vibrateForKind(kind: AlertKind) {
  // For foreground, we only keep it for extreme/high climate alerts.
  if (!('vibrate' in navigator)) return;

  if (kind !== 'extreme' && kind !== 'high') return;

  const pattern: number[] =
    kind === 'extreme'
      ? [800, 200, 800, 200, 800]
      : [600, 150, 600];
  try {
    navigator.vibrate(pattern);
  } catch {
    /* ignore */
  }
}

class AudioAlertPlayer {
  private static instance: AudioAlertPlayer;
  private current: HTMLAudioElement | null = null;

  static getInstance(): AudioAlertPlayer {
    if (!AudioAlertPlayer.instance) {
      AudioAlertPlayer.instance = new AudioAlertPlayer();
    }
    return AudioAlertPlayer.instance;
  }

  setGender(gender: VoiceGender): void {
    try {
      localStorage.setItem(GENDER_STORAGE_KEY, gender);
    } catch {
      /* ignore */
    }
  }

  getGender(): VoiceGender {
    return getGender();
  }

  setSoundEnabled(enabled: boolean): void {
    try {
      localStorage.setItem(SOUND_ENABLED_KEY, JSON.stringify(enabled));
    } catch {
      /* ignore */
    }
    if (!enabled) this.stop();
  }

  isSoundEnabled(): boolean {
    return isSoundEnabled();
  }

  stop(): void {
    if (this.current) {
      try {
        this.current.pause();
        this.current.src = '';
      } catch {
        /* ignore */
      }
      this.current = null;
    }
  }

  /**
   * Play a single audio file and resolve when it ends (or on error).
   * Capped to ~6s so the water cue stays short.
   */
  private playClip(src: string, maxMs = 8000): Promise<void> {
    return new Promise((resolve) => {
      try {
        const audio = new Audio(src);
        audio.preload = 'auto';
        audio.volume = 1;
        this.current = audio;

        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          if (this.current === audio) this.current = null;
          resolve();
        };

        audio.addEventListener('ended', finish, { once: true });
        audio.addEventListener('error', finish, { once: true });
        // Hard timeout in case the file stalls
        const timer = window.setTimeout(finish, maxMs);
        audio.addEventListener('ended', () => window.clearTimeout(timer), { once: true });
        audio.addEventListener('error', () => window.clearTimeout(timer), { once: true });

        audio.play().catch((err) => {
          console.warn('🔊 audio play blocked/failed for', src, err);
          finish();
        });
      } catch (err) {
        console.warn('🔊 audio init failed for', src, err);
        resolve();
      }
    });
  }

  /**
   * Play the full alert sequence: water sound → voice clip.
   * Fire-and-forget safe — never throws.
   */
  async playAlert(kind: AlertKind): Promise<void> {
    this.stop();

    if (!isSoundEnabled()) {
      console.log('🔊 Audio suppressed: sound is disabled in settings');
      return;
    }

    console.log(`🔊 Playing alert sequence for kind: ${kind}`);
    vibrateForKind(kind);

    // 1. Short water cue (hard-capped to ~0.5s so it stays "in a jiffy")
    console.log(`🔊 Playing water sound: ${WATER_SOUND_PATH}`);
    await this.playClip(WATER_SOUND_PATH, 550);

    // Tiny gap for clarity between cue and voice
    await new Promise((r) => setTimeout(r, 80));

    // 2. Voice clip matching the alert kind
    const voicePath = resolveVoicePath(kind, getGender());
    console.log(`🔊 Playing voice clip: ${voicePath} (Gender: ${getGender()})`);
    await this.playClip(voicePath, 12000);
  }
}

export const audioAlertPlayer = AudioAlertPlayer.getInstance();
