/** 本番の文字入力と同じ既定の最大文字数 */
export const DEFAULT_TEXT_MAX_LENGTH = 500

/**
 * 確定する文字列を決める（本番の TextInputOverlay と同じ）。
 * 前後の空白を除き、最大文字数で切る。空なら確定できない（null）
 */
export function normalizeTextInput(value: string, maxLength = DEFAULT_TEXT_MAX_LENGTH): string | null {
  const trimmed = value.slice(0, maxLength).trim()
  return trimmed === '' ? null : trimmed
}
