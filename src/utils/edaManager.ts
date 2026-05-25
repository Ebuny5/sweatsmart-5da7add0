interface EDAData {
  value: number;
  hr?: number;
  timestamp: string;
  source: 'wearable' | 'simulator';
}

export const edaManager = {
  saveEDA: (value: number, source: 'wearable' | 'simulator') => {
    const data: EDAData = {
      value,
      timestamp: new Date().toISOString(),
      source,
    };
    localStorage.setItem('sharedEDA', JSON.stringify(data));
    console.log('EDA saved:', data);
  },

  getEDA: (): EDAData | null => {
    const stored = localStorage.getItem('sharedEDA');
    if (!stored) return null;
    try {
      return JSON.parse(stored) as EDAData;
    } catch {
      return null;
    }
  },

  isFresh: (): boolean => {
    const data = edaManager.getEDA();
    if (!data) return false;
    const age = Date.now() - new Date(data.timestamp).getTime();
    const FIVE_MINUTES = 5 * 60 * 1000;
    return age < FIVE_MINUTES;
  },

  /** Returns true only if the EDA reading is from a real wearable AND is fresh (< 5 min old) */
  isWearableAndFresh: (): boolean => {
    const data = edaManager.getEDA();
    if (!data) return false;
    if (data.source !== 'wearable') return false;
    const age = Date.now() - new Date(data.timestamp).getTime();
    return age < 5 * 60 * 1000;
  },

  clearEDA: () => {
    localStorage.removeItem('sharedEDA');
    console.log('EDA cleared');
  },
};
