import React from 'react';
import { FusedAnalysis, PalmScanResult } from './types';
import { STATUS_DETAILS, CameraIcon } from './constants';

interface StatusDisplayProps {
  analysis: FusedAnalysis | null;
  eda: number | null;
  palmResult: PalmScanResult;
  onScan: () => void;
  isAnalyzing: boolean;
}

const StatusDisplay: React.FC<StatusDisplayProps> = ({ analysis, eda, palmResult, onScan, isAnalyzing }) => {
  const status = analysis?.status;
  const details = status ? STATUS_DETAILS[status] : null;

  return (
    <div className="
      w-full max-w-4xl mx-auto mb-8
      bg-white/10 backdrop-blur-xl
      border border-white/20
      p-6 rounded-2xl shadow-2xl
      flex flex-col sm:flex-row items-center gap-6
    ">
      {/* Status orb */}
      <div className="flex-shrink-0">
        {details && status ? (
          <div className={`
            relative w-24 h-24 rounded-full flex items-center justify-center
            ${details.color} ring-4 ${details.ringColor} ${details.glowColor}
            transition-all duration-500
          `}>
            <span className="text-white font-bold text-sm text-center leading-tight px-1">
              {status}
            </span>
          </div>
        ) : (
          <div className="
            w-24 h-24 rounded-full flex items-center justify-center
            bg-white/10 ring-4 ring-white/10
          ">
            <span className="text-white text-xs text-center font-bold">Awaiting</span>
          </div>
        )}
      </div>

      {/* Text content with dark overlay for legibility on pink bg */}
      <div className="flex-grow text-center sm:text-left">
        <div className="bg-black/30 rounded-xl px-4 py-3 mb-3 inline-block w-full">
          <h2 className="text-lg font-medium text-[#d4ff00] mb-1">
            {status ? `Status: ${status}` : 'Combined Analysis'}
          </h2>
          <p className="text-[#d4ff00] font-normal text-sm leading-relaxed">
            {analysis?.explanation || 'Generate sensor data, then scan your affected area for a comprehensive analysis.'}
          </p>
        </div>

        {/* Sensor pills */}
        <div className="flex gap-2 flex-wrap justify-center sm:justify-start">
          {eda !== null && (
            <span className="
              px-3 py-1 rounded-full text-xs font-medium
              bg-black/30 border border-white/15 text-purple-100
            ">
              EDA: {eda.toFixed(2)} μS
            </span>
          )}
          {palmResult !== 'Not Scanned' && (
            <span className="
              px-3 py-1 rounded-full text-xs font-medium
              bg-black/30 border border-white/15 text-purple-100
            ">
              Scan: {palmResult}
            </span>
          )}
        </div>
      </div>

      {/* Scan button */}
      <button
        onClick={onScan}
        disabled={isAnalyzing || eda === null}
        className="
          flex-shrink-0 py-3 px-6 rounded-xl font-semibold text-white text-sm
          bg-sky-500/60 border border-sky-300/30
          hover:bg-sky-400/70 hover:border-sky-200/50
          disabled:bg-white/10 disabled:border-white/10 disabled:text-white/40 disabled:cursor-not-allowed
          transition-all duration-300 shadow-lg
          flex items-center gap-2
          backdrop-blur-md
        "
      >
        {isAnalyzing ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            Analyzing...
          </>
        ) : (
          <>
            <CameraIcon className="w-5 h-5" />
            Scan Area
          </>
        )}
      </button>
    </div>
  );
};

export default StatusDisplay;
