import { useAuth } from '../contexts/AuthContext'
import { Dumbbell, LogOut, Flame, Trophy, Copy, CheckCheck } from 'lucide-react'
import { useState } from 'react'

export default function ProfilePage() {
  const { profile, signOut } = useAuth()
  const [copied, setCopied] = useState(false)

  const copyCode = () => {
    if (profile?.shareCode) {
      navigator.clipboard.writeText(profile.shareCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
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
        <p className="text-gray-400 text-sm">{profile?.email}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
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

      {/* Share Code */}
      <div className="bg-surface rounded-2xl p-4 mb-6">
        <p className="text-gray-400 text-sm mb-2">Your Share Code</p>
        <div className="flex items-center gap-3">
          <span className="flex-1 text-center text-white text-2xl font-mono font-bold tracking-widest">
            {profile?.shareCode}
          </span>
          <button onClick={copyCode} className="text-primary">
            {copied ? <CheckCheck className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
          </button>
        </div>
        <p className="text-gray-500 text-xs mt-2 text-center">Share with friends to connect</p>
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
