import { describe, expect, it } from 'vitest';
import { classifyRisk } from './risk';

describe('classifyRisk', () => {
  it('marks password inputs critical', () => {
    expect(
      classifyRisk({
        tag: 'input',
        role: null,
        type: 'password',
        accessibleName: 'Password',
        isInForm: true,
        formMethod: 'post',
        formAction: '/login',
        hasConfirmDialog: false,
        isExternalOrigin: false,
        inputType: 'password',
        sectionText: '',
        ariaHasPopup: null,
      }),
    ).toBe('critical');
  });
  it('marks checkout/payment section critical', () => {
    expect(
      classifyRisk({
        tag: 'button',
        role: 'button',
        type: 'submit',
        accessibleName: 'Pay now',
        isInForm: true,
        formMethod: 'post',
        formAction: '/checkout',
        hasConfirmDialog: false,
        isExternalOrigin: false,
        inputType: 'submit',
        sectionText: 'checkout total $42',
        ariaHasPopup: null,
      }),
    ).toBe('critical');
  });
  it('marks delete-account critical', () => {
    expect(
      classifyRisk({
        tag: 'button',
        role: 'button',
        type: 'button',
        accessibleName: 'Delete account',
        isInForm: false,
        formMethod: null,
        formAction: null,
        hasConfirmDialog: true,
        isExternalOrigin: false,
        inputType: null,
        sectionText: '',
        ariaHasPopup: null,
      }),
    ).toBe('critical');
  });
  it('classifies high-risk submit keywords as high', () => {
    expect(
      classifyRisk({
        tag: 'button',
        role: 'button',
        type: 'submit',
        accessibleName: 'Delete item',
        isInForm: true,
        formMethod: 'post',
        formAction: '/items/1',
        hasConfirmDialog: false,
        isExternalOrigin: false,
        inputType: 'submit',
        sectionText: '',
        ariaHasPopup: null,
      }),
    ).toBe('high');
  });
  it('classifies plain navigation link as low', () => {
    expect(
      classifyRisk({
        tag: 'a',
        role: 'link',
        type: null,
        accessibleName: 'About',
        isInForm: false,
        formMethod: null,
        formAction: null,
        hasConfirmDialog: false,
        isExternalOrigin: false,
        inputType: null,
        sectionText: '',
        ariaHasPopup: null,
      }),
    ).toBe('low');
  });
  it('classifies tab as low', () => {
    expect(
      classifyRisk({
        tag: 'button',
        role: 'tab',
        type: 'button',
        accessibleName: 'Overview',
        isInForm: false,
        formMethod: null,
        formAction: null,
        hasConfirmDialog: false,
        isExternalOrigin: false,
        inputType: 'button',
        sectionText: '',
        ariaHasPopup: null,
      }),
    ).toBe('low');
  });
  it('does not treat the label alone as decisive (delete in a non-action context still high via keyword)', () => {
    // A button whose name contains "delete" must not be low even if role=button.
    expect(
      classifyRisk({
        tag: 'button',
        role: 'button',
        type: 'button',
        accessibleName: 'Delete',
        isInForm: false,
        formMethod: null,
        formAction: null,
        hasConfirmDialog: false,
        isExternalOrigin: false,
        inputType: 'button',
        sectionText: '',
        ariaHasPopup: null,
      }),
    ).toBe('high');
  });
});
