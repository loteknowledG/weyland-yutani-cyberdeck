import React, { useEffect, useMemo } from "react";
import { WheelPicker, WheelPickerWrapper } from "./wheel-picker";
import {
  getBaseVoiceProfileOptions,
  getLanguageOptions,
  getLanguageVoiceOptions,
  resolveVoiceProfile,
} from "../lib/voiceProfiles";

function Field({ label, children, hint }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
      <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8fa" }}>
        {label}
      </div>
      {children}
      {hint ? <div style={{ fontSize: 10, color: "#7a7a7a", lineHeight: 1.35 }}>{hint}</div> : null}
    </div>
  );
}

function Panel({ title, accent, eyebrow, children, style = {} }) {
  return (
    <div
      style={{
        display: "grid",
        gap: 10,
        padding: 10,
        borderRadius: 14,
        border: `1px solid ${accent}26`,
        background: "linear-gradient(180deg, rgba(7,7,7,0.98), rgba(4,4,4,0.98))",
        boxShadow: `0 0 0 1px ${accent}10 inset`,
        minWidth: 0,
        ...style,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
        <div
          style={{
            color: accent,
            fontSize: 10,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
          }}
        >
          {title}
        </div>
        {eyebrow ? <div style={{ color: "#7a7a7a", fontSize: 10 }}>{eyebrow}</div> : null}
      </div>
      {children}
    </div>
  );
}

function ConfigRow({ label, value }) {
  return (
    <div style={{ display: "grid", gap: 2 }}>
      <div style={{ color: "#7a7a7a", fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ color: "#d7ffd7", fontSize: 12, lineHeight: 1.35 }}>{value}</div>
    </div>
  );
}

function Chip({ active, children, onClick, accent = "#ffaa00" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "6px 10px",
        borderRadius: 10,
        border: `1px solid ${active ? accent : "#222"}`,
        background: active ? `${accent}1f` : "#090909",
        color: active ? "#ffe0a3" : "#8a8a8a",
        fontFamily: "monospace",
        fontSize: 10,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function NumberField({ label, value, onChange, suffix, step = "1" }) {
  return (
    <Field label={label}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          type="number"
          step={step}
          style={{
            width: "100%",
            minWidth: 0,
            padding: "9px 10px",
            background: "#090909",
            border: "1px solid #222",
            borderRadius: 10,
            color: "#d7ffd7",
            fontFamily: "monospace",
            fontSize: 12,
          }}
        />
        {suffix ? <span style={{ color: "#7a7a7a", fontSize: 10 }}>{suffix}</span> : null}
      </div>
    </Field>
  );
}

export default function VoiceTunerCard({
  title = "VOICE TUNER",
  accent = "#ffaa00",
  defaultProfileId = "jenna-jacket",
  selectedProfileId = defaultProfileId,
  onProfileChange = () => {},
  modelMode = "tts",
  onModelModeChange = () => {},
  language = "en-US",
  onLanguageChange = () => {},
  languageVoice = "",
  onLanguageVoiceChange = () => {},
  speakMode = "conversation",
  speakerMode = "auto",
  ttsRate = "0",
  onTtsRateChange = () => {},
  ttsPitch = "0",
  onTtsPitchChange = () => {},
  ttsVolume = "0",
  onTtsVolumeChange = () => {},
  onPreviewChange,
  mode = "tuner",
  compact = false,
  style = {},
} = {}) {
  const isModelMode = mode === "model";
  const baseOptions = useMemo(() => getBaseVoiceProfileOptions(), []);
  const languageOptions = useMemo(() => getLanguageOptions(), []);
  const languageVoiceOptions = useMemo(() => getLanguageVoiceOptions(language), [language]);
  const selectedProfile = useMemo(() => resolveVoiceProfile(selectedProfileId), [selectedProfileId]);

  const previewProfile = useMemo(
    () => ({
      ...selectedProfile,
      modelMode,
      language,
      languageVoice,
      speakMode,
      speakerMode,
      ttsRate: Number(ttsRate),
      ttsPitch: Number(ttsPitch),
      ttsVolume: Number(ttsVolume),
    }),
    [language, languageVoice, modelMode, selectedProfile, speakerMode, speakMode, ttsPitch, ttsRate, ttsVolume],
  );

  useEffect(() => {
    if (!onPreviewChange) return;
    onPreviewChange(
      isModelMode
        ? {
            ...selectedProfile,
            modelMode,
            language,
          }
        : {
            ...previewProfile,
            description: `Preview tuned from ${selectedProfile.label}.`,
          },
    );
  }, [isModelMode, language, modelMode, onPreviewChange, previewProfile, selectedProfile]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: compact ? 8 : 12,
        padding: compact ? "8px" : "10px",
        border: `1px solid ${accent}33`,
        borderRadius: "16px",
        background: "linear-gradient(180deg, rgba(8,8,8,0.98), rgba(4,4,4,0.98))",
        boxShadow: `0 0 0 1px ${accent}12 inset`,
        height: "100%",
        minHeight: compact ? "100%" : "auto",
        overflow: "auto",
        ...style,
      }}
    >
      <div
        className={isModelMode ? "voice-card-handle" : undefined}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
          cursor: isModelMode ? "move" : "default",
          userSelect: "none",
        }}
      >
        <div
          style={{
            color: accent,
            fontSize: 10,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            minHeight: 12,
          }}
        >
          {isModelMode ? "" : title}
        </div>
        <div style={{ fontSize: 10, color: "#7a7a7a" }}>{isModelMode ? "" : "stateless tuning"}</div>
      </div>

      {isModelMode ? (
        <Panel title="[|> MODEL" accent={accent} eyebrow="base voice">
          <div style={{ display: "grid", gap: 12 }}>
            <Field>
              <div style={{ minHeight: 420 }}>
                <WheelPickerWrapper className="w-full h-full rounded-xl border border-zinc-800 bg-zinc-950 px-1 py-2">
                  <WheelPicker
                    value={selectedProfile.id}
                    onValueChange={(value) => {
                      const next = resolveVoiceProfile(String(value));
                      onProfileChange(next.id);
                    }}
                    options={baseOptions}
                    visibleCount={9}
                    optionItemHeight={42}
                    infinite
                  />
                </WheelPickerWrapper>
              </div>
            </Field>

            <Field label="Language" hint="Choose the speech language for the selected voice.">
              <div style={{ minHeight: 220 }}>
                <WheelPickerWrapper className="w-full h-full rounded-xl border border-zinc-800 bg-zinc-950 px-1 py-2">
                  <WheelPicker
                    value={language}
                    onValueChange={(value) => onLanguageChange(String(value))}
                    options={languageOptions}
                    visibleCount={5}
                    optionItemHeight={28}
                    infinite
                  />
                </WheelPickerWrapper>
              </div>
            </Field>

            <Field label="Voice" hint="Populated from the selected language.">
              <select
                value={languageVoice}
                onChange={(e) => onLanguageVoiceChange(e.target.value)}
                style={{
                  width: "100%",
                  minWidth: 0,
                  padding: "10px 12px",
                  background: "#090909",
                  border: "1px solid #222",
                  borderRadius: 10,
                  color: "#d7ffd7",
                  fontFamily: "monospace",
                  fontSize: 12,
                }}
              >
                {(languageVoiceOptions.length ? languageVoiceOptions : [{ label: "No voices found", value: "" }]).map(
                  (option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ),
                )}
              </select>
            </Field>
          </div>
        </Panel>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          <Panel title="Configuration" accent={accent} eyebrow="live state">
            <div style={{ display: "grid", gap: 8, gridTemplateColumns: compact ? "1fr" : "repeat(2, minmax(0, 1fr))" }}>
              <ConfigRow label="Engine" value={modelMode} />
              <ConfigRow label="Language" value={language} />
              <ConfigRow label="Speaker" value={speakerMode} />
              <ConfigRow label="Speak Mode" value={speakMode} />
              <ConfigRow label="Selected Profile" value={selectedProfile.label} />
              <ConfigRow label="Draft" value={previewProfile.description || "tuning in progress"} />
            </div>
          </Panel>

          <Panel title="Selected Model" accent={accent} eyebrow="preview target">
            <div
              style={{
                display: "grid",
                gap: 6,
                padding: 10,
                borderRadius: 12,
                border: "1px solid #222",
                background: "#090909",
              }}
            >
              <div style={{ color: "#d7ffd7", fontSize: 13 }}>{selectedProfile.label}</div>
              <div style={{ color: "#7a7a7a", fontSize: 11, lineHeight: 1.45 }}>
                {selectedProfile.description || "Tuning operates on the current voice model."}
              </div>
              <div style={{ color: "#9bdcff", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                {modelMode} / {language} / {speakMode}
              </div>
            </div>
          </Panel>

          <Panel title="Tuning" accent={accent} eyebrow="shaping controls">
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
              <NumberField label="TTS Rate" value={ttsRate} onChange={onTtsRateChange} suffix="%" />
              <NumberField label="TTS Pitch" value={ttsPitch} onChange={onTtsPitchChange} suffix="Hz" />
              <NumberField label="TTS Vol" value={ttsVolume} onChange={onTtsVolumeChange} suffix="%" />
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}
