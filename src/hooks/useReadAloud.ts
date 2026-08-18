import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { speakProfessionally, stopProfessionalSpeech } from '@/utils/webSpeechVoice';

/**
 * useReadAloud — reliable "read aloud" for AI clinical text.
 *
 * Primary path: Lovable AI Gateway TTS via the `text-to-speech` edge function
 * (natural clinical voice, works on Android/iOS webviews).
 * Fallback: browser speechSynthesis, so the user always hears something.
 */
export function useReadAloud() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
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
    stopProfessionalSpeech();
    setIsSpeaking(false);
    setIsLoading(false);
  }, []);

  useEffect(() => () => stop(), [stop]);

  const speak = useCallback(
    async (text: string) => {
      const clean = (text || '').replace(/\s+/g, ' ').trim();
      if (!clean) return;

      stop();
      setIsLoading(true);

      const playDataUri = (uri: string) =>
        new Promise<void>((resolve, reject) => {
          const audio = new Audio(uri);
          audioRef.current = audio;
          audio.onended = () => {
            setIsSpeaking(false);
            audioRef.current = null;
            resolve();
          };
          audio.onerror = () => reject(new Error('audio playback failed'));
          audio
            .play()
            .then(() => {
              setIsLoading(false);
              setIsSpeaking(true);
            })
            .catch(reject);
        });

      try {
        const cached = cacheRef.current.get(clean);
        if (cached) {
          await playDataUri(cached);
          return;
        }

        const { data, error } = await supabase.functions.invoke('text-to-speech', {
          body: { text: clean.slice(0, 3500), voice: 'alloy' },
        });
        if (error || !data?.audio_base64) throw error ?? new Error('no audio returned');

        const uri = `data:${data.mime || 'audio/mpeg'};base64,${data.audio_base64}`;
        cacheRef.current.set(clean, uri);
        await playDataUri(uri);
      } catch (err) {
        console.warn('Read aloud: falling back to browser speech.', err);
        setIsLoading(false);
        setIsSpeaking(true);
        await speakProfessionally(clean);
        setIsSpeaking(false);
      }
    },
    [stop],
  );

  const toggle = useCallback(
    (text: string) => {
      if (isSpeaking || isLoading) {
        stop();
        return;
      }
      void speak(text);
    },
    [isSpeaking, isLoading, speak, stop],
  );

  return { speak, stop, toggle, isSpeaking, isLoading };
}
