import { supabase } from '../lib/supabase'
import { getTodayDateString } from '../utils/time'
import type { Task } from '../types/database'

/**
 * Get all tasks for a specific check-in, ordered by order_index.
 */
export async function getTasksForCheckIn(checkInId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('check_in_id', checkInId)
    .order('order_index', { ascending: true })
  if (error) throw new Error(`Failed to fetch tasks for check-in: ${error.message}`)
  return data as unknown as Task[]
}

/**
 * Get today's tasks for a user (tasks linked to today's check-in).
 */
export async function getTodayTasks(userId: string): Promise<Task[]> {
  const today = getTodayDateString()
  const { data, error } = await supabase
    .from('tasks')
    .select('*, daily_check_ins!inner(check_in_date)')
    .eq('user_id', userId)
    .eq('daily_check_ins.check_in_date', today)
    .order('order_index', { ascending: true })
  if (error) throw new Error(`Failed to fetch today's tasks: ${error.message}`)
  return (data ?? []) as Task[]
}

/**
 * Toggle a task's completion status.
 */
export async function toggleTaskComplete(
  taskId: string,
  completed: boolean,
  userId: string,
): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .update({
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    })
    .eq('id', taskId)
    .eq('user_id', userId)
    .select()
    .single()
  if (error) throw new Error(`Failed to toggle task: ${error.message}`)
  return data as unknown as Task
}

/**
 * Create a new task for a given check-in.
 */
export async function createTask(
  userId: string,
  checkInId: string,
  title: string,
  estimatedMins: number,
  orderIndex: number,
): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      user_id: userId,
      check_in_id: checkInId,
      title,
      estimated_mins: estimatedMins,
      order_index: orderIndex,
      completed: false,
      completed_at: null,
    })
    .select()
    .single()
  if (error) throw new Error(`Failed to create task: ${error.message}`)
  return data as unknown as Task
}
