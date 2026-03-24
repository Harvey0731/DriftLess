import { supabase } from '../../lib/supabase';
import { signUp, signIn, signOut, resetPassword, getCurrentSession, onAuthStateChange } from '../auth.service';

// The supabase mock is set up globally via jest.setup.js

describe('signIn', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns data on successful sign-in', async () => {
    const mockData = { user: { id: 'u1' }, session: { access_token: 'tok' } };
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      data: mockData,
      error: null,
    });

    const result = await signIn('test@example.com', 'password123');
    expect(result).toEqual(mockData);
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
  });

  it('throws on wrong credentials', async () => {
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      data: null,
      error: { message: 'Invalid login credentials' },
    });

    await expect(signIn('test@example.com', 'wrong')).rejects.toThrow('Sign-in failed: Invalid login credentials');
  });

  it('throws on network error', async () => {
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      data: null,
      error: { message: 'Network request failed' },
    });

    await expect(signIn('test@example.com', 'pass')).rejects.toThrow('Sign-in failed');
  });
});

describe('signUp', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates account and profile on success', async () => {
    const mockUser = { id: 'new-user-id' };
    (supabase.auth.signUp as jest.Mock).mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Mock the chained from().insert() call
    const mockInsert = jest.fn().mockResolvedValue({ error: null });
    (supabase.from as jest.Mock).mockReturnValue({
      insert: mockInsert,
    });

    const result = await signUp('new@example.com', 'password123');
    expect(result).toEqual({ user: mockUser });
    expect(supabase.from).toHaveBeenCalledWith('profiles');
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'new-user-id',
        onboarding_done: false,
        streak_shields: 0,
      }),
    );
  });

  it('throws if auth signUp fails', async () => {
    (supabase.auth.signUp as jest.Mock).mockResolvedValue({
      data: { user: null },
      error: { message: 'Email already registered' },
    });

    await expect(signUp('existing@example.com', 'pass')).rejects.toThrow('Sign-up failed: Email already registered');
  });

  it('throws if profile creation fails', async () => {
    (supabase.auth.signUp as jest.Mock).mockResolvedValue({
      data: { user: { id: 'u2' } },
      error: null,
    });

    (supabase.from as jest.Mock).mockReturnValue({
      insert: jest.fn().mockResolvedValue({ error: { message: 'Duplicate key' } }),
    });

    await expect(signUp('dup@example.com', 'pass')).rejects.toThrow('Profile creation failed');
  });
});

describe('signOut', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolves on successful sign-out', async () => {
    (supabase.auth.signOut as jest.Mock).mockResolvedValue({ error: null });
    await expect(signOut()).resolves.toBeUndefined();
  });

  it('throws on error', async () => {
    (supabase.auth.signOut as jest.Mock).mockResolvedValue({
      error: { message: 'Session expired' },
    });
    await expect(signOut()).rejects.toThrow('Sign-out failed');
  });
});

describe('resetPassword', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolves on success', async () => {
    (supabase.auth.resetPasswordForEmail as jest.Mock).mockResolvedValue({ error: null });
    await expect(resetPassword('test@example.com')).resolves.toBeUndefined();
    expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith('test@example.com');
  });

  it('throws on invalid email', async () => {
    (supabase.auth.resetPasswordForEmail as jest.Mock).mockResolvedValue({
      error: { message: 'User not found' },
    });
    await expect(resetPassword('bad@example.com')).rejects.toThrow('Password reset failed');
  });
});

describe('getCurrentSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns session when authenticated', async () => {
    const mockSession = { access_token: 'tok', user: { id: 'u1' } };
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    const session = await getCurrentSession();
    expect(session).toEqual(mockSession);
  });

  it('returns null when not authenticated', async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
      error: null,
    });

    const session = await getCurrentSession();
    expect(session).toBeNull();
  });
});

describe('onAuthStateChange', () => {
  it('returns a subscription object', () => {
    const callback = jest.fn();
    const subscription = onAuthStateChange(callback);
    expect(subscription).toHaveProperty('unsubscribe');
  });
});
