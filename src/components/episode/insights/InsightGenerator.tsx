/**
 * InsightGenerator.tsx — HidroAlly Episode Insight Engine
 *
 * Friendly, plain-language insights for hyperhidrosis episodes.
 * Uses ALL episode data: severity, body areas, triggers, notes, time of day.
 * Works as a standalone engine — no AI credits required.
 */

import React, { useState } from 'react';
import { ProcessedEpisode } from '@/types';
import {
  Thermometer, Heart, Brain, Droplets, AlertTriangle,
  Activity, Clock, Zap, Wind, ChevronDown, ChevronUp,
  Download
} from 'lucide-react';
import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface InsightGeneratorProps {
  episode: ProcessedEpisode;
}

// ── Insight shape ────────────────────────────────────────────────────
interface clinicalInsight {
  id: string;
  icon: React.ReactNode;
  headerColor: string;      // gradient on the header strip
  accentColor: string;      // left border colour class
  bgColor: string;          // card background
  badgeColor: string;       // status badge
  badgeText: string;
  title: string;
  probability: string;      // Friendly probability statement
  summary: string;          // 1-sentence hook
  mechanism: string;        // WHY this happened — plain language explanation
  immediate: string;        // What to do right now
  selfManagement: string;   // Longer term strategy
  clinicalNote: string;     // Friendly clinical guidance
  evidenceTag: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const triggerValue = (t: any): string =>
  (typeof t === 'string' ? t : t?.label || t?.value || t?.type || '').toLowerCase();

const hasKeyword = (text: string, ...words: string[]): boolean =>
  words.some(w => text.includes(w));

// ── Master insight generator ──────────────────────────────────────────────────
function generateInsights(episode: ProcessedEpisode): clinicalInsight[] {
  const insights: clinicalInsight[] = [];

  const severity   = episode.severityLevel || 1;
  const areas      = episode.bodyAreas || [];
  const triggers   = episode.triggers  || [];
  const notes      = (episode.notes    || '').toLowerCase();
  const episodeHour = episode.datetime
    ? new Date(episode.datetime).getHours()
    : new Date().getHours();

  // ── Categorise triggers ────────────────────────────────────────────────────
  const allTriggerText = triggers.map(triggerValue).join(' ');

  const isHeat     = hasKeyword(allTriggerText, 'hot', 'heat', 'temperature', 'humid', 'sun', 'outdoor', 'warm');
  const isStress   = hasKeyword(allTriggerText, 'stress', 'anxiety', 'nervous', 'wor', 'exam', 'work');
  const isSocial   = hasKeyword(allTriggerText, 'crowd', 'social', 'public', 'speak', 'embarrass', 'interaction');
  const isAntic    = hasKeyword(allTriggerText, 'anticipat');
  const isDietary  = hasKeyword(allTriggerText, 'spicy', 'caffeine', 'alcohol', 'hot drink', 'energy', 'meal', 'gustatory');

  // Body area flags
  const hasPalms    = areas.some(a => a.toLowerCase().includes('palm'));
  const hasSoles    = areas.some(a => a.toLowerCase().includes('sole') || a.toLowerCase().includes('feet') || a.toLowerCase().includes('foot'));
  const hasFace     = areas.some(a => a.toLowerCase().includes('face') || a.toLowerCase().includes('scalp') || a.toLowerCase().includes('head'));
  const isPalmoplantar = hasPalms && hasSoles;

  // Time flags
  const isMorning   = episodeHour >= 5  && episodeHour < 12;
  const isNocturnal = episodeHour >= 22 || episodeHour < 5;

  // Notes flags
  const notesHasSwell = hasKeyword(notes, 'swell', 'tight', 'numb', 'tingle', 'puffy');
  const notesHasShame = hasKeyword(notes, 'embarrass', 'shame', 'hate', 'avoid', 'cancel', 'hide');
  const notesHasPain  = hasKeyword(notes, 'pain', 'hurt', 'sting', 'burn', 'slip');

  // ── INSIGHT 1: SEVERITY — always generated ─────────────────────────────────
  const hdssLabel = severity >= 4
    ? 'Intolerable'
    : severity === 3
    ? 'Barely Tolerable'
    : severity === 2
    ? 'Tolerable'
    : 'Never Noticeable';

  const severityMechanism = severity >= 4
    ? `At this level, your body's "cool down" system is firing at maximum intensity. Your brain is sending signals down the Sympathetic Chain with such force that it results in a massive excess of sweat signals at the gland site. Your nervous system is overdriving your sweat glands. This high severity level (HDSS 4) is a clear sign that it's time to seek specialist help from a dermatologist.`
    : severity === 3
    ? `This is a clinical tipping point (HDSS 3) where sweating frequently interferes with your life. Your nervous system is overdriving your sweat glands with a much lower threshold than usual. The sympathetic pathways responsible for this area are firing more frequently than required.`
    : `This episode shows your body was triggered but not completely overwhelmed (HDSS 1-2). Your nervous system sent extra signals down the sympathetic chain, but remained within a semi-manageable range. The goal is to identify the neural trigger—emotional or thermal—to prevent escalation.`;

  const severityImmediate = severity >= 4
    ? `Get out of the triggering environment immediately. Run cold water over your wrists and the back of your neck. These "pulse points" help cool your core temperature quickly and tell your brain to ease up on sweat signals.`
    : severity === 3
    ? `Move to a cooler or quieter spot. Try slow, steady breathing (breathe in for 4 seconds, out for 6). This helps calm your nervous system and eases the sweat signal.`
    : `Try not to worry too much about the episode—worrying can actually make the sweating worse. Use a simple grounding exercise like naming 5 things you can see to pull your brain out of the sweat-stress loop.`;

  const severityClinical = severity >= 4
    ? `Since your sweating is intolerable (HDSS 4), bringing your episode logs to a dermatologist is recommended. They can evaluate specialized treatment options suited to your health profile.`
    : severity === 3
    ? `At HDSS 3, clinical-strength topicals applied at night to dry skin are typically a starting point. Consider discussing advanced options with a physician.`
    : `Over-the-counter clinical-strength topicals applied to completely dry skin at bedtime can help manage mild to moderate flare-ups.`;

  insights.push({
    id: 'severity',
    icon: severity >= 4 ? <AlertTriangle className="h-5 w-5" /> : <Zap className="h-5 w-5" />,
    headerColor: severity >= 4 ? 'from-red-500 to-rose-500' : severity === 3 ? 'from-indigo-500 to-violet-500' : 'from-blue-400 to-cyan-400',
    accentColor: severity >= 4 ? 'border-l-red-500' : severity === 3 ? 'border-l-indigo-500' : 'border-l-blue-400',
    bgColor: severity >= 4 ? 'bg-red-50/40' : severity === 3 ? 'bg-indigo-50/40' : 'bg-blue-50/40',
    badgeColor: severity >= 4 ? 'bg-red-100 text-red-800' : severity === 3 ? 'bg-indigo-100 text-indigo-800' : 'bg-blue-100 text-blue-700',
    badgeText: severity >= 4 ? 'High Severity' : severity === 3 ? 'Significant' : 'Moderate',
    title: `Episode Severity — ${hdssLabel}`,
    probability: `This level of severity usually suggests it's time for specialized care`,
    summary: severity >= 4
      ? `This was a peak-severity episode, meaning your body is sending out its strongest sweat signals.`
      : severity === 3
      ? `This episode frequently interfered with your day, showing your sweat response is quite sensitive.`
      : `A moderate episode where your body reacted to a trigger, but stayed manageable.`,
    mechanism: severityMechanism,
    immediate: severityImmediate,
    selfManagement: `Try to note exactly what you were doing 30 minutes before this happened. After a few logs, you'll start to see your "trigger sequence"—the specific combination of things that pushes your body over the edge.`,
    clinicalNote: severityClinical,
    evidenceTag: `HDSS Scale Analysis · Severity ${severity}/4`,
  });

  // ── INSIGHT 2: DOMINANT TRIGGER ────────────────────────────────────────────
  if (triggers.length > 0) {
    let trigTitle = '';
    let trigMechanism = '';
    let trigImmediate = '';
    let trigSelfManagement = '';
    let trigClinical = '';
    let trigIcon = <Thermometer className="h-5 w-5" />;
    let trigHeader = 'from-orange-400 to-amber-500';
    let trigAccent = 'border-l-orange-500';
    let trigBg = 'bg-orange-50/40';
    let trigBadge = 'bg-orange-100 text-orange-800';
    let trigProb = '';

    if (isHeat) {
      trigTitle = 'Trigger — Heat & Humidity';
      trigProb = 'Probability: 90% Hypothalamus (Thermal) / 10% Baseline Autonomic';
      trigMechanism = `When it's hot, your hypothalamus (body thermostat) tells your sweat glands to kick in. When humidity is high, sweat cannot evaporate efficiently, so your body continues to signal for more cooling.`;
      trigImmediate = `Use a fan! Moving air across your skin helps sweat evaporate even when humid. Target your neck and wrists for fast relief.`;
      trigSelfManagement = `Try pre-cooling by taking a cool shower before entering a hot environment to give your body a cooling buffer.`;
      trigClinical = `Applying clinical-strength antiperspirant to clean, dry skin at night can help create a protective barrier for thermal triggers.`;
      trigIcon = <Thermometer className="h-5 w-5" />;
    } else if (isStress || isAntic) {
      trigTitle = isAntic ? 'Trigger — Anticipation' : 'Trigger — Stress & Anxiety';
      trigProb = 'Probability: 80% Amygdala (Emotional) / 20% Hypothalamus (Thermal)';
      trigMechanism = `Stress triggers a physical response in the nervous system. In hyperhidrosis, this pathway is sensitized, sending signals quickly when feeling anxious or anticipating an event.`;
      trigImmediate = `Practice tactical slow exhalations: breathe in for 4 seconds, hold briefly, and exhale for 6 seconds. Doing this a few times helps ease the nervous system.`;
      trigSelfManagement = `Practice breathing exercises when calm so your body naturally turns to them during stressful moments.`;
      trigClinical = `If stress is a primary driver, consult a dermatologist to discuss event-based management options.`;
      trigIcon = <Brain className="h-5 w-5" />;
      trigHeader = 'from-purple-500 to-violet-500';
      trigAccent = 'border-l-purple-500';
      trigBg = 'bg-purple-50/40';
      trigBadge = 'bg-purple-100 text-purple-800';
    } else if (isSocial) {
      trigTitle = 'Trigger — Social Settings';
      trigProb = 'Probability: 75% Amygdala (Social) / 25% Ambiance (Thermal)';
      trigMechanism = `Social interactions can trigger an automatic nervous system response. Over time, sweating in social settings can become a learned physical reflex.`;
      trigImmediate = `Try sensory grounding: name 5 objects around you or touch a cool surface to draw focus away from anxiety.`;
      trigSelfManagement = `Arrive slightly early to new environments so you can settle in comfortably before crowd density builds.`;
      trigClinical = `Many people find that combining stress management strategies with clinical treatments discussed with a doctor brings the best relief.`;
      trigIcon = <Heart className="h-5 w-5" />;
      trigHeader = 'from-pink-500 to-rose-400';
      trigAccent = 'border-l-pink-500';
      trigBg = 'bg-pink-50/40';
      trigBadge = 'bg-pink-100 text-pink-800';
    } else if (isDietary) {
      trigTitle = 'Trigger — Food & Drink';
      trigProb = 'Probability: 70% Gustatory Stimuli / 30% Sympathetic Sensitivity';
      trigMechanism = `Certain foods and hot beverages stimulate thermal or nervous receptors, sending immediate sweating signals to facial or upper body sweat glands.`;
      trigImmediate = `Sip cold water slowly after warm or spicy items to help cool local thermal receptors.`;
      trigSelfManagement = `Keep a journal of dietary items to identify specific ingredients or coffee limits that trigger sweating.`;
      trigClinical = `If dietary triggers consistently cause facial sweating, mention gustatory sweating to a dermatologist for targeted topical options.`;
      trigIcon = <Droplets className="h-5 w-5" />;
      trigHeader = 'from-green-500 to-emerald-500';
      trigAccent = 'border-l-green-500';
      trigBg = 'bg-green-50/40';
      trigBadge = 'bg-green-100 text-green-800';
    } else {
      trigTitle = 'Logged Trigger';
      trigProb = 'Probability: Mixed Autonomic Triggering';
      trigMechanism = `Your logged trigger stimulated your body's sweat response. In hyperhidrosis, this response is more active than usual.`;
      trigImmediate = `Step into a cool, well-ventilated area for a brief reset when possible.`;
      trigSelfManagement = `Continue logging triggers to build a clear picture for your next physician review.`;
      trigClinical = `If this trigger consistently causes severe episodes, bring your logs to a dermatologist for a tailored treatment plan.`;
    }

    insights.push({
      id: 'trigger',
      icon: trigIcon,
      headerColor: trigHeader,
      accentColor: trigAccent,
      bgColor: trigBg,
      badgeColor: trigBadge,
      badgeText: 'Trigger Analysis',
      title: trigTitle,
      probability: trigProb,
      summary: `Your logged trigger set off your body's sweat response. Here's a plain-language look at why that happened.`,
      mechanism: trigMechanism,
      immediate: trigImmediate,
      selfManagement: trigSelfManagement,
      clinicalNote: trigClinical,
      evidenceTag: `Trigger Pattern Analysis`,
    });
  }

  // ── INSIGHT 3: BODY AREA PATTERN ──────────────────────────────────────────
  if (areas.length > 0) {
    let areaTitle = '';
    let areaMechanism = '';
    let areaImmediate = '';
    let areaSelf = '';
    let areaClinical = '';
    let areaProb = '';
    const areaIcon = <Activity className="h-5 w-5" />;

    if (isPalmoplantar) {
      areaTitle = 'Pattern — Hands & Feet';
      areaProb = 'Classification: Primary Focal Pattern';
      areaMechanism = `Sweating on both hands and feet is a common primary focal pattern, heavily influenced by nervous system responses. It is a localized signal sensitivity rather than an underlying health issue.`;
      areaImmediate = `Press palms against a dry, cool surface or ventilate feet when safe to do so.`;
      areaSelf = `Explore non-invasive physical barriers and breathable footwear designed for moisture management.`;
      areaClinical = `Ask a dermatologist about medical treatments suitable for lower extremities and palms, such as specialized topicals or tap-water therapy.`;
    } else if (hasFace) {
      areaTitle = 'Pattern — Face & Scalp';
      areaProb = 'Classification: Craniofacial Pattern';
      areaMechanism = `Facial sweating is often linked to thermal sensitivity and emotional stress. Gentle, non-greasy approaches protect skin while managing moisture.`;
      areaImmediate = `Use a gentle cloth to absorb excess moisture and mist with cool water to soothe thermal receptors.`;
      areaSelf = `Avoid heavy oil-based creams before outdoor activities or high-temperature settings.`;
      areaClinical = `For facial hyperhidrosis, non-greasy medical gels or topicals prescribed by a dermatologist provide targeted action without blocking pores.`;
    } else {
      areaTitle = `Pattern — ${areas[0]}`;
      areaProb = 'Classification: Focal Area Pattern';
      areaMechanism = `The area you are tracking has a high concentration of sweat glands reacting to localized nervous signals.`;
      areaImmediate = `Cool the area with a damp cloth or soft airflow to signal temperature reduction to the brain.`;
      areaSelf = `Track which fabric weaves (such as breathable merino or technical fabrics) feel most comfortable during flare-ups.`;
      areaClinical = `Dermatologists offer several targeted therapies for specific focal zones to reduce localized sweat production.`;
    }

    insights.push({
      id: 'bodyarea',
      icon: areaIcon,
      headerColor: 'from-sky-500 to-blue-500',
      accentColor: 'border-l-sky-500',
      bgColor: 'bg-sky-50/40',
      badgeColor: 'bg-sky-100 text-sky-800',
      badgeText: 'Area Analysis',
      title: areaTitle,
      probability: areaProb,
      summary: `Sweating in your ${areas.join(', ')} follows a recognized pattern. Here is what that means for management.`,
      mechanism: areaMechanism,
      immediate: areaImmediate,
      selfManagement: areaSelf,
      clinicalNote: areaClinical,
      evidenceTag: `Body Area Pattern Analysis`,
    });
  }

  // ── INSIGHT 4: TIME OF DAY ─────────────────────
  if (isNocturnal && severity >= 2) {
    insights.push({
      id: 'timing',
      icon: <Clock className="h-5 w-5" />,
      headerColor: 'from-slate-600 to-gray-700',
      accentColor: 'border-l-slate-600',
      bgColor: 'bg-slate-50/40',
      badgeColor: 'bg-slate-100 text-slate-800',
      badgeText: 'Timing Note',
      title: 'Nighttime Sweating',
      probability: 'Worth discussing with a healthcare professional',
      summary: `Primary hyperhidrosis typically diminishes during sleep. Sweating during sleep is worth bringing to a doctor's attention.`,
      mechanism: `Because autonomic sweating usually quietens during deep sleep, persistent nocturnal episodes can sometimes relate to secondary factors like medication or systemic health.`,
      immediate: `Sip cool water to stay hydrated and note whether sweating occurred while asleep or during wakeful hours.`,
      selfManagement: `Keep a log of nighttime episodes. If occurring regularly, schedule a routine consultation with your GP.`,
      clinicalNote: `Ask your physician to evaluate potential secondary causes or lab panels during your next check-up.`,
      evidenceTag: `Nocturnal Pattern Note`,
    });
  } else if (isMorning && isStress) {
    insights.push({
      id: 'timing',
      icon: <Clock className="h-5 w-5" />,
      headerColor: 'from-amber-400 to-yellow-500',
      accentColor: 'border-l-amber-400',
      bgColor: 'bg-amber-50/40',
      badgeColor: 'bg-amber-100 text-amber-800',
      badgeText: 'Timing Note',
      title: 'Morning Rhythm',
      probability: 'Natural morning body rhythms likely played a role',
      summary: `Mornings coincide with natural surges in wakefulness hormones, which can lower your sweating threshold.`,
      mechanism: `Your body's natural waking cycle increases alertness, which can coincide with morning preparations and lower the threshold for sweat signaling.`,
      immediate: `Allow 5 to 10 quiet minutes upon waking before starting a hectic routine or checking urgent messages.`,
      selfManagement: `If using clinical topicals, applying them the evening before allows proper absorption prior to morning activity.`,
      clinicalNote: `Discuss morning symptom patterns with your dermatologist to time treatments effectively.`,
      evidenceTag: `Morning Rhythm Analysis`,
    });
  }

  // ── INSIGHT 5: SECONDARY COMPLICATIONS (from notes) ──────────────────────
  if (notesHasSwell || notesHasPain) {
    insights.push({
      id: 'complications',
      icon: <Wind className="h-5 w-5" />,
      headerColor: 'from-teal-500 to-cyan-500',
      accentColor: 'border-l-teal-500',
      bgColor: 'bg-teal-50/40',
      badgeColor: 'bg-teal-100 text-teal-800',
      badgeText: 'Follow-up',
      title: notesHasSwell ? 'Swelling & Tightness' : 'Pain & Discomfort',
      probability: 'A recognized physical response during intense episodes',
      summary: `You noted ${notesHasSwell ? 'swelling or tightness' : 'discomfort'}—this can occur as blood vessels dilate during heat dissipation.`,
      mechanism: `During heavy sweating, localized skin blood vessels dilate to release heat, which can temporarily cause fluid retention or tightness in hands or feet.`,
      immediate: `Elevate hands or feet slightly and apply a cool, damp compress to reduce localized puffiness.`,
      selfManagement: `Note how long swelling lasts after sweating stops. Share these details if it persists beyond two hours.`,
      clinicalNote: `Documenting physical symptoms helps your doctor understand the full impact on your daily life.`,
      evidenceTag: `Physical Complication Note`,
    });
  }

  // ── INSIGHT 6: PSYCHOSOCIAL NOTE ─────────────────────────────────────────
  if (notesHasShame || severity >= 4) {
    insights.push({
      id: 'psychosocial',
      icon: <Heart className="h-5 w-5" />,
      headerColor: 'from-rose-400 to-pink-500',
      accentColor: 'border-l-rose-400',
      bgColor: 'bg-rose-50/40',
      badgeColor: 'bg-rose-100 text-rose-800',
      badgeText: 'Warrior Support',
      title: 'Emotional Well-being',
      probability: 'Your feelings are valid and shared by many warriors',
      summary: `Living with heavy sweating can be taxing. Recognizing its impact is an important step in managing your health.`,
      mechanism: `Hyperhidrosis carries a documented emotional load. Worrying about sweating can amplify autonomic responses, making ongoing support valuable.`,
      immediate: `Remind yourself that hyperhidrosis is a recognized physical condition, not a personal flaw.`,
      selfManagement: `Connecting with support communities or patient advocacy groups (like the International Hyperhidrosis Society) offers helpful resources.`,
      clinicalNote: `Do not hesitate to discuss quality-of-life impacts with your physician alongside physical symptoms.`,
      evidenceTag: `Warrior Wellness Note`,
    });
  }

  return insights;
}

// ── Individual insight card ───────────────────────────────────────────────────
const InsightCard: React.FC<{ insight: clinicalInsight }> = ({ insight }) => {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const handleExport = () => {
    try {
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 18;
      const maxW = pageWidth - margin * 2;
      let y = 25;

      const section = (title: string, body: string) => {
        if (y > 250) { pdf.addPage(); y = 20; }
        pdf.setFontSize(11); pdf.setFont('helvetica', 'bold');
        pdf.text(title, margin, y); y += 7;
        pdf.setFontSize(9); pdf.setFont('helvetica', 'normal');
        const lines = pdf.splitTextToSize(body, maxW);
        pdf.text(lines, margin, y); y += lines.length * 4.5 + 8;
      };

      pdf.setFontSize(16); pdf.setFont('helvetica', 'bold');
      pdf.text('HidroAlly — Episode Insight', margin, y); y += 8;
      pdf.setFontSize(9); pdf.setFont('helvetica', 'italic');
      pdf.text(`Generated: ${format(new Date(), 'EEEE, MMMM d, yyyy')}`, margin, y); y += 10;

      pdf.setFontSize(13); pdf.setFont('helvetica', 'bold');
      pdf.text(insight.title, margin, y); y += 8;
      pdf.setFontSize(9); pdf.setFont('helvetica', 'italic');
      pdf.text(insight.probability, margin, y); y += 10;

      section('Summary', insight.summary);
      section('Clinical Analysis', insight.mechanism);
      section('What To Do Now', insight.immediate);
      section('Long-term Strategy', insight.selfManagement);
      section('Doctor\'s Note / Treatment', insight.clinicalNote);

      y = pdf.internal.pageSize.getHeight() - 20;
      pdf.setFontSize(8); pdf.setFont('helvetica', 'italic');
      pdf.text('This report is for educational reference. Please discuss these insights with a healthcare professional.', margin, y);

      pdf.save('HidroAlly_Analysis_And_Recommendation.pdf');
      toast({ title: 'Report exported', description: 'Your PDF is ready.' });
    } catch {
      toast({ title: 'Export failed', variant: 'destructive' });
    }
  };

  return (
    <div className={`rounded-2xl border-l-4 ${insight.accentColor} ${insight.bgColor} border border-gray-100 overflow-hidden shadow-sm`}>
      {/* ── Header strip ── */}
      <div className={`bg-gradient-to-r ${insight.headerColor} px-4 py-3 flex items-center justify-between`}>
        <div className="flex items-center gap-2.5 text-white">
          {insight.icon}
          <span className="font-bold text-sm leading-tight">{insight.title}</span>
        </div>
        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${insight.badgeColor}`}>
          {insight.badgeText}
        </span>
      </div>

      {/* ── Summary row ── */}
      <div className="px-4 pt-3 pb-1">
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
          {insight.probability}
        </p>
        <p className="text-sm text-gray-700 font-medium leading-snug">{insight.summary}</p>
      </div>

      {/* ── Expanded content ── */}
      {open && (
        <div className="px-4 pb-4 space-y-3 mt-2">
          {/* Mechanism */}
          <div className="p-3 rounded-xl bg-violet-50 border border-violet-100">
            <p className="text-[10px] font-black text-violet-600 uppercase tracking-wide mb-1">Clinical Analysis</p>
            <p className="text-xs text-violet-900 leading-relaxed">{insight.mechanism}</p>
          </div>
          {/* Immediate */}
          <div className="p-3 rounded-xl bg-green-50 border border-green-100">
            <p className="text-[10px] font-black text-green-600 uppercase tracking-wide mb-1">What To Do Now</p>
            <p className="text-xs text-green-900 leading-relaxed">{insight.immediate}</p>
          </div>
          {/* Self-management */}
          <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-wide mb-1">Long-term Strategy</p>
            <p className="text-xs text-blue-900 leading-relaxed">{insight.selfManagement}</p>
          </div>
          {/* Clinical note */}
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-100">
            <p className="text-[10px] font-black text-amber-600 uppercase tracking-wide mb-1">Doctor's Note</p>
            <p className="text-xs text-amber-900 leading-relaxed">{insight.clinicalNote}</p>
          </div>
          {/* Footer */}
          <div className="flex items-center justify-between pt-1">
            <p className="text-[10px] text-gray-400">{insight.evidenceTag}</p>
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 text-[11px] font-bold text-violet-600 hover:text-violet-800"
            >
              <Download className="h-3.5 w-3.5" />
              Download PDF
            </button>
          </div>
        </div>
      )}

      {/* ── Expand toggle ── */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-center gap-1.5 py-2.5 border-t border-gray-100 text-[11px] font-bold text-gray-500 hover:bg-gray-50 transition-colors"
      >
        {open ? (
          <><ChevronUp className="h-3.5 w-3.5" />Hide Detail</>
        ) : (
          <><ChevronDown className="h-3.5 w-3.5" />View Analysis</>
        )}
      </button>
    </div>
  );
};

// ── Main export ───────────────────────────────────────────────────────────────
const InsightGenerator: React.FC<InsightGeneratorProps> = ({ episode }) => {
  const insights = generateInsights(episode);

  if (!insights.length) {
    return (
      <p className="text-sm text-gray-400 text-center py-6">
        Log episode details to generate insights.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {insights.map(insight => (
        <InsightCard key={insight.id} insight={insight} />
      ))}
      <p className="text-[10px] text-gray-400 text-center pt-1">
        Tap any card to expand analysis · HidroAlly Warrior Engine v2
      </p>
    </div>
  );
};

export default InsightGenerator;
