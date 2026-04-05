import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { updateProfile } from '../lib/workouts'
import {
  requestNotificationPermission,
  isNotificationSupported,
  scheduleNextNotification,
  cancelNotifications,
  saveNotificationSchedule,
  promptInstall,
  isRunningAsApp,
  isInstallable,
} from '../lib/notifications'
import {
  Dumbbell, LogOut, Flame, Trophy, Copy, CheckCheck,
  Bell, Smartphone, Settings, ChevronDown, ChevronUp,
  Shield
} from 'lucide-react'
import { DAY_NAMES } from '../lib/types'

export default function ProfilePage() {
  const { profile, signOut, refreshProfile } = useAuth()
  const [copied, setCopied] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notifEnabled, setNotifEnabled] = useState(profile?.notificationsEnabled ?? false)
  const [notifTime, setNotifTime] = useState(profile?.notificationTime ?? '18:00')
  const [notifStatus, setNotifStatus] = useState<'idle' | 'saving' | 'denied'>('idle')
  const [installable, setInstallable] = useState(isInstallable())
  const [installed, setInstalled] = useState(false)

  const scheduledRestDays = profile?.scheduledRestDays ?? []
  const cheatDaysEarned = profile?.cheatDaysEarned ?? 0
  const cheatDaysUsed = profile?.cheatDaysUsed ?? 0
  const cheatDaysAvailable = Math.max(0, cheatDaysEarned - cheatDaysUsed)
  const nextCheatDayAt = 21 - ((profile?.longestStreak ?? 0) % 21)
  const isAppInstalled = isRunningAsApp()

  const copyCode = () => {
    if (profile?.shareCode) {
      navigator.clipboard.writeText(profile.shareCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const toggleRestDay = async (dow: number) => {
    if (!profile) return
    const current = profile.scheduledRestDays ?? []
    const updated = current.includes(dow)
      ? current.filter(d => d !== dow)
      : [...current, dow]
    setSaving(true)
    await updateProfile(profile.uid, { scheduledRestDays: updated })
    await refreshProfile()
    setSaving(false)
  }

  const handleNotifToggle = async () => {
    if (!profile) return
    if (!notifEnabled) {
      // Turning ON
      const granted = await requestNotificationPermission()
      if (!granted) {
        setNotifStatus('denied')
        return
      }
      setNotifEnabled(true)
      scheduleNextNotification(notifTime, profile.displayName)
      saveNotificationSchedule(true, notifTime)
      await updateProfile(profile.uid, { notificationsEnabled: true, notificationTime: notifTime })
    } else {
      // Turning OFF
      setNotifEnabled(false)
      cancelNotifications()
      saveNotificationSchedule(false, notifTime)
      await updateProfile(profile.uid, { notificationsEnabled: false })
    }
    await refreshProfile()
  }

  const handleTimeChange = async (time: string) => {
    if (!profile) return
    setNotifTime(time)
    saveNotificationSchedule(notifEnabled, time)
    if (notifEnabled) scheduleNextNotification(time, profile.displayName)
    await updateProfile(profile.uid, { notificationTime: time })
  }

  const handleInstall = async () => {
    const accepted = await promptInstall()
    if (accepted) {
      setInstalled(true)
      setInstallable(false)
    }
  }

  return (
    <div className="px-4 pt-6 pb-8">
      <h1 className="text-2xl font-bold text-white mb-6">Profile</h1>

      {/* Avatar & Name */}
      <div className="flex flex-col items-center mb-6">
        {profile?.photoURL ? (
          <img src={profile.photoURL} alt="" className="w-20 h-20 rounded-full mb-3" />
        ) : (
          <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-3">
            <Dumbbell className="w-10 h-10 text-primary" />
          </div>
        )}
        <h2 className="text-xl font-bold text-white">{profile?.displayName}</h2>
        <p className="text-gray-400 text-sm">{profile?.email || profile?.uid?.slice(0, 8)}</p>
      </div>

      {/* Streak Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-surface rounded-2xl p-4 text-center">
          <Flame className="w-6 h-6 text-accent-orange mx-auto mb-2" />
          <p className="text-white font-bold text-2xl">{profile?.currentStreak || 0}</p>
          <p className="text-gray-400 text-xs">Current Streak</p>
        </div>
        <div className="bg-surface rounded-2xl p-4 text-center">
          <Trophy className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
          <p className="text-white font-bold text-2xl">{profile?.longestStreak || 0}</p>
          <p className="text-gray-400 text-xs">Longest Streak</p>
        </div>
      </div>

      {/* Cheat Days */}
      <div className="bg-surface rounded-2xl p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-5 h-5 text-accent-blue" />
          <h3 className="text-white font-semibold">Cheat Days</h3>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-surface-light rounded-xl p-3 text-center">
            <p className="text-white font-bold text-xl">{cheatDaysEarned}</p>
            <p className="text-gray-400 text-[10px]">Earned</p>
          </div>
          <div className="bg-surface-light rounded-xl p-3 text-center">
            <p className="text-white font-bold text-xl">{cheatDaysUsed}</p>
            <p className="text-gray-400 text-[10px]">Used</p>
          </div>
          <div className={`rounded-xl p-3 text-center ${cheatDaysAvailable > 0 ? 'bg-accent-green/20' : 'bg-surface-light'}`}>
            <p className={`font-bold text-xl ${cheatDaysAvailable > 0 ? 'text-accent-green' : 'text-white'}`}>{cheatDaysAvailable}</p>
            <p className="text-gray-400 text-[10px]">Available</p>
          </div>
        </div>
        <p className="text-gray-500 text-xs">
          {cheatDaysAvailable > 0
            ? `🎉 You have ${cheatDaysAvailable} cheat day${cheatDaysAvailable > 1 ? 's' : ''} — miss a day without breaking your streak!`
            : `Earn next cheat day in ${nextCheatDayAt} more day${nextCheatDayAt === 1 ? '' : 's'} (every 21-day streak)`}
        </p>
      </div>

      {/* Share Code */}
      <div className="bg-surface rounded-2xl p-4 mb-4">
        <p className="text-gray-400 text-sm mb-2">Your Share Code</p>
        <div className="flex items-center gap-3">
          <span className="flex-1 text-center text-white text-2xl font-mono font-bold tracking-widest">
            {profile?.shareCode}
          </span>
          <button onClick={copyCode} className="text-primary">
            {copied ? <CheckCheck className="w-5 h-5 text-accent-green" /> : <Copy className="w-5 h-5" />}
          </button>
        </div>
        <p className="text-gray-500 text-xs mt-2 text-center">Share with friends to connect as buddy or coach</p>
      </div>

      {/* Settings Accordion */}
      <div className="bg-surface rounded-2xl mb-4 overflow-hidden">
        <button
          onClick={() => setSettingsOpen(!settingsOpen)}
          className="w-full flex items-center justify-between p-4"
        >
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-gray-400" />
            <span className="text-white font-semibold">Settings</span>
          </div>
          {settingsOpen ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </button>

        {settingsOpen && (
          <div className="px-4 pb-4 border-t border-surface-light">

            {/* ── Scheduled Rest Days ── */}
            <div className="mt-4 mb-5">
              <p className="text-white font-medium mb-1">Scheduled Rest Days</p>
              <p className="text-gray-500 text-xs mb-3">
                These days count toward your streak even without logging anything.
              </p>
              <div className="flex gap-2 justify-between">
                {DAY_NAMES.map((name, dow) => {
                  const isSelected = scheduledRestDays.includes(dow)
                  return (
                    <button
                      key={dow}
                      onClick={() => toggleRestDay(dow)}
                      disabled={saving}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
                        isSelected
                          ? 'bg-accent-orange text-white'
                          : 'bg-surface-light text-gray-400'
                      }`}
                    >
                      {name}
                    </button>
                  )
                })}
              </div>
              {saving && <p className="text-gray-500 text-xs mt-2">Saving…</p>}
            </div>

            {/* ── Notifications ── */}
            {isNotificationSupported() && (
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-white font-medium">Daily Reminder</p>
                    <p className="text-gray-500 text-xs">Get nudged to log your workout</p>
                  </div>
                  <button
                    onClick={handleNotifToggle}
                    className={`w-12 h-6 rounded-full transition-colors relative ${notifEnabled ? 'bg-primary' : 'bg-surface-light'}`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${notifEnabled ? 'left-6' : 'left-0.5'}`} />
                  </button>
                </div>

                {notifStatus === 'denied' && (
                  <p className="text-accent-red text-xs mb-2">
                    Notifications blocked. Enable in your browser settings.
                  </p>
                )}

                {notifEnabled && (
                  <div className="flex items-center gap-3 mt-3">
                    <Bell className="w-4 h-4 text-primary shrink-0" />
                    <label className="text-gray-400 text-sm">Remind me at</label>
                    <input
                      type="time"
                      value={notifTime}
                      onChange={e => handleTimeChange(e.target.value)}
                      className="flex-1 bg-surface-light text-white px-3 py-1.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                )}
              </div>
            )}

            {/* ── Add to Home Screen ── */}
            {!isAppInstalled && (
              <div>
                <p className="text-white font-medium mb-1">Add to Home Screen</p>
                <p className="text-gray-500 text-xs mb-3">
                  Install the app for a native-like experience — no browser chrome, works offline.
                </p>
                {installable && !installed ? (
                  <button
                    onClick={handleInstall}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary/20 text-primary font-medium"
                  >
                    <Smartphone className="w-5 h-5" />
                    Install App
                  </button>
                ) : installed ? (
                  <p className="text-accent-green text-sm text-center">✓ Installed successfully!</p>
                ) : (
                  <div className="bg-surface-light rounded-xl p-3 text-xs text-gray-400">
                    <p className="font-medium text-gray-300 mb-1">On iOS (Safari):</p>
                    <p>Tap the Share button → "Add to Home Screen"</p>
                    <p className="font-medium text-gray-300 mb-1 mt-2">On Android (Chrome):</p>
                    <p>Tap the menu (⋮) → "Add to Home Screen" or "Install app"</p>
                  </div>
                )}
              </div>
            )}

            {isAppInstalled && (
              <div className="flex items-center gap-2 text-accent-green">
                <Smartphone className="w-4 h-4" />
                <span className="text-sm">Running as installed app</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sign Out */}
      <button
        onClick={signOut}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-accent-red/10 text-accent-red font-medium"
      >
        <LogOut className="w-5 h-5" />
        Sign Out
      </button>
    </div>
  )
}
