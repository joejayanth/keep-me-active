// ── Push / Local Notification helpers ──

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export function isNotificationSupported(): boolean {
  return 'Notification' in window
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!('Notification' in window)) return 'unsupported'
  return Notification.permission
}

// Schedule a daily local notification using the Notifications API.
// We store the alarm time in localStorage and re-schedule on each app load.
const ALARM_KEY = 'kma_notification_time'
const ALARM_ENABLED_KEY = 'kma_notifications_enabled'

export function saveNotificationSchedule(enabled: boolean, time: string) {
  localStorage.setItem(ALARM_ENABLED_KEY, enabled ? '1' : '0')
  localStorage.setItem(ALARM_KEY, time)
}

export function getNotificationSchedule(): { enabled: boolean; time: string } {
  return {
    enabled: localStorage.getItem(ALARM_ENABLED_KEY) === '1',
    time: localStorage.getItem(ALARM_KEY) || '18:00',
  }
}

// Schedule the next notification for today or tomorrow at the given HH:MM time
export function scheduleNextNotification(time: string, userName: string) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return

  const [h, m] = time.split(':').map(Number)
  const now = new Date()
  const target = new Date()
  target.setHours(h, m, 0, 0)
  if (target <= now) target.setDate(target.getDate() + 1)

  const delay = target.getTime() - now.getTime()

  // Clear any existing timer
  const existingId = (window as any).__kmaNotifTimer
  if (existingId) clearTimeout(existingId)

  const timerId = setTimeout(() => {
    new Notification('Keep Me Active 💪', {
      body: `Hey ${userName}! Time to hit the gym. Keep that streak alive! 🔥`,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'daily-reminder',
    })
    // Re-schedule for next day
    scheduleNextNotification(time, userName)
  }, delay)

  ;(window as any).__kmaNotifTimer = timerId
}

export function cancelNotifications() {
  const existingId = (window as any).__kmaNotifTimer
  if (existingId) clearTimeout(existingId)
}

// ── PWA Install Prompt ──

let deferredInstallPrompt: any = null

export function initInstallPrompt(onAvailable: () => void) {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredInstallPrompt = e
    onAvailable()
  })
}

export function isInstallable(): boolean {
  return !!deferredInstallPrompt
}

export async function promptInstall(): Promise<boolean> {
  if (!deferredInstallPrompt) return false
  deferredInstallPrompt.prompt()
  const { outcome } = await deferredInstallPrompt.userChoice
  deferredInstallPrompt = null
  return outcome === 'accepted'
}

export function isRunningAsApp(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
}
