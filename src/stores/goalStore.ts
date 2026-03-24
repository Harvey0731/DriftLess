import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { useAuthStore } from './authStore'
import { getTodayDateString } from '../utils/time'
import type { Goal, DailyCheckIn, Task } from '../types/database'

// ─── Types ──────────────────────────────────────────────────────────────────

interface GoalState {
  activeGoal: Goal | null
  todayCheckIn: DailyCheckIn | null
  todayTasks: Task[]
  isLoading: boolean
}

interface GoalActions {
  fetchActiveGoal: () => Promise<void>
  createGoal: (title: string, description?: string) => Promise<Goal>
  archiveGoal: (id: string) => Promise<void>
  fetchTodayCheckIn: () => Promise<void>
  fetchTodayTasks: () => Promise<void>
  toggleTask: (taskId: string) => Promise<void>
  setTodayCheckIn: (checkIn: DailyCheckIn | null) => void
  setTodayTasks: (tasks: Task[]) => void
}

type GoalStore = GoalState & GoalActions

// ─── Helpers ────────────────────────────────────────────────────────────────

function todayDateString(): string {
  return getTodayDateString()
}

/** Get cached user ID from authStore (no network call). */
function getCachedUserId(): string {
  const userId = useAuthStore.getState().user?.id
  if (!userId) throw new Error('Not authenticated')
  return userId
}

// ─── Store ──────────────────────────────────────────────────────────────────

export const useGoalStore = create<GoalStore>()((set, get) => ({
  // state
  activeGoal: null,
  todayCheckIn: null,
  todayTasks: [],
  isLoading: false,

  // actions

  fetchActiveGoal: async () => {
    set({ isLoading: true })
    try {
      const userId = getCachedUserId()

      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) throw error
      set({ activeGoal: data as unknown as Goal | null })
    } finally {
      set({ isLoading: false })
    }
  },

  createGoal: async (title, description) => {
    set({ isLoading: true })
    try {
      const userId = getCachedUserId()

      // Atomic goal swap: deactivate old + insert new in a single DB transaction
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)('swap_active_goal', {
        p_user_id: userId,
        p_title: title,
        p_description: description ?? null,
      })

      if (error) throw error
      const typedGoal = data as unknown as Goal
      set({ activeGoal: typedGoal })
      return typedGoal
    } finally {
      set({ isLoading: false })
    }
  },

  archiveGoal: async (id) => {
    set({ isLoading: true })
    try {
      const userId = getCachedUserId()
      const { error } = await supabase
        .from('goals')
        .update({ is_active: false, archived_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', userId)

      if (error) throw error

      if (get().activeGoal?.id === id) {
        set({ activeGoal: null, todayCheckIn: null, todayTasks: [] })
      }
    } finally {
      set({ isLoading: false })
    }
  },

  fetchTodayCheckIn: async () => {
    const userId = getCachedUserId()
    const goalId = get().activeGoal?.id
    if (!goalId) {
      set({ todayCheckIn: null })
      return
    }

    const { data, error } = await supabase
      .from('daily_check_ins')
      .select('*')
      .eq('user_id', userId)
      .eq('goal_id', goalId)
      .eq('check_in_date', todayDateString())
      .maybeSingle()

    if (error) throw error
    set({ todayCheckIn: data as unknown as DailyCheckIn | null })
  },

  fetchTodayTasks: async () => {
    const userId = getCachedUserId()
    const checkInId = get().todayCheckIn?.id
    if (!checkInId) {
      set({ todayTasks: [] })
      return
    }

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .eq('check_in_id', checkInId)
      .order('order_index', { ascending: true })

    if (error) throw error
    set({ todayTasks: (data ?? []) as unknown as Task[] })
  },

  toggleTask: async (taskId) => {
    const tasks = get().todayTasks
    const task = tasks.find((t) => t.id === taskId)
    if (!task) return

    const newCompleted = !task.completed

    // Optimistic update
    set({
      todayTasks: tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              completed: newCompleted,
              completed_at: newCompleted ? new Date().toISOString() : null,
            }
          : t,
      ),
    })

    const userId = getCachedUserId()
    const { error } = await supabase
      .from('tasks')
      .update({
        completed: newCompleted,
        completed_at: newCompleted ? new Date().toISOString() : null,
      })
      .eq('id', taskId)
      .eq('user_id', userId)

    if (error) {
      // Revert on failure
      set({
        todayTasks: tasks.map((t) => (t.id === taskId ? task : t)),
      })
      throw error
    }
  },

  setTodayCheckIn: (checkIn) => set({ todayCheckIn: checkIn }),
  setTodayTasks: (tasks) => set({ todayTasks: tasks }),
}))
