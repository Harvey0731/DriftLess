import { supabase } from '../../lib/supabase';
import { getActiveGoal, createGoal, archiveGoal, getGoals } from '../goals.service';

describe('getActiveGoal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the active goal', async () => {
    const mockGoal = { id: 'g1', title: 'Write thesis', is_active: true };
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: mockGoal, error: null }),
    };
    (supabase.from as jest.Mock).mockReturnValue(mockChain);

    const result = await getActiveGoal('u1');
    expect(result).toEqual(mockGoal);
    expect(supabase.from).toHaveBeenCalledWith('goals');
  });

  it('returns null when no active goal exists', async () => {
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    };
    (supabase.from as jest.Mock).mockReturnValue(mockChain);

    const result = await getActiveGoal('u1');
    expect(result).toBeNull();
  });

  it('throws on error', async () => {
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
    };
    (supabase.from as jest.Mock).mockReturnValue(mockChain);

    await expect(getActiveGoal('u1')).rejects.toThrow('Failed to fetch active goal');
  });
});

describe('createGoal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses atomic RPC when available', async () => {
    const mockGoal = { id: 'g2', title: 'New goal', is_active: true };
    (supabase as any).rpc = jest.fn().mockResolvedValue({ data: mockGoal, error: null });

    const result = await createGoal('u1', 'New goal', 'description');
    expect(result).toEqual(expect.objectContaining({ title: 'New goal', is_active: true }));
    expect((supabase as any).rpc).toHaveBeenCalledWith('swap_active_goal', {
      p_user_id: 'u1',
      p_title: 'New goal',
      p_description: 'description',
    });
  });

  it('falls back to sequential operations when RPC fails', async () => {
    // RPC fails
    (supabase as any).rpc = jest.fn().mockResolvedValue({ data: null, error: { message: 'RPC not found' } });

    // Fallback: deactivate then insert
    const deactivateChain = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
    };
    let eqCallCount = 0;
    deactivateChain.eq.mockImplementation(() => {
      eqCallCount++;
      if (eqCallCount === 2) {
        return Promise.resolve({ error: null });
      }
      return deactivateChain;
    });

    const insertChain = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { id: 'g2', title: 'New goal', is_active: true },
        error: null,
      }),
    };

    let fromCallCount = 0;
    (supabase.from as jest.Mock).mockImplementation(() => {
      fromCallCount++;
      if (fromCallCount === 1) return deactivateChain;
      return insertChain;
    });

    const result = await createGoal('u1', 'New goal', 'description');
    expect(result).toEqual(expect.objectContaining({ title: 'New goal', is_active: true }));
  });

  it('throws if fallback deactivation fails', async () => {
    // RPC fails
    (supabase as any).rpc = jest.fn().mockResolvedValue({ data: null, error: { message: 'RPC not found' } });

    const deactivateChain = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
    };
    let eqCallCount = 0;
    deactivateChain.eq.mockImplementation(() => {
      eqCallCount++;
      if (eqCallCount === 2) {
        return Promise.resolve({ error: { message: 'Deactivation error' } });
      }
      return deactivateChain;
    });
    (supabase.from as jest.Mock).mockReturnValue(deactivateChain);

    await expect(createGoal('u1', 'Goal')).rejects.toThrow('Failed to deactivate existing goals');
  });
});

describe('archiveGoal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('archives goal requiring userId for security', async () => {
    const mockChain = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { id: 'g1', is_active: false, archived_at: '2026-03-15' },
        error: null,
      }),
    };
    (supabase.from as jest.Mock).mockReturnValue(mockChain);

    const result = await archiveGoal('g1', 'u1');
    expect(result.is_active).toBe(false);
    expect(result.archived_at).toBeDefined();
    // Verify both goalId and userId are used in eq calls
    expect(mockChain.eq).toHaveBeenCalledWith('id', 'g1');
    expect(mockChain.eq).toHaveBeenCalledWith('user_id', 'u1');
  });

  it('throws on error', async () => {
    const mockChain = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      }),
    };
    (supabase.from as jest.Mock).mockReturnValue(mockChain);

    await expect(archiveGoal('g1', 'u1')).rejects.toThrow('Failed to archive goal');
  });
});

describe('getGoals', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns non-archived goals by default', async () => {
    const mockGoals = [{ id: 'g1' }, { id: 'g2' }];
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      is: jest.fn().mockResolvedValue({ data: mockGoals, error: null }),
    };
    (supabase.from as jest.Mock).mockReturnValue(mockChain);

    const result = await getGoals('u1');
    expect(result).toEqual(mockGoals);
    expect(mockChain.is).toHaveBeenCalledWith('archived_at', null);
  });
});
