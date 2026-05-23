import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Lightbulb, Stethoscope, Heart, Activity, AlertCircle, Copy, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import { cn } from '@/lib/utils';
import { generateProfessionalWarriorReport } from '@/utils/reportGenerator';
import { useEpisodes } from '@/hooks/useEpisodes';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useMemo } from 'react';

interface AIInsightsProps {
  insights: {
    clinicalAnalysis: string;
    immediateRelief: string[];
    treatmentOptions: string[];
    lifestyleModifications: string[];
    medicalAttention: string;
    emotionalOpener?: string;
    emotionalSupport?: string;
    cta?: string;
  };
}

const AIGeneratedInsights: React.FC<AIInsightsProps> = ({ insights }) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { episodes: rawEpisodes } = useEpisodes();
  const [isSpeaking, setIsSpeaking] = useState(false);

  const dashboardAnalytics = useMemo(() => {
    if (!rawEpisodes?.length) return null;
    const episodes = rawEpisodes.map(ep => ({
      ...ep,
      datetime: new Date(ep.datetime),
      severityLevel: Number(ep.severityLevel),
      triggers: Array.isArray(ep.triggers) ? ep.triggers : [],
      bodyAreas: Array.isArray(ep.bodyAreas) ? ep.bodyAreas : [],
    }));

    const triggerCounts = new Map<string, { count: number; severities: number[] }>();
    const areaCounts    = new Map<string, { count: number; severities: number[] }>();
    episodes.forEach(ep => {
      ep.triggers.forEach((t: any) => {
        const label = t.label || t.value || 'Unknown';
        const x = triggerCounts.get(label) || { count: 0, severities: [] };
        x.count++; x.severities.push(ep.severityLevel);
        triggerCounts.set(label, x);
      });
      ep.bodyAreas.forEach((a: string) => {
        const x = areaCounts.get(a) || { count: 0, severities: [] };
        x.count++; x.severities.push(ep.severityLevel);
        areaCounts.set(a, x);
      });
    });

    const topTriggers = [...triggerCounts.entries()]
      .sort((a, b) => b[1].count - a[1].count).slice(0, 5)
      .map(([name, d]) => ({
        name, count: d.count,
        avgSeverity: (d.severities.reduce((a, b) => a + b, 0) / d.severities.length).toFixed(1),
        percentage: Math.round((d.count / episodes.length) * 100),
      }));

    const topAreas = [...areaCounts.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .map(([area, d]) => ({
        area, count: d.count,
        avgSeverity: (d.severities.reduce((a, b) => a + b, 0) / d.severities.length).toFixed(1),
        percentage: Math.round((d.count / episodes.length) * 100),
      }));

    return {
      totalEpisodes: episodes.length,
      avgSeverity: (episodes.reduce((s, e) => s + e.severityLevel, 0) / episodes.length).toFixed(1),
      topTriggers,
      topAreas
    };
  }, [rawEpisodes]);

  const userName = profile?.display_name || user?.email?.split('@')[0] || 'Warrior';

  // Cancel speech when component unmounts
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const buildInsightText = () => {
    return [
      insights.emotionalOpener,
      insights.clinicalAnalysis,
      ...(insights.immediateRelief ?? []),
      ...(insights.treatmentOptions ?? []),
      ...(insights.lifestyleModifications ?? []),
      insights.medicalAttention,
    ]
      .filter(Boolean)
      .join('. ');
  };

  const doSpeak = (utterance: SpeechSynthesisUtterance) => {
    const synth = window.speechSynthesis;
    synth.cancel();

    const voices = synth.getVoices();
    const preferred = voices.find(v =>
      v.lang.startsWith('en') &&
      ['samantha', 'victoria', 'karen', 'aria', 'zira', 'hazel', 'google uk english female']
        .some(k => v.name.toLowerCase().includes(k))
    ) || voices.find(v => v.lang.startsWith('en'));
    if (preferred) utterance.voice = preferred;

    let heartbeat: ReturnType<typeof setInterval> | null = null;
    const cleanup = () => {
      if (heartbeat) { clearInterval(heartbeat); heartbeat = null; }
      setIsSpeaking(false);
    };

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = cleanup;
    utterance.onerror = (e) => {
      console.warn('Speech error:', e);
      cleanup();
      toast({
        title: 'Speech unavailable',
        description: 'Your browser blocked the reader. Please tap Listen again.',
        variant: 'destructive',
      });
    };

    heartbeat = setInterval(() => {
      if (!synth.speaking && !synth.pending) { cleanup(); return; }
      if (synth.paused) synth.resume();
    }, 5000);

    setIsSpeaking(true);
    synth.speak(utterance);
  };

  const handleToggleSpeak = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      toast({
        title: 'Speech unavailable',
        description: 'Your browser does not support text-to-speech.',
        variant: 'destructive',
      });
      return;
    }

    const synth = window.speechSynthesis;

    // If already speaking — stop
    if (isSpeaking || synth.speaking) {
      synth.cancel();
      setIsSpeaking(false);
      return;
    }

    const text = buildInsightText();
    if (!text.trim()) return;

    // Create and speak synchronously inside the tap. Android Chrome can silently
    // block speech if utterance creation/speak() is delayed by timers/promises.
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.95;
    utterance.pitch = 1.05;
    utterance.volume = 1.0;
    doSpeak(utterance);
  };

  const handleCopyInsights = async () => {
    const insightsText = `
SWEATSMART AI-GENERATED INSIGHTS
=================================

CLINICAL ANALYSIS
${insights.clinicalAnalysis}

IMMEDIATE RELIEF STRATEGIES
${insights.immediateRelief.map((item, i) => `${i + 1}. ${item}`).join('\n\n')}

TREATMENT RECOMMENDATIONS
${insights.treatmentOptions.map((item, i) => `${i + 1}. ${item}`).join('\n\n')}

LIFESTYLE MODIFICATIONS
${insights.lifestyleModifications.map((item, i) => `${i + 1}. ${item}`).join('\n\n')}

WHEN TO SEEK MEDICAL ATTENTION
${insights.medicalAttention}

---
Generated by SweatSmart AI
Disclaimer: These insights are AI-generated and for educational purposes only. Always consult with a healthcare provider for personalized medical advice.
    `.trim();

    try {
      await navigator.clipboard.writeText(insightsText);
      toast({
        title: 'Copied to clipboard',
        description: 'AI insights have been copied to your clipboard.',
      });
    } catch (error) {
      toast({
        title: 'Copy failed',
        description: 'Could not copy to clipboard. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDownloadPDF = () => {
    if (!dashboardAnalytics || dashboardAnalytics.totalEpisodes < 5) {
      toast({
        title: "Minimum Logging Required",
        description: `Please log at least 5 episodes (you have ${dashboardAnalytics?.totalEpisodes || 0}) to generate a professional clinical report for your dermatologist.`,
        variant: "destructive"
      });
      return;
    }

    try {
      generateProfessionalWarriorReport({
        userName,
        totalEpisodes: dashboardAnalytics.totalEpisodes,
        avgSeverity: dashboardAnalytics.avgSeverity,
        topTriggers: dashboardAnalytics.topTriggers,
        topAreas: dashboardAnalytics.topAreas,
        weeklyTrends: [] // Not strictly required for the simplified clinical report layout
      });
      toast({ title: 'Professional Report downloaded', description: 'Your Warrior Clinical Report has been saved.' });
    } catch (error) {
      console.error('PDF generation error:', error);
      toast({ title: 'Download failed', description: 'Could not generate report. Please try again.', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      {/* HidroAlly Hears You - Emotional Support Card */}
      {insights.emotionalSupport && (
        <Card className="border-l-4 border-l-pink-400 bg-pink-50/50 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">💜</span>
              <CardTitle className="text-pink-700 text-base font-bold">HidroAlly Hears You</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 leading-relaxed italic text-sm">
              {insights.emotionalSupport}
            </p>
          </CardContent>
        </Card>
      )}

      {/* HidroAlly greeting card */}
      {insights.emotionalOpener && (
        <Card className="border-none bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Heart className="h-24 w-24 rotate-12" />
          </div>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <span className="text-sm">🛡️</span>
              </div>
              <CardTitle className="text-lg font-bold">HidroAlly Analysis</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed whitespace-pre-wrap font-medium">
              {insights.emotionalOpener}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Action bar */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
        <Alert className="border-primary/20 bg-primary/5 flex-1">
          <Stethoscope className="h-4 w-4 text-primary" />
          <AlertDescription>
            These insights are generated by AI trained on hyperhidrosis knowledge. Always consult a healthcare provider for personal medical advice.
          </AlertDescription>
        </Alert>
        <div className="flex gap-2 w-full sm:w-auto">
          {/* 🔊 Listen / Stop button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleSpeak}
            className={cn(
              'flex-1 sm:flex-none font-semibold gap-2',
              isSpeaking ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''
            )}
          >
            <span>{isSpeaking ? '⏹' : '🔊'}</span>
            {isSpeaking ? 'Stop' : 'Listen'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleCopyInsights} className="flex-1 sm:flex-none">
            <Copy className="h-4 w-4 mr-2" /> Copy
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadPDF} className="flex-1 sm:flex-none">
            <Download className="h-4 w-4 mr-2" /> Download
          </Button>
        </div>
      </div>

      {/* Clinical Analysis */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Stethoscope className="h-5 w-5 text-blue-600" />
              <CardTitle>Clinical Analysis</CardTitle>
            </div>
            <Badge variant="outline">AI-Generated</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground leading-relaxed">{insights.clinicalAnalysis}</p>
        </CardContent>
      </Card>

      {/* Immediate Relief */}
      <Card className="border-l-4 border-l-green-500">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Heart className="h-5 w-5 text-green-600" />
            <CardTitle>Immediate Relief Strategies</CardTitle>
          </div>
          <CardDescription>Evidence-based techniques for symptom management</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {insights.immediateRelief.map((strategy, index) => (
              <li key={index} className="flex gap-3">
                <span className="text-primary mt-1 flex-shrink-0">•</span>
                <span className="text-muted-foreground">{strategy}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Treatment Options */}
      <Card className="border-l-4 border-l-purple-500">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Activity className="h-5 w-5 text-purple-600" />
            <CardTitle>Treatment Recommendations</CardTitle>
          </div>
          <CardDescription>Based on your episode severity and pattern</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {insights.treatmentOptions.map((option, index) => (
              <li key={index} className="flex gap-3">
                <span className="text-primary mt-1 flex-shrink-0">•</span>
                <span className="text-muted-foreground">{option}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Lifestyle Modifications */}
      <Card className="border-l-4 border-l-orange-500">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Lightbulb className="h-5 w-5 text-orange-600" />
            <CardTitle>Lifestyle Modifications</CardTitle>
          </div>
          <CardDescription>Actionable changes to reduce episode frequency</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {insights.lifestyleModifications.map((modification, index) => (
              <li key={index} className="flex gap-3">
                <span className="text-primary mt-1 flex-shrink-0">•</span>
                <span className="text-muted-foreground">{modification}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* When to seek help */}
      <Card className="border-l-4 border-l-red-500">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <CardTitle>When to Seek Medical Attention</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{insights.medicalAttention}</p>
        </CardContent>
      </Card>

      {/* HidroAlly CTA */}
      {insights.cta && (
        <Card className="border-2 border-violet-200 bg-violet-50">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center gap-4">
              <p className="text-sm text-gray-700 leading-relaxed font-medium italic">
                {insights.cta}
              </p>
              <Button
                onClick={() => navigate('/hyper-ai')}
                className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl px-8"
              >
                Continue in HidroAlly Chat
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AIGeneratedInsights;
