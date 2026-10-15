/**
 * clinicalReportPdf.ts  (src/features/insights/clinicalReportPdf.ts)
 *
 * ONE clinical report, used everywhere:
 *   - HidroAlly chat "Report" button  -> downloadClinicalReport({...})
 *   - Insights page "Download report" -> downloadClinicalReport({...})
 * Content is built from the same shared analytics as the Insights page, so the
 * numbers cannot disagree. Everything is code-generated (no AI text), HDSS is a
 * whole grade, and treatments appear only as a discussion guide for a dermatologist.
 */
import jsPDF from "jspdf";
import { hdssRound, TRIGGER_INDEX, type UserProfileInput } from "./insightEngine";
import { buildInsightsViewModel, episodeTime, typicalText, plain, type InsightsVM } from "./insightsAnalytics";
import { buildGuide, GUIDE_SOURCES, TELL_YOUR_DERMATOLOGIST, type Guide } from "./treatmentGuide";

// ───────────────────────────── Content ─────────────────────────────
export interface PatientInfo { name: string; age?: number | string | null; sex?: string | null; country?: string | null; diagnosis?: string | null }
export interface ReportContent {
  patient: PatientInfo; reportDate: string; reportId: string; period: string;
  flareCount: number; dryCount: number; severityProfile: string; status: string;
  summary: string[]; reviewPoints: string[];
  triggerRows: string[][]; triggerNote: string;
  timeTitle: string; timeRows: string[][]; timeNote: string;
  areaRows: string[][];
  selfCare: string[];
  guide: Guide; tell: string[]; sources: string;
  clinician: { facts: string[]; notCaptured: string[]; discuss: string[] };
}

const KIND_LABEL: Record<string, string> = {
  thermal: "Environmental", emotional: "Emotional", physical: "Lifestyle / physical", systemic: "Medication / health", none: "No clear trigger",
};
const AREA_MEDICAL: Record<string, string> = {
  head_neck: "craniofacial", hands: "palmar", feet: "plantar", underarms: "axillary", torso: "truncal", groin_thighs: "inguinal / thigh", all: "generalized",
};
const fmtDate = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const pc = (x: number) => `${Math.round(x * 100)}%`;
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export function patientFromProfile(p: any, user?: any): PatientInfo {
  return {
    name: p?.display_name ?? p?.full_name ?? p?.name ?? (user?.email ? String(user.email).split("@")[0] : "Patient"),
    age: p?.age ?? null, sex: p?.biological_sex ?? p?.sex ?? null, country: p?.country ?? null, diagnosis: p?.diagnosis ?? p?.hyperhidrosis_type ?? null,
  };
}
export const declaredTypeFrom = (d?: string | null): UserProfileInput["declaredType"] =>
  /primary/i.test(d || "") ? "primary" : /secondary/i.test(d || "") ? "secondary" : "unsure";

export function buildReportContent(args: { rows: any[]; patient: PatientInfo; profile?: UserProfileInput; now?: Date }): ReportContent {
  const now = args.now ?? new Date();
  const profile: UserProfileInput = { declaredType: declaredTypeFrom(args.patient.diagnosis), ...(args.profile || {}) };
  const rows = args.rows || [];
  const vm: InsightsVM = buildInsightsViewModel(rows, profile, now);
  const flare = rows.filter(r => !r.is_dry_day);
  const dated = rows.map(r => ({ r, t: episodeTime(r) })).filter(x => x.t) as { r: any; t: Date }[];
  const first = dated.length ? new Date(Math.min(...dated.map(x => x.t.getTime()))) : now;
  const last = dated.length ? new Date(Math.max(...dated.map(x => x.t.getTime()))) : now;
  const grades = flare.map(r => Number(r.severity)).filter(Boolean);
  const severe = grades.length ? grades.filter(g => g >= 3).length / grades.length : 0;
  const typ = typicalText(vm);
  const g = vm.typical ?? 0;
  const status = !g ? "Not enough severity data yet."
    : g >= 3 ? `Significant impact on daily life (HDSS ${g}). Dermatology review recommended.`
    : `Mild to moderate impact (HDSS ${g}). Self-care focus. Review with a doctor if it worsens.`;

  // summary
  const top3 = vm.areas.slice(0, 3).map(a => `${a.label} (${pc(a.share)})`).join(", ") || "not recorded";
  const reading = vm.pattern.confidence === "none" ? "not enough logs for a reading yet"
    : `${vm.pattern.title.replace(/\s*\(.*\)$/, "")} (${vm.pattern.confidence} confidence)`;
  const summary = [
    `Patient-reported diagnosis: ${args.patient.diagnosis || "not stated"}. HidroAlly pattern reading: ${reading}.`,
    `Most affected areas: ${top3}. ${typ} across ${vm.n} logged episodes.`,
  ];
  const wholeBody = vm.areas.find(a => a.cluster === "all");
  const nightShare = vm.windows.find(w => w.key === "night")?.share ?? 0;
  const reviewPoints: string[] = [];
  if (wholeBody) reviewPoints.push(`${pc(wholeBody.share)} of episodes were logged as whole-body sweating, which is worth clinical review for a secondary cause.`);
  if (vm.timedCount >= 6 && nightShare >= 0.2) reviewPoints.push(`${pc(nightShare)} of timed episodes were logged between 9 PM and 5 AM. Please ask about sweating during sleep.`);
  vm.pattern.flags.filter(f => !/entire body/i.test(f)).forEach(f => { const t = plain(f); if (!reviewPoints.some(x => x.toLowerCase().includes(t.slice(0, 25).toLowerCase()))) reviewPoints.push(`Patient profile: ${t}.`); });

  // triggers
  const triggerRows = vm.triggers.slice(0, 6).map(t => [t.label, `${t.count} (${pc(t.share)})`, `HDSS ${t.typical}`, KIND_LABEL[TRIGGER_INDEX[t.id]?.kind ?? ""] || "User-added"]);
  const triggerNote = vm.leader
    ? `${vm.leader.label} is the most consistently logged trigger (${pc(vm.leader.share)} of episodes). Logged triggers show association, not proof of cause.`
    : "No single trigger clearly leads in these logs. Logged triggers show association, not proof of cause.";

  // temporal: weekly if short, monthly if long, whole period either way
  const spanDays = Math.floor((last.getTime() - first.getTime()) / 864e5);
  const timeRows: string[][] = [];
  const dryOf = (a: Date, b: Date) => rows.filter(r => r.is_dry_day).filter(r => { const t = episodeTime(r); return t && t >= a && t < b; }).length;
  const epsIn = (a: Date, b: Date) => flare.filter(r => { const t = episodeTime(r); return t && t >= a && t < b; });
  const row = (label: string, a: Date, b: Date) => {
    const e = epsIn(a, b).map(r => Number(r.severity)).filter(Boolean); const d = dryOf(a, b);
    timeRows.push([label, e.length ? String(epsIn(a, b).length) : "No episodes", e.length ? `HDSS ${hdssRound(mean(e))}` : "-", String(d)]);
  };
  let timeTitle = "Month";
  if (spanDays > 84) {
    for (let d = new Date(first.getFullYear(), first.getMonth(), 1); d <= last; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
      row(d.toLocaleDateString("en-GB", { month: "short", year: "numeric" }), d, new Date(d.getFullYear(), d.getMonth() + 1, 1));
    }
  } else {
    timeTitle = "Week starting";
    for (let d = new Date(first); d <= last; d = new Date(d.getTime() + 7 * 864e5)) row(fmtDate(d), d, new Date(d.getTime() + 7 * 864e5));
  }
  const timeNote = vm.peak ? `Time of day: ${pc(vm.peak.share)} of timed episodes fell in the ${vm.peak.short.toLowerCase()}.`
    : vm.timedCount < 6 ? "Time of day: not enough timed episodes to show a pattern." : "Time of day: no window clearly stands out.";

  // areas
  const areaRows = vm.areas.map(a => [a.label, AREA_MEDICAL[a.cluster] || "", pc(a.share)]);

  // self-care from the strategy library (top triggers)
  const selfCare: string[] = [];
  vm.triggers.filter(t => t.id !== "no_clear_trigger").slice(0, 3).forEach(t => {
    const def = TRIGGER_INDEX[t.id]; if (def) selfCare.push(`${t.label}: ${plain(def.lifestyle[0])}`);
  });
  selfCare.push("If a prescription or clinical-strength topical is already in use, moisturise treated areas on non-treatment nights to protect the skin barrier.");

  const guide = buildGuide({ clusters: vm.clusters, grade: vm.typical, lean: vm.pattern.lean });

  const facts = [
    `${vm.n} flare-up episodes and ${vm.dry.total} dry days logged between ${fmtDate(first)} and ${fmtDate(last)}.`,
    `${typ}. HDSS 3 or 4 in ${pc(severe)} of episodes.`,
    `Areas: ${vm.areas.slice(0, 5).map(a => `${a.label} ${pc(a.share)}`).join("; ") || "not recorded"}.`,
    `Most logged triggers: ${vm.triggers.slice(0, 4).map(t => `${t.label} ${pc(t.share)}`).join("; ") || "none recorded"}.`,
    `Pattern reading (from logs only): ${reading}.`,
    ...reviewPoints,
  ];
  const notCaptured = ["Age when sweating started", "Family history of heavy sweating", "Regular medicines, supplements and health conditions", "Pregnancy or breastfeeding status", "Treatments already tried and their results", "Sweating during sleep (only inferred from logged times)"];
  const discuss = guide.areas.map(a => `${a.title}: ${a.options.map(o => o.name).join("; ")}.`);

  return {
    patient: args.patient, reportDate: fmtDate(now), reportId: `HA-${Math.floor(now.getTime() / 1000).toString(36).toUpperCase()}`,
    period: dated.length ? `${fmtDate(first)} to ${fmtDate(last)}` : "No dated entries",
    flareCount: vm.n, dryCount: vm.dry.total, severityProfile: typ, status, summary, reviewPoints, triggerRows, triggerNote,
    timeTitle, timeRows, timeNote, areaRows, selfCare, guide, tell: TELL_YOUR_DERMATOLOGIST, sources: GUIDE_SOURCES,
    clinician: { facts, notCaptured, discuss },
  };
}

// ───────────────────────────── PDF renderer ─────────────────────────────
const clean = (s: string) => String(s ?? "")
  .replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/[\u2013\u2014]/g, "-").replace(/\u2026/g, "...")
  .replace(/[^\x20-\x7E\u00A0-\u00FF\n]/g, "");
const PURPLE: [number, number, number] = [109, 40, 217], INK: [number, number, number] = [28, 28, 40], GREY: [number, number, number] = [110, 110, 125];
const TEAL: [number, number, number] = [15, 118, 110], BOX: [number, number, number] = [240, 236, 255], AMBER: [number, number, number] = [255, 243, 205];
const W = 595.28, H = 841.89, M = 42, CW = W - 2 * M, TOP = 92, BOTTOM = 70;

export function renderClinicalReport(c: ReportContent): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  let y = TOP;
  const header = (first: boolean) => {
    doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(...PURPLE).text("GIFTOVATE THERAPEUTICS LTD", M, 38);
    doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(...GREY).text("HidroAlly - Hyperhidrosis Management Platform", M, 51);
    doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(...INK).text("CONFIDENTIAL CLINICAL SUMMARY", W - M, 38, { align: "right" });
    doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(...GREY)
      .text(`Report date: ${c.reportDate}`, W - M, 51, { align: "right" }).text(`Report ID: ${c.reportId}`, W - M, 62, { align: "right" });
    if (first) doc.text("Generated by HidroAlly Clinical Intelligence", W - M, 73, { align: "right" });
    doc.setDrawColor(225, 225, 235).line(M, 80, W - M, 80);
  };
  const newPage = () => { doc.addPage(); header(false); y = TOP; };
  const need = (h: number) => { if (y + h > H - BOTTOM) newPage(); };
  const lines = (t: string, w: number, size: number, bold = false) => { doc.setFont("helvetica", bold ? "bold" : "normal").setFontSize(size); return doc.splitTextToSize(clean(t), w) as string[]; };
  const para = (t: string, o: { size?: number; bold?: boolean; color?: [number, number, number]; indent?: number; gap?: number } = {}) => {
    const size = o.size ?? 10, lh = size * 1.4, x = M + (o.indent ?? 0), ls = lines(t, CW - (o.indent ?? 0), size, o.bold);
    ls.forEach(l => { need(lh); doc.setFont("helvetica", o.bold ? "bold" : "normal").setFontSize(size).setTextColor(...(o.color ?? INK)).text(l, x, y + size); y += lh; });
    y += o.gap ?? 4;
  };
  const section = (t: string) => { need(60); y += 10; para(t, { size: 12, bold: true, color: INK, gap: 6 }); };
  const bullets = (items: string[], indent = 10) => items.forEach(t => {
    const ls = lines(t, CW - indent - 10, 10), lh = 14;
    need(lh * Math.min(ls.length, 2));
    doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(...INK).text("-", M + indent - 8, y + 10);
    ls.forEach(l => { need(lh); doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(...INK).text(l, M + indent + 4, y + 10); y += lh; });
    y += 3;
  });
  const banner = (t: string, fill: [number, number, number], ink: [number, number, number] = INK) => {
    const ls = lines(t, CW - 20, 9.5, true), h = ls.length * 13 + 14; need(h + 6);
    doc.setFillColor(...fill).roundedRect(M, y, CW, h, 6, 6, "F");
    ls.forEach((l, i) => doc.setFont("helvetica", "bold").setFontSize(9.5).setTextColor(...ink).text(l, M + 10, y + 16 + i * 13));
    y += h + 8;
  };
  const table = (head: string[], body: string[][], widths: number[]) => {
    const colX = widths.reduce<number[]>((a, w, i) => { a.push(i ? a[i - 1] + widths[i - 1] : M); return a; }, []);
    need(26); doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(...GREY);
    head.forEach((h, i) => doc.text(clean(h), colX[i], y + 9)); y += 16; doc.setDrawColor(225, 225, 235).line(M, y - 2, W - M, y - 2);
    body.forEach(r => {
      const cells = r.map((t, i) => lines(t, widths[i] - 8, 10)), h = Math.max(...cells.map(x => x.length)) * 13 + 7; need(h);
      cells.forEach((ls, i) => ls.forEach((l, k) => doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(...INK).text(l, colX[i], y + 9 + k * 13)));
      y += h;
    });
    y += 4;
  };

  header(true);
  // patient box
  const p = c.patient; const meta = [p.age ? `${p.age} years` : "", p.sex || "", p.country || ""].filter(Boolean).join(", ");
  const boxLines = [`Patient: ${p.name}${meta ? `  (${meta})` : ""}`, `Report period: ${c.period}`, `Episodes logged: ${c.flareCount} flare-ups, ${c.dryCount} dry days`, `Severity profile: ${c.severityProfile}`];
  const bh = boxLines.length * 15 + 40;
  doc.setFillColor(...BOX).roundedRect(M, y, CW, bh, 8, 8, "F");
  boxLines.forEach((l, i) => doc.setFont("helvetica", i === 0 ? "bold" : "normal").setFontSize(10).setTextColor(...INK).text(clean(l), M + 14, y + 20 + i * 15));
  doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(...INK).text(clean(`Clinical status: ${c.status}`), M + 14, y + 20 + boxLines.length * 15 + 4, { maxWidth: CW - 28 });
  y += bh + 6;

  section("SECTION 1: SUMMARY");
  c.summary.forEach(s => para(s));
  if (c.reviewPoints.length) { para("Points worth clinical review:", { bold: true, gap: 2 }); bullets(c.reviewPoints); }

  section("SECTION 2: TRIGGERS");
  table(["Trigger", "Episodes (%)", "Typical HDSS", "Type"], c.triggerRows, [190, 110, 100, CW - 400]);
  para(c.triggerNote, { size: 9.5, color: GREY });

  section("SECTION 3: TEMPORAL PATTERN");
  table([c.timeTitle, "Episodes", "Typical HDSS", "Dry days"], c.timeRows, [170, 130, 110, CW - 410]);
  para(c.timeNote, { size: 9.5, color: GREY });

  section("SECTION 4: AFFECTED AREAS");
  table(["Area", "Medical term", "Share of episodes"], c.areaRows.map(r => [r[0], r[1] ? `${r[1]} hyperhidrosis` : "", r[2]]), [190, 190, CW - 380]);

  section("SECTION 5: SELF-CARE FROM THE PATIENT'S TRIGGERS");
  bullets(c.selfCare);

  section("SECTION 6: TREATMENT DISCUSSION GUIDE");
  banner("For discussion with a dermatologist. Not for self-treatment. AI-generated from the patient's logs. These are options to talk through, not prescriptions.", AMBER);
  para(c.guide.tier);
  const shown = new Set<string>();
  c.guide.areas.forEach(a => {
    need(60); para(a.title, { size: 11, bold: true, color: TEAL, gap: 2 }); para(a.intro, { size: 9.5, color: GREY, gap: 3 });
    const repeats = a.options.filter(o => shown.has(o.name));
    a.options.filter(o => !shown.has(o.name)).forEach((o, i) => {
      shown.add(o.name); need(60);
      para(`${i + 1}. ${o.name}`, { bold: true, gap: 0, indent: 6 }); para(plain(o.plain), { indent: 16, gap: 1 }); para(`Ask: ${o.ask}`, { size: 9.5, color: TEAL, indent: 16, gap: 5 });
    });
    if (repeats.length) para(`Also discussed for this area (explained above): ${repeats.map(o => o.name).join("; ")}.`, { size: 9.5, color: GREY, indent: 6 });
  });
  need(80);
  para("The patient should tell the dermatologist:", { bold: true, gap: 2 }); bullets(c.tell);
  para(c.sources, { size: 8.5, color: GREY });

  newPage();
  para("FOR THE CONSULTING CLINICIAN", { size: 12, bold: true, color: PURPLE, gap: 2 });
  para("Summary of patient-logged data. Self-reported and unverified. Not a diagnosis.", { size: 9.5, color: GREY, gap: 8 });
  para("Logged data", { bold: true, gap: 2 }); bullets(c.clinician.facts);
  para("Not captured by the app (please ask the patient)", { bold: true, gap: 2 }); bullets(c.clinician.notCaptured);
  para("Discussion points by area (options only, no recommendation)", { bold: true, gap: 2 }); bullets(c.clinician.discuss);
  para("Use the HidroAlly Specialist Radar to find a certified dermatologist near you and present this report.", { size: 9.5, color: GREY });

  // footers with page numbers (no overlapping text)
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i); doc.setDrawColor(225, 225, 235).line(M, H - 52, W - M, H - 52);
    doc.setFont("helvetica", "normal").setFontSize(7.5).setTextColor(...GREY);
    doc.text(doc.splitTextToSize(clean(`Generated by HidroAlly (Giftovate Therapeutics Ltd) on ${c.reportDate} | hidroally.space. Supports, and does not replace, clinical consultation. CONFIDENTIAL: intended for the patient and treating clinician only.`), CW - 60), M, H - 40);
    doc.text(`Page ${i} of ${total}`, W - M, H - 40, { align: "right" });
  }
  return doc;
}

export function downloadClinicalReport(args: { rows: any[]; patient: PatientInfo; profile?: UserProfileInput }): void {
  const content = buildReportContent(args);
  const doc = renderClinicalReport(content);
  const d = new Date(); const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  doc.save(`HidroAlly_Clinical_Report_${clean(content.patient.name).replace(/\s+/g, "_")}_${stamp}.pdf`);
}
