/**
 * Pure accessible-name extraction from an element's attributes and text.
 * Follows the ARIA accessible name computation at a pragmatic level (label,
 * aria-label, aria-labelledby (caller resolves), title, placeholder, text).
 * Pure: no DOM access; the content script resolves aria-labelledby and passes
 * the referenced text in.
 */

export interface AccessibleNameInputs {
  readonly ariaLabel?: string | null;
  readonly ariaLabelledByText?: string | null;
  readonly labelForText?: string | null;
  readonly title?: string | null;
  readonly placeholder?: string | null;
  readonly alt?: string | null;
  readonly value?: string | null;
  readonly textContent?: string | null;
  readonly role?: string | null;
  readonly tag?: string | null;
  readonly type?: string | null;
}

function clean(value: string | null | undefined): string {
  if (!value) return '';
  return value.replace(/\s+/g, ' ').trim();
}

/**
 * Compute the accessible name. Returns null when no meaningful name is
 * available (callers must not fabricate one).
 */
export function computeAccessibleName(inputs: AccessibleNameInputs): string | null {
  const ariaLabel = clean(inputs.ariaLabel);
  if (ariaLabel) return ariaLabel;

  const labelledBy = clean(inputs.ariaLabelledByText);
  if (labelledBy) return labelledBy;

  const labelFor = clean(inputs.labelForText);
  if (labelFor) return labelFor;

  const alt = clean(inputs.alt);
  if (alt && (inputs.tag === 'img' || inputs.role === 'img')) return alt;

  const placeholder = clean(inputs.placeholder);
  if (placeholder && (inputs.tag === 'input' || inputs.tag === 'textarea')) return placeholder;

  const title = clean(inputs.title);
  if (title) return title;

  const text = clean(inputs.textContent);
  if (text && text.length <= 200) return text;

  // Buttons/links with no other name fall back to their value attribute.
  if (
    (inputs.tag === 'input' || inputs.tag === 'button') &&
    (inputs.type === 'submit' || inputs.type === 'button')
  ) {
    const value = clean(inputs.value);
    if (value) return value;
  }

  return null;
}
