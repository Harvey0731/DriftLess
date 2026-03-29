import { supabase } from '../lib/supabase'
import type { ChatMessage } from '../types/database'

export interface ChatResponse {
  message: ChatMessage
  tokensUsed: number
}

/**
 * Send a message by calling the /ai-chat Edge Function.
 * The function persists both the user and assistant messages.
 */
export async function sendMessage(
  userId: string,
  content: string,
  context: string,
): Promise<ChatResponse> {
  // SEC: user_id is derived from the JWT server-side, NOT passed in the body.
  const { data, error } = await supabase.functions.invoke('ai-chat', {
    body: { message: content, context },
    headers: { 'x-openai-key': process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '' },
  })
  if (error) throw new Error(`Failed to send message: ${error.message}`)
  return data as ChatResponse
}

/**
 * Get paginated chat messages for a user, newest first.
 */
export async function getMessages(
  userId: string,
  limit: number,
  offset: number,
): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)
  if (error) throw new Error(`Failed to fetch messages: ${error.message}`)
  return data as unknown as ChatMessage[]
}

/**
 * Delete a single chat message.
 * H6: Requires userId to prevent users from deleting other users' messages.
 */
export async function deleteMessage(messageId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('chat_messages')
    .delete()
    .eq('id', messageId)
    .eq('user_id', userId)
  if (error) throw new Error(`Failed to delete message: ${error.message}`)
}

/**
 * Clear all chat history for a user.
 */
export async function clearHistory(userId: string): Promise<void> {
  const { error } = await supabase.from('chat_messages').delete().eq('user_id', userId)
  if (error) throw new Error(`Failed to clear chat history: ${error.message}`)
}
