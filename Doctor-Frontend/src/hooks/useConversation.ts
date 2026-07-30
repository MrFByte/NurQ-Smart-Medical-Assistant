import { useQuery } from '@tanstack/react-query'
import { fetchConversation } from '@/lib/conversation_lib'

export function useConversation(sessionId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['conversation', sessionId],
    queryFn: () => fetchConversation(sessionId!),
    enabled: !!sessionId && enabled,
  })
}
