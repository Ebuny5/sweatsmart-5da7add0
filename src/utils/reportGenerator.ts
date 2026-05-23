
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';

// Extend jsPDF with autotable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

interface ReportData {
  userName: string;
  totalEpisodes: number;
  avgSeverity: string;
  topTriggers: any[];
  topAreas: any[];
  weeklyTrends: any[];
}

export const generateProfessionalWarriorReport = (data: ReportData) => {
  const { userName, totalEpisodes, avgSeverity, topTriggers, topAreas } = data;
  const doc = new jsPDF();
  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // 1. Header & Branding
  doc.setFillColor(30, 58, 138); // Dark Blue (Indigo-900)
  doc.rect(0, 0, pageWidth, 40, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('GIFTOVATE THERAPEUTICS', margin, 25);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('CLINICAL HYPERHIDROSIS ANALYSIS | WARRIOR REPORT', margin, 32);

  doc.setFontSize(8);
  doc.text(`GENERATED: ${format(new Date(), 'PPpp').toUpperCase()}`, pageWidth - margin - 50, 32);

  y = 55;

  // 2. Patient Summary Box
  doc.setDrawColor(229, 231, 235);
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(margin, y, pageWidth - (margin * 2), 35, 3, 3, 'FD');

  doc.setTextColor(31, 41, 55);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('PATIENT IDENTIFICATION', margin + 5, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.text(`Name: ${userName}`, margin + 5, y + 18);
  doc.text(`Clinical Status: ACTIVE MONITORING`, margin + 5, y + 25);

  doc.text(`Total Episodes Logged: ${totalEpisodes}`, margin + 80, y + 18);
  doc.text(`Average HDSS Severity: ${avgSeverity} / 4.0`, margin + 80, y + 25);

  y += 45;

  // 3. Clinical Interpretation
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 138);
  doc.text('CLINICAL INTERPRETATION', margin, y);

  y += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(75, 85, 99);

  const hdssNum = parseFloat(avgSeverity);
  let interpretation = "";
  if (hdssNum >= 3.0) {
    interpretation = "Severe Hyperhidrosis (HDSS 3-4). Condition frequently or always interferes with daily activities. Prescription-level intervention (topical, oral, or procedural) is clinically indicated.";
  } else if (hdssNum >= 2.0) {
    interpretation = "Moderate Hyperhidrosis (HDSS 2). Condition sometimes interferes with daily activities. Targeted management of specific triggers and trial of clinical-grade antiperspirants recommended.";
  } else {
    interpretation = "Mild Hyperhidrosis (HDSS 1). Condition is noticeable but rarely interferes with daily activities. Routine monitoring and environmental trigger avoidance recommended.";
  }

  const splitInterpretation = doc.splitTextToSize(interpretation, pageWidth - (margin * 2));
  doc.text(splitInterpretation, margin, y);
  y += (splitInterpretation.length * 5) + 10;

  // 4. Trigger Analysis Table
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 138);
  doc.text('TRIGGER ANALYSIS & CORRELATION', margin, y);
  y += 5;

  const tableData = topTriggers.map(t => [
    t.name.toUpperCase(),
    `${t.count}`,
    `${t.percentage}%`,
    `${t.avgSeverity} / 4.0`
  ]);

  doc.autoTable({
    startY: y,
    head: [['PRIMARY TRIGGER', 'FREQUENCY', '% OF TOTAL', 'AVG SEVERITY']],
    body: tableData.length > 0 ? tableData : [['No data', '0', '0%', '0.0']],
    theme: 'striped',
    headStyles: { fillColor: [30, 58, 138], fontSize: 9 },
    styles: { fontSize: 9 },
    margin: { left: margin, right: margin }
  });

  y = (doc as any).lastAutoTable.finalY + 15;

  // 5. Body Area Distribution
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 138);
  doc.text('AFFECTED ANATOMICAL AREAS', margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(75, 85, 99);
  const areasText = topAreas.map(a => `${a.area} (${a.count} episodes)`).join(', ') || 'None recorded';
  doc.text(areasText, margin, y);

  y += 15;

  // 6. Treatment Ladder (Standard Clinical)
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 138);
  doc.text('RECOMMENDED CLINICAL TREATMENT LADDER', margin, y);
  y += 8;

  const ladderSteps = [
    { step: '1. First Line', treatment: 'Prescription-strength Aluminium Chloride (20%+) or Glycopyrronium wipes.' },
    { step: '2. Second Line', treatment: 'Iontophoresis (for palms/soles) or Botulinum Toxin injections.' },
    { step: '3. Third Line', treatment: 'Oral Anticholinergics (Oxybutynin/Glycopyrrolate) or Microwave Thermolysis.' },
    { step: '4. Advanced', treatment: 'Endoscopic Thoracic Sympathectomy (ETS) — Surgery as a final resort.' }
  ];

  ladderSteps.forEach(s => {
    doc.setFont('helvetica', 'bold');
    doc.text(s.step, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`: ${s.treatment}`, margin + 30, y);
    y += 7;
  });

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 15;
  doc.setFontSize(8);
  doc.setTextColor(156, 163, 175);
  doc.text('This clinical report is generated based on patient-logged data within the SweatSmart platform.', margin, footerY);
  doc.text('Shared with permission of the patient. CONFIDENTIAL MEDICAL DATA.', margin, footerY + 4);
  doc.text('Page 1 of 1', pageWidth - margin - 15, footerY + 4);

  // Save
  const fileName = `Warrior_Clinical_Report_${userName.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`;
  doc.save(fileName);
  return fileName;
};

export const canGenerateReport = (totalEpisodes: number) => {
  const MIN_EPISODES = 5;
  if (totalEpisodes < MIN_EPISODES) {
    return {
      allowed: false,
      message: `I need a bit more data to create a clinical-grade report. Please log at least ${MIN_EPISODES} episodes (you've logged ${totalEpisodes}) so I can identify your patterns accurately. 💙`
    };
  }
  return { allowed: true, message: '' };
};
