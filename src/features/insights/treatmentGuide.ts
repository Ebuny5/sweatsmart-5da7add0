/**
 * treatmentGuide.ts  (src/features/insights/treatmentGuide.ts)
 *
 * TREATMENT DISCUSSION GUIDE: options a patient can talk through with a
 * dermatologist. It never gives doses, strengths, schedules or "start this"
 * instructions. Order follows stepwise guidance for primary focal hyperhidrosis
 * (e.g. AAFP; Merck Manual): antiperspirant first, then iontophoresis for
 * hands/feet, botulinum toxin, topical anticholinergics, tablets, last-resort surgery.
 * Licensing and availability differ by country, so every option ends with a
 * question to ask. HAVE A DERMATOLOGIST REVIEW THIS TEXT BEFORE LAUNCH.
 */
export interface TreatmentOption { name: string; plain: string; ask: string }
export interface AreaGuide { cluster: string; title: string; intro: string; options: TreatmentOption[] }

const ANTIPERSPIRANT: TreatmentOption = {
  name: "Prescription-strength antiperspirant",
  plain: "A stronger version of the antiperspirant sold in shops, usually put on dry skin at night. It is often the first step.",
  ask: "Which product and strength suit my skin, and how long before we know if it works?",
};
const IONTO = (part: string): TreatmentOption => ({
  name: "Iontophoresis",
  plain: `Your ${part} rest in shallow water while a very mild electric current passes through. It reduces sweating for many people, but sessions must continue to keep the effect.`,
  ask: "Can I have sessions at a clinic, or use a home device? Is it safe with my health history?",
});
const BOTOX = (note: string): TreatmentOption => ({
  name: "Botulinum toxin injections",
  plain: `Tiny injections that block the nerve signal to the sweat glands. The effect wears off, so they are repeated. ${note}`,
  ask: "Is this available and affordable where I live, and how often would I need it?",
});
const TABLETS: TreatmentOption = {
  name: "Tablets that dampen the nerve signal",
  plain: "Medicines your doctor can prescribe if other options have not worked or several areas are affected. They can cause a dry mouth and other side effects, and are not suitable for everyone.",
  ask: "Are these safe with my health conditions, and in hot weather?",
};
const CAUSE_FIRST: TreatmentOption = {
  name: "A check for an underlying cause",
  plain: "Sweating on the chest, back, groin or thighs, or over the whole body, is first checked for causes such as medicines, thyroid, blood sugar or hormones. Treating the cause often helps most.",
  ask: "Which tests or medicine reviews should I have first?",
};

const MILD_ANTIPERSPIRANT: TreatmentOption = { ...ANTIPERSPIRANT, plain: "Often used on more sensitive skin too, but at a gentler strength, because strong products can irritate. Your dermatologist will choose what suits you." };
const TOPICAL_MEDICINE: TreatmentOption = {
  name: "Medicated cream or wipes",
  plain: "Products that block the nerve signal in the skin where they are used. For some areas they are used off-label, meaning outside the product's official approval, so ask your dermatologist.",
  ask: "Could a topical medicine like this work for this area, and how is it used safely?",
};
const NERVE_SURGERY: TreatmentOption = { name: "Nerve surgery (last resort)", plain: "An operation on the nerves that trigger sweating. It is considered only when everything else has failed, because it can cause new sweating in other parts of the body.", ask: "What are the risks, and who would do this safely near me?" };
const HEAT_TREATMENT: TreatmentOption = { name: "In-clinic heat treatments", plain: "Procedures that use energy to reduce the sweat glands under the arms. They are done by a trained clinician, and not every clinic offers them.", ask: "Is this offered near me, and what is the recovery like?" };
const WIPES: TreatmentOption = { name: "Medicated wipes or creams", plain: "Products that block the nerve signal in the skin where they are applied. Availability differs a lot between countries.", ask: "Is a product like this available here, and would it suit me?" };

/** One guide per area the patient actually logged (keys match canonArea). */
const G = (title: string, intro: string, options: TreatmentOption[]): AreaGuide => ({ cluster: title, title, intro, options });
export const AREA_GUIDES: Record<string, AreaGuide> = {
  palms: G("Palms", "For the palms, doctors usually start with an antiperspirant and often move to iontophoresis if that is not enough.", [ANTIPERSPIRANT, IONTO("hands"), BOTOX("Injections in the palms can be uncomfortable."), TABLETS, NERVE_SURGERY]),
  hands: G("Hands", "For the hands, the same first steps as for the palms are usually discussed.", [ANTIPERSPIRANT, IONTO("hands"), BOTOX("Injections in the hands can be uncomfortable."), TABLETS]),
  fingers: G("Fingers", "Sweating on the fingers is usually treated like palm sweating.", [ANTIPERSPIRANT, IONTO("hands"), BOTOX("Injections near the fingers can be uncomfortable."), TABLETS]),
  feet_soles: G("Feet & soles", "For the feet, the same first steps as for the hands are usually discussed.", [ANTIPERSPIRANT, IONTO("feet"), BOTOX("Injections in the soles can be uncomfortable."), TABLETS]),
  toes: G("Toes", "Sweating between the toes is usually treated like foot sweating.", [ANTIPERSPIRANT, IONTO("feet"), TABLETS]),
  underarms: G("Underarms", "Underarms have the widest choice of options, so it is worth asking what is available locally.", [ANTIPERSPIRANT, WIPES, BOTOX("It is one of the better-studied uses of this treatment."), HEAT_TREATMENT, TABLETS]),
  face: G("Face", "Facial skin is more sensitive than the skin elsewhere, so your dermatologist will usually choose gentler versions of treatments or a different route.", [MILD_ANTIPERSPIRANT, TOPICAL_MEDICINE, BOTOX("On the face, your doctor will explain the specific risks."), TABLETS]),
  face_scalp: G("Face & scalp", "Facial skin is sensitive, and the scalp has hair, so your dermatologist will choose products that suit each.", [MILD_ANTIPERSPIRANT, TOPICAL_MEDICINE, BOTOX("On the face and forehead, your doctor will explain the specific risks."), TABLETS]),
  scalp: G("Scalp", "The scalp has hair, so your dermatologist will choose products that work on hair-bearing skin.", [TOPICAL_MEDICINE, BOTOX("On the scalp and forehead, your doctor will explain the specific risks."), TABLETS]),
  head: G("Head", "Your dermatologist will choose gentler products for the skin of the head.", [TOPICAL_MEDICINE, BOTOX("Your doctor will explain the specific risks for this area."), TABLETS]),
  neck: G("Neck", "The skin of the neck is thin and can be sensitive.", [MILD_ANTIPERSPIRANT, TOPICAL_MEDICINE, TABLETS]),
  chest: G("Chest", "Sweating here is common in heat, so doctors usually look for causes first.", [CAUSE_FIRST, ANTIPERSPIRANT]),
  back: G("Back", "Sweating here is common in heat, so doctors usually look for causes first.", [CAUSE_FIRST, ANTIPERSPIRANT]),
  groin: G("Groin", "Sweating here is common in heat and from friction, so doctors usually look for causes first.", [CAUSE_FIRST, ANTIPERSPIRANT]),
  thighs: G("Thighs", "Sweating here is common in heat and from friction, so doctors usually look for causes first.", [CAUSE_FIRST, ANTIPERSPIRANT]),
  whole_body: G("Whole body", "Sweating all over the body is usually checked for a cause before any treatment is chosen.", [CAUSE_FIRST]),
};

export const TELL_YOUR_DERMATOLOGIST = [
  "If you are pregnant, breastfeeding or trying to conceive.",
  "Any heart rhythm problem, pacemaker or metal implant (this matters for iontophoresis).",
  "Glaucoma, trouble passing urine, constipation or an enlarged prostate (this matters for tablets).",
  "Every medicine and supplement you take.",
  "Hot climate or heavy outdoor work (some tablets reduce the body's cooling and can make heat harder to handle).",
  "Anything you have already tried, and how it went.",
];

export const GUIDE_SOURCES =
  "Based on stepwise guidance from the American Academy of Family Physicians and the Merck Manual. Licensing, availability and cost differ by country.";

export interface Guide {
  mode: "options" | "cause_first";
  tier: string; areas: AreaGuide[];
}
export function buildGuide(args: { areas: { key: string; label: string }[]; grade: number | null; lean: string }): Guide {
  const { areas, grade, lean } = args;
  if (lean === "check_cause") {
    return { mode: "cause_first", areas: [AREA_GUIDES.whole_body],
      tier: "Your logs have details worth checking for an underlying cause. A doctor will usually look for that first, before choosing a treatment." };
  }
  const logged = areas.filter(a => AREA_GUIDES[a.key]).slice(0, 4).map(a => AREA_GUIDES[a.key]);
  const tier = !grade ? "These are options to know about before a dermatologist visit."
    : grade >= 3 ? "At HDSS 3 or 4, sweating is getting in the way of daily life, which is when a dermatologist visit is worth booking."
    : "At this level, self-care and a standard antiperspirant are usually the first steps. These are options to know about in case it gets worse.";
  return { mode: "options", tier: logged.length ? `${tier} The options below are only for the areas you have logged.` : tier, areas: logged };
}
