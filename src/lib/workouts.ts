import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore'
import { db } from './firebase'
import type { WorkoutLog, UserProfile, BuddyConnection } from './types'
import { format, subDays, differenceInCalendarDays, parseISO } from 'date-fns'

// ── User Profile ──

export async function getOrCreateProfile(uid: string, email: string, displayName: string, photoURL?: string): Promise<UserProfile> {
  const ref = doc(db, 'users', uid)
  const snap = await getDoc(ref)
  if (snap.exists()) return snap.data() as UserProfile

  const profile: UserProfile = {
    uid,
    email,
    displayName,
    photoURL: photoURL || undefined,
    createdAt: Date.now(),
    currentStreak: 0,
    longestStreak: 0,
    shareCode: generateShareCode(),
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

// ── Workout Logs ──

export async function saveWorkout(log: WorkoutLog): Promise<string> {
  const id = log.id || `${log.userId}_${log.date}`
  const ref = doc(db, 'workouts', id)
  await setDoc(ref, { ...log, id })

  // Recalculate streak
  await recalculateStreak(log.userId)

  return id
}

export async function getWorkoutsForUser(userId: string): Promise<WorkoutLog[]> {
  const q = query(
    collection(db, 'workouts'),
    where('userId', '==', userId),
    orderBy('date', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => d.data() as WorkoutLog)
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

// ── Streak Calculation ──

export async function recalculateStreak(userId: string) {
  const workouts = await getWorkoutsForUser(userId)
  if (workouts.length === 0) {
    await updateProfile(userId, { currentStreak: 0, lastActiveDate: undefined })
    return
  }

  const dates = new Set(workouts.map(w => w.date))
  const sortedDates = Array.from(dates).sort().reverse()

  const today = format(new Date(), 'yyyy-MM-dd')
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd')

  // Check if the most recent log is today or yesterday
  if (sortedDates[0] !== today && sortedDates[0] !== yesterday) {
    await updateProfile(userId, { currentStreak: 0, lastActiveDate: sortedDates[0] })
    return
  }

  let streak = 1
  for (let i = 0; i < sortedDates.length - 1; i++) {
    const diff = differenceInCalendarDays(parseISO(sortedDates[i]), parseISO(sortedDates[i + 1]))
    if (diff === 1) {
      streak++
    } else {
      break
    }
  }

  const profileRef = doc(db, 'users', userId)
  const profileSnap = await getDoc(profileRef)
  const currentLongest = profileSnap.exists() ? (profileSnap.data() as UserProfile).longestStreak || 0 : 0

  await updateProfile(userId, {
    currentStreak: streak,
    longestStreak: Math.max(streak, currentLongest),
    lastActiveDate: sortedDates[0],
  })
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
  // Deduplicate by id
  const map = new Map(all.map(c => [c.id, c]))
  return Array.from(map.values())
}
