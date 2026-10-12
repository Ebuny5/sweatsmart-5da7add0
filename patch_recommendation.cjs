const fs = require('fs');
const filepath = 'src/components/recommendationEngine.ts';
let code = fs.readFileSync(filepath, 'utf8');

const oldBlock = `  if (currentStreak >= 3) {
    header = \`Sustained Clinical Remission: \${currentStreak} Consecutive Dry Days\`;
    clinicalAnalysis = "Consecutive asymptomatic days confirm effective intraductal eccrine occlusion and stabilized basal sympathetic tone. Your current clinical protocol is successfully counteracting hypothalamic sudomotor outflow (the nerve signals that trigger your sweat glands).";
    immediateRelief = [
      "Maintenance Protocol Titration: If you have maintained four or more consecutive dry days, discuss tapering topical application to a 2 to 3 night weekly maintenance schedule to protect skin barrier integrity.",
      "Epidermal Mantle Restoration: Apply ceramide-dominant, non-comedogenic moisturizers on off-nights to soothe micro-irritation and restore the acid mantle.",
      "Documenting Therapeutic Response: Consecutive dry days provide objective longitudinal evidence of treatment success for your clinical records."
    ];
  } else if (dryDaysLast7 >= 3) {
    const percentage = Math.round((dryDaysLast7 / 7) * 100);
    header = \`Partial Autonomic Control: \${dryDaysLast7} of Last 7 Days Dry (\${percentage}%)\`;
    clinicalAnalysis = "Your pattern demonstrates intermittent therapeutic responsiveness. Your treatment is successfully occluding sweat ducts on moderate-demand days, but may be overwhelmed during environmental or emotional surges.";
    immediateRelief = [
      "Audit Skin Dryness Before Application: Ensure the skin surface is bone-dry before applying nocturnal topicals, as moisture causes active formulations to hydrolyze and irritate rather than penetrate.",
      "Correlate Flare Conditions: Check previous logs to identify which specific environmental or stress factors breached your sweat threshold on wet days.",
      "Consult on Formulation Strength: If partial control persists after four weeks of consistent application, consult your physician about increasing topical concentration."
    ];
  } else {
    header = "Dry Baseline Reset: 1 Asymptomatic Day Documented";
    clinicalAnalysis = "Today demonstrates that your eccrine sweat glands are capable of achieving quiescence under current physiological conditions. This asymptomatic baseline indicates that your sympathovagal tone (calming nerve activity from your body's rest-and-digest system) remained below your sweating threshold.";
    immediateRelief = [
      "Maintain Protocol Adherence: Intermittent dry days require consistent adherence tonight. Prematurely skipping applications allows forming ductal plugs to dissolve.",
      "Hydration Equilibrium: Continue consistent oral hydration to support internal thermoregulation even in the absence of visible perspiration.",
      "Barrier Protection: Use non-irritating, gentle moisturizers during non-sweating windows to keep the epidermal barrier intact."
    ];
  }

  const greeting = userName ? \`Hi \${userName}, this is HidroAlly\` : "Hi, this is HidroAlly";

  return {
    emotionalOpener: \`\${greeting}. Great job tracking an asymptomatic day. Here is your clinical maintenance guidance.\`,
    clinicalAnalysis,
    immediateRelief,
    treatmentOptions: [
      "Maintain current therapeutic adherence. Continuity is essential to preserve ductal occlusion and autonomic suppression."
    ],
    lifestyleModifications: [
      "Continue logging both dry days and active episodes to provide objective evidence of therapeutic efficacy."
    ],
    medicalAttention: "No clinical red flags present today. Continue standard tracking.",`;

const newBlock = `  if (currentStreak >= 3) {
    header = \`Sustained Clinical Remission: \${currentStreak} Consecutive Dry Days\`;
    clinicalAnalysis = "Consecutive asymptomatic days confirm effective intraductal eccrine occlusion (physical plugging of the sweat pores) and stabilized basal sympathetic tone (the baseline resting activity of your involuntary nervous system). Your current clinical protocol is successfully counteracting hypothalamic sudomotor outflow (the nerve signals that command your sweat glands to release sweat). Whether achieved through clinical antiperspirants, prescription therapy, oral anticholinergics (medications that block sweating signals), or climate management, this session reflects effective therapeutic control.";
    immediateRelief = [
      "Maintenance Protocol Titration: If you have maintained four or more consecutive dry days, discuss tapering topical application to a 2 to 3 night weekly maintenance schedule to protect skin barrier integrity.",
      "Epidermal Barrier Recovery (Skin Mantle Care): On nights when you do not apply active treatments, apply a ceramide-rich, non-comedogenic moisturizer (a gentle lotion that does not clog pores) to your treated zones. This repairs your acid mantle (the delicate, acidic protective film on your skin's surface) and prevents irritation or flaking.",
      "Documenting Therapeutic Response: Consecutive dry days provide objective longitudinal evidence of treatment success for your clinical records."
    ];
  } else if (dryDaysLast7 >= 3) {
    const percentage = Math.round((dryDaysLast7 / 7) * 100);
    header = \`Partial Autonomic Control: \${dryDaysLast7} of Last 7 Days Dry (\${percentage}%)\`;
    clinicalAnalysis = "Your pattern demonstrates intermittent therapeutic responsiveness. Your treatment is successfully occluding sweat ducts on moderate-demand days, but may be overwhelmed during environmental or emotional surges.";
    immediateRelief = [
      "Audit Skin Dryness Before Application: Ensure the skin surface is bone-dry before applying nocturnal topicals, as moisture causes active formulations to hydrolyze and irritate rather than penetrate.",
      "Correlate Flare Conditions: Check previous logs to identify which specific environmental or stress factors breached your sweat threshold on wet days.",
      "Consult on Formulation Strength: If partial control persists after four weeks of consistent application, consult your physician about increasing topical concentration."
    ];
  } else {
    header = "Dry Baseline Reset: 1 Asymptomatic Day Documented";
    clinicalAnalysis = "Today demonstrates that your eccrine sweat glands are capable of achieving quiescence under current physiological conditions. This asymptomatic baseline indicates that your sympathovagal tone (calming nerve activity from your body's rest-and-digest system) remained below your sweating threshold.";
    immediateRelief = [
      "Maintain Protocol Adherence: Intermittent dry days require consistent adherence tonight. Prematurely skipping applications allows forming ductal plugs to dissolve.",
      "Hydration Equilibrium: Continue consistent oral hydration to support internal thermoregulation (your body's internal temperature balancing system) even in the absence of visible perspiration.",
      "Epidermal Barrier Recovery (Skin Mantle Care): Use non-irritating, gentle moisturizers during non-sweating windows to keep the epidermal barrier intact and protect your acid mantle (the delicate, acidic protective film on your skin's surface)."
    ];
  }

  const greeting = userName ? \`Hi \${userName}, this is HidroAlly\` : "Hi, this is HidroAlly";

  return {
    emotionalOpener: \`\${greeting}. Great job tracking an asymptomatic day. Here is your clinical maintenance guidance.\`,
    clinicalAnalysis,
    immediateRelief,
    treatmentOptions: [
      "Preserve Treatment Adherence: Do not abruptly abandon your regimen. Rebound diaphoresis (sudden, heavy return of sweating) frequently occurs when clinical topicals or iontophoresis regimens are stopped completely rather than gradually tapered into a maintenance schedule."
    ],
    lifestyleModifications: [
      "Audit & Replicate Your Environment: Take mental note of where you spent your day: your indoor temperature, air circulation (fans or air conditioning), clothing fabrics, and hydration levels. Replicating this microclimate (the layer of air directly surrounding your skin) on stressful or warm days will help prevent future flare-ups.",
      "Monitor for Compensatory Sweating: Check whether your body redirected heat dissipation to non-target zones (such as your lower back, chest, or thighs). Documenting whether other areas stayed dry helps confirm balanced full-body thermoregulation (your body's internal temperature balancing system)."
    ],
    medicalAttention: "No active flare-up or clinical red flags detected today. Continue recording dry days alongside flare-ups to demonstrate treatment efficacy during your next clinical appointment.",`;

code = code.replace(oldBlock, newBlock);
fs.writeFileSync(filepath, code);
