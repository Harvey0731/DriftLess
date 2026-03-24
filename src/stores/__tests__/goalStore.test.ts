import { supabase } from '../../lib/supabase'
import { useGoalStore } from '../goalStore'
import { useAuthStore } from '../authStore'

// Helper to reset zustand store between tests
function resetStore() {
  useGoalStore.setState({
    activeGoal: null,
    todayCheckIn: null,
    todayTasks: [],
    isLoading: false,
  })
}

// Mock cached user in authStore (replaces network-based supabase.auth.getUser)
function mockAuthUser(userId: string) {
  useAuthStore.setState({
    user: { id: userId } as any,
    session: null,
    profile: null,
    isLoading: false,
    isAuthenticated: true,
  })
}

describe('goalStore', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetStore()
    // Default authenticated user
    mockAuthUser('u1')
  })

  describe('initial state', () => {
    it('has null activeGoal', () => {
      expect(useGoalStore.getState().activeGoal).toBeNull()
    })

    it('has null todayCheckIn', () => {
      expect(useGoalStore.getState().todayCheckIn).toBeNull()
    })

    it('has empty todayTasks', () => {
      expect(useGoalStore.getState().todayTasks).toEqual([])
    })

    it('has isLoading false', () => {
      expect(useGoalStore.getState().isLoading).toBe(false)
    })
  })

  describe('setTodayCheckIn', () => {
    it('sets todayCheckIn', () => {
      const checkIn = { id: 'ci1', goal_id: 'g1' } as any
      useGoalStore.getState().setTodayCheckIn(checkIn)
      expect(useGoalStore.getState().todayCheckIn).toEqual(checkIn)
    })

    it('sets todayCheckIn to null', () => {
      useGoalStore.setState({ todayCheckIn: { id: 'ci1' } as any })
      useGoalStore.getState().setTodayCheckIn(null)
      expect(useGoalStore.getState().todayCheckIn).toBeNull()
    })
  })

  describe('setTodayTasks', () => {
    it('sets todayTasks', () => {
      const tasks = [{ id: 't1' }, { id: 't2' }] as any
      useGoalStore.getState().setTodayTasks(tasks)
      expect(useGoalStore.getState().todayTasks).toEqual(tasks)
    })

    it('sets todayTasks to empty array', () => {
      useGoalStore.setState({ todayTasks: [{ id: 't1' }] as any })
      useGoalStore.getState().setTodayTasks([])
      expect(useGoalStore.getState().todayTasks).toEqual([])
    })
  })

  describe('fetchActiveGoal', () => {
    it('fetches and sets the active goal', async () => {
      mockAuthUser('u1')
      const mockGoal = { id: 'g1', title: 'My Goal', is_active: true }
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: mockGoal, error: null }),
      }
      ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

      await useGoalStore.getState().fetchActiveGoal()
      expect(useGoalStore.getState().activeGoal).toEqual(mockGoal)
      expect(useGoalStore.getState().isLoading).toBe(false)
    })

    it('sets activeGoal to null when none found', async () => {
      mockAuthUser('u1')
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      }
      ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

      await useGoalStore.getState().fetchActiveGoal()
      expect(useGoalStore.getState().activeGoal).toBeNull()
    })

    it('sets isLoading to false even on error', async () => {
      mockAuthUser('u1')
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: { message: 'fail' } }),
      }
      ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

      await expect(useGoalStore.getState().fetchActiveGoal()).rejects.toBeTruthy()
      expect(useGoalStore.getState().isLoading).toBe(false)
    })
  })

  describe('archiveGoal', () => {
    it('archives goal and clears state when it is the active goal', async () => {
      mockAuthUser('u1')
      useGoalStore.setState({
        activeGoal: { id: 'g1', title: 'Goal' } as any,
        todayCheckIn: { id: 'ci1' } as any,
        todayTasks: [{ id: 't1' }] as any,
      })

      // Chain: .update().eq('id', id).eq('user_id', userId) — last eq resolves
      const mockResult = { error: null }
      const mockChain: any = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn(),
      }
      mockChain.eq.mockReturnValueOnce(mockChain).mockResolvedValueOnce(mockResult)
      ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

      await useGoalStore.getState().archiveGoal('g1')
      expect(useGoalStore.getState().activeGoal).toBeNull()
      expect(useGoalStore.getState().todayCheckIn).toBeNull()
      expect(useGoalStore.getState().todayTasks).toEqual([])
    })

    it('does not clear state when archiving a different goal', async () => {
      mockAuthUser('u1')
      const activeGoal = { id: 'g1', title: 'Active Goal' } as any
      useGoalStore.setState({ activeGoal })

      const mockResult = { error: null }
      const mockChain: any = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn(),
      }
      mockChain.eq.mockReturnValueOnce(mockChain).mockResolvedValueOnce(mockResult)
      ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

      await useGoalStore.getState().archiveGoal('g-other')
      expect(useGoalStore.getState().activeGoal).toEqual(activeGoal)
    })

    it('sets isLoading to false even on error', async () => {
      mockAuthUser('u1')
      const mockResult = { error: { message: 'fail' } }
      const mockChain: any = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn(),
      }
      mockChain.eq.mockReturnValueOnce(mockChain).mockResolvedValueOnce(mockResult)
      ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

      await expect(useGoalStore.getState().archiveGoal('g1')).rejects.toBeTruthy()
      expect(useGoalStore.getState().isLoading).toBe(false)
    })
  })

  describe('toggleTask', () => {
    it('optimistically toggles task to completed', async () => {
      const tasks = [
        {
          id: 't1',
          completed: false,
          completed_at: null,
          title: 'Task 1',
        },
      ] as any
      useGoalStore.setState({ todayTasks: tasks })
      mockAuthUser('u1')

      const mockChain: any = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn(),
      }
      mockChain.eq.mockReturnValueOnce(mockChain).mockResolvedValueOnce({ error: null })
      ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

      await useGoalStore.getState().toggleTask('t1')

      const updated = useGoalStore.getState().todayTasks
      expect(updated[0].completed).toBe(true)
      expect(updated[0].completed_at).not.toBeNull()
    })

    it('optimistically toggles task to incomplete', async () => {
      const tasks = [
        {
          id: 't1',
          completed: true,
          completed_at: '2026-03-15T12:00:00Z',
          title: 'Task 1',
        },
      ] as any
      useGoalStore.setState({ todayTasks: tasks })
      mockAuthUser('u1')

      const mockChain: any = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn(),
      }
      mockChain.eq.mockReturnValueOnce(mockChain).mockResolvedValueOnce({ error: null })
      ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

      await useGoalStore.getState().toggleTask('t1')

      const updated = useGoalStore.getState().todayTasks
      expect(updated[0].completed).toBe(false)
      expect(updated[0].completed_at).toBeNull()
    })

    it('reverts on error (rollback)', async () => {
      const originalTask = {
        id: 't1',
        completed: false,
        completed_at: null,
        title: 'Task 1',
      }
      useGoalStore.setState({ todayTasks: [originalTask] as any })
      mockAuthUser('u1')

      const mockChain: any = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn(),
      }
      mockChain.eq
        .mockReturnValueOnce(mockChain)
        .mockResolvedValueOnce({ error: { message: 'DB fail' } })
      ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

      await expect(useGoalStore.getState().toggleTask('t1')).rejects.toBeTruthy()

      // Should revert to original state
      const reverted = useGoalStore.getState().todayTasks
      expect(reverted[0].completed).toBe(false)
      expect(reverted[0].completed_at).toBeNull()
    })

    it('does nothing when task not found', async () => {
      useGoalStore.setState({ todayTasks: [] })

      await useGoalStore.getState().toggleTask('nonexistent')

      // No supabase call should have been made
      expect(supabase.from).not.toHaveBeenCalled()
    })

    it('only toggles the targeted task, leaving others unchanged', async () => {
      const tasks = [
        { id: 't1', completed: false, completed_at: null },
        { id: 't2', completed: true, completed_at: '2026-03-15T10:00:00Z' },
      ] as any
      useGoalStore.setState({ todayTasks: tasks })
      mockAuthUser('u1')

      const mockChain: any = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn(),
      }
      mockChain.eq.mockReturnValueOnce(mockChain).mockResolvedValueOnce({ error: null })
      ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

      await useGoalStore.getState().toggleTask('t1')

      const updated = useGoalStore.getState().todayTasks
      expect(updated[0].completed).toBe(true)
      expect(updated[1].completed).toBe(true) // unchanged
      expect(updated[1].completed_at).toBe('2026-03-15T10:00:00Z') // unchanged
    })
  })

  describe('fetchTodayCheckIn', () => {
    it('sets todayCheckIn to null when no active goal', async () => {
      mockAuthUser('u1')
      useGoalStore.setState({ activeGoal: null })

      await useGoalStore.getState().fetchTodayCheckIn()
      expect(useGoalStore.getState().todayCheckIn).toBeNull()
    })

    it('fetches check-in for today when active goal exists', async () => {
      mockAuthUser('u1')
      useGoalStore.setState({
        activeGoal: { id: 'g1' } as any,
      })

      const mockCheckIn = { id: 'ci1', goal_id: 'g1' }
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: mockCheckIn, error: null }),
      }
      ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

      await useGoalStore.getState().fetchTodayCheckIn()
      expect(useGoalStore.getState().todayCheckIn).toEqual(mockCheckIn)
    })
  })

  describe('fetchTodayTasks', () => {
    it('sets todayTasks to empty when no check-in', async () => {
      mockAuthUser('u1')
      useGoalStore.setState({ todayCheckIn: null })

      await useGoalStore.getState().fetchTodayTasks()
      expect(useGoalStore.getState().todayTasks).toEqual([])
    })

    it('fetches tasks when check-in exists', async () => {
      mockAuthUser('u1')
      useGoalStore.setState({
        todayCheckIn: { id: 'ci1' } as any,
      })

      const mockTasks = [{ id: 't1' }, { id: 't2' }]
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockTasks, error: null }),
      }
      ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

      await useGoalStore.getState().fetchTodayTasks()
      expect(useGoalStore.getState().todayTasks).toEqual(mockTasks)
    })

    it('sets empty array when data is null', async () => {
      mockAuthUser('u1')
      useGoalStore.setState({
        todayCheckIn: { id: 'ci1' } as any,
      })

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: null, error: null }),
      }
      ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

      await useGoalStore.getState().fetchTodayTasks()
      expect(useGoalStore.getState().todayTasks).toEqual([])
    })
  })

  describe('createGoal', () => {
    it('calls swap_active_goal RPC and sets activeGoal', async () => {
      mockAuthUser('u1')

      const newGoal = { id: 'g-new', title: 'New Goal', is_active: true }
      ;(supabase.rpc as jest.Mock).mockResolvedValue({
        data: newGoal,
        error: null,
      })

      const result = await useGoalStore.getState().createGoal('New Goal', 'desc')
      expect(supabase.rpc).toHaveBeenCalledWith('swap_active_goal', {
        p_user_id: 'u1',
        p_title: 'New Goal',
        p_description: 'desc',
      })
      expect(result).toEqual(expect.objectContaining({ title: 'New Goal', is_active: true }))
      expect(useGoalStore.getState().activeGoal).toEqual(result)
      expect(useGoalStore.getState().isLoading).toBe(false)
    })

    it('throws and sets isLoading false on RPC error', async () => {
      mockAuthUser('u1')
      ;(supabase.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'RPC fail' },
      })

      await expect(useGoalStore.getState().createGoal('Goal')).rejects.toBeTruthy()
      expect(useGoalStore.getState().isLoading).toBe(false)
    })
  })
})
