/**
 * Stable element identity hashing. WebCrypto (available in content scripts,
 * background, and tests via jsdom's crypto). Returns a hex digest.
 */
export async function identityHash(parts: readonly (string | null | undefined)[]): Promise<string> {
  const canonical = parts.map((part) => (part ?? '').trim().toLowerCase()).join('\u001f');
  const buffer = new TextEncoder().encode(canonical);
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  const bytes = new Uint8Array(digest);
  let hex = '';
  for (const byte of bytes) hex += byte.toString(16).padStart(2, '0');
  return hex;
}

export function stateFingerprintCanonical(parts: Record<string, unknown>): string {
  // Stable key ordering for fingerprinting inputs (used by the state graph).
  return JSON.stringify(parts, Object.keys(parts).sort());
}
