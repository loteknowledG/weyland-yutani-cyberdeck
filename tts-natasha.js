// Simple Node.js script to call coderobo TTS API for Natasha (English Australia, female)
const https = require('https');


const args = process.argv.slice(2);
const text = args[0] || 'Hello from Natasha!';
const voice = args[1] || 'en-AU-NatashaNeural';

const data = JSON.stringify({
  text,
  voice,
  rate: 0,
  pitch: 0
});

const options = {
  hostname: 'aivoice.coderobo.org',
  path: '/api/tts',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = https.request(options, res => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    try {
      const result = JSON.parse(body);
      if (result.audio_path || result.audio_url) {
        const audioUrl = result.audio_url || ('https://aivoice.coderobo.org' + result.audio_path);
        console.log('Audio URL:', audioUrl);
      } else {
        console.error('No audio path in response:', result);
        process.exit(1);
      }
    } catch (e) {
      console.error('Failed to parse response:', body);
      process.exit(1);
    }
  });
});

req.on('error', e => {
  console.error('Request error:', e);
  process.exit(1);
});

req.write(data);
req.end();
