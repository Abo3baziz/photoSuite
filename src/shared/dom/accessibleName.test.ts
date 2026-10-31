import { describe, expect, it } from 'vitest';
import { computeAccessibleName } from './accessibleName';

describe('computeAccessibleName', () => {
  it('prefers aria-label', () => {
    expect(computeAccessibleName({ ariaLabel: '  Save  ', textContent: 'ignored' })).toBe('Save');
  });
  it('uses aria-labelledby text when provided', () => {
    expect(computeAccessibleName({ ariaLabelledByText: 'Section title' })).toBe('Section title');
  });
  it('uses associated label text', () => {
    expect(computeAccessibleName({ labelForText: 'Email address' })).toBe('Email address');
  });
  it('uses alt for images', () => {
    expect(computeAccessibleName({ alt: 'logo', tag: 'img' })).toBe('logo');
  });
  it('uses placeholder for inputs', () => {
    expect(computeAccessibleName({ placeholder: 'Search…', tag: 'input' })).toBe('Search…');
  });
  it('uses title as fallback', () => {
    expect(computeAccessibleName({ title: 'Close dialog' })).toBe('Close dialog');
  });
  it('uses short text content', () => {
    expect(computeAccessibleName({ textContent: 'Submit', tag: 'button' })).toBe('Submit');
  });
  it('returns null when nothing is available', () => {
    expect(computeAccessibleName({ tag: 'button' })).toBeNull();
  });
  it('does not fabricate names from very long text', () => {
    const long = 'x'.repeat(300);
    expect(computeAccessibleName({ textContent: long, tag: 'button' })).toBeNull();
  });
});
