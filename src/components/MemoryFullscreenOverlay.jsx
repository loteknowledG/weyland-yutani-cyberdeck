export default function MemoryFullscreenOverlay({
  open,
  title,
  content,
  onPrevious,
  onNext,
  onClose,
}) {
  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        background: "rgba(0, 0, 0, 0.92)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "8px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "min(1400px, 100%)",
          height: "calc(100% - 8px)",
          maxHeight: "calc(100% - 8px)",
          overflow: "hidden",
          border: "1px solid #1f1f1f",
          borderRadius: "8px",
          background: "#050505",
          padding: "10px",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "12px",
          }}
        >
          <div
            style={{
              color: "#9bff9b",
              fontSize: "10px",
              letterSpacing: "0.08em",
            }}
          >
            {title}
          </div>
          <div style={{ display: "flex", gap: "6px" }}>
            <button
              type="button"
              onClick={onPrevious}
              aria-label="Previous card"
              title="Previous"
              style={{
                padding: "6px 10px",
                background: "#111",
                color: "#78b8ff",
                border: "1px solid #2a2a2a",
                cursor: "pointer",
                fontFamily: "monospace",
                fontSize: "10px",
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={onNext}
              aria-label="Next card"
              title="Next"
              style={{
                padding: "6px 10px",
                background: "#111",
                color: "#78b8ff",
                border: "1px solid #2a2a2a",
                cursor: "pointer",
                fontFamily: "monospace",
                fontSize: "10px",
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close fullscreen"
              title="Close"
              style={{
                padding: "6px 10px",
                background: "#111",
                color: "#9bff9b",
                border: "1px solid #2a2a2a",
                cursor: "pointer",
                fontFamily: "monospace",
                fontSize: "10px",
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div style={{ width: "100%", minHeight: 0, flex: 1 }}>{content}</div>
      </div>
    </div>
  );
}
