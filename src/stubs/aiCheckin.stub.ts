/**
 * STUB — remove this file and the import in check-in.tsx once OpenAI API key is set.
 * Simulates the ai-checkin edge function response with 2 hardcoded tasks.
 * Also writes a real daily_check_ins row + task rows so the home screen GoalCard works.
 */

import { supabase } from '../lib/supabase'
import { getTodayDateString } from '../utils/time'

export const AI_CHECKIN_STUB_ENABLED = true

export interface StubCheckinResponse {
  message: string
  tasks: Array<{
    id: string
    title: string
    estimated_mins: number
    difficulty: 'easy' | 'medium' | 'hard'
  }>
  check_in_id: string
}

export async function stubAiCheckin(): Promise<StubCheckinResponse> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 1200))

  // Get the current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    // No user — fall back to stub IDs (can't write to DB)
    return {
      message: "Got it — here's a focused plan to get you started today.",
      check_in_id: 'stub-checkin-id-001',
      tasks: [
        { id: 'stub-task-001', title: 'Write the first draft outline', estimated_mins: 25, difficulty: 'medium' },
        { id: 'stub-task-002', title: 'Review and clean up notes from last session', estimated_mins: 15, difficulty: 'easy' },
      ],
    }
  }

  const today = getTodayDateString()

  // Upsert today's check-in row (so re-running the stub today doesn't duplicate)
  const { data: checkInRow, error: checkInErr } = await supabase
    .from('daily_check_ins')
    .upsert(
      {
        user_id: user.id,
        check_in_date: today,
        energy_level: 3,
        today_goal_text: "Today's stub tasks",
        completed: false,
      },
      { onConflict: 'user_id,check_in_date', ignoreDuplicates: false },
    )
    .select('id')
    .single()

  if (checkInErr || !checkInRow) {
    // DB write failed — fall back to stub IDs silently
    return {
      message: "Got it — here's a focused plan to get you started today.",
      check_in_id: 'stub-checkin-id-001',
      tasks: [
        { id: 'stub-task-001', title: 'Write the first draft outline', estimated_mins: 25, difficulty: 'medium' },
        { id: 'stub-task-002', title: 'Review and clean up notes from last session', estimated_mins: 15, difficulty: 'easy' },
      ],
    }
  }

  const checkInId: string = checkInRow.id

  // Insert stub tasks linked to this check-in (delete old stub tasks first to avoid dupes on re-run)
  await supabase.from('tasks').delete().eq('check_in_id', checkInId).eq('user_id', user.id)

  const stubTasks = [
    { user_id: user.id, check_in_id: checkInId, title: 'Write the first draft outline', estimated_mins: 25, completed: false, order_index: 0 },
    { user_id: user.id, check_in_id: checkInId, title: 'Review and clean up notes from last session', estimated_mins: 15, completed: false, order_index: 1 },
  ]

  const { data: insertedTasks, error: tasksErr } = await supabase
    .from('tasks')
    .insert(stubTasks)
    .select('id, title, estimated_mins')

  if (tasksErr || !insertedTasks) {
    return {
      message: "Got it — here's a focused plan to get you started today.",
      check_in_id: checkInId,
      tasks: [
        { id: 'stub-task-001', title: 'Write the first draft outline', estimated_mins: 25, difficulty: 'medium' },
        { id: 'stub-task-002', title: 'Review and clean up notes from last session', estimated_mins: 15, difficulty: 'easy' },
      ],
    }
  }

  return {
    message: "Got it — here's a focused plan to get you started today.",
    check_in_id: checkInId,
    tasks: [
      { id: insertedTasks[0].id, title: insertedTasks[0].title, estimated_mins: insertedTasks[0].estimated_mins, difficulty: 'medium' },
      { id: insertedTasks[1].id, title: insertedTasks[1].title, estimated_mins: insertedTasks[1].estimated_mins, difficulty: 'easy' },
    ],
  }
}
