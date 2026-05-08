import { useState, useCallback, useRef, useEffect } from "react";
import { BodyArea, Trigger } from "@/types";

/**
 * useVoiceLogging — voice episode logging hook
 *
 * BROWSER SUPPORT:
 * - Chrome (Android + Desktop): ✅ Full support
 * - Safari (iOS + Mac):         ✅ Full support
 * - Samsung Internet:           ✅ Full support
 * - Firefox:                    ❌ Not supported
 * - Brave:                      ⚠️  Sometimes blocked
 *
 * HOW TO USE voiceNotSupported in your component:
 *
 *   const { startListening, voiceNotSupported } = useVoiceLogging({ onAnalysisComplete });
 *
 *   // Hide mic button on unsupported browsers:
 *   {!voiceNotSupported && (
 *     <button onClick={startListening}>🎤 Voice Log</button>
 *   )}
 *
 *   // Show a friendly message instead:
 *   {voiceNotSupported && (
 *     <p>Voice logging requires Chrome or Safari.
 *        Please fill in the form manually.</p>
 *   )}
 */

// ── Browser support check ──────────────────────────────────────────────────
// Exported so any component can show/hide the mic button accordingly
export const isVoiceSupported = (): boolean => {
  return typeof window !== 'undefined' &&
    !!(
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition
    );
};

export type VoiceStatus = 'LISTENING' | 'CONFIRMING' | 'REASONING' | 'SAVING' | null;

interface UseVoiceLoggingProps {
  onAnalysisComplete: (bodyAreas: BodyArea[], triggers: Trigger[], notes: string) => void;
}

export const useVoiceLogging = ({ onAnalysisComplete }: UseVoiceLoggingProps) => {
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>(null);
  const [voiceNotSupported, setVoiceNotSupported] = useState(!isVoiceSupported());
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fullTranscriptRef = useRef("");
  const isStoppingIntentionallyRef = useRef(false);
  const activeListeningRef = useRef(false);
  const restartAttemptsRef = useRef(0);
  const MAX_RESTART_ATTEMPTS = 5;

  const clearSilenceTimer = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };

  const analyseAndSave = useCallback(async (text: string) => {
    setVoiceStatus('REASONING');
    await new Promise(resolve => setTimeout(resolve, 1500));

    const lower = text.toLowerCase();

    // ── BODY AREAS ──
    const detectedAreas: BodyArea[] = [];

    if (lower.includes('palm') || lower.includes('hand') || lower.includes('hands')) detectedAreas.push('palms');
    if (lower.includes('finger') || lower.includes('fingers')) detectedAreas.push('fingers');
    if (lower.includes('sole') || lower.includes('soles') || lower.includes('bottom of my feet')) detectedAreas.push('soles');
    if (lower.includes('feet') || lower.includes('foot')) detectedAreas.push('feet');
    if (lower.includes('toe') || lower.includes('toes')) detectedAreas.push('toes');
    if (lower.includes('feet and sole') || lower.includes('foot and sole')) detectedAreas.push('feet_soles');
    if ((lower.includes('face') && lower.includes('scalp')) || lower.includes('face and scalp')) {
      detectedAreas.push('face_scalp');
    } else if (lower.includes('face') || lower.includes('forehead') || lower.includes('cheek') || lower.includes('chin')) {
      detectedAreas.push('face');
    } else if (lower.includes('scalp') || (lower.includes('head') && !lower.includes('forehead'))) {
      detectedAreas.push('scalp');
    }
    if (lower.includes('underarm') || lower.includes('armpit') || lower.includes('armpits')) detectedAreas.push('underarms');
    if (lower.includes('entire body') || lower.includes('whole body') || lower.includes('everywhere')) detectedAreas.push('entire_body');
    if (lower.includes('trunk') || lower.includes('torso') || lower.includes('stomach') || lower.includes('abdomen')) detectedAreas.push('trunk');
    if (lower.includes('chest')) detectedAreas.push('chest');
    if (lower.includes('back')) detectedAreas.push('back');
    if (lower.includes('groin')) detectedAreas.push('groin');
    if (detectedAreas.length === 0) detectedAreas.push('palms');

    // ── TRIGGERS ──
    const detectedTriggerValues: string[] = [];

    // Environment & Situation
    if (lower.includes('hot') || lower.includes('heat') || lower.includes('warm') || lower.includes('temperature')) detectedTriggerValues.push('hot_temperature');
    if (lower.includes('humid') || lower.includes('humidity') || lower.includes('muggy') || lower.includes('sticky')) detectedTriggerValues.push('high_humidity');
    if (lower.includes('crowd') || lower.includes('crowded') || lower.includes('busy place') || lower.includes('lots of people')) detectedTriggerValues.push('crowded_spaces');
    if (lower.includes('bright light') || lower.includes('bright lights')) detectedTriggerValues.push('bright_lights');
    if (lower.includes('loud') || lower.includes('noise') || lower.includes('noisy')) detectedTriggerValues.push('loud_noises');
    if (lower.includes('transitional') || lower.includes('temperature change') || lower.includes('moved from') || lower.includes('walked into') || lower.includes('came inside') || lower.includes('went outside')) detectedTriggerValues.push('transitional_temperature');
    if (lower.includes('synthetic') || lower.includes('fabric') || lower.includes('polyester') || lower.includes('nylon')) detectedTriggerValues.push('synthetic_fabrics');
    if (lower.includes('sun') || lower.includes('outdoor') || lower.includes('outside') || lower.includes('sunshine') || lower.includes('sunlight')) detectedTriggerValues.push('outdoor_sun_exposure');

    // Emotional & Cognitive
    if (lower.includes('stress') || lower.includes('stressed')) detectedTriggerValues.push('stress');
    if (lower.includes('anxi') || lower.includes('anxious') || lower.includes('anxiety')) detectedTriggerValues.push('anxiety');
    if (lower.includes('anticipat') || lower.includes('dreading') || lower.includes('worrying about sweating')) detectedTriggerValues.push('anticipatory_sweating');
    if (lower.includes('embarrass')) detectedTriggerValues.push('embarrassment');
    if (lower.includes('excite') || lower.includes('excited') || lower.includes('excitement')) detectedTriggerValues.push('excitement');
    if (lower.includes('anger') || lower.includes('angry') || lower.includes('frustrat')) detectedTriggerValues.push('anger');
    if (lower.includes('nervous') || lower.includes('nervousness') || lower.includes('nerves')) detectedTriggerValues.push('nervousness');
    if (lower.includes('public speak') || lower.includes('presentation') || lower.includes('speaking in front')) detectedTriggerValues.push('public_speaking');
    if (lower.includes('social') || lower.includes('party') || lower.includes('gathering')) detectedTriggerValues.push('social_interaction');
    if (lower.includes('work pressure') || lower.includes('work stress') || lower.includes('boss') || lower.includes('deadline')) detectedTriggerValues.push('work_pressure');
    if (lower.includes('exam') || lower.includes('test') || lower.includes('interview')) detectedTriggerValues.push('exam_test_situation');

    // Food, Drink & Gustatory
    if (lower.includes('spicy') || lower.includes('pepper') || lower.includes('chilli')) detectedTriggerValues.push('spicy_food');
    if (lower.includes('caffeine') || lower.includes('coffee') || lower.includes('energy drink')) detectedTriggerValues.push('caffeine');
    if (lower.includes('alcohol') || lower.includes('beer') || lower.includes('wine')) detectedTriggerValues.push('alcohol');
    if (lower.includes('hot drink') || lower.includes('hot beverage')) detectedTriggerValues.push('hot_drinks');
    if (lower.includes('heavy meal') || lower.includes('big meal') || lower.includes('overate') || lower.includes('ate a lot')) detectedTriggerValues.push('heavy_meals');
    if (lower.includes('gustatory') || lower.includes('eating triggered') || lower.includes('after eating')) detectedTriggerValues.push('gustatory_sweating');

    // Physical Activity & Body State
    if (lower.includes('exercise') || lower.includes('gym') || lower.includes('workout') || lower.includes('running') || lower.includes('sport')) detectedTriggerValues.push('physical_exercise');
    if (lower.includes('night sweat') || lower.includes('sweating at night') || lower.includes('woke up sweating')) detectedTriggerValues.push('night_sweats');
    if (lower.includes('poor sleep') || lower.includes('bad sleep') || lower.includes('no sleep') || lower.includes('tired')) detectedTriggerValues.push('poor_sleep');
    if (lower.includes('hormonal') || lower.includes('period') || lower.includes('menstrual') || lower.includes('menopause')) detectedTriggerValues.push('hormonal_changes');
    if (lower.includes('ill') || lower.includes('sick') || lower.includes('fever') || lower.includes('infection')) detectedTriggerValues.push('illness_fever');
    if (lower.includes('hypoglycemia') || lower.includes('low blood sugar') || lower.includes('sugar dropped')) detectedTriggerValues.push('hypoglycemia');
    if (lower.includes('clothing') || lower.includes('tight clothes') || lower.includes('uniform') || lower.includes('outfit')) detectedTriggerValues.push('certain_clothing');

    // Medications
    if (lower.includes('antidepressant') || lower.includes('ssri') || lower.includes('sertraline') || lower.includes('fluoxetine')) detectedTriggerValues.push('ssris_antidepressants');
    if (lower.includes('opioid') || lower.includes('pain medication') || lower.includes('morphine') || lower.includes('codeine')) detectedTriggerValues.push('opioids_pain_medication');
    if (lower.includes('ibuprofen') || lower.includes('aspirin') || lower.includes('nsaid')) detectedTriggerValues.push('nsaids');
    if (lower.includes('blood pressure') || lower.includes('amlodipine') || lower.includes('lisinopril')) detectedTriggerValues.push('blood_pressure_medication');
    if (lower.includes('insulin') || lower.includes('diabetes medication') || lower.includes('metformin')) detectedTriggerValues.push('insulin_diabetes_medication');
    if (lower.includes('supplement') || lower.includes('herbal') || lower.includes('vitamin')) detectedTriggerValues.push('supplements_herbal');
    if (lower.includes('new medication') || lower.includes('started taking') || lower.includes('new tablet') || lower.includes('new pill')) detectedTriggerValues.push('new_medication');

    const detectedTriggers: Trigger[] = detectedTriggerValues.map(t => ({
      id: `${Date.now()}-${t}`,
      name: t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      label: t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      value: t,
      type: 'environmental',
      category: 'environmental',
      icon: 'zap'
    }));

    setVoiceStatus('SAVING');
    onAnalysisComplete(Array.from(new Set(detectedAreas)), detectedTriggers, text.trim());
    setVoiceStatus(null);
  }, [onAnalysisComplete]);

  // ── Speak a prompt aloud to the user ──────────────────────────────────────
  const speakPrompt = useCallback((text: string, onDone?: () => void) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      onDone?.();
      return;
    }
    const synth = window.speechSynthesis;
    synth.cancel(); // clear any previous speech

    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'en-US';
    utter.rate = 1.0;
    utter.pitch = 1.05;
    utter.volume = 1.0;

    const go = () => {
      const voices = synth.getVoices();
      const preferred = voices.find(v =>
        v.lang.startsWith('en') &&
        ['samantha','victoria','karen','aria','zira','hazel','google uk english female']
          .some(k => v.name.toLowerCase().includes(k))
      ) || voices.find(v => v.lang.startsWith('en'));
      if (preferred) utter.voice = preferred;
      utter.onend = () => onDone?.();
      utter.onerror = () => onDone?.();
      synth.speak(utter);
    };

    if (synth.getVoices().length === 0) {
      synth.addEventListener('voiceschanged', go, { once: true });
    } else {
      go();
    }
  }, []);

  const askConfirmation = useCallback((currentTranscript: string) => {
    setVoiceStatus('CONFIRMING');

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      analyseAndSave(currentTranscript);
      return;
    }

    // ── SAY "Is that all? Say no to keep going." out loud ──────────────
    speakPrompt('Is that all? Say no if you want to keep going.', () => {
      // Wait a brief moment after speech ends to avoid the recognizer
      // catching the tail of the synthesized voice on some Android devices.
      setTimeout(() => startConfirmListening(currentTranscript), 350);
    });
  }, [analyseAndSave, speakPrompt]);

  const startConfirmListening = useCallback((currentTranscript: string) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    const confirmRecognition = new SpeechRecognition();
    confirmRecognition.continuous = false;
    confirmRecognition.interimResults = false;
    confirmRecognition.lang = 'en-US';
    isStoppingIntentionallyRef.current = false;

    // Wait 6 seconds — if user says nothing, assume yes and proceed
    const confirmTimer = setTimeout(() => {
      isStoppingIntentionallyRef.current = true;
      try { confirmRecognition.stop(); } catch (e) {}
      speakPrompt('Saving your episode.', () => analyseAndSave(currentTranscript));
    }, 6000);

    const NEGATIVE_KEYWORDS = [
      'no', 'nope', 'nah', 'not yet', 'not done', 'not finished', "didn't finish",
      'hold on', 'wait', 'one moment', 'one sec', 'one second', 'hang on',
      'actually', 'one more', 'one more thing', 'let me', 'keep going',
      "i'm not done", 'im not done', 'not all', "that's not all", 'thats not all',
      'continue', 'more', 'add'
    ];

    confirmRecognition.onresult = (event: any) => {
      clearTimeout(confirmTimer);
      const response = event.results[0][0].transcript.toLowerCase().trim();

      const isNegative = NEGATIVE_KEYWORDS.some(k => response.includes(k));

      if (isNegative) {
        // User wants to add more — say so and resume listening
        speakPrompt('Go ahead, I am still listening.', () => {
          startListeningInternal(true);
        });
      } else {
        // "yes", or anything else — save
        speakPrompt('Saving your episode.', () => analyseAndSave(currentTranscript));
      }
    };

    confirmRecognition.onerror = () => {
      clearTimeout(confirmTimer);
      speakPrompt('Saving your episode.', () => analyseAndSave(currentTranscript));
    };

    confirmRecognition.onend = () => {
      // handled by timer and onresult
    };

    try {
      confirmRecognition.start();
    } catch (e) {
      clearTimeout(confirmTimer);
      analyseAndSave(currentTranscript);
    }
  }, [analyseAndSave, speakPrompt]);

  const startListeningInternal = useCallback((isResuming = false) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    // ── Browser not supported ───────────────────────────────────────────────
    if (!SpeechRecognition) {
      setVoiceNotSupported(true);
      // The component using this hook will read voiceNotSupported and show a message.
      // We do NOT silently fail — we surface it clearly.
      console.warn('SpeechRecognition is not supported on this browser. Please use Chrome or Safari.');
      return;
    }

    if (!isResuming) {
      fullTranscriptRef.current = '';
      restartAttemptsRef.current = 0;
      setTranscript('');
    }

    isStoppingIntentionallyRef.current = false;

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    // continuous=false works more reliably on Android Chrome.
    // We restart it ourselves in onend when needed.
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      activeListeningRef.current = true;
      setVoiceStatus('LISTENING');
    };

    recognition.onresult = (event: any) => {
      clearSilenceTimer();
      restartAttemptsRef.current = 0; // reset restart counter on successful speech

      const currentTranscript = Array.from(event.results)
        .map((r: any) => r[0].transcript)
        .join(' ');

      const combined = isResuming
        ? (fullTranscriptRef.current + ' ' + currentTranscript).trim()
        : currentTranscript.trim();

      setTranscript(combined);
      fullTranscriptRef.current = combined;

      // Adaptive silence: short speakers get 8s, medium 10s, long-winded 12s.
      // Slower speakers naturally produce longer transcripts and need more wait time.
      const wordCount = combined.split(/\s+/).filter(Boolean).length;
      const silenceMs = wordCount < 8 ? 8000 : wordCount < 25 ? 10000 : 12000;

      silenceTimerRef.current = setTimeout(() => {
        isStoppingIntentionallyRef.current = true;
        try { recognition.stop(); } catch (e) {}
        askConfirmation(fullTranscriptRef.current);
      }, silenceMs);
    };

    recognition.onend = () => {
      // Mobile Chrome stops recognition after ~5-10 seconds automatically
      // If we didn't stop it intentionally and user hasn't finished — restart it
      if (!isStoppingIntentionallyRef.current && activeListeningRef.current) {
        if (restartAttemptsRef.current < MAX_RESTART_ATTEMPTS) {
          restartAttemptsRef.current += 1;
          try {
            recognition.start(); // restart same instance
          } catch (e) {
            // If restart fails, create a new one
            setTimeout(() => startListeningInternal(true), 300);
          }
        } else {
          // Exceeded restarts — if we have something, ask confirmation
          // otherwise stop gracefully
          if (fullTranscriptRef.current.trim()) {
            askConfirmation(fullTranscriptRef.current);
          } else {
            setVoiceStatus(null);
          }
        }
      }
    };

    recognition.onerror = (event: any) => {
      const error = event.error;

      if (error === 'no-speech') {
        // User hasn't spoken yet — restart and keep waiting
        // Don't count this as a failure if we have no transcript yet
        if (fullTranscriptRef.current.trim()) {
          // We have something — treat silence as done
          isStoppingIntentionallyRef.current = true;
          askConfirmation(fullTranscriptRef.current);
        } else if (restartAttemptsRef.current < MAX_RESTART_ATTEMPTS) {
          // Keep waiting — restart silently
          restartAttemptsRef.current += 1;
          try { recognition.start(); } catch (e) {
            setTimeout(() => startListeningInternal(true), 300);
          }
        } else {
          setVoiceStatus(null);
        }
        return;
      }

      if (error === 'aborted') {
        // We aborted it intentionally — do nothing
        return;
      }

      // For any other error (network, not-allowed, etc.)
      clearSilenceTimer();
      if (fullTranscriptRef.current.trim()) {
        analyseAndSave(fullTranscriptRef.current);
      } else {
        setVoiceStatus(null);
      }
    };

    const beginRecognition = () => {
      try {
        recognition.start();
      } catch (e) {
        console.error('Failed to start recognition:', e);
        activeListeningRef.current = false;
        setVoiceStatus(null);
      }
    };

    if (!isResuming) {
      // Start the mic immediately inside the user's tap. Android Chrome can block
      // speech recognition if start() happens after TTS, promises, or timers.
      setVoiceStatus('LISTENING');
      beginRecognition();
    } else {
      beginRecognition();
    }
  }, [analyseAndSave, askConfirmation, speakPrompt]);

  const startListening = useCallback(() => {
    startListeningInternal(false);
  }, [startListeningInternal]);

  const stopListening = useCallback(() => {
    clearSilenceTimer();
    isStoppingIntentionallyRef.current = true;
    activeListeningRef.current = false;
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }
    setVoiceStatus(null);
    fullTranscriptRef.current = '';
    setTranscript('');
  }, []);

  useEffect(() => {
    return () => {
      clearSilenceTimer();
      isStoppingIntentionallyRef.current = true;
      activeListeningRef.current = false;
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
    };
  }, []);

  return {
    voiceStatus,
    startListening,
    stopListening,
    transcript,
    isListening: voiceStatus !== null,
    voiceNotSupported,  // use this to show/hide mic button and show friendly message
  };
};
