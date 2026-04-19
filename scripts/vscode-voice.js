#!/usr/bin/env node
/**
 * vscode-voice.js
 * Speak the latest Copilot/agent reply from VS Code debug logs using the mechanicus TTS system.
 *
 * Usage:
 *   pnpm voice:vscode
 */
const { execSync } = require('child_process');
const path = require('path');

// Use the same logic as vscode_last_reply.ts to get the latest reply
const lastReplyScript = path.resolve(__dirname, '../tools/vscode_last_reply.ts');
let message = '';
try {
  message = execSync(`npx tsx "${lastReplyScript}" --last-sentence`, { encoding: 'utf8' }).trim();
} catch (e) {
  console.error('Failed to get last VS Code reply:', e.message);
  process.exit(1);
}
if (!message) {
  process.exit(0);
}

// Use the same TTS API as tts-natasha.js (or mechanicus_say.py if you want Python)
const ttsNatasha = path.resolve(__dirname, '../tts-natasha.js');
try {
  execSync(`node "${ttsNatasha}" "${message.replace(/"/g, '')}"`, { stdio: 'inherit' });
} catch (e) {
  console.error('TTS failed:', e.message);
  process.exit(1);
}
