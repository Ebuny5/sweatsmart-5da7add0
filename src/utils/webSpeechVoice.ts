const PREFERRED_VOICE_PARTS = [
  'Microsoft Aria',
  'Microsoft Jenny',
  'Microsoft Zira',
  'Google US English',
  'Samantha',
  'Victoria',
  'Natural',
  'Neural',
  'Premium',
];

export function pickProfessionalVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const englishVoices = voices.filter((voice) => voice.lang?.toLowerCase().startsWith('en'));
  const pool = englishVoices.length ? englishVoices : voices;

  for (const part of PREFERRED_VOICE_PARTS) {
    const match = pool.find((voice) => voice.name.toLowerCase().includes(part.toLowerCase()));
    if (match) return match;
  }

  return pool[0] ?? null;
}

export function speakProfessionally(text: string, options?: { rate?: number; pitch?: number }): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      resolve();
      return;
    }

    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options?.rate ?? 0.95;
    utterance.pitch = options?.pitch ?? 1;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();

    const applyVoiceAndSpeak = () => {
      const voice = pickProfessionalVoice(synth.getVoices());
      if (voice) utterance.voice = voice;
      synth.cancel();
      synth.speak(utterance);
    };

    if (synth.getVoices().length === 0) {
      synth.onvoiceschanged = applyVoiceAndSpeak;
      window.setTimeout(applyVoiceAndSpeak, 250);
    } else {
      applyVoiceAndSpeak();
    }
  });
}

export function stopProfessionalSpeech(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}