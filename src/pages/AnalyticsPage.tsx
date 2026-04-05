import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getWorkoutsForUser } from '../lib/workouts'
import type { WorkoutLog } from '../lib/types'
import { format, parseISO, subDays, eachWeekOfInterval, eachDayOfInterval } from 'date-fns'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'
import { TrendingUp, Dumbbell, Clock, Flame } from 'lucide-react'

const COLORS = ['#6366f1', '#22c55e', '#f97316', '#3b82f6', '#ef4444', '#a855f7', '#eab308', '#14b8a6']

export default function AnalyticsPage() {
  const { profile } = useAuth()
  const [workouts, setWorkouts] = useState<WorkoutLog[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'week' | 'month' | 'all'>('month')

  useEffect(() => {
    if (!profile) return
    getWorkoutsForUser(profile.uid).then(w => {
      setWorkouts(w)
      setLoading(false)
    })
  }, [profile?.uid])

  const now = new Date()
  const filtered = workouts.filter(w => {
    if (period === 'week') return parseISO(w.date) >= subDays(now, 7)
    if (period === 'month') return parseISO(w.date) >= subDays(now, 30)
    return true
  })

  const workoutOnly = filtered.filter(w => w.type === 'workout')
  const restDays = filtered.filter(w => w.type === 'rest').length

  // ── Weekly frequency chart ──
  const weeklyData = (() => {
    const weeks = eachWeekOfInterval({
      start: subDays(now, period === 'week' ? 7 : period === 'month' ? 28 : 84),
      end: now,
    }, { weekStartsOn: 1 })

    return weeks.map(weekStart => {
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)
      const count = workoutOnly.filter(w => {
        const d = parseISO(w.date)
        return d >= weekStart && d <= weekEnd
      }).length
      return { week: format(weekStart, 'MMM d'), workouts: count }
    })
  })()

  // ── Workout type breakdown ──
  const typeBreakdown = (() => {
    const counts: Record<string, number> = {}
    workoutOnly.forEach(w => {
      const t = w.workoutType || 'Other'
      counts[t] = (counts[t] || 0) + 1
    })
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  })()

  // ── Volume over time (total sets per day) ──
  const volumeData = (() => {
    const days = eachDayOfInterval({
      start: subDays(now, period === 'week' ? 7 : period === 'month' ? 30 : 90),
      end: now,
    })

    return days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd')
      const dayWorkout = workoutOnly.find(w => w.date === dateStr)
      const totalSets = dayWorkout?.exercises.reduce((sum, e) => sum + (e.sets || 0), 0) || 0
      const totalVolume = dayWorkout?.exercises.reduce((sum, e) => sum + (e.sets || 0) * (e.reps || 0) * (e.weight || 0), 0) || 0
      return {
        date: format(day, 'M/d'),
        sets: totalSets,
        volume: Math.round(totalVolume),
      }
    }).filter(d => d.sets > 0 || d.volume > 0)
  })()

  // ── Exercise progress (weight over time for top exercises) ──
  const exerciseProgress = (() => {
    const exerciseMap: Record<string, { date: string; weight: number }[]> = {}
    workoutOnly.forEach(w => {
      w.exercises.forEach(e => {
        if (e.weight && e.name) {
          if (!exerciseMap[e.name]) exerciseMap[e.name] = []
          exerciseMap[e.name].push({ date: w.date, weight: e.weight })
        }
      })
    })

    // Get top 3 exercises by frequency
    const sorted = Object.entries(exerciseMap)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 3)

    return sorted.map(([name, data]) => ({
      name,
      data: data.sort((a, b) => a.date.localeCompare(b.date)).map(d => ({
        date: format(parseISO(d.date), 'M/d'),
        weight: d.weight,
      })),
      improvement: data.length >= 2
        ? Math.round(((data[data.length - 1].weight - data[0].weight) / data[0].weight) * 100)
        : 0,
    }))
  })()

  // Stats
  const avgExercises = workoutOnly.length > 0
    ? Math.round(workoutOnly.reduce((sum, w) => sum + w.exercises.length, 0) / workoutOnly.length)
    : 0
  const avgDuration = workoutOnly.filter(w => w.duration).length > 0
    ? Math.round(workoutOnly.filter(w => w.duration).reduce((sum, w) => sum + (w.duration || 0), 0) / workoutOnly.filter(w => w.duration).length)
    : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="px-4 pt-6 pb-8">
      <h1 className="text-2xl font-bold text-white mb-4">Analytics</h1>

      {/* Period Selector */}
      <div className="flex gap-2 mb-4">
        {(['week', 'month', 'all'] as const).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
              period === p ? 'bg-primary text-white' : 'bg-surface text-gray-400'
            }`}
          >
            {p === 'week' ? '7 Days' : p === 'month' ? '30 Days' : 'All Time'}
          </button>
        ))}
      </div>

      {workoutOnly.length === 0 ? (
        <div className="bg-surface rounded-2xl p-8 text-center">
          <Dumbbell className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">No workout data yet. Start logging to see your analytics!</p>
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-surface rounded-2xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <Dumbbell className="w-4 h-4 text-primary" />
                <span className="text-gray-400 text-xs">Workouts</span>
              </div>
              <p className="text-white font-bold text-xl">{workoutOnly.length}</p>
              <p className="text-gray-500 text-xs">{restDays} rest days</p>
            </div>
            <div className="bg-surface rounded-2xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-accent-green" />
                <span className="text-gray-400 text-xs">Avg Exercises</span>
              </div>
              <p className="text-white font-bold text-xl">{avgExercises}</p>
              <p className="text-gray-500 text-xs">per workout</p>
            </div>
            <div className="bg-surface rounded-2xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-accent-blue" />
                <span className="text-gray-400 text-xs">Avg Duration</span>
              </div>
              <p className="text-white font-bold text-xl">{avgDuration || '—'}</p>
              <p className="text-gray-500 text-xs">minutes</p>
            </div>
            <div className="bg-surface rounded-2xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <Flame className="w-4 h-4 text-accent-orange" />
                <span className="text-gray-400 text-xs">Current Streak</span>
              </div>
              <p className="text-white font-bold text-xl">{profile?.currentStreak || 0}</p>
              <p className="text-gray-500 text-xs">days</p>
            </div>
          </div>

          {/* Weekly Frequency */}
          <div className="bg-surface rounded-2xl p-4 mb-4">
            <h3 className="text-white font-semibold text-sm mb-3">Weekly Frequency</h3>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={weeklyData}>
                <XAxis dataKey="week" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8, color: 'white', fontSize: 12 }}
                />
                <Bar dataKey="workouts" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Workout Type Breakdown */}
          {typeBreakdown.length > 0 && (
            <div className="bg-surface rounded-2xl p-4 mb-4">
              <h3 className="text-white font-semibold text-sm mb-3">Workout Types</h3>
              <div className="flex items-center gap-4">
                <div className="w-32 h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={typeBreakdown} dataKey="value" cx="50%" cy="50%" outerRadius={55} innerRadius={30}>
                        {typeBreakdown.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-1.5">
                  {typeBreakdown.map((t, i) => (
                    <div key={t.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-gray-300 text-xs flex-1">{t.name}</span>
                      <span className="text-gray-400 text-xs">{t.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Volume Over Time */}
          {volumeData.length > 1 && (
            <div className="bg-surface rounded-2xl p-4 mb-4">
              <h3 className="text-white font-semibold text-sm mb-3">Volume Trend</h3>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={volumeData}>
                  <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8, color: 'white', fontSize: 12 }}
                  />
                  <Line type="monotone" dataKey="volume" stroke="#22c55e" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
              <p className="text-gray-500 text-[10px] mt-1">Total volume = sets x reps x weight</p>
            </div>
          )}

          {/* Exercise Progress */}
          {exerciseProgress.length > 0 && (
            <div className="bg-surface rounded-2xl p-4 mb-4">
              <h3 className="text-white font-semibold text-sm mb-3">Exercise Progress</h3>
              {exerciseProgress.map((ep, idx) => (
                <div key={ep.name} className={idx > 0 ? 'mt-4 pt-4 border-t border-surface-light' : ''}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-300 text-sm">{ep.name}</span>
                    {ep.improvement !== 0 && (
                      <span className={`text-xs font-medium ${ep.improvement > 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                        {ep.improvement > 0 ? '+' : ''}{ep.improvement}%
                      </span>
                    )}
                  </div>
                  <ResponsiveContainer width="100%" height={100}>
                    <LineChart data={ep.data}>
                      <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 9 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#94a3b8', fontSize: 9 }} axisLine={false} tickLine={false} domain={['dataMin - 5', 'dataMax + 5']} />
                      <Tooltip
                        contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8, color: 'white', fontSize: 12 }}
                        formatter={(value) => [`${value} lbs`, 'Weight']}
                      />
                      <Line type="monotone" dataKey="weight" stroke={COLORS[idx]} strokeWidth={2} dot={{ fill: COLORS[idx], r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
