import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * HidroAlly-only dictation. Records self-contained MediaRecorder segments and
 * transcribes each one with AssemblyAI (via the `voice-transcribe` edge
 * function), streaming partial transcripts into the HidroAlly chat input.
 *
 * Scoped strictly to the HidroAlly feature — episode voice logging keeps using
 * `useVoiceLogging`.
 */

const SEGMENT_MS = 4000; // transcribe every ~4s so text appears while speaking

interface Options {
  onPartial: (text: string) => void;
  onError?: (message: string) => void;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function useHidroAllyDictation({ onPartial, onError }: Options) {
  const [isListening, setIsListening] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transcriptRef = useRef('');
  const activeRef = useRef(false);
  const mimeRef = useRef('audio/webm');
  const onPartialRef = useRef(onPartial);
  const onErrorRef = useRef(onError);

  onPartialRef.current = onPartial;
  onErrorRef.current = onError;

  const transcribe = useCallback(async (blob: Blob) => {
    if (!blob || blob.size < 1200) return;
    try {
      const audio_base64 = await blobToBase64(blob);
      const { data, error } = await supabase.functions.invoke('voice-transcribe', {
        body: { audio_base64, mode: 'transcribe' },
      });
      if (error) throw error;
      const text = (data?.transcript || '').trim();
      if (!text) return;
      transcriptRef.current = `${transcriptRef.current} ${text}`.trim();
      onPartialRef.current(transcriptRef.current);
    } catch (err) {
      console.warn('[HidroAlly] transcription segment failed', err);
    }
  }, []);

  const cleanup = useCallback(() => {
    activeRef.current = false;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    const rec = recorderRef.current;
    recorderRef.current = null;
    if (rec && rec.state !== 'inactive') {
      try { rec.stop(); } catch { /* ignore */ }
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setIsListening(false);
  }, []);

  const startSegment = useCallback(() => {
    const stream = streamRef.current;
    if (!stream || !activeRef.current) return;

    chunksRef.current = [];
    const recorder = new MediaRecorder(
      stream,
      mimeRef.current ? { mimeType: mimeRef.current } : undefined,
    );
    recorderRef.current = recorder;
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeRef.current });
      chunksRef.current = [];
      void transcribe(blob);
    };
    try {
      recorder.start();
    } catch (err) {
      console.warn('[HidroAlly] recorder start failed', err);
    }
  }, [transcribe]);

  const stopListening = useCallback(() => {
    if (!activeRef.current) return;
    activeRef.current = false;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    const rec = recorderRef.current;
    recorderRef.current = null;
    if (rec && rec.state !== 'inactive') {
      try { rec.stop(); } catch { /* ignore */ }
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setIsListening(false);
  }, []);

  const startListening = useCallback(async () => {
    if (activeRef.current) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      onErrorRef.current?.('Voice input is not supported on this device');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;

      const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
      mimeRef.current =
        candidates.find((m) => MediaRecorder.isTypeSupported?.(m)) || '';

      transcriptRef.current = '';
      activeRef.current = true;
      setIsListening(true);
      startSegment();

      // Roll the recorder so every uploaded chunk is a complete, decodable file.
      timerRef.current = setInterval(() => {
        if (!activeRef.current) return;
        const rec = recorderRef.current;
        if (rec && rec.state !== 'inactive') {
          try { rec.stop(); } catch { /* ignore */ }
        }
        startSegment();
      }, SEGMENT_MS);
    } catch (err) {
      cleanup();
      const denied = err instanceof Error && err.name === 'NotAllowedError';
      onErrorRef.current?.(
        denied
          ? 'Microphone access denied — allow microphone in your settings'
          : 'Could not start voice input — please try again',
      );
    }
  }, [cleanup, startSegment]);

  const toggleListening = useCallback(() => {
    if (activeRef.current) stopListening();
    else void startListening();
  }, [startListening, stopListening]);

  useEffect(() => () => cleanup(), [cleanup]);

  return { isListening, startListening, stopListening, toggleListening };
}
