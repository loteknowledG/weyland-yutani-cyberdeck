// [ SECURITY PROTOCOL: UPLINK MODULE ]
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

/**
 * Transmits data through the proxy shield.
 */
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