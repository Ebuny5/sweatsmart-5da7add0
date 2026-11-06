import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * HidroAlly-only text-to-speech (Deepgram Aura 2 via the `hidroally-speak`
 * edge function). Deliberately isolated from the global read-aloud helpers
 * (`useReadAloud`, `soundManager`, `audioAlertPlayer`) — nothing outside the
 * HidroAlly chat should import this hook.
 */
export function useHidroAllySpeech() {
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const [loadingIndex, setLoadingIndex] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const cacheRef = useRef<Map<string, string>>(new Map());

  const stop = useCallback(() => {
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      } catch {
        /* ignore */
      }
      audioRef.current = null;
    }
    urlRef.current = null;
    setSpeakingIndex(null);
    setLoadingIndex(null);
  }, []);

  useEffect(() => () => stop(), [stop]);

  const speak = useCallback(
    async (text: string, index: number) => {
      const clean = (text || '').replace(/\s+/g, ' ').trim();
      if (!clean) return;

      // Tapping the same bubble again toggles playback off.
      if (speakingIndex === index || loadingIndex === index) {
        stop();
        return;
      }

      stop();
      setLoadingIndex(index);

      const play = (uri: string) =>
        new Promise<void>((resolve, reject) => {
          const audio = new Audio(uri);
          audioRef.current = audio;
          urlRef.current = uri;
          audio.onended = () => {
            if (audioRef.current === audio) {
              audioRef.current = null;
              setSpeakingIndex(null);
            }
            resolve();
          };
          audio.onerror = () => reject(new Error('audio playback failed'));
          audio
            .play()
            .then(() => {
              setLoadingIndex(null);
              setSpeakingIndex(index);
            })
            .catch(reject);
        });

      try {
        const cached = cacheRef.current.get(clean);
        if (cached) {
          await play(cached);
          return;
        }

        const { data, error } = await supabase.functions.invoke('hidroally-speak', {
          body: { text: clean.slice(0, 1900) },
        });
        if (error || !data?.audio_base64) throw error ?? new Error('no audio returned');

        const uri = `data:${data.mime || 'audio/mpeg'};base64,${data.audio_base64}`;
        cacheRef.current.set(clean, uri);
        await play(uri);
      } catch (err) {
        console.error('[HidroAlly] Deepgram speech failed', err);
        stop();
        throw err;
      }
    },
    [speakingIndex, loadingIndex, stop],
  );

  return { speak, stop, speakingIndex, loadingIndex };
}
