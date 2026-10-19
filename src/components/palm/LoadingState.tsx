import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Activity, Brain, Droplets, Eye, Sparkles, Zap } from 'lucide-react';

const LoadingState: React.FC = () => {
  const [messageIndex, setMessageIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  const loadingMessages = [
    { text: "Calibrating hyperhidrosis detectors...", icon: Activity },
    { text: "Analyzing affected-area moisture levels...", icon: Droplets },
    { text: "Differentiating between dry, moist, and wet skin...", icon: Eye },
    { text: "Distinguishing natural sweat from external moisture...", icon: Droplets },
    { text: "Cross-referencing with dermatological patterns...", icon: Brain },
    { text: "Distinguishing between primary and secondary hyperhidrosis...", icon: Brain },
    { text: "Assessing sweat gland pore-level activity...", icon: Activity },
    { text: "Validating findings with sensor data...", icon: Zap },
    { text: "Identifying potential environmental triggers...", icon: Sparkles },
    { text: "Compiling personalized treatment recommendations...", icon: Sparkles },
    { text: "Finalizing your comprehensive diagnostic report...", icon: Activity },
  ];

  useEffect(() => {
    // Cycle through messages
    const messageInterval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 2000);

    // Smooth progress bar
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return 95; // Stop at 95% until complete
        return prev + 1;
      });
    }, 120);

    return () => {
      clearInterval(messageInterval);
      clearInterval(progressInterval);
    };
  }, []);

  const CurrentIcon = loadingMessages[messageIndex].icon;

  return (
    <div className="w-full max-w-2xl mx-auto animate-in fade-in duration-500">
      <Card className="border-2 border-primary/20 shadow-xl">
        <CardContent className="p-8 sm:p-12">
          {/* Animated Icon */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              {/* Pulsing background circles */}
              <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" />
              <div className="absolute inset-0 rounded-full bg-primary/20 animate-pulse" />
              
              {/* Main icon */}
              <div className="relative bg-gradient-to-br from-primary to-primary/80 rounded-full p-6 shadow-lg">
                <CurrentIcon className="h-12 w-12 text-white animate-pulse" />
              </div>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Analyzing Your Scan
          </h2>

          {/* Current Status Message */}
          <p className="text-center text-muted-foreground mb-6 min-h-[48px] flex items-center justify-center transition-all duration-500 ease-in-out">
            <span className="inline-flex items-center gap-2 text-sm sm:text-base animate-in fade-in slide-in-from-bottom-4">
              <CurrentIcon className="h-4 w-4 text-primary" />
              {loadingMessages[messageIndex].text}
            </span>
          </p>

          {/* Progress Bar */}
          <div className="space-y-3">
            <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="absolute inset-0 bg-gradient-to-r from-primary via-primary/80 to-primary rounded-full transition-all duration-300 ease-out"
                style={{ 
                  width: `${progress}%`,
                  boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)'
                }}
              >
                {/* Animated shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
              </div>
            </div>
            
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span>Processing...</span>
              <span className="font-mono font-semibold">{progress}%</span>
            </div>
          </div>

          {/* Fun Fact */}
          <div className="mt-8 p-4 bg-primary/5 rounded-lg border border-primary/10">
            <p className="text-xs text-center text-muted-foreground italic">
              💡 Did you know? Our AI analyzes over 50 visual features to detect hyperhidrosis patterns
            </p>
          </div>
        </CardContent>
      </Card>

      <style>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
};

export default LoadingState;
