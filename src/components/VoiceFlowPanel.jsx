import { useEffect, useMemo, useState } from "react";
import ReactGridLayout, { useContainerWidth } from "react-grid-layout";
import { noCompactor } from "react-grid-layout/core";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

import VoiceCard from "./VoiceCard";
import VoiceTunerCard from "./VoiceTunerCard";
import { WheelPicker, WheelPickerWrapper } from "./wheel-picker";
import {
  getAllVoiceProfiles,
  getBaseVoiceProfiles,
  getLanguageVoiceOptions,
  resolveVoiceProfile,
  saveVoiceProfilePreset,
} from "../lib/voiceProfiles";

const DEFAULT_SPEAK_TEXT =
  "Hello, this is your cyberdeck speaking. Adjust the voice wheel and listen.";
const DEFAULT_PRESET_NAME = "mechanicus";
const DEFAULT_MODEL_MODE = "tts";
const DEFAULT_LANGUAGE = "en-US";

function pickLanguageVoice(language, preferredVoice) {
  const options = getLanguageVoiceOptions(language);
  if (!options.length) return "";
  const preferred = options.find((option) => option.value === preferredVoice);
  return preferred?.value || options[0].value;
}

function PipelineShell({ title, accent, subtitle, children, style = {} }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        borderRadius: 18,
        border: `1px solid ${accent}33`,
        background: "linear-gradient(180deg, rgba(8,8,8,0.98), rgba(4,4,4,0.98))",
        boxShadow: `0 0 0 1px ${accent}12 inset`,
        padding: 12,
        overflow: "auto",
        ...style,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
        <div
          className="voice-card-handle"
          style={{
            cursor: "move",
            color: accent,
            fontSize: 10,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            userSelect: "none",
          }}
        >
          {title}
        </div>
        <div style={{ color: "#7a7a7a", fontSize: 10 }}>{subtitle}</div>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children, hint }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
      <div style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "#8fa" }}>
        {label}
      </div>
      {children}
      {hint ? <div style={{ fontSize: 10, color: "#7a7a7a", lineHeight: 1.35 }}>{hint}</div> : null}
    </div>
  );
}

function SpeakStage({ text, onChange, mode, onModeChange, speakerMode, onSpeakerModeChange }) {
  return (
    <PipelineShell title="Speak" accent="#7fd7ff" subtitle="choose payload">
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => onModeChange("conversation")}
          style={{
            padding: "6px 10px",
            borderRadius: 10,
            border: `1px solid ${mode === "conversation" ? "#7fd7ff" : "#222"}`,
            background: mode === "conversation" ? "rgba(127,215,255,0.12)" : "#090909",
            color: mode === "conversation" ? "#bfefff" : "#8a8a8a",
            fontFamily: "monospace",
            fontSize: 10,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          Conversation
        </button>
        <button
          type="button"
          onClick={() => onModeChange("last sentence")}
          style={{
            padding: "6px 10px",
            borderRadius: 10,
            border: `1px solid ${mode === "last sentence" ? "#7fd7ff" : "#222"}`,
            background: mode === "last sentence" ? "rgba(127,215,255,0.12)" : "#090909",
            color: mode === "last sentence" ? "#bfefff" : "#8a8a8a",
            fontFamily: "monospace",
            fontSize: 10,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          Last sentence
        </button>
        <button
          type="button"
          onClick={() => onModeChange("selection")}
          style={{
            padding: "6px 10px",
            borderRadius: 10,
            border: `1px solid ${mode === "selection" ? "#7fd7ff" : "#222"}`,
            background: mode === "selection" ? "rgba(127,215,255,0.12)" : "#090909",
            color: mode === "selection" ? "#bfefff" : "#8a8a8a",
            fontFamily: "monospace",
            fontSize: 10,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          Selection
        </button>
        <button
          type="button"
          onClick={() => onModeChange("prompt")}
          style={{
            padding: "6px 10px",
            borderRadius: 10,
            border: `1px solid ${mode === "prompt" ? "#7fd7ff" : "#222"}`,
            background: mode === "prompt" ? "rgba(127,215,255,0.12)" : "#090909",
            color: mode === "prompt" ? "#bfefff" : "#8a8a8a",
            fontFamily: "monospace",
            fontSize: 10,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          Prompt
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => onSpeakerModeChange("auto")}
          style={{
            padding: "6px 10px",
            borderRadius: 10,
            border: `1px solid ${speakerMode === "auto" ? "#7fd7ff" : "#222"}`,
            background: speakerMode === "auto" ? "rgba(127,215,255,0.12)" : "#090909",
            color: speakerMode === "auto" ? "#bfefff" : "#8a8a8a",
            fontFamily: "monospace",
            fontSize: 10,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          Auto
        </button>
        <button
          type="button"
          onClick={() => onSpeakerModeChange("ai")}
          style={{
            padding: "6px 10px",
            borderRadius: 10,
            border: `1px solid ${speakerMode === "ai" ? "#7fd7ff" : "#222"}`,
            background: speakerMode === "ai" ? "rgba(127,215,255,0.12)" : "#090909",
            color: speakerMode === "ai" ? "#bfefff" : "#8a8a8a",
            fontFamily: "monospace",
            fontSize: 10,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          AI
        </button>
        <button
          type="button"
          onClick={() => onSpeakerModeChange("human")}
          style={{
            padding: "6px 10px",
            borderRadius: 10,
            border: `1px solid ${speakerMode === "human" ? "#7fd7ff" : "#222"}`,
            background: speakerMode === "human" ? "rgba(127,215,255,0.12)" : "#090909",
            color: speakerMode === "human" ? "#bfefff" : "#8a8a8a",
            fontFamily: "monospace",
            fontSize: 10,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          Human
        </button>
      </div>

      <textarea
        value={text}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type what the speaker should say..."
        rows={3}
        style={{
          width: "100%",
          minHeight: 74,
          resize: "vertical",
          borderRadius: 10,
          border: "1px solid #222",
          background: "#090909",
          color: "#d7ffd7",
          fontFamily: "monospace",
          fontSize: 13,
          padding: 8,
          lineHeight: 1.5,
        }}
      />

      <div style={{ color: "#7a7a7a", fontSize: 10, lineHeight: 1.4 }}>
        This stage picks the payload before the voice pipeline begins.
      </div>
    </PipelineShell>
  );
}

function ProfileStage({
  savedProfiles,
  selectedProfileId,
  onProfileChange,
  onLoadProfile,
  onCopyProfile,
}) {
  const selectedProfile =
    savedProfiles.find((profile) => profile.id === selectedProfileId) || savedProfiles[0] || null;

  const profileOptions = savedProfiles.map((profile) => ({
    label: profile.label,
    value: profile.id,
    textValue: `${profile.label} ${profile.description} ${profile.id}`,
  }));

  return (
    <PipelineShell
      title="[|[|\/| PROFILE"
      accent="#d9b45b"
      subtitle="immutable + wip"
      style={{ minHeight: 0, height: "100%", width: "100%", maxWidth: 280 }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr)",
          gap: 10,
          alignItems: "start",
        }}
      >
        <div
          style={{
            display: "grid",
            gap: 6,
            padding: 6,
            borderRadius: 12,
            border: "1px solid #222",
            background: "#090909",
            minHeight: 0,
            width: "100%",
          }}
        >
          <div style={{ display: "grid", gap: 6 }}>
            {profileOptions.length ? (
              <WheelPickerWrapper className="w-full max-w-[230px] min-w-[170px] rounded-[10px] border border-[#202020] bg-transparent px-0 py-0 shadow-none">
                <WheelPicker
                  value={selectedProfile?.id || selectedProfileId}
                  onValueChange={(value) => onProfileChange(value)}
                  options={profileOptions}
                  classNames={{
                    optionItem: "whitespace-nowrap text-[13px]",
                    highlightItem: "whitespace-nowrap text-[13px]",
                  }}
                  visibleCount={5}
                  optionItemHeight={28}
                  infinite
                />
              </WheelPickerWrapper>
            ) : (
              <div
                style={{
                  padding: 8,
                  borderRadius: 10,
                  border: "1px dashed #222",
                  color: "#7a7a7a",
                  fontSize: 10,
                  lineHeight: 1.35,
                }}
              >
                No saved profiles yet.
              </div>
            )}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gap: 4,
            padding: 6,
            borderRadius: 12,
            border: "1px solid #222",
            background: "#070707",
            color: "#c7c7c7",
            fontSize: 9,
            lineHeight: 1.3,
            minHeight: 0,
            width: "100%",
          }}
        >
          <div style={{ color: "#d9b45b", letterSpacing: "0.08em", textTransform: "uppercase", fontSize: 9 }}>
            Data Sheet
          </div>
          <div style={{ color: "#9bdcff" }}>Selected: {selectedProfile?.label || "None"}</div>
          <div style={{ color: "#7a7a7a" }}>
            {selectedProfile?.description || "Pick a saved voice profile to load."}
          </div>
          <div style={{ color: "#7a7a7a" }}>
            Model: {selectedProfile?.modelMode || "tts"} / {selectedProfile?.language || "en-US"}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => onCopyProfile(selectedProfile?.id || selectedProfileId)}
              disabled={!selectedProfile}
              style={{
                padding: "4px 7px",
                background: selectedProfile ? "#101010" : "#070707",
                color: selectedProfile ? "#a9d0ff" : "#4a4a4a",
                border: `1px solid ${selectedProfile ? "rgba(127,215,255,0.25)" : "#222"}`,
                borderRadius: 8,
                cursor: selectedProfile ? "pointer" : "not-allowed",
                fontFamily: "monospace",
                fontSize: 8,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Copy Immutable
            </button>
          </div>
        </div>
      </div>
    </PipelineShell>
  );
}

export default function VoiceFlowPanel({
  defaultProfileId = "jenna-jacket",
  compact = false,
} = {}) {
  const [libraryVersion, setLibraryVersion] = useState(0);
  const savedProfiles = useMemo(() => getAllVoiceProfiles(), [libraryVersion]);
  const baseSavedProfiles = useMemo(() => getBaseVoiceProfiles(), []);
  const baseProfileIds = useMemo(
    () => new Set(baseSavedProfiles.map((profile) => profile.id)),
    [baseSavedProfiles],
  );
  const savedCustomProfiles = useMemo(
    () => savedProfiles.filter((profile) => !baseProfileIds.has(profile.id)),
    [baseProfileIds, savedProfiles],
  );
  const [speakText, setSpeakText] = useState(DEFAULT_SPEAK_TEXT);
  const [selectedProfileId, setSelectedProfileId] = useState(defaultProfileId);
  const [selectedModelProfileId, setSelectedModelProfileId] = useState(defaultProfileId);
  const [ttsRate, setTtsRate] = useState(() => String(resolveVoiceProfile(defaultProfileId).ttsRate ?? 0));
  const [ttsPitch, setTtsPitch] = useState(() => String(resolveVoiceProfile(defaultProfileId).ttsPitch ?? 0));
  const [ttsVolume, setTtsVolume] = useState(() => String(resolveVoiceProfile(defaultProfileId).ttsVolume ?? 0));
  const [presetName, setPresetName] = useState(
    () => `${resolveVoiceProfile(defaultProfileId).label || DEFAULT_PRESET_NAME} Copy`,
  );
  const [saveStatus, setSaveStatus] = useState("idle");
  const [modelMode, setModelMode] = useState(
    () => resolveVoiceProfile(defaultProfileId).modelMode || DEFAULT_MODEL_MODE,
  );
  const [language, setLanguage] = useState(
    () => resolveVoiceProfile(defaultProfileId).language || DEFAULT_LANGUAGE,
  );
  const [languageVoice, setLanguageVoice] = useState(() =>
    pickLanguageVoice(
      resolveVoiceProfile(defaultProfileId).language || DEFAULT_LANGUAGE,
      resolveVoiceProfile(defaultProfileId).browserVoice,
    ),
  );
  const [profileSpeakMode, setProfileSpeakMode] = useState(
    () => resolveVoiceProfile(defaultProfileId).speakMode || "conversation",
  );
  const [speakerMode, setSpeakerMode] = useState(
    () => resolveVoiceProfile(defaultProfileId).speakerMode || "auto",
  );
  const [modelProfile, setModelProfile] = useState(() =>
    resolveVoiceProfile(defaultProfileId),
  );
  const [tunedProfile, setTunedProfile] = useState(null);
  const stripCopySuffix = (value) =>
    String(value || "")
      .replace(/(?:\s+copy)+$/i, "")
      .trim();

  const activeProfile = useMemo(
    () => tunedProfile || modelProfile || resolveVoiceProfile(selectedProfileId),
    [modelProfile, selectedProfileId, tunedProfile],
  );

  const [voiceGridLayout, setVoiceGridLayout] = useState(() => [
    { i: "profile", x: 0, y: 0, w: 4, h: 14, minW: 4, minH: 12, isResizable: true, isDraggable: true },
    { i: "model", x: 4, y: 0, w: 8, h: 14, minW: 6, minH: 12, isResizable: true, isDraggable: true },
  ]);

  useEffect(() => {
    const next = resolveVoiceProfile(defaultProfileId);
    setSelectedProfileId(next.id);
    setSelectedModelProfileId(next.id);
    setModelProfile(next);
    setTunedProfile(null);
    setPresetName(`${next.label || DEFAULT_PRESET_NAME} Copy`);
    setModelMode(next.modelMode || DEFAULT_MODEL_MODE);
    setLanguage(next.language || DEFAULT_LANGUAGE);
    setLanguageVoice(pickLanguageVoice(next.language || DEFAULT_LANGUAGE, next.browserVoice));
    setProfileSpeakMode(next.speakMode || "conversation");
    setSpeakerMode(next.speakerMode || "auto");
    setTtsRate(String(next.ttsRate ?? 0));
    setTtsPitch(String(next.ttsPitch ?? 0));
    setTtsVolume(String(next.ttsVolume ?? 0));
    setSaveStatus("idle");
  }, [defaultProfileId]);

  useEffect(() => {
    setLanguageVoice((current) => pickLanguageVoice(language, current));
  }, [language]);

  const handleSavePreset = () => {
    const sourceProfile = modelProfile || resolveVoiceProfile(selectedProfileId);
    const nextPreset = saveVoiceProfilePreset({
      id: presetName || sourceProfile.id,
      label: presetName || sourceProfile.label,
      description: `Saved preset tuned from ${sourceProfile.label}.`,
      browserVoice: sourceProfile.browserVoice,
      nativeVoice: sourceProfile.nativeVoice,
      forceNativeTTS: sourceProfile.forceNativeTTS,
      modelMode,
      language,
      speakMode: profileSpeakMode,
      speakerMode,
      rate: sourceProfile.rate,
      pitch: sourceProfile.pitch,
      volume: sourceProfile.volume,
      ttsRate: Number(ttsRate),
      ttsPitch: Number(ttsPitch),
      ttsVolume: Number(ttsVolume),
      browserVoice: languageVoice || sourceProfile.browserVoice,
      effect: sourceProfile.effect || "",
      aliases: sourceProfile.aliases || [],
    });

      setTunedProfile(nextPreset);
      setModelProfile(nextPreset);
      setSelectedProfileId(nextPreset.id);
      setLanguageVoice(pickLanguageVoice(language, nextPreset.browserVoice));
      setPresetName(`${nextPreset?.label || presetName || DEFAULT_PRESET_NAME} Copy`);
      setSaveStatus(`saved ${nextPreset?.label || presetName || DEFAULT_PRESET_NAME}`);
      setLibraryVersion((version) => version + 1);
  };

  const handleDiscardPreset = () => {
    const sourceProfile = resolveVoiceProfile(selectedProfileId);
    setTunedProfile(null);
    setModelProfile(sourceProfile);
    setPresetName(`${sourceProfile.label || DEFAULT_PRESET_NAME} Copy`);
    setModelMode(sourceProfile.modelMode || DEFAULT_MODEL_MODE);
    setLanguage(sourceProfile.language || DEFAULT_LANGUAGE);
    setLanguageVoice(pickLanguageVoice(sourceProfile.language || DEFAULT_LANGUAGE, sourceProfile.browserVoice));
    setProfileSpeakMode(sourceProfile.speakMode || "conversation");
    setSpeakerMode(sourceProfile.speakerMode || "auto");
    setTtsRate(String(sourceProfile.ttsRate ?? 0));
    setTtsPitch(String(sourceProfile.ttsPitch ?? 0));
    setTtsVolume(String(sourceProfile.ttsVolume ?? 0));
    setSaveStatus(`threw out draft from ${sourceProfile.label || sourceProfile.id}`);
  };

  const handleLoadProfile = (profileId) => {
    const sourceProfile = resolveVoiceProfile(profileId || selectedProfileId);
    setSelectedProfileId(sourceProfile.id);
    setTunedProfile(null);
    setModelProfile(sourceProfile);
    setPresetName(`${sourceProfile.label || DEFAULT_PRESET_NAME} Copy`);
    setModelMode(sourceProfile.modelMode || DEFAULT_MODEL_MODE);
    setLanguage(sourceProfile.language || DEFAULT_LANGUAGE);
    setLanguageVoice(pickLanguageVoice(sourceProfile.language || DEFAULT_LANGUAGE, sourceProfile.browserVoice));
    setProfileSpeakMode(sourceProfile.speakMode || "conversation");
    setSpeakerMode(sourceProfile.speakerMode || "auto");
    setTtsRate(String(sourceProfile.ttsRate ?? 0));
    setTtsPitch(String(sourceProfile.ttsPitch ?? 0));
    setTtsVolume(String(sourceProfile.ttsVolume ?? 0));
    setSaveStatus(`loaded ${sourceProfile.label || sourceProfile.id}`);
  };

  const handleCopyProfile = (profileId) => {
    const sourceProfile = resolveVoiceProfile(profileId || selectedProfileId);
    const copyLabelBase = stripCopySuffix(sourceProfile.label || DEFAULT_PRESET_NAME);
    const copiedProfile = saveVoiceProfilePreset({
      id: `${sourceProfile.id}-copy`,
      label: `${copyLabelBase} Copy`,
      description: `Immutable copy of ${sourceProfile.label || sourceProfile.id}.`,
      browserVoice: sourceProfile.browserVoice,
      nativeVoice: sourceProfile.nativeVoice,
      forceNativeTTS: sourceProfile.forceNativeTTS,
      modelMode: sourceProfile.modelMode || DEFAULT_MODEL_MODE,
      language: sourceProfile.language || DEFAULT_LANGUAGE,
      speakMode: sourceProfile.speakMode || "conversation",
      speakerMode: sourceProfile.speakerMode || "auto",
      rate: sourceProfile.rate,
      pitch: sourceProfile.pitch,
      volume: sourceProfile.volume,
      ttsRate: Number(sourceProfile.ttsRate ?? 0),
      ttsPitch: Number(sourceProfile.ttsPitch ?? 0),
      ttsVolume: Number(sourceProfile.ttsVolume ?? 0),
      effect: sourceProfile.effect || "",
      aliases: sourceProfile.aliases || [],
    });

      setTunedProfile(copiedProfile);
      setModelProfile(copiedProfile);
      setSelectedProfileId(copiedProfile.id);
      setLanguageVoice(pickLanguageVoice(copiedProfile.language || DEFAULT_LANGUAGE, copiedProfile.browserVoice));
      setPresetName(`${copyLabelBase} Copy`);
      setSaveStatus(`copied ${copiedProfile?.label || sourceProfile.label || sourceProfile.id}`);
      setLibraryVersion((version) => version + 1);
  };

  return (
    <div
      style={{
        width: "100%",
        minHeight: compact ? 720 : 820,
        height: compact ? 720 : 820,
        borderRadius: 20,
        border: "1px solid rgba(0,255,102,0.18)",
        overflow: "hidden",
        background: "rgba(0,0,0,0.96)",
      }}
    >
      <div
        style={{
          height: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 14px",
          color: "#7a7a7a",
          fontSize: 10,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <span>{"Speak -> Profile -> Model -> Tuner -> Player"}</span>
        <span>{activeProfile?.label || "MODEL"}</span>
      </div>

      <div
        style={{
          height: "calc(100% - 40px)",
          overflowY: "auto",
          padding: 12,
        }}
      >
        <div style={{ minHeight: 0 }}>
          <VoiceGrid layout={voiceGridLayout} onLayoutChange={setVoiceGridLayout}>
            <div key="profile" style={{ minHeight: 0, height: "100%" }}>
              <ProfileStage
                savedProfiles={savedProfiles}
                selectedProfileId={selectedProfileId}
                onProfileChange={setSelectedProfileId}
                onLoadProfile={handleLoadProfile}
                onCopyProfile={handleCopyProfile}
              />
            </div>

            <div key="model" style={{ minHeight: 0, height: "100%" }}>
              <VoiceTunerCard
                compact
                mode="model"
                defaultProfileId={selectedModelProfileId}
                selectedProfileId={selectedModelProfileId}
                onProfileChange={setSelectedModelProfileId}
                onPreviewChange={setModelProfile}
                modelMode={modelMode}
                onModelModeChange={setModelMode}
                language={language}
                onLanguageChange={setLanguage}
                languageVoice={languageVoice}
                onLanguageVoiceChange={setLanguageVoice}
                speakMode={profileSpeakMode}
                speakerMode={speakerMode}
                style={{
                  height: "100%",
                  border: "none",
                  boxShadow: "none",
                  background: "transparent",
                }}
              />
            </div>
          </VoiceGrid>
        </div>
      </div>
    </div>
  );
}

function VoiceGrid({ layout, onLayoutChange, children }) {
  const { width, containerRef, mounted } = useContainerWidth();
  const resizeHandle = (_, ref) => (
    <div
      ref={ref}
      aria-hidden="true"
      style={{
        position: "absolute",
        right: 2,
        bottom: 2,
        width: 18,
        height: 18,
        borderRight: "2px solid rgba(127,215,255,0.9)",
        borderBottom: "2px solid rgba(127,215,255,0.9)",
        borderRadius: "0 0 4px 0",
        background:
          "linear-gradient(135deg, transparent 42%, rgba(127,215,255,0.18) 43%, rgba(127,215,255,0.18) 57%, transparent 58%)",
        cursor: "se-resize",
        pointerEvents: "auto",
        opacity: 0.95,
      }}
    />
  );

  return (
    <div ref={containerRef} style={{ width: "100%" }}>
      {mounted ? (
        <ReactGridLayout
          width={width}
          layout={layout}
          onLayoutChange={onLayoutChange}
          gridConfig={{
            cols: 12,
            rowHeight: 24,
            margin: [12, 12],
            containerPadding: [0, 0],
          }}
          dragConfig={{ enabled: true, handle: ".voice-card-handle" }}
          resizeConfig={{ enabled: true, handles: ["se"], handleComponent: resizeHandle }}
          compactor={noCompactor}
          style={{ width: "100%" }}
        >
          {children}
        </ReactGridLayout>
      ) : null}
    </div>
  );
}
