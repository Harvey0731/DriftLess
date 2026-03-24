/**
 * Tests for Sentry wrapper functions.
 * Since src/lib/sentry.ts does not yet exist, these tests validate
 * the underlying @sentry/react-native mock behavior and serve as
 * a specification for when the module is created.
 */
import * as Sentry from '@sentry/react-native';

// The @sentry/react-native module is mocked globally via jest.setup.js

describe('Sentry mock (specification for src/lib/sentry.ts)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('init', () => {
    it('can be called with a DSN config', () => {
      Sentry.init({ dsn: 'https://example@sentry.io/123' });
      expect(Sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({ dsn: 'https://example@sentry.io/123' }),
      );
    });

    it('can be called without a DSN (no-op scenario)', () => {
      Sentry.init({});
      expect(Sentry.init).toHaveBeenCalledWith({});
    });
  });

  describe('captureException', () => {
    it('captures an Error object', () => {
      const error = new Error('Test error');
      Sentry.captureException(error);
      expect(Sentry.captureException).toHaveBeenCalledWith(error);
    });

    it('captures a string error', () => {
      Sentry.captureException('string error');
      expect(Sentry.captureException).toHaveBeenCalledWith('string error');
    });
  });

  describe('setUser', () => {
    it('sets a user with id and email', () => {
      Sentry.setUser({ id: 'u1', email: 'test@example.com' });
      expect(Sentry.setUser).toHaveBeenCalledWith({ id: 'u1', email: 'test@example.com' });
    });

    it('clears user by passing null', () => {
      Sentry.setUser(null);
      expect(Sentry.setUser).toHaveBeenCalledWith(null);
    });
  });

  describe('withScope', () => {
    it('calls the callback with a scope object', () => {
      const callback = jest.fn();
      Sentry.withScope(callback);
      expect(callback).toHaveBeenCalled();
      // The mock provides setExtra on the scope
      const scopeArg = callback.mock.calls[0][0];
      expect(scopeArg).toHaveProperty('setExtra');
    });
  });

  describe('addBreadcrumb', () => {
    it('adds a breadcrumb with category and message', () => {
      Sentry.addBreadcrumb({
        category: 'navigation',
        message: 'User navigated to home',
        level: 'info',
      });
      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'navigation',
          message: 'User navigated to home',
        }),
      );
    });

    it('adds a breadcrumb with data payload', () => {
      Sentry.addBreadcrumb({
        category: 'session',
        message: 'Session started',
        data: { sessionId: 's1', duration: 25 },
      });
      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { sessionId: 's1', duration: 25 },
        }),
      );
    });
  });
});
