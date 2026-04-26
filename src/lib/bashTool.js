import { Bash } from "just-bash";

let bashInstance = null;

export function getBash() {
  if (!bashInstance) {
    bashInstance = new Bash();
  }
  return bashInstance;
}

export async function runBashCommand(command) {
  try {
    const bash = getBash();
    const result = await bash.exec(command);
    return {
      success: result.exitCode === 0,
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
    };
  } catch (err) {
    return {
      success: false,
      error: String(err.message || err),
      stdout: "",
      stderr: "",
      exitCode: -1,
    };
  }
}

export function resetBash() {
  bashInstance = null;
}