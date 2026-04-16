import React, { useEffect, useRef, useState } from 'react';

const builtInVoices = [
  { label: 'Default', value: '' },
  { label: 'Google US English', value: 'en-US' },
  { label: 'Microsoft Zira', value: 'Microsoft Zira Desktop - English (United States)' },
  { label: 'Microsoft David', value: 'Microsoft David Desktop - English (United States)' },
  { label: 'Mechanicus Voice', value: 'mechanicus-voice' },
  { label: 'Warp Spider', value: 'warp-spider' }
];

const DialControl = ({ label, value, min, max, step, onChange, color }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0' }}>
    <div style={{ width: 70, height: 70, borderRadius: '50%', border: `2px solid ${color}`, display: 'grid', placeItems: 'center', color, fontSize: 14, fontWeight: 700, background: '#090909' }}>
      {value.toFixed(1)}
    </div>
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#ccc' }}>{label}</div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange}
        style={{ width: '100%' }}
      />
      <div style={{ fontSize: 10, color: '#777' }}>{`${min} — ${max}`}</div>
    </div>
  </div>
);

export default function VoiceCard() {
  const [text, setText] = useState('');
  const [selectedVoice, setSelectedVoice] = useState('');
  const [voices, setVoices] = useState(builtInVoices);
  const [speaking, setSpeaking] = useState(false);
  const [rate, setRate] = useState(1.0);
  const [pitch, setPitch] = useState(1.0);
  const [volume, setVolume] = useState(0.9);
  const [status, setStatus] = useState('idle');
  const utterRef = useRef(null);

  useEffect(() => {
    if (!window.speechSynthesis) return;
    const updateVoices = () => {
      const available = window.speechSynthesis.getVoices();
      if (!available || available.length === 0) return;
      const voiceOptions = [
        ...builtInVoices,
        ...available
          .filter(v => v.name && !builtInVoices.some(b => b.value === v.name))
          .map(v => ({ label: `${v.name} (${v.lang})`, value: v.name }))
      ];
      setVoices(voiceOptions);
    };
    updateVoices();
    window.speechSynthesis.addEventListener('voiceschanged', updateVoices);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', updateVoices);
    };
  }, []);

  useEffect(() => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    const interval = setInterval(() => {
      if (synth.speaking) setStatus(synth.paused ? 'paused' : 'speaking');
      else if (status !== 'idle') setStatus('idle');
    }, 250);
    return () => clearInterval(interval);
  }, [status]);

  useEffect(() => {
    if (selectedVoice === 'mechanicus-voice') {
      setRate(0.92);
      setPitch(0.78);
      setVolume(0.92);
    } else if (selectedVoice === 'warp-spider') {
      setRate(1.18);
      setPitch(1.35);
      setVolume(0.9);
    }
  }, [selectedVoice]);

  const getVoice = () => {
    if (!window.speechSynthesis) return null;
    return voices.find(v => v.value && v.value === selectedVoice) || null;
  };

  const speak = () => {
    if (!window.speechSynthesis) return alert('Speech Synthesis not supported');
    if (!text.trim()) return;
    window.speechSynthesis.cancel();
    const utter = new window.SpeechSynthesisUtterance(text);
    const voiceOption = getVoice();
    if (voiceOption && voiceOption.value) {
      const selected = window.speechSynthesis.getVoices().find(v => v.name === voiceOption.value || v.lang === voiceOption.value);
      if (selected) utter.voice = selected;
    }
    utter.rate = rate;
    utter.pitch = pitch;
    utter.volume = volume;
    utter.onstart = () => {
      setSpeaking(true);
      setStatus('speaking');
      utterRef.current = utter;
    };
    utter.onpause = () => setStatus('paused');
    utter.onresume = () => setStatus('speaking');
    utter.onend = () => {
      setSpeaking(false);
      setStatus('idle');
      utterRef.current = null;
    };
    utter.onerror = () => {
      setSpeaking(false);
      setStatus('error');
      utterRef.current = null;
    };
    window.speechSynthesis.speak(utter);
  };

  const pause = () => {
    if (window.speechSynthesis?.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause();
      setStatus('paused');
    }
  };

  const resume = () => {
    if (window.speechSynthesis?.paused) {
      window.speechSynthesis.resume();
      setStatus('speaking');
    }
  };

  const stop = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      setStatus('idle');
      utterRef.current = null;
    }
  };

  const insertSample = () => {
    setText('Hello, this is your cyberdeck speaking. Adjust the voice dial and listen.');
  };

  const selectDefaultVoice = () => {
    setSelectedVoice(voices[0]?.value || '');
  };

  const getPresetHint = () => {
    if (selectedVoice === 'mechanicus-voice') return 'Mechanicus preset: ritual, low pitch, deliberate pace.';
    if (selectedVoice === 'warp-spider') return 'Warp Spider preset: fast, agile, phase-shifted tone.';
    return '';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '6px' }}>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Type something to speak..."
        rows={3}
        style={{ width: '100%', fontFamily: 'monospace', fontSize: 13, padding: 8, borderRadius: 10, border: '1px solid #222', resize: 'vertical', background: '#090909', color: '#d7ffd7' }}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ fontSize: 11, color: '#8fa' }}>Voice</label>
          <select
            value={selectedVoice}
            onChange={e => setSelectedVoice(e.target.value)}
            style={{ width: '100%', fontFamily: 'monospace', fontSize: 13, padding: 8, borderRadius: 10, border: '1px solid #222', background: '#111', color: '#d7ffd7' }}
          >
            {voices.map(v => (
              <option key={v.value || 'default'} value={v.value}>{v.label}</option>
            ))}
          </select>
          <div style={{ color: '#8a8a8a', fontSize: 11 }}>
            {selectedVoice ? `Voice selected: ${selectedVoice}` : 'Using default browser voice.'}
          </div>
          {getPresetHint() ? (
            <div style={{ color: '#8fbcff', fontSize: 10, marginTop: 4 }}>{getPresetHint()}</div>
          ) : null}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 10, borderRadius: 12, background: '#111' }}>
          <DialControl label="Rate" value={rate} min={0.5} max={2.0} step={0.05} onChange={e => setRate(Number(e.target.value))} color="#7ceaff" />
          <DialControl label="Pitch" value={pitch} min={0.5} max={2.0} step={0.05} onChange={e => setPitch(Number(e.target.value))} color="#9bff7a" />
          <DialControl label="Volume" value={volume} min={0.2} max={1.0} step={0.05} onChange={e => setVolume(Number(e.target.value))} color="#ffab4d" />
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <button onClick={speak} disabled={!text.trim()} style={{ flex: '1 1 120px', padding: '10px 16px', borderRadius: 10, background: '#00ff00', color: '#111', border: 'none', fontWeight: 700, cursor: 'pointer' }}>
          {status === 'speaking' ? 'Speaking...' : 'Speak'}
        </button>
        <button onClick={pause} disabled={!window.speechSynthesis?.speaking || window.speechSynthesis?.paused} style={{ flex: '1 1 120px', padding: '10px 16px', borderRadius: 10, background: '#444', color: '#fff', border: '1px solid #333', cursor: 'pointer' }}>
          Pause
        </button>
        <button onClick={resume} disabled={!window.speechSynthesis?.paused} style={{ flex: '1 1 120px', padding: '10px 16px', borderRadius: 10, background: '#444', color: '#fff', border: '1px solid #333', cursor: 'pointer' }}>
          Resume
        </button>
        <button onClick={stop} disabled={!window.speechSynthesis?.speaking && !window.speechSynthesis?.paused} style={{ flex: '1 1 120px', padding: '10px 16px', borderRadius: 10, background: '#ff4d4d', color: '#111', border: 'none', cursor: 'pointer' }}>
          Stop
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 11, color: '#ccc' }}>
        <button onClick={insertSample} style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid #333', background: '#141414', color: '#d7ffd7', cursor: 'pointer' }}>Insert sample text</button>
        <button onClick={selectDefaultVoice} style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid #333', background: '#141414', color: '#d7ffd7', cursor: 'pointer' }}>Select default voice</button>
        <div style={{ flex: '1 1 100%', color: '#8a8a8a', fontSize: 11 }}>Voice status: {status}</div>
      </div>
    </div>
  );
}
