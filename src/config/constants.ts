/**
 * DATABASE VARIABLE MAPPING SCHEMA FOR HIDROALLY CLINICAL INTELLIGENCE AI
 * Maps Supabase PostgreSQL database columns to prompt dynamic variables.
 */

export interface PromptDatabaseMapping {
  /** Column: profiles.display_name or profiles.email */
  patientName: string;
  /** Column: episodes.created_at / episodes.datetime (min date to max date range) */
  reportPeriod: string;
  /** Aggregate: COUNT(episodes.id) WHERE user_id = :userId AND is_dry_day = false */
  totalEpisodesLogged: number;
  /** Aggregate: AVG(episodes.severity / severityLevel) */
  averageHDSSSeverity: number;
  /** Aggregate: Breakdown of episodes.triggers grouped by name/label with percentages and avg severity */
  topTriggers: Array<{
    name: string;
    count: number;
    percentage: number;
    avgSeverity: number;
  }>;
  /** Aggregate: Breakdown of episodes.body_areas / bodyAreas grouped by area name */
  topAffectedAreas: Array<{
    area: string;
    count: number;
    percentage: number;
    avgSeverity: number;
  }>;
  /** Aggregate: Week-by-week density and severity trends */
  weeklyTrends: Array<{
    week: string;
    count: number;
    avgSeverity: number;
  }>;
}

export const REPORT_STRUCTURE_EXPLANATION = `
Your HidroAlly Clinical Summary is generated in a compliant 2-part format:
• Sections 1–6 (Patient-Facing): Telemetry logs, trigger analytics, lifestyle diagnostics, and educational reference guides.
• Internal Medical Appendix (Dermatologist-Facing): High-level clinical recommendations, area-specific drug stratifications (e.g., sensitive craniofacial care), and barrier management reasoning for your consulting physician.
`;
