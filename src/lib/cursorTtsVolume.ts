/**
 * Cursor after-reply TTS level persisted in `.cursor/hooks/cursor-tts-volume.txt`.
 * Keep Samus trim bounds in sync with `.cursor/hooks/speak_last_sentence_mechanicus.py`
 * (`_read_cursor_tts_volume_override`).
 */

export const CURSOR_TTS_VOLUME_UI_MIN = 0;
export const CURSOR_TTS_VOLUME_UI_MAX = 100;
export const CURSOR_TTS_VOLUME_UI_DEFAULT = 100;

/** UI dial at or above this uses profile default (no `--volume` override). */
export const CURSOR_TTS_VOLUME_UI_NO_OVERRIDE_MIN = 99;

/** Samus `BOOTUP_TTS_VOLUME`-style trim when UI is below `NO_OVERRIDE_MIN` (attenuation only). */
export const CURSOR_TTS_SAMUS_TRIM_PCT_MIN = -40;
/** Attenuation only from the dial; positive trims reserved for manual env / future UI. */
export const CURSOR_TTS_SAMUS_TRIM_PCT_MAX = 0;

/** Scale (n − default) before clamping to trim percent (gentler than 1:1). */
export const CURSOR_TTS_VOLUME_UI_TO_TRIM_SCALE = 0.5;

export function clampCursorTtsVolumeUi(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return CURSOR_TTS_VOLUME_UI_DEFAULT;
  return Math.max(CURSOR_TTS_VOLUME_UI_MIN, Math.min(CURSOR_TTS_VOLUME_UI_MAX, Math.round(n)));
}
