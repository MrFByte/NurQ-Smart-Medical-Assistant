import { Loader2, MessageCircle } from 'lucide-react'
import { useConversation } from '@/hooks/useConversation'

export default function ConversationTab({ sessionId, active }: { sessionId: string; active: boolean }) {
  const { data: turns = [], isLoading, isError } = useConversation(sessionId, active)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading conversation…
      </div>
    )
  }

  if (isError) {
    return <div className="py-12 text-center text-red-500 text-sm">Failed to load conversation.</div>
  }

  if (turns.length === 0) {
    return <div className="py-12 text-center text-slate-400 text-sm">No conversation recorded.</div>
  }

  return (
    <div className="space-y-3 max-w-3xl">
      {turns.map((turn, idx) => (
        <div
          key={idx}
          className={`flex ${turn.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              turn.role === 'user'
                ? 'bg-accent-500/10 text-slate-800 dark:text-white border border-accent-500/20'
                : 'bg-slate-50 dark:bg-white/[0.03] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10'
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 mb-1">
              <MessageCircle className="h-3 w-3" />
              {turn.role === 'user' ? 'Patient' : 'Assistant'}
              <span>· {new Date(turn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            {turn.content}
          </div>
        </div>
      ))}
    </div>
  )
}
