
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BodyAreaFrequency } from "@/types";
import { formatHdss } from "@/utils/hdssGauger";

interface BodyAreaHeatmapProps {
  bodyAreas: BodyAreaFrequency[];
}

const BodyAreaHeatmap: React.FC<BodyAreaHeatmapProps> = ({ bodyAreas }) => {
  const getIntensityClass = (count: number, max: number) => {
    const percentage = (count / max) * 100;
    
    if (percentage >= 80) return "bg-primary text-primary-foreground";
    if (percentage >= 60) return "bg-primary/80 text-primary-foreground";
    if (percentage >= 40) return "bg-primary/60 text-primary-foreground";
    if (percentage >= 20) return "bg-primary/40 text-primary-foreground";
    return "bg-primary/20 text-foreground";
  };
  
  // Find the maximum count for scaling
  const maxCount = bodyAreas.length > 0 
    ? Math.max(...bodyAreas.map(area => area.count))
    : 1;
  
  return (
    <Card className="col-span-3 lg:col-span-1">
      <CardHeader>
        <CardTitle>Affected Body Areas</CardTitle>
      </CardHeader>
      <CardContent>
        {bodyAreas.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {bodyAreas.map((area) => (
              <div
                key={area.area}
                className={`rounded-lg p-3 flex flex-col ${getIntensityClass(
                  area.count,
                  maxCount
                )}`}
              >
                <span className="text-sm font-medium">{area.area}</span>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs">{area.count} episodes</span>
                  <span className="text-xs">
                    Typically HDSS {formatHdss(area.averageSeverity)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-[240px] text-muted-foreground">
            Not enough data to show body area analysis
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BodyAreaHeatmap;
