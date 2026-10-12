import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface LogEntry {
  id: string;
  timestamp: number;
  hdssLevel: 1 | 2 | 3 | 4;
  weather: {
    temperature: number;
    humidity: number;
    uvIndex: number;
  };
  physiologicalData: {
    eda: number;
  };
}

const HDSS_LABELS = {
  1: 'Barely Noticeable',
  2: 'Tolerable',
  3: 'Barely Tolerable',
  4: 'Intolerable'
};

export default function ClimateHistory() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('sweatSmartLogs');
    if (saved) {
      setLogs(JSON.parse(saved));
    }
  }, []);

  const handleClearHistory = () => {
    if (confirm('Are you sure you want to clear all log history?')) {
      localStorage.removeItem('sweatSmartLogs');
      setLogs([]);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getHDSSColor = (level: number) => {
    switch (level) {
      case 1: return 'text-green-600 bg-green-50 border-green-200';
      case 2: return 'text-blue-600 bg-blue-50 border-blue-200';
      case 3: return 'text-amber-600 bg-amber-50 border-amber-200';
      case 4: return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-muted-foreground bg-muted border-border';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/climate')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Log History</h1>
              <p className="text-sm text-muted-foreground">Your episode tracking history</p>
            </div>
          </div>
          {logs.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleClearHistory}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear
            </Button>
          )}
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {logs.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="mb-4">
              <svg className="w-24 h-24 mx-auto text-muted-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2">No Episodes Logged Yet</h3>
            <p className="text-muted-foreground mb-6">
              Start tracking your sweating episodes to identify patterns and triggers.
            </p>
            <Button onClick={() => navigate('/climate')}>
              Return to Monitor
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Total Logs: <span className="font-bold text-foreground">{logs.length}</span>
            </div>
            {logs.sort((a, b) => b.timestamp - a.timestamp).map((log) => (
              <Card key={log.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className={`inline-block px-3 py-1 rounded-full text-sm font-semibold border ${getHDSSColor(log.hdssLevel)}`}>
                      HDSS Level {log.hdssLevel}: {HDSS_LABELS[log.hdssLevel]}
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      {formatDate(log.timestamp)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Temperature</p>
                    <p className="text-lg font-bold">{log.weather.temperature.toFixed(1)}°C</p>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Humidity</p>
                    <p className="text-lg font-bold">{log.weather.humidity.toFixed(0)}%</p>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">UV Index</p>
                    <p className="text-lg font-bold">{log.weather.uvIndex.toFixed(1)}</p>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">EDA</p>
                    <p className="text-lg font-bold">{log.physiologicalData.eda.toFixed(1)} µS</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
