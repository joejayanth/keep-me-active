import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
} from 'firebase/firestore'
import { db } from './firebase'
import type { WorkoutLog, UserProfile, BuddyConnection } from './types'
import { format, subDays } from 'date-fns'

// ── User Profile ──

const DEFAULT_PROFILE_FIELDS = {
  scheduledRestDays: [] as number[],
  cheatDaysEarned: 0,
  cheatDaysUsed: 0,
  cheatDayDates: [] as string[],
  notificationsEnabled: false,
  notificationTime: '18:00',
}

export async function getOrCreateProfile(uid: string, email: string, displayName: string, photoURL?: string): Promise<UserProfile> {
  const ref = doc(db, 'users', uid)
  const snap = await getDoc(ref)
  if (snap.exists()) {
    // Merge in any new default fields for existing users
    const data = snap.data() as UserProfile
    const merged = { ...DEFAULT_PROFILE_FIELDS, ...data }
    return merged
  }

  const profile: UserProfile = {
    uid,
    email,
    displayName,
    photoURL: photoURL || undefined,
    createdAt: Date.now(),
    currentStreak: 0,
    longestStreak: 0,
    shareCode: generateShareCode(),
    ...DEFAULT_PROFILE_FIELDS,
  }
  await setDoc(ref, profile)
  return profile
}

export async function updateProfile(uid: string, data: Partial<UserProfile>) {
  const ref = doc(db, 'users', uid)
  await setDoc(ref, data, { merge: true })
}

function generateShareCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

// ── Streak Calculation ──

function calcStreakFromData(
  workouts: WorkoutLog[],
  scheduledRestDays: number[],
  existingCheatDayDates: string[],
  availableNewCheatDays: number
): { streak: number; longestStreak: number; newCheatDayDates: string[] } {
  const today = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')

  const loggedDates = new Set(workouts.map(w => w.date))
  const cheatDatesSet = new Set(existingCheatDayDates)
  const newCheatDayDates: string[] = []
  let cheatBudget = availableNewCheatDays

  // Helper: is a date "covered" (logged, scheduled rest, or cheat day)
  const isCovered = (dateStr: string, dow: number): boolean => {
    if (loggedDates.has(dateStr)) return true
    if (scheduledRestDays.includes(dow)) return true
    if (cheatDatesSet.has(dateStr)) return true
    return false
  }

  // Walk backwards from today counting consecutive covered days
  let streak = 0

  for (let i = 0; i < 730; i++) {
    const d = subDays(today, i)
    const dateStr = format(d, 'yyyy-MM-dd')
    // Don't look into the future
    if (dateStr > todayStr) continue

    const dow = d.getDay()

    if (isCovered(dateStr, dow)) {
      streak++
    } else if (cheatBudget > 0) {
      // Use a new cheat day for this gap
      cheatBudget--
      cheatDatesSet.add(dateStr)
      newCheatDayDates.push(dateStr)
      streak++
    } else {
      // Streak is broken — but if streak is still 0, the user just hasn't
      // logged today yet; allow yesterday to start the streak
      if (i === 0) continue
      break
    }
  }

  // Longest streak: do a full pass without cheat-day budget to find true best
  // We use the same logic but scan for all continuous windows
  let longest = streak
  let window = 0
  for (let i = 0; i < 730; i++) {
    const d = subDays(today, i)
    const dateStr = format(d, 'yyyy-MM-dd')
    if (dateStr > todayStr) continue
    const dow = d.getDay()
    if (isCovered(dateStr, dow)) {
      window++
      longest = Math.max(longest, window)
    } else {
      window = 0
    }
  }

  return { streak, longestStreak: longest, newCheatDayDates }
}

export async function recalculateStreak(userId: string) {
  const [workouts, profileSnap] = await Promise.all([
    getWorkoutsForUser(userId),
    getDoc(doc(db, 'users', userId)),
  ])

  const profile = profileSnap.exists()
    ? ({ ...DEFAULT_PROFILE_FIELDS, ...profileSnap.data() } as UserProfile)
    : ({ ...DEFAULT_PROFILE_FIELDS, uid: userId, currentStreak: 0, longestStreak: 0 } as unknown as UserProfile)

  const scheduledRestDays = profile.scheduledRestDays || []
  const existingCheatDayDates = profile.cheatDayDates || []
  const cheatDaysEarned = Math.floor(profile.longestStreak / 21)
  const cheatDaysUsed = profile.cheatDaysUsed || 0
  const availableNewCheatDays = Math.max(0, cheatDaysEarned - cheatDaysUsed)

  const { streak, longestStreak, newCheatDayDates } = calcStreakFromData(
    workouts,
    scheduledRestDays,
    existingCheatDayDates,
    availableNewCheatDays
  )

  const allCheatDayDates = [...new Set([...existingCheatDayDates, ...newCheatDayDates])]
  const totalCheatDaysUsed = cheatDaysUsed + newCheatDayDates.length
  const newLongest = Math.max(streak, longestStreak, profile.longestStreak || 0)
  const newCheatDaysEarned = Math.floor(newLongest / 21)

  await updateProfile(userId, {
    currentStreak: streak,
    longestStreak: newLongest,
    cheatDaysEarned: newCheatDaysEarned,
    cheatDaysUsed: totalCheatDaysUsed,
    cheatDayDates: allCheatDayDates,
    lastActiveDate: format(new Date(), 'yyyy-MM-dd'),
  })
}

// ── Workout Logs ──

export async function saveWorkout(log: WorkoutLog): Promise<string> {
  const id = log.id || `${log.userId}_${log.date}`
  const ref = doc(db, 'workouts', id)
  await setDoc(ref, { ...log, id })
  await recalculateStreak(log.userId)
  return id
}

export async function getWorkoutsForUser(userId: string): Promise<WorkoutLog[]> {
  const q = query(collection(db, 'workouts'), where('userId', '==', userId))
  const snap = await getDocs(q)
  return snap.docs
    .map(d => d.data() as WorkoutLog)
    .sort((a, b) => b.date.localeCompare(a.date))
}

export async function getWorkoutByDate(userId: string, date: string): Promise<WorkoutLog | null> {
  const id = `${userId}_${date}`
  const ref = doc(db, 'workouts', id)
  const snap = await getDoc(ref)
  return snap.exists() ? (snap.data() as WorkoutLog) : null
}

export async function deleteWorkout(id: string, userId: string) {
  await deleteDoc(doc(db, 'workouts', id))
  await recalculateStreak(userId)
}

// ── Buddy / Coach ──

export async function findUserByShareCode(code: string): Promise<UserProfile | null> {
  const q = query(collection(db, 'users'), where('shareCode', '==', code.toUpperCase()))
  const snap = await getDocs(q)
  if (snap.empty) return null
  return snap.docs[0].data() as UserProfile
}

export async function sendBuddyRequest(owner: UserProfile, buddy: UserProfile, role: 'buddy' | 'coach') {
  const id = `${owner.uid}_${buddy.uid}`
  const connection: BuddyConnection = {
    id,
    ownerId: owner.uid,
    ownerName: owner.displayName,
    buddyId: buddy.uid,
    buddyName: buddy.displayName,
    buddyEmail: buddy.email,
    role,
    status: 'pending',
    createdAt: Date.now(),
  }
  await setDoc(doc(db, 'connections', id), connection)
}

export async function acceptBuddyRequest(connectionId: string) {
  await setDoc(doc(db, 'connections', connectionId), { status: 'accepted' }, { merge: true })
}

export async function removeBuddy(connectionId: string) {
  await deleteDoc(doc(db, 'connections', connectionId))
}

export async function getMyConnections(userId: string): Promise<BuddyConnection[]> {
  const q1 = query(collection(db, 'connections'), where('ownerId', '==', userId))
  const q2 = query(collection(db, 'connections'), where('buddyId', '==', userId))
  const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)])
  const all = [...snap1.docs, ...snap2.docs].map(d => d.data() as BuddyConnection)
  const map = new Map(all.map(c => [c.id, c]))
  return Array.from(map.values())
}
