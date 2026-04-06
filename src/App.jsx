import { useState, useEffect, useRef } from 'react'

// --- MU/TH/UR 6000 CORE ENGINE ---
let audioCtx = null;
let masterGain = null;
let lastPlayTime = 0;

const art = {
  popped: (id) => ` ┌───┐\n │ ${id.toUpperCase()} │▒\n └───┘▒\n  ▒▒▒▒▒`,
  pushed: (id) => `\n ┌───┐\n │ ${id.toUpperCase()} │\n └───┘`
};

const setupAudio = () => {
  if (audioCtx && audioCtx.state !== 'closed') {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return;
  }
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const bufferSize = 2 * audioCtx.sampleRate;
    const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) output[i] = (Math.random() * 2 - 1) * 0.4;
    
    const noiseSource = audioCtx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(0, audioCtx.currentTime);

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1100;

    noiseSource.connect(filter);
    filter.connect(masterGain);
    masterGain.connect(audioCtx.destination);
    noiseSource.start();
  } catch (e) { console.error("AUDIO_ERR", e); }
};

const playSystemSound = (type = 'click', vol = 0.08) => {
  if (!audioCtx) setupAudio();
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  
  const now = audioCtx.currentTime;
  if (type === 'click' && masterGain) {
    // Prevent overlapping that sounds like static
    if (now - lastPlayTime < 0.05) return; 
    lastPlayTime = now;
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.setTargetAtTime(vol, now, 0.001);
    masterGain.gain.setTargetAtTime(0, now + 0.015, 0.01);
  } else if (type === 'chirp') {
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
    g.gain.setValueAtTime(0.04, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
    osc.connect(g); g.connect(audioCtx.destination);
    osc.start(); osc.stop(now + 0.1);
  }
};

export default function App() {
  const [booted, setBooted] = useState(false);
  const [server, setServer] = useState('m');
  const [chan, setChan] = useState('general');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [modelList, setModelList] = useState([]);
  const [activeProvider, setActiveProvider] = useState(localStorage.getItem('active_provider') || 'openrouter');
  const [keys, setKeys] = useState({
    openrouter: localStorage.getItem('key_openrouter') || '',
    openai: localStorage.getItem('key_openai') || ''
  });
  const [modelID, setModelID] = useState(localStorage.getItem('ascii_model') || 'google/gemini-2.0-flash-exp:free');

  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { if (booted && inputRef.current) inputRef.current.focus(); }, [booted, chan, server]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    const fetchModels = async () => {
      const currentKey = keys[activeProvider];
      if (!booted || !currentKey) return;
      try {
        const url = activeProvider === 'openrouter' ? 'https://openrouter.ai/api/v1/models' : 'https://api.openai.com/v1/models';
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${currentKey}` } });
        const data = await res.json();
        if (data.data) {
          const sorted = data.data.sort((a, b) => {
            const aFree = a.id.toLowerCase().includes('free');
            const bFree = b.id.toLowerCase().includes('free');
            if (aFree && !bFree) return -1;
            if (!aFree && bFree) return 1;
            return 0;
          });
          setModelList(sorted.slice(0, 100));
        }
      } catch (e) { console.error("FETCH_ERR", e); }
    };
    fetchModels();
  }, [activeProvider, booted, keys]);

  const handleSend = async (e) => {
    if (e.key !== 'Enter' || !input.trim()) return;
    playSystemSound('click', 0.15); // Harder click for Enter
    const val = input.trim();
    setInput('');

    if (chan === 'providers') {
      const newKeys = { ...keys, [activeProvider]: val };
      setKeys(newKeys);
      localStorage.setItem(`key_${activeProvider}`, val);
      playSystemSound('chirp');
      setMessages(p => [...p, { role: 'SYS', text: `KEY REGISTERED FOR ${activeProvider.toUpperCase()}` }]);
      return;
    }

    setMessages(p => [...p, { role: 'USER', text: val }]);
    const currentKey = keys[activeProvider];
    if (!currentKey) return setMessages(p => [...p, { role: 'SYS', text: "ERROR: KEY MISSING" }]);

    const aiId = Date.now();
    setMessages(p => [...p, { role: 'AI', text: '', id: aiId }]);

    try {
      const isOR = activeProvider === 'openrouter';
      const response = await fetch(isOR ? 'https://openrouter.ai/api/v1/chat/completions' : 'https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${currentKey}`,
          ...(isOR ? { 'HTTP-Referer': window.location.href, 'X-Title': 'MUTHUR' } : {})
        },
        body: JSON.stringify({ model: modelID, messages: [{ role: 'user', content: val }], stream: true })
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";
      let streamBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        streamBuffer += decoder.decode(value, { stream: true });
        const lines = streamBuffer.split('\n');
        streamBuffer = lines.pop();

        for (const line of lines) {
          const cleaned = line.replace(/^data: /, "").trim();
          if (!cleaned || cleaned === "[DONE]") continue;
          try {
            const parsed = JSON.parse(cleaned);
            const content = parsed.choices[0]?.delta?.content || "";
            if (content) {
              fullContent += content;
              // TRIGGER SOUND PER CHARACTER CHUNK
              playSystemSound('click', 0.05); 
              setMessages(p => p.map(m => m.id === aiId ? { ...m, text: fullContent } : m));
            }
          } catch (e) {}
        }
      }
    } catch (err) {
      setMessages(p => [...p, { role: 'SYS', text: `UPLINK ERR: ${err.message}` }]);
    }
  };

  if (!booted) {
    return (
      <div onClick={() => { setupAudio(); setBooted(true); }} style={{ height: '100vh', backgroundColor: '#000', color: '#00ff00', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontFamily: 'monospace' }}>
        <pre>{`[ WEYLAND-YUTANI CORP ]\n[ MU/TH/UR 6000 ]\n\n>> INITIALIZE UPLINK <<`}</pre>
      </div>
    );
  }

  return (
    <div 
      onClick={() => { if (audioCtx?.state === 'suspended') audioCtx.resume(); }}
      style={{ backgroundColor: '#000', color: '#00ff00', height: '100vh', display: 'flex', fontFamily: 'monospace', overflow: 'hidden', fontSize: '14px' }}
    >
      <div style={{ width: '80px', borderRight: '1px solid #1a1a1a', padding: '10px' }}>
        {['m', 's'].map(id => (
          <div key={id} onClick={() => { setServer(id); setChan(id === 'm' ? 'general' : 'providers'); playSystemSound('chirp'); }} style={{ marginBottom: '20px', cursor: 'pointer' }}>
            <pre style={{ margin: 0, color: server === id ? '#00ff00' : '#222' }}>{server === id ? art.pushed(id) : art.popped(id)}</pre>
          </div>
        ))}
      </div>

      <div style={{ width: '240px', borderRight: '1px solid #1a1a1a', padding: '20px 10px', overflowY: 'auto' }}>
        <div style={{ color: '#444', fontSize: '10px', marginBottom: '10px' }}>{server === 'm' ? 'MAIN_NET' : 'SYSTEM_RESOURCES'}</div>
        {server === 'm' ? (
          ['general', 'intel', 'logs'].map(c => (
            <div key={c} onClick={() => { setChan(c); playSystemSound('click'); }} style={{ cursor: 'pointer', color: chan === c ? '#00ff00' : '#333', padding: '8px 0' }}>{chan === c ? '> ' : '# '}{c.toUpperCase()}</div>
          ))
        ) : (
          <>
            <div onClick={() => { setChan('providers'); playSystemSound('click'); }} style={{ cursor: 'pointer', color: chan === 'providers' ? '#00ff00' : '#333', padding: '8px 0' }}># GATEWAY_KEYS</div>
            {['openrouter', 'openai'].map(p => (
              <div key={p} onClick={() => { setActiveProvider(p); localStorage.setItem('active_provider', p); playSystemSound('chirp'); }} style={{ cursor: 'pointer', color: activeProvider === p ? '#00ff00' : '#222', padding: '5px 0' }}>{activeProvider === p ? '[X] ' : '[ ] '}{p.toUpperCase()}</div>
            ))}
            <div style={{ marginTop: '20px', borderTop: '1px solid #111', paddingTop: '10px' }}>
              <div style={{ fontSize: '10px', color: '#444', marginBottom: '10px' }}>AVAILABLE_MODELS:</div>
              {modelList.map(m => (
                <div key={m.id} onClick={() => { setModelID(m.id); localStorage.setItem('ascii_model', m.id); playSystemSound('click'); }} 
                     style={{ 
                       cursor: 'pointer', 
                       color: modelID === m.id ? '#00ff00' : (m.id.includes('free') ? '#ffaa00' : '#222'), 
                       fontSize: '10px', 
                       padding: '4px 0', 
                       overflow: 'hidden', 
                       textOverflow: 'ellipsis', 
                       whiteSpace: 'nowrap' 
                     }}>
                  {m.id.split('/').pop()}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '20px' }}>
          <div style={{ color: '#111', fontSize: '10px', marginBottom: '20px' }}>STATION: {activeProvider?.toUpperCase()} // {modelID}</div>
          {messages.map((m, i) => (
            <div key={i} style={{ marginBottom: '15px' }}><span style={{ color: m.role === 'AI' ? '#00ff00' : '#444' }}>[{m.role}]</span> {m.text}</div>
          ))}
          <div ref={chatEndRef} />
        </div>
        <div style={{ display: 'flex', borderTop: '1px solid #1a1a1a', paddingTop: '15px' }}>
          <span style={{ marginRight: '10px' }}>{'>'}</span>
          <input 
            ref={inputRef} value={input} 
            onChange={(e) => { setInput(e.target.value); playSystemSound('click', 0.04); }} 
            onKeyDown={handleSend} placeholder="..." 
            style={{ background: 'none', border: 'none', color: '#00ff00', outline: 'none', flex: 1, fontFamily: 'monospace' }} 
          />
        </div>
      </div>
    </div>
  );
}