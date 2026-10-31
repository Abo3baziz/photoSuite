import { describe, expect, it } from 'vitest';
import { identityHash } from './identity';

describe('identityHash', () => {
  it('is deterministic for the same inputs', async () => {
    const a = await identityHash(['button', 'Save', 'form > button']);
    const b = await identityHash(['button', 'Save', 'form > button']);
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });
  it('differs when any part changes', async () => {
    const a = await identityHash(['button', 'Save', 'form > button']);
    const b = await identityHash(['button', 'Cancel', 'form > button']);
    expect(a).not.toBe(b);
  });
  it('normalizes case and whitespace', async () => {
    const a = await identityHash(['Button', '  Save  ']);
    const b = await identityHash(['button', 'save']);
    expect(a).toBe(b);
  });
  it('handles null/undefined parts', async () => {
    const a = await identityHash([null, undefined, 'x']);
    const b = await identityHash(['', '', 'x']);
    expect(a).toBe(b);
  });
});
