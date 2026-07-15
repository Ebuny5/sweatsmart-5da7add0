// Climate types
export interface WeatherData {
  temperature: number;
  humidity: number;
  /** Real UV index from API. null when API didn't return one — no fake fallback. */
  uvIndex: number | null;
  /** Sky condition derived server-side from cloud cover + weather code. */
  sky?: 'sunny' | 'partly_cloudy' | 'overcast' | 'unknown';
  lastUpdated?: number;
  description?: string;
  location?: string;
}

export interface PhysiologicalData {
  eda: number;
}

export interface Thresholds {
  temperature: number;
  humidity: number;
  uvIndex: number;
}

export type HDSSLevel = 1 | 2 | 3 | 4;

export interface LogEntry {
  id: string;
  timestamp: number;
  hdssLevel: HDSSLevel;
  weather: WeatherData;
  physiologicalData: PhysiologicalData;
}

// Episode types
export type SeverityLevel = 1 | 2 | 3 | 4 | 5;

export type BodyArea = 
  | 'palms'
  | 'hands'
  | 'fingers'
  | 'soles'
  | 'feet'
  | 'toes'
  | 'feet_soles'
  | 'underarms'
  | 'face'
  | 'scalp'
  | 'face_scalp'
  | 'back'
  | 'chest'
  | 'trunk'
  | 'groin'
  | 'entire_body';

export interface BodyAreaDetail {
  area: BodyArea;
  name: BodyArea;
  label: string;
  icon: string;
}

export interface Trigger {
  id: string;
  name: string;
  label: string;
  value: string;
  type: 'environmental' | 'emotional' | 'physical' | 'dietary' | 'medical' | 'situational';
  category: 'environmental' | 'emotional' | 'physical' | 'dietary' | 'medical' | 'situational';
  icon: string;
}

export interface ProcessedEpisode {
  id: string;
  date: string;
  datetime: Date;
  severity: SeverityLevel;
  severityLevel: SeverityLevel;
  body_areas: BodyArea[];
  bodyAreas: BodyArea[];
  triggers: Trigger[];
  notes?: string;
  created_at: string;
  createdAt: Date;
  updated_at: string;
  userId: string;
  is_dry_day?: boolean;
}

export interface TriggerFrequency {
  name: string;
  count: number;
  category: string;
  trigger?: {
    label: string;
    type: 'environmental' | 'emotional' | 'physical' | 'dietary' | 'medical' | 'situational';
    value: string;
  };
  averageSeverity?: number;
  percentage?: number;
}

export interface BodyAreaFrequency {
  area: BodyArea;
  count: number;
  percentage: number;
  averageSeverity?: number;
}

export interface TrendData {
  date: string;
  severity: number;
  count: number;
}

// Profile types
export interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  age?: number;
  biological_sex?: string;
  gender_identity?: string;
  diagnosis_type?: string;
  country?: string;
  is_profile_complete?: boolean;
  avatar?: string;
  avatar_type?: 'emoji' | 'image';
  gender?: string;
  gender_description?: string;
  created_at: string;
  updated_at: string;
}
