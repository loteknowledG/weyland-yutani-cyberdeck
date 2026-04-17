import React, { useEffect, useMemo, useRef, useState } from "react";
import { canUseRemoteTts, requestRemoteTtsAudioUrl } from "../lib/tts";
import { resolveVoiceProfile } from "../lib/voiceProfiles";

const DEFAULT_SAMPLE = "Hello, this is your cyberdeck speaking. Adjust the voice wheel and listen.";

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
      <path d="M8 5v14l11-7z" fill="currentColor" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
      <rect x="6" y="6" width="12" height="12" rx="1.5" fill="currentColor" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
      <rect x="6" y="5" width="4" height="14" rx="1.2" fill="currentColor" />
      <rect x="14" y="5" width="4" height="14" rx="1.2" fill="currentColor" />
    </svg>
  );
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function normalizeVoiceName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function waitForSpeechVoices(synth, timeoutMs = 800) {
  return new Promise((resolve) => {
    const initialVoices = synth.getVoices?.() || [];
    if (initialVoices.length > 0) {
      resolve(initialVoices);
      return;
    }

    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      synth.removeEventListener?.("voiceschanged", finish);
      resolve(synth.getVoices?.() || []);
    };

    const timer = window.setTimeout(finish, timeoutMs);
    synth.addEventListener?.("voiceschanged", finish, { once: true });
  });
}

function pickBrowserVoice(voices, profile) {
  const candidateValues = [
    profile?.nativeVoice,
    profile?.browserVoice,
    profile?.label,
    profile?.id,
  ]
    .filter(Boolean)
    .map(normalizeVoiceName);

  for (const voice of voices) {
    const voiceName = normalizeVoiceName(voice?.name);
    const voiceUri = normalizeVoiceName(voice?.voiceURI);
    if (
      candidateValues.includes(voiceName) ||
      candidateValues.includes(voiceUri)
    ) {
      return voice;
    }
  }

  for (const voice of voices) {
    const voiceName = normalizeVoiceName(voice?.name);
    const voiceUri = normalizeVoiceName(voice?.voiceURI);
    if (
      candidateValues.some(
        (candidate) =>
          candidate &&
          (voiceName.includes(candidate) ||
            voiceUri.includes(candidate) ||
            candidate.includes(voiceName) ||
            candidate.includes(voiceUri)),
      )
    ) {
      return voice;
    }
  }

  return voices[0] || null;
}

export default function VoiceCard({
  title = "VOICE CARD",
  accent = "#9bff9b",
  sampleText = DEFAULT_SAMPLE,
  profileOverride = null,
  defaultProfile = "jenna-jacket",
  previewOnProfileChange = false,
  showTextInput = true,
  compact = false,
  style = {},
} = {}) {
  const [text, setText] = useState(sampleText);
  const [selectedVoiceProfileId, setSelectedVoiceProfileId] = useState(defaultProfile);
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [status, setStatus] = useState("idle");
  const [volume, setVolume] = useState(100);
  const [availableVoices, setAvailableVoices] = useState(() =>
    typeof window !== "undefined" && window.speechSynthesis
      ? window.speechSynthesis.getVoices() || []
      : [],
  );
  const audioRef = useRef(null);
  const utteranceRef = useRef(null);
  const selectedProfileIdRef = useRef(null);
  const speakTokenRef = useRef(0);

  const selectedProfile = useMemo(
    () => profileOverride || resolveVoiceProfile(selectedVoiceProfileId),
    [profileOverride, selectedVoiceProfileId],
  );

  useEffect(() => {
    const profile = resolveVoiceProfile(defaultProfile);
    setSelectedVoiceProfileId(profile.id);
  }, [defaultProfile]);

  useEffect(() => {
    if (!profileOverride?.id) return;
    setSelectedVoiceProfileId(profileOverride.id);
  }, [profileOverride?.id]);

  useEffect(() => {
    if (selectedProfileIdRef.current === null) {
      selectedProfileIdRef.current = selectedProfile.id;
      return;
    }

    if (selectedProfileIdRef.current === selectedProfile.id) return;

    selectedProfileIdRef.current = selectedProfile.id;
    const shouldRestart =
      previewOnProfileChange ||
      speaking ||
      paused ||
      status === "loading" ||
      status === "speaking";

    const currentText = text.trim();
    if (!currentText) {
      stop();
      return;
    }

    if (!shouldRestart) return;

    stop();
    const timer = window.setTimeout(() => {
      void speak();
    }, 0);

    return () => window.clearTimeout(timer);
    // We intentionally key off the selected profile change only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewOnProfileChange, paused, speaking, status, text, selectedProfile.id]);

  useEffect(() => {
    setText(sampleText);
  }, [sampleText]);

  useEffect(() => {
    if (!window.speechSynthesis) return;

    const synth = window.speechSynthesis;
    const updateVoices = () => {
      setAvailableVoices(synth.getVoices() || []);
    };

    updateVoices();
    synth.addEventListener?.("voiceschanged", updateVoices);

    return () => {
      synth.removeEventListener?.("voiceschanged", updateVoices);
    };
  }, []);

  const stop = () => {
    speakTokenRef.current += 1;
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audio.src = "";
      audioRef.current = null;
    }

    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    setSpeaking(false);
    setPaused(false);
    setStatus("idle");
  };

  const pause = () => {
    const audio = audioRef.current;
    if (audio && !audio.paused) {
      audio.pause();
      setPaused(true);
      setSpeaking(true);
      setStatus("paused");
      return;
    }

    if (window.speechSynthesis?.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause();
      setPaused(true);
      setSpeaking(true);
      setStatus("paused");
    }
  };

  const resume = () => {
    const audio = audioRef.current;
    if (audio && audio.paused && !audio.ended) {
      void audio.play();
      setPaused(false);
      setSpeaking(true);
      setStatus("speaking");
      return;
    }

    if (window.speechSynthesis?.paused) {
      window.speechSynthesis.resume();
      setPaused(false);
      setSpeaking(true);
      setStatus("speaking");
    }
  };

  const toggleSpeak = () => {
    if (speaking && !paused) {
      pause();
      return;
    }

    if (paused) {
      resume();
      return;
    }

    void speak();
  };

  const playBrowserFallback = async () => {
    const token = speakTokenRef.current;
    if (!window.speechSynthesis) {
      throw new Error("Browser speech unavailable");
    }

    const synth = window.speechSynthesis;
    const voices =
      availableVoices.length > 0
        ? availableVoices
        : await waitForSpeechVoices(synth);
    const fallbackVoice = pickBrowserVoice(voices, selectedProfile);

    synth.cancel();
    const utter = new window.SpeechSynthesisUtterance(text);
    utteranceRef.current = utter;
    if (fallbackVoice) utter.voice = fallbackVoice;
    utter.rate = selectedProfile.rate ?? 1;
    utter.pitch = selectedProfile.pitch ?? 1;
    utter.volume = clamp01(volume / 100);
    utter.onstart = () => {
      if (token !== speakTokenRef.current) return;
      setSpeaking(true);
      setPaused(false);
      setStatus("speaking");
    };
    utter.onpause = () => {
      if (token !== speakTokenRef.current) return;
      setPaused(true);
      setStatus("paused");
    };
    utter.onresume = () => {
      if (token !== speakTokenRef.current) return;
      setPaused(false);
      setStatus("speaking");
    };
    utter.onend = () => {
      if (token !== speakTokenRef.current) return;
      setSpeaking(false);
      setPaused(false);
      setStatus("idle");
    };
    utter.onerror = () => {
      if (token !== speakTokenRef.current) return;
      setSpeaking(false);
      setPaused(false);
      setStatus("error");
    };
    synth.speak(utter);
  };

  const playRemoteTts = async () => {
    const token = speakTokenRef.current;
    const audioUrl = await requestRemoteTtsAudioUrl({
      text,
      voice: selectedProfile.browserVoice,
      rate: selectedProfile.ttsRate ?? 0,
      pitch: selectedProfile.ttsPitch ?? 0,
    });

    if (token !== speakTokenRef.current) return;

    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    audio.volume = clamp01(volume / 100);

    audio.onplay = () => {
      if (token !== speakTokenRef.current) return;
      setSpeaking(true);
      setPaused(false);
      setStatus("speaking");
    };
    audio.onpause = () => {
      if (token !== speakTokenRef.current) return;
      if (audio.currentTime > 0 && !audio.ended) {
        setPaused(true);
        setStatus("paused");
      }
    };
    audio.onended = () => {
      if (token !== speakTokenRef.current) return;
      setSpeaking(false);
      setPaused(false);
      setStatus("idle");
      audioRef.current = null;
    };
    audio.onerror = () => {
      if (token !== speakTokenRef.current) return;
      setSpeaking(false);
      setPaused(false);
      setStatus("error");
      audioRef.current = null;
    };

    await audio.play();
  };

  const speak = async () => {
    if (!text.trim()) return;
    stop();
    const token = speakTokenRef.current;
    setStatus("loading");

    try {
      if (token !== speakTokenRef.current) return;
      if (!selectedProfile.forceNativeTTS && canUseRemoteTts()) {
        await playRemoteTts();
        return;
      }
      await playBrowserFallback();
    } catch (error) {
      console.error("VOICE_TTS_ERROR", error);
      if (token !== speakTokenRef.current) return;
      setStatus("error");
      setSpeaking(false);
      setPaused(false);
      if (!selectedProfile.forceNativeTTS) {
        try {
          await playBrowserFallback();
        } catch (fallbackError) {
          console.error("VOICE_FALLBACK_ERROR", fallbackError);
          setStatus("error");
        }
      }
    }
  };

  const profileHint =
    selectedProfile.description ||
    (selectedProfile.effect ? `Effect: ${selectedProfile.effect}` : "");

  const shellStyle = {
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
  };

  return (
    <div style={shellStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <div style={{ color: accent, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase" }}>
          {title}
        </div>
        <div style={{ fontSize: 10, color: "#7a7a7a" }} />
      </div>

      {showTextInput ? (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type something to speak..."
          rows={compact ? 2 : 3}
          style={{
            width: "100%",
            fontFamily: "monospace",
            fontSize: 13,
            padding: 8,
            borderRadius: 10,
            border: "1px solid #222",
            resize: "vertical",
            background: "#090909",
            color: "#d7ffd7",
            minHeight: compact ? 44 : 72,
          }}
        />
      ) : (
        <div
          style={{
            width: "100%",
            minHeight: compact ? 44 : 72,
            borderRadius: 10,
            border: "1px solid #222",
            background: "#090909",
            color: "#7a7a7a",
            fontFamily: "monospace",
            fontSize: 11,
            padding: 10,
            lineHeight: 1.4,
          }}
        >
          Speak text is sourced upstream. The player only performs it.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 11, color: "#ccc" }}>
          <div style={{ flex: "1 1 100%", color: "#8a8a8a", fontSize: 11 }}>
            Voice status: {status} {speaking ? "(active)" : ""}
          </div>
        </div>
      </div>

      {compact ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 6, color: "#7a7a7a", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Volume
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              aria-label="Volume"
              style={{
                width: "100%",
                accentColor: accent,
                cursor: "pointer",
              }}
            />
          </label>
          <button
            onClick={toggleSpeak}
            disabled={!text.trim() || status === "loading"}
            aria-label={speaking && !paused ? "Pause" : paused ? "Resume" : "Speak"}
            style={{
              width: "100%",
              border: `1px solid ${speaking || paused ? "#ff4d4d55" : `${accent}55`}`,
              background: "rgba(0,0,0,0.85)",
              color: speaking && !paused ? "#ff9b9b" : accent,
              cursor: "pointer",
              fontSize: 12,
              lineHeight: 1,
              padding: "10px 12px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              borderRadius: 10,
              fontFamily: "monospace",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            {speaking && !paused ? <PauseIcon /> : <PlayIcon />}
            <span>{speaking && !paused ? "Pause" : paused ? "Resume" : "Play"}</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
