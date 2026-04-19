// tools/vscode_last_reply.ts
// Fetches the last Copilot/agent reply from VS Code logs and prints the last sentence.
// Usage: npx tsx tools/vscode_last_reply.ts --last-sentence

import * as fs from 'fs';
import * as path from 'path';

function getLogFilePath(): string {
  const logDir = path.resolve(__dirname, '../logs/vscode');
  const files = fs.readdirSync(logDir).filter(f => f.endsWith('.log'));
  if (!files.length) throw new Error('No log files found');
  files.sort((a, b) => fs.statSync(path.join(logDir, b)).mtimeMs - fs.statSync(path.join(logDir, a)).mtimeMs);
  return path.join(logDir, files[0]);
}

function stripMarkdownish(text: string): string {
  let out = text;
  out = out.replace(/```[\s\S]*?```/g, ' ');
  out = out.replace(/`+([^`]+)`+/g, '$1');
  out = out.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  out = out.replace(/[#>*_]+/g, ' ');
  return out.split(/\s+/).filter(Boolean).join(' ');
}

function extractReplyText(line: string): string {
  const trimmed = line.trim();
  if (!trimmed) return '';

  const jsonStart = trimmed.indexOf('{');
  if (jsonStart !== -1) {
    try {
      const maybeJson = JSON.parse(trimmed.slice(jsonStart));
      if (maybeJson && typeof maybeJson === 'object') {
        const candidate = [
          maybeJson.text,
          maybeJson.reply,
          maybeJson.message,
          maybeJson.content,
          maybeJson.output,
        ].find((value) => typeof value === 'string' && value.trim());
        if (typeof candidate === 'string' && candidate.trim()) {
          return candidate.trim();
        }
      }
    } catch {
      // Fall back to regex parsing.
    }
  }

  const match = trimmed.match(/(?:reply|response|message|content)\s*:\s*(.*)$/i);
  if (match && match[1].trim()) {
    return match[1].trim();
  }

  return '';
}

function getLastAgentReply(logFile: string): string {
  const lines = fs.readFileSync(logFile, 'utf8').split('\n').reverse();
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.includes('Copilot') || trimmed.includes('agent') || /reply|response|message|content/i.test(trimmed)) {
      const extracted = extractReplyText(trimmed);
      if (extracted) return extracted;
    }
  }
  throw new Error('No agent reply found');
}

function getLastSentence(text: string): string {
  const cleaned = stripMarkdownish(text).trim();
  if (!cleaned) return '';
  const sentences = cleaned.split(/(?<=[.!?])\s+/).map((part) => part.trim()).filter(Boolean);
  if (!sentences.length) return cleaned.slice(0, 500);
  return sentences[sentences.length - 1].slice(0, 500);
}

function main() {
  const arg = process.argv[2];
  try {
    const logFile = getLogFilePath();
    const reply = getLastAgentReply(logFile);
    if (arg === '--last-sentence') {
      console.log(getLastSentence(reply));
    } else {
      console.log(reply);
    }
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}

main();
