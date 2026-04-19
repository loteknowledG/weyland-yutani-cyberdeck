import type { Connect } from "vite";
import fs from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";

const DEFAULT_PROFILE = "mechanicus-voice";

/** VSCode voice TTS: mute flag + voice profile (Cyberdeck UI in dev / preview). */
export function vscodeVoiceBridge(rootDir: string): Plugin {
  const hooksDir = path.join(rootDir, ".vscode/hooks");
  const mutedFile = path.join(hooksDir, "vscode-voice.muted");
  const voiceFile = path.join(hooksDir, "vscode-tts-voice.txt");
  const route = "/__cyberdeck/vscode-voice";

  function isMuted(): boolean {
    try {
      if (!fs.existsSync(mutedFile)) return false;
      return fs.readFileSync(mutedFile, "utf8").trim() === "1";
    } catch {
      return false;
    }
  }

  function setMuted(m: boolean): void {
    fs.mkdirSync(path.dirname(mutedFile), { recursive: true });
    if (m) fs.writeFileSync(mutedFile, "1\n", "utf8");
    else {
      try {
        fs.unlinkSync(mutedFile);
      } catch {
        /* absent */
      }
    }
  }

  function readProfile(): string {
    try {
      if (!fs.existsSync(voiceFile)) return DEFAULT_PROFILE;
      const raw = fs.readFileSync(voiceFile, "utf8").trim();
      return raw || DEFAULT_PROFILE;
    } catch {
      /* fall through */
    }
    return DEFAULT_PROFILE;
  }

  function setProfile(id: string): void {
    const next = id.trim() || DEFAULT_PROFILE;
    fs.mkdirSync(path.dirname(voiceFile), { recursive: true });
    fs.writeFileSync(voiceFile, `${next}\n`, "utf8");
  }

  function attach(server: { middlewares: Connect.Server }): void {
    server.middlewares.use((req, res, next) => {
      const url = (req.url ?? "").split("?")[0];
      if (url !== route) {
        next();
        return;
      }
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      if (req.method === "OPTIONS") {
        res.statusCode = 204;
        res.end();
        return;
      }
      if (req.method === "GET") {
        res.end(
          JSON.stringify({
            muted: isMuted(),
            profile: readProfile(),
            bridge: true,
          }),
        );
        return;
      }
      if (req.method === "POST") {
        let body = "";
        req.on("data", (c) => {
          body += c;
        });
        req.on("end", () => {
          try {
            const data = JSON.parse(body || "{}") || {};
            if (typeof data.muted === "boolean") setMuted(data.muted);
            if (typeof data.profile === "string") setProfile(data.profile);
            // TTS trigger logic: call tts-natasha.js with the 'speak' field
            let audioUrl = null;
            const { execSync } = require("child_process");
            const ttsScript = path.join(rootDir, "tts-natasha.js");
            // Map profile to TTS voice
            const profileToVoice = {
              "mechanicus-voice": "en-US-AndrewNeural",
              "jenna-jacket": "en-US-JennyNeural",
              "warp-spider": "en-US-GuyNeural"
            };
            const ttsVoice = profileToVoice[data.profile] || "en-US-JennyNeural";
            let textToSpeak = (typeof data.speak === "string" && data.speak.trim()) ? data.speak : null;
            if (!textToSpeak) {
              // Try to get last sentence from VS Code logs using vscode-voice.js logic
              try {
                const lastReplyScript = path.join(rootDir, "tools", "vscode_last_reply.ts");
                textToSpeak = execSync(`npx tsx "${lastReplyScript}" --last-sentence`, { encoding: "utf8" }).trim();
              } catch (e) {
                console.error("Failed to get last VS Code reply:", e.message);
                textToSpeak = "";
              }
            }
            if (!textToSpeak) {
              res.end(JSON.stringify({ ok: true, muted: isMuted(), profile: readProfile(), audioUrl: null, skipped: "no_message_found" }));
              return;
            }
            try {
              const output = execSync(`node "${ttsScript}" "${textToSpeak.replace(/"/g, '')}" "${ttsVoice}"`, { encoding: "utf8" });
              const match = output.match(/Audio URL:\s*(\S+)/);
              if (match) {
                audioUrl = match[1];
              }
            } catch (err) {
              console.error("TTS error:", err);
            }
            res.end(JSON.stringify({ ok: true, muted: isMuted(), profile: readProfile(), audioUrl }));
          } catch (e) {
            res.statusCode = 400;
            res.end(JSON.stringify({ ok: false, error: "bad_request" }));
          }
        });
        return;
      }
      res.statusCode = 405;
      res.end(JSON.stringify({ ok: false, error: "method_not_allowed" }));
    });
  }

  return {
    name: "vscode-voice-bridge",
    configureServer(server) {
      attach(server);
    },
    configurePreviewServer(server) {
      attach(server);
    },
  };
}
