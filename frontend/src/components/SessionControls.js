import {
  ArrowCounterClockwise,
  Microphone,
  MicrophoneSlash,
  Export,
} from "@phosphor-icons/react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function SessionControls({
  onReset,
  isVoiceMode,
  onToggleVoice,
  onExport,
  scenesCount,
}) {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="session-controls" data-testid="session-controls">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onReset}
              className="ctrl-btn"
              data-testid="reset-board-btn"
              aria-label="Reset board"
            >
              <ArrowCounterClockwise size={18} weight="bold" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>Reset board</p>
          </TooltipContent>
        </Tooltip>

        <div
          style={{
            width: 1,
            height: 20,
            background: "rgba(0,0,0,0.08)",
          }}
        />

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onToggleVoice}
              className={`ctrl-btn ${isVoiceMode ? "active" : ""}`}
              data-testid="toggle-voice-btn"
              aria-label={isVoiceMode ? "Disable voice" : "Enable voice"}
            >
              {isVoiceMode ? (
                <Microphone size={18} weight="bold" />
              ) : (
                <MicrophoneSlash size={18} weight="bold" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>{isVoiceMode ? "Voice on" : "Voice off"}</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onExport}
              className="ctrl-btn"
              data-testid="export-board-btn"
              disabled={scenesCount === 0}
              aria-label="Export board"
              style={{ opacity: scenesCount === 0 ? 0.4 : 1 }}
            >
              <Export size={18} weight="bold" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>Export SVG</p>
          </TooltipContent>
        </Tooltip>

        {scenesCount > 0 && (
          <div
            style={{
              fontFamily: "Outfit, sans-serif",
              fontSize: 12,
              color: "#A1A1AA",
              fontWeight: 500,
              paddingLeft: 4,
            }}
            data-testid="scenes-count"
          >
            {scenesCount} scene{scenesCount !== 1 ? "s" : ""}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
