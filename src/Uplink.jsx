import React, { useState } from 'react';

// 1. CONFIGURATION (The Proxy Shield)
const PROXY = "https://cors-anywhere-dqgj.onrender.com/";
const ENDPOINTS = {
  opencode: 'https://opencode.ai/zen/v1/chat/completions',
  openai: 'https://api.openai.com/v1/chat/completions',
  openrouter: 'https://openrouter.ai/api/v1/chat/completions'
};
const MODEL_LISTS = {
  opencode: 'https://opencode.ai/zen/v1/models',
  openai: 'https://api.openai.com/v1/models',
  openrouter: 'https://openrouter.ai/api/v1/models'
};

// 2. TRANSMISSION ENGINE
export const transmit = async (provider, type, key, payload = null) => {
  const url = type === 'models' ? MODEL_LISTS[provider] : ENDPOINTS[provider];
  const options = {
    method: payload ? 'POST' : 'GET',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    }
  };
  if (payload) options.body = JSON.stringify(payload);
  return fetch(PROXY + url, options);
};

// 3. THE VISUAL COMPONENT
export const Uplink = ({ status, providerName }) => {
  const getStyle = () => {
    if (status === 'SCANNING') return 'scanning-wave';
    if (status === 'CONNECTED') return 'locked-green';
    if (status === 'ERROR') return 'critical-red';
    return 'idle-grey';
  };

  return (
    <div className={`uplink-container ${getStyle()}`}>
      <span className="status-symbol">
        {status === 'CONNECTED' ? '●' : '○'}
      </span>
      
      <span className="status-text">
        {status === 'SCANNING' ? 'PROBING_UPLINK...' : `UPLINK: ${providerName}`}
      </span>

      <div className="uplink-meta">
        <span className="signal-strength">
          SIG_STR: {status === 'CONNECTED' ? '98.4%' : '00.0%'}
        </span>
        <span className="interference">
          VOLATILITY: {status === 'SCANNING' ? 'HIGH' : 'LOW'}
        </span>
      </div>
    </div>
  );
};

// 4. THE HANDSHAKE LOGIC (To be called from your main App state)
export const validateConnection = async (provider, key, setUplinkStatus, setChannel, AudioEngine) => {
  if (!key) {
    setUplinkStatus('IDLE');
    return;
  }

  setUplinkStatus('SCANNING'); 

  try {
    const response = await transmit(provider, 'models', key);
    if (response.ok) {
      AudioEngine.playLock(); 
      setUplinkStatus('CONNECTED');
      setTimeout(() => setChannel('agenda'), 1200); 
    } else {
      setUplinkStatus('ERROR');
    }
  } catch (err) {
    console.error("UPLINK_FAILURE:", err);
    setUplinkStatus('ERROR');
  }
};