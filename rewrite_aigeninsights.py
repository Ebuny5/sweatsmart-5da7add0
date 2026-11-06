import re

with open("src/components/episode/AIGeneratedInsights.tsx", "r") as f:
    content = f.read()

# Update AIInsightsProps
pattern_props = re.compile(
    r"interface AIInsightsProps \{.*?\n\}",
    re.DOTALL
)

new_props = """interface AIInsightsProps {
  insights: {
    clinicalAnalysis: string;
    immediateRelief: string[];
    treatmentOptions: string[];
    lifestyleModifications: string[];
    medicalAttention: string;
    emotionalOpener?: string;
    emotionalSupport?: string;
    cta?: string;
    isDryDay?: boolean;
    dryDayMetrics?: {
      currentStreak: number;
      dryDaysLast7: number;
      monthlyDryTotal: number;
      header: string;
    };
  };
}"""
content = pattern_props.sub(new_props, content)

# Change Top Banner text for Dry Day and logic
pattern_banner = re.compile(
    r"I've analyzed your triggers\. Here is a detailed analysis of your episode 😊",
    re.DOTALL
)

new_banner = """{insights.isDryDay && insights.dryDayMetrics ? insights.dryDayMetrics.header : "I've analyzed your triggers. Here is a detailed analysis of your episode 😊"}"""
content = pattern_banner.sub(new_banner, content)


# Add 3-tile metric row for Dry Days
pattern_metrics_insert = re.compile(
    r"\{/\* Clinical Analysis \*/\}",
    re.DOTALL
)

new_metrics_row = """{/* Dry Day Metrics Row */}
      {insights.isDryDay && insights.dryDayMetrics && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Card className="border-none bg-blue-50/50 shadow-sm">
            <CardContent className="p-3 text-center">
              <p className="text-xs text-blue-600 font-bold uppercase tracking-wider mb-1">Current Streak</p>
              <p className="text-xl font-black text-blue-900">{insights.dryDayMetrics.currentStreak} Days</p>
            </CardContent>
          </Card>
          <Card className="border-none bg-emerald-50/50 shadow-sm">
            <CardContent className="p-3 text-center">
              <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider mb-1">7-Day Control</p>
              <p className="text-xl font-black text-emerald-900">{insights.dryDayMetrics.dryDaysLast7} / 7</p>
            </CardContent>
          </Card>
          <Card className="border-none bg-purple-50/50 shadow-sm">
            <CardContent className="p-3 text-center">
              <p className="text-xs text-purple-600 font-bold uppercase tracking-wider mb-1">30-Day Total</p>
              <p className="text-xl font-black text-purple-900">{insights.dryDayMetrics.monthlyDryTotal}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Clinical Analysis */}"""
content = pattern_metrics_insert.sub(new_metrics_row, content)

# Rename "Clinical Analysis" and "Immediate Relief Strategies" if Dry Day
pattern_clinical_title = re.compile(
    r"<CardTitle>Clinical Analysis</CardTitle>",
    re.DOTALL
)
new_clinical_title = "<CardTitle>{insights.isDryDay ? 'Dry Day Insights' : 'Clinical Analysis'}</CardTitle>"
content = pattern_clinical_title.sub(new_clinical_title, content)

pattern_relief_title = re.compile(
    r"<CardTitle>Immediate Relief Strategies</CardTitle>",
    re.DOTALL
)
new_relief_title = "<CardTitle>{insights.isDryDay ? 'Maintenance & Skin Protocol' : 'Immediate Relief Strategies'}</CardTitle>"
content = pattern_relief_title.sub(new_relief_title, content)

# Hide remaining cards if Dry Day
pattern_hide = re.compile(
    r"\{/\* Treatment Options \*/\}",
    re.DOTALL
)
new_hide = "{!insights.isDryDay && (\n      <>\n      {/* Treatment Options */}"
content = pattern_hide.sub(new_hide, content)

pattern_end_hide = re.compile(
    r"\{/\* HidroAlly CTA \*/\}",
    re.DOTALL
)
new_end_hide = "</>\n      )}\n\n      {/* HidroAlly CTA */}"
content = pattern_end_hide.sub(new_end_hide, content)


with open("src/components/episode/AIGeneratedInsights.tsx", "w") as f:
    f.write(content)
