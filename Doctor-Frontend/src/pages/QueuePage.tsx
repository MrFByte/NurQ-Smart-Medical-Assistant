import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchQueue } from '../lib/Queue_lib'
import { QueueItem, SessionStatus } from '../types'
import StatusBadge from '../components/StatusBadge'
import TopBar from '../components/TopBar'
import {
  Users, Clock, ChevronRight, AlertTriangle, CheckCircle2, Activity,
} from 'lucide-react'

export default function QueuePage() {
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date()
    return d.toISOString().split('T')[0]
  })

  const { data: queue = [], isLoading, isError, error } = useQuery({
    queryKey: ['queue', selectedDate],
    queryFn: () => fetchQueue(selectedDate),
    refetchInterval: 10000, // Refresh every 10s
  })

  const stats = {
    total: queue.length,
    inProgress: queue.filter((q) => q.session_status === 'in_progress').length,
    completed: queue.filter((q) => q.session_status === 'completed').length,
    escalated: queue.filter((q) => q.session_status === 'emergency_escalated').length,
  }

  return (
    <div className="min-h-screen">
      <TopBar />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl font-semibold text-slate-800 dark:text-white">Clinical Queue</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1.5 flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4" />
              {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' })}
            </p>
          </div>
          <div className="flex items-center gap-3 bg-white/50 dark:bg-white/[0.02] p-2 rounded-xl border border-slate-200 dark:border-white/10">
            <label className="text-sm font-medium text-slate-600 dark:text-slate-300 ml-2">Date:</label>
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="input text-sm py-1.5 bg-transparent border-0 ring-0 focus:ring-0"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard icon={<Users className="h-5 w-5" />} label="Total Patients" value={stats.total} tint="text-accent-600 dark:text-accent-400" />
          <StatCard icon={<Activity className="h-5 w-5" />} label="In Progress" value={stats.inProgress} tint="text-amber-600 dark:text-warning" />
          <StatCard icon={<CheckCircle2 className="h-5 w-5" />} label="Completed" value={stats.completed} tint="text-emerald-600 dark:text-success" />
          <StatCard icon={<AlertTriangle className="h-5 w-5" />} label="Escalated" value={stats.escalated} tint="text-red-600 dark:text-danger" />
        </div>

        {/* Table */}
        <div className="glass overflow-hidden min-h-[300px]">
          {isLoading && (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500">
              <Activity className="h-8 w-8 animate-spin mb-4 text-accent-500" />
              <p>Loading queue...</p>
            </div>
          )}

          {isError && (
            <div className="flex flex-col items-center justify-center h-64 text-red-500">
              <AlertTriangle className="h-8 w-8 mb-4" />
              <p>Error loading queue: {error instanceof Error ? error.message : 'Unknown error'}</p>
            </div>
          )}

          {!isLoading && !isError && (
            <>
              {/* Header row */}
              <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 border-b border-slate-200 dark:border-white/10 text-xs uppercase tracking-wide text-slate-400 dark:text-slate-400 font-semibold">
            <div className="col-span-1">#</div>
            <div className="col-span-2">Reg ID</div>
            <div className="col-span-2">Patient</div>
            <div className="col-span-3">Chief Complaint</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2 text-right">Action</div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-slate-100 dark:divide-white/5">
            {queue.map((item, idx) => (
              <Link
                key={item.session_id}
                to={`/session/${item.session_id}`}
                className="group grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 px-6 py-4 items-center glass-hover animate-slide-up"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                {/* Appt number */}
                <div className="md:col-span-1 flex items-center gap-3 md:gap-0">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent-600 dark:text-accent-400 font-display font-semibold text-sm border border-accent/20">
                    {item.appointment_number}
                  </span>
                </div>

                {/* Reg ID */}
                <div className="md:col-span-2 flex items-center text-sm font-mono text-slate-500 dark:text-slate-400">
                  {item.registration_id}
                </div>

                {/* Patient name */}
                <div className="md:col-span-2">
                  <div className="font-medium text-slate-800 dark:text-white group-hover:text-accent-600 dark:group-hover:text-accent-400 transition-colors">
                    {item.patient_name || 'Unknown Patient'}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 md:hidden mt-1">{item.chief_complaint}</div>
                </div>

                {/* Chief complaint */}
                <div className="md:col-span-3 text-sm text-slate-600 dark:text-slate-300 hidden md:block">
                  {item.chief_complaint}
                </div>

                {/* Status */}
                <div className="md:col-span-2">
                  <StatusBadge status={item.session_status as SessionStatus} />
                </div>

                {/* Action */}
                <div className="md:col-span-2 flex justify-end">
                  <span className="text-sm text-slate-400 group-hover:text-accent-600 dark:group-hover:text-accent-400 flex items-center gap-1 transition-colors">
                    Open session
                    <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </Link>
              ))}
            </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

function StatCard({
  icon, label, value, tint,
}: {
  icon: React.ReactNode; label: string; value: number; tint: string
}) {
  return (
    <div className="glass p-5 glass-hover">
      <div className="flex items-center justify-between">
        <div className={`p-2 rounded-lg bg-slate-100 dark:bg-white/5 ${tint}`}>{icon}</div>
        <span className="font-display text-3xl font-semibold text-slate-800 dark:text-white">{value}</span>
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-3">{label}</p>
    </div>
  )
}
