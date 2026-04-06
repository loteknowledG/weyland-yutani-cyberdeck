import { useState, useEffect, useRef } from 'react'
import { setupAudio, playSystemSound, playLock } from './AudioEngine';
import { transmit } from './Uplink'; // Vite will automatically find .jsx
import { art, BOOT_LOGO } from './TerminalArt';
import { Memory } from './lib/memory';
import { db } from './lib/db';


export default function App() {
  const [booted, setBooted] = useState(false);
  const [server, setServer] = useState('m');
  const [chan, setChan] = useState('agenda');
  const [input, setInput] = useState('');
  const [channelData, setChannelData] = useState({ agenda: [], intel: [], logs: [] });
  const [modelList, setModelList] = useState([]);
  
  // OPENCODE ADDED TO PROVIDERS
  const providers = ['opencode', 'openrouter', 'openai']; 
  const [activeProvider, setActiveProvider] = useState(localStorage.getItem('active_provider') || 'opencode');
  
  const [keys, setKeys] = useState({
    opencode: localStorage.getItem('key_opencode') || '',
    openrouter: localStorage.getItem('key_openrouter') || '',
    openai: localStorage.getItem('key_openai') || ''
  });

  const [modelByProvider, setModelByProvider] = useState(() => ({
    opencode: localStorage.getItem('ascii_model_opencode') || '',
    openrouter: localStorage.getItem('ascii_model_openrouter') || '',
    openai: localStorage.getItem('ascii_model_openai') || ''
  }));
  const [modelHealthByProvider, setModelHealthByProvider] = useState(() => ({
    opencode: {},
    openrouter: {},
    openai: {}
  }));
  const [probeInFlightByProvider, setProbeInFlightByProvider] = useState(() => ({
    opencode: '',
    openrouter: '',
    openai: ''
  }));
  const [migrationStatus, setMigrationStatus] = useState('');
  const [memoryCount, setMemoryCount] = useState(0);
  const [memoryPreview, setMemoryPreview] = useState([]);
  const [memorySearch, setMemorySearch] = useState('');
  const [memorySearchResults, setMemorySearchResults] = useState([]);
  const [memoryViewStatus, setMemoryViewStatus] = useState('VIEW_NOT_LOADED');
  const [lastMemoryContext, setLastMemoryContext] = useState([]);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  const legacyInputRef = useRef(null);
  const modelID = modelByProvider[activeProvider] || '';
  const providerReady = Boolean(keys[activeProvider]);
  const isActivelyProbing = probeInFlightByProvider[activeProvider] === modelID && Boolean(modelID);
  const currentModelHealth = modelHealthByProvider[activeProvider]?.[modelID] || 'idle';
  const providerTint = !providerReady
    ? '#444'
    : (currentModelHealth === 'green'
      ? '#00ff00'
      : (currentModelHealth === 'testing' || currentModelHealth === 'amber'
        ? '#ffaa00'
        : '#444'));

  const setModelHealth = (provider, model, status) => {
    if (!provider || !model) return;
    setModelHealthByProvider(prev => ({
      ...prev,
      [provider]: {
        ...(prev[provider] || {}),
        [model]: status
      }
    }));
  };

  const probeSelectedModel = async (provider, model, key) => {
    if (!provider || !model || !key) return;

    setProbeInFlightByProvider(prev => ({ ...prev, [provider]: model }));
    setModelHealth(provider, model, 'testing');

    try {
      const res = await transmit(provider, 'chat', key, {
        model,
        messages: [
          { role: 'system', content: 'Reply with exactly OK.' },
          { role: 'user', content: 'probe' }
        ],
        max_tokens: 8,
        temperature: 0,
        stream: false
      });

      if (!res.ok) {
        const failHealth = res.status === 429 ? 'amber' : 'grey';
        setModelHealth(provider, model, failHealth);
        setChannelData(prev => ({
          ...prev,
          logs: [...prev.logs, {
            role: 'SYS',
            text: `MODEL_TEST ${provider.toUpperCase()}/${model}: HTTP_${res.status}${res.status === 429 ? ' RATE_LIMIT' : ' FAILURE'}`
          }]
        }));
        return;
      }

      const data = await res.json().catch(() => ({}));
      const content = String(data?.choices?.[0]?.message?.content || '').trim();
      const valid = content.length > 0;

      setModelHealth(provider, model, valid ? 'green' : 'amber');
      if (valid) playLock();
      setChannelData(prev => ({
        ...prev,
        logs: [...prev.logs, {
          role: 'SYS',
          text: `MODEL_TEST ${provider.toUpperCase()}/${model}: ${valid ? 'VALID_RESPONSE' : 'EMPTY_RESPONSE'}`
        }]
      }));
    } catch (err) {
      setModelHealth(provider, model, 'grey');
      setChannelData(prev => ({
        ...prev,
        logs: [...prev.logs, {
          role: 'SYS',
          text: `MODEL_TEST ${provider.toUpperCase()}/${model}: ${String(err?.message || err)}`
        }]
      }));
    } finally {
      setProbeInFlightByProvider(prev => {
        if (prev[provider] !== model) return prev;
        return { ...prev, [provider]: '' };
      });
    }
  };

  useEffect(() => { if (booted && inputRef.current) inputRef.current.focus(); }, [booted, chan, server]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [channelData, chan]);

  // --- FETCH MODELS LOGIC ---
  useEffect(() => {
    const fetchModels = async () => {
      const currentKey = keys[activeProvider];
      setModelList([]);
      if (!booted || !currentKey) return;
      try {
        const res = await transmit(activeProvider, 'models', keys[activeProvider]);

        if (!res.ok) throw new Error(`HTTP_${res.status}`);

        const data = await res.json();
        if (data.data) {
          const sorted = data.data.sort((a, b) => {
            const aFree = a.id.toLowerCase().includes('free');
            const bFree = b.id.toLowerCase().includes('free');
            return aFree === bFree ? 0 : aFree ? -1 : 1;
          });
          const nextList = sorted.slice(0, 50);
          setModelList(nextList);
          setModelByProvider(prev => {
            const current = prev[activeProvider] || '';
            const hasCurrent = current && nextList.some(m => m.id === current);
            const nextModel = hasCurrent ? current : (nextList[0]?.id || '');
            if (nextModel === current) return prev;
            localStorage.setItem(`ascii_model_${activeProvider}`, nextModel);
            if (nextModel) void probeSelectedModel(activeProvider, nextModel, currentKey);
            return { ...prev, [activeProvider]: nextModel };
          });
        }
      } catch (e) { 
        setModelList([]);
        console.error("FETCH_ERR", e); 
      }
    };
    fetchModels();
  }, [activeProvider, booted, keys]);

  // --- SEND MESSAGE LOGIC ---
  const handleSend = async (e) => {
    if (e.key !== 'Enter' || !input.trim()) return;
    playSystemSound('click', 0.15);
    const val = input.trim();
    setInput('');

    if (chan === 'providers') {
      const newKeys = { ...keys, [activeProvider]: val };
      setKeys(newKeys);
      localStorage.setItem(`key_${activeProvider}`, val);
      playSystemSound('chirp');
      setChannelData(p => ({ ...p, logs: [...p.logs, { role: 'SYS', text: `KEY FOR ${activeProvider.toUpperCase()} REGISTERED.` }] }));
      return;
    }

    setChannelData(prev => ({ ...prev, [chan]: [...prev[chan], { role: 'USER', text: val }] }));
    const currentKey = keys[activeProvider];
    const currentModel = modelByProvider[activeProvider] || '';
    
    if (!currentKey) {
        return setChannelData(prev => ({ ...prev, [chan]: [...prev[chan], { role: 'SYS', text: "ERROR: KEY MISSING" }] }));
    }

    if (!currentModel) {
        return setChannelData(prev => ({ ...prev, [chan]: [...prev[chan], { role: 'SYS', text: `ERROR: NO MODEL FOR ${activeProvider.toUpperCase()}` }] }));
    }

    const aiId = Date.now();
    setChannelData(prev => ({ ...prev, [chan]: [...prev[chan], { role: 'AI', text: '', id: aiId }] }));

    let systemPrompt = "You are MU/TH/UR 6000. Concise, technical.";
    if (chan === 'intel') systemPrompt = "Science Officer interface. objective data analysis.";
    if (chan === 'logs') systemPrompt = "Mission Recorder. Chronological log format.";

    let memoryContext = '';
    let memoryContextRows = [];
    try {
      const hits = await Memory.query(val, 3);
      if (hits.length) {
        memoryContextRows = hits;
        memoryContext = [
          'RELEVANT_MEMORY:',
          ...hits.map((hit, idx) => {
            const ts = hit.created_at ? new Date(hit.created_at).toLocaleString() : 'unknown time';
            return `${idx + 1}. [${hit.type}] ${ts} :: ${String(hit.text || '').slice(0, 220)}`;
          })
        ].join('\n');
      }
      setLastMemoryContext(hits);
    } catch (err) {
      console.warn('MEMORY_QUERY_ERR', err);
      setLastMemoryContext([]);
    }

    try {
      await Memory.add('chat_user', val, {
        provider: activeProvider,
        model: currentModel,
        channel: chan,
        direction: 'user'
      });
    } catch (err) {
      console.warn('MEMORY_ADD_USER_ERR', err);
    }

    const promptMessages = [
      {
        role: 'system',
        content: `${systemPrompt}\n${memoryContext ? `\n${memoryContext}\n` : '\n'}Use relevant memory as background only.`
      },
      { role: 'user', content: val }
    ];
    
    try {
      let endpoint = '';
      if (activeProvider === 'openai') {
        endpoint = 'https://api.openai.com/v1/chat/completions';
      } else if (activeProvider === 'opencode') {
        endpoint = 'https://opencode.ai/zen/v1/chat/completions'; // FIXED ENDPOINT
      } else {
        endpoint = 'https://openrouter.ai/api/v1/chat/completions';
      }

      // NEW MODULAR TRANSMIT
      const res = await transmit(activeProvider, 'chat', keys[activeProvider], {
        model: currentModel,
        messages: promptMessages,
        stream: true
      });

      if (!res.ok) throw new Error(`HTTP_${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = ""; let streamBuffer = "";

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
            // ... inside your while(true) loop
            const parsed = JSON.parse(cleaned);
            const content = parsed.choices[0]?.delta?.content || "";

            if (content) {
              fullContent += content;

              // --- SAFETY SHIELD START ---
              // 1. Emergency Truncate: If AI goes over 5000 chars, force a stop
              if (fullContent.length > 5000) {
                fullContent = fullContent.substring(0, 5000) + "\n\n[SYSTEM: BUFFER_OVERFLOW_DETECTION]";
                reader.cancel(); // Physically stops the stream from the server
              }

              // 2. Repetition Filter: Detects if the same character repeats 50+ times (like the smileys)
              const repetitivePattern = /(.)\1{50,}/g;
              if (repetitivePattern.test(fullContent)) {
                fullContent = fullContent.replace(repetitivePattern, "$1... [REPETITIVE_SIGNAL_FILTERED]");
                reader.cancel(); // Stops the AI from wasting more tokens
              }
              // --- SAFETY SHIELD END ---

              playSystemSound('click', 0.05); 
              setChannelData(prev => ({
                ...prev, 
                [chan]: prev[chan].map(m => m.id === aiId ? { ...m, text: fullContent } : m)
              }));
            }
          } catch (e) {}
        }
      }

      if (fullContent.trim()) {
        try {
          await Memory.add('chat_ai', fullContent.trim(), {
            provider: activeProvider,
            model: currentModel,
            channel: chan,
            direction: 'assistant'
          });
        } catch (err) {
          console.warn('MEMORY_ADD_AI_ERR', err);
        }
      }
    } catch (err) {
      setChannelData(prev => ({ ...prev, [chan]: [...prev[chan], { role: 'SYS', text: `UPLINK ERR: ${err.message}` }] }));
    }
  };

  const handleLegacyImport = async () => {
    const file = legacyInputRef.current?.files?.[0];
    if (!file) {
      setMigrationStatus('SELECT_A_JSON_FILE_FIRST');
      return;
    }

    setMigrationStatus('IMPORTING...');
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const count = await Memory.importLegacyData(data, { overwrite: false });
      setMigrationStatus(`IMPORTED_${count}_RECORDS`);
      playSystemSound('chirp');
      await loadMemoryPreview();
    } catch (err) {
      setMigrationStatus(`IMPORT_ERR_${err.message}`);
    }
  };

  const handleLegacyPurge = async () => {
    const ok = window.confirm('PURGE imported legacy memories? This removes the SQLite import rows only.');
    if (!ok) return;

    setMigrationStatus('PURGING_LEGACY_ROWS...');
    try {
      const removed = await Memory.purgeLegacyData();
      setMigrationStatus(`PURGED_${removed}_LEGACY_ROWS`);
      playSystemSound('chirp');
      setMemorySearch('');
      setMemorySearchResults([]);
      await loadMemoryPreview();
    } catch (err) {
      setMigrationStatus(`PURGE_ERR_${err.message}`);
    }
  };

  const loadMemoryPreview = async () => {
    setMemoryViewStatus('LOADING...');
    try {
      const [count, recent] = await Promise.all([
        db.memories.count(),
        db.memories.orderBy('created_at').reverse().limit(6).toArray(),
      ]);
      setMemoryCount(count);
      setMemoryPreview(recent);
      setMemoryViewStatus('READY');
    } catch (err) {
      setMemoryViewStatus(`ERROR_${err.message}`);
    }
  };

  const runMemorySearch = async () => {
    const term = memorySearch.trim().toLowerCase();
    if (!term) {
      setMemoryViewStatus('ENTER_A_SEARCH_TERM');
      setMemorySearchResults([]);
      return;
    }

    setMemoryViewStatus(`SEARCHING_${term}`);
    try {
      const results = await Memory.query(term, 25);
      setMemorySearchResults(results);
      setMemoryViewStatus(`FOUND_${results.length}`);
    } catch (err) {
      setMemoryViewStatus(`SEARCH_ERR_${err.message}`);
    }
  };

  if (!booted) {
    return (
      <div onClick={() => { 
        setupAudio(); // This initializes the context safely inside the module
        setBooted(true); 
      }} style={{ height: '100vh', backgroundColor: '#000', color: '#00ff00', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontFamily: 'monospace' }}>
        <pre>{`[ WEYLAND-YUTANI CORP ]\n[ MU/TH/UR 6000 ]\n\n>> INITIALIZE UPLINK <<`}</pre>
      </div>
    );
  }

  return (
   <div onClick={() => setupAudio()} style={{ backgroundColor: '#000', color: '#00ff00', height: '100vh', display: 'flex', fontFamily: 'monospace', overflow: 'hidden', fontSize: '14px' }}>
      
      {/* COL 1: SERVERS */}
      <div style={{ width: '80px', borderRight: '1px solid #1a1a1a', padding: '10px' }}>
        {['m', 's'].map(id => (
          <div key={id} onClick={() => { setServer(id); setChan(id === 'm' ? 'agenda' : 'providers'); playSystemSound('chirp'); }} style={{ marginBottom: '20px', cursor: 'pointer' }}>
            <pre style={{ margin: 0, color: server === id ? '#00ff00' : '#222' }}>{server === id ? art.pushed(id) : art.popped(id)}</pre>
          </div>
        ))}
      </div>

      {/* COL 2: NAV */}
      <div style={{ width: '240px', borderRight: '1px solid #1a1a1a', padding: '20px 10px', overflowY: 'auto' }}>
        <div style={{ color: '#444', fontSize: '10px', marginBottom: '10px' }}>{server === 'm' ? 'MAIN_NET' : 'SYSTEM_RESOURCES'}</div>
        {server === 'm' ? (
          ['agenda', 'intel', 'logs'].map(c => (
            <div key={c} onClick={() => { setChan(c); playSystemSound('click'); }} style={{ cursor: 'pointer', color: chan === c ? '#00ff00' : '#333', padding: '8px 0' }}>{chan === c ? '> ' : '# '}{c.toUpperCase()}</div>
          ))
        ) : (
          <>
            <div onClick={() => { setChan('providers'); playSystemSound('click'); }} style={{ cursor: 'pointer', color: chan === 'providers' ? '#00ff00' : '#333', padding: '8px 0' }}># GATEWAY_KEYS</div>
            {providers.map(p => (
              <div key={p} onClick={() => { setActiveProvider(p); localStorage.setItem('active_provider', p); playSystemSound('chirp'); }} style={{ cursor: 'pointer', color: activeProvider === p ? '#00ff00' : '#222', padding: '5px 0' }}>{activeProvider === p ? '[X] ' : '[ ] '}{p.toUpperCase()}</div>
            ))}
            <div style={{ marginTop: '20px', borderTop: '1px solid #111', paddingTop: '10px' }}>
              <div style={{ fontSize: '10px', color: '#444', marginBottom: '10px' }}>AVAILABLE_MODELS:</div>
              {!keys[activeProvider] ? (
                <div style={{ color: '#444', fontSize: '10px', lineHeight: 1.4 }}>
                  ENTER A KEY ABOVE TO LOAD {activeProvider.toUpperCase()} MODELS.
                </div>
              ) : modelList.length === 0 ? (
                <div style={{ color: '#444', fontSize: '10px' }}>
                  NO_MODELS_LOADED
                </div>
              ) : (
                modelList.map(m => (
                  <div
                    key={m.id}
                    onClick={() => {
                      setModelByProvider(prev => ({ ...prev, [activeProvider]: m.id }));
                      localStorage.setItem(`ascii_model_${activeProvider}`, m.id);
                      playSystemSound('click');
                      void probeSelectedModel(activeProvider, m.id, keys[activeProvider]);
                    }}
                    style={{
                      cursor: 'pointer',
                      color: modelID === m.id
                        ? (modelHealthByProvider[activeProvider]?.[m.id] === 'green'
                          ? '#00ff00'
                          : (modelHealthByProvider[activeProvider]?.[m.id] === 'amber'
                            ? '#ffaa00'
                            : '#444'))
                        : (m.id.includes('free') ? '#ffaa00' : '#222'),
                      fontSize: '10px',
                      padding: '4px 0',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {m.id.split('/').pop()}
                  </div>
                ))
              )}
            </div>
            {import.meta.env.DEV && (
              <div style={{ marginTop: '18px', borderTop: '1px dashed #333', paddingTop: '12px' }}>
                <div style={{ fontSize: '10px', color: '#ffaa00', marginBottom: '8px' }}>MEMORY_MIGRATION</div>
                <input
                  ref={legacyInputRef}
                  type="file"
                  accept=".json,application/json"
                  style={{ width: '100%', fontSize: '10px', color: '#ccc' }}
                />
                <button
                  type="button"
                  onClick={handleLegacyImport}
                  style={{
                    marginTop: '8px',
                    width: '100%',
                    padding: '8px 10px',
                    background: '#111',
                    color: '#ffaa00',
                    border: '1px solid #333',
                    cursor: 'pointer',
                    fontFamily: 'monospace',
                    fontSize: '10px',
                  }}
                >
                  IMPORT LEGACY JSON
                </button>
                <div style={{ marginTop: '6px', fontSize: '10px', color: '#666', wordBreak: 'break-word' }}>
                  {migrationStatus || 'LOAD memory_for_dexie.json'}
                </div>
                <button
                  type="button"
                  onClick={handleLegacyPurge}
                  style={{
                    marginTop: '8px',
                    width: '100%',
                    padding: '8px 10px',
                    background: '#1a0909',
                    color: '#ff4444',
                    border: '1px solid #442222',
                    cursor: 'pointer',
                    fontFamily: 'monospace',
                    fontSize: '10px',
                  }}
                >
                  PURGE LEGACY ROWS
                </button>
              </div>
            )}
            {import.meta.env.DEV && (
              <div style={{ marginTop: '18px', borderTop: '1px dashed #333', paddingTop: '12px' }}>
                <div style={{ fontSize: '10px', color: '#78b8ff', marginBottom: '8px' }}>MEMORY_VIEWER</div>
                <button
                  type="button"
                  onClick={() => void loadMemoryPreview()}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    background: '#111',
                    color: '#78b8ff',
                    border: '1px solid #333',
                    cursor: 'pointer',
                    fontFamily: 'monospace',
                    fontSize: '10px',
                  }}
                >
                  REFRESH VIEW
                </button>
                <div style={{ marginTop: '6px', fontSize: '10px', color: '#666' }}>
                  {memoryViewStatus} / {memoryCount} RECORDS
                </div>
                <div style={{ marginTop: '10px', display: 'flex', gap: '6px' }}>
                  <input
                    value={memorySearch}
                    onChange={(e) => setMemorySearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        void runMemorySearch();
                      }
                    }}
                    placeholder="SEARCH memories..."
                    style={{
                      flex: 1,
                      minWidth: 0,
                      padding: '8px 10px',
                      background: '#0b0b0b',
                      color: '#78b8ff',
                      border: '1px solid #333',
                      fontFamily: 'monospace',
                      fontSize: '10px',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => void runMemorySearch()}
                    style={{
                      padding: '8px 10px',
                      background: '#111',
                      color: '#78b8ff',
                      border: '1px solid #333',
                      cursor: 'pointer',
                      fontFamily: 'monospace',
                      fontSize: '10px',
                    }}
                  >
                    FIND
                  </button>
                </div>
                <div style={{ marginTop: '8px', maxHeight: '240px', overflowY: 'auto', fontSize: '10px', color: '#bbb' }}>
                  {memorySearch.trim() ? (
                    memorySearchResults.length === 0 ? (
                      <div style={{ color: '#444' }}>NO_SEARCH_MATCHES</div>
                    ) : (
                      memorySearchResults.map((item) => (
                        <div key={`search-${item.id}`} style={{ marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid #1a1a1a' }}>
                          <div style={{ color: '#78b8ff' }}>
                            #{item.id} {item.type} @ {new Date(item.created_at).toLocaleString()}
                          </div>
                          <div style={{ color: '#888' }}>
                            tags: {(item.tags || []).slice(0, 6).join(', ') || '-'}
                          </div>
                          <div style={{ color: '#ddd', marginTop: '4px', whiteSpace: 'pre-wrap' }}>
                            {String(item.text || '').slice(0, 180)}
                            {String(item.text || '').length > 180 ? '…' : ''}
                          </div>
                        </div>
                      ))
                    )
                  ) : memoryPreview.length === 0 ? (
                    <div style={{ color: '#444' }}>NO_MEMORY_ROWS_LOADED</div>
                  ) : (
                    memoryPreview.map((item) => (
                      <div key={item.id} style={{ marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid #1a1a1a' }}>
                        <div style={{ color: '#00ff00' }}>
                          #{item.id} {item.type} @ {new Date(item.created_at).toLocaleString()}
                        </div>
                        <div style={{ color: '#888' }}>
                          tags: {(item.tags || []).slice(0, 6).join(', ') || '-'}
                        </div>
                        <div style={{ color: '#ddd', marginTop: '4px', whiteSpace: 'pre-wrap' }}>
                          {String(item.text || '').slice(0, 180)}
                          {String(item.text || '').length > 180 ? '…' : ''}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
            {import.meta.env.DEV && (
              <div style={{ marginTop: '18px', borderTop: '1px dashed #333', paddingTop: '12px' }}>
                <div style={{ fontSize: '10px', color: '#9bff9b', marginBottom: '8px' }}>MEMORY_CONTEXT</div>
                <div style={{ fontSize: '10px', color: '#666', marginBottom: '8px' }}>
                  LAST_PROMPT_TOPK / {lastMemoryContext.length} HITS
                </div>
                {lastMemoryContext.length === 0 ? (
                  <div style={{ color: '#444', fontSize: '10px' }}>NO_CONTEXT_LOADED_YET</div>
                ) : (
                  lastMemoryContext.map((item, idx) => (
                    <div key={`ctx-${item.id}-${idx}`} style={{ marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid #1a1a1a' }}>
                      <div style={{ color: '#9bff9b' }}>
                        #{item.id} {item.type} @ {new Date(item.created_at).toLocaleString()}
                      </div>
                      <div style={{ color: '#888' }}>
                        score: {Number(item.score || 0).toFixed(3)} / cosine: {Number(item.cosine || 0).toFixed(3)}
                      </div>
                      <div style={{ color: '#ddd', marginTop: '4px', whiteSpace: 'pre-wrap' }}>
                        {String(item.text || '').slice(0, 180)}
                        {String(item.text || '').length > 180 ? '…' : ''}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* COL 3: TERMINAL */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '20px' }}>
          <div
            className={isActivelyProbing ? 'model-probe-wave' : ''}
            style={{ color: providerTint, fontSize: '10px', marginBottom: '20px' }}
          >
            {activeProvider.toUpperCase()} // {chan.toUpperCase()} // {modelID || 'NO_MODEL'}
          </div>
          
          {chan === 'providers' && (
            <div style={{ marginBottom: '20px', color: '#444' }}>
               <div
                 style={{ color: providerTint, marginBottom: '10px' }}
               >
                 [ {activeProvider.toUpperCase()} ]
               </div>
               <div
                 style={{ color: providerTint }}
               >
                 STATUS: {providerReady ? "KEY_READY" : "WAITING_FOR_UPLINK..."}
               </div>
               {keys[activeProvider] && <div style={{ color: '#555', fontSize: '10px' }}>UPLINK_ID: ****{keys[activeProvider].slice(-4)}</div>}
            </div>
          )}

          {(channelData[chan] || []).map((m, i) => (
            <div key={i} style={{ marginBottom: '15px' }}><span style={{ color: m.role === 'AI' ? '#00ff00' : (m.role === 'SYS' ? '#ffaa00' : '#444') }}>[{m.role}]</span> {m.text}</div>
          ))}
          <div ref={chatEndRef} />
        </div>
        <div style={{ display: 'flex', borderTop: '1px solid #1a1a1a', paddingTop: '15px' }}>
          <span style={{ marginRight: '10px' }}>{'>'}</span>
          <input 
            ref={inputRef} value={input} 
            onChange={(e) => { setInput(e.target.value); playSystemSound('click', 0.04); }} 
            onKeyDown={handleSend} placeholder={chan === 'providers' ? "ENTER GATEWAY KEY..." : "MESSAGE MU/TH/UR..."} 
            style={{ background: 'none', border: 'none', color: '#00ff00', outline: 'none', flex: 1, fontFamily: 'monospace' }} 
          />
        </div>
      </div>
    </div>
  );
}
