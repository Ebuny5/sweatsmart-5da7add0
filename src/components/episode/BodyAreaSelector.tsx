import { BodyArea } from "@/types";
import { useCallback, useState } from "react";
import { BODY_AREA_OPTIONS } from "@/constants/episodeData";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";

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
  const [customArea, setCustomArea] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);

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

  const handleAddCustomArea = () => {
    if (customArea.trim()) {
      onChange([...selectedAreas, customArea.trim()]);
      setCustomArea("");
      setShowCustomInput(false);
    }
  };

  const handleRemoveCustomArea = (areaToRemove: string) => {
    onChange(selectedAreas.filter((a) => a !== areaToRemove));
  };

  const selectedDetails = BODY_AREA_OPTIONS.filter((o) =>
    selectedAreas.includes(o.area)
  );

  const allPredefinedAreas = BODY_AREA_OPTIONS.map(o => o.area);
  const customAreasSelected = selectedAreas.filter(a => !allPredefinedAreas.includes(a));

  return (
    <div className="space-y-5">
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
                    className={`relative flex items-center gap-2 px-3.5 py-1.5 rounded-full border-2 transition-all duration-200
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
                    <span className="text-sm leading-none">{option.emoji}</span>
                    <span
                      className={`text-xs font-medium ${
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

      {/* Custom Areas */}
      {customAreasSelected.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-bold text-black">Custom Areas</h4>
          <div className="flex flex-wrap gap-2">
            {customAreasSelected.map((area, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border-2 bg-blue-50 border-blue-400 shadow-sm"
              >
                <span className="text-sm">✨</span>
                <span className="text-xs font-medium text-gray-800">{area}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveCustomArea(area)}
                  className="ml-1 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add custom area */}
      <div>
        {showCustomInput ? (
          <div className="flex items-center gap-2 mt-2">
            <input
              type="text"
              value={customArea}
              onChange={(e) => setCustomArea(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddCustomArea();
                }
              }}
              placeholder="e.g. Lower Back, Neck"
              className="text-xs px-3 py-1.5 rounded-xl border border-slate-200 focus:outline-none focus:border-purple-500 w-44"
              autoFocus
            />
            <button
              type="button"
              onClick={handleAddCustomArea}
              className="text-xs px-3 py-1.5 rounded-xl bg-purple-600 text-white font-medium hover:bg-purple-700"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCustomInput(false);
                setCustomArea("");
              }}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowCustomInput(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-colors"
          >
            <span>+</span> Add your own area
          </button>
        )}
      </div>

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
