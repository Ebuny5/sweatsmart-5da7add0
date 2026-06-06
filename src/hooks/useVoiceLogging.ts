import { useState, useCallback, useRef, useEffect } from "react";
import { BodyArea, Trigger } from "@/types";
import { supabase } from "@/integrations/supabase/client";

/**
 * useVoiceLogging — Professional Audio + AssemblyAI Smart Loop
 *
 * Flow:
 *   1. User taps mic → play "I'm listening" → start recording
 *   2. Silence detected (~3s) → stop recording → play "Got it, anything else?"
 *   3. Listen 4s for yes/no:
 *        "no/wait/more/..."  → play "Go ahead" → resume recording, APPEND
 *        "yes/that's all"    → play "Saving your episode" → transcribe + extract tags
 *   4. Final transcript → AssemblyAI (whole session) → Gemini extract tags →
 *      onAnalysisComplete(bodyAreas, triggers, notes)
 */

export const isVoiceSupported = (): boolean => {
  if (typeof window === 'undefined') return false;
  const hasMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  const hasRecorder = typeof (window as any).MediaRecorder !== 'undefined';
  return hasMedia && hasRecorder;
};

export type VoiceStatus = 'LISTENING' | 'CONFIRMING' | 'REASONING' | 'SAVING' | null;

interface UseVoiceLoggingProps {
  onAnalysisComplete: (bodyAreas: BodyArea[], triggers: Trigger[], notes: string, severity?: number) => void;
}

const SOUND = {
  imListening: '/sounds/voice-im-listening.mp3',
  gotItAnythingElse: '/sounds/voice-got-it-anything-else.mp3',
  goAhead: '/sounds/voice-go-ahead.mp3',
  savingEpisode: '/sounds/voice-saving-episode.mp3',
};

const SILENCE_RMS = 0.02;         // Increased threshold for better detection in noisy spots
const SILENCE_HOLD_MS = 3000;     // hold silence this long to stop
const MIN_SPEECH_MS = 1000;       // slightly shorter min speech
const MAX_SEGMENT_MS = 60000;     // hard cap per segment
const CONFIRM_LISTEN_MS = 5000;   // window to detect yes/no

const CONTINUE_KEYWORDS = [
  'yes', 'yeah', 'yep', 'yup', 'yeb', 'sure', 'ok', 'okay', 'more', 'add',
  'continue', 'actually', 'one more', 'wait', 'hold on', 'one moment',
  'one sec', 'one second', 'hang on', 'not yet', 'not done', 'not finished',
  "didn't finish", "i'm not done", 'im not done', 'not all', "that's not all",
  'thats not all'
];

const FINISH_KEYWORDS = [
  'no', 'nope', 'nah', 'no more', "that's it", "thats it", "that's all",
  "thats all", 'done', 'finish', 'finished', 'save', 'stop', 'all good',
  'nothing else', 'no thanks'
];

function playSound(src: string): Promise<void> {
  return new Promise((resolve) => {
    try {
      const a = new Audio(src);
      a.onended = () => resolve();
      a.onerror = () => resolve();
      a.play().catch(() => resolve());
      // safety timeout
      setTimeout(() => resolve(), 6000);
    } catch {
      resolve();
    }
  });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

// ── Keyword fallback (used if Gemini extract fails) ────────────────────────
function fallbackExtract(text: string): { bodyAreas: BodyArea[]; triggers: string[] } {
  const lower = text.toLowerCase();
  const detectedAreas: BodyArea[] = [];
  if (lower.match(/\b(palm|palms|hand|hands)\b/)) detectedAreas.push('palms');
  if (lower.match(/\b(finger|fingers)\b/)) detectedAreas.push('fingers');
  if (lower.match(/\b(sole|soles)\b/)) detectedAreas.push('soles');
  if (lower.match(/\b(feet|foot)\b/)) detectedAreas.push('feet');
  if (lower.match(/\b(toe|toes)\b/)) detectedAreas.push('toes');
  if (lower.match(/\b(face|forehead|cheek|chin)\b/)) detectedAreas.push('face');
  if (lower.match(/\b(scalp|head)\b/) && !lower.includes('forehead')) detectedAreas.push('scalp');
  if (lower.match(/\b(underarm|armpit|armpits)\b/)) detectedAreas.push('underarms');
  if (lower.match(/\b(chest)\b/)) detectedAreas.push('chest');
  if (lower.match(/\b(back)\b/)) detectedAreas.push('back');
  if (lower.match(/\b(groin)\b/)) detectedAreas.push('groin');
  if (lower.match(/whole body|entire body|everywhere/)) detectedAreas.push('entire_body');

  const triggers: string[] = [];
  if (/\b(hot|heat|warm)\b/.test(lower)) triggers.push('hot_temperature');
  if (/\b(humid|humidity|muggy|sticky)\b/.test(lower)) triggers.push('high_humidity');
  if (/\b(stress|stressed)\b/.test(lower)) triggers.push('stress');
  if (/\b(anxi|anxious|anxiety)\b/.test(lower)) triggers.push('anxiety');
  if (/\b(nervous|nerves)\b/.test(lower)) triggers.push('nervousness');
  if (/\b(spicy|chilli|pepper)\b/.test(lower)) triggers.push('spicy_food');
  if (/\b(coffee|caffeine)\b/.test(lower)) triggers.push('caffeine');
  if (/\b(exercise|gym|workout|running|sport)\b/.test(lower)) triggers.push('physical_exercise');
  if (/\b(public speak|presentation|interview|exam)\b/.test(lower)) triggers.push('public_speaking');
  if (/\b(crowd|crowded)\b/.test(lower)) triggers.push('crowded_spaces');

  return { bodyAreas: Array.from(new Set(detectedAreas)), triggers: Array.from(new Set(triggers)) };
}

const TRIGGER_CATEGORY_BY_VALUE: Record<string, Trigger['type']> = {
  hot_temperature: 'environmental',
  high_humidity: 'environmental',
  crowded_spaces: 'environmental',
  bright_lights: 'environmental',
  loud_noises: 'environmental',
  transitional_temperature: 'environmental',
  synthetic_fabrics: 'environmental',
  outdoor_sun_exposure: 'environmental',
  stress: 'emotional',
  anxiety: 'emotional',
  anticipatory_sweating: 'emotional',
  embarrassment: 'emotional',
  excitement: 'emotional',
  anger: 'emotional',
  nervousness: 'emotional',
  public_speaking: 'situational',
  social_interaction: 'situational',
  work_pressure: 'situational',
  exam_test_situation: 'situational',
  spicy_food: 'dietary',
  caffeine: 'dietary',
  alcohol: 'dietary',
  hot_drinks: 'dietary',
  heavy_meals: 'dietary',
  gustatory_sweating: 'dietary',
  energy_drinks: 'dietary',
  physical_exercise: 'physical',
  night_sweats: 'physical',
  poor_sleep: 'physical',
  hormonal_changes: 'physical',
  illness_fever: 'physical',
  hypoglycemia: 'physical',
  certain_clothing: 'environmental',
  ssris_antidepressants: 'medical',
  opioids_pain_medication: 'medical',
  nsaids: 'medical',
  blood_pressure_medication: 'medical',
  insulin_diabetes_medication: 'medical',
  supplements_herbal: 'medical',
  new_medication: 'medical',
};

function valuesToTriggers(values: string[]): Trigger[] {
  return values.map((t) => ({
    id: `${Date.now()}-${t}`,
    name: t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    label: t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    value: t,
    type: TRIGGER_CATEGORY_BY_VALUE[t] || 'environmental',
    category: TRIGGER_CATEGORY_BY_VALUE[t] || 'environmental',
    icon: 'zap',
  }));
}

// ── Web Speech API helpers ─────────────────────────────────────────────────
const getSpeechRecognitionCtor = (): any => {
  if (typeof window === 'undefined') return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
};
const hasWebSpeech = (): boolean => !!getSpeechRecognitionCtor();

export const useVoiceLogging = ({ onAnalysisComplete }: UseVoiceLoggingProps) => {
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>(null);
  const [voiceNotSupported, setVoiceNotSupported] = useState(!isVoiceSupported());
  const [transcript, setTranscript] = useState('');
  const [volume, setVolume] = useState(0);

  // refs
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const fullTranscriptRef = useRef<string>('');
  const segmentChunksRef = useRef<Blob[]>([]);   // current segment
  const allChunksRef = useRef<Blob[]>([]);       // every chunk across the whole session (fallback)
  const silenceStartRef = useRef<number | null>(null);
  const segmentStartRef = useRef<number>(0);
  const rafRef = useRef<number | any>(null);
  const cancelledRef = useRef(false);
  const finishedRef = useRef(false);
  const transcriptRef = useRef('');
  const mimeTypeRef = useRef<string>('audio/webm');

  // Web Speech API refs (live transcription, runs alongside MediaRecorder)
  const recognitionRef = useRef<any>(null);
  const liveSegmentTextRef = useRef<string>('');



  // ── Web Speech API segment helpers ────────────────────────────────────────
  const stopRecognition = () => {
    const rec = recognitionRef.current;
    if (!rec) return;
    try { rec.onresult = null; rec.onerror = null; rec.onend = null; } catch {}
    try { rec.stop(); } catch {}
    try { rec.abort(); } catch {}
    recognitionRef.current = null;
  };

  const startRecognitionForSegment = () => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;
    stopRecognition();
    liveSegmentTextRef.current = '';
    try {
      const rec = new Ctor();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';
      rec.onresult = (event: any) => {
        let finalText = '';
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const r = event.results[i];
          if (r.isFinal) finalText += r[0].transcript + ' ';
          else interim += r[0].transcript + ' ';
        }
        if (finalText) {
          liveSegmentTextRef.current = (liveSegmentTextRef.current + ' ' + finalText).trim();
        }
        // Surface live preview (final + interim) for the UI
        const preview = (fullTranscriptRef.current + ' ' + liveSegmentTextRef.current + ' ' + interim).trim();
        setTranscript(preview);
      };
      rec.onerror = (e: any) => console.warn('[voice] SR error', e?.error || e);
      rec.onend = () => { /* segment loop will restart if needed */ };
      rec.start();
      recognitionRef.current = rec;
    } catch (e) {
      console.warn('[voice] SR start failed', e);
    }
  };

  const cleanupAudio = () => {
    stopRecognition();
    if (rafRef.current) {
      if (typeof rafRef.current === 'number') {
        cancelAnimationFrame(rafRef.current);
      } else {
        clearTimeout(rafRef.current);
      }
    }
    rafRef.current = null;
    setVolume(0);
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try { recorderRef.current.stop(); } catch {}
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      try { audioCtxRef.current.close(); } catch {}
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
  };

  const fullStop = useCallback(() => {
    cancelledRef.current = true;
    cleanupAudio();
    setVoiceStatus(null);
    fullTranscriptRef.current = '';
    segmentChunksRef.current = [];
    transcriptRef.current = '';
    setTranscript('');
    setVolume(0);
  }, []);


  const finishSession = useCallback(() => {
    finishedRef.current = true;
    // This will break the loop in runFlow
  }, []);

  // ── Open mic + recorder + analyser ────────────────────────────────────────
  const openMic = async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;

      // Pick a supported mime type
      const candidates = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
      ];
      const mimeType = candidates.find((m) => (window as any).MediaRecorder?.isTypeSupported?.(m)) || '';
      mimeTypeRef.current = mimeType || 'audio/webm';

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          segmentChunksRef.current.push(e.data);
          allChunksRef.current.push(e.data);
        }
      };


      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
      const ctx: AudioContext = new Ctx();

      // Critical: Ensure context is resumed after user interaction (fixes iOS/Android audio blockage)
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      audioCtxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      src.connect(analyser);
      analyserRef.current = analyser;

      return true;
    } catch (e) {
      console.error('Mic open failed', e);
      setVoiceNotSupported(true);
      return false;
    }
  };

  // ── Record one segment until silence (or max) ─────────────────────────────
  const recordSegmentUntilSilence = (): Promise<void> =>
    new Promise((resolve) => {
      const recorder = recorderRef.current;
      const analyser = analyserRef.current;
      if (!recorder || !analyser) return resolve();

      segmentChunksRef.current = [];
      silenceStartRef.current = null;
      segmentStartRef.current = Date.now();

      const buf = new Float32Array(analyser.fftSize);

      const stopAndResolve = () => {
        stopRecognition();
        if (recorder.state !== 'inactive') {
          recorder.onstop = () => resolve();
          try { recorder.stop(); } catch { resolve(); }
        } else {
          resolve();
        }
        if (rafRef.current) {
          if (typeof rafRef.current === 'number') {
            cancelAnimationFrame(rafRef.current);
          } else {
            clearTimeout(rafRef.current);
          }
        }
        rafRef.current = null;
      };


      const tick = () => {
        if (cancelledRef.current || finishedRef.current) {
          return stopAndResolve();
        }

        analyser.getFloatTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
        const rms = Math.sqrt(sum / buf.length);
        setVolume(rms); // For visualizer

        const elapsed = Date.now() - segmentStartRef.current;

        if (rms < SILENCE_RMS) {
          if (silenceStartRef.current === null) silenceStartRef.current = Date.now();
          const silentFor = Date.now() - silenceStartRef.current;
          if (silentFor >= SILENCE_HOLD_MS && elapsed >= MIN_SPEECH_MS) {
            return stopAndResolve();
          }
        } else {
          silenceStartRef.current = null;
        }

        if (elapsed >= MAX_SEGMENT_MS) return stopAndResolve();
        // Use setTimeout instead of RAF for better background/mobile performance
        rafRef.current = setTimeout(tick, 100);
      };

      try {
        recorder.start(250); // 250ms chunks
        // Start Web Speech recognition AFTER prompt audio has finished,
        // so the MP3 playback isn't picked up as user speech.
        startRecognitionForSegment();
      } catch (e) {
        console.warn('recorder.start failed', e);
        return resolve();
      }
      rafRef.current = setTimeout(tick, 100);
    });


  // ── Transcribe a blob via edge function ───────────────────────────────────
  const transcribeBlob = async (blob: Blob): Promise<string> => {
    if (!blob || blob.size < 1000) return '';
    const dataUrl = await blobToBase64(blob);
    const base64 = dataUrl.split(',')[1] || '';
    const { data, error } = await supabase.functions.invoke('voice-transcribe', {
      body: { audio_base64: base64, mode: 'transcribe' },
    });
    if (error) {
      console.error('transcribe error', error);
      return '';
    }
    return (data?.transcript || '').trim();
  };

  // ── Main flow ─────────────────────────────────────────────────────────────
  const runFlow = useCallback(async () => {
    cancelledRef.current = false;
    finishedRef.current = false;
    fullTranscriptRef.current = '';
    transcriptRef.current = '';
    allChunksRef.current = [];
    setTranscript('');

    const ok = await openMic();
    if (!ok) {
      setVoiceStatus(null);
      return;
    }


    // Step A: announce "I'm listening"
    setVoiceStatus('LISTENING');
    await playSound(SOUND.imListening);
    if (cancelledRef.current) return cleanupAudio();

    // Loop: record → transcribe → confirm → maybe go again
    while (!cancelledRef.current && !finishedRef.current) {
      setVoiceStatus('LISTENING');
      await recordSegmentUntilSilence();
      if (cancelledRef.current || finishedRef.current) break;

      // PRIMARY: AssemblyAI on the recorded segment blob.
      // Web Speech is only used as last-resort fallback if AAI returned nothing.
      const segmentBlob = new Blob(segmentChunksRef.current, { type: mimeTypeRef.current });
      console.log('[voice] transcribing segment via AssemblyAI, size:', segmentBlob.size);
      let segmentText = await transcribeBlob(segmentBlob);
      if (segmentText) {
        console.log('[voice] segment transcript (AssemblyAI):', segmentText);
      } else if (liveSegmentTextRef.current.trim()) {
        segmentText = liveSegmentTextRef.current.trim();
        console.log('[voice] AAI empty — fallback to Web Speech:', segmentText);
      }
      if (segmentText) {
        fullTranscriptRef.current = (fullTranscriptRef.current + ' ' + segmentText).trim();
        setTranscript(fullTranscriptRef.current);
      }


      // Ask "Got it, anything else?"
      setVoiceStatus('CONFIRMING');
      await playSound(SOUND.gotItAnythingElse);
      if (cancelledRef.current || finishedRef.current) break;

      // Record short confirmation segment (yes/no)
      const confirmRecorder = recorderRef.current;
      if (!confirmRecorder) break;
      const confirmChunks: Blob[] = [];
      const origHandler = confirmRecorder.ondataavailable;
      confirmRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) confirmChunks.push(e.data);
      };
      try { confirmRecorder.start(250); } catch {}
      // Start Web Speech for confirm window too — instant yes/no detection
      startRecognitionForSegment();

      // Wait for confirm or manual stop
      const waitStart = Date.now();
      while (Date.now() - waitStart < CONFIRM_LISTEN_MS && !finishedRef.current && !cancelledRef.current) {
        await new Promise(r => setTimeout(r, 200));
      }

      stopRecognition();
      await new Promise<void>((r) => {
        if (confirmRecorder.state === 'inactive') return r();
        confirmRecorder.onstop = () => r();
        try { confirmRecorder.stop(); } catch { r(); }
      });
      // restore handler for any next segment
      confirmRecorder.ondataavailable = origHandler as any;

      if (cancelledRef.current) break;
      if (finishedRef.current) break;

      // PRIMARY: AssemblyAI on the confirm blob; Web Speech only as fallback.
      const confirmBlob = new Blob(confirmChunks, { type: mimeTypeRef.current });
      let confirmText = await transcribeBlob(confirmBlob);
      if (!confirmText && liveSegmentTextRef.current.trim()) {
        confirmText = liveSegmentTextRef.current.trim();
      }
      const lower = (confirmText || '').toLowerCase().trim();
      console.log('[voice] confirm transcript:', lower);

      const isContinue = CONTINUE_KEYWORDS.some((k) => lower.includes(k));
      const isFinish = FINISH_KEYWORDS.some((k) => lower.includes(k));

      // User wants more (explicit YES or not a FINISH keyword)
      if (isContinue || (lower.length > 0 && !isFinish)) {
        console.log('[voice] continuing based on:', lower);

        await playSound(SOUND.goAhead);
        if (cancelledRef.current) return cleanupAudio();
        continue; // loop → record another segment
      }

      // Default to finish if they said "no" or nothing
      console.log('[voice] finishing based on:', lower || 'timeout/silence');
      break;
    }

    if (cancelledRef.current) return cleanupAudio();

    // Step D: saving
    setVoiceStatus('SAVING');
    await playSound(SOUND.savingEpisode);

    // Stop mic before final processing
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    setVoiceStatus('REASONING');

    let fullText = fullTranscriptRef.current.trim();
    console.log('[voice] final full text (from segments):', fullText);

    // Fallback: if per-segment transcription returned nothing, transcribe the
    // entire session as one blob so we never lose the user's speech.
    if (!fullText && allChunksRef.current.length > 0) {
      try {
        const fullBlob = new Blob(allChunksRef.current, { type: mimeTypeRef.current });
        console.log('[voice] segment transcripts empty — falling back to full-session transcribe, size:', fullBlob.size);
        fullText = (await transcribeBlob(fullBlob)).trim();
        console.log('[voice] full-session transcript:', fullText);
      } catch (e) {
        console.error('[voice] full-session fallback transcribe failed', e);
      }
    }

    if (!fullText) {
      console.warn('[voice] No transcript captured for this session.');
      cleanupAudio();
      setVoiceStatus(null);
      return;
    }


    // LLM extract tags (with keyword fallback)
    let bodyAreas: BodyArea[] = [];
    let triggerValues: string[] = [];
    let extractedSeverity: number | undefined = undefined;

    try {
      const { data } = await supabase.functions.invoke('voice-transcribe', {
        body: { mode: 'extract', text: fullText },
      });
      const tags = data?.tags;
      console.log('[voice] Gemini tags:', tags);

      if (tags?.body_areas?.length) bodyAreas = tags.body_areas as BodyArea[];
      if (tags?.triggers?.length) triggerValues = tags.triggers;
      if (tags?.severity) extractedSeverity = tags.severity;
    } catch (e) {
      console.warn('extract failed, falling back', e);
    }

    // Always check for fallback if Gemini didn't return complete data
    if (bodyAreas.length === 0 || triggerValues.length === 0) {
      const fb = fallbackExtract(fullText);
      if (bodyAreas.length === 0) {
        console.log('[voice] Body areas empty, using fallback:', fb.bodyAreas);
        bodyAreas = fb.bodyAreas;
      }
      if (triggerValues.length === 0) {
        console.log('[voice] Triggers empty, using fallback:', fb.triggers);
        triggerValues = fb.triggers;
      }
    }

    cleanupAudio();
    setVoiceStatus(null);
    onAnalysisComplete(
      Array.from(new Set(bodyAreas)),
      valuesToTriggers(triggerValues),
      fullText,
      extractedSeverity
    );
  }, [onAnalysisComplete]);

  const startListening = useCallback(() => {
    if (voiceNotSupported) {
      console.warn('Voice not supported on this device');
      return;
    }
    if (voiceStatus !== null) return;
    runFlow();
  }, [runFlow, voiceNotSupported, voiceStatus]);

  const stopListening = useCallback(() => {
    if (voiceStatus === 'LISTENING' || voiceStatus === 'CONFIRMING') {
      finishSession();
    } else {
      fullStop();
    }
  }, [voiceStatus, finishSession, fullStop]);

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      cleanupAudio();
    };
  }, []);

  return {
    voiceStatus,
    startListening,
    stopListening,
    transcript,
    volume,
    isListening: voiceStatus !== null,
    voiceNotSupported,
  };
};
