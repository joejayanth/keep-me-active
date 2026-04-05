import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getWorkoutsForUser } from '../lib/workouts'
import type { WorkoutLog } from '../lib/types'
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns'
import { Flame, BedDouble, Dumbbell, ChevronRight, CalendarDays } from 'lucide-react'

export default function HomePage() {
  const { profile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [workouts, setWorkouts] = useState<WorkoutLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    getWorkoutsForUser(profile.uid).then(w => {
      setWorkouts(w)
      setLoading(false)
    })
    refreshProfile()
  }, [profile?.uid])

  const today = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')
  const todayLog = workouts.find(w => w.date === todayStr)

  // Build the last 7 days for the mini calendar
  const weekStart = startOfWeek(today, { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  // Recent workouts (last 5, excluding today)
  const recentWorkouts = workouts.filter(w => w.date !== todayStr).slice(0, 5)

  // Stats
  const thisWeekWorkouts = workouts.filter(w => {
    const d = parseISO(w.date)
    return d >= weekStart && d <= today && w.type === 'workout'
  }).length

  const totalWorkouts = workouts.filter(w => w.type === 'workout').length

  return (
    <div className="px-4 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-gray-400 text-sm">Welcome back,</p>
          <h1 className="text-2xl font-bold text-white">{profile?.displayName?.split(' ')[0] || 'User'}</h1>
        </div>
        {/* Streak badge */}
        <div className="flex items-center gap-2 bg-surface rounded-2xl px-4 py-2">
          <span className="streak-fire text-2xl">🔥</span>
          <div className="text-left">
            <p className="text-white font-bold text-lg leading-tight">{profile?.currentStreak || 0}</p>
            <p className="text-gray-400 text-[10px] leading-tight">day streak</p>
          </div>
        </div>
      </div>

      {/* Week Calendar Strip */}
      <div className="bg-surface rounded-2xl p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-semibold text-sm">This Week</h2>
          <span className="text-gray-400 text-xs">{thisWeekWorkouts}/7 days</span>
        </div>
        <div className="flex justify-between">
          {weekDays.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd')
            const log = workouts.find(w => w.date === dateStr)
            const isToday = isSameDay(day, today)
            const isFuture = day > today

            let dotColor = 'bg-surface-light'
            if (log?.type === 'workout') dotColor = 'bg-accent-green'
            else if (log?.type === 'rest') dotColor = 'bg-accent-orange'

            return (
              <button
                key={dateStr}
                onClick={() => !isFuture && navigate(`/log/${dateStr}`)}
                className="flex flex-col items-center gap-1.5"
              >
                <span className="text-gray-500 text-[10px] uppercase">{format(day, 'EEE')}</span>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all
                  ${isToday ? 'ring-2 ring-primary' : ''}
                  ${log?.type === 'workout' ? 'bg-accent-green/20 text-accent-green' :
                    log?.type === 'rest' ? 'bg-accent-orange/20 text-accent-orange' :
                    isFuture ? 'bg-surface-light/50 text-gray-600' : 'bg-surface-light text-gray-400'}`}
                >
                  {format(day, 'd')}
                </div>
                <div className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
              </button>
            )
          })}
        </div>
      </div>

      {/* Today's Status */}
      <div className="mb-4">
        {todayLog ? (
          <button
            onClick={() => navigate(`/log/${todayStr}`)}
            className="w-full bg-surface rounded-2xl p-4 text-left"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {todayLog.type === 'rest' ? (
                  <div className="w-12 h-12 rounded-xl bg-accent-orange/20 flex items-center justify-center">
                    <BedDouble className="w-6 h-6 text-accent-orange" />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-accent-green/20 flex items-center justify-center">
                    <Dumbbell className="w-6 h-6 text-accent-green" />
                  </div>
                )}
                <div>
                  <p className="text-white font-semibold">
                    {todayLog.type === 'rest' ? 'Rest Day' : todayLog.workoutType || 'Workout'}
                  </p>
                  <p className="text-gray-400 text-sm">
                    {todayLog.type === 'rest' ? 'Recovery day' : `${todayLog.exercises.length} exercises`}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-500" />
            </div>
          </button>
        ) : (
          <button
            onClick={() => navigate('/log')}
            className="w-full bg-primary/10 border border-primary/30 border-dashed rounded-2xl p-4 text-center"
          >
            <Dumbbell className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="text-primary font-semibold">Log Today's Workout</p>
            <p className="text-primary/60 text-sm">or mark as rest day</p>
          </button>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-surface rounded-2xl p-3 text-center">
          <Flame className="w-5 h-5 text-accent-orange mx-auto mb-1" />
          <p className="text-white font-bold text-lg">{profile?.longestStreak || 0}</p>
          <p className="text-gray-400 text-[10px]">Best Streak</p>
        </div>
        <div className="bg-surface rounded-2xl p-3 text-center">
          <Dumbbell className="w-5 h-5 text-primary mx-auto mb-1" />
          <p className="text-white font-bold text-lg">{totalWorkouts}</p>
          <p className="text-gray-400 text-[10px]">Total Workouts</p>
        </div>
        <div className="bg-surface rounded-2xl p-3 text-center">
          <CalendarDays className="w-5 h-5 text-accent-green mx-auto mb-1" />
          <p className="text-white font-bold text-lg">{thisWeekWorkouts}</p>
          <p className="text-gray-400 text-[10px]">This Week</p>
        </div>
      </div>

      {/* Recent Activity */}
      {recentWorkouts.length > 0 && (
        <div className="mb-4">
          <h2 className="text-white font-semibold mb-3">Recent Activity</h2>
          <div className="space-y-2">
            {recentWorkouts.map(w => (
              <button
                key={w.id}
                onClick={() => navigate(`/log/${w.date}`)}
                className="w-full bg-surface rounded-xl p-3 flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-3">
                  {w.type === 'rest' ? (
                    <BedDouble className="w-5 h-5 text-accent-orange" />
                  ) : (
                    <Dumbbell className="w-5 h-5 text-primary" />
                  )}
                  <div>
                    <p className="text-white text-sm font-medium">
                      {w.type === 'rest' ? 'Rest Day' : w.workoutType || 'Workout'}
                    </p>
                    <p className="text-gray-500 text-xs">
                      {format(parseISO(w.date), 'EEE, MMM d')}
                      {w.type === 'workout' && ` · ${w.exercises.length} exercises`}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="text-center py-8">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      )}
    </div>
  )
}
