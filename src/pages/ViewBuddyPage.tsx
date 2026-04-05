import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { getWorkoutsForUser } from '../lib/workouts'
import type { WorkoutLog, UserProfile } from '../lib/types'
import { format, parseISO } from 'date-fns'
import { ArrowLeft, Flame, Dumbbell, BedDouble, Eye } from 'lucide-react'

export default function ViewBuddyPage() {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()
  const [buddyProfile, setBuddyProfile] = useState<UserProfile | null>(null)
  const [workouts, setWorkouts] = useState<WorkoutLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    Promise.all([
      getDoc(doc(db, 'users', userId)).then(snap => snap.exists() ? snap.data() as UserProfile : null),
      getWorkoutsForUser(userId),
    ]).then(([profile, wkts]) => {
      setBuddyProfile(profile)
      setWorkouts(wkts)
      setLoading(false)
    })
  }, [userId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!buddyProfile) {
    return (
      <div className="px-4 pt-6">
        <button onClick={() => navigate(-1)} className="text-gray-400 mb-4">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <p className="text-gray-400">User not found</p>
      </div>
    )
  }

  const workoutOnly = workouts.filter(w => w.type === 'workout')

  return (
    <div className="px-4 pt-4 pb-8">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-gray-400">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-gray-400" />
          <span className="text-gray-400 text-sm">View only</span>
        </div>
      </div>

      {/* Buddy Profile */}
      <div className="flex flex-col items-center mb-6">
        {buddyProfile.photoURL ? (
          <img src={buddyProfile.photoURL} alt="" className="w-16 h-16 rounded-full mb-2" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-2">
            <Dumbbell className="w-8 h-8 text-primary" />
          </div>
        )}
        <h2 className="text-xl font-bold text-white">{buddyProfile.displayName}</h2>
        <div className="flex items-center gap-1 mt-1">
          <span className="streak-fire">🔥</span>
          <span className="text-accent-orange font-bold">{buddyProfile.currentStreak}</span>
          <span className="text-gray-400 text-sm">day streak</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-surface rounded-2xl p-3 text-center">
          <Flame className="w-5 h-5 text-accent-orange mx-auto mb-1" />
          <p className="text-white font-bold text-lg">{buddyProfile.longestStreak || 0}</p>
          <p className="text-gray-400 text-[10px]">Best Streak</p>
        </div>
        <div className="bg-surface rounded-2xl p-3 text-center">
          <Dumbbell className="w-5 h-5 text-primary mx-auto mb-1" />
          <p className="text-white font-bold text-lg">{workoutOnly.length}</p>
          <p className="text-gray-400 text-[10px]">Total Workouts</p>
        </div>
      </div>

      {/* Recent Workouts */}
      <h3 className="text-white font-semibold mb-3">Recent Activity</h3>
      <div className="space-y-2">
        {workouts.slice(0, 15).map(w => (
          <div key={w.id} className="bg-surface rounded-xl p-3">
            <div className="flex items-center gap-3">
              {w.type === 'rest' ? (
                <BedDouble className="w-5 h-5 text-accent-orange" />
              ) : (
                <Dumbbell className="w-5 h-5 text-primary" />
              )}
              <div className="flex-1">
                <p className="text-white text-sm font-medium">
                  {w.type === 'rest' ? 'Rest Day' : w.workoutType || 'Workout'}
                </p>
                <p className="text-gray-500 text-xs">
                  {format(parseISO(w.date), 'EEE, MMM d')}
                  {w.type === 'workout' && ` · ${w.exercises.length} exercises`}
                </p>
              </div>
            </div>
            {w.type === 'workout' && w.exercises.length > 0 && (
              <div className="mt-2 pl-8 space-y-0.5">
                {w.exercises.slice(0, 4).map((e, i) => (
                  <p key={i} className="text-gray-400 text-xs">
                    {e.name}
                    {e.sets && e.reps ? ` — ${e.sets}x${e.reps}` : ''}
                    {e.weight ? ` @ ${e.weight}${e.weightUnit || 'lbs'}` : ''}
                  </p>
                ))}
                {w.exercises.length > 4 && (
                  <p className="text-gray-500 text-xs">+{w.exercises.length - 4} more</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {workouts.length === 0 && (
        <div className="bg-surface rounded-2xl p-8 text-center">
          <p className="text-gray-400">No workouts logged yet</p>
        </div>
      )}
    </div>
  )
}
