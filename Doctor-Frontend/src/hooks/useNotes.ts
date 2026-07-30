import { useQuery } from '@tanstack/react-query'
import { fetchSessionNotes } from '@/lib/session_details_lib'

export function useNotes(sessionId: string | undefined, enabled: boolean = true) {
  return useQuery({
    queryKey: ['notes', sessionId],
    queryFn: () => fetchSessionNotes(sessionId!),
    enabled: !!sessionId && enabled,
  })
}
