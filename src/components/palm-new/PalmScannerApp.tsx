import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SensorReading, SimulationMode, PalmScanResult, FusedAnalysis } from './types';
import SensorDisplayCard from './SensorDisplayCard';
import JsonOutput from './JsonOutput';
import ModeInfo from './ModeInfo';
import StatusDisplay from './StatusDisplay';
import PalmScannerModal from './PalmScannerModal';
import { HeartIcon, EdaIcon, MODE_DETAILS } from './constants';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { edaManager } from '@/utils/edaManager';

const PalmScannerApp: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('returnTo');
  const initialMode = (searchParams.get('mode') as SimulationMode) || 'Resting';

  const [sensorData, setSensorData] = useState<SensorReading | null>(null);
  const [loadingMode, setLoadingMode] = useState<SimulationMode | null>(initialMode);
  const [error, setError] = useState<string | null>(null);

  const [isScanning, setIsScanning] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [palmScanResult, setPalmScanResult] = useState<PalmScanResult>('Not Scanned');
  const [fusedAnalysis, setFusedAnalysis] = useState<FusedAnalysis | null>(null);

  const fetchSensorData = useCallback(async (mode: SimulationMode) => {
    setLoadingMode(mode);
    setError(null);
    setFusedAnalysis(null);
    setPalmScanResult('Not Scanned');
    try {
      const { data, error } = await supabase.functions.invoke('generate-sensor-reading', {
        body: { mode }
      });

      if (error) throw error;
      setSensorData(data);

      // Save EDA to shared storage
      edaManager.saveEDA(data.EDA_uS, 'simulator');

      toast.success(`${mode} simulation generated`);

      // Auto-return to Climate Alert if returnTo parameter exists
      if (returnTo) {
        setTimeout(() => {
          toast.info('Returning to Climate Alert...');
          navigate(returnTo);
        }, 1500);
      }
    } catch (err: any) {
      setError(err.message || 'An unknown error occurred.');
      setSensorData(null);
      toast.error('Failed to generate sensor data');
    } finally {
      setLoadingMode(null);
    }
  }, []);

  useEffect(() => {
    fetchSensorData(initialMode);
  }, []);

  const handleCapture = useCallback(async (base64ImageData: string) => {
    setIsScanning(false);
    if (!sensorData) return;

    setIsAnalyzing(true);
    setError(null);
    try {
      const { data: palmData, error: palmError } = await supabase.functions.invoke('analyze-palm-image', {
        body: { base64ImageData }
      });

      if (palmError) throw palmError;
      setPalmScanResult(palmData.result);

      const { data: fusedData, error: fusedError } = await supabase.functions.invoke('get-fused-status', {
        body: { eda: sensorData.EDA_uS, palmResult: palmData.result }
      });

      if (fusedError) throw fusedError;
      setFusedAnalysis(fusedData);

      // Update sensor data notes with scan result
      setSensorData(prev => prev ? {
        ...prev,
        notes: `Scan result: ${palmData.result} | Status: ${fusedData.status} — ${fusedData.explanation}`
      } : prev);

      toast.success('Analysis complete');
    } catch (err: any) {
      setError(err.message || 'An analysis error occurred.');
      setPalmScanResult('Not Scanned');
      setFusedAnalysis(null);
      toast.error('Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  }, [sensorData]);

  const currentMode: SimulationMode = sensorData?.sim_mode || 'Resting';
  const modeDetails = MODE_DETAILS[currentMode];

  const MainContent: React.FC = () => {
    if (loadingMode && !sensorData) {
      return (
        <div className="text-center p-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fuchsia-300 mx-auto"></div>
          <p className="mt-4 text-purple-200">Initializing simulation for {loadingMode} state...</p>
        </div>
      );
    }

    if (error && !sensorData) {
      return (
        <div className="text-center p-10 bg-black/30 border border-red-400/40 rounded-xl backdrop-blur-md">
          <h3 className="text-red-300 font-semibold text-lg">Simulation Failed</h3>
          <p className="text-purple-100 mt-2">{error}</p>
        </div>
      );
    }

    if (sensorData) {
      return (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <SensorDisplayCard
              icon={<HeartIcon className="w-10 h-10" />}
              label="Heart Rate"
              value={sensorData.HR_bpm}
              unit="bpm"
              colorClass={modeDetails.textColor}
            />
            <SensorDisplayCard
              icon={<EdaIcon className="w-10 h-10" />}
              label="Electrodermal Activity"
              value={sensorData.EDA_uS}
              unit="μS"
              colorClass={modeDetails.textColor}
            />
          </div>
          {error && <div className="text-center text-red-300 mb-4">{error}</div>}
          <JsonOutput data={sensorData} />
        </>
      );
    }
    return null;
  };

  return (
    <>
      {isScanning && <PalmScannerModal onCapture={handleCapture} onClose={() => setIsScanning(false)} />}

      {/* Warrior Glass background */}
      <div className="min-h-full bg-slate-900 p-4 sm:p-8 relative overflow-hidden">
        {/* Ambient glow overlays */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-slate-800/50 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-slate-800/50 rounded-full blur-3xl" />
        </div>

        <div className="max-w-4xl mx-auto relative z-10">
          <header className="text-center mb-8 relative">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-[#22c55e] mb-2 drop-shadow-lg tracking-tight">
              Wearable Sensor Simulator
            </h1>
            <p className="text-[#4ade80] text-base max-w-2xl mx-auto">
              Generate sensor data and use multimodal analysis to assess stress levels.
            </p>
          </header>

          <main className="flex-grow space-y-6">
            <ModeInfo />
            <StatusDisplay
              analysis={fusedAnalysis}
              eda={sensorData?.EDA_uS ?? null}
              palmResult={palmScanResult}
              onScan={() => setIsScanning(true)}
              isAnalyzing={isAnalyzing}
            />
            <MainContent />
          </main>

          <footer className="mt-8 pb-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {(Object.keys(MODE_DETAILS) as SimulationMode[]).map((mode) => {
                const details = MODE_DETAILS[mode];
                const isLoading = loadingMode === mode;
                const isActive = currentMode === mode && !!sensorData;
                return (
                  <button
                    key={mode}
                    onClick={() => fetchSensorData(mode)}
                    disabled={!!loadingMode || isAnalyzing}
                    className={`
                      w-full py-3 px-4 text-base font-bold rounded-xl text-white
                      transition-all duration-300 shadow-lg flex items-center justify-center
                      ${details.buttonColor}
                      disabled:opacity-40 disabled:cursor-not-allowed
                    `}
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        <span>Simulating...</span>
                      </>
                    ) : (
                      `Simulate ${mode}`
                    )}
                  </button>
                );
              })}
            </div>
          </footer>
        </div>
      </div>
    </>
  );
};

export default PalmScannerApp;
