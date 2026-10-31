import { describe, expect, it } from 'vitest';
import { isDangerousRoute } from './dangerousRoutes';

describe('isDangerousRoute', () => {
  it('blocks logout and account-deletion paths', () => {
    expect(isDangerousRoute('/logout')).toBe(true);
    expect(isDangerousRoute('/account/delete')).toBe(true);
    expect(isDangerousRoute('/sign-out')).toBe(true);
  });
  it('blocks admin and payment paths', () => {
    expect(isDangerousRoute('/admin/users')).toBe(true);
    expect(isDangerousRoute('/checkout')).toBe(true);
    expect(isDangerousRoute('/payment/confirm')).toBe(true);
  });
  it('allows ordinary content routes', () => {
    expect(isDangerousRoute('/')).toBe(false);
    expect(isDangerousRoute('/products/42')).toBe(false);
    expect(isDangerousRoute('/about')).toBe(false);
  });
  it('is case-insensitive', () => {
    expect(isDangerousRoute('/LOGOUT')).toBe(true);
  });
});
