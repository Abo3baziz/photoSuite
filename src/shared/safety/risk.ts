/**
 * Element risk classification (FR-06). Structural, label-light: the element's
 * accessible name alone is never sufficient. Inputs describe the surrounding
 * context (form method, action, section keywords, ARIA, input type) gathered
 * by the content script.
 */

export type RiskClass = 'low' | 'medium' | 'high' | 'critical';

export interface RiskInputs {
  readonly tag: string;
  readonly role: string | null;
  readonly type: string | null;
  readonly accessibleName: string | null;
  readonly isInForm: boolean;
  readonly formMethod: string | null;
  readonly formAction: string | null;
  readonly hasConfirmDialog: boolean;
  readonly isExternalOrigin: boolean;
  readonly inputType: string | null;
  readonly sectionText: string;
  readonly ariaHasPopup: string | null;
}

const CRITICAL_KEYWORDS = [
  'password',
  'payment',
  'card number',
  'cvv',
  'checkout',
  'delete account',
  'close account',
];
const HIGH_KEYWORDS = [
  'delete',
  'remove',
  'cancel',
  'submit',
  'pay',
  'checkout',
  'send',
  'logout',
  'sign out',
];
const MEDIUM_KEYWORDS = [
  'save',
  'update',
  'edit',
  'create',
  'add',
  'apply',
  'continue',
  'next',
  'confirm',
];

function containsAny(haystack: string, needles: readonly string[]): boolean {
  const lower = haystack.toLowerCase();
  return needles.some((needle) => lower.includes(needle));
}

export function classifyRisk(inputs: RiskInputs): RiskClass {
  const section = inputs.sectionText.toLowerCase();
  const name = (inputs.accessibleName ?? '').toLowerCase();

  // Critical: passwords, payment, account deletion, checkout contexts.
  if (inputs.inputType === 'password') return 'critical';
  if (inputs.isExternalOrigin && inputs.tag === 'form') return 'critical';
  if (CRITICAL_KEYWORDS.some((k) => section.includes(k) || name.includes(k))) return 'critical';
  if (inputs.formAction && /delete|destroy|remove|close-account/i.test(inputs.formAction))
    return 'critical';

  // Form submissions are at least medium; external/irreversible → high.
  if (inputs.isInForm && (inputs.formMethod ?? 'get').toLowerCase() === 'post') {
    if (inputs.hasConfirmDialog) return 'high';
    if (containsAny(`${section} ${name} ${inputs.formAction ?? ''}`, HIGH_KEYWORDS)) return 'high';
    return 'medium';
  }

  if (inputs.hasConfirmDialog) return 'high';
  if (containsAny(`${name} ${section}`, HIGH_KEYWORDS)) return 'high';
  if (inputs.ariaHasPopup === 'dialog' || inputs.ariaHasPopup === 'menu') return 'medium';
  if (containsAny(`${name} ${section}`, MEDIUM_KEYWORDS)) return 'medium';

  // Plain navigation-ish controls default to low.
  if (inputs.tag === 'a' && !inputs.isInForm) return 'low';
  if (inputs.role === 'tab' || inputs.role === 'menuitem') return 'low';
  if (inputs.role === 'button' && !containsAny(name, HIGH_KEYWORDS)) return 'low';

  return 'medium';
}
