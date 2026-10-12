import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import { Trigger } from "@/types";
import { TRIGGER_GROUPS, TriggerCategory } from "@/constants/episodeData";

type UserGender = "male" | "female" | "non-binary" | "prefer-not-to-say";

interface TriggerSelectorProps {
  triggers: Trigger[];
  onTriggersChange: (triggers: Trigger[]) => void;
  userGender?: UserGender;
  highlightedTriggers?: string[];
}

// All predefined labels (to identify custom triggers)
const allPredefinedLabels = TRIGGER_GROUPS.flatMap((g) => g.triggers.map((t) => t.label));

const TriggerSelector: React.FC<TriggerSelectorProps> = ({
  triggers = [],
  onTriggersChange,
  userGender,
  highlightedTriggers = [],
}) => {
  const [customTrigger, setCustomTrigger] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [activeTip, setActiveTip] = useState<string | null>(null);

  // Gender-tailored tip for Hormonal Changes trigger
  const hormonalTip: Record<UserGender, string> = {
    female:
      "Menstrual cycle, pregnancy, perimenopause, and menopause all cause hormonal swings that are directly linked to worsened hyperhidrosis — oestrogen and progesterone affect thermoregulation",
    male:
      "Testosterone fluctuations, andropause, and thyroid or adrenal imbalances can all increase sympathetic nervous system activity and worsen sweating episodes",
    "non-binary":
      "Hormonal fluctuations — including those from HRT, thyroid changes, adrenal shifts, or natural hormonal cycles — can directly worsen hyperhidrosis severity",
    "prefer-not-to-say":
      "Hormonal fluctuations — including puberty, thyroid changes, adrenal shifts, or any hormonal imbalance — can directly worsen hyperhidrosis severity",
  };

  const getEffectiveTip = (label: string, staticTip?: string): string | undefined => {
    if (label === "Hormonal Changes") {
      return hormonalTip[userGender ?? "prefer-not-to-say"];
    }
    return staticTip;
  };

  const isTriggerSelected = (label: string) =>
    Array.isArray(triggers) && triggers.some((t) => t.label === label);

  const handleTriggerToggle = (label: string, emoji: string, type: TriggerCategory, tip?: string) => {
    if (!Array.isArray(triggers)) return;

    if (isTriggerSelected(label)) {
      onTriggersChange(triggers.filter((t) => t.label !== label));
      if (activeTip === tip) setActiveTip(null);
    } else {
      const newTrigger: Trigger = {
        id: `${Date.now()}`,
        name: label,
        label,
        value: label.toLowerCase().replace(/\s+/g, "_"),
        type,
        category: type,
        icon: emoji,
      };
      onTriggersChange([...triggers, newTrigger]);
      if (tip) setActiveTip(tip);
    }
  };

  const handleAddCustomTrigger = () => {
    if (customTrigger.trim()) {
      const newTrigger: Trigger = {
        id: `${Date.now()}`,
        name: customTrigger.trim(),
        label: customTrigger.trim(),
        value: customTrigger.toLowerCase().replace(/\s+/g, "_"),
        type: "environmental",
        category: "environmental",
        icon: "✨",
      };
      onTriggersChange([...(triggers || []), newTrigger]);
      setCustomTrigger("");
      setShowCustomInput(false);
    }
  };

  const handleRemoveTrigger = (trigger: Trigger) => {
    if (!Array.isArray(triggers)) return;
    onTriggersChange(triggers.filter((t) => t.label !== trigger.label));
  };

  const customTriggers = Array.isArray(triggers)
    ? triggers.filter((t) => !allPredefinedLabels.includes(t.label))
    : [];

  return (
    <div className="space-y-7">
      <p className="text-sm text-muted-foreground">
        What may have caused or contributed to this episode? Select all that apply.
      </p>

      {TRIGGER_GROUPS.map((group) => (
        <div key={`${group.category}-${group.title}`} className="space-y-2">
          {/* Category header */}
          <div className="space-y-0.5">
            <h4 className="font-semibold text-sm text-gray-800 flex items-center gap-1.5">
              <span>{group.categoryEmoji}</span>
              {group.title}
            </h4>
            <p className="text-[11px] text-black font-bold leading-snug pl-5">
              {group.researchNote}
            </p>
          </div>

          {/* Flo-style pill grid */}
          <div className="flex flex-wrap gap-2 pt-1">
            {group.triggers.map((trigger) => {
              const isSelected = isTriggerSelected(trigger.label);
              const isHighlighted = highlightedTriggers.includes(trigger.label);
              return (
                <button
                  key={trigger.label}
                  type="button"
                  onClick={() =>
                    handleTriggerToggle(
                      trigger.label,
                      trigger.emoji,
                      group.category,
                      getEffectiveTip(trigger.label, trigger.tip)
                    )
                  }
                  className={`relative flex items-center gap-2 px-4 py-2.5 rounded-full border-2 transition-all duration-200 min-h-[48px]
                    ${
                      isSelected
                        ? `${group.selectedBg} ${group.selectedBorder} shadow-sm`
                        : "bg-blue-50 border-gray-200 hover:border-gray-300 hover:bg-gray-100"
                    }
                    ${isHighlighted ? "match-pulse-animation ring-2 ring-blue-300 border-blue-600" : ""}
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
                  <span className="text-lg leading-none">{trigger.emoji}</span>
                  <span
                    className={`text-sm font-bold ${
                      isSelected ? "text-black" : "text-black"
                    }`}
                  >
                    {trigger.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Clinical insight toast — shows tip of most recently selected trigger */}
      {activeTip && (
        <div className="flex items-start gap-3 rounded-xl bg-blue-50 border border-blue-100 p-4">
          <span className="text-xl mt-0.5">🔬</span>
          <div>
            <p className="text-xs font-semibold text-blue-700 mb-0.5">Why this trigger matters</p>
            <p className="text-sm text-gray-700 leading-snug">{activeTip}</p>
          </div>
          <button
            type="button"
            onClick={() => setActiveTip(null)}
            className="ml-auto text-gray-400 hover:text-gray-600 shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Custom triggers */}
      {customTriggers.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-semibold text-sm text-gray-700 flex items-center gap-1.5">
            <span>✨</span> Your Custom Triggers
          </h4>
          <div className="flex flex-wrap gap-2">
            {customTriggers.map((trigger, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full border-2 bg-amber-50 border-amber-400 shadow-sm min-h-[48px]"
              >
                <span className="text-lg">✨</span>
                <span className="text-sm font-medium text-gray-800">{trigger.label}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveTrigger(trigger)}
                  className="ml-1 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add custom trigger */}
      <div>
        {showCustomInput ? (
          <div className="flex gap-2 items-center">
            <Input
              placeholder="e.g. coffee smell, bright sun, crowded lift..."
              value={customTrigger}
              onChange={(e) => setCustomTrigger(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddCustomTrigger()}
              className="flex-1 rounded-full min-h-[48px] px-4"
              autoFocus
            />
            <Button
              type="button"
              onClick={handleAddCustomTrigger}
              disabled={!customTrigger.trim()}
              className="rounded-full min-h-[48px] px-5"
            >
              Add
            </Button>
            <button
              type="button"
              onClick={() => {
                setShowCustomInput(false);
                setCustomTrigger("");
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowCustomInput(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full border-2 border-dashed border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-all min-h-[48px]"
          >
            <Plus className="h-4 w-4" />
            <span className="text-sm font-medium">Add your own trigger</span>
          </button>
        )}
      </div>

      {/* Summary count */}
      {Array.isArray(triggers) && triggers.length > 0 && (
        <p className="text-xs text-blue-500">
          {triggers.length} trigger{triggers.length > 1 ? "s" : ""} logged for this episode
        </p>
      )}
    </div>
  );
};

export default TriggerSelector;
