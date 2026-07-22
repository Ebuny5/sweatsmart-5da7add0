/**
 * PersonalizedInsights.tsx — HidroAlly
 *
 * Pattern analysis engine based on logged episodes.
 * Plain-language output only — no medical jargon visible to users.
 */

import React, { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Zap,
  Brain,
  TrendingDown,
  TrendingUp,
  Clock,
  Droplets,
  Wind,
  AlertTriangle,
} from "lucide-react";

interface Episode {
  id?: string;
  severity?: number | string;
  body_areas?: string[];
  triggers?: any[];
  date?: string;
  created_at?: string;
  notes?: string;
}

interface PersonalizedInsightsProps {
  episodes: Episode[];
}

interface WarriorInsight {
  rank: number;
  icon: React.ReactNode;
  rankColor: string;
  label: string;
  sublabel: string;
  probability: number;
  probabilityLabel: string;
  bar: string;
  pill: string;
  pillText: string;
  detail: string;
  action: string;
  clinicalNote: string;
  isPrescriptionThreshold?: boolean;
}

const sev = (ep: Episode) => Number(ep.severity) || 0;
const hour = (ep: Episode) =>
  new Date(ep.date || ep.created_at || "").getHours();

function analyzeEpisodes(episodes: Episode[]): WarriorInsight[] {
  if (!episodes.length) return [];

  const total = episodes.length;
  const severities = episodes.map(sev);
  const avgSev = severities.reduce((a, b) => a + b, 0) / total;

  // ── Trigger analysis ──────────────────────────────────────────────────────
  const triggerMap = new Map<
    string,
    { count: number; sevs: number[]; type: string }
  >();
  episodes.forEach((ep) => {
    const triggers = Array.isArray(ep.triggers) ? ep.triggers : [];
    triggers.forEach((t: any) => {
      const raw = typeof t === "string" ? JSON.parse(t) : t;
      const key = (raw?.label || raw?.value || "unknown").toLowerCase();
      const type = raw?.type || "environmental";
      const existing = triggerMap.get(key) || { count: 0, sevs: [], type };
      existing.count++;
      existing.sevs.push(sev(ep));
      triggerMap.set(key, existing);
    });
  });

  const topTrigger = Array.from(triggerMap.entries()).sort(
    (a, b) => b[1].count - a[1].count
  )[0];

  // ── Time patterns ─────────────────────────────────────────────────────────
  const nightEps = episodes.filter((ep) => {
    const h = hour(ep);
    return h >= 22 || h < 6;
  });
  const morningEps = episodes.filter((ep) => {
    const h = hour(ep);
    return h >= 6 && h < 12;
  });
  const afternoonEps = episodes.filter((ep) => {
    const h = hour(ep);
    return h >= 12 && h < 18;
  });

  // ── Severity trajectory ───────────────────────────────────────────────────
  const sorted = [...episodes].sort(
    (a, b) =>
      new Date(a.date || a.created_at || "").getTime() -
      new Date(b.date || b.created_at || "").getTime()
  );
  const first3Avg =
    sorted.slice(0, 3).reduce((a, e) => a + sev(e), 0) /
    Math.min(3, sorted.length);
  const last3Avg =
    sorted.slice(-3).reduce((a, e) => a + sev(e), 0) /
    Math.min(3, sorted.length);
  const sevDrift = last3Avg - first3Avg;

  // ── Body area pattern ─────────────────────────────────────────────────────
  const areaMap = new Map<string, number>();
  episodes.forEach((ep) =>
    (ep.body_areas || []).forEach((a) =>
      areaMap.set(a, (areaMap.get(a) || 0) + 1)
    )
  );
  const topArea = Array.from(areaMap.entries()).sort(
    (a, b) => b[1] - a[1]
  )[0];
  const multiArea = episodes.filter(
    (ep) => (ep.body_areas || []).length > 2
  ).length;

  // ── High severity cluster ─────────────────────────────────────────────────
  const highSevEps = episodes.filter((e) => sev(e) >= 4);

  const insights: WarriorInsight[] = [];

  // ── INSIGHT A: Dominant trigger ───────────────────────────────────────────
  if (topTrigger) {
    const [trigName, trigData] = topTrigger;
    const trigPercent = Math.round((trigData.count / total) * 100);
    const trigAvgSev = (
      trigData.sevs.reduce((a, b) => a + b, 0) / trigData.sevs.length
    ).toFixed(1);
    const isHeat =
      trigName.includes("hot") ||
      trigName.includes("heat") ||
      trigName.includes("temp");
    const isStress =
      trigName.includes("stress") ||
      trigName.includes("anxiety") ||
      trigName.includes("wor");
    const isSocial =
      trigName.includes("crowd") ||
      trigName.includes("social") ||
      trigName.includes("public");

    const detail = isHeat
      ? `Your body reacts to rising temperatures by ramping up sweating harder and faster than it needs to. Essentially, your "software" (nervous system) is overdriving your functionally normal "hardware" (sweat glands). In humid conditions, sweat can't evaporate properly, so your hypothalamus (your body's thermostat) keeps sending signals down the sympathetic chain, producing more sweat without the expected cooling relief.`
      : isStress
      ? `Your brain's alarm system — the part that reacts to stress — is overdriving your sweat glands. This is a case of your "software" (nervous system) over-triggering your normal "hardware" (sweat glands). Crucially, this often fires in *anticipation* of a stressful situation, sending a signal down the sympathetic chain before the event even begins. This isn't a character flaw; it's a physical overreaction that can be reset.`
      : isSocial
      ? `Your body has learned to associate social situations with a sweating response. Your "software" (nervous system) is sending a "prepare for sweating" signal to your "hardware" (sweat glands) before you've even entered the room. The signal travels from your amygdala down the sympathetic chain, triggering the glands. Understanding this means you can use techniques to interrupt the signal before it starts.`
      : `This trigger is consistently setting off your body's sweat response. Your "software" (nervous system) is overdriving your "hardware" (sweat glands) by sending excessive signals down the sympathetic chain. Pattern awareness is powerful because it allows you to intervene and reset the nervous system before the sweating becomes intolerable.`;

    const isPrescriptionThreshold = parseFloat(trigAvgSev) >= 3;

    const action = isHeat
      ? `Cool your wrists under cold running water for 3–4 minutes before entering a hot environment. Blood vessels close to the surface of your wrist carry cooled blood towards your core, which signals your brain to ease up on the sweating. Carry a small personal fan — moving air across your skin helps sweat actually do its job of cooling you down, which reduces the urge to produce more.`
      : isStress
      ? `Try the 4-7-8 breathing technique: breathe in for 4, hold for 7, breathe out for 8. This activates your Vagus Nerve to shift your body from "fight or flight" to "rest and digest," reducing the chemical signal (acetylcholine) sent to your sweat glands.`
      : `Give yourself a 2-minute buffer before entering the triggering situation. Try the 5-4-3-2-1 grounding technique (name 5 things you can see, 4 you can hear, 3 you can touch) — it redirects your brain away from anticipation mode and genuinely reduces the physical response within about a minute.`;

    const clinicalNote = isPrescriptionThreshold
      ? (isHeat
        ? `At this severity level (HDSS 3-4), first-line antiperspirants may not be enough. Prescription options like Sofdra (topical gel) or Botox injections are recommended. These treatments work by 'blocking the acetylcholine signal'—the nervous system's command to sweat—directly at the gland.`
        : `Since your episodes are reaching the prescription threshold, treatments like Botox or topical anticholinergics (Sofdra, Qbrexza) are worth discussing with a dermatologist. These options 'block the acetylcholine signal' at the gland to stop the sweating response regardless of the trigger.`)
      : (isHeat
        ? `For mild-to-moderate heat triggers (HDSS 1-2), the most effective first-line treatment is aluminium chloride 20% clinical-strength antiperspirant. Apply it to completely dry skin at night so it can properly block the sweat ducts while your glands are less active.`
        : `For stress-related triggers at this level, focus on behavioral resets like the 4-7-8 technique and clinical-strength OTC antiperspirants. These help manage the 'software' signal while providing a physical barrier to the sweat.`);

    insights.push({
      isPrescriptionThreshold,
      rank: 1,
      icon: isHeat ? (
        <Droplets className="h-3.5 w-3.5" />
      ) : isStress ? (
        <Brain className="h-3.5 w-3.5" />
      ) : (
        <Zap className="h-3.5 w-3.5" />
      ),
      rankColor: "bg-amber-400",
      label: `"${
        trigName.charAt(0).toUpperCase() + trigName.slice(1)
      }" is your #1 driver`,
      sublabel: `${trigData.count}× · avg HDSS ${trigAvgSev} · ${trigPercent}% of all episodes`,
      probability: trigPercent,
      probabilityLabel: `Appears in ${trigPercent}% of your logged episodes`,
      bar: "from-amber-400 to-orange-500",
      pill: "bg-orange-100 text-orange-700",
      pillText:
        trigData.type === "emotional"
          ? "Emotional"
          : trigData.type === "dietary"
          ? "Dietary"
          : "Environment",
      detail,
      action,
      clinicalNote,
    });
  }

  // ── INSIGHT B: Severity trajectory ────────────────────────────────────────
  if (total >= 4) {
    const driftMag = Math.abs(sevDrift);
    const driftPercent = Math.round(Math.min((driftMag / 5) * 100, 100));
    const worsening = sevDrift > 0.3;
    const improving = sevDrift < -0.3;

    const isPrescriptionThreshold = last3Avg >= 3;

    insights.push({
      rank: 2,
      isPrescriptionThreshold,
      icon: worsening ? (
        <TrendingUp className="h-3.5 w-3.5" />
      ) : improving ? (
        <TrendingDown className="h-3.5 w-3.5" />
      ) : (
        <Zap className="h-3.5 w-3.5" />
      ),
      rankColor: worsening
        ? "bg-red-400"
        : improving
        ? "bg-green-400"
        : "bg-gray-400",
      label: worsening
        ? `Severity escalating — avg +${sevDrift.toFixed(1)} HDSS pts over time`
        : improving
        ? `Severity improving — avg ${Math.abs(sevDrift).toFixed(1)} HDSS pts reduction`
        : `Severity stable — consistent across episodes`,
      sublabel: `Baseline ${first3Avg.toFixed(1)} → Recent ${last3Avg.toFixed(
        1
      )} (HDSS 1-4 Scale)`,
      probability: driftPercent,
      probabilityLabel: worsening
        ? `The escalation is consistent across your last ${Math.min(
            total,
            3
          )} episodes — not random`
        : improving
        ? `Your recent episodes are measurably less severe than earlier ones`
        : `No escalation detected across your logged episodes`,
      bar: worsening
        ? "from-red-400 to-rose-500"
        : improving
        ? "from-green-400 to-emerald-500"
        : "from-gray-300 to-gray-400",
      pill: worsening
        ? "bg-red-100 text-red-700"
        : improving
        ? "bg-green-100 text-green-700"
        : "bg-gray-100 text-gray-600",
      pillText: worsening ? "↑" : improving ? "↓" : "→",
      detail: worsening
        ? `Your episodes are getting more severe over time, which tells you that what you're currently doing isn't quite keeping pace with what your body needs. This can happen for several reasons — increasing exposure to your triggers, seasonal changes, or simply that your condition needs stronger management than first-line approaches can offer. The important thing: escalating severity is a clear signal to act, not to wait.`
        : improving
        ? `Your episodes are getting less severe over time — this is real, measurable progress. Whatever you've been doing is having a genuine physical effect, whether that's a treatment you started, a lifestyle change, or better trigger awareness. This trend is worth noting and protecting.`
        : `Your severity has been consistent across all your logged episodes — no escalation, no major improvement yet. This stability is actually useful: it means your triggers are predictable and a focused management strategy is likely to produce a clear, measurable result.`,
      action: worsening
        ? `Write down what's changed in the past few weeks — new stressors, seasonal shift, stopped using a product? Bring your episode log to your next doctor's appointment. At this severity level, prescription treatment options are available and worth asking about.`
        : improving
        ? `Keep doing what you're doing, and if you recently started a new treatment or habit, document it. This progress is evidence you can show a dermatologist to guide next steps.`
        : `Use this stable window to make one deliberate change — for example, consistent use of aluminium chloride 20% antiperspirant at night for two weeks — and track whether it shifts your baseline.`,
      clinicalNote: worsening
        ? `If episodes are scoring HDSS 3 or higher consistently, it's time to ask your doctor about prescription options. Topical anticholinergics like Qbrexza and Sofdra are newer treatments that work by 'blocking the acetylcholine signal' at the gland. Botox injections are also an option, providing relief by stopping the nerve signal from reaching the glands.`
        : `Continue your current approach. For HDSS 1-2, first-line treatments like Aluminium Chloride 20% are recommended. If severity drops below HDSS 2 consistently, you can consider reducing treatment frequency to find the minimum that keeps you comfortable.`,
    });
  }

  // ── INSIGHT C: Time-of-day pattern ────────────────────────────────────────
  const peakPeriod =
    morningEps.length >= afternoonEps.length &&
    morningEps.length >= nightEps.length
      ? {
          name: "morning",
          count: morningEps.length,
          label: "6AM–12PM",
          clinical: "anticipatory",
        }
      : afternoonEps.length >= nightEps.length
      ? {
          name: "afternoon",
          count: afternoonEps.length,
          label: "12PM–6PM",
          clinical: "thermal + stress peak",
        }
      : {
          name: "night",
          count: nightEps.length,
          label: "10PM–6AM",
          clinical: "nocturnal — worth investigating",
        };

  if (total >= 3 && peakPeriod.count > 0) {
    const peakPercent = Math.round((peakPeriod.count / total) * 100);
    const isMorning = peakPeriod.name === "morning";
    const isNight = peakPeriod.name === "night";

    const peakAvgSev = (
      (peakPeriod.name === "morning" ? morningEps : peakPeriod.name === "afternoon" ? afternoonEps : nightEps)
      .reduce((a, e) => a + sev(e), 0) / peakPeriod.count
    );
    const isPrescriptionThreshold = peakAvgSev >= 3;

    insights.push({
      rank: 3,
      isPrescriptionThreshold,
      icon: <Clock className="h-3.5 w-3.5" />,
      rankColor: "bg-violet-400",
      label: `Peak episodes: ${peakPeriod.label}`,
      sublabel: `${peakPeriod.count}× in this window · ${peakPercent}% of episodes · ${peakPeriod.clinical}`,
      probability: peakPercent,
      probabilityLabel: `${peakPercent}% of your episodes fall in this time window`,
      bar: "from-violet-500 to-purple-500",
      pill: "bg-purple-100 text-purple-700",
      pillText: "Time",
      detail: isMorning
        ? `Morning episodes often come from your body gearing up for the day before any real stressor has even arrived. Stress hormones (especially cortisol) peak in the early morning and directly dial up your body's alert state — including your sweat glands. Combined with anticipatory thinking about the day ahead, this creates a window where sweating can start before you've even left home. Recognising this pattern means you can get ahead of it, not just react to it.`
        : isNight
        ? `This is worth paying attention to. Hyperhidrosis related to daytime triggers typically stops during sleep — so regular nocturnal episodes suggest something else may be going on, such as hormonal changes, thyroid function, blood sugar regulation, or a medication effect. This doesn't mean something serious is wrong, but it does mean it's worth raising with your doctor rather than managing alone.`
        : `Afternoons tend to be a double hit — it's the hottest part of the day AND often the most socially and professionally demanding. Your body is working harder on both fronts at the same time. Knowing this is your peak window gives you a real opportunity to build in protective strategies for exactly this period.`,
      action: isMorning
        ? `Build a 10-minute morning routine: 4-7-8 breathing (repeat 4 times) + cold wrist rinse. The 4-7-8 reset activates your Vagus Nerve to calm your system before the day's stressors hit. If using antiperspirant, apply it the night before for max effect.`
        : isNight
        ? `Keep a simple note for the next 2 weeks: time you wake, how soaked your clothes/sheets are, and anything unusual the day before (food, stress, medication). Bring this to your doctor — it gives them exactly what they need to investigate efficiently.`
        : `Prepare for the afternoon window specifically: keep a cooling pack, small fan, or cold water bottle at your desk or in your bag. Plan your most public-facing activities for morning where possible, and build in a short reset (even 5 minutes of breathing outside) around 1–2pm.`,
      clinicalNote: isPrescriptionThreshold
        ? (isMorning
          ? `For severe morning sweating, a low-dose oral medication like glycopyrrolate is often recommended. It 'blocks the acetylcholine signal' throughout the body, and taking it the night before can help you wake up dry and confident.`
          : isNight
          ? `Frequent nocturnal sweating at HDSS 3+ requires a medical panel (thyroid, glucose) to rule out secondary causes. If it's primary, prescription anticholinergics can help by 'blocking the acetylcholine signal' that is firing during your sleep.`
          : `At this severity level, a dermatologist may recommend iontophoresis or prescription topicals (Sofdra, Qbrexza). These approaches work by 'blocking the acetylcholine signal' at the gland level to stop the sweating response.`)
        : (isMorning
          ? `For moderate morning episodes (HDSS 1-2), focus on the 4-7-8 Vagus Nerve reset and Aluminium Chloride 20% clinical-strength antiperspirant applied the night before. This combination targets both the nervous system 'start' signal and the physical exit point.`
          : `For HDSS 1-2 patterns, consistent use of Aluminium Chloride 20% and 4-7-8 breathing resets are recommended. If severity reaches HDSS 3, it signals that the nervous system signals are overdriving these first-line defenses.`),
    });
  }

  // ── INSIGHT D: Focal vs generalised pattern ───────────────────────────────
  if (total >= 3) {
    const multiPercent = Math.round((multiArea / total) * 100);
    const isFocal = multiPercent < 30;

    if (topArea) {
      const isPrescriptionThreshold = avgSev >= 3;
      insights.push({
        rank: 4,
        isPrescriptionThreshold,
        icon: <Wind className="h-3.5 w-3.5" />,
        rankColor: "bg-sky-400",
        label: isFocal
          ? `Focal pattern — ${topArea[0]} dominant (${Math.round(
              (topArea[1] / total) * 100
            )}%)`
          : `Widespread pattern — ${multiPercent}% of episodes affect 3+ areas`,
        sublabel: `${topArea[0]} appears in ${topArea[1]}/${total} episodes · ${
          isFocal ? "Focal pattern" : "Systemic trigger likely"
        }`,
        probability: isFocal ? 100 - multiPercent : multiPercent,
        probabilityLabel: isFocal
          ? `Your sweating is concentrated in specific areas — a typical primary hyperhidrosis pattern`
          : `${multiPercent}% of episodes are widespread — a systemic trigger is likely involved`,
        bar: "from-sky-400 to-blue-500",
        pill: "bg-sky-100 text-sky-700",
        pillText: isFocal ? "Focal" : "Widespread",
        detail: isFocal
          ? `Your sweating is concentrated in specific, defined areas — this is the classic pattern of primary hyperhidrosis. It means your sweat glands in those areas are receiving stronger-than-needed signals from your nervous system, while the rest of your body functions normally. This is actually reassuring: it confirms the problem is localised, which means targeted treatments (applied directly to those areas) tend to work well and have fewer side effects than treatments that affect your whole body.`
          : `When sweating affects three or more areas at the same time, it often points to a trigger that's affecting your whole system rather than just one area — heat, a hormonal shift, a food or drink, or stress that's running high enough to set everything off at once. It's worth looking at what's different about episodes where multiple areas are affected. Tracking that pattern can reveal a specific systemic trigger you haven't identified yet.`,
        action: isFocal
          ? `Focus your treatment on your primary area — ${topArea[0]}. Targeted approaches (topical antiperspirants, botulinum toxin, or iontophoresis for hands/feet) are more effective per side-effect than whole-body medications when the problem is localised.`
          : `During a widespread episode: get to a cool environment first (reduces the thermal component), then use a grounding or breathing technique (reduces the stress component). For future episodes, note: what did you eat in the 2 hours prior? Was it unusually hot? Were you under more stress than usual? Narrowing it down makes it manageable.`,
        clinicalNote: isPrescriptionThreshold
          ? (isFocal
            ? `For severe focal sweating, Botox injections or Sofdra are highly effective because they 'block the acetylcholine signal' specifically in ${topArea[0]}. This localized approach stops the sweating where it's most intense with minimal side effects.`
            : `For severe widespread episodes, oral anticholinergic medications (like glycopyrrolate) are the clinical standard. They 'block the acetylcholine signal' across your entire system, providing relief to all affected areas at once.`)
          : (isFocal
            ? `For focal sweating at this level, aluminium chloride 20% or iontophoresis (for hands/feet) are excellent starting points. These treatments focus on the 'hardware'—the sweat glands—to reduce output in your most affected areas.`
            : `Widespread moderate sweating suggests a systemic trigger. Identifying and managing these triggers (heat, stress) while using clinical-strength antiperspirants is the recommended first-line approach.`),
      });
    }
  }

  // ── INSIGHT E: High-severity cluster ──────────────────────────────────────
  if (highSevEps.length >= 2) {
    const highPercent = Math.round((highSevEps.length / total) * 100);
    insights.push({
      rank: 5,
      isPrescriptionThreshold: true,
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      rankColor: "bg-rose-500",
      label: `${highSevEps.length} high-severity episodes (4–5/5) logged`,
      sublabel: `${highPercent}% of total · avg HDSS ${(
        highSevEps.map(sev).reduce((a, b) => a + b, 0) / highSevEps.length
      ).toFixed(1)} · prescription threshold reached`,
      probability: highPercent,
      probabilityLabel: `${highPercent}% of your episodes meet clinical criteria for prescription treatment`,
      bar: "from-rose-400 to-red-500",
      pill: "bg-red-100 text-red-700",
      pillText: "Severity",
      detail: `${highSevEps.length} episodes at severity 4–5 puts you firmly in the range where prescription treatments aren't just an option — they're genuinely indicated. Medical guidelines describe this level as sweating that is "barely tolerable to intolerable and frequently to always getting in the way of daily life." Many GPs aren't aware of how many options now exist for this, which means patients at your severity often go years without the treatment they could access. You have the data to make a case.`,
      action: `Take your episode log to your next doctor's appointment. You can say directly: "I've been tracking my sweating episodes and I consistently score 4–5 out of 5 on severity. I'd like to discuss prescription treatment options — specifically botulinum toxin or topical anticholinergics." Having your data ready removes the guesswork from the appointment.`,
      clinicalNote: `Your logged data is objective evidence for treatment escalation. At HDSS 3-4, prescription options like Botox or Sofdra are indicated because they 'block the acetylcholine signal' at the gland level. Use HidroAlly's "Export for Clinician" feature to share this HDSS documentation with your dermatologist.`,
    });
  }

  return insights.slice(0, 4);
}

// ── Expanded detail drawer ────────────────────────────────────────────────────
const InsightDetail = ({ insight }: { insight: WarriorInsight }) => (
  <div className="mt-3 space-y-2.5 border-t border-gray-100 pt-3">
    {insight.isPrescriptionThreshold && (
      <div className="px-3 py-1.5 rounded-full bg-red-100 border border-red-200 w-fit mb-2">
        <p className="text-[10px] font-bold text-red-700 flex items-center gap-1.5">
          <AlertTriangle className="h-3 w-3" />
          Prescription Threshold Reached
        </p>
      </div>
    )}
    <div className="p-3 rounded-xl bg-violet-50 border border-violet-100">
      <p className="text-[10px] font-black text-violet-500 uppercase tracking-wide mb-1">
        Clinical Analysis: What This Means
      </p>
      <p className="text-xs text-violet-800 leading-relaxed">{insight.detail}</p>
    </div>
    <div className="p-3 rounded-xl bg-green-50 border border-green-100">
      <p className="text-[10px] font-black text-green-600 uppercase tracking-wide mb-1">
        What To Do
      </p>
      <p className="text-xs text-green-800 leading-relaxed">{insight.action}</p>
    </div>
    <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
      <p className="text-[10px] font-black text-blue-500 uppercase tracking-wide mb-1">
        Clinical Treatment Options
      </p>
      <p className="text-xs text-blue-800 leading-relaxed">
        {insight.clinicalNote}
      </p>
    </div>
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────
const PersonalizedInsights: React.FC<PersonalizedInsightsProps> = ({
  episodes,
}) => {
  const [expanded, setExpanded] = useState<number | null>(null);
  const insights = analyzeEpisodes(episodes);

  if (!insights.length) {
    return (
      <p className="text-xs text-gray-400 text-center py-4">
        Log at least 3 episodes to unlock personalised pattern analysis.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {insights.map((insight, i) => {
        const isOpen = expanded === i;
        return (
          <div key={i}>
            <button
              onClick={() => setExpanded(isOpen ? null : i)}
              className="w-full flex items-center gap-3 text-left"
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-white ${insight.rankColor}`}
              >
                {insight.icon}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-gray-800 truncate pr-2">
                    {insight.label}
                  </span>
                  <span className="text-[10px] text-gray-400 shrink-0">
                    {insight.sublabel.split("·")[0].trim()}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${insight.bar} transition-all duration-500`}
                    style={{ width: `${insight.probability}%` }}
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5 truncate">
                  {insight.probabilityLabel}
                </p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${insight.pill}`}
                >
                  {insight.pillText}
                </span>
                {isOpen ? (
                  <ChevronUp className="h-3.5 w-3.5 text-gray-400" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                )}
              </div>
            </button>

            {isOpen && <InsightDetail insight={insight} />}
          </div>
        );
      })}

      <p className="text-[10px] text-gray-400 text-center pt-1">
        Tap any insight to expand · Based on {episodes.length} logged episodes
      </p>
    </div>
  );
};

export default PersonalizedInsights;
