import { WheelPicker, WheelPickerWrapper } from "./wheel-picker";

/**
 * Stable rotary wheel + single bezel shell (no nested 3D, no flex squash, no clip).
 * @ncdai: visibleCount must be a multiple of 4 — 8 keeps the “TV” compact while staying valid.
 */
export default function VoiceAdaptiveWheel({
  value,
  onValueChange,
  options,
  infinite = true,
  wrapperClassName = "",
  dimmed = false,
  maxWidthPx = 240,
  /** When true, stretch to parent width (no max-width cap, no horizontal centering). */
  fullWidth = false,
  /** Wheel viewport rows (must be multiple of 4 for @ncdai/react-wheel-picker). */
  visibleCount = 8,
  /** Per-row pixel height; larger values make the TV taller. */
  optionItemHeight = 22,
  accent = "#6a6048",
  /** Small caption on the widget, above the TV bezel (optional). */
  bezelTitle = "",
}) {
  const glow = `${accent}35`;

  return (
    <div
      style={{
        width: "100%",
        maxWidth: fullWidth ? "none" : maxWidthPx,
        margin: fullWidth ? 0 : "0 auto",
        alignSelf: fullWidth ? "stretch" : undefined,
        minWidth: 0,
        opacity: dimmed ? 0.45 : 1,
        pointerEvents: dimmed ? "none" : "auto",
        boxSizing: "border-box",
        overflow: "visible",
        padding: "2px 0",
      }}
    >
      {bezelTitle ? (
        <div
          style={{
            margin: "0 0 4px",
            padding: "0 2px",
            textAlign: "center",
            fontFamily: "monospace",
            fontSize: 7,
            lineHeight: 1.2,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "rgba(200,200,200,0.42)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {bezelTitle}
        </div>
      ) : null}
      {/* Single bezel shell; avoid nested inner frame. */}
      <div
        style={{
          borderRadius: 30,
          border: "2px solid #12100e",
          background: `
            radial-gradient(ellipse 95% 80% at 50% 16%, rgba(255,255,255,0.07), transparent 40%),
            radial-gradient(ellipse 90% 72% at 50% 28%, rgba(40,56,44,0.18), transparent 52%),
            radial-gradient(ellipse 110% 90% at 50% 100%, rgba(0,0,0,0.55), transparent 48%),
            linear-gradient(168deg, #151311, #070605)
          `,
          boxShadow: `
            0 0 0 1px rgba(255,255,255,0.04) inset,
            inset 0 6px 18px rgba(0,0,0,0.45),
            inset 0 1px 0 rgba(255,255,255,0.05),
            0 8px 22px rgba(0,0,0,0.55),
            0 0 18px ${glow}
          `,
          padding: "6px 7px",
          overflow: "visible",
        }}
      >
        {options.length ? (
          <WheelPickerWrapper
            className={`w-full min-w-0 max-w-full border-0 bg-transparent px-0 py-0 shadow-none ${wrapperClassName}`.trim()}
          >
            <WheelPicker
              value={value}
              onValueChange={onValueChange}
              options={options}
              classNames={{
                optionItem: "whitespace-nowrap text-[11px]",
                highlightItem: "whitespace-nowrap text-[11px]",
              }}
              visibleCount={visibleCount}
              optionItemHeight={optionItemHeight}
              infinite={infinite}
            />
          </WheelPickerWrapper>
        ) : null}
      </div>
    </div>
  );
}
