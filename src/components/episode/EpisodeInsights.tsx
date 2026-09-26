
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProcessedEpisode } from '@/types';
import { 
  Lightbulb, 
  Target, 
  Share2,
  FileText
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import PDFExportButton from './PDFExportButton';
import InsightGenerator from './insights/InsightGenerator';
import SelfManagementStrategies from './insights/SelfManagementStrategies';

interface EpisodeInsightsProps {
  episode: ProcessedEpisode;
}

const EpisodeInsights: React.FC<EpisodeInsightsProps> = ({ episode }) => {
  const { toast } = useToast();

  const handleShare = async () => {
    const shareData = {
      title: 'HidroAlly Episode Report',
      text: `Episode from ${episode.datetime.toLocaleDateString()} - Severity: ${episode.severityLevel}/5`,
      url: window.location.href
    };

    try {
      if (navigator.share && navigator.canShare?.(shareData)) {
        await navigator.share(shareData);
        toast({
          title: "Shared successfully",
          description: "Episode details have been shared.",
        });
      } else {
        const triggerSummary = episode.triggers
          .map(t => t?.label || t?.value || 'Unknown')
          .join(', ');
        await navigator.clipboard.writeText(`HidroAlly Episode Report\nDate: ${episode.datetime.toLocaleDateString()}\nSeverity: ${episode.severityLevel}/5\nBody Areas: ${episode.bodyAreas.join(', ')}\nTriggers: ${triggerSummary}\n\nView details: ${window.location.href}`);
        toast({
          title: "Copied to clipboard",
          description: "Episode details have been copied to your clipboard.",
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
      toast({
        title: "Share failed",
        description: "Unable to share episode details. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6 px-4 sm:px-6 max-w-6xl mx-auto">
      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Episode Insights</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Personalized analysis based on your episode data
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button
            onClick={handleShare}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Share2 className="h-4 w-4" />
            Share Episode
          </Button>
          <PDFExportButton episode={episode} />
        </div>
      </div>

      {/* Clinical Disclaimer */}
      <Card className="border-amber-200 bg-amber-50/50">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <FileText className="h-4 w-4 text-amber-600" />
            </div>
            <div className="text-sm">
              <p className="font-medium text-amber-800 mb-1">Educational Information Only</p>
              <p className="text-amber-700">
                This information is for educational purposes only and is not intended as medical advice. 
                Always consult with a healthcare provider before starting any treatment.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Generated Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            Your Personal Insights
          </CardTitle>
          <CardDescription>
            Analysis based on this episode's patterns and triggers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InsightGenerator episode={episode} />
        </CardContent>
      </Card>

      {/* Self-Management Strategies */}
      <SelfManagementStrategies />
    </div>
  );
};

export default EpisodeInsights;
