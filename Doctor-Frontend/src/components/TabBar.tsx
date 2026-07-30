export interface TabDef {
  key: string
  label: string
  icon?: React.ReactNode
}

interface TabBarProps {
  tabs: TabDef[]
  activeTab: string
  onChange: (key: string) => void
}

export default function TabBar({ tabs, activeTab, onChange }: TabBarProps) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-200 dark:border-white/10 mb-6 -mx-1 px-1">
      {tabs.map((tab) => {
        const isActive = tab.key === activeTab
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`flex items-center gap-1.5 whitespace-nowrap px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              isActive
                ? 'border-accent-500 text-accent-600 dark:text-accent-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
