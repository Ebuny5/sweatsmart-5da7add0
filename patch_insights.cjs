const fs = require('fs');
const filepath = 'src/components/episode/AIGeneratedInsights.tsx';
let code = fs.readFileSync(filepath, 'utf8');

// Update PDF generation
code = code.replace(
  "addSection('Immediate Relief Strategies', insights.immediateRelief);",
  "addSection(insights.isDryDay ? 'Barrier Care & Skin Protocol' : 'Immediate Relief Strategies', insights.immediateRelief);"
);

code = code.replace(
  "addSection('Lifestyle Modifications', insights.lifestyleModifications);",
  "addSection(insights.isDryDay ? 'Environmental & Routine Replication' : 'Lifestyle Modifications', insights.lifestyleModifications);"
);

// Note: Line 309 already has `insights.isDryDay ? 'Maintenance & Skin Protocol' : 'Immediate Relief Strategies'`.
// The prompt requires it to be "Barrier Care & Skin Protocol" for consistency with the PDF.
code = code.replace(
  "<CardTitle>{insights.isDryDay ? 'Maintenance & Skin Protocol' : 'Immediate Relief Strategies'}</CardTitle>",
  "<CardTitle>{insights.isDryDay ? 'Barrier Care & Skin Protocol' : 'Immediate Relief Strategies'}</CardTitle>"
);

code = code.replace(
  "<CardDescription>Evidence-based techniques for symptom management</CardDescription>",
  "<CardDescription>{insights.isDryDay ? 'Techniques for skin recovery and barrier protection' : 'Evidence-based techniques for symptom management'}</CardDescription>"
);

code = code.replace(
  "<CardTitle>Lifestyle Modifications</CardTitle>",
  "<CardTitle>{insights.isDryDay ? 'Environmental & Routine Replication' : 'Lifestyle Modifications'}</CardTitle>"
);

fs.writeFileSync(filepath, code);
