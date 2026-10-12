import { BodyArea } from "@/types";
import { useCallback } from "react";
import { BODY_AREA_OPTIONS } from "@/constants/episodeData";

interface BodyAreaSelectorProps {
  selectedAreas: BodyArea[];
  onChange: (areas: BodyArea[]) => void;
  highlightedAreas?: BodyArea[];
}

const priorityGroups = [
  {
    label: "Most commonly affected",
    priority: "High" as const,
    description: "Primary focal hyperhidrosis zones",
  },
  {
    label: "Also affected",
    priority: "Medium" as const,
    description: "Secondary or truncal zones",
  },
];

const BodyAreaSelector: React.FC<BodyAreaSelectorProps> = ({
  selectedAreas,
  onChange,
  highlightedAreas = [],
}) => {
  const handleAreaToggle = useCallback(
    (area: BodyArea) => {
      if (selectedAreas.includes(area)) {
        onChange(selectedAreas.filter((a) => a !== area));
      } else {
        onChange([...selectedAreas, area]);
      }
    },
    [selectedAreas, onChange]
  );

  const selectedDetails = BODY_AREA_OPTIONS.filter((o) =>
    selectedAreas.includes(o.area)
  );

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Tap all areas that were affected during this episode
      </p>

      {priorityGroups.map((group) => {
        const options = BODY_AREA_OPTIONS.filter((o) => o.priority === group.priority);
        return (
          <div key={group.priority} className="space-y-2">
            <div className="flex items-baseline gap-2">
              <h4 className="text-sm font-bold text-black">{group.label}</h4>
              <span className="text-[11px] font-bold text-black">{group.description}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {options.map((option) => {
                const isSelected = selectedAreas.includes(option.area);
                const isHighlighted = highlightedAreas.includes(option.area);
                return (
                  <button
                    key={option.area}
                    type="button"
                    onClick={() => handleAreaToggle(option.area)}
                    className={`relative flex items-center gap-2 px-4 py-2.5 rounded-full border-2 transition-all duration-200 min-h-[48px]
                      ${
                        isSelected
                          ? "bg-blue-50 border-blue-400 shadow-sm"
                          : "bg-blue-50 border-gray-200 hover:border-gray-300 hover:bg-gray-100"
                      }
                      ${isHighlighted ? "match-pulse-animation border-blue-600 ring-2 ring-blue-300" : ""}
                    `}
                  >
                    {isSelected && (
                      <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center shadow-sm">
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path
                            d="M1 4L3.5 6.5L9 1"
                            stroke="white"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                    )}
                    <span className="text-xl leading-none">{option.emoji}</span>
                    <span
                      className={`text-sm font-bold ${
                        isSelected ? "text-black" : "text-black"
                      }`}
                    >
                      {option.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Clinical detail panel for selected areas */}
      {selectedDetails.length > 0 && (
        <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 space-y-3">
          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
            Clinical profile for your episode
          </p>
          {selectedDetails.map((detail) => (
            <div key={detail.area} className="flex items-start gap-2">
              <span className="text-base mt-0.5">{detail.emoji}</span>
              <div>
                <p className="text-sm font-semibold text-gray-800">
                  {detail.label}{" "}
                  <span className="font-normal text-blue-600 text-xs">
                    — {detail.clinicalName}
                  </span>
                </p>
                <p className="text-xs text-gray-500 leading-snug">
                  {detail.complication}
                </p>
              </div>
            </div>
          ))}
          <p className="text-[11px] text-blue-400 pt-1">
            This information helps your dermatologist understand your pattern
          </p>
        </div>
      )}

      {selectedAreas.length > 0 && (
        <p className="text-xs text-blue-500">
          {selectedAreas.length} area{selectedAreas.length > 1 ? "s" : ""} selected
        </p>
      )}
    </div>
  );
};

export default BodyAreaSelector;
