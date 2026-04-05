export interface Exercise {
  name: string
  sets?: number
  reps?: number
  weight?: number
  weightUnit?: 'kg' | 'lbs'
  duration?: number // minutes
  distance?: number // km
  notes?: string
}

export interface WorkoutLog {
  id?: string
  userId: string
  date: string // YYYY-MM-DD
  type: 'workout' | 'rest'
  workoutType?: string
  exercises: Exercise[]
  notes?: string
  duration?: number // total minutes
  createdAt: number
}

export interface UserProfile {
  uid: string
  email: string
  displayName: string
  photoURL?: string
  createdAt: number
  currentStreak: number
  longestStreak: number
  lastActiveDate?: string // YYYY-MM-DD

  // Rest day scheduling (0=Sun, 1=Mon, …, 6=Sat)
  scheduledRestDays: number[]

  // Cheat days
  cheatDaysEarned: number   // auto-derived: floor(longestStreak / 21)
  cheatDaysUsed: number     // how many have been spent
  cheatDayDates: string[]   // which dates used a cheat day

  // Notifications
  notificationsEnabled: boolean
  notificationTime: string  // "HH:MM" 24h format

  shareCode?: string
}

export interface BuddyConnection {
  id?: string
  ownerId: string
  ownerName: string
  buddyId: string
  buddyName: string
  buddyEmail: string
  role: 'buddy' | 'coach'
  status: 'pending' | 'accepted'
  createdAt: number
}

export type WorkoutType = 'Push' | 'Pull' | 'Legs' | 'Cardio' | 'Full Body' | 'Upper Body' | 'Lower Body' | 'Core' | 'Custom'

export const WORKOUT_TYPES: WorkoutType[] = [
  'Push', 'Pull', 'Legs', 'Cardio', 'Full Body', 'Upper Body', 'Lower Body', 'Core', 'Custom'
]

export const COMMON_EXERCISES: Record<string, string[]> = {
  Push: ['Bench Press', 'Overhead Press', 'Incline Dumbbell Press', 'Tricep Dips', 'Cable Flyes', 'Lateral Raises'],
  Pull: ['Deadlift', 'Barbell Rows', 'Pull-ups', 'Lat Pulldown', 'Face Pulls', 'Bicep Curls'],
  Legs: ['Squat', 'Leg Press', 'Romanian Deadlift', 'Leg Curls', 'Leg Extensions', 'Calf Raises'],
  Cardio: ['Running', 'Cycling', 'Swimming', 'Jump Rope', 'Rowing', 'Elliptical'],
  'Full Body': ['Squat', 'Bench Press', 'Deadlift', 'Pull-ups', 'Overhead Press'],
  'Upper Body': ['Bench Press', 'Pull-ups', 'Overhead Press', 'Barbell Rows', 'Bicep Curls', 'Tricep Dips'],
  'Lower Body': ['Squat', 'Leg Press', 'Romanian Deadlift', 'Lunges', 'Calf Raises'],
  Core: ['Plank', 'Crunches', 'Russian Twists', 'Leg Raises', 'Ab Wheel Rollout'],
  Custom: [],
}

export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const DAY_NAMES_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
