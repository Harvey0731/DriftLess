import { supabase } from '../../lib/supabase'
import { getTasksForCheckIn, getTodayTasks, toggleTaskComplete, createTask } from '../tasks.service'

describe('getTasksForCheckIn', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns tasks ordered by order_index', async () => {
    const mockTasks = [
      { id: 't1', title: 'Task 1', order_index: 0 },
      { id: 't2', title: 'Task 2', order_index: 1 },
    ]
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: mockTasks, error: null }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    const result = await getTasksForCheckIn('ci1')
    expect(result).toEqual(mockTasks)
    expect(supabase.from).toHaveBeenCalledWith('tasks')
    expect(mockChain.eq).toHaveBeenCalledWith('check_in_id', 'ci1')
    expect(mockChain.order).toHaveBeenCalledWith('order_index', {
      ascending: true,
    })
  })

  it('returns empty array when no tasks exist', async () => {
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [], error: null }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    const result = await getTasksForCheckIn('ci1')
    expect(result).toEqual([])
  })

  it('throws on error', async () => {
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Query failed' },
      }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    await expect(getTasksForCheckIn('ci1')).rejects.toThrow(
      'Failed to fetch tasks for check-in: Query failed',
    )
  })
})

describe('getTodayTasks', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-03-15T12:00:00Z'))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('returns tasks for today', async () => {
    const mockTasks = [{ id: 't1', title: 'Morning task', order_index: 0 }]
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: mockTasks, error: null }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    const result = await getTodayTasks('u1')
    expect(result).toEqual(mockTasks)
    expect(supabase.from).toHaveBeenCalledWith('tasks')
    // Should filter by user_id and today's date
    expect(mockChain.eq).toHaveBeenCalledWith('user_id', 'u1')
    expect(mockChain.eq).toHaveBeenCalledWith('daily_check_ins.check_in_date', '2026-03-15')
  })

  it('returns empty array when no tasks for today', async () => {
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [], error: null }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    const result = await getTodayTasks('u1')
    expect(result).toEqual([])
  })

  it('throws on error', async () => {
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'DB error' },
      }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    await expect(getTodayTasks('u1')).rejects.toThrow("Failed to fetch today's tasks: DB error")
  })
})

describe('toggleTaskComplete', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('marks task as completed', async () => {
    const completedTask = {
      id: 't1',
      completed: true,
      completed_at: '2026-03-15T12:00:00Z',
    }
    const mockChain = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: completedTask, error: null }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    const result = await toggleTaskComplete('t1', true, 'u1')
    expect(result).toEqual(completedTask)
    expect(supabase.from).toHaveBeenCalledWith('tasks')
    expect(mockChain.update).toHaveBeenCalledWith(expect.objectContaining({ completed: true }))
    expect(mockChain.eq).toHaveBeenCalledWith('id', 't1')
  })

  it('marks task as incomplete with null completed_at', async () => {
    const incompletedTask = {
      id: 't1',
      completed: false,
      completed_at: null,
    }
    const mockChain = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: incompletedTask,
        error: null,
      }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    const result = await toggleTaskComplete('t1', false, 'u1')
    expect(result.completed).toBe(false)
    expect(result.completed_at).toBeNull()
    expect(mockChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ completed: false, completed_at: null }),
    )
  })

  it('throws on error', async () => {
    const mockChain = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    await expect(toggleTaskComplete('t1', true, 'u1')).rejects.toThrow(
      'Failed to toggle task: Not found',
    )
  })
})

describe('createTask', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('creates a new task and returns it', async () => {
    const newTask = {
      id: 't-new',
      user_id: 'u1',
      check_in_id: 'ci1',
      title: 'New Task',
      estimated_mins: 25,
      order_index: 0,
      completed: false,
      completed_at: null,
    }
    const mockChain = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: newTask, error: null }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    const result = await createTask('u1', 'ci1', 'New Task', 25, 0)
    expect(result).toEqual(newTask)
    expect(supabase.from).toHaveBeenCalledWith('tasks')
    expect(mockChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'u1',
        check_in_id: 'ci1',
        title: 'New Task',
        estimated_mins: 25,
        order_index: 0,
        completed: false,
        completed_at: null,
      }),
    )
  })

  it('throws on insert error', async () => {
    const mockChain = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Duplicate' },
      }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    await expect(createTask('u1', 'ci1', 'Task', 25, 0)).rejects.toThrow(
      'Failed to create task: Duplicate',
    )
  })

  it('creates task with custom order_index', async () => {
    const newTask = {
      id: 't-new',
      user_id: 'u1',
      check_in_id: 'ci1',
      title: 'Third Task',
      estimated_mins: 15,
      order_index: 2,
      completed: false,
    }
    const mockChain = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: newTask, error: null }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    const result = await createTask('u1', 'ci1', 'Third Task', 15, 2)
    expect(result.order_index).toBe(2)
    expect(mockChain.insert).toHaveBeenCalledWith(expect.objectContaining({ order_index: 2 }))
  })
})
