// Node.js script to call coderobo TTS API and play the audio (requires 'play-sound' package)
const https = require('https');
const fs = require('fs');
const path = require('path');
const player = require('play-sound')();

const text = process.argv.slice(2).join(' ') || 'Hello from Natasha!';

const data = JSON.stringify({
  text,
  voice: 'en-AU-NatashaNeural',
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
        const filePath = path.join(__dirname, 'tts-natasha.mp3');
        const file = fs.createWriteStream(filePath);
        https.get(audioUrl, response => {
          response.pipe(file);
          file.on('finish', () => {
            file.close(() => {
              player.play(filePath, err => {
                if (err) console.error('Playback error:', err);
                fs.unlinkSync(filePath);
              });
            });
          });
        });
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
