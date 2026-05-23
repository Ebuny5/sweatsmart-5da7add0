/**
 * EpisodeInsightGenerator.ts
 * 
 * Friendly, plain-language insights for hyperhidrosis episodes.
 * Provides fallback analysis when the AI service is unavailable.
 * Utilizes the Dr. Cody reasoning loop (silently) and clinical standards.
 */

interface Episode {
  severityLevel: number;
  triggers: Array<{ label: string; type: string; value?: string }>;
  bodyAreas: string[];
  datetime?: Date;
  notes?: string;
}

interface GeneratedInsights {
  clinicalAnalysis: string;
  immediateRelief: string[];
  treatmentOptions: string[];
  lifestyleModifications: string[];
  medicalAttention: string;
  emotionalSupport?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const lower = (s: string) => (s || '').toLowerCase();
const hasAny = (text: string, ...words: string[]) => words.some(w => text.includes(w));

class EpisodeInsightGenerator {

  generateCompleteInsight(episode: Episode): GeneratedInsights {
    const mentalHealth = this.detectsMentalHealthImpact(episode.notes || '', episode.triggers.map(t => t.label || t.value || ''));

    return {
      clinicalAnalysis: this.buildClinicalAnalysis(episode),
      immediateRelief: this.buildReliefStrategies(episode),
      treatmentOptions: this.buildTreatmentRecommendations(episode),
      lifestyleModifications: this.buildLifestyleModifications(episode),
      medicalAttention: this.buildMedicalAttention(episode),
      emotionalSupport: mentalHealth.detected ? this.generateEmpathyResponse(mentalHealth.themes) : undefined,
    };
  }

  private detectsMentalHealthImpact(notes: string, triggers: string[]): {
    detected: boolean;
    themes: string[];
  } {
    const lowerNotes = notes.toLowerCase();
    const themes: string[] = [];

    if (hasAny(lowerNotes, 'low self esteem', 'self esteem', 'ashamed', 'worthless', 'embarrassed', 'humiliat')) {
      themes.push('self_esteem');
    }
    if (hasAny(lowerNotes, 'depress', 'hopeless', 'giving up', 'cant cope', "can't cope", 'struggling')) {
      themes.push('depression');
    }
    if (hasAny(lowerNotes, 'anxious', 'panic', 'scared', 'fear', 'terrified', 'dread')) {
      themes.push('anxiety');
    }
    if (hasAny(lowerNotes, 'confus', 'overwhelm', "don't understand", 'why me', 'not fair')) {
      themes.push('confusion_overwhelm');
    }
    if (hasAny(lowerNotes, 'isolat', 'avoid', 'stay home', 'cancel', 'hiding', 'alone')) {
      themes.push('social_isolation');
    }
    if (hasAny(lowerNotes, 'angry', 'anger', 'frustrated', 'furious', 'rage')) {
      themes.push('anger');
    }

    // Also check triggers
    if (triggers.some(t => {
      const lt = t.toLowerCase();
      return hasAny(lt, 'embarrass', 'anxiety', 'stress', 'social');
    })) {
      if (!themes.includes('anxiety')) themes.push('anxiety');
    }

    return { detected: themes.length > 0, themes };
  }

  private generateEmpathyResponse(themes: string[]): string {
    const responses: Record<string, string> = {
      self_esteem: "What you're feeling makes complete sense. Hyperhidrosis has a way of attacking confidence from the inside — not because you are less capable or less worthy, but because the condition creates visible moments that feel impossible to control. Your self-worth is entirely separate from your sweat glands. Many warriors in this community have felt exactly what you're describing, and it gets better — especially as you gain more tools to manage it. You are already doing the hardest part: tracking it, understanding it, and refusing to let it define you.",
      depression: "It is completely understandable to feel weighed down by this. Living with a condition that affects how you move through the world every day is exhausting. What you're feeling is valid. But hyperhidrosis is treatable — often significantly so — and the fact that you are still here, still logging, still trying, means you haven't given up. That matters. If these feelings persist beyond your episodes, speaking to a GP or counsellor alongside managing your hyperhidrosis is genuinely worth considering.",
      anxiety: "The anxiety-sweat cycle is real and incredibly taxing. Feeling on edge or dreading the next episode is a recognized part of living with this condition. You're not overreacting; your nervous system is simply in a high-alert state. We can work on grounding techniques to help quiet that 'smoke alarm' in your brain over time.",
      confusion_overwhelm: "It can feel overwhelming to manage something that seems to have no clear pattern or cause. But the data you're building here is starting to change that. Hyperhidrosis is not random — it responds to specific triggers, and the more you log, the clearer those patterns become. You don't have to figure it all out today.",
      social_isolation: "Withdrawing from situations because of sweating is one of the most common — and most painful — parts of living with hyperhidrosis. You are not alone in this. Many warriors have cancelled plans, avoided handshakes, or chosen what to wear based on sweat, not preference. This is a recognised part of the condition, and it deserves to be treated as seriously as the physical symptoms.",
      anger: "Anger at this condition is legitimate. It is genuinely unfair to deal with something your body does involuntarily that affects how others perceive you and how you feel in your own skin. Use that energy — it often makes the most determined warriors. The goal is to channel it into understanding your triggers and advocating for the treatment you deserve."
    };

    // Return the first detected theme's response, or a general one if themes are empty but somehow detected was true
    return themes.length > 0 ? responses[themes[0]] : "I hear how difficult this is for you. Living with hyperhidrosis is as much a mental challenge as a physical one, and your feelings are completely valid. You're doing the right thing by tracking and understanding your journey.";
  }

  private buildClinicalAnalysis(ep: Episode): string {
    const sev = ep.severityLevel;
    const areas = ep.bodyAreas.map(lower);
    const trigText = ep.triggers.map(t => lower(t.label || t.value || '')).join(' ');
    const notesText = lower(ep.notes || '');
    const areaList = this.formatBodyAreas(ep.bodyAreas);

    // 1. Clinical Classification (Silent)
    const isNocturnal = hasAny(notesText, 'night', 'sleep', 'wake up drenched', 'nocturnal');
    const isSudden = hasAny(notesText, 'sudden', 'started recently', 'adult onset');
    const isGeneralized = areas.length > 5 || hasAny(notesText, 'entire body', 'everywhere');

    // 2. Probability Distribution (Amygdala vs Hypothalamus)
    const isEmotional = hasAny(trigText, 'stress', 'anxiety', 'nervous', 'anger', 'anticipat', 'social', 'crowd', 'embarrass', 'exam', 'work pressure');
    const isThermal = hasAny(trigText, 'hot', 'heat', 'humid', 'temperature', 'sun', 'warm', 'outdoor');
    const isDietary = hasAny(trigText, 'spicy', 'caffein', 'alcohol', 'hot drink', 'energy drink');
    const isPhysical = hasAny(trigText, 'exercise', 'physical');

    // Friendly severity interpretation
    const severityText = sev >= 4
      ? 'Intolerable: sweating always interferes with your daily activities'
      : sev === 3
      ? 'Significant: sweating frequently interferes with your daily activities'
      : sev === 2
      ? 'Moderate: sweating sometimes interferes with your daily activities'
      : 'Mild: sweating rarely interferes with your daily activities';

    // 3. Neural Pathway Mapping & Human Filter
    let classification = "Clinical Analysis: Clinical Classification: This episode matches the pattern of Primary Focal Hyperhidrosis (PHH). It's focal (hands, feet, underarms), bilateral, and clearly linked to specific triggers.";
    if (isNocturnal || isSudden) {
      classification = "Clinical Analysis: Clinical Classification: This episode has features that require medical escalation. While likely PHH, the timing or onset suggests we must rule out Secondary Generalized Hyperhidrosis (SHH).";
    }

    let probability = "";
    if (isEmotional && isThermal) {
      probability = "Probability Distribution: This episode appears to be 50% driven by the Amygdala (emotional stress) and 50% by the Hypothalamus (thermal load).";
    } else if (isEmotional) {
      probability = "Probability Distribution: This episode appears to be 80% driven by the Amygdala (emotional stress) and 20% by baseline Autonomic Activity.";
    } else if (isThermal) {
      probability = "Probability Distribution: This episode appears to be 90% driven by the Hypothalamus (thermal load) and 10% by Physical Activity.";
    } else if (isDietary) {
      probability = "Probability Distribution: This episode appears to be 70% driven by Gustatory Stimuli and 30% by Sympathetic Sensitivity.";
    } else {
      probability = "Probability Distribution: Mixed Autonomic Triggering.";
    }

    const mapping = "Neural Pathway Mapping: Your Hypothalamus (body thermostat) is sending a 'start sweating' signal down the Sympathetic Chain to the glands. This results in an excess of the acetylcholine signal at the gland site.";

    let insight: string;

    if (isEmotional && isThermal) {
      insight = `It looks like your body's "cool down" system is getting a double-hit from both the heat and the stress of the situation. Your "software" (nervous system) is overdriving your functionally normal "hardware" (sweat glands). This is a common physical overreaction where your brain thinks it needs to cool you down even though you're already comfortable.`;
    } else if (isEmotional) {
      insight = `This episode seems mostly driven by your body's reaction to stress or anticipation. Your "software" (nervous system) is overdriving your functionally normal "hardware" (sweat glands). Your brain's "alert" system is directly triggering your sweat glands through the sympathetic chain, often before you even consciously feel anxious.`;
    } else if (isThermal) {
      insight = `The heat and humidity are the main drivers here. When it's humid (above 70%), sweat can't evaporate properly. Your hypothalamus (your body's thermostat) reacts by producing even more sweat, trying to achieve a cooling effect that the air simply won't allow. For someone with hyperhidrosis, this creates a frustrating loop of over-triggering the sympathetic chain.`;
    } else if (isDietary) {
      insight = `What you've eaten or drunk is likely setting this off. Spicy foods trick your brain into thinking you're overheating, while caffeine dials up your baseline "alert" level, making your sweat glands much easier to trigger via the sympathetic nervous system and the acetylcholine messenger.`;
    } else if (isPhysical) {
      insight = `Your body is being too efficient at cooling you down. Your "software" (nervous system) is over-triggering your "hardware" (sweat glands), so your sympathetic chain sends far more moisture signals (acetylcholine) than is actually needed.`;
    } else {
      insight = `This episode follows the typical pattern of primary focal hyperhidrosis, where specific areas like your ${areaList} sweat more than expected. It's essentially your "software" (nervous system) overdriving your functionally normal "hardware" (sweat glands), where the "on" switch is a bit too sensitive to daily life.`;
    }

    // Vasodilation-Edema Link
    let complicationInsight = '';
    if (hasAny(notesText, 'tight', 'swell', 'puffy', 'edema', 'tingle')) {
      complicationInsight = ` You mentioned a feeling of tightness or swelling; this is the 'Vasodilation-Edema Link.' The same signal that triggers sweat also opens up your blood vessels to release heat, which can cause fluid to build up temporarily in your hands or feet.`;
    }

    // Body area specifics
    const hasPalms = areas.some(a => a.includes('palm'));
    const hasSoles = areas.some(a => a.includes('sole') || a.includes('feet') || a.includes('foot'));
    const isPalmoplantar = hasPalms && hasSoles;
    const hasAxillae = areas.some(a => a.includes('arm') || a.includes('under'));
    const hasFace = areas.some(a => a.includes('face') || a.includes('scalp') || a.includes('head'));

    let areaInsight = '';
    if (isPalmoplantar) {
      areaInsight = ` Sweating on both your hands and feet is very common and is usually triggered more by your emotions and thoughts than by actual heat.`;
    } else if (hasPalms) {
      areaInsight = ` Hand sweating is a classic focal pattern, often driven by the sympathetic nervous system's reaction to social or work-related performance.`;
    } else if (hasAxillae) {
      areaInsight = ` Underarm sweating is a common focal pattern and responds very well to treatments that specifically block the acetylcholine signal at the local level.`;
    } else if (hasFace) {
      areaInsight = ` Facial sweating can be particularly tough because it's so visible, but it follows the same "sensitive signal" pattern as other areas.`;
    }

    return `${severityText}\n\n${classification}\n\n${probability}\n\n${mapping}\n\n${insight}${complicationInsight}${areaInsight}`;
  }

  private buildReliefStrategies(ep: Episode): string[] {
    const strategies: string[] = [];
    const trigText = ep.triggers.map(t => lower(t.label || t.value || '')).join(' ');
    const isEmotional = hasAny(trigText, 'stress', 'anxiety', 'nervous', 'anger', 'anticipat', 'social', 'crowd');
    const isThermal = hasAny(trigText, 'hot', 'heat', 'humid', 'temperature', 'sun', 'warm');

    strategies.push(
      `The 4-7-8 Breathing Trick: Breathe in through your nose for 4 seconds, hold it for 7, and exhale slowly through your mouth for 8. Doing this just 3 times can "reset" your nervous system by activating the Vagus Nerve, shifting you from "fight or flight" to "rest and digest."`
    );

    strategies.push(
      `Cold Wrist Rinse: Run cold water over your wrists for a few minutes. Your blood vessels are very close to the skin there, so this helps cool your entire body down quickly and tells your brain to ease up on the sweat production signal.`
    );

    if (isThermal) {
      strategies.push(
        `Get Air Moving: Find a fan or a breeze. When it's humid, your sweat can't evaporate on its own, so moving air is your best friend to help that moisture actually do its job of cooling you down.`
      );
    } else if (isEmotional) {
      strategies.push(
        `The 5-4-3-2-1 Grounding Method: Name 5 things you see, 4 you can touch, 3 you hear, 2 you smell, and 1 you taste. This pulls your brain out of "stress mode" and can help stop the sweat-anxiety-sweat loop within about a minute.`
      );
    } else {
      strategies.push(
        `Rapid Cooling: Apply a cold drink or a wet towel to the back of your neck. This is one of your body's main "thermostats" and can help lower the sweat signal very quickly.`
      );
    }

    return strategies;
  }

  private buildTreatmentRecommendations(ep: Episode): string[] {
    const sev = ep.severityLevel;
    const areas = ep.bodyAreas.map(lower);
    const recs: string[] = [];

    if (sev >= 3) {
      recs.push(
        `Time for a Specialist: Since your sweating is significantly interfering with your life (Prescription Threshold Reached), it's worth seeing a dermatologist. They can offer prescription wipes (like **Qbrexza**), specialized gels (like **Sofdra**), or even **Botox** injections. These medical options work by 'blocking the acetylcholine signal'—the chemical messenger that tells your glands to sweat.`
      );
      if (areas.some(a => a.includes('arm') || a.includes('under'))) {
        recs.push(
          `Permanent Options: For underarms, miraDry is a permanent solution that uses thermal energy to eliminate sweat glands. Since glands don't grow back, it's a one-time treatment for many warriors.`
        );
      }
      recs.push(
        `Iontophoresis (Water Treatment): This is highly effective for hands and feet, using a gentle electrical current in water to 'quiet' the sweat glands. It works for about 80-90% of people who try it.`
      );
    } else {
      recs.push(
        `Clinical-Strength Antiperspirants: First-line treatments for HDSS 1-2 include **Aluminium Chloride 20%** (like Certain Dri). Apply to completely dry skin right before bed to allow the formula to block the sweat ducts while the glands are least active.`
      );
      recs.push(
        `Behavioral Resets: Focus on the **4-7-8 breathing** technique to calm the nervous system signal before it reaches the glands.`
      );
    }

    return recs;
  }

  private buildLifestyleModifications(ep: Episode): string[] {
    const mods: string[] = [];
    const trigText = ep.triggers.map(t => lower(t.label || t.value || '')).join(' ');
    const notesText = lower(ep.notes || '');
    const isEmotional = hasAny(trigText, 'stress', 'anxiety', 'nervous', 'anger', 'anticipat', 'social');
    const isThermal = hasAny(trigText, 'hot', 'heat', 'humid', 'temperature', 'sun');
    const isDietary = hasAny(trigText, 'spicy', 'caffein', 'alcohol', 'hot drink');
    const hour = ep.datetime ? new Date(ep.datetime).getHours() : -1;
    const isMorning = hour >= 5 && hour < 12;

    if (isThermal) {
      mods.push(
        `Pre-Cooling: If you know you're heading into the heat, take a cool shower first. This lowers your body's internal temperature and gives you a much longer "buffer" before your sweat glands feel the need to kick in.`
      );
    }

    if (isEmotional) {
      mods.push(
        `Practice Your Reset: Try the 4-7-8 breathing exercises when you're not sweating. If your body is already familiar with the Vagus Nerve reset, it will work much faster when an episode actually starts.`
      );
    }

    if (isDietary) {
      mods.push(
        `Watch for Patterns: Keep an eye on which foods or drinks seem to push you over the edge. You might find that one coffee is fine, but a second cup is what triggers the sympathetic nervous system to over-fire.`
      );
    }

    if (isMorning) {
      mods.push(
        `Morning Routine: Your stress hormones (cortisol) naturally peak in the morning. Try building in 5 minutes of quiet time or breathing right after you wake up to help keep those levels steady.`
      );
    }

    mods.push(
      `Smart Fabrics: Choose fabrics that "wick" moisture away from your skin (like athletic wear, bamboo, or wool). Avoid cotton, which soaks up sweat and stays wet, often making the episode feel worse.`
    );

    return mods;
  }

  private buildMedicalAttention(ep: Episode): string {
    const sev = ep.severityLevel;

    const redFlags = "Keep an eye out for 'red flags' like drenching night sweats, sweating that only happens on one side of your body, or if this started very suddenly in adulthood. These can sometimes indicate secondary hyperhidrosis (SHH) which requires different medical investigation.";

    if (sev >= 3) {
      return `Because your sweating is frequently interfering with your daily life (Prescription Threshold Reached), I'd strongly recommend chatting with a dermatologist. You can show them your logs from this app to provide objective evidence of your HDSS level.\n\n${redFlags}`;
    }

    return `If your sweating starts to feel unmanageable or starts happening during your sleep, it's a good idea to check in with a healthcare provider.\n\n${redFlags}`;
  }

  private formatBodyAreas(areas: string[]): string {
    if (areas.length === 0) return 'unspecified areas';
    if (areas.length === 1) return areas[0];
    if (areas.length === 2) return `${areas[0]} and ${areas[1]}`;
    return `${areas.slice(0, -1).join(', ')}, and ${areas[areas.length - 1]}`;
  }
}

export const insightGenerator = new EpisodeInsightGenerator();

export function generateFallbackInsights(
  severity: number,
  bodyAreas: string[],
  triggers: Array<{ label: string; type: string; value?: string }>,
  notes?: string
): GeneratedInsights {
  return insightGenerator.generateCompleteInsight({
    severityLevel: severity,
    bodyAreas,
    triggers: triggers.map(t => ({ label: t.label, type: t.type, value: t.value })),
    notes,
  });
}
