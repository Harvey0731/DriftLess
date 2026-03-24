/**
 * RLS policy verification tests.
 *
 * These are STATIC tests that validate the SQL migration files contain
 * the expected RLS policies for every table. They parse the migration SQL
 * to ensure no table is left without RLS.
 *
 * Run: deno test supabase/functions/_test_helpers/rls_policy.test.ts --allow-read
 */
import { assertEquals, assert } from 'https://deno.land/std@0.220.0/assert/mod.ts'

const MIGRATIONS_DIR = new URL('../../migrations/', import.meta.url).pathname

async function readMigrations(): Promise<string> {
  let combined = ''
  for await (const entry of Deno.readDir(MIGRATIONS_DIR)) {
    if (entry.name.endsWith('.sql')) {
      combined += await Deno.readTextFile(`${MIGRATIONS_DIR}/${entry.name}`)
      combined += '\n'
    }
  }
  return combined
}

const EXPECTED_TABLES = [
  'profiles',
  'goals',
  'daily_check_ins',
  'tasks',
  'focus_sessions',
  'chat_messages',
  'promises',
  'subscriptions',
]

Deno.test('all tables have RLS enabled', async () => {
  const sql = await readMigrations()

  for (const table of EXPECTED_TABLES) {
    const rlsPattern = new RegExp(
      `ALTER\\s+TABLE\\s+${table}\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`,
      'i',
    )
    assert(rlsPattern.test(sql), `Missing "ENABLE ROW LEVEL SECURITY" for table: ${table}`)
  }
})

Deno.test('all tables have at least one RLS policy', async () => {
  const sql = await readMigrations()

  for (const table of EXPECTED_TABLES) {
    const policyPattern = new RegExp(
      `CREATE\\s+POLICY\\s+\\w+\\s+ON\\s+${table}`,
      'i',
    )
    assert(policyPattern.test(sql), `No RLS policy found for table: ${table}`)
  }
})

Deno.test('all user-owned tables have SELECT policy with auth.uid() check', async () => {
  const sql = await readMigrations()

  // Tables that should restrict SELECT to the owning user
  const userOwnedTables = [
    'goals',
    'daily_check_ins',
    'tasks',
    'focus_sessions',
    'chat_messages',
    'promises',
  ]

  for (const table of userOwnedTables) {
    const selectPolicyPattern = new RegExp(
      `CREATE\\s+POLICY[^;]*ON\\s+${table}[^;]*FOR\\s+SELECT[^;]*auth\\.uid\\(\\)`,
      'is',
    )
    assert(
      selectPolicyPattern.test(sql),
      `Table ${table} should have a SELECT policy using auth.uid()`,
    )
  }
})

Deno.test('profiles table uses id = auth.uid() (not user_id)', async () => {
  const sql = await readMigrations()

  // Profiles uses `id` as the FK to auth.users, not `user_id`
  const profilePolicy = /CREATE\s+POLICY[^;]*ON\s+profiles[^;]*auth\.uid\(\)\s*=\s*id/is
  assert(
    profilePolicy.test(sql),
    'Profiles RLS policy should compare auth.uid() = id',
  )
})

Deno.test('subscriptions table has RLS enabled', async () => {
  const sql = await readMigrations()
  assert(
    /ALTER\s+TABLE\s+subscriptions\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i.test(sql),
    'Subscriptions table must have RLS enabled',
  )
})

Deno.test('atomic functions exist: swap_active_goal', async () => {
  const sql = await readMigrations()
  assert(
    /CREATE\s+(OR\s+REPLACE\s+)?FUNCTION\s+swap_active_goal/i.test(sql),
    'swap_active_goal function should exist in migrations',
  )
})

Deno.test('atomic functions exist: increment_rate_limit', async () => {
  const sql = await readMigrations()
  assert(
    /CREATE\s+(OR\s+REPLACE\s+)?FUNCTION\s+increment_rate_limit/i.test(sql),
    'increment_rate_limit function should exist in migrations',
  )
})
