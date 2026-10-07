import { FileWarning } from 'lucide-react'

export default function DataQualityBadge() {
  return (
    <span
      className="badge bg-amber-50 text-amber-700 border-amber-300 dark:bg-warning/15 dark:text-warning dark:border-warning/30"
      title="Some of this patient's answers could not be processed during intake — review the conversation manually before relying on the extracted fields."
    >
      <FileWarning className="h-3 w-3" />
      Data incomplete
    </span>
  )
}
