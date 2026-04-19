import { useEffect, useState } from "react";

const START_TEXT = "  ┌───────┐\n  │ START │▏\n  └───────┘▏\n   ▏▏▏▏▏▏▏▏";
const STOP_TEXT = "  ┌──────┐\n  │ STOP │▏\n  └──────┘▏\n   ▏▏▏▏▏▏▏";
const START_TEXT_PRESSED = "\n   ┌───────┐\n   │ START │\n   └───────┘";
const STOP_TEXT_PRESSED = "\n   ┌──────┐\n   │ STOP │\n   └──────┘";

export default function AsciiStartStopButton({
  running,
  disabled,
  onRunningChange,
  ariaLabelOn = "press to stop",
  ariaLabelOff = "press to start",
  style,
}) {
  const [pressed, setPressed] = useState(false);

  useEffect(() => {
    if (disabled) setPressed(false);
  }, [disabled]);

  const renderText = () => {
    if (pressed) {
      return running ? STOP_TEXT_PRESSED : START_TEXT_PRESSED;
    }
    return running ? STOP_TEXT : START_TEXT;
  };

  const releaseToggle = () => {
    if (!pressed) return;
    setPressed(false);
    if (disabled) return;
    onRunningChange?.(!running);
  };

  const cancelPress = () => setPressed(false);

  return (
    <pre
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-pressed={running}
      aria-disabled={disabled}
      aria-label={running ? ariaLabelOn : ariaLabelOff}
      onMouseDown={(e) => {
        if (disabled || e.button !== 0) return;
        e.preventDefault();
        setPressed(true);
      }}
      onMouseUp={releaseToggle}
      onMouseLeave={cancelPress}
      onTouchStart={(e) => {
        if (disabled) return;
        e.preventDefault();
        setPressed(true);
      }}
      onTouchEnd={releaseToggle}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setPressed(true);
          setTimeout(() => {
            setPressed(false);
            onRunningChange?.(!running);
          }, 0);
        }
      }}
      style={{
        fontFamily:
          '"Cascadia Mono", "Cascadia Code", Consolas, "Liberation Mono", "Courier New", ui-monospace, monospace',
        fontSize: 10,
        lineHeight: 1,
        letterSpacing: 0,
        margin: 0,
        whiteSpace: "pre",
        cursor: disabled ? "default" : "pointer",
        userSelect: "none",
        transition: "color 0.12s ease, transform 0.08s ease, text-shadow 0.12s ease, opacity 0.12s ease",
        color: disabled ? (running ? "#8a1f1f" : "#13690a") : running ? "#ff3a3a" : "#39ff14",
        textShadow: disabled
          ? "none"
          : running
            ? "0 0 8px rgba(255, 58, 58, 0.22)"
            : "0 0 8px rgba(57, 255, 20, 0.22)",
        opacity: disabled ? 0.5 : 1,
        ...style,
      }}
    >
      {renderText()}
    </pre>
  );
}
