import React from 'react';

interface VoiceVisualizerProps {
  volume: number;
  isListening: boolean;
  color?: string;
}

const VoiceVisualizer: React.FC<VoiceVisualizerProps> = ({
  volume,
  isListening,
  color = '#3B82F6'
}) => {
  if (!isListening) return null;

  // Scale volume for better visualization (RMS is usually 0 to 0.1 or so)
  // We want a value between 1 and 2
  const scale = 1 + Math.min(volume * 5, 1);

  // Create an array for the bars
  const bars = [0.4, 0.7, 1.0, 0.8, 0.5];

  return (
    <div className="flex items-center justify-center gap-1 h-8 mt-2">
      {bars.map((baseHeight, i) => {
        // Add some random variation to each bar based on volume
        const heightMultiplier = baseHeight * scale;
        const height = Math.max(4, heightMultiplier * 24);

        return (
          <div
            key={i}
            className="w-1.5 rounded-full transition-all duration-75 ease-out"
            style={{
              height: `${height}px`,
              backgroundColor: color,
              opacity: 0.4 + (volume * 2)
            }}
          />
        );
      })}
    </div>
  );
};

export default VoiceVisualizer;
