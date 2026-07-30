import { ShieldAlert } from 'lucide-react'

export default function SafetyCheckBadge() {
  return (
    <span
      className="badge bg-amber-50 text-amber-700 border-amber-300 dark:bg-warning/15 dark:text-warning dark:border-warning/30"
      title="The emergency-detection check failed to run for this session — it has not been confirmed clear."
    >
      <ShieldAlert className="h-3 w-3" />
      Safety check incomplete
    </span>
  )
}
