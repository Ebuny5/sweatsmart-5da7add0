import React, { useState, useEffect } from "react";
import { BookOpen, BrainCircuit, ShieldCheck, CheckCircle2 } from "lucide-react";

interface EpisodeProcessingViewProps {
  onComplete: () => void;
}

export default function EpisodeProcessingView({ onComplete }: EpisodeProcessingViewProps) {
  const [loadingStep, setLoadingStep] = useState(0);

  const processingSteps = [
    { title: "Ingesting episode parameters & anatomical zones...", icon: BrainCircuit },
    { title: "Querying author's Hyperhidrosis book database...", icon: BookOpen },
    { title: "Evaluating historical profile logs & pattern frequency...", icon: ShieldCheck },
    { title: "Synthesizing personalized plain-English analysis...", icon: CheckCircle2 },
  ];

  useEffect(() => {
    // Total duration ~15 seconds divided across 4 thoughtful steps (~3.75s each)
    const interval = setInterval(() => {
      setLoadingStep((prev) => {
        if (prev < processingSteps.length - 1) {
          return prev + 1;
        } else {
          clearInterval(interval);
          setTimeout(() => onComplete(), 1000); // Trigger transition after final check
          return prev;
        }
      });
    }, 3750);

    return () => clearInterval(interval);
  }, [onComplete, processingSteps.length]);

  const CurrentIcon = processingSteps[loadingStep].icon;

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-full bg-purple-500/20 blur-xl animate-pulse" />
        <div className="relative w-20 h-20 rounded-full bg-gradient-to-tr from-purple-600 via-pink-500 to-teal-400 p-0.5 shadow-xl flex items-center justify-center">
          <div className="w-full h-full bg-slate-950 rounded-full flex items-center justify-center">
            <CurrentIcon className="h-8 w-8 text-pink-400 animate-spin" style={{ animationDuration: '4s' }} />
          </div>
        </div>
      </div>

      <h2 className="text-xl font-bold text-white mb-2 tracking-tight">
        HidroAlly Clinical Engine Active
      </h2>

      <p className="text-sm text-slate-300 max-w-xs transition-all duration-300 h-10 flex items-center justify-center">
        {processingSteps[loadingStep].title}
      </p>

      {/* Progress Dots */}
      <div className="flex items-center gap-2 mt-8">
        {processingSteps.map((_, idx) => (
          <div
            key={idx}
            className={`h-1.5 rounded-full transition-all duration-500 ${
              idx <= loadingStep ? "w-8 bg-gradient-to-r from-purple-500 to-pink-500" : "w-2 bg-slate-800"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
